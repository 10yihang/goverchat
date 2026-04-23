"""
语音上传路由：POST /api/voice/upload
"""

import os
import uuid
import logging

from flask import Blueprint, request, jsonify
from services.asr_service import asr_service
from services.chat_service import chat_service
from services.c_auth_service import c_login_required, current_c_user
import config

logger = logging.getLogger(__name__)
voice_bp = Blueprint("voice", __name__)

ALLOWED = config.ALLOWED_AUDIO_EXTENSIONS


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


@voice_bp.post("/api/voice/upload")
@c_login_required
def upload():
    """
    multipart/form-data 字段：
        audio    – 音频文件（wav/mp3/m4a/ogg/webm/flac，限 16MB）
        session_id – 可选
    响应：
        { "session_id", "text", "answer", "confidence", "knowledge_id" }
    """
    if not asr_service.is_ready():
        return jsonify(
            {"error": "model_loading", "message": "语音识别模型正在加载，请稍候再试"}
        ), 503

    if "audio" not in request.files:
        return jsonify({"error": "缺少 audio 字段"}), 400

    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"error": "未选择文件"}), 400
    if not _allowed(file.filename):
        return jsonify({"error": f"不支持的文件类型，允许：{ALLOWED}"}), 400

    # 保存上传文件
    os.makedirs(config.VOICE_UPLOAD_FOLDER, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[1].lower()
    save_path = os.path.join(config.VOICE_UPLOAD_FOLDER, f"{uuid.uuid4().hex}.{ext}")
    file.save(save_path)

    # 语音转文字
    text = asr_service.transcribe(save_path)
    if not text:
        return jsonify({"error": "语音识别失败，请重试或改用文字输入"}), 500

    user = current_c_user()
    user_agent = request.headers.get("User-Agent", "")
    ip = request.remote_addr or ""
    session_id = chat_service.ensure_session(
        request.form.get("session_id"),
        user_agent=user_agent,
        ip=ip,
        user_id=int(user["id"]),
    )
    result = chat_service.answer(session_id, text, msg_type="voice")
    result["text"] = text
    return jsonify(result), 200
