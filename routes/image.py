"""
Image upload and OCR route.
"""

from __future__ import annotations

import logging
import os
import uuid

from flask import Blueprint, jsonify, request

import config
from services.chat_service import chat_service
from services.ocr_service import ocr_service
from services.c_auth_service import c_login_required, current_c_user

logger = logging.getLogger(__name__)
image_bp = Blueprint("image", __name__)


def _allowed(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_IMAGE_EXTENSIONS
    )


@image_bp.post("/api/image/upload")
@c_login_required
def upload_image():
    if not ocr_service.is_enabled():
        return jsonify(
            {
                "error": "ocr_disabled",
                "message": "图片识别功能当前未启用。",
            }
        ), 503

    if not ocr_service.is_ready():
        return jsonify(
            {
                "error": "ocr_unavailable",
                "message": (
                    "图片识别环境未就绪。请先安装 Tesseract OCR，"
                    "并将 tesseract 加入 PATH 或配置 TESSERACT_CMD。"
                ),
                "status": ocr_service.status(),
            }
        ), 503

    if "image" not in request.files:
        return jsonify({"error": "缺少 image 文件字段"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "未选择图片文件"}), 400
    if not _allowed(file.filename):
        return jsonify(
            {
                "error": "unsupported_type",
                "message": (
                    "不支持的图片类型，仅支持："
                    + ", ".join(sorted(config.ALLOWED_IMAGE_EXTENSIONS))
                ),
            }
        ), 400

    os.makedirs(config.IMAGE_UPLOAD_FOLDER, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[1].lower()
    save_path = os.path.join(config.IMAGE_UPLOAD_FOLDER, f"{uuid.uuid4().hex}.{ext}")
    file.save(save_path)

    try:
        text = ocr_service.extract_text(save_path)
    except Exception as exc:
        logger.warning("[OCR] Image extraction failed: %s", exc)
        return jsonify(
            {
                "error": "ocr_failed",
                "message": f"图片识别失败：{exc}",
            }
        ), 422

    user = current_c_user()
    user_agent = request.headers.get("User-Agent", "")
    ip = request.remote_addr or ""
    session_id = chat_service.ensure_session(
        request.form.get("session_id"),
        user_agent=user_agent,
        ip=ip,
        user_id=int(user["id"]),
    )

    result = chat_service.answer(session_id, text, msg_type="text")
    result["text"] = text
    result["input_mode"] = "image"
    result["filename"] = file.filename
    return jsonify(result), 200
