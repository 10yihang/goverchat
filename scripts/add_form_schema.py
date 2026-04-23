from __future__ import annotations

import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "service_items.json"


COMMON_PHONE = {
    "name": "phone",
    "label": "手机号",
    "type": "tel",
    "required": True,
    "placeholder": "请输入 11 位手机号",
    "pattern": "^1[3-9]\\d{9}$",
}

COMMON_NAME = {
    "name": "name",
    "label": "姓名",
    "type": "text",
    "required": True,
    "placeholder": "请输入证件姓名",
    "max_length": 50,
}

COMMON_ID = {
    "name": "id_number",
    "label": "身份证号",
    "type": "text",
    "required": True,
    "placeholder": "请输入 18 位身份证号",
    "pattern": "^[0-9Xx]{15,18}$",
}

COMMON_REMARK = {
    "name": "remark",
    "label": "备注（选填）",
    "type": "textarea",
    "required": False,
    "placeholder": "如有特殊情况可在此说明",
    "max_length": 300,
}

DELIVERY_OPTIONS = ["邮寄送达", "本人到指定地点自取"]

YES_NO_OPTIONS = ["否", "是"]


FORM_SCHEMAS = {
    "driver-license-renewal": {
        "submit_label": "提交驾驶证换证申请",
        "intro": "请如实填写以下信息，提交后系统将生成受理编号并通过邮件通知您进度。",
        "fields": [
            COMMON_NAME,
            COMMON_ID,
            COMMON_PHONE,
            {
                "name": "license_no",
                "label": "驾驶证档案编号",
                "type": "text",
                "required": True,
                "placeholder": "12 位档案编号（驾驶证副页可见）",
            },
            {
                "name": "expire_date",
                "label": "驾驶证到期日期",
                "type": "date",
                "required": True,
            },
            {
                "name": "physical_check_date",
                "label": "体检完成日期",
                "type": "date",
                "required": True,
            },
            {
                "name": "delivery_method",
                "label": "新证领取方式",
                "type": "select",
                "required": True,
                "options": DELIVERY_OPTIONS,
            },
            {
                "name": "delivery_address",
                "label": "邮寄地址（选邮寄时必填）",
                "type": "textarea",
                "required": False,
                "placeholder": "省市区 + 详细地址",
                "max_length": 200,
            },
            COMMON_REMARK,
        ],
    },
    "driver-license-reissue": {
        "submit_label": "提交驾驶证补证申请",
        "intro": "请填写以下信息提交补证申请，系统将自动核验您的驾驶证状态。",
        "fields": [
            COMMON_NAME,
            COMMON_ID,
            COMMON_PHONE,
            {
                "name": "lost_reason",
                "label": "补证原因",
                "type": "select",
                "required": True,
                "options": ["遗失", "损毁", "其他"],
            },
            {
                "name": "lost_date",
                "label": "证件遗失/损毁日期（约略）",
                "type": "date",
                "required": False,
            },
            {
                "name": "delivery_method",
                "label": "新证领取方式",
                "type": "select",
                "required": True,
                "options": DELIVERY_OPTIONS,
            },
            {
                "name": "delivery_address",
                "label": "邮寄地址（选邮寄时必填）",
                "type": "textarea",
                "required": False,
                "placeholder": "省市区 + 详细地址",
                "max_length": 200,
            },
            COMMON_REMARK,
        ],
    },
    "vehicle-inspection": {
        "submit_label": "预约机动车年检",
        "intro": "请填写预约信息，工作人员审核后将通过短信/邮件确认到站时间。",
        "fields": [
            COMMON_NAME,
            COMMON_PHONE,
            {
                "name": "plate_number",
                "label": "车牌号",
                "type": "text",
                "required": True,
                "placeholder": "如 苏A12345",
                "max_length": 12,
            },
            {
                "name": "vehicle_type",
                "label": "车辆类型",
                "type": "select",
                "required": True,
                "options": [
                    "小型汽车",
                    "新能源乘用车",
                    "大型客车",
                    "货车",
                    "摩托车",
                    "其他",
                ],
            },
            {
                "name": "vin_last6",
                "label": "车架号末 6 位",
                "type": "text",
                "required": True,
                "placeholder": "用于身份核对",
                "max_length": 6,
            },
            {
                "name": "preferred_date",
                "label": "首选预约日期",
                "type": "date",
                "required": True,
            },
            {
                "name": "preferred_time_slot",
                "label": "首选时段",
                "type": "select",
                "required": True,
                "options": ["上午 09:00-11:30", "下午 13:30-16:00", "其他（备注说明）"],
            },
            {
                "name": "station_preference",
                "label": "意向检测站",
                "type": "text",
                "required": False,
                "placeholder": "可填站名或区域，留空则系统就近分配",
                "max_length": 80,
            },
            COMMON_REMARK,
        ],
    },
    "vehicle-transfer": {
        "submit_label": "提交机动车过户转籍申请",
        "intro": "请填写买卖双方及车辆基本信息，提交后将由工作人员预约线下窗口办理时间。",
        "fields": [
            {
                "name": "owner_name",
                "label": "原车主姓名",
                "type": "text",
                "required": True,
                "max_length": 50,
            },
            {
                "name": "owner_id_number",
                "label": "原车主身份证号",
                "type": "text",
                "required": True,
                "pattern": "^[0-9Xx]{15,18}$",
            },
            {
                "name": "buyer_name",
                "label": "新车主姓名",
                "type": "text",
                "required": True,
                "max_length": 50,
            },
            {
                "name": "buyer_id_number",
                "label": "新车主身份证号",
                "type": "text",
                "required": True,
                "pattern": "^[0-9Xx]{15,18}$",
            },
            COMMON_PHONE,
            {
                "name": "plate_number",
                "label": "车牌号",
                "type": "text",
                "required": True,
                "max_length": 12,
            },
            {
                "name": "transfer_type",
                "label": "办理类型",
                "type": "select",
                "required": True,
                "options": [
                    "本市过户",
                    "转入本市（外地→本地）",
                    "转出本市（本地→外地）",
                ],
            },
            {
                "name": "preferred_date",
                "label": "首选预约日期",
                "type": "date",
                "required": True,
            },
            COMMON_REMARK,
        ],
    },
    "violation-handling": {
        "submit_label": "提交违法处理申请",
        "intro": "请如实填写违法记录信息，提交后将进入复核排期。",
        "fields": [
            COMMON_NAME,
            COMMON_ID,
            COMMON_PHONE,
            {
                "name": "decision_no",
                "label": "违法决定书 / 通知书编号",
                "type": "text",
                "required": True,
                "placeholder": "如 32010012025********",
                "max_length": 30,
            },
            {
                "name": "violation_date",
                "label": "违法发生日期",
                "type": "date",
                "required": True,
            },
            {
                "name": "plate_number",
                "label": "涉及车牌号",
                "type": "text",
                "required": True,
                "max_length": 12,
            },
            {
                "name": "handling_method",
                "label": "处理方式",
                "type": "select",
                "required": True,
                "options": ["接受处罚并缴款", "申请陈述申辩", "申请行政复议"],
            },
            COMMON_REMARK,
        ],
    },
    "plate-service": {
        "submit_label": "提交号牌补领申请",
        "intro": "请填写以下信息申请补领号牌，受理后将通过邮件通知您领取或邮寄安排。",
        "fields": [
            COMMON_NAME,
            COMMON_ID,
            COMMON_PHONE,
            {
                "name": "plate_number",
                "label": "原号牌号码",
                "type": "text",
                "required": True,
                "max_length": 12,
            },
            {
                "name": "service_type",
                "label": "申请类别",
                "type": "select",
                "required": True,
                "options": ["补领号牌", "换领号牌", "号牌损毁更换"],
            },
            {
                "name": "lost_or_damaged_plate_count",
                "label": "丢失/损毁号牌数量",
                "type": "select",
                "required": True,
                "options": ["1 块（前牌或后牌）", "2 块（前后牌均涉及）"],
            },
            {
                "name": "delivery_method",
                "label": "领取方式",
                "type": "select",
                "required": True,
                "options": DELIVERY_OPTIONS,
            },
            {
                "name": "delivery_address",
                "label": "邮寄地址（选邮寄时必填）",
                "type": "textarea",
                "required": False,
                "placeholder": "省市区 + 详细地址",
                "max_length": 200,
            },
            COMMON_REMARK,
        ],
    },
    "ride-hailing-license": {
        "submit_label": "提交网约车驾驶员从业资格申请",
        "intro": "请填写以下信息，工作人员将审核驾龄、违法记录后进行培训预约通知。",
        "fields": [
            COMMON_NAME,
            COMMON_ID,
            COMMON_PHONE,
            {
                "name": "drive_license_no",
                "label": "驾驶证档案编号",
                "type": "text",
                "required": True,
                "max_length": 20,
            },
            {
                "name": "drive_years",
                "label": "实际驾龄（年）",
                "type": "select",
                "required": True,
                "options": ["3 年以下", "3-5 年", "5-10 年", "10 年以上"],
            },
            {
                "name": "has_serious_violation",
                "label": "近 3 年内是否有重大违法或事故",
                "type": "select",
                "required": True,
                "options": YES_NO_OPTIONS,
            },
            {
                "name": "city",
                "label": "拟从业城市",
                "type": "text",
                "required": True,
                "max_length": 30,
            },
            {
                "name": "training_consent",
                "label": "是否同意参加平台规定的从业培训",
                "type": "select",
                "required": True,
                "options": ["同意", "需进一步咨询"],
            },
            COMMON_REMARK,
        ],
    },
}


def main() -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    items = payload.get("items", [])
    updated = 0
    for item in items:
        slug = item.get("slug")
        schema = FORM_SCHEMAS.get(slug)
        if schema is None:
            print(f"  SKIP {slug} (no schema defined)")
            continue
        item["form_schema"] = schema
        updated += 1
        print(f"  OK   {slug}: {len(schema['fields'])} fields")

    DATA_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nUpdated {updated}/{len(items)} items in {DATA_PATH}")


if __name__ == "__main__":
    main()
