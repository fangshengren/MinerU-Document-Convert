import io
from pathlib import Path

from dotenv import load_dotenv

from app import (
    classify_files,
    apply_upload_urls,
    upload_files_to_urls,
    poll_extract_results,
    download_extract_zip,
)
from documentsOperation import upload_file
from databaseOperation import batch_insert_bill_data

load_dotenv()


# File extensions that bypass MinerU, uploaded directly to Appwrite
SKIP_DIRECT = {".txt", ".md"}


def _upload_content_and_record(content, md_name, original_name, bill_type, company_name):
    """Upload content to Appwrite and return (db_row, result_entry)."""
    file_io = io.BytesIO(content.encode("utf-8"))
    result = upload_file(file_io, file_name=md_name)
    file_id = result["file_id"]
    print(f"Uploaded {md_name} -> file_id: {file_id}")

    db_row = {"file_id": file_id, "bill_type": bill_type, "company_name": company_name}
    entry = {
        "file_name": original_name,
        "md_name": md_name,
        "file_id": file_id,
        "bill_type": bill_type,
        "company_name": company_name,
    }
    return db_row, entry


def convert_and_store(file_paths, bill_type, company_name):
    """Convert files via MinerU, store MD in Appwrite, insert metadata into DB."""
    if not file_paths:
        print("No files provided.")
        return []

    # Separate files that skip MinerU (txt/md) from those that need conversion
    direct_files = [f for f in file_paths if Path(f).suffix.lower() in SKIP_DIRECT]
    mineru_files = [f for f in file_paths if Path(f).suffix.lower() not in SKIP_DIRECT]

    results = []
    db_rows = []

    # txt/md files: read directly, skip MinerU
    for i, fp in enumerate(direct_files):
        with open(fp, "r", encoding="utf-8") as f:
            content = f.read()
        md_name = Path(fp).stem + ".md"
        db_row, entry = _upload_content_and_record(content, md_name, Path(fp).name, bill_type, company_name)
        db_rows.append(db_row)
        results.append(entry)

    # Other files: process via MinerU
    if mineru_files:
        # Upload original files to Appwrite before MinerU conversion
        original_id_map = {}  # filename -> original_file_id
        for fp in mineru_files:
            with open(fp, "rb") as f:
                file_io = io.BytesIO(f.read())
            result = upload_file(file_io, file_name=Path(fp).name)
            original_id_map[Path(fp).name] = result["file_id"]
            print(f"Uploaded original {Path(fp).name} -> file_id: {result['file_id']}")

        other_files, html_files = classify_files(mineru_files)

        # Submit to MinerU by file type: non-HTML uses vlm, HTML uses MinerU-HTML
        batch_ids = []
        if other_files:
            bid = _upload_batch(other_files, "vlm")
            if bid:
                batch_ids.append(bid)
        if html_files:
            bid = _upload_batch(html_files, "MinerU-HTML")
            if bid:
                batch_ids.append(bid)

        if batch_ids:
            md_results = download_extract_zip(poll_extract_results(batch_ids), save_to_disk=False)
            for i, r in enumerate(md_results):
                md_name = Path(r["file_name"]).stem + ".md"
                db_row, entry = _upload_content_and_record(
                    r["md_content"], md_name, r["file_name"], bill_type, company_name
                )
                # Attach original file id from pre-upload
                original_id = original_id_map.get(r["file_name"], "")
                db_row["original_file_id"] = original_id
                entry["original_file_id"] = original_id
                db_rows.append(db_row)
                results.append(entry)

    if not results:
        print("No files were processed.")
        return []

    batch_insert_bill_data(db_rows)
    print(f"Batch inserted {len(db_rows)} rows into database.")
    return results


def _upload_batch(file_paths, model_version):
    """Apply MinerU upload URLs and push files, return batch_id."""
    result = apply_upload_urls(file_paths, model_version)
    if result is None:
        return None
    batch_id, urls = result
    upload_files_to_urls(file_paths, urls)
    return batch_id


if __name__ == "__main__":
    from pathlib import Path

    file_dir = Path(__file__).parent / "file"
    test_files = [str(f) for f in file_dir.iterdir() if f.is_file()]

    result = convert_and_store(
        file_paths=test_files,
        bill_type="发票",
        company_name="测试公司",
    )
    print("\nDone:", result)

