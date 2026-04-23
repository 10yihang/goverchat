from __future__ import annotations

from flask import Blueprint, jsonify, request

from models.conversation import list_sessions
from models.db import execute
from models.knowledge import count_active, insert, soft_delete, update
from models.user import count_users, insert_user, list_users, update_user
from models import application as application_model
from services.application_service import ApplicationError, application_service
from services.auth_service import (
    admin_required,
    current_user,
    generate_salt,
    hash_password,
)
from services.metrics_service import metrics_service
from services.service_catalog import service_catalog_service
from services.tfidf_service import tfidf_service

admin_bp = Blueprint("admin", __name__)


def _knowledge_query(keyword: str = "", category: str = "") -> tuple[str, list[object]]:
    sql = """
        SELECT id, question, answer, category, keywords, weight, is_active,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
               DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS updated_at
        FROM kb_knowledge
        WHERE 1 = 1
    """
    args: list[object] = []
    if keyword:
        sql += " AND (question LIKE %s OR answer LIKE %s OR keywords LIKE %s)"
        like = f"%{keyword}%"
        args.extend([like, like, like])
    if category:
        sql += " AND category = %s"
        args.append(category)
    sql += " ORDER BY is_active DESC, weight DESC, id DESC LIMIT 200"
    return sql, args


@admin_bp.get("/api/admin/overview")
@admin_required
def overview():
    session_row = execute(
        "SELECT COUNT(*) AS cnt FROM chat_session", fetchone=True
    ) or {"cnt": 0}
    message_row = execute(
        "SELECT COUNT(*) AS cnt FROM chat_message", fetchone=True
    ) or {"cnt": 0}
    active_row = execute(
        "SELECT COUNT(*) AS cnt FROM kb_knowledge WHERE is_active = 1", fetchone=True
    ) or {"cnt": 0}
    total_knowledge = int(active_row["cnt"])
    category_rows = (
        execute(
            """
        SELECT category, COUNT(*) AS cnt
        FROM kb_knowledge
        WHERE is_active = 1
        GROUP BY category
        ORDER BY cnt DESC, category ASC
        LIMIT 8
        """,
            fetchall=True,
        )
        or []
    )
    hot_question_rows = (
        execute(
            """
        SELECT content AS question, COUNT(*) AS cnt, MAX(created_at) AS latest_at
        FROM chat_message
        WHERE role = 'user' AND content <> ''
        GROUP BY content
        ORDER BY cnt DESC, latest_at DESC
        LIMIT 8
        """,
            fetchall=True,
        )
        or []
    )
    categories = [
        {
            "category": row["category"] or "未分类",
            "cnt": int(row["cnt"]),
            "pct": round((int(row["cnt"]) / total_knowledge) * 100, 1)
            if total_knowledge
            else 0.0,
        }
        for row in category_rows
    ]
    hot_questions = [
        {
            "question": row["question"],
            "cnt": int(row["cnt"]),
            "latest_at": row["latest_at"].strftime("%Y-%m-%d %H:%M:%S")
            if row["latest_at"]
            else "",
        }
        for row in hot_question_rows
    ]
    return jsonify(
        {
            "overview": {
                "user_count": count_users(),
                "knowledge_count": total_knowledge,
                "session_count": int(session_row["cnt"]),
                "message_count": int(message_row["cnt"]),
                "recent_sessions": list_sessions(limit=8),
                "categories": categories,
                "hot_questions": hot_questions,
                "metrics": metrics_service.summary(),
                "tfidf_ready": tfidf_service.is_ready(),
                "tfidf_last_reload_at": tfidf_service.last_reload_at,
            }
        }
    ), 200


@admin_bp.get("/api/admin/knowledge")
@admin_required
def list_knowledge():
    keyword = (request.args.get("keyword") or "").strip()
    category = (request.args.get("category") or "").strip()
    sql, args = _knowledge_query(keyword, category)
    rows = execute(sql, tuple(args), fetchall=True) or []
    categories = (
        execute(
            """
        SELECT DISTINCT category
        FROM kb_knowledge
        WHERE category <> ''
        ORDER BY category ASC
        """,
            fetchall=True,
        )
        or []
    )
    return jsonify(
        {
            "items": rows,
            "categories": [row["category"] for row in categories],
            "active_count": count_active(),
        }
    ), 200


@admin_bp.post("/api/admin/knowledge")
@admin_required
def create_knowledge():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    answer = (data.get("answer") or "").strip()
    if not question or not answer:
        return jsonify({"error": "question 和 answer 不能为空"}), 400
    try:
        weight = float(data.get("weight") or 1.0)
    except (TypeError, ValueError):
        return jsonify({"error": "weight 必须为数字"}), 400
    kid = insert(
        question=question,
        answer=answer,
        category=(data.get("category") or "").strip(),
        keywords=(data.get("keywords") or "").strip(),
        weight=weight,
    )
    tfidf_service.reload()
    return jsonify({"message": "知识条目已创建", "id": kid}), 201


@admin_bp.put("/api/admin/knowledge/<int:kid>")
@admin_required
def edit_knowledge(kid: int):
    data = request.get_json(silent=True) or {}
    try:
        weight = float(data["weight"]) if data.get("weight") not in (None, "") else None
    except (TypeError, ValueError):
        return jsonify({"error": "weight 必须为数字"}), 400
    update(
        kid,
        question=(data.get("question") or None),
        answer=(data.get("answer") or None),
        category=(data.get("category") or None),
        keywords=(data.get("keywords") or None),
        weight=weight,
        is_active=int(data["is_active"])
        if data.get("is_active") not in (None, "")
        else None,
    )
    tfidf_service.reload()
    return jsonify({"message": "知识条目已更新"}), 200


@admin_bp.delete("/api/admin/knowledge/<int:kid>")
@admin_required
def remove_knowledge(kid: int):
    soft_delete(kid)
    tfidf_service.reload()
    return jsonify({"message": "知识条目已停用"}), 200


@admin_bp.post("/api/admin/knowledge/reload")
@admin_required
def reload_knowledge():
    tfidf_service.reload()
    return jsonify({"message": "知识库热更新已触发"}), 202


@admin_bp.get("/api/admin/users")
@admin_required
def get_users():
    return jsonify({"items": list_users()}), 200


@admin_bp.get("/api/admin/service-items")
@admin_required
def list_service_items():
    keyword = (request.args.get("keyword") or "").strip()
    category = (request.args.get("category") or "").strip()
    items = service_catalog_service.list_items(
        category=category,
        keyword=keyword,
        include_inactive=True,
    )
    return jsonify(
        {"items": items, "categories": service_catalog_service.categories()}
    ), 200


@admin_bp.post("/api/admin/service-items")
@admin_required
def create_service_item():
    data = request.get_json(silent=True) or {}
    if not (data.get("slug") or "").strip() or not (data.get("title") or "").strip():
        return jsonify({"error": "slug 和 title 不能为空"}), 400
    item = service_catalog_service.upsert_item(data)
    return jsonify({"message": "办事服务事项已保存", "item": item}), 201


@admin_bp.put("/api/admin/service-items/<slug>")
@admin_required
def edit_service_item(slug: str):
    data = request.get_json(silent=True) or {}
    data["slug"] = slug
    item = service_catalog_service.upsert_item(data)
    return jsonify({"message": "办事服务事项已更新", "item": item}), 200


@admin_bp.delete("/api/admin/service-items/<slug>")
@admin_required
def disable_service_item(slug: str):
    service_catalog_service.set_active(slug, 0)
    return jsonify({"message": "办事服务事项已停用"}), 200


@admin_bp.post("/api/admin/users")
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "viewer").strip() or "viewer"
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if role not in {"admin", "viewer"}:
        return jsonify({"error": "role 仅支持 admin 或 viewer"}), 400
    salt = generate_salt()
    try:
        user_id = insert_user(username, hash_password(password, salt), salt, role)
    except Exception as exc:
        import logging as _logging

        _logging.getLogger(__name__).warning("[Admin] 创建用户失败：%s", exc)
        return jsonify({"error": "用户名可能已存在或参数不合法"}), 400
    return jsonify({"message": "用户已创建", "id": user_id}), 201


@admin_bp.put("/api/admin/users/<int:user_id>")
@admin_required
def edit_user(user_id: int):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip() or None
    role = data.get("role") or None
    if role is not None and role not in {"admin", "viewer"}:
        return jsonify({"error": "role 仅支持 admin 或 viewer"}), 400
    payload = {
        "username": username,
        "role": role,
        "is_active": int(data["is_active"])
        if data.get("is_active") not in (None, "")
        else None,
    }
    password = data.get("password") or ""
    if password:
        salt = generate_salt()
        payload["salt"] = salt
        payload["password_hash"] = hash_password(password, salt)
    try:
        update_user(user_id, **payload)
    except Exception as exc:
        import logging as _logging

        _logging.getLogger(__name__).warning(
            "[Admin] 更新用户失败 user_id=%s err=%s", user_id, exc
        )
        return jsonify({"error": "更新用户失败，请检查输入"}), 400
    return jsonify({"message": "用户已更新"}), 200


@admin_bp.get("/api/admin/applications")
@admin_required
def list_applications_admin():
    status = (request.args.get("status") or "").strip()
    service_slug = (request.args.get("service_slug") or "").strip()
    keyword = (request.args.get("keyword") or "").strip()
    items = application_model.list_for_admin(
        status=status,
        service_slug=service_slug,
        keyword=keyword,
    )
    return jsonify(
        {
            "items": items,
            "status_options": list(application_model.VALID_STATUS),
            "status_counts": application_model.count_by_status(),
        }
    ), 200


@admin_bp.get("/api/admin/applications/<int:app_id>")
@admin_required
def get_application_admin(app_id: int):
    record = application_model.get_by_id(app_id)
    if record is None:
        return jsonify({"error": "not_found", "message": "申请不存在"}), 404
    return jsonify({"application": record}), 200


@admin_bp.patch("/api/admin/applications/<int:app_id>")
@admin_required
def update_application_status(app_id: int):
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    admin_remark = data.get("admin_remark")
    if not new_status:
        return jsonify({"error": "missing_field", "message": "status 不能为空"}), 400

    admin_user = current_user() or {}
    try:
        record = application_service.update_status_by_admin(
            app_id=app_id,
            new_status=new_status,
            admin_remark=(
                admin_remark.strip() if isinstance(admin_remark, str) else None
            ),
            admin_username=admin_user.get("username", ""),
        )
    except ApplicationError as exc:
        return jsonify({"error": exc.code, "message": exc.message}), exc.status

    return jsonify({"message": "申请状态已更新", "application": record}), 200
