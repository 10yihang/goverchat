from __future__ import annotations

from models.db import execute


def get_by_email(email: str) -> dict | None:
    sql = """
        SELECT id, email, display_name, is_active,
               DATE_FORMAT(last_login_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS last_login_at,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM c_user
        WHERE email = %s
    """
    return execute(sql, (email,), fetchone=True)


def get_by_email_with_password(email: str) -> dict | None:
    sql = """
        SELECT id, email, display_name, is_active, password_hash, salt,
               DATE_FORMAT(last_login_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS last_login_at,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM c_user
        WHERE email = %s
    """
    return execute(sql, (email,), fetchone=True)


def get_by_id(uid: int) -> dict | None:
    sql = """
        SELECT id, email, display_name, is_active,
               DATE_FORMAT(last_login_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS last_login_at,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM c_user
        WHERE id = %s
    """
    return execute(sql, (uid,), fetchone=True)


def insert(email: str, display_name: str = "") -> int:
    sql = """
        INSERT INTO c_user (email, display_name, is_active)
        VALUES (%s, %s, 1)
    """
    return execute(sql, (email, display_name), commit=True)


def insert_with_password(
    email: str, password_hash: str, salt: str, display_name: str = ""
) -> int:
    sql = """
        INSERT INTO c_user (email, display_name, password_hash, salt, is_active)
        VALUES (%s, %s, %s, %s, 1)
    """
    return execute(sql, (email, display_name, password_hash, salt), commit=True)


def touch_last_login(uid: int) -> None:
    execute(
        "UPDATE c_user SET last_login_at = NOW() WHERE id = %s", (uid,), commit=True
    )


def update_display_name(uid: int, display_name: str) -> None:
    execute(
        "UPDATE c_user SET display_name = %s WHERE id = %s",
        (display_name, uid),
        commit=True,
    )


def list_all(limit: int = 100) -> list[dict]:
    sql = """
        SELECT id, email, display_name, is_active,
               DATE_FORMAT(last_login_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS last_login_at,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM c_user
        ORDER BY id DESC
        LIMIT %s
    """
    return execute(sql, (limit,), fetchall=True) or []


def count_active() -> int:
    row = execute(
        "SELECT COUNT(*) AS cnt FROM c_user WHERE is_active = 1", fetchone=True
    )
    return int(row["cnt"]) if row else 0
