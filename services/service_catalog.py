from __future__ import annotations

"""
Shared transport-government service catalog backed by local JSON data.
"""

import json
from copy import deepcopy
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_DATA_PATH = BASE_DIR / "data" / "service_items.json"


DEMO_PROGRESS_RECORDS = {
    ("driver-license-renewal", "DL2026001"): {
        "query_no": "DL2026001",
        "status": "审核中",
        "stage": "资料复核",
        "updated_at": "2026-03-18 09:20",
        "timeline": [
            {"label": "提交申请", "time": "2026-03-16 10:08", "done": True},
            {"label": "身份核验", "time": "2026-03-16 11:22", "done": True},
            {"label": "资料复核", "time": "2026-03-18 09:20", "done": True},
            {"label": "制证发放", "time": "", "done": False},
        ],
        "next_step": "请保持联系电话畅通，待审核通过后可选择邮寄或现场领取新证。",
        "pending_materials": [],
    },
    ("driver-license-reissue", "DB2026002"): {
        "query_no": "DB2026002",
        "status": "材料待补充",
        "stage": "照片校验",
        "updated_at": "2026-03-17 15:42",
        "timeline": [
            {"label": "提交申请", "time": "2026-03-17 14:01", "done": True},
            {"label": "身份核验", "time": "2026-03-17 14:30", "done": True},
            {"label": "照片校验", "time": "2026-03-17 15:42", "done": True},
            {"label": "证件制发", "time": "", "done": False},
        ],
        "next_step": "请重新上传符合规格的证件照片或补充电子回执。",
        "pending_materials": ["近期证件照片电子回执"],
    },
    ("vehicle-inspection", "VI2026003"): {
        "query_no": "VI2026003",
        "status": "办理完成",
        "stage": "检验完成",
        "updated_at": "2026-03-18 08:36",
        "timeline": [
            {"label": "预约检测", "time": "2026-03-15 09:15", "done": True},
            {"label": "到站检验", "time": "2026-03-18 08:10", "done": True},
            {"label": "结果确认", "time": "2026-03-18 08:36", "done": True},
            {"label": "业务归档", "time": "2026-03-18 08:36", "done": True},
        ],
        "next_step": "您的车辆检验业务已完成，请妥善保存相关凭证。",
        "pending_materials": [],
    },
    ("vehicle-transfer", "VT2026004"): {
        "query_no": "VT2026004",
        "status": "待受理",
        "stage": "窗口排队",
        "updated_at": "2026-03-18 10:05",
        "timeline": [
            {"label": "预约提交", "time": "2026-03-18 09:48", "done": True},
            {"label": "窗口受理", "time": "", "done": False},
            {"label": "选号制证", "time": "", "done": False},
            {"label": "业务完成", "time": "", "done": False},
        ],
        "next_step": "请按预约时间前往受理窗口提交原件材料。",
        "pending_materials": [],
    },
    ("violation-handling", "VH2026005"): {
        "query_no": "VH2026005",
        "status": "已退回",
        "stage": "复核退回",
        "updated_at": "2026-03-18 07:58",
        "timeline": [
            {"label": "提交处理申请", "time": "2026-03-17 16:12", "done": True},
            {"label": "业务复核", "time": "2026-03-18 07:58", "done": True},
            {"label": "重新提交", "time": "", "done": False},
        ],
        "next_step": "请核对违法通知编号与驾驶证信息后重新提交申请。",
        "pending_materials": ["违法通知编号截图"],
    },
}


_STATUS_TO_STAGE = {
    "已提交": "等待受理",
    "审核中": "工作人员审核中",
    "材料待补充": "材料补充中",
    "办理完成": "已办结",
    "已退回": "已退回",
}


def _real_record_to_progress_view(record: dict) -> dict:
    status = record["status"]
    stage = _STATUS_TO_STAGE.get(status, status)
    timeline = [
        {"label": "提交申请", "time": record["created_at"], "done": True},
        {
            "label": "审核受理",
            "time": record["updated_at"] if status != "已提交" else "",
            "done": status not in ("已提交",),
        },
        {
            "label": "办理执行",
            "time": record["updated_at"] if status in ("办理完成",) else "",
            "done": status == "办理完成",
        },
        {
            "label": "完成",
            "time": record["updated_at"] if status == "办理完成" else "",
            "done": status == "办理完成",
        },
    ]
    if status == "已退回":
        timeline.append({"label": "已退回", "time": record["updated_at"], "done": True})

    next_step = {
        "已提交": "您的申请已成功提交，工作人员将尽快受理。",
        "审核中": "正在审核您的申请，请耐心等待。",
        "材料待补充": "请根据备注补充相关材料。",
        "办理完成": "办理已完成，请按照备注领取证件或查收邮件。",
        "已退回": "申请已退回，请查看退回原因后重新提交。",
    }.get(status, "请关注后续通知。")

    pending = []
    if status == "材料待补充" and record.get("admin_remark"):
        pending = [record["admin_remark"]]

    return {
        "query_no": record["query_no"],
        "status": status,
        "stage": stage,
        "updated_at": record["updated_at"],
        "timeline": timeline,
        "next_step": next_step,
        "pending_materials": pending,
        "applicant_name": record.get("applicant_name") or "",
        "service_title": record.get("service_title") or "",
        "admin_remark": record.get("admin_remark") or "",
        "is_real": True,
    }


class ServiceCatalogService:
    def _load_all(self) -> list[dict]:
        data = json.loads(SERVICE_DATA_PATH.read_text(encoding="utf-8"))
        return data.get("items", [])

    def _save_all(self, items: list[dict]) -> None:
        SERVICE_DATA_PATH.write_text(
            json.dumps({"items": items}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def list_items(
        self, category: str = "", keyword: str = "", include_inactive: bool = False
    ) -> list[dict]:
        items = deepcopy(self._load_all())
        if not include_inactive:
            items = [item for item in items if int(item.get("is_active", 1)) == 1]
        if category:
            items = [item for item in items if item["category"] == category]

        keyword = keyword.strip().lower()
        if keyword:
            filtered = []
            for item in items:
                corpus = " ".join(
                    [
                        item.get("title", ""),
                        item.get("summary", ""),
                        item.get("category", ""),
                        " ".join(item.get("keywords", [])),
                    ]
                ).lower()
                if keyword in corpus:
                    filtered.append(item)
            items = filtered
        return items

    def categories(self) -> list[str]:
        return sorted(
            {
                item["category"]
                for item in self.list_items(include_inactive=True)
                if item.get("category")
            }
        )

    def get_item(self, slug: str) -> dict | None:
        for item in self.list_items(include_inactive=True):
            if item["slug"] == slug:
                return item
        return None

    def hot_items(self) -> list[dict]:
        hot_slugs = [
            "driver-license-renewal",
            "vehicle-inspection",
            "violation-handling",
            "plate-service",
        ]
        return [item for item in self.list_items() if item["slug"] in hot_slugs]

    def query_progress(
        self, service_slug: str, query_no: str
    ) -> tuple[bool, dict | None]:
        from models import application as application_model

        normalized_slug = service_slug.strip()
        normalized_no = query_no.strip().upper()

        real = application_model.get_by_query_no(normalized_no)
        if real is not None and (
            not normalized_slug or real["service_slug"] == normalized_slug
        ):
            return True, _real_record_to_progress_view(real)

        if normalized_slug:
            record = DEMO_PROGRESS_RECORDS.get((normalized_slug, normalized_no))
            return (record is not None, record)

        for (_, demo_no), demo_rec in DEMO_PROGRESS_RECORDS.items():
            if demo_no == normalized_no:
                return True, demo_rec
        return False, None

    def recommend_card(self, text: str) -> dict | None:
        normalized = text.strip().lower()
        if not normalized:
            return None

        best_item = None
        best_score = 0
        for item in self.list_items():
            score = 0
            for token in item.get("keywords", []):
                token_l = token.lower()
                if token_l and token_l in normalized:
                    score += max(2, len(token_l))
            if item["title"].lower() in normalized:
                score += 10
            if score > best_score:
                best_score = score
                best_item = item

        if best_item is None or best_score <= 0:
            return None

        return {
            "slug": best_item["slug"],
            "title": best_item["title"],
            "category": best_item["category"],
            "summary": best_item["summary"],
            "material_count": len(best_item.get("materials", [])),
            "entry_label": best_item["entry_label"],
            "has_form": isinstance(best_item.get("form_schema"), dict)
            and bool(best_item["form_schema"].get("fields")),
        }

    def upsert_item(self, payload: dict) -> dict:
        items = self._load_all()
        normalized = self._normalize_payload(payload)
        existing_index = next(
            (
                index
                for index, item in enumerate(items)
                if item["slug"] == normalized["slug"]
            ),
            None,
        )
        if existing_index is None:
            items.append(normalized)
        else:
            items[existing_index] = normalized
        self._save_all(items)
        return normalized

    def set_active(self, slug: str, is_active: int) -> None:
        items = self._load_all()
        for item in items:
            if item["slug"] == slug:
                item["is_active"] = 1 if int(is_active) == 1 else 0
                break
        self._save_all(items)

    def get_form_schema(self, slug: str) -> dict | None:
        item = self.get_item(slug)
        if item is None:
            return None
        schema = item.get("form_schema")
        if not isinstance(schema, dict):
            return None
        fields = schema.get("fields")
        if not isinstance(fields, list) or not fields:
            return None
        return schema

    def _normalize_payload(self, payload: dict) -> dict:
        def normalize_lines(value) -> list[str]:
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            return [
                line.strip() for line in str(value or "").splitlines() if line.strip()
            ]

        def normalize_form_schema(value) -> dict | None:
            if not isinstance(value, dict):
                return None
            raw_fields = value.get("fields")
            if not isinstance(raw_fields, list):
                return None
            allowed_types = {
                "text",
                "textarea",
                "tel",
                "date",
                "select",
                "email",
                "number",
            }
            cleaned_fields: list[dict] = []
            seen_names: set[str] = set()
            for raw in raw_fields:
                if not isinstance(raw, dict):
                    continue
                name = str(raw.get("name") or "").strip()
                label = str(raw.get("label") or "").strip()
                ftype = str(raw.get("type") or "text").strip()
                if not name or not label or name in seen_names:
                    continue
                if ftype not in allowed_types:
                    ftype = "text"
                seen_names.add(name)
                field: dict = {
                    "name": name,
                    "label": label,
                    "type": ftype,
                    "required": bool(raw.get("required", False)),
                }
                placeholder = str(raw.get("placeholder") or "").strip()
                if placeholder:
                    field["placeholder"] = placeholder
                if ftype == "select":
                    options = raw.get("options")
                    if isinstance(options, list):
                        field["options"] = [
                            str(opt).strip() for opt in options if str(opt).strip()
                        ]
                    else:
                        field["options"] = []
                pattern = str(raw.get("pattern") or "").strip()
                if pattern:
                    field["pattern"] = pattern
                max_length = raw.get("max_length")
                if isinstance(max_length, (int, float)) and max_length > 0:
                    field["max_length"] = int(max_length)
                cleaned_fields.append(field)
            if not cleaned_fields:
                return None
            return {
                "submit_label": str(value.get("submit_label") or "提交申请").strip(),
                "intro": str(value.get("intro") or "").strip(),
                "fields": cleaned_fields,
            }

        def normalize_faq(value) -> list[dict]:
            if isinstance(value, list):
                items = []
                for row in value:
                    q = str((row or {}).get("q") or "").strip()
                    a = str((row or {}).get("a") or "").strip()
                    if q and a:
                        items.append({"q": q, "a": a})
                return items
            pairs = []
            for line in str(value or "").splitlines():
                line = line.strip()
                if not line or "|" not in line:
                    continue
                q, a = line.split("|", 1)
                q = q.strip()
                a = a.strip()
                if q and a:
                    pairs.append({"q": q, "a": a})
            return pairs

        def normalize_channels(value) -> list[dict]:
            if isinstance(value, list):
                channels = []
                for row in value:
                    name = str((row or {}).get("name") or "").strip()
                    if not name:
                        continue
                    channels.append(
                        {
                            "name": name,
                            "type": str((row or {}).get("type") or "online").strip()
                            or "online",
                            "url": str((row or {}).get("url") or "").strip(),
                        }
                    )
                return channels
            channels = []
            for line in str(value or "").splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = [part.strip() for part in line.split("|")]
                name = parts[0] if len(parts) > 0 else ""
                channel_type = parts[1] if len(parts) > 1 else "online"
                url = parts[2] if len(parts) > 2 else ""
                if name:
                    channels.append(
                        {"name": name, "type": channel_type or "online", "url": url}
                    )
            return channels

        normalized = {
            "slug": str(payload.get("slug") or "").strip(),
            "title": str(payload.get("title") or "").strip(),
            "category": str(payload.get("category") or "").strip(),
            "summary": str(payload.get("summary") or "").strip(),
            "conditions": normalize_lines(payload.get("conditions")),
            "materials": normalize_lines(payload.get("materials")),
            "process_steps": normalize_lines(payload.get("process_steps")),
            "channels": normalize_channels(payload.get("channels")),
            "faq": normalize_faq(payload.get("faq")),
            "tips": normalize_lines(payload.get("tips")),
            "entry_label": str(payload.get("entry_label") or "").strip(),
            "entry_url": str(payload.get("entry_url") or "").strip(),
            "qa_seed": str(payload.get("qa_seed") or "").strip(),
            "keywords": normalize_lines(payload.get("keywords")),
            "download_name": str(payload.get("download_name") or "").strip(),
            "download_url": str(payload.get("download_url") or "").strip(),
            "is_active": 1 if int(payload.get("is_active", 1) or 1) == 1 else 0,
        }
        form_schema = normalize_form_schema(payload.get("form_schema"))
        if form_schema is not None:
            normalized["form_schema"] = form_schema
        return normalized


service_catalog_service = ServiceCatalogService()
