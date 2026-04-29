from __future__ import annotations

"""
问答编排服务（整合 TF-IDF 检索 + 消息持久化）
"""
import json
import logging
import re
import time
from datetime import datetime, date

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

_EXPIRY_WARN_DAYS = 90


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
        is_new = False
        if session_id and session_exists(session_id):
            if user_id is None:
                return session_id
            owner = get_session_owner(session_id)
            if owner is None:
                claim_session(session_id, user_id)
                actual_owner = get_session_owner(session_id)
                if actual_owner == user_id:
                    return session_id
                is_new = True
            elif owner == user_id:
                return session_id
            else:
                is_new = True
        else:
            is_new = True

        sid = create_session(user_agent=user_agent, ip_address=ip, user_id=user_id)
        if is_new and user_id:
            self._maybe_push_expiry_reminder(sid, user_id)
        return sid

    def _maybe_push_expiry_reminder(self, session_id: str, user_id: int) -> None:
        try:
            from models.db import execute

            rows = execute(
                """
                SELECT service_slug, service_title, form_data
                FROM service_application
                WHERE user_id = %s AND status IN ('已提交', '审核中', '材料待补充')
                ORDER BY id DESC LIMIT 20
                """,
                (user_id,),
                fetchall=True,
            ) or []
        except Exception as exc:
            logger.warning("[ChatService] 到期提醒查询失败 err=%s", exc)
            return

        today = date.today()
        reminders: list[str] = []

        for row in rows:
            form = row.get("form_data")
            if isinstance(form, str):
                try:
                    form = json.loads(form)
                except (json.JSONDecodeError, TypeError):
                    continue
            if not isinstance(form, dict):
                continue

            expire_str = form.get("expire_date")
            if not expire_str:
                continue

            try:
                expire_date = datetime.strptime(str(expire_str), "%Y-%m-%d").date()
            except ValueError:
                continue

            days_left = (expire_date - today).days
            if 0 < days_left <= _EXPIRY_WARN_DAYS:
                reminders.append(
                    f"⚠️ 您的「{row['service_title']}」将于 {expire_str} 到期"
                    f"（距今 {days_left} 天），建议尽快办理。"
                )

        if reminders:
            greeting = "👋 您好！检测到以下事项即将到期：\n\n" + "\n".join(reminders)
            try:
                add_message(
                    session_id=session_id,
                    role="bot",
                    content=greeting,
                    msg_type="text",
                )
                logger.info(
                    "[ChatService] 已推送到期提醒 session=%s user_id=%s count=%d",
                    session_id, user_id, len(reminders),
                )
            except Exception as exc:
                logger.warning("[ChatService] 到期提醒写入失败 err=%s", exc)

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

        web_search_triggered = False
        if self._should_fallback_to_web(result):
            web_search_triggered = True
            web_result = web_search_service.answer(text)
            if web_result:
                result = web_result

        card = service_catalog_service.recommend_card(text)
        result["service_card"] = card

        if config.FORM_SUBMISSION_ENABLED and card and card.get("has_form"):
            self._maybe_attach_form(result, text, card)

        self._maybe_attach_action_card(result, text)

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

        # 2.5 智能追问建议
        follow_up_questions: list[str] = []
        try:
            follow_up_questions = tfidf_service.suggest_followups(text, top_k=3)
        except Exception as e:
            logger.warning("[ChatService] 追问建议生成失败：%s", e)

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
        result["follow_up_questions"] = follow_up_questions
        result["web_search_triggered"] = web_search_triggered
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

        prefill = self._extract_prefill(text)
        result["form_prompt"] = {
            "service_slug": card["slug"],
            "service_title": card["title"],
            "form_schema": schema,
            "intent_source": intent.get("source", "unknown"),
            "intent_confidence": intent.get("confidence", 0.0),
            "prefill": prefill if prefill else None,
        }
        logger.info(
            "[ChatService] 已附加表单 slug=%s source=%s confidence=%.2f",
            card["slug"],
            intent.get("source"),
            intent.get("confidence", 0.0),
        )

    @staticmethod
    def _maybe_attach_action_card(result: dict, _text: str) -> None:
        answer = result.get("answer", "")
        if not answer or answer == config.FALLBACK_ANSWER:
            result["action_card"] = {
                "title": "没有找到相关答案",
                "description": "您可以尝试以下方式获取帮助：",
                "actions": [
                    {
                        "label": "📞 拨打 12345 政务服务热线",
                        "type": "tel",
                        "value": "12345",
                    },
                    {
                        "label": "📋 给工作人员留言",
                        "type": "leave_message",
                        "value": "",
                    },
                    {
                        "label": "📍 查找附近政务大厅",
                        "type": "navigate",
                        "value": "/halls",
                    },
                ],
            }

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

        # 3. Web 兜底（始终尝试，不依赖 LLM 开关）
        use_llm = self._llm_chat_active()
        web_search_triggered = False
        if self._should_fallback_to_web(retrieval):
            web_search_triggered = True
            yield {"type": "delta", "data": {"text": "🔍 知识库未收录该问题，正在联网搜索，请稍候…\n\n"}}
            web_result = web_search_service.answer(text)
            if web_result:
                retrieval = web_result
                answer_source = "web"
                yield {"type": "delta", "data": {"text": "✅ 已为您找到以下相关信息：\n\n"}}
            else:
                yield {"type": "delta", "data": {"text": "⚠️ 联网搜索暂不可用，以下为本地兜底回复：\n\n"}}

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
        if answer_source == "web":
            # 联网搜索成功，用 LLM 总结搜索结果
            yield from self._web_summary_stream(text, retrieval, full_answer_chunks)
        elif use_llm:
            gen = self._rag_stream(session_id, text, retrieval)
            first = next(gen, None)
            if first is None:
                # LLM 调用失败 → 尝试 web 兜底
                if self._should_fallback_to_web(retrieval):
                    web_result = web_search_service.answer(text)
                    if web_result:
                        retrieval = web_result
                        answer_source = web_result.get("answer_source", "web")
                yield from self._simulate_stream(
                    retrieval.get("answer", ""), full_answer_chunks
                )
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
        follow_up_questions: list[str] = []
        try:
            follow_up_questions = tfidf_service.suggest_followups(text, top_k=3)
        except Exception as e:
            logger.warning("[ChatService] 追问建议生成失败：%s", e)

        action_card = None
        final_answer = retrieval.get("answer", "")
        if not final_answer or final_answer == config.FALLBACK_ANSWER:
            action_card = {
                "title": "没有找到相关答案",
                "description": "您可以尝试以下方式获取帮助：",
                "actions": [
                    {"label": "📞 拨打 12345 政务服务热线", "type": "tel", "value": "12345"},
                    {"label": "📋 给工作人员留言", "type": "leave_message", "value": ""},
                    {"label": "📍 查找附近政务大厅", "type": "navigate", "value": "/halls"},
                ],
            }

        yield {
            "type": "done",
            "data": {
                "message_id": bot_message_id,
                "form_prompt": form_prompt,
                "answer_source": answer_source if not use_llm else "llm_rag",
                "follow_up_questions": follow_up_questions,
                "action_card": action_card,
            },
        }

    @staticmethod
    def _simulate_stream(text: str, accumulator: list, chunk_size: int = 8):
        """LLM 不可用时，把 TF-IDF 完整 answer 切片模拟流式输出。
        加入 time.sleep 让每个 chunk 在独立的 TCP 帧发送，前端才能逐帧渲染。"""
        total = len(text)
        for i in range(0, total, chunk_size):
            piece = text[i : i + chunk_size]
            accumulator.append(piece)
            yield {"type": "delta", "data": {"text": piece}}
            # 仅当还有后续 chunk 时等待，让前端能逐条渲染
            if i + chunk_size < total:
                time.sleep(0.04)

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

    def _web_summary_stream(self, query: str, retrieval: dict, accumulator: list):
        """将 Exa 搜索结果交给 LLM 总结，流式输出。LLM 不可用时回退到原始片段。"""
        if not llm_service.is_enabled():
            yield from self._simulate_stream(retrieval.get("answer", ""), accumulator)
            return

        sources = retrieval.get("sources") or []
        if not sources:
            yield {"type": "delta", "data": {"text": "未找到相关搜索结果。"}}
            return

        snippets = "\n\n".join(
            f"来源 {i+1}: {s.get('title','')}\n{s.get('snippet','')[:500]}"
            for i, s in enumerate(sources[:5])
        )

        system_prompt = (
            "你是政务智聊的AI助手。用户的问题在本地知识库中没有找到答案，"
            "系统通过 Exa 搜索引擎找到了以下网页结果。"
            "请根据这些结果，用简洁专业的中文回答用户的问题。"
            "引用信息时注明来源网站。如果搜索结果不相关或不足以回答问题，请如实告知用户。"
            "回答控制在 300 字以内。"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"用户问题：{query}\n\n搜索结果：\n{snippets}"},
        ]

        try:
            gen = llm_service.chat_completion_stream(messages, max_tokens=400)
            for delta in gen:
                if delta is None:
                    break
                accumulator.append(delta)
                yield {"type": "delta", "data": {"text": delta}}
        except Exception as exc:
            logger.warning("[ChatService] Web summary LLM 失败 err=%s", exc)
            yield from self._simulate_stream(retrieval.get("answer", ""), accumulator)

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
        prefill = self._extract_prefill(text)
        return {
            "service_slug": card["slug"],
            "service_title": card["title"],
            "form_schema": schema,
            "intent_source": intent.get("source", "unknown"),
            "intent_confidence": intent.get("confidence", 0.0),
            "prefill": prefill if prefill else None,
        }

    @staticmethod
    def _extract_prefill(text: str) -> dict[str, str]:
        """从用户输入中提取可预填的身份信息（姓名、手机号、身份证号）"""
        prefill: dict[str, str] = {}

        phone_match = re.search(r"1[3-9]\d{9}", text)
        if phone_match:
            prefill["phone"] = phone_match.group(0)

        id_match = re.search(r"\d{17}[\dXx]", text)
        if id_match:
            prefill["id_number"] = id_match.group(0)

        name_patterns = [
            r"(?:我是|我叫|姓名[：:]\s*)([\u4e00-\u9fa5]{2,4})",
            r"(?:name[：:]\s*)([A-Za-z\s]{2,20})",
            r"(?:申请人[：:]\s*)([\u4e00-\u9fa5]{2,4})",
        ]
        for pat in name_patterns:
            m = re.search(pat, text)
            if m:
                prefill["name"] = m.group(1).strip()
                break

        return prefill

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
