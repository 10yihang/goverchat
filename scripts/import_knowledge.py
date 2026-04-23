"""
CSV 批量导入脚本
用法：
    python scripts/import_knowledge.py
    python scripts/import_knowledge.py --truncate   # 先清空再导入
"""
import sys
import os
import csv
import argparse

# 将项目根目录加入 sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pymysql
import config

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge.csv")


def get_conn():
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset=config.DB_CHARSET,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def import_csv(truncate: bool = False):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if truncate:
                cur.execute("TRUNCATE TABLE kb_knowledge")
                print("[INFO] 已清空 kb_knowledge 表")

            with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            sql = """
                INSERT INTO kb_knowledge
                    (question, answer, category, keywords, weight, is_active)
                VALUES
                    (%s, %s, %s, %s, %s, 1)
            """
            inserted = 0
            skipped = 0
            for row in rows:
                q = row.get("question", "").strip()
                a = row.get("answer", "").strip()
                if not q or not a:
                    skipped += 1
                    continue
                cur.execute(sql, (
                    q,
                    a,
                    row.get("category", "").strip(),
                    row.get("keywords", "").strip(),
                    float(row.get("weight", 1.0)),
                ))
                inserted += 1

        conn.commit()
        print(f"[INFO] 导入完成：成功 {inserted} 条，跳过 {skipped} 条")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] 导入失败：{e}")
        raise
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="知识库 CSV 导入工具")
    parser.add_argument(
        "--truncate", action="store_true",
        help="导入前先清空 kb_knowledge 表"
    )
    args = parser.parse_args()
    import_csv(truncate=args.truncate)


if __name__ == "__main__":
    main()
