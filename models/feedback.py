"""message_feedback 表 CRUD"""

from __future__ import annotations
from models.db import execute


def insert_feedback(
    message_id: int,
    session_id: str,
    user_id: int | None,
    rating: str,
    reason_text: str | None,
) -> int:
    return execute(
        """
        INSERT INTO message_feedback (message_id, session_id, user_id, rating, reason_text)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (message_id, session_id, user_id, rating, reason_text),
        commit=True,
    )


def list_feedbacks_with_context(
    rating: str | None = None, limit: int = 100
) -> list[dict]:
    """
    返回反馈 + 关联的 bot 回答 + 同会话上一条用户问题。
    """
    where = "WHERE 1=1"
    args: list = []
    if rating in ("up", "down"):
        where += " AND f.rating = %s"
        args.append(rating)
    args.append(limit)

    sql = f"""
        SELECT
            f.id, f.message_id, f.session_id, f.user_id, f.rating, f.reason_text,
            DATE_FORMAT(f.created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
            bot.content AS bot_answer,
            bot.confidence,
            (
                SELECT u.content FROM chat_message u
                WHERE u.session_id = f.session_id AND u.role = 'user' AND u.id < f.message_id
                ORDER BY u.id DESC LIMIT 1
            ) AS user_question
        FROM message_feedback f
        LEFT JOIN chat_message bot ON bot.id = f.message_id
        {where}
        ORDER BY f.id DESC
        LIMIT %s
    """
    return execute(sql, tuple(args), fetchall=True) or []


def count_by_rating() -> dict:
    rows = (
        execute(
            "SELECT rating, COUNT(*) AS cnt FROM message_feedback GROUP BY rating",
            fetchall=True,
        )
        or []
    )
    return {r["rating"]: int(r["cnt"]) for r in rows}
