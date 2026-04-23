from __future__ import annotations

"""
chat_session + chat_message 表操作
"""
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
) -> int:
    """
    向指定会话追加一条消息，返回消息 ID。

    Args:
        session_id:   会话 UUID
        role:         'user' | 'bot'
        content:      消息内容
        msg_type:     'text' | 'voice'
        confidence:   TF-IDF 相似度得分（0~1）
        knowledge_id: 命中的知识条目 ID（兜底时为 None）
    """
    sql = """
        INSERT INTO chat_message
            (session_id, role, content, msg_type, confidence, knowledge_id)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    return execute(
        sql,
        (session_id, role, content, msg_type, confidence, knowledge_id),
        commit=True,
    )


def get_messages(session_id: str) -> list[dict]:
    """
    按时间正序获取指定会话全部消息。
    返回字段：id, role, content, msg_type, confidence, knowledge_id, created_at
    """
    sql = """
        SELECT id, role, content, msg_type, confidence, knowledge_id,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM chat_message
        WHERE session_id = %s
        ORDER BY id ASC
    """
    return execute(sql, (session_id,), fetchall=True) or []


def delete_session_messages(session_id: str) -> None:
    """删除指定会话的全部消息（级联删除时由 DB 自动处理，此函数备用）"""
    execute(
        "DELETE FROM chat_message WHERE session_id = %s", (session_id,), commit=True
    )
