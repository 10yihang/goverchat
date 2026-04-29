from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.service_catalog import service_catalog_service

service_center_bp = Blueprint("service_center", __name__)


@service_center_bp.get("/api/service/items")
def list_service_items():
    category = (request.args.get("category") or "").strip()
    keyword = (request.args.get("keyword") or "").strip()
    items = service_catalog_service.list_items(category=category, keyword=keyword)
    return jsonify(
        {
            "items": items,
            "categories": service_catalog_service.categories(),
            "hot_items": service_catalog_service.hot_items(),
        }
    ), 200


@service_center_bp.get("/api/service/items/<slug>")
def get_service_item(slug: str):
    item = service_catalog_service.get_item(slug)
    if item is None:
        return jsonify({"error": "未找到对应的办事服务事项"}), 404
    return jsonify({"item": item}), 200


@service_center_bp.get("/api/service/items/<slug>/form-schema")
def get_form_schema(slug: str):
    item = service_catalog_service.get_item(slug)
    if item is None or int(item.get("is_active", 1)) != 1:
        return jsonify({"error": "not_found", "message": "事项不存在或已停用"}), 404
    schema = service_catalog_service.get_form_schema(slug)
    if schema is None:
        return jsonify(
            {"error": "no_form_schema", "message": "该事项暂未开放在线办理"}
        ), 404
    return jsonify(
        {
            "slug": slug,
            "title": item["title"],
            "category": item["category"],
            "form_schema": schema,
        }
    ), 200


@service_center_bp.post("/api/service/progress/query")
def query_service_progress():
    data = request.get_json(silent=True) or {}
    service_slug = (data.get("service_slug") or "").strip()
    query_no = (data.get("query_no") or "").strip()
    if not query_no:
        return jsonify({"found": False, "message": "请输入受理编号"}), 400

    found, record = service_catalog_service.query_progress(service_slug, query_no)
    if not found:
        return (
            jsonify(
                {
                    "found": False,
                    "message": "未查询到对应办理记录，请核对事项和查询编号后重试。",
                }
            ),
            200,
        )
    return jsonify({"found": True, "record": record, "message": "查询成功"}), 200


@service_center_bp.get("/api/service/items/<slug>/checklist")
def get_checklist(slug: str):
    item = service_catalog_service.get_item(slug)
    if item is None or int(item.get("is_active", 1)) != 1:
        return jsonify({"error": "not_found", "message": "事项不存在或已停用"}), 404

    materials = item.get("materials", [])
    conditions = item.get("conditions", [])
    tips = item.get("tips", [])

    return jsonify({
        "slug": slug,
        "title": item["title"],
        "category": item.get("category", ""),
        "materials": materials,
        "conditions": conditions,
        "tips": tips,
        "checklist_url": f"/api/service/items/{slug}/checklist",
    }), 200
