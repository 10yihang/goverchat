from __future__ import annotations

import base64
import json
import logging
import mimetypes
import os
import re
import threading
import time

import config

logger = logging.getLogger(__name__)


_INTENT_SYSTEM_PROMPT = """你是政务办事意图分类器。判断用户输入是 [submission] 还是 [inquiry]。

submission（办理意图）：用户明确希望提交申请、办理业务、立即开始流程。
  例：'我想办理驾驶证换证' '帮我申请补证' '在哪办' '怎么提交' '立即办理' '我要办这个'

inquiry（询问意图）：用户在询问材料、流程、条件、时限等信息，并未明确要立刻办理。
  例：'需要什么材料' '怎么办理' '流程是什么' '换证需要哪些证件' '有什么条件'

判定规则：
1. 模糊或介于两者之间 → 倾向 inquiry，confidence 调低（0.3-0.5）
2. 明显办理意图 → submission，confidence 高（0.7-0.95）
3. 仅返回 JSON：{"intent": "submission" | "inquiry", "confidence": 0~1, "reason": "<= 30 字简述"}
4. 不要返回 JSON 之外的任何文字、不要 markdown 代码块。"""


_INIT_FAILURE_COOLDOWN_SEC = 60


class LLMService:
    def __init__(self) -> None:
        self._client = None
        self._client_lock = threading.Lock()
        self._init_failure_until: float = 0.0
        self._json_mode_unsupported: bool = False

    def is_enabled(self) -> bool:
        return (
            config.LLM_INTENT_ENABLED
            and bool(config.LLM_API_BASE)
            and bool(config.LLM_API_KEY)
        )

    def _get_client(self):
        if self._client is not None:
            return self._client
        if time.time() < self._init_failure_until:
            return None
        with self._client_lock:
            if self._client is not None:
                return self._client
            if time.time() < self._init_failure_until:
                return None
            try:
                from openai import OpenAI
            except ImportError:
                logger.error(
                    "[LLM] openai 包未安装，意图识别将降级到关键字（%ss 后重试）",
                    _INIT_FAILURE_COOLDOWN_SEC,
                )
                self._init_failure_until = time.time() + _INIT_FAILURE_COOLDOWN_SEC
                return None
            try:
                self._client = OpenAI(
                    base_url=config.LLM_API_BASE,
                    api_key=config.LLM_API_KEY,
                    timeout=config.LLM_TIMEOUT,
                )
                logger.info(
                    "[LLM] client ready base=%s model=%s",
                    config.LLM_API_BASE,
                    config.LLM_MODEL,
                )
                return self._client
            except Exception as exc:
                logger.error(
                    "[LLM] 客户端初始化失败（%ss 后重试）：%s",
                    _INIT_FAILURE_COOLDOWN_SEC,
                    exc,
                )
                self._init_failure_until = time.time() + _INIT_FAILURE_COOLDOWN_SEC
                return None

    def classify_intent(self, text: str, candidate_service_title: str | None) -> dict:
        text = (text or "").strip()
        if not text:
            return {
                "intent": "inquiry",
                "confidence": 0.0,
                "reason": "空输入",
                "source": "noop",
            }

        if not self.is_enabled():
            return self._fallback_keyword(text, reason="LLM 未启用")

        client = self._get_client()
        if client is None:
            return self._fallback_keyword(text, reason="LLM 客户端不可用")

        user_prompt = (
            f"用户输入：{text}\n候选事项：{candidate_service_title or '（无）'}\n"
            "请只用 JSON 回复，不要 markdown 代码块、不要任何解释。"
        )
        messages = [
            {"role": "system", "content": _INTENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        try:
            raw = self._chat_completion(
                client, messages, use_json_mode=not self._json_mode_unsupported
            )
        except Exception as exc:
            err_str = str(exc)
            if not self._json_mode_unsupported and (
                "Json mode" in err_str
                or "response_format" in err_str
                or "json_object" in err_str
            ):
                logger.warning(
                    "[LLM] 模型不支持 JSON mode，永久降级到 prompt-only 解析"
                )
                self._json_mode_unsupported = True
                try:
                    raw = self._chat_completion(client, messages, use_json_mode=False)
                except Exception as exc2:
                    logger.warning(
                        "[LLM] prompt-only 重试仍失败 err=%s 降级到关键字", exc2
                    )
                    return self._fallback_keyword(
                        text, reason=f"LLM 失败: {type(exc2).__name__}"
                    )
            else:
                logger.warning("[LLM] 调用失败 err=%s 降级到关键字", exc)
                return self._fallback_keyword(
                    text, reason=f"LLM 失败: {type(exc).__name__}"
                )

        parsed = self._parse_intent_json(raw)
        if parsed is None:
            logger.warning("[LLM] 响应不是合法 JSON，降级。raw=%s", raw[:200])
            return self._fallback_keyword(text, reason="LLM 响应格式错")
        parsed["source"] = "llm"
        return parsed

    def _chat_completion(self, client, messages: list, use_json_mode: bool) -> str:
        kwargs = {
            "model": config.LLM_MODEL,
            "temperature": config.LLM_TEMPERATURE,
            "messages": messages,
        }
        if use_json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        return (response.choices[0].message.content or "").strip()

    def chat_completion(
        self,
        messages: list[dict],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str | None:
        """非流式对话生成。失败返回 None。"""
        if not self.is_enabled():
            return None
        client = self._get_client()
        if client is None:
            return None
        try:
            response = client.chat.completions.create(
                model=config.LLM_MODEL,
                messages=messages,
                temperature=temperature
                if temperature is not None
                else config.LLM_CHAT_TEMPERATURE,
                max_tokens=max_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("[LLM] chat_completion 失败 err=%s", exc)
            return None

    def chat_completion_stream(
        self,
        messages: list[dict],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        """
        流式对话生成。生成器，每次 yield 一个文本片段（delta）。
        失败时 yield None 表示中止；调用方应检测并降级。
        """
        if not self.is_enabled():
            yield None
            return
        client = self._get_client()
        if client is None:
            yield None
            return
        try:
            stream = client.chat.completions.create(
                model=config.LLM_MODEL,
                messages=messages,
                temperature=temperature
                if temperature is not None
                else config.LLM_CHAT_TEMPERATURE,
                max_tokens=max_tokens,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield delta
        except Exception as exc:
            logger.warning("[LLM] chat_completion_stream 失败 err=%s", exc)
            yield None

    def analyze_image(self, image_path: str, question: str | None = None) -> str | None:
        if not self.is_enabled() or not config.LLM_VISION_ENABLED:
            return None
        client = self._get_client()
        if client is None:
            return None

        try:
            with open(image_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
        except (OSError, IOError) as exc:
            logger.warning("[LLM] 图片读取失败 path=%s err=%s", image_path, exc)
            return None

        ext = os.path.splitext(image_path)[1].lower()
        mime_type = mimetypes.types_map.get(ext, "image/png")
        if mime_type not in ("image/png", "image/jpeg", "image/webp", "image/gif"):
            mime_type = "image/png"

        image_url = f"data:{mime_type};base64,{img_data}"
        user_text = question or "请分析这张图片的内容和可能涉及的政务办事需求。"

        messages = [
            {"role": "system", "content": config.LLM_VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                ],
            },
        ]

        image_size_kb = len(img_data) * 3 / 4 / 1024
        logger.info(
            "[LLM-vision] analyzing image=%s size=%.0fKB model=%s",
            os.path.basename(image_path),
            image_size_kb,
            config.LLM_VISION_MODEL,
        )

        try:
            response = client.chat.completions.create(
                model=config.LLM_VISION_MODEL,
                messages=messages,
                max_tokens=config.LLM_VISION_MAX_TOKENS,
                temperature=config.LLM_VISION_TEMPERATURE,
            )
            result = (response.choices[0].message.content or "").strip()
            if not result:
                logger.warning("[LLM-vision] 模型返回空内容")
                return None
            logger.info("[LLM-vision] 分析完成 len=%d", len(result))
            return result
        except Exception as exc:
            logger.warning("[LLM-vision] 调用失败 err=%s", exc)
            return None

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        粗略 token 估算。中文 1 字 ≈ 1.5 token，英文 4 字符 ≈ 1 token。
        +4 给 role/分隔符开销。够用于预算控制。
        """
        if not text:
            return 0
        chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
        other = len(text) - chinese
        return int(chinese * 1.5 + other / 4) + 4

    @staticmethod
    def _parse_intent_json(raw: str) -> dict | None:
        if not raw:
            return None
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if not match:
                return None
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        intent = str(data.get("intent", "")).lower().strip()
        if intent not in ("submission", "inquiry"):
            return None
        try:
            confidence = float(data.get("confidence", 0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        reason = str(data.get("reason", ""))[:60]
        return {"intent": intent, "confidence": confidence, "reason": reason}

    @staticmethod
    def _fallback_keyword(text: str, reason: str) -> dict:
        normalized = text.lower()
        hit_count = sum(
            1 for kw in config.FORM_SUBMISSION_KEYWORD_FALLBACK if kw in normalized
        )
        if hit_count >= 1:
            confidence = min(0.55 + 0.1 * hit_count, 0.85)
            intent = "submission"
        else:
            intent = "inquiry"
            confidence = 0.4
        return {
            "intent": intent,
            "confidence": confidence,
            "reason": f"关键字降级（命中 {hit_count}）：{reason}",
            "source": "keyword",
        }


llm_service = LLMService()
