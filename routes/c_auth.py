from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.c_auth_service import (
    current_c_user,
    login_with_password,
    logout_c_user,
    register,
    request_login_code,
    verify_login_code,
)

c_auth_bp = Blueprint("c_auth", __name__)


@c_auth_bp.post("/api/c-auth/send-code")
def send_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    ip = request.remote_addr or ""
    result = request_login_code(email, ip_address=ip)
    if not result.get("ok"):
        status = 429 if result.get("error") == "rate_limited" else 400
        if result.get("error") == "send_failed":
            status = 502
        return jsonify(result), status
    return jsonify(result), 200


@c_auth_bp.post("/api/c-auth/verify-code")
def verify_code():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    code = (data.get("code") or "").strip()
    result = verify_login_code(email, code)
    if not result.get("ok"):
        status = (
            401
            if result.get("error")
            in ("wrong_code", "no_active_code", "too_many_attempts", "inactive")
            else 400
        )
        return jsonify(result), status
    return jsonify(result), 200


@c_auth_bp.post("/api/c-auth/logout")
def logout():
    logout_c_user()
    return jsonify({"ok": True, "message": "已退出登录"}), 200


@c_auth_bp.get("/api/c-auth/me")
def me():
    user = current_c_user()
    return jsonify({"authenticated": bool(user), "user": user}), 200


@c_auth_bp.post("/api/c-auth/register")
def c_register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip()
    result = register(email, password, display_name)
    if not result.get("ok"):
        status = 409 if result.get("error") == "email_taken" else 400
        return jsonify(result), status
    return jsonify(result), 201


@c_auth_bp.post("/api/c-auth/login")
def c_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    result = login_with_password(email, password)
    if not result.get("ok"):
        status = (
            401
            if result.get("error") in ("wrong_password", "inactive")
            else 400
        )
        return jsonify(result), status
    return jsonify(result), 200
