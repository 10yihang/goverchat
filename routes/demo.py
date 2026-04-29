from __future__ import annotations

from flask import Blueprint, jsonify

import config

demo_bp = Blueprint("demo", __name__)

DEMO_SCENARIOS = [
    {
        "id": "scenario-1",
        "title": "驾驶证换证完整流程",
        "description": "演示文本问答 → LLM 意图识别 → 内联表单 → 提交办理 → 邮件通知 的完整闭环",
        "steps": [
            {
                "desc": "用户登录（邮箱验证码登录）",
                "type": "login",
                "email": "demo@qq.com",
                "note": "演示模式使用模拟登录，直接返回测试用户信息",
            },
            {
                "desc": "用户发起文本问答：「我想办理驾驶证期满换证」",
                "type": "chat",
                "text": "我想办理驾驶证期满换证",
                "expect": "bot 返回答案 + service_card + form_prompt（表单）",
            },
            {
                "desc": "LLM 识别为办理意图，自动展开内联表单",
                "type": "info",
                "note": "前端根据 form_prompt 字段渲染表单。用户填写姓名、身份证号、手机号等信息。",
            },
            {
                "desc": "用户提交办理申请",
                "type": "submit_form",
                "service_slug": "driver-license-renewal",
                "form_data": {
                    "name": "张三",
                    "id_number": "320102199001011234",
                    "phone": "13800138000",
                    "license_no": "320100000001",
                    "expire_date": "2026-06-15",
                    "physical_check_date": "2026-05-20",
                    "delivery_method": "邮寄送达",
                    "delivery_address": "江苏省南京市玄武区中山路88号",
                },
                "expect": "返回受理编号（如 DL260429XXXX）",
            },
            {
                "desc": "系统自动发送邮件通知用户",
                "type": "info",
                "note": "SMTP 向用户邮箱发送「申请已提交」通知，含受理编号。",
            },
            {
                "desc": "管理员查看并处理申请",
                "type": "info",
                "note": "登录管理后台 → 办理申请 Tab → 查看申请详情 → 变更状态为「审核中」→ 用户收到「状态变更」邮件。",
            },
            {
                "desc": "用户查询办理进度",
                "type": "chat",
                "text": "查询我的办理进度 DL260429XXXX",
                "expect": "bot 返回当前办理状态和进度时间线",
            },
        ],
    },
    {
        "id": "scenario-2",
        "title": "语音 + 图片多模态演示",
        "description": "演示语音输入 → Whisper 识别 → 问答 和 图片上传 → Tesseract OCR 识别 → 问答",
        "steps": [
            {
                "desc": "用户登录",
                "type": "login",
                "email": "demo@qq.com",
            },
            {
                "desc": "用户通过语音输入提问（上传预录音频）",
                "type": "info",
                "note": "点击录音按钮录制问题，或上传预录的 .wav / .webm 文件。Whisper 将语音转为文字后进入问答流程。",
            },
            {
                "desc": "系统调用 Whisper 进行语音识别",
                "type": "info",
                "note": "Flask 后台使用 openai-whisper（small 模型 466MB）进行 speech-to-text 转写，耗时约 2-5 秒。",
            },
            {
                "desc": "语音识别结果进入 TF-IDF + LLM 问答",
                "type": "info",
                "note": "识别后的中文文本与普通文本输入走完全相同的问答流程。",
            },
            {
                "desc": "用户上传包含办事信息的图片（OCR 识别）",
                "type": "info",
                "note": "上传包含「驾驶证换证所需材料」等文字的图片，Tesseract OCR 提取文字后进入问答。",
            },
            {
                "desc": "系统调用 Tesseract OCR 提取图片文字",
                "type": "info",
                "note": "后台使用 subprocess 调 tesseract CLI，lang='chi_sim+eng'，PSM=6。提取结果作为用户输入送入问答。",
            },
            {
                "desc": "OCR 提取的文字进入 TF-IDF + LLM 问答",
                "type": "info",
                "note": "完整走 TF-IDF 检索 → 可选 LLM RAG → 返回答案，回答来源标注为「知识库」或「RAG」。",
            },
        ],
    },
    {
        "id": "scenario-3",
        "title": "知识库外问题 + 联网搜索回退",
        "description": "演示用户问题超出知识库范围 → 触发 SearXNG 联网搜索回退 → 返回官方来源答案",
        "steps": [
            {
                "desc": "用户登录",
                "type": "login",
                "email": "demo@qq.com",
            },
            {
                "desc": "用户提问知识库外问题",
                "type": "chat",
                "text": "最新的新能源汽车补贴政策是什么？",
                "note": "此问题不在现有 37 条知识库中，TF-IDF 置信度将低于阈值。",
                "expect": "置信度低于 0.35 触发联网搜索回退，或返回兜底回复",
            },
            {
                "desc": "TF-IDF 检索置信度低于阈值 → 检查联网搜索开关",
                "type": "info",
                "note": "当 WEB_SEARCH_ENABLED=true 且 SearXNG 可访问时，自动发起联网搜索。",
            },
            {
                "desc": "SearXNG 返回搜索结果 → 优先展示 gov.cn 域名结果",
                "type": "info",
                "note": "WEB_SEARCH_PREFERRED_DOMAINS 配置优先展示 gov.cn 等官方域名。提取摘要拼接为回答。",
            },
            {
                "desc": "bot 返回联网搜索结果",
                "type": "info",
                "note": "回答来源标注为「联网」，附带搜索结果链接。",
            },
            {
                "desc": "联网搜索不可用时返回兜底回答",
                "type": "info",
                "note": "若 SearXNG 未部署或 WEB_SEARCH_ENABLED=false，返回 config.FALLBACK_ANSWER：'抱歉，我暂时没有找到……'",
            },
        ],
    },
]


@demo_bp.get("/api/demo/scenarios")
def list_scenarios():
    if not config.DEBUG:
        return jsonify({"error": "demo_not_available", "message": "演示模式仅在开发模式下可用"}), 403
    return jsonify({"scenarios": DEMO_SCENARIOS}), 200


@demo_bp.get("/api/demo/scenarios/<scenario_id>")
def get_scenario(scenario_id: str):
    if not config.DEBUG:
        return jsonify({"error": "demo_not_available", "message": "演示模式仅在开发模式下可用"}), 403
    for s in DEMO_SCENARIOS:
        if s["id"] == scenario_id:
            return jsonify({"scenario": s}), 200
    return jsonify({"error": "not_found", "message": "场景不存在"}), 404
