import os
import re
from typing import List, Dict, Any, Optional

from appwrite.client import Client
from appwrite.query import Query
from appwrite.services.tables_db import TablesDB
from appwrite.id import ID  # 用于生成唯一ID

from dotenv import load_dotenv

load_dotenv()
APPWRITE_KEY = os.getenv("APPWRITE_KEY")
PROJECT_ID = os.getenv("PROJECT_ID")
DATABASE_ID = os.getenv("DATABASE_ID")
TABLE_FILE_STORE_ID = os.getenv("TABLE_FILE_STORE_ID")
TABLE_IMAGE_STORE_ID = os.getenv("TABLE_IMAGE_STORE_ID")

client = Client()

(client
 .set_endpoint('https://app.anranshenxia.top/v1')
 .set_project(PROJECT_ID)
 .set_key(APPWRITE_KEY)
 # .set_self_signed()
 )

tablesDB = TablesDB(client)


def insert_bill_data(file_id: str, bill_type: str, company_name: str):
    """
 向账单表插入数据（使用 createRow 方法）

 Args:
     file_id (str): 文件ID（需要手动传入）
     bill_type (str): 账单类型
     company_name (str): 公司名称
     filed (str, optional): 其他字段，默认为None

 Returns:
     dict: 插入的数据结果
 """
    try:
        # 准备要插入的数据
        data = {
            "fileId": file_id,
            "billType": bill_type,
            "companyName": company_name
        }

        # 使用 createRow 方法插入数据
        # rowId 可以使用 ID.unique() 自动生成，也可以自定义
        result = tablesDB.create_row(
            database_id=DATABASE_ID,
            table_id=TABLE_FILE_STORE_ID,
            row_id=ID.unique(),  # 自动生成唯一ID作为 $id
            data=data
        )
        # 打印所有可用的属性用于调试
        # print("Result type:", type(result))
        # print("Result dir:", [attr for attr in dir(result) if not attr.startswith('_')])
        return result

    except Exception as e:
        print(f"[ERROR] Insert failed: {str(e)}")
        return None

def batch_insert_bill_data(data_list: List[Dict[str, Any]], transaction_id: Optional[str] = None):
    """
    批量向账单表插入数据（使用 create_rows 方法）

    Args:
        data_list (List[Dict[str, Any]]): 账单数据列表，每个元素包含:
            - file_id: 文件ID
            - bill_type: 账单类型
            - company_name: 公司名称
        transaction_id (Optional[str]): 事务ID，用于暂存操作

    Returns:
        dict: 批量插入结果，包含成功创建的行数据

    Example:
        data = [
            {
                "file_id": "FILE_001",
                "bill_type": "发票",
                "company_name": "科技有限公司"
            },
            {
                "file_id": "FILE_002",
                "bill_type": "收据",
                "company_name": "商贸有限公司"
            }
        ]
        result = batch_insert_bill_data(data)
    """
    if not data_list:
        print("[ERROR] 数据列表为空")
        return None

    # 准备批量数据：将字典键名映射为数据库字段名，并添加 $id
    rows = []
    for item in data_list:
        row = {
            "$id": ID.unique(),  # 自动生成唯一ID
            "fileId": item.get("file_id"),
            "billType": item.get("bill_type"),
            "companyName": item.get("company_name"),
            "originalFileId": item.get("original_file_id", ""),
        }

        # 添加其他额外字段
        for key, value in item.items():
            if key not in ["file_id", "bill_type", "company_name", "original_file_id"]:
                row[key] = value

        rows.append(row)

    try:
        # 调用批量插入方法
        result = tablesDB.create_rows(
            database_id=DATABASE_ID,
            table_id=TABLE_FILE_STORE_ID,
            rows=rows,
            transaction_id=transaction_id
        )

        # 打印成功信息
        success_count = len(result.rows) if hasattr(result, 'rows') else len(rows)
        print(f"[OK] 批量插入成功: 共插入 {success_count} 条数据")

        return result

    except Exception as e:
        print(f"[ERROR] 批量插入失败: {str(e)}")
        return None


def list_all_file_store():
    """List all records from the file_store table.

    Returns:
        list of dicts: [{fileId, billType, companyName, originalFileId}, ...]
    """
    try:
        rows = tablesDB.list_rows(
            database_id=DATABASE_ID,
            table_id=TABLE_FILE_STORE_ID,
        )

        row_list = []
        if hasattr(rows, "rows"):
            row_list = rows.rows
        else:
            for item in rows:
                if isinstance(item, tuple) and item[0] == "rows":
                    row_list = item[1]
                    break

        results = []
        for row in row_list:
            row_data = row.data if hasattr(row, "data") else {}
            results.append({
                "fileId": row_data.get("fileId", ""),
                "billType": row_data.get("billType", ""),
                "companyName": row_data.get("companyName", ""),
                "originalFileId": row_data.get("originalFileId", ""),
            })

        return results
    except Exception as e:
        print(f"[ERROR] List all file_store failed: {str(e)}")
        return []


def query_bill_data(bill_type: str, company_name: str):
    """Query file_store by billType and companyName, return file contents.

    Args:
        bill_type: bill type string.
        company_name: company name string.

    Returns:
        list of dicts: [{filename, content}, ...]
    """
    try:
        rows = tablesDB.list_rows(
            database_id=DATABASE_ID,
            table_id=TABLE_FILE_STORE_ID,
            queries=[
                Query.equal("billType", bill_type),
                Query.equal("companyName", company_name),
            ],
        )

        from documentsOperation import get_file

        # normalize: RowList iterates as (key, value) tuples
        row_list = []
        if hasattr(rows, "rows"):
            row_list = rows.rows
        else:
            for item in rows:
                if isinstance(item, tuple) and item[0] == "rows":
                    row_list = item[1]
                    break

        results = []
        for row in row_list:
            row_data = row.data if hasattr(row, "data") else {}
            file_id = row_data.get("fileId")
            if not file_id:
                continue
            file_info = get_file(file_id)
            content = file_info["content"]
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="replace")

            # Query image records for this markdown file
            image_records = query_images_by_file_id(file_id)

            # Transform image URLs only for images that exist in the DB:
            #   images/xxx.jpg  →  /api/markdown-images/{fileId}/xxx.jpg
            for img in image_records:
                content = content.replace(
                    f"](images/{img['fileName']})",
                    f"](/api/markdown-images/{file_id}/{img['fileName']})",
                )

            results.append({
                "filename": file_info["file_name"],
                "content": content,
                "file_id": file_id,
            })

        return results

    except Exception as e:
        print(f"[ERROR] Query failed: {str(e)}")
        return []


# ─── Image Store Operations ────────────────────────────────────────

def insert_image_record(file_id: str, appwrite_file_id: str, file_name: str):
    """Insert a single record into markdown_image_store.

    Args:
        file_id: The markdown file's Appwrite Storage fileId.
        appwrite_file_id: The image file's Appwrite Storage fileId.
        file_name: Original image filename (e.g. hash.jpg).

    Returns:
        dict: Insert result or None on failure.
    """
    try:
        data = {
            "fileId": file_id,
            "appwriteFileId": appwrite_file_id,
            "fileName": file_name,
        }
        result = tablesDB.create_row(
            database_id=DATABASE_ID,
            table_id=TABLE_IMAGE_STORE_ID,
            row_id=ID.unique(),
            data=data,
        )
        return result
    except Exception as e:
        print(f"[ERROR] Insert image record failed: {str(e)}")
        return None


def batch_insert_image_records(data_list: List[Dict[str, Any]], transaction_id: Optional[str] = None):
    """Batch insert records into markdown_image_store.

    Args:
        data_list: List of dicts with keys:
            - file_id: The markdown file's Appwrite Storage fileId.
            - appwrite_file_id: The image file's Appwrite Storage fileId.
            - file_name: Original image filename.
        transaction_id: Optional transaction ID.

    Returns:
        dict: Batch insert result or None on failure.
    """
    if not data_list:
        print("[ERROR] Image data list is empty")
        return None

    rows = []
    for item in data_list:
        row = {
            "$id": ID.unique(),
            "fileId": item.get("file_id"),
            "appwriteFileId": item.get("appwrite_file_id"),
            "fileName": item.get("file_name"),
        }
        rows.append(row)

    try:
        result = tablesDB.create_rows(
            database_id=DATABASE_ID,
            table_id=TABLE_IMAGE_STORE_ID,
            rows=rows,
            transaction_id=transaction_id,
        )
        success_count = len(result.rows) if hasattr(result, "rows") else len(rows)
        print(f"[OK] Batch inserted {success_count} image record(s)")
        return result
    except Exception as e:
        print(f"[ERROR] Batch insert image records failed: {str(e)}")
        return None


def query_images_by_file_id(file_id: str):
    """Query all image records for a given markdown fileId.

    Args:
        file_id: The markdown file's Appwrite Storage fileId.

    Returns:
        list of dicts: [{fileName, appwriteFileId}, ...]
    """
    try:
        rows = tablesDB.list_rows(
            database_id=DATABASE_ID,
            table_id=TABLE_IMAGE_STORE_ID,
            queries=[
                Query.equal("fileId", file_id),
            ],
        )

        row_list = []
        if hasattr(rows, "rows"):
            row_list = rows.rows
        else:
            for item in rows:
                if isinstance(item, tuple) and item[0] == "rows":
                    row_list = item[1]
                    break

        results = []
        for row in row_list:
            row_data = row.data if hasattr(row, "data") else {}
            results.append({
                "fileName": row_data.get("fileName", ""),
                "appwriteFileId": row_data.get("appwriteFileId", ""),
            })

        return results
    except Exception as e:
        print(f"[ERROR] Query images failed: {str(e)}")
        return []


if __name__ == "__main__":
     # 示例1：插入数据（使用自动生成的rowId作为$id）
    # result = insert_bill_data(
    #     file_id="FILE_2024001",
    #     bill_type="发票",
    #     company_name="某某科技有限公司",
    # )
    # 准备批量数据
    #############################################
    # batch_data = [
    #     {
    #         "file_id": "FILE_2024001",
    #         "bill_type": "发票",
    #         "company_name": "某某科技有限公司",
    #     },
    #     {
    #         "file_id": "FILE_2024002",
    #         "bill_type": "收据",
    #         "company_name": "某某商贸有限公司",
    #     },
    #     {
    #         "file_id": "FILE_2024003",
    #         "bill_type": "发票",
    #         "company_name": "某某服务有限公司",
    #     },
    #     {
    #         "file_id": "FILE_2024004",
    #         "bill_type": "合同",
    #         "company_name": "某某咨询有限公司",
    #     }
    # ]
    #
    # # 方法1：基本批量插入
    # print("=== 基本批量插入 ===")
    # result = batch_insert_bill_data(batch_data)
    #
    # if result:
    #     # 访问结果中的行数据
    #     if hasattr(result, 'rows'):
    #         print(f"成功创建 {len(result.rows)} 行")
    #         for row in result.rows:
    #             print(f"  - Row ID: {row.id}, File ID: {row.data.get('fileId')}")
    ####################################################
    result= query_bill_data("发票","测试公司")
    print(result)