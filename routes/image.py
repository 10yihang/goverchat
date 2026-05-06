"""
Image upload and analysis route.
Primary: LLM multimodal vision analysis. Fallback: Tesseract OCR.
"""

from __future__ import annotations

import logging
import os
import uuid

from flask import Blueprint, jsonify, request, send_from_directory

import config
from services.chat_service import chat_service
from services.ocr_service import ocr_service
from services.llm_service import llm_service
from services.tfidf_service import tfidf_service
from services.c_auth_service import c_login_required, current_c_user
from models.conversation import add_message

logger = logging.getLogger(__name__)
image_bp = Blueprint("image", __name__)


def _allowed(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_IMAGE_EXTENSIONS
    )


def _vision_available() -> bool:
    return config.LLM_VISION_ENABLED and llm_service.is_enabled()


@image_bp.post("/api/image/upload")
@c_login_required
def upload_image():
    vision_ok = _vision_available()
    ocr_ok = ocr_service.is_enabled() and ocr_service.is_ready()

    if not vision_ok and not ocr_ok:
        return jsonify(
            {
                "error": "image_analysis_unavailable",
                "message": (
                    "图片分析功能当前不可用。请配置多模态 LLM (LLM_VISION_ENABLED=true) "
                    "或安装 Tesseract OCR 后再试。"
                ),
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
    saved_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(config.IMAGE_UPLOAD_FOLDER, saved_name)
    file.save(save_path)

    extracted_text = None
    analysis_method = "ocr"

    try:
        if vision_ok:
            logger.info("[Image] 尝试 LLM 多模态分析 image=%s", saved_name)
            extracted_text = llm_service.analyze_image(save_path)
            if extracted_text:
                analysis_method = "vision"
                logger.info("[Image] LLM 多模态分析成功 len=%d", len(extracted_text))

        if extracted_text is None and ocr_ok:
            logger.info(
                "[Image] %s 降级到 Tesseract OCR",
                "LLM 分析失败" if vision_ok else "LLM vision 不可用",
            )
            try:
                extracted_text = ocr_service.extract_text(save_path)
            except Exception as exc:
                logger.warning("[OCR] Image extraction failed: %s", exc)
                return jsonify(
                    {
                        "error": "analysis_failed",
                        "message": f"图片识别失败：两种方式均未能提取有效内容。{exc}",
                    }
                ), 422

        if not extracted_text:
            return jsonify(
                {
                    "error": "analysis_failed",
                    "message": "图片识别失败：未能提取有效内容。请确保图片清晰、包含可识别文字。",
                }
            ), 422

    except Exception as exc:
        logger.exception("[Image] 未预期的分析错误 image=%s", saved_name)
        return jsonify(
            {"error": "analysis_failed", "message": f"图片分析过程异常：{exc}"}
        ), 500

    user = current_c_user()
    session_id = chat_service.ensure_session(
        request.form.get("session_id"),
        user_agent=request.headers.get("User-Agent", ""),
        ip=request.remote_addr or "",
        user_id=int(user["id"]),
    )

    # 检索知识库作为参考（不拿它当答案，只当上下文）
    knowledge = tfidf_service.search(extracted_text)
    sources = knowledge.get("sources", [])[:3]
    knowledge_context = "\n\n".join(
        f"Q: {s['question']}\nA: {s.get('answer', '')}"
        for s in sources
    ) if sources else "（本地知识库中无直接相关知识）"

    llm_answer = None
    if llm_service.is_enabled():
        system_prompt = (
            "你是政务办事智能助手。用户上传了一张图片，系统已分析出图片内容。\n"
            "同时从本地知识库中检索了相关办事规定供你参考。\n"
            "请结合图片内容和知识库，用中文给出专业、简洁的回答。\n"
            "如果知识库内容与图片不相关，请直接基于图片内容回答。\n"
            "不要使用'根据图片''根据知识库'等元表达。"
        )
        user_prompt = (
            f"【图片分析结果】\n{extracted_text}\n\n"
            f"【知识库参考】\n{knowledge_context}"
        )
        try:
            llm_answer = llm_service.chat_completion(
                [{"role": "system", "content": system_prompt},
                 {"role": "user", "content": user_prompt}],
                temperature=0.3,
            )
            if llm_answer:
                logger.info("[Image] LLM 合成回答成功 len=%d", len(llm_answer))
        except Exception as exc:
            logger.warning("[Image] LLM 合成回答失败，降级到 TF-IDF: %s", exc)

    if llm_answer:
        result = {
            "answer": llm_answer,
            "confidence": knowledge.get("confidence", 0.5),
            "knowledge_id": knowledge.get("knowledge_id"),
            "sources": sources,
            "session_id": session_id,
            "answer_source": "llm_vision",
        }
    else:
        # LLM 不可用 → 退回到纯 TF-IDF
        result = knowledge
        result["answer_source"] = "knowledge"
        result["session_id"] = session_id

    # 持久化消息
    try:
        add_message(session_id=session_id, role="user",
                    content=f"[图片] {extracted_text}", msg_type="text")
        add_message(session_id=session_id, role="bot",
                    content=result["answer"], msg_type="text",
                    confidence=result.get("confidence"),
                    knowledge_id=result.get("knowledge_id"))
    except Exception as exc:
        logger.warning("[Image] 消息持久化失败: %s", exc)

    result["text"] = extracted_text
    result["input_mode"] = "image"
    result["filename"] = file.filename
    result["analysis_method"] = analysis_method
    result["image_url"] = f"/api/image/view/{saved_name}"

    return jsonify(result), 200


@image_bp.get("/api/image/view/<path:filename>")
@c_login_required
def view_image(filename: str):
    safe_name = os.path.basename(filename)
    if not safe_name or ".." in safe_name or "/" in safe_name:
        return jsonify({"error": "非法文件名"}), 400

    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in config.ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({"error": "不支持的图片类型"}), 400

    return send_from_directory(config.IMAGE_UPLOAD_FOLDER, safe_name)
