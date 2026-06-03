import os
import io
from pathlib import Path

from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.input_file import InputFile
from appwrite.id import ID
from dotenv import load_dotenv

load_dotenv()
APPWRITE_KEY = os.getenv("APPWRITE_KEY")
PROJECT_ID = os.getenv("PROJECT_ID")
BUCKET_ID = os.getenv("BUCKET_ID")

client = Client()
client.set_endpoint('https://app.anranshenxia.top/v1')
client.set_project(PROJECT_ID)
client.set_key(APPWRITE_KEY)

storage = Storage(client)


def upload_file(file_path, file_name=None, permissions=None):
    """Upload a file to Appwrite storage bucket.

    Args:
        file_path: Path to the local file, or a file-like object (BytesIO etc.).
        file_name: Custom name for the file in storage. If None, uses the source filename.
        permissions: List of permissions, e.g. ['read("any")'].

    Returns:
        dict: {file_id, file_name, bucket_id} or raises on failure.
    """
    if permissions is None:
        permissions = ['read("any")']

    file_id = ID.unique()

    if isinstance(file_path, (str, Path)):
        path = Path(file_path)
        if file_name is None:
            file_name = path.name
        input_file = InputFile.from_path(str(path))
    else:
        # File-like object (BytesIO, etc.)
        if file_name is None:
            file_name = "uploaded_file"

        file_path.seek(0)
        content = file_path.read()
        input_file = InputFile.from_bytes(content, file_name)

    result = storage.create_file(
        bucket_id=BUCKET_ID,
        file_id=file_id,
        file=input_file,
        permissions=permissions,
    )
    # # 打印所有可用的属性用于调试
    # print("Result type:", type(result))
    # print("Result dir:", [attr for attr in dir(result) if not attr.startswith('_')])
    # # 将 Appwrite 的 File 对象转换为字典
    # return result
    # 将 Appwrite 的 File 对象转换为字典
    return {
        "file_id": result.id,
        "file_name": result.name,
        "bucket_id": result.bucketid,
        "created_at": result.createdat,
        "updated_at": result.updatedat,
        "mime_type": result.mimetype,
        "size_original": result.sizeoriginal,
        "signature": result.signature,
        "permissions": result.permissions,
    }


def get_file(file_id):
    """Get file metadata and download content from Appwrite storage.

    Returns:
        dict: {file_id, file_name, mime_type, size_bytes, content (bytes)}.
    """
    meta = storage.get_file(bucket_id=BUCKET_ID, file_id=file_id)
    content = storage.get_file_download(bucket_id=BUCKET_ID, file_id=file_id)

    # 使用属性访问而不是字典索引
    return {
        "file_id": meta.id,
        "file_name": meta.name,
        "mime_type": meta.mimetype,
        "size_bytes": meta.sizeoriginal,
        "content": content,
    }


def get_file_preview(file_id, width=300):
    """Get a preview (thumbnail) image of a file."""
    result = storage.get_file_preview(
        bucket_id=BUCKET_ID, file_id=file_id, width=width
    )
    return result


def list_files(query=None, search=None):
    """List all files in the storage bucket.

    Returns:
        list of dicts with file metadata.
    """
    queries = []
    if query:
        queries.append(query)
    if search:
        queries.append(search)

    result = storage.list_files(bucket_id=BUCKET_ID, queries=queries)
    files = []
    # Appwrite SDK returns a FileList object with a .files attribute
    file_items = result.files if hasattr(result, "files") else []
    for f in file_items:
        files.append({
            "file_id": f.id,
            "file_name": f.name,
            "mime_type": getattr(f, "mimeType", getattr(f, "mimetype", "")),
            "size_bytes": getattr(f, "sizeOriginal", getattr(f, "sizeoriginal", 0)),
            "created_at": getattr(f, "createdat", getattr(f, "$createdAt", "")),
        })
    return files


def delete_file(file_id):
    """Delete a file from Appwrite storage."""
    storage.delete_file(bucket_id=BUCKET_ID, file_id=file_id)
    return True


if __name__ == "__main__":
    # 上传文件
    # file_path = r"D:\Document_Recall\markdownResult\1706.03762v7\full.md"
    #
    # print(f"开始上传文件: {file_path}")
    # print(f"文件是否存在: {os.path.exists(file_path)}")

    try:
        # result = upload_file(file_path)
        # print(f"\n✅ 上传成功！")
        # print(result)
        result=get_file("6a179938002b2c88a3b7")


    except Exception as e:
        print(f"\n❌ 上传失败: {e}")