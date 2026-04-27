import json
import logging

from flask import Blueprint, request, jsonify, Response, stream_with_context

from services.chat_service import chat_service
from services.c_auth_service import c_login_required, current_c_user

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)


@chat_bp.post("/api/chat/send")
@c_login_required
def send():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "empty_text", "message": "text 字段不能为空"}), 400

    user = current_c_user()
    user_agent = request.headers.get("User-Agent", "")
    ip = request.remote_addr or ""

    session_id = chat_service.ensure_session(
        data.get("session_id"),
        user_agent=user_agent,
        ip=ip,
        user_id=int(user["id"]),
    )

    result = chat_service.answer(session_id, text, msg_type="text")
    return jsonify(result), 200


@chat_bp.post("/api/chat/session/new")
@c_login_required
def new_session():
    user = current_c_user()
    user_agent = request.headers.get("User-Agent", "")
    ip = request.remote_addr or ""
    sid = chat_service.new_session(
        user_agent=user_agent, ip=ip, user_id=int(user["id"])
    )
    return jsonify({"session_id": sid}), 201


@chat_bp.post("/api/chat/stream")
@c_login_required
def stream():
    """
    SSE 流式问答接口。
    Request: {"session_id": "...", "text": "..."}
    Response: text/event-stream
    """
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "empty_text", "message": "text 字段不能为空"}), 400

    user = current_c_user()
    sid = chat_service.ensure_session(
        session_id,
        user_agent=request.headers.get("User-Agent", ""),
        ip=request.remote_addr or "",
        user_id=int(user["id"]),
    )

    def event_stream():
        try:
            for event in chat_service.answer_stream(sid, text, msg_type="text"):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as exc:
            logger.exception("[Chat] stream error")
            yield f"data: {json.dumps({'type': 'error', 'data': {'error': str(exc)}}, ensure_ascii=False)}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@chat_bp.post("/api/chat/feedback")
@c_login_required
def feedback():
    """提交消息反馈
    Request: {"message_id": 123, "rating": "up"|"down", "reason_text": "..."}
    """
    from services.feedback_service import submit_feedback

    data = request.get_json(silent=True) or {}
    user = current_c_user()
    result = submit_feedback(
        message_id=int(data.get("message_id") or 0),
        user_id=int(user["id"]),
        rating=str(data.get("rating") or ""),
        reason_text=data.get("reason_text"),
    )
    if not result.get("ok"):
        return jsonify(result), 400
    return jsonify(result), 200
