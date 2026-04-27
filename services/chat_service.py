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
    get_recent_messages,
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
                service_card=result.get("service_card"),
                form_prompt=result.get("form_prompt"),
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

    def answer_stream(self, session_id: str, text: str, msg_type: str = "text"):
        """
        流式问答生成器。yield 字典事件：
          {"type": "meta",  "data": {confidence, sources, service_card, ...}}
          {"type": "delta", "data": {"text": "..."}}
          {"type": "done",  "data": {"message_id": int, "form_prompt": ...}}
          {"type": "error", "data": {"error": "..."}}
        """
        text = text.strip()
        if not text:
            yield {"type": "error", "data": {"error": "empty_input"}}
            return

        # 1. 持久化用户消息
        try:
            add_message(
                session_id=session_id, role="user", content=text, msg_type=msg_type
            )
        except Exception as e:
            logger.warning("[ChatService] 用户消息持久化失败：%s", e)

        # 2. TF-IDF 检索
        retrieval = tfidf_service.search(text)
        answer_source = "knowledge"

        # 3. Web 兜底（仅 LLM 关闭时）
        use_llm = self._llm_chat_active()
        if not use_llm and self._should_fallback_to_web(retrieval):
            web_result = web_search_service.answer(text)
            if web_result:
                retrieval = web_result
                answer_source = web_result.get("answer_source", "web")

        # 4. 推荐卡 + 表单意图
        card = service_catalog_service.recommend_card(text)
        form_prompt = None
        if config.FORM_SUBMISSION_ENABLED and card and card.get("has_form"):
            form_prompt = self._compute_form_prompt(text, card)

        # 5. 第一帧：meta
        yield {
            "type": "meta",
            "data": {
                "confidence": retrieval.get("confidence", 0.0),
                "knowledge_id": retrieval.get("knowledge_id"),
                "sources": retrieval.get("sources", []),
                "service_card": card,
                "answer_source": "llm_rag" if use_llm else answer_source,
            },
        }

        # 6. 流式生成 answer
        full_answer_chunks = []
        if use_llm:
            gen = self._rag_stream(session_id, text, retrieval)
            first = next(gen, None)
            if first is None:
                yield from self._simulate_stream(
                    retrieval.get("answer", ""), full_answer_chunks
                )
                answer_source = "knowledge"
            else:
                full_answer_chunks.append(first)
                yield {"type": "delta", "data": {"text": first}}
                for delta in gen:
                    if delta is None:
                        break
                    full_answer_chunks.append(delta)
                    yield {"type": "delta", "data": {"text": delta}}
        else:
            yield from self._simulate_stream(
                retrieval.get("answer", ""), full_answer_chunks
            )

        final_answer = "".join(full_answer_chunks)

        # 7. 持久化 bot 消息
        bot_message_id = None
        try:
            bot_message_id = add_message(
                session_id=session_id,
                role="bot",
                content=final_answer,
                msg_type="text",
                confidence=retrieval.get("confidence", 0.0),
                knowledge_id=retrieval.get("knowledge_id"),
                service_card=card,
                form_prompt=form_prompt,
            )
        except Exception as e:
            logger.warning("[ChatService] Bot 消息持久化失败：%s", e)

        # 8. 最后一帧：done
        yield {
            "type": "done",
            "data": {
                "message_id": bot_message_id,
                "form_prompt": form_prompt,
                "answer_source": answer_source if not use_llm else "llm_rag",
            },
        }

    @staticmethod
    def _simulate_stream(text: str, accumulator: list, chunk_size: int = 8):
        """LLM 不可用时，把 TF-IDF 完整 answer 切片模拟流式输出"""
        for i in range(0, len(text), chunk_size):
            piece = text[i : i + chunk_size]
            accumulator.append(piece)
            yield {"type": "delta", "data": {"text": piece}}

    def _rag_stream(self, session_id: str, current_text: str, retrieval: dict):
        """构造 messages 并流式调 LLM"""
        sources = retrieval.get("sources") or []
        if sources:
            context_block = "【参考资料】\n" + "\n\n".join(
                f"{i + 1}. 问：{s.get('question', '')}\n   答：{s.get('answer', '')}"
                for i, s in enumerate(sources[:3])
            )
        else:
            context_block = "【参考资料】（无相关知识）"

        history = get_recent_messages(session_id, limit=config.LLM_CHAT_MAX_TURNS * 2)
        # 排除当前用户消息（已入库，是最后一条 user）
        if (
            history
            and history[-1]["role"] == "user"
            and history[-1]["content"] == current_text
        ):
            history = history[:-1]

        budget = config.LLM_CONTEXT_TOKEN_BUDGET
        fixed = (
            llm_service.estimate_tokens(config.LLM_CHAT_SYSTEM_PROMPT)
            + llm_service.estimate_tokens(current_text)
            + llm_service.estimate_tokens(context_block)
            + config.LLM_CHAT_OUTPUT_RESERVE
        )
        history_budget = max(budget - fixed, 0)

        selected = []
        used = 0
        for msg in reversed(history):
            cost = llm_service.estimate_tokens(msg["content"])
            if used + cost > history_budget:
                break
            selected.append(msg)
            used += cost
        selected.reverse()

        messages = [{"role": "system", "content": config.LLM_CHAT_SYSTEM_PROMPT}]
        for m in selected:
            role = "assistant" if m["role"] == "bot" else "user"
            messages.append({"role": role, "content": m["content"]})
        messages.append(
            {
                "role": "user",
                "content": f"{context_block}\n\n【用户问题】\n{current_text}",
            }
        )

        yield from llm_service.chat_completion_stream(
            messages, max_tokens=config.LLM_CHAT_OUTPUT_RESERVE
        )

    def _compute_form_prompt(self, text: str, card: dict) -> dict | None:
        """从 _maybe_attach_form 抽出，返回 form_prompt 字典或 None"""
        try:
            intent = llm_service.classify_intent(text, card.get("title"))
        except Exception as exc:
            logger.warning("[ChatService] 意图识别异常 err=%s", exc)
            return None
        if intent.get("intent") != "submission":
            return None
        if float(intent.get("confidence", 0)) < config.LLM_INTENT_THRESHOLD:
            return None
        schema = service_catalog_service.get_form_schema(card["slug"])
        if schema is None:
            return None
        return {
            "service_slug": card["slug"],
            "service_title": card["title"],
            "form_schema": schema,
            "intent_source": intent.get("source", "unknown"),
            "intent_confidence": intent.get("confidence", 0.0),
        }

    @staticmethod
    def _llm_chat_active() -> bool:
        """LLM 对话总开关"""
        if not config.LLM_CHAT_ENABLED:
            return False
        from services.admin_settings import admin_settings

        if not admin_settings.get_bool("llm_chat_enabled", default=True):
            return False
        return llm_service.is_enabled()

    def new_session(
        self, user_agent: str = "", ip: str = "", user_id: int | None = None
    ) -> str:
        return create_session(user_agent=user_agent, ip_address=ip, user_id=user_id)


# 全局单例
chat_service = ChatService()
