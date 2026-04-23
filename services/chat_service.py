from __future__ import annotations

"""
问答编排服务（整合 TF-IDF 检索 + 消息持久化）
"""
import logging

from services.tfidf_service import tfidf_service
from services.web_search_service import web_search_service
from services.service_catalog import service_catalog_service
from services.llm_service import llm_service
from models.conversation import (
    create_session,
    session_exists,
    add_message,
    claim_session,
    get_session_owner,
)
import config

logger = logging.getLogger(__name__)


class ChatService:
    """
    统一问答入口，文字和语音问答均通过 answer() 方法处理。
    单一职责：检索 + 持久化 + 返回结构体。
    """

    def ensure_session(
        self,
        session_id: str | None,
        user_agent: str = "",
        ip: str = "",
        user_id: int | None = None,
    ) -> str:
        """
        确保 session_id 有效：
        - None 或不存在于 DB → 新建会话（绑定 user_id）
        - 已存在但匿名 → 自动认领给当前 user_id
        - 已存在且属他人 → 强制新建（防越权）
        - 已存在且属当前用户 → 复用
        """
        if session_id and session_exists(session_id):
            if user_id is None:
                return session_id
            owner = get_session_owner(session_id)
            if owner is None:
                claim_session(session_id, user_id)
                actual_owner = get_session_owner(session_id)
                if actual_owner == user_id:
                    return session_id
                return create_session(
                    user_agent=user_agent, ip_address=ip, user_id=user_id
                )
            if owner == user_id:
                return session_id
            return create_session(user_agent=user_agent, ip_address=ip, user_id=user_id)
        return create_session(user_agent=user_agent, ip_address=ip, user_id=user_id)

    def answer(self, session_id: str, text: str, msg_type: str = "text") -> dict:
        """
        处理一次问答。

        Args:
            session_id: 会话 UUID
            text:       用户输入文本
            msg_type:   'text' | 'voice'

        Returns:
            {
                "answer":       str,
                "confidence":   float,  # 0~1，兜底时为 0
                "knowledge_id": int | None,
                "sources":      list[dict],
                "session_id":   str,
            }
        """
        text = text.strip()
        if not text:
            return {
                "answer": "您好，请输入您的问题。",
                "confidence": 0.0,
                "knowledge_id": None,
                "sources": [],
                "session_id": session_id,
            }

        # 1. TF-IDF 检索
        result = tfidf_service.search(text)
        result["answer_source"] = "knowledge"

        if self._should_fallback_to_web(result):
            web_result = web_search_service.answer(text)
            if web_result:
                result = web_result

        card = service_catalog_service.recommend_card(text)
        result["service_card"] = card

        if config.FORM_SUBMISSION_ENABLED and card and card.get("has_form"):
            self._maybe_attach_form(result, text, card)

        # 2. 持久化用户消息
        try:
            add_message(
                session_id=session_id,
                role="user",
                content=text,
                msg_type=msg_type,
            )
        except Exception as e:
            logger.warning("[ChatService] 用户消息持久化失败：%s", e)

        # 3. 持久化机器人回复
        try:
            add_message(
                session_id=session_id,
                role="bot",
                content=result["answer"],
                msg_type="text",
                confidence=result["confidence"],
                knowledge_id=result["knowledge_id"],
            )
        except Exception as e:
            logger.warning("[ChatService] Bot 消息持久化失败：%s", e)

        result["session_id"] = session_id
        return result

    @staticmethod
    def _maybe_attach_form(result: dict, text: str, card: dict) -> None:
        try:
            intent = llm_service.classify_intent(text, card.get("title"))
        except Exception as exc:
            logger.warning("[ChatService] 意图识别异常 err=%s", exc)
            return

        result["intent_meta"] = intent
        if intent.get("intent") != "submission":
            return
        if float(intent.get("confidence", 0)) < config.LLM_INTENT_THRESHOLD:
            return

        schema = service_catalog_service.get_form_schema(card["slug"])
        if schema is None:
            return

        result["form_prompt"] = {
            "service_slug": card["slug"],
            "service_title": card["title"],
            "form_schema": schema,
            "intent_source": intent.get("source", "unknown"),
            "intent_confidence": intent.get("confidence", 0.0),
        }
        logger.info(
            "[ChatService] 已附加表单 slug=%s source=%s confidence=%.2f",
            card["slug"],
            intent.get("source"),
            intent.get("confidence", 0.0),
        )

    @staticmethod
    def _should_fallback_to_web(result: dict) -> bool:
        if not web_search_service.is_enabled():
            return False

        if result.get("knowledge_id") is None:
            return True

        confidence = float(result.get("confidence") or 0.0)
        return confidence < config.WEB_SEARCH_TRIGGER_THRESHOLD

    def new_session(
        self, user_agent: str = "", ip: str = "", user_id: int | None = None
    ) -> str:
        return create_session(user_agent=user_agent, ip_address=ip, user_id=user_id)


# 全局单例
chat_service = ChatService()
