from __future__ import annotations

from flask import Blueprint, jsonify

from services.guide_service import guide_service

guide_bp = Blueprint("guide_api", __name__)


@guide_bp.get("/api/guide/topics")
def list_topics():
    return jsonify({"items": guide_service.list_topics()}), 200


@guide_bp.get("/api/guide/topics/<slug>")
def get_topic(slug: str):
    topic = guide_service.get_topic(slug)
    if topic is None:
        return jsonify({"error": "未找到对应的业务引导主题"}), 404
    return jsonify({"item": topic}), 200
