from __future__ import annotations

from flask import Blueprint, jsonify, request

from models import application as application_model
from services.application_service import ApplicationError, application_service
from services.c_auth_service import c_login_required, current_c_user

applications_bp = Blueprint("applications", __name__)


@applications_bp.post("/api/applications")
@c_login_required
def submit_application():
    user = current_c_user()
    data = request.get_json(silent=True) or {}
    service_slug = (data.get("service_slug") or "").strip()
    session_id = (data.get("session_id") or "").strip()
    form_data = data.get("form_data") or {}

    if not service_slug:
        return jsonify(
            {"error": "missing_field", "message": "service_slug 不能为空"}
        ), 400

    try:
        record = application_service.submit(
            user=user,
            session_id=session_id,
            service_slug=service_slug,
            form_data=form_data,
        )
    except ApplicationError as exc:
        return jsonify(
            {
                "error": exc.code,
                "message": exc.message,
                **exc.details,
            }
        ), exc.status

    return jsonify({"application": record}), 201


@applications_bp.get("/api/applications")
@c_login_required
def list_my_applications():
    user = current_c_user()
    items = application_model.list_by_user(int(user["id"]))
    return jsonify({"applications": items}), 200


@applications_bp.get("/api/applications/<query_no>")
@c_login_required
def get_application_by_query_no(query_no: str):
    user = current_c_user()
    record = application_model.get_by_query_no(query_no)
    if record is None:
        return jsonify({"error": "not_found", "message": "未找到对应申请"}), 404
    if int(record["user_id"]) != int(user["id"]):
        return jsonify({"error": "forbidden", "message": "无权查看此申请"}), 403
    return jsonify({"application": record}), 200


@applications_bp.patch("/api/applications/<query_no>/supplement")
@c_login_required
def submit_application_supplement(query_no: str):
    user = current_c_user()
    record = application_model.get_by_query_no(query_no)
    if record is None:
        return jsonify({"error": "not_found", "message": "未找到对应申请"}), 404
    if int(record["user_id"]) != int(user["id"]):
        return jsonify({"error": "forbidden", "message": "无权操作此申请"}), 403

    if record["status"] != "材料待补充":
        return jsonify(
            {"error": "invalid_status", "message": "当前状态不需要补充材料"}
        ), 400

    data = request.get_json(silent=True) or {}
    supplement_data = data.get("supplement_data") or {}
    supplement_remark = (data.get("supplement_remark") or "").strip()

    if not supplement_remark:
        return jsonify(
            {"error": "missing_field", "message": "补充说明不能为空"}
        ), 400

    try:
        updated = application_model.submit_supplement(
            app_id=int(record["id"]),
            user_id=int(user["id"]),
            supplement_data=supplement_data,
            supplement_remark=supplement_remark,
        )
    except ValueError as exc:
        return jsonify({"error": "invalid_status", "message": str(exc)}), 400

    return jsonify(
        {
            "application": updated,
            "message": "补充材料已提交，申请已重新进入审核",
        }
    ), 200
