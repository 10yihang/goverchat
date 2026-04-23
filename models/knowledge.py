from __future__ import annotations

"""
kb_knowledge 表 CRUD 操作
"""
from models.db import execute


def get_all_active() -> list[dict]:
    """获取所有启用状态的知识条目（用于 TF-IDF 构建矩阵）"""
    sql = """
        SELECT id, question, answer, category, keywords, weight
        FROM kb_knowledge
        WHERE is_active = 1
        ORDER BY weight DESC, id ASC
    """
    return execute(sql, fetchall=True) or []


def get_by_id(kid: int) -> dict | None:
    """按 ID 获取单条知识"""
    sql = "SELECT id, question, answer, category, keywords FROM kb_knowledge WHERE id = %s"
    return execute(sql, (kid,), fetchone=True)


def insert(question: str, answer: str, category: str = "",
           keywords: str = "", weight: float = 1.0) -> int:
    """插入新知识条目，返回新记录 ID"""
    sql = """
        INSERT INTO kb_knowledge (question, answer, category, keywords, weight, is_active)
        VALUES (%s, %s, %s, %s, %s, 1)
    """
    return execute(sql, (question, answer, category, keywords, weight), commit=True)


def update(kid: int, question: str = None, answer: str = None,
           category: str = None, keywords: str = None, weight: float = None,
           is_active: int = None) -> None:
    """动态更新知识条目（只更新传入的非 None 字段）"""
    fields, args = [], []
    mapping = {
        "question": question, "answer": answer,
        "category": category, "keywords": keywords,
        "weight": weight, "is_active": is_active,
    }
    for col, val in mapping.items():
        if val is not None:
            fields.append(f"{col} = %s")
            args.append(val)
    if not fields:
        return
    args.append(kid)
    sql = f"UPDATE kb_knowledge SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s"
    execute(sql, tuple(args), commit=True)


def soft_delete(kid: int) -> None:
    """软删除：将 is_active 置 0"""
    execute("UPDATE kb_knowledge SET is_active = 0 WHERE id = %s", (kid,), commit=True)


def count_active() -> int:
    """返回当前有效知识条目数量"""
    row = execute("SELECT COUNT(*) AS cnt FROM kb_knowledge WHERE is_active = 1", fetchone=True)
    return row["cnt"] if row else 0
