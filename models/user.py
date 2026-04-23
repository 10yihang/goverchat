from __future__ import annotations

"""
System user data access helpers.
"""
from models.db import execute


def get_by_username(username: str) -> dict | None:
    sql = """
        SELECT id, username, password, salt, role, is_active,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM sys_user
        WHERE username = %s
        LIMIT 1
    """
    return execute(sql, (username,), fetchone=True)


def get_by_id(user_id: int) -> dict | None:
    sql = """
        SELECT id, username, role, is_active,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM sys_user
        WHERE id = %s
        LIMIT 1
    """
    return execute(sql, (user_id,), fetchone=True)


def list_users() -> list[dict]:
    sql = """
        SELECT id, username, role, is_active,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM sys_user
        ORDER BY id ASC
    """
    return execute(sql, args=(), fetchall=True) or []


def insert_user(
    username: str, password_hash: str, salt: str, role: str = "viewer"
) -> int:
    sql = """
        INSERT INTO sys_user (username, password, salt, role, is_active)
        VALUES (%s, %s, %s, %s, 1)
    """
    return execute(sql, (username, password_hash, salt, role), commit=True)


def update_user(
    user_id: int,
    *,
    username: str | None = None,
    password_hash: str | None = None,
    salt: str | None = None,
    role: str | None = None,
    is_active: int | None = None,
) -> None:
    fields: list[str] = []
    args: list[object] = []
    mapping = {
        "username": username,
        "password": password_hash,
        "salt": salt,
        "role": role,
        "is_active": is_active,
    }
    for field, value in mapping.items():
        if value is not None:
            fields.append(f"{field} = %s")
            args.append(value)
    if not fields:
        return
    args.append(user_id)
    sql = f"UPDATE sys_user SET {', '.join(fields)} WHERE id = %s"
    execute(sql, tuple(args), commit=True)


def count_users() -> int:
    row = execute("SELECT COUNT(*) AS cnt FROM sys_user", fetchone=True)
    return int(row["cnt"]) if row else 0
