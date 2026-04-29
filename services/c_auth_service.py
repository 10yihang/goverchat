from __future__ import annotations

import functools
import logging
import re
import secrets

from flask import g, jsonify, request, session

import config
from models import c_user as c_user_model
from models import email_code as email_code_model
from services.auth_service import generate_salt, hash_password
from services.email_service import email_service

logger = logging.getLogger(__name__)


C_SESSION_USER_KEY = "gov_c_user"

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match((email or "").strip()))


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _generate_code() -> str:
    return "".join(
        secrets.choice("0123456789") for _ in range(config.EMAIL_CODE_LENGTH)
    )


def request_login_code(email: str, ip_address: str = "") -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        return {"ok": False, "error": "invalid_email", "message": "邮箱格式不正确"}

    last_sec = email_code_model.seconds_since_last_send(email, "login")
    if last_sec is not None and last_sec < config.EMAIL_CODE_RESEND_COOLDOWN:
        wait = config.EMAIL_CODE_RESEND_COOLDOWN - last_sec
        return {
            "ok": False,
            "error": "rate_limited",
            "message": f"请等待 {wait} 秒后再试",
            "retry_after": wait,
        }

    if secrets.randbelow(50) == 0:
        try:
            email_code_model.cleanup_expired(retention_days=7)
        except Exception as exc:
            logger.warning("[CAuth] 验证码定期清理失败 err=%s", exc)

    code = _generate_code()
    email_code_model.invalidate_for_email(email, "login")
    email_code_model.insert(
        email=email,
        code=code,
        ttl_sec=config.EMAIL_CODE_TTL_SEC,
        purpose="login",
        ip_address=ip_address,
    )

    ttl_minutes = max(1, config.EMAIL_CODE_TTL_SEC // 60)

    if not email_service.is_configured():
        logger.warning(
            "[CAuth] SMTP 未配置，验证码已写入日志（仅 DEBUG 模式回传）：%s -> %s",
            code,
            email,
        )
        response = {
            "ok": True,
            "message": f"验证码已发送，{ttl_minutes} 分钟内有效",
            "cooldown": config.EMAIL_CODE_RESEND_COOLDOWN,
        }
        if config.DEBUG:
            response["dev_code"] = code
            response["dev_warning"] = (
                "SMTP 未配置；DEBUG=true 时返回 dev_code，生产必须关闭 DEBUG"
            )
        return response

    email_service.send_login_code_async(
        to_email=email,
        code=code,
        ttl_minutes=ttl_minutes,
    )

    return {
        "ok": True,
        "message": f"验证码已发送，{ttl_minutes} 分钟内有效",
        "cooldown": config.EMAIL_CODE_RESEND_COOLDOWN,
    }


def verify_login_code(email: str, code: str) -> dict:
    email = normalize_email(email)
    code = (code or "").strip()
    if not is_valid_email(email):
        return {"ok": False, "error": "invalid_email", "message": "邮箱格式不正确"}
    if not code or not code.isdigit() or len(code) != config.EMAIL_CODE_LENGTH:
        return {"ok": False, "error": "invalid_code", "message": "验证码格式错误"}

    record = email_code_model.get_latest_active(email, "login")
    if record is None:
        return {
            "ok": False,
            "error": "no_active_code",
            "message": "验证码已过期或不存在，请重新获取",
        }

    if int(record["attempts"]) >= config.EMAIL_CODE_MAX_ATTEMPTS:
        email_code_model.mark_used(int(record["id"]))
        return {
            "ok": False,
            "error": "too_many_attempts",
            "message": "验证码尝试次数过多，请重新获取",
        }

    if record["code"] != code:
        email_code_model.increment_attempt(int(record["id"]))
        remaining = config.EMAIL_CODE_MAX_ATTEMPTS - (int(record["attempts"]) + 1)
        return {
            "ok": False,
            "error": "wrong_code",
            "message": f"验证码错误，还可尝试 {max(0, remaining)} 次",
        }

    existing_user = c_user_model.get_by_email(email)
    if existing_user is not None and int(existing_user.get("is_active") or 0) != 1:
        return {"ok": False, "error": "inactive", "message": "账号已被停用"}

    email_code_model.mark_used(int(record["id"]))

    is_new = existing_user is None
    if is_new:
        new_uid = c_user_model.insert(email=email, display_name=email.split("@")[0])
        user = c_user_model.get_by_id(new_uid)
        email_service.send_welcome(email)
    else:
        user = existing_user

    c_user_model.touch_last_login(int(user["id"]))

    public_user = {
        "id": int(user["id"]),
        "email": user["email"],
        "display_name": user.get("display_name") or "",
    }
    session[C_SESSION_USER_KEY] = public_user
    session.permanent = True

    return {"ok": True, "message": "登录成功", "user": public_user, "is_new": is_new}


def logout_c_user() -> None:
    session.pop(C_SESSION_USER_KEY, None)


_G_USER_KEY = "_c_user_cached"


def current_c_user() -> dict | None:
    if hasattr(g, _G_USER_KEY):
        return getattr(g, _G_USER_KEY)

    cached = session.get(C_SESSION_USER_KEY)
    if not cached:
        setattr(g, _G_USER_KEY, None)
        return None
    db_user = c_user_model.get_by_id(int(cached["id"]))
    if db_user is None or int(db_user.get("is_active") or 0) != 1:
        logout_c_user()
        setattr(g, _G_USER_KEY, None)
        return None
    refreshed = {
        "id": int(db_user["id"]),
        "email": db_user["email"],
        "display_name": db_user.get("display_name") or "",
    }
    session[C_SESSION_USER_KEY] = refreshed
    setattr(g, _G_USER_KEY, refreshed)
    return refreshed


def _unauthorized_json():
    return jsonify(
        {
            "error": "unauthorized",
            "message": "请先登录",
        }
    ), 401


def c_login_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if current_c_user() is None:
            return _unauthorized_json()
        return view(*args, **kwargs)

    return wrapped


# ── 密码注册 / 登录 ──────────────────────────────────────────────

_MIN_PASSWORD_LEN = 6


def register(email: str, password: str, display_name: str = "") -> dict:
    email = normalize_email(email)
    password = (password or "").strip()
    if not is_valid_email(email):
        return {"ok": False, "error": "invalid_email", "message": "邮箱格式不正确"}
    if len(password) < _MIN_PASSWORD_LEN:
        return {
            "ok": False,
            "error": "weak_password",
            "message": f"密码至少 {_MIN_PASSWORD_LEN} 位",
        }

    existing = c_user_model.get_by_email(email)
    if existing is not None:
        return {"ok": False, "error": "email_taken", "message": "该邮箱已注册"}

    if not display_name:
        display_name = email.split("@")[0]

    salt = generate_salt()
    pw_hash = hash_password(password, salt)
    uid = c_user_model.insert_with_password(email, pw_hash, salt, display_name)
    user = c_user_model.get_by_id(uid)

    public_user = {
        "id": int(user["id"]),
        "email": user["email"],
        "display_name": user.get("display_name") or "",
    }
    session[C_SESSION_USER_KEY] = public_user
    session.permanent = True

    logger.info("[CAuth] 新用户注册 email=%s", email)
    return {"ok": True, "message": "注册成功", "user": public_user, "is_new": True}


def login_with_password(email: str, password: str) -> dict:
    email = normalize_email(email)
    password = (password or "").strip()
    if not is_valid_email(email):
        return {"ok": False, "error": "invalid_email", "message": "邮箱格式不正确"}
    if not password:
        return {"ok": False, "error": "empty_password", "message": "请输入密码"}

    user = c_user_model.get_by_email_with_password(email)
    if user is None:
        return {"ok": False, "error": "not_found", "message": "账号不存在，请先注册"}
    if int(user.get("is_active") or 0) != 1:
        return {"ok": False, "error": "inactive", "message": "账号已被停用"}

    expected = hash_password(password, user.get("salt") or "")
    if not user.get("password_hash") or expected != user["password_hash"]:
        return {"ok": False, "error": "wrong_password", "message": "密码错误"}

    c_user_model.touch_last_login(int(user["id"]))

    public_user = {
        "id": int(user["id"]),
        "email": user["email"],
        "display_name": user.get("display_name") or "",
    }
    session[C_SESSION_USER_KEY] = public_user
    session.permanent = True

    logger.info("[CAuth] 密码登录成功 email=%s", email)
    return {"ok": True, "message": "登录成功", "user": public_user, "is_new": False}
