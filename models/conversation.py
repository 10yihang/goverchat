from __future__ import annotations

"""
chat_session + chat_message 表操作
"""
import json
import uuid
from models.db import execute


# ─────────────────────────────────────────────
# chat_session
# ─────────────────────────────────────────────


def create_session(
    user_agent: str = "", ip_address: str = "", user_id: int | None = None
) -> str:
    """创建新会话，返回 session_id (UUID)"""
    sid = str(uuid.uuid4())
    sql = """
        INSERT INTO chat_session (session_id, user_id, user_agent, ip_address)
        VALUES (%s, %s, %s, %s)
    """
    execute(
        sql,
        (sid, user_id, user_agent[:512] if user_agent else "", ip_address),
        commit=True,
    )
    return sid


def session_exists(session_id: str) -> bool:
    """检查 session_id 是否存在"""
    row = execute(
        "SELECT id FROM chat_session WHERE session_id = %s",
        (session_id,),
        fetchone=True,
    )
    return row is not None


def get_session_owner(session_id: str) -> int | None:
    row = execute(
        "SELECT user_id FROM chat_session WHERE session_id = %s",
        (session_id,),
        fetchone=True,
    )
    if row is None:
        return None
    uid = row.get("user_id")
    return int(uid) if uid is not None else None


def claim_session(session_id: str, user_id: int) -> None:
    """把匿名 session（user_id IS NULL）认领给指定 user_id；已有归属者不动"""
    execute(
        "UPDATE chat_session SET user_id = %s WHERE session_id = %s AND user_id IS NULL",
        (user_id, session_id),
        commit=True,
    )


_LIST_SESSIONS_SELECT = """
        SELECT
            s.session_id,
            COALESCE(
                (
                    SELECT LEFT(cm.content, 30)
                    FROM chat_message cm
                    WHERE cm.session_id = s.session_id AND cm.role = 'user'
                    ORDER BY cm.id ASC
                    LIMIT 1
                ),
                '新会话'
            ) AS title,
            COALESCE(
                (
                    SELECT LEFT(cm.content, 60)
                    FROM chat_message cm
                    WHERE cm.session_id = s.session_id
                    ORDER BY cm.id DESC
                    LIMIT 1
                ),
                '暂无消息'
            ) AS preview,
            (
                SELECT COUNT(*)
                FROM chat_message cm
                WHERE cm.session_id = s.session_id
            ) AS message_count,
            DATE_FORMAT(s.created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
            DATE_FORMAT(
                COALESCE(
                    (
                        SELECT cm.created_at
                        FROM chat_message cm
                        WHERE cm.session_id = s.session_id
                        ORDER BY cm.id DESC
                        LIMIT 1
                    ),
                    s.created_at
                ),
                '%%Y-%%m-%%d %%H:%%i:%%S'
            ) AS updated_at
        FROM chat_session s
"""

_LIST_SESSIONS_ORDER = """
        ORDER BY
            COALESCE(
                (
                    SELECT MAX(cm.id)
                    FROM chat_message cm
                    WHERE cm.session_id = s.session_id
                ),
                0
            ) DESC,
            s.id DESC
        LIMIT %s
"""


def list_sessions(limit: int = 30) -> list[dict]:
    sql = _LIST_SESSIONS_SELECT + _LIST_SESSIONS_ORDER
    return execute(sql, (limit,), fetchall=True) or []


def list_sessions_by_user(user_id: int, limit: int = 50) -> list[dict]:
    sql = _LIST_SESSIONS_SELECT + " WHERE s.user_id = %s " + _LIST_SESSIONS_ORDER
    return execute(sql, (user_id, limit), fetchall=True) or []


# ─────────────────────────────────────────────
# chat_message
# ─────────────────────────────────────────────


def add_message(
    session_id: str,
    role: str,
    content: str,
    msg_type: str = "text",
    confidence: float = 0.0,
    knowledge_id: int = None,
    service_card: dict | None = None,
    form_prompt: dict | None = None,
) -> int:
    sql = """
        INSERT INTO chat_message
            (session_id, role, content, msg_type, confidence, knowledge_id,
             service_card, form_prompt)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    def _safe_dumps(value, label):
        if not value:
            return None
        try:
            return json.dumps(value, ensure_ascii=False, default=str)
        except (TypeError, ValueError) as exc:
            import logging

            logging.getLogger(__name__).warning(
                "[Conversation] %s 序列化失败，按 None 入库: %s", label, exc
            )
            return None

    return execute(
        sql,
        (
            session_id,
            role,
            content,
            msg_type,
            confidence,
            knowledge_id,
            _safe_dumps(service_card, "service_card"),
            _safe_dumps(form_prompt, "form_prompt"),
        ),
        commit=True,
    )


def _parse_json_field(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return None


def get_messages(session_id: str) -> list[dict]:
    sql = """
        SELECT id, role, content, msg_type, confidence, knowledge_id,
               service_card, form_prompt,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM chat_message
        WHERE session_id = %s
        ORDER BY id ASC
    """
    rows = execute(sql, (session_id,), fetchall=True) or []
    for row in rows:
        row["service_card"] = _parse_json_field(row.get("service_card"))
        row["form_prompt"] = _parse_json_field(row.get("form_prompt"))
    return rows


def delete_session_messages(session_id: str) -> None:
    """删除指定会话的全部消息（级联删除时由 DB 自动处理，此函数备用）"""
    execute(
        "DELETE FROM chat_message WHERE session_id = %s", (session_id,), commit=True
    )


def get_recent_messages(session_id: str, limit: int = 20) -> list[dict]:
    """取最近 N 条，按时间正序返回（最旧在前），仅 id+role+content"""
    sql = """
        SELECT id, role, content
        FROM chat_message
        WHERE session_id = %s
        ORDER BY id DESC
        LIMIT %s
    """
    rows = execute(sql, (session_id, limit), fetchall=True) or []
    return list(reversed(rows))


def get_message_by_id(message_id: int) -> dict | None:
    """单条消息查询，用于反馈校验"""
    return execute(
        "SELECT id, session_id, role, content FROM chat_message WHERE id = %s",
        (message_id,),
        fetchone=True,
    )
