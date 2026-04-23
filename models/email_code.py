from __future__ import annotations

from datetime import datetime, timedelta

from models.db import execute


def insert(
    email: str, code: str, ttl_sec: int, purpose: str = "login", ip_address: str = ""
) -> int:
    expires_at = datetime.now() + timedelta(seconds=ttl_sec)
    sql = """
        INSERT INTO email_verification_code
            (email, code, purpose, expires_at, ip_address)
        VALUES (%s, %s, %s, %s, %s)
    """
    return execute(sql, (email, code, purpose, expires_at, ip_address), commit=True)


def get_latest_active(email: str, purpose: str = "login") -> dict | None:
    sql = """
        SELECT id, email, code, purpose, used, attempts,
               expires_at,
               DATE_FORMAT(expires_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS expires_at_str,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at
        FROM email_verification_code
        WHERE email = %s AND purpose = %s AND used = 0 AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    """
    return execute(sql, (email, purpose), fetchone=True)


def seconds_since_last_send(email: str, purpose: str = "login") -> int | None:
    sql = """
        SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS sec
        FROM email_verification_code
        WHERE email = %s AND purpose = %s
        ORDER BY id DESC
        LIMIT 1
    """
    row = execute(sql, (email, purpose), fetchone=True)
    if row is None:
        return None
    return int(row["sec"])


def mark_used(code_id: int) -> None:
    execute(
        "UPDATE email_verification_code SET used = 1 WHERE id = %s",
        (code_id,),
        commit=True,
    )


def increment_attempt(code_id: int) -> None:
    execute(
        "UPDATE email_verification_code SET attempts = attempts + 1 WHERE id = %s",
        (code_id,),
        commit=True,
    )


def invalidate_for_email(email: str, purpose: str = "login") -> None:
    execute(
        "UPDATE email_verification_code SET used = 1 WHERE email = %s AND purpose = %s AND used = 0",
        (email, purpose),
        commit=True,
    )


def cleanup_expired(retention_days: int = 7) -> int:
    sql = """
        DELETE FROM email_verification_code
        WHERE expires_at < (NOW() - INTERVAL %s DAY)
    """
    return execute(sql, (int(retention_days),), commit=True) or 0
