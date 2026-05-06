from __future__ import annotations

from flask import Blueprint, jsonify, request

from models import hall as hall_model

halls_bp = Blueprint("halls", __name__)


@halls_bp.get("/api/halls")
def list_halls():
    service = (request.args.get("service") or "").strip()
    city = (request.args.get("city") or "").strip()
    items = hall_model.list_all(service=service, city=city)
    return jsonify({"halls": items}), 200


@halls_bp.get("/api/halls/<hall_id>")
def get_hall(hall_id: str):
    hall = hall_model.get_by_id(hall_id)
    if hall is None:
        return jsonify({"error": "not_found", "message": "未找到该大厅信息"}), 404
    return jsonify({"hall": hall}), 200
