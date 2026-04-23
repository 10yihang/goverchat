from flask import Blueprint, jsonify

from models.conversation import (
    get_messages,
    session_exists,
    get_session_owner,
    list_sessions_by_user,
)
from services.c_auth_service import c_login_required, current_c_user

history_bp = Blueprint("history", __name__)


@history_bp.get("/api/history/sessions")
@c_login_required
def get_sessions():
    user = current_c_user()
    sessions = list_sessions_by_user(int(user["id"]))
    return jsonify({"sessions": sessions}), 200


@history_bp.get("/api/history/<session_id>")
@c_login_required
def get_history(session_id: str):
    if not session_exists(session_id):
        return jsonify({"session_id": session_id, "messages": []}), 200

    user = current_c_user()
    owner = get_session_owner(session_id)
    if owner is not None and owner != int(user["id"]):
        return jsonify({"error": "forbidden", "message": "无权访问该会话"}), 403

    messages = get_messages(session_id)
    return jsonify({"session_id": session_id, "messages": messages}), 200
