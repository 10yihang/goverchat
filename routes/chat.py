from flask import Blueprint, request, jsonify

from services.chat_service import chat_service
from services.c_auth_service import c_login_required, current_c_user

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
