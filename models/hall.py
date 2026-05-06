from __future__ import annotations

import json

from models.db import execute


def list_all(
    *,
    service: str = "",
    city: str = "",
) -> list[dict]:
    where = ["is_active = 1"]
    args: list = []
    if service:
        where.append("JSON_CONTAINS(services, %s)")
        args.append(json.dumps(service))
    if city:
        where.append("city = %s")
        args.append(city)
    sql = f"""
        SELECT id, name, short_name, address, lat, lng, phone,
               city, district,
               hours_weekday, hours_saturday, hours_sunday,
               services, windows, tags, parking, transit
        FROM gov_hall
        WHERE {" AND ".join(where)}
        ORDER BY city, id
    """
    rows = execute(sql, tuple(args), fetchall=True) or []
    return [_parse_json_fields(r) for r in rows]


def get_by_id(hall_id: str) -> dict | None:
    sql = """
        SELECT id, name, short_name, address, lat, lng, phone,
               city, district,
               hours_weekday, hours_saturday, hours_sunday,
               services, windows, tags, parking, transit
        FROM gov_hall
        WHERE id = %s AND is_active = 1
    """
    row = execute(sql, (hall_id,), fetchone=True)
    return _parse_json_fields(row)


def count_by_city() -> dict:
    rows = (
        execute(
            "SELECT city, COUNT(*) AS cnt FROM gov_hall WHERE is_active = 1 GROUP BY city",
            fetchall=True,
        )
        or []
    )
    return {row["city"]: int(row["cnt"]) for row in rows}


def _parse_json_fields(row: dict | None) -> dict | None:
    if row is None:
        return None
    for field in ("services", "tags"):
        raw = row.get(field)
        if isinstance(raw, str):
            try:
                row[field] = json.loads(raw)
            except json.JSONDecodeError:
                row[field] = []
    row["hours"] = {
        "weekday": row.pop("hours_weekday", None),
        "saturday": row.pop("hours_saturday", None),
        "sunday": row.pop("hours_sunday", None),
    }
    row["parking"] = bool(row.get("parking", 0))
    return row
