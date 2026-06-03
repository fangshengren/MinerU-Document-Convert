import io
import os
import re
import time
import zipfile
import uuid
import threading
from pathlib import Path

import requests

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from documentsOperation import upload_file, get_file, get_file_preview, list_files, delete_file

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

BASE_DIR = Path(__file__).parent
FILE_DIR = BASE_DIR / "file"
RESULT_DIR = BASE_DIR / "markdownResult"
MINERU_TOKEN = os.getenv("MINERU_TOKEN")

FILE_URLS_API = "https://mineru.net/api/v4/file-urls/batch"
EXTRACT_RESULTS_API = "https://mineru.net/api/v4/extract-results/batch"

# Track batch status in memory
batches = {}

HTML_EXTENSIONS = {".html", ".htm"}
SUPPORTED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".jp2", ".webp", ".gif", ".bmp",
    ".html", ".htm",
}


def classify_files(file_paths):
    """Split files into HTML and non-HTML groups."""
    html_files = []
    other_files = []
    for fp in file_paths:
        ext = Path(fp).suffix.lower()
        if ext in HTML_EXTENSIONS:
            html_files.append(fp)
        else:
            other_files.append(fp)
    return other_files, html_files


def scan_files():
    """Scan the file directory for supported files."""
    FILE_DIR.mkdir(parents=True, exist_ok=True)
    files = []
    for f in FILE_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(str(f))
    return sorted(files)


def apply_upload_urls(file_paths, model_version):
    """Apply for presigned upload URLs. Returns (batch_id, urls) or None."""
    if not file_paths:
        return None

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MINERU_TOKEN}",
    }

    files_payload = []
    for fp in file_paths:
        name = Path(fp).name
        data_id = uuid.uuid4().hex[:16]
        files_payload.append({"name": name, "data_id": data_id})

    body = {
        "files": files_payload,
        "model_version": model_version,
    }

    resp = requests.post(FILE_URLS_API, headers=headers, json=body)
    if resp.status_code != 200:
        raise Exception(f"Failed to get upload URLs: {resp.status_code} {resp.text}")

    result = resp.json()
    if result["code"] != 0:
        raise Exception(f"API error: {result['msg']}")

    batch_id = result["data"]["batch_id"]
    urls = result["data"]["file_urls"]
    return batch_id, urls


def upload_files_to_urls(file_paths, urls):
    """Upload files to presigned URLs. Raises on failure."""
    for i, fp in enumerate(file_paths):
        with open(fp, "rb") as f:
            put_resp = requests.put(urls[i], data=f)
            if put_resp.status_code != 200:
                raise Exception(f"Upload failed for {Path(fp).name}: {put_resp.status_code}")


def upload_and_submit(file_paths, model_version):
    """Apply for upload URLs and upload files. Returns batch_id or None."""
    result = apply_upload_urls(file_paths, model_version)
    if result is None:
        return None
    batch_id, urls = result
    upload_files_to_urls(file_paths, urls)
    return batch_id


def poll_extract_results(batch_ids):
    """Poll for extract results across multiple batch IDs. Returns list of extract_result dicts."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MINERU_TOKEN}",
    }

    all_results = []
    for bid in batch_ids:
        while True:
            resp = requests.get(f"{EXTRACT_RESULTS_API}/{bid}", headers=headers)
            if resp.status_code != 200:
                time.sleep(3)
                continue

            result = resp.json()
            if result["code"] != 0:
                time.sleep(3)
                continue

            extract_results = result["data"].get("extract_result", [])
            all_done = True
            for er in extract_results:
                state = er.get("state")
                if state == "failed":
                    raise Exception(f"Parsing failed for {er.get('file_name')}: {er.get('err_msg')}")
                if state != "done":
                    all_done = False

            if all_done:
                all_results.extend(extract_results)
                break

            time.sleep(3)

    return all_results


# Common image extensions found in MinerU output
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"}


def download_extract_zip(extract_results, save_to_disk=True):
    """Download result zips and extract full.md content + images.

    Returns list of dicts:
        {file_name, md_name, md_content, md_path (if save_to_disk),
         images: [{name: "hash.jpg", data: bytes}]}
    """
    results = []
    if save_to_disk:
        RESULT_DIR.mkdir(parents=True, exist_ok=True)

    for er in extract_results:
        zip_url = er.get("full_zip_url")
        file_name = er.get("file_name", "unknown")
        if not zip_url:
            continue

        zip_resp = None
        for attempt in range(3):
            try:
                zip_resp = requests.get(zip_url, timeout=60)
                break
            except Exception as e:
                print(f"Download attempt {attempt + 1} failed for {file_name}: {e}")
                if attempt < 2:
                    time.sleep(2 ** attempt)
        if zip_resp is None or zip_resp.status_code != 200:
            print(f"Skipping {file_name}: download failed, status={getattr(zip_resp, 'status_code', 'N/A')}")
            continue

        with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
            all_members = zf.namelist()
            stem = Path(file_name).stem

            # --- Find full.md and determine its parent dir ---
            md_content = None
            md_name = stem + ".md"
            md_parent = ""  # prefix for sibling files (e.g. "abc123/")
            for member in all_members:
                if member.endswith("full.md") or member == "full.md":
                    md_content = zf.read(member).decode("utf-8", errors="replace")
                    # Extract the parent directory prefix of full.md
                    if "/" in member:
                        md_parent = member[: member.rindex("/") + 1]  # "abc123/"
                    break

            if md_content is None:
                print(f"Skipping {file_name}: no full.md found in ZIP")
                continue

            # --- Parse markdown to find referenced image filenames ---
            # Patterns: ![alt](images/hash.jpg) or ![alt](./images/hash.jpg)
            referenced_names = set(re.findall(r'\]\(\.?/?images/([^)]+)\)', md_content))

            # --- Extract only images that are referenced in the markdown ---
            images_prefix = md_parent + "images/"
            images = []
            for member in all_members:
                if member.startswith(images_prefix):
                    img_name = Path(member).name
                    img_ext = Path(img_name).suffix.lower()
                    if img_ext in _IMAGE_EXTS and img_name in referenced_names:
                        img_data = zf.read(member)
                        images.append({"name": img_name, "data": img_data})

            if referenced_names and not images:
                print(f"  Warning: markdown references {len(referenced_names)} image(s) but none found in ZIP's images/ dir")

            entry = {
                "file_name": file_name,
                "md_name": md_name,
                "md_content": md_content,
                "images": images,
            }

            if save_to_disk:
                doc_dir = RESULT_DIR / stem
                # Write markdown
                md_path = doc_dir / md_name
                doc_dir.mkdir(parents=True, exist_ok=True)
                md_path.write_text(md_content, encoding="utf-8")
                entry["md_path"] = str(md_path)

                # Write images to disk
                if images:
                    img_dir = doc_dir / "images"
                    img_dir.mkdir(parents=True, exist_ok=True)
                    for img in images:
                        (img_dir / img["name"]).write_bytes(img["data"])

            results.append(entry)

    return results


def run_conversion(file_paths, batch_key):
    """Run the full conversion pipeline in a background thread."""
    try:
        batches[batch_key]["status"] = "uploading"
        other_files, html_files = classify_files(file_paths)

        batch_ids = []
        if other_files:
            bid = upload_and_submit(other_files, "vlm")
            if bid:
                batch_ids.append(bid)
        if html_files:
            bid = upload_and_submit(html_files, "MinerU-HTML")
            if bid:
                batch_ids.append(bid)

        batches[batch_key]["batch_ids"] = batch_ids
        batches[batch_key]["status"] = "parsing"

        extract_results = poll_extract_results(batch_ids)
        download_extract_zip(extract_results, save_to_disk=True)

        batches[batch_key]["status"] = "completed"

    except Exception as e:
        batches[batch_key]["status"] = "failed"
        batches[batch_key]["error"] = str(e)


# ─── API Endpoints ───────────────────────────────────────────────

@app.route("/api/upload", methods=["POST"])
def upload():
    """Upload files to the file/ directory via multipart form data."""
    if "files" not in request.files:
        return jsonify({"code": 1, "msg": "No files provided. Use 'files' field."}), 400

    FILE_DIR.mkdir(parents=True, exist_ok=True)
    saved = []
    skipped = []
    for f in request.files.getlist("files"):
        if not f.filename:
            continue
        safe_name = Path(f.filename).name
        dst = FILE_DIR / safe_name
        f.save(str(dst))
        if dst.suffix.lower() in SUPPORTED_EXTENSIONS:
            saved.append(safe_name)
        else:
            skipped.append(safe_name)

    return jsonify({
        "code": 0,
        "msg": f"Uploaded {len(saved)} files" + (f", skipped {len(skipped)} unsupported" if skipped else ""),
        "data": {"saved": saved, "skipped": skipped},
    })


@app.route("/api/download/<path:filename>", methods=["GET"])
def download(filename):
    """Download a converted markdown file from markdownResult/."""
    file_path = RESULT_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        return jsonify({"code": 1, "msg": f"File not found: {filename}"}), 404
    return send_file(file_path, as_attachment=True, download_name=Path(filename).name)


@app.route("/api/images/<path:filename>", methods=["GET"])
def serve_image(filename):
    """Serve image files from markdownResult subdirectories.

    Images are stored as: markdownResult/<doc>/images/<hash>.ext
    The markdown content references them as ./images/<hash>.ext
    which the browser resolves to /images/<hash>.ext
    """
    # Search all markdownResult subdirectories for the image
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    for doc_dir in RESULT_DIR.iterdir():
        if doc_dir.is_dir():
            candidate = doc_dir / "images" / filename
            if candidate.exists() and candidate.is_file():
                return send_file(candidate)
    return jsonify({"code": 1, "msg": f"Image not found: {filename}"}), 404


@app.route("/api/markdown-images/<markdown_file_id>/<path:image_filename>", methods=["GET"])
def serve_markdown_image(markdown_file_id, image_filename):
    """Serve an image stored in Appwrite that belongs to a markdown file.

    Looks up the image in markdown_image_store by markdown_file_id + image_filename,
    downloads it from Appwrite Storage, and serves it.
    """
    try:
        from databaseOperation import query_images_by_file_id

        records = query_images_by_file_id(markdown_file_id)
        appwrite_file_id = None
        for rec in records:
            if rec["fileName"] == image_filename:
                appwrite_file_id = rec["appwriteFileId"]
                break

        if not appwrite_file_id:
            return jsonify({"code": 1, "msg": f"Image not found: {image_filename}"}), 404

        info = get_file(appwrite_file_id)
        return send_file(
            io.BytesIO(info["content"]),
            mimetype=info.get("mime_type", "image/jpeg"),
            download_name=image_filename,
        )
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/convert-upload", methods=["POST"])
def convert_upload():
    """Upload files and convert them synchronously, returning markdown content.

    Like minerU.py's parse_by_file pattern (upload → poll → return content)
    but uses the v4 batch API.
    """
    if "files" not in request.files:
        return jsonify({"code": 1, "msg": "No files provided. Use 'files' field."}), 400

    FILE_DIR.mkdir(parents=True, exist_ok=True)
    file_paths = []
    for f in request.files.getlist("files"):
        if f.filename:
            safe_name = Path(f.filename).name
            dst = FILE_DIR / safe_name
            f.save(str(dst))
            if dst.suffix.lower() in SUPPORTED_EXTENSIONS:
                file_paths.append(str(dst))

    if not file_paths:
        return jsonify({"code": 1, "msg": "No supported files to convert"}), 400

    try:
        other_files, html_files = classify_files(file_paths)
        batch_ids = []
        if other_files:
            bid = upload_and_submit(other_files, "vlm")
            if bid:
                batch_ids.append(bid)
        if html_files:
            bid = upload_and_submit(html_files, "MinerU-HTML")
            if bid:
                batch_ids.append(bid)

        extract_results = poll_extract_results(batch_ids)
        results = download_extract_zip(extract_results, save_to_disk=True)

        return jsonify({
            "code": 0,
            "msg": f"Conversion completed for {len(results)} files",
            "data": {
                "results": [
                    {
                        "file_name": r["file_name"],
                        "md_name": r["md_name"],
                        "md_content": r["md_content"],
                        "md_path": r.get("md_path", ""),
                    }
                    for r in results
                ],
            },
        })

    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/convert", methods=["POST"])
def convert():
    """Trigger async conversion of all files in the file/ directory."""
    files = scan_files()
    if not files:
        return jsonify({"code": 1, "msg": "No supported files found in file/ directory"}), 400

    batch_key = uuid.uuid4().hex[:12]
    batches[batch_key] = {
        "status": "starting",
        "files": [Path(f).name for f in files],
        "batch_ids": [],
        "error": None,
    }

    thread = threading.Thread(target=run_conversion, args=(files, batch_key), daemon=True)
    thread.start()

    return jsonify({
        "code": 0,
        "msg": "Conversion started",
        "data": {
            "task_id": batch_key,
            "files": batches[batch_key]["files"],
        },
    })


@app.route("/api/status/<task_id>", methods=["GET"])
def status(task_id):
    """Check the status of a conversion task."""
    batch = batches.get(task_id)
    if not batch:
        return jsonify({"code": 1, "msg": "Task not found"}), 404

    return jsonify({
        "code": 0,
        "data": {
            "task_id": task_id,
            "status": batch["status"],
            "files": batch["files"],
            "batch_ids": batch["batch_ids"],
            "error": batch["error"],
        },
    })


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    """List all conversion tasks."""
    return jsonify({
        "code": 0,
        "data": [
            {
                "task_id": k,
                "status": v["status"],
                "files": v["files"],
            }
            for k, v in batches.items()
        ],
    })


@app.route("/api/results", methods=["GET"])
def list_results():
    """List converted markdown files."""
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted([
        {"name": f.name, "path": str(f)}
        for f in RESULT_DIR.iterdir()
        if f.is_file() and f.suffix == ".md"
    ], key=lambda x: x["name"])
    return jsonify({"code": 0, "data": files})


@app.route("/api/files", methods=["GET"])
def list_source_files():
    """List files in the file/ directory."""
    files = scan_files()
    return jsonify({
        "code": 0,
        "data": [{"name": Path(f).name, "path": f} for f in files],
    })


# ─── Document Storage APIs (Appwrite) ──────────────────────────

@app.route("/api/documents", methods=["GET"])
def list_documents():
    """List all files stored in Appwrite bucket."""
    try:
        files = list_files()
        return jsonify({"code": 0, "msg": "ok", "data": files})
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/documents/upload", methods=["POST"])
def upload_document():
    """Upload a file to Appwrite storage bucket."""
    if "file" not in request.files:
        return jsonify({"code": 1, "msg": "No file provided. Use 'file' field."}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"code": 1, "msg": "Empty filename."}), 400

    custom_name = request.form.get("name") or f.filename

    try:
        from io import BytesIO

        f.seek(0)
        file_content = f.read()
        file_io = BytesIO(file_content)

        result = upload_file(file_io, file_name=custom_name)

        return jsonify({
            "code": 0,
            "msg": "Upload successful",
            "data": result  # result 已经是字典了
        })
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/documents/fileContent/<file_id>", methods=["GET"])
def download_document(file_id):
    """Download a file from Appwrite storage by file_id."""
    try:
        info = get_file(file_id)
        return send_file(
            io.BytesIO(info["content"]),
            mimetype=info["mime_type"],
            as_attachment=True,
            download_name=info["file_name"],
        )
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/documents/<file_id>/info", methods=["GET"])
def document_info(file_id):
    """Get metadata for a file in Appwrite storage (no download)."""
    try:
        info = get_file(file_id)
        return jsonify({
            "code": 0,
            "msg": "ok",
            "data": {
                "file_id": info["file_id"],
                "file_name": info["file_name"],
                "mime_type": info["mime_type"],
                "size_bytes": info["size_bytes"],
            },
        })
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/documents/<file_id>/preview", methods=["GET"])
def document_preview(file_id):
    """Get a preview/thumbnail image of a file."""
    width = request.args.get("width", 300, type=int)
    try:
        preview_bytes = get_file_preview(file_id, width=width)
        return send_file(io.BytesIO(preview_bytes), mimetype="image/png")
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/documents/<file_id>", methods=["DELETE"])
def delete_document(file_id):
    """Delete a file from Appwrite storage."""
    try:
        delete_file(file_id)
        return jsonify({"code": 0, "msg": f"File {file_id} deleted."})
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


# ─── Bill Processing APIs ────────────────────────────────────────

@app.route("/api/convert-and-store", methods=["POST"])
def convert_and_store_api():
    """Upload files, convert via MinerU, store MD in Appwrite, insert DB records.

    Accepts multipart: files (multiple), billType (form), companyName (form).
    """
    if "files" not in request.files:
        return jsonify({"code": 1, "msg": "No files provided. Use 'files' field."}), 400

    bill_type = request.form.get("billType", "").strip()
    company_name = request.form.get("companyName", "").strip()
    if not bill_type or not company_name:
        return jsonify({"code": 1, "msg": "billType and companyName are required."}), 400

    FILE_DIR.mkdir(parents=True, exist_ok=True)
    file_paths = []
    for f in request.files.getlist("files"):
        if f.filename:
            safe_name = Path(f.filename).name
            dst = FILE_DIR / safe_name
            f.save(str(dst))
            if dst.suffix.lower() in SUPPORTED_EXTENSIONS:
                file_paths.append(str(dst))

    if not file_paths:
        return jsonify({"code": 1, "msg": "No supported files to convert."}), 400

    try:
        from mixOperation import convert_and_store as cas

        results = cas(file_paths=file_paths, bill_type=bill_type, company_name=company_name)
        return jsonify({"code": 0, "msg": f"Processed {len(results)} files.", "data": results})
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/api/query-rules", methods=["GET"])
def query_bills_api():
    """Query stored bills by billType and companyName.

    Query params: billType, companyName
    Returns: [{filename, content}, ...]
    """
    bill_type = request.args.get("billType", "").strip()
    company_name = request.args.get("companyName", "").strip()
    if not bill_type or not company_name:
        return jsonify({"code": 1, "msg": "billType and companyName are required."}), 400

    try:
        from databaseOperation import query_bill_data

        results = query_bill_data(bill_type=bill_type, company_name=company_name)
        return jsonify({"code": 0, "msg": f"Found {len(results)} records.", "data": results})
    except Exception as e:
        return jsonify({"code": 1, "msg": str(e)}), 500


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "MinerU Document Converter",
        "endpoints": {
            "GET  /": "This info",
            "=== Document Storage (Appwrite) ===": "",
            "GET  /api/documents": "List files in Appwrite bucket",
            "POST /api/documents/upload": "Upload a file to Appwrite (multipart, field: 'file')",
            "GET  /api/documents/<file_id>": "Download a file from Appwrite",
            "GET  /api/documents/<file_id>/info": "Get file metadata",
            "GET  /api/documents/<file_id>/preview": "Get file preview thumbnail",
            "DELETE /api/documents/<file_id>": "Delete a file from Appwrite",
            "=== File System (local) ===": "",
            "GET  /api/files": "List source files in file/ directory",
            "GET  /api/results": "List converted markdown files",
            "POST /api/upload": "Upload files to file/ (multipart, field: 'files')",
            "GET  /api/download/<filename>": "Download a converted markdown file",
            "=== MinerU Conversion ===": "",
            "POST /api/convert": "Trigger async conversion of all files in file/",
            "POST /api/convert-upload": "Upload files and convert synchronously",
            "GET  /api/status/<task_id>": "Check conversion task status",
            "GET  /api/tasks": "List all conversion tasks",
            "=== Bill Processing ===": "",
            "POST /api/convert-and-store": "Upload files, convert via MinerU, store MD & metadata in Appwrite",
            "GET  /api/query-rules": "Query stored bills by billType and companyName",
        },
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
