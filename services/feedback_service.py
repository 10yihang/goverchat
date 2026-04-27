"""消息反馈业务编排"""

from __future__ import annotations
import logging
from models.feedback import (
    insert_feedback,
    list_feedbacks_with_context,
    count_by_rating,
)
from models.conversation import get_message_by_id

logger = logging.getLogger(__name__)


def submit_feedback(
    message_id: int,
    user_id: int | None,
    rating: str,
    reason_text: str | None = None,
) -> dict:
    """
    用户提交反馈。返回 {"ok": True} 或 {"ok": False, "error": "..."}
    """
    if rating not in ("up", "down"):
        return {"ok": False, "error": "invalid_rating"}

    msg = get_message_by_id(message_id)
    if msg is None:
        return {"ok": False, "error": "message_not_found"}
    if msg.get("role") != "bot":
        return {"ok": False, "error": "not_bot_message"}

    try:
        insert_feedback(
            message_id=message_id,
            session_id=msg["session_id"],
            user_id=user_id,
            rating=rating,
            reason_text=(reason_text or "")[:500] or None,
        )
    except Exception as exc:
        msg_str = str(exc).lower()
        if "duplicate" in msg_str:
            return {"ok": False, "error": "already_rated"}
        logger.warning("[Feedback] 写库失败 err=%s", exc)
        return {"ok": False, "error": "db_error"}

    return {"ok": True}


def list_feedbacks(rating: str | None = None, limit: int = 100) -> list[dict]:
    """
    管理员视图：返回反馈列表 + 关联消息内容 + 用户问题。
    """
    return list_feedbacks_with_context(rating=rating, limit=limit)


def get_stats() -> dict:
    """统计：总数 / up / down / 满意率"""
    counts = count_by_rating()
    up = counts.get("up", 0)
    down = counts.get("down", 0)
    total = up + down
    return {
        "total": total,
        "up": up,
        "down": down,
        "satisfaction_rate": round(up / total, 3) if total > 0 else None,
    }
