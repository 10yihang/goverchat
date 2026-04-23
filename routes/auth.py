from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.auth_service import current_user, login_user, logout_user, verify_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    user = verify_user(username, password)
    if user is None:
        return jsonify({"error": "用户名或密码错误"}), 401

    login_user(user)
    return jsonify({"user": user}), 200


@auth_bp.post("/api/auth/logout")
def logout():
    logout_user()
    return jsonify({"message": "已退出登录"}), 200


@auth_bp.get("/api/auth/me")
def me():
    user = current_user()
    return jsonify({"authenticated": bool(user), "user": user}), 200
