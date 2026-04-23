from __future__ import annotations

import json

from models.db import execute


VALID_STATUS = ("已提交", "审核中", "材料待补充", "办理完成", "已退回")


def insert(
    *,
    query_no: str,
    user_id: int,
    user_email: str,
    session_id: str,
    service_slug: str,
    service_title: str,
    applicant_name: str,
    applicant_phone: str,
    form_data: dict,
) -> int:
    sql = """
        INSERT INTO service_application
            (query_no, user_id, user_email, session_id,
             service_slug, service_title,
             applicant_name, applicant_phone, form_data, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, '已提交')
    """
    return execute(
        sql,
        (
            query_no,
            user_id,
            user_email,
            session_id,
            service_slug,
            service_title,
            applicant_name,
            applicant_phone,
            json.dumps(form_data, ensure_ascii=False),
        ),
        commit=True,
    )


def get_by_id(app_id: int) -> dict | None:
    sql = """
        SELECT id, query_no, user_id, user_email, session_id,
               service_slug, service_title,
               applicant_name, applicant_phone, form_data,
               status, admin_remark,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
               DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS updated_at
        FROM service_application
        WHERE id = %s
    """
    row = execute(sql, (app_id,), fetchone=True)
    return _parse_form_data(row)


def get_by_query_no(query_no: str) -> dict | None:
    sql = """
        SELECT id, query_no, user_id, user_email, session_id,
               service_slug, service_title,
               applicant_name, applicant_phone, form_data,
               status, admin_remark,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
               DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS updated_at
        FROM service_application
        WHERE query_no = %s
    """
    row = execute(sql, (query_no.strip().upper(),), fetchone=True)
    return _parse_form_data(row)


def list_by_user(user_id: int, limit: int = 100) -> list[dict]:
    sql = """
        SELECT id, query_no, service_slug, service_title,
               applicant_name, applicant_phone, status, admin_remark,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
               DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS updated_at
        FROM service_application
        WHERE user_id = %s
        ORDER BY id DESC
        LIMIT %s
    """
    return execute(sql, (user_id, limit), fetchall=True) or []


def list_for_admin(
    *,
    status: str = "",
    service_slug: str = "",
    keyword: str = "",
    limit: int = 200,
) -> list[dict]:
    where = ["1=1"]
    args: list = []
    if status and status in VALID_STATUS:
        where.append("status = %s")
        args.append(status)
    if service_slug:
        where.append("service_slug = %s")
        args.append(service_slug)
    if keyword:
        like = f"%{keyword.strip()}%"
        where.append(
            "(query_no LIKE %s OR applicant_name LIKE %s "
            "OR applicant_phone LIKE %s OR user_email LIKE %s)"
        )
        args.extend([like, like, like, like])
    sql = f"""
        SELECT id, query_no, user_id, user_email,
               service_slug, service_title,
               applicant_name, applicant_phone, status, admin_remark,
               DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS created_at,
               DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%S') AS updated_at
        FROM service_application
        WHERE {" AND ".join(where)}
        ORDER BY id DESC
        LIMIT %s
    """
    args.append(limit)
    return execute(sql, tuple(args), fetchall=True) or []


def update_status(
    app_id: int, new_status: str, admin_remark: str | None = None
) -> None:
    if new_status not in VALID_STATUS:
        raise ValueError(f"非法状态：{new_status}")
    if admin_remark is None:
        execute(
            "UPDATE service_application SET status = %s WHERE id = %s",
            (new_status, app_id),
            commit=True,
        )
    else:
        execute(
            "UPDATE service_application SET status = %s, admin_remark = %s WHERE id = %s",
            (new_status, admin_remark, app_id),
            commit=True,
        )


def query_no_exists(query_no: str) -> bool:
    row = execute(
        "SELECT id FROM service_application WHERE query_no = %s",
        (query_no.strip().upper(),),
        fetchone=True,
    )
    return row is not None


def count_by_status() -> dict:
    rows = (
        execute(
            "SELECT status, COUNT(*) AS cnt FROM service_application GROUP BY status",
            fetchall=True,
        )
        or []
    )
    return {row["status"]: int(row["cnt"]) for row in rows}


def _parse_form_data(row: dict | None) -> dict | None:
    if row is None:
        return None
    raw = row.get("form_data")
    if isinstance(raw, str):
        try:
            row["form_data"] = json.loads(raw)
        except json.JSONDecodeError:
            row["form_data"] = {}
    elif raw is None:
        row["form_data"] = {}
    return row
