from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime

import pymysql

from models import application as application_model
from models.conversation import add_message
from services.email_service import email_service
from services.service_catalog import service_catalog_service

logger = logging.getLogger(__name__)


_SLUG_PREFIX = {
    "driver-license-renewal": "DL",
    "driver-license-reissue": "DB",
    "vehicle-inspection": "VI",
    "vehicle-transfer": "VT",
    "violation-handling": "VH",
    "plate-service": "PS",
    "ride-hailing-license": "RH",
}

_QUERY_NO_RAND_LEN = 4
_QUERY_NO_MAX_RETRY = 5


class ApplicationError(Exception):
    def __init__(
        self, code: str, message: str, status: int = 400, details: dict | None = None
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}


def _generate_query_no_candidate(slug: str) -> str:
    prefix = _SLUG_PREFIX.get(slug, slug[:2].upper() if slug else "GR")
    yymmdd = datetime.now().strftime("%y%m%d")
    rand = "".join(
        secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        for _ in range(_QUERY_NO_RAND_LEN)
    )
    return f"{prefix}{yymmdd}{rand}"


def _insert_with_unique_retry(
    *,
    user: dict,
    session_id: str,
    service_slug: str,
    service_title: str,
    applicant_name: str,
    applicant_phone: str,
    cleaned: dict,
) -> tuple[str, int]:
    last_exc: Exception | None = None
    for attempt in range(_QUERY_NO_MAX_RETRY):
        candidate = _generate_query_no_candidate(service_slug)
        try:
            app_id = application_model.insert(
                query_no=candidate,
                user_id=int(user["id"]),
                user_email=user["email"],
                session_id=session_id or "",
                service_slug=service_slug,
                service_title=service_title,
                applicant_name=applicant_name,
                applicant_phone=applicant_phone,
                form_data=cleaned,
            )
            return candidate, app_id
        except pymysql.IntegrityError as exc:
            last_exc = exc
            logger.warning(
                "[Application] 受理编号冲突重试 attempt=%s candidate=%s err=%s",
                attempt + 1,
                candidate,
                exc,
            )
            continue
    raise ApplicationError(
        "query_no_collision",
        "受理编号生成冲突，请稍后重试",
        status=500,
    ) from last_exc


def _validate_field(field: dict, raw_value) -> tuple[str, list[str]]:
    label = field.get("label", field["name"])
    required = bool(field.get("required", False))
    ftype = field.get("type", "text")
    max_length = field.get("max_length") or 0
    pattern = field.get("pattern") or ""
    options = field.get("options") or []

    value = raw_value if raw_value is not None else ""
    if isinstance(value, str):
        value = value.strip()
    elif isinstance(value, (int, float)):
        value = str(value)
    else:
        return "", [f"{label} 类型不合法"]

    errs: list[str] = []
    if required and not value:
        errs.append(f"{label} 为必填")
        return value, errs
    if not value:
        return value, errs

    if max_length and len(value) > max_length:
        errs.append(f"{label} 长度不能超过 {max_length} 字符")
    if pattern:
        try:
            if not re.match(pattern, value):
                errs.append(f"{label} 格式不正确")
        except re.error:
            pass
        except Exception:
            errs.append(f"{label} 校验内部错误")
    if ftype == "select" and options and value not in options:
        errs.append(f"{label} 选项不在允许范围内")
    if ftype == "tel" and not re.match(r"^1[3-9]\d{9}$", value):
        errs.append(f"{label} 必须为 11 位手机号")
    if ftype == "date":
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            errs.append(f"{label} 必须为 YYYY-MM-DD 格式")
    if ftype == "email":
        if not re.match(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$", value):
            errs.append(f"{label} 邮箱格式不正确")
    if ftype == "number":
        try:
            float(value)
        except ValueError:
            errs.append(f"{label} 必须为数字")
    return value, errs


def _validate_and_normalize(schema: dict, raw_form: dict) -> tuple[dict, list[str]]:
    cleaned: dict = {}
    errors: list[str] = []
    for field in schema.get("fields", []):
        name = field["name"]
        normalized, errs = _validate_field(field, raw_form.get(name))
        cleaned[name] = normalized
        errors.extend(errs)
    return cleaned, errors


class ApplicationService:
    def submit(
        self,
        *,
        user: dict,
        session_id: str,
        service_slug: str,
        form_data: dict,
    ) -> dict:
        item = service_catalog_service.get_item(service_slug)
        if item is None:
            raise ApplicationError("service_not_found", "事项不存在", status=404)
        if int(item.get("is_active", 1)) != 1:
            raise ApplicationError("service_inactive", "事项已停用", status=400)

        schema = service_catalog_service.get_form_schema(service_slug)
        if schema is None:
            raise ApplicationError(
                "no_form_schema",
                "该事项暂未开放在线办理",
                status=400,
            )

        if not isinstance(form_data, dict):
            raise ApplicationError("invalid_form", "表单数据格式错误", status=400)

        cleaned, errors = _validate_and_normalize(schema, form_data)
        if errors:
            raise ApplicationError(
                "validation_failed",
                "; ".join(errors[:5]),
                status=400,
                details={"errors": errors},
            )

        applicant_name = (
            cleaned.get("name")
            or cleaned.get("owner_name")
            or cleaned.get("buyer_name")
            or ""
        )[:50]
        applicant_phone = (cleaned.get("phone") or "")[:20]

        query_no, app_id = _insert_with_unique_retry(
            user=user,
            session_id=session_id,
            service_slug=service_slug,
            service_title=item["title"],
            applicant_name=applicant_name,
            applicant_phone=applicant_phone,
            cleaned=cleaned,
        )

        record = application_model.get_by_id(app_id)

        try:
            email_service.send_application_submitted(
                to_email=user["email"],
                applicant_name=applicant_name or user.get("display_name") or "",
                service_title=item["title"],
                query_no=query_no,
            )
        except Exception as exc:
            logger.warning(
                "[Application] 提交确认邮件触发失败 query_no=%s err=%s", query_no, exc
            )

        if session_id:
            try:
                bot_text = (
                    f"✅ 您的「{item['title']}」办理申请已成功提交。\n"
                    f"受理编号：{query_no}\n"
                    f"系统已将受理详情发送至您的邮箱（{user['email']}），"
                    f"您可随时输入受理编号查询办理进度。"
                )
                add_message(
                    session_id=session_id,
                    role="bot",
                    content=bot_text,
                    msg_type="text",
                )
            except Exception as exc:
                logger.warning(
                    "[Application] 写入确认气泡失败 query_no=%s err=%s", query_no, exc
                )

        logger.info(
            "[Application] 已提交 query_no=%s service=%s user_id=%s",
            query_no,
            service_slug,
            user["id"],
        )
        return record

    def update_status_by_admin(
        self,
        *,
        app_id: int,
        new_status: str,
        admin_remark: str | None,
        admin_username: str = "",
    ) -> dict:
        existing = application_model.get_by_id(app_id)
        if existing is None:
            raise ApplicationError("not_found", "申请不存在", status=404)
        old_status = existing["status"]

        try:
            application_model.update_status(app_id, new_status, admin_remark)
        except ValueError as exc:
            raise ApplicationError("invalid_status", str(exc), status=400) from exc

        updated = application_model.get_by_id(app_id)

        if old_status != new_status:
            try:
                email_service.send_status_changed(
                    to_email=existing["user_email"],
                    applicant_name=existing.get("applicant_name") or "",
                    service_title=existing["service_title"],
                    query_no=existing["query_no"],
                    old_status=old_status,
                    new_status=new_status,
                    admin_remark=admin_remark or "",
                )
            except Exception as exc:
                logger.warning(
                    "[Application] 状态变更邮件触发失败 query_no=%s err=%s",
                    existing["query_no"],
                    exc,
                )

        logger.info(
            "[Application] 状态变更 query_no=%s %s -> %s by=%s",
            existing["query_no"],
            old_status,
            new_status,
            admin_username or "-",
        )
        return updated


application_service = ApplicationService()
