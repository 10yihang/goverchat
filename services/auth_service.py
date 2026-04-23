from __future__ import annotations

"""
Authentication helpers and permission decorators.
"""
import functools
import hashlib
import secrets

from flask import jsonify, redirect, request, session, url_for

from models.user import get_by_id, get_by_username


SESSION_USER_KEY = "gov_user"


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{password}{salt}".encode("utf-8")).hexdigest()


def generate_salt() -> str:
    return secrets.token_hex(16)


def verify_user(username: str, password: str) -> dict | None:
    user = get_by_username(username.strip())
    if not user or int(user.get("is_active") or 0) != 1:
        return None
    expected = hash_password(password, user["salt"])
    if expected != user["password"]:
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
    }


def login_user(user: dict) -> None:
    session[SESSION_USER_KEY] = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
    }


def logout_user() -> None:
    session.pop(SESSION_USER_KEY, None)


def current_user() -> dict | None:
    user = session.get(SESSION_USER_KEY)
    if not user:
        return None
    db_user = get_by_id(int(user["id"]))
    if not db_user or int(db_user.get("is_active") or 0) != 1:
        logout_user()
        return None
    refreshed = {
        "id": db_user["id"],
        "username": db_user["username"],
        "role": db_user["role"],
    }
    session[SESSION_USER_KEY] = refreshed
    return refreshed


def _unauthorized():
    if request.path.startswith("/api/"):
        return jsonify({"error": "unauthorized", "message": "请先登录"}), 401
    return redirect(url_for("login", next=request.path))


def _forbidden():
    if request.path.startswith("/api/"):
        return jsonify({"error": "forbidden", "message": "无权限访问"}), 403
    return redirect("/")


def login_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if current_user() is None:
            return _unauthorized()
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if user is None:
            return _unauthorized()
        if user.get("role") != "admin":
            return _forbidden()
        return view(*args, **kwargs)

    return wrapped
