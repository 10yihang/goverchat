"""sys_setting 表 CRUD"""

from models.db import execute


def get_setting(key: str) -> str | None:
    row = execute(
        "SELECT `value` FROM sys_setting WHERE `key` = %s",
        (key,),
        fetchone=True,
    )
    return row["value"] if row else None


def set_setting(key: str, value: str) -> None:
    execute(
        "INSERT INTO sys_setting (`key`, `value`) VALUES (%s, %s) "
        "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        (key, value),
        commit=True,
    )


def get_all_settings() -> dict[str, str]:
    rows = execute("SELECT `key`, `value` FROM sys_setting", fetchall=True) or []
    return {r["key"]: r["value"] for r in rows}
