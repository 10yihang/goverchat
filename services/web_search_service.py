from __future__ import annotations

"""
联网搜索服务。

默认面向 SearXNG Search API：
  GET {endpoint}?q=...&format=json
"""
import json
import logging
import re
from html import unescape
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import config

logger = logging.getLogger(__name__)

_SPACE_RE = re.compile(r"\s+")
_TAG_RE = re.compile(r"<[^>]+>")


class WebSearchService:
    """基于搜索 API 的轻量网页检索服务。"""

    def is_enabled(self) -> bool:
        return config.WEB_SEARCH_ENABLED and bool(config.WEB_SEARCH_ENDPOINT)

    def search(self, query: str, limit: int | None = None) -> list[dict]:
        """返回标准化后的搜索结果列表。"""
        if not self.is_enabled():
            return []

        if limit is None:
            limit = config.WEB_SEARCH_TOP_K

        provider = config.WEB_SEARCH_PROVIDER.lower().strip()
        if provider != "searxng":
            logger.warning("[WebSearch] 未支持的 provider：%s", provider)
            return []

        try:
            return self._search_searxng(query, limit)
        except Exception as exc:
            logger.warning("[WebSearch] 搜索失败：%s", exc)
            return []

    def answer(self, query: str) -> dict | None:
        """执行联网搜索并生成统一答案结构。"""
        sources = self.search(query)
        if not sources:
            return None

        answer = self._compose_answer(query, sources)
        return {
            "answer": answer,
            "confidence": 0.0,
            "knowledge_id": None,
            "sources": sources,
            "answer_source": "web",
        }

    def _search_searxng(self, query: str, limit: int) -> list[dict]:
        actual_query = self._build_query(query)
        params = {
            "q": actual_query,
            "format": "json",
            "language": config.WEB_SEARCH_LANGUAGE,
            "safesearch": config.WEB_SEARCH_SAFESEARCH,
        }
        endpoint = config.WEB_SEARCH_ENDPOINT.rstrip("?")
        url = f"{endpoint}?{urlencode(params)}"
        request = Request(url, headers={"User-Agent": config.WEB_SEARCH_USER_AGENT})

        with urlopen(request, timeout=config.WEB_SEARCH_TIMEOUT) as response:
            payload = json.loads(response.read().decode("utf-8", errors="ignore"))

        raw_results = payload.get("results") or []
        normalized = []
        seen_urls = set()
        for item in raw_results:
            url_value = (item.get("url") or "").strip()
            if not url_value or url_value in seen_urls:
                continue
            seen_urls.add(url_value)

            title = self._clean_text(item.get("title") or "网页结果")
            snippet = self._trim_snippet(
                self._clean_text(item.get("content") or item.get("snippet") or "")
            )
            domain = urlparse(url_value).netloc
            normalized.append({
                "type": "web",
                "title": title,
                "question": title,
                "answer": snippet,
                "snippet": snippet,
                "url": url_value,
                "domain": domain,
                "category": self._category(domain),
                "score": float(item.get("score") or 0.0),
                "is_official": self._is_preferred_domain(domain),
            })

        reranked = sorted(
            normalized,
            key=lambda item: (
                0 if item["is_official"] else 1,
                -float(item.get("score") or 0.0),
                len(item.get("snippet") or ""),
            )
        )

        if config.WEB_SEARCH_OFFICIAL_ONLY:
            reranked = [item for item in reranked if item["is_official"]]

        return reranked[:limit]

    def _compose_answer(self, query: str, sources: list[dict]) -> str:
        top_sources = sources[:3]
        fragments = []
        for source in top_sources:
            title = source.get("title") or "网页结果"
            snippet = source.get("snippet") or "该来源未返回摘要。"
            label = "官方来源" if source.get("is_official") else "网页来源"
            fragments.append(f"[{label}] {title}：{snippet}")

        joined = "\n".join(f"{idx + 1}. {fragment}" for idx, fragment in enumerate(fragments))
        return (
            f"我没有在本地知识库中找到足够可靠的答案，已为您补充网页检索结果。\n"
            f"与“{query}”最相关的信息如下：\n{joined}\n"
            f"以上内容来自网页检索结果，请优先以官方网站或最新政策原文为准。"
        )

    @staticmethod
    def _clean_text(text: str) -> str:
        text = unescape(str(text))
        text = _TAG_RE.sub(" ", text)
        text = text.replace("\u2026", "…")
        text = _SPACE_RE.sub(" ", text)
        return text.strip()

    @staticmethod
    def _trim_snippet(text: str) -> str:
        if len(text) <= config.WEB_SEARCH_SNIPPET_MAX_LEN:
            return text
        return text[: config.WEB_SEARCH_SNIPPET_MAX_LEN].rstrip() + "…"

    @staticmethod
    def _build_query(query: str) -> str:
        if not config.WEB_SEARCH_OFFICIAL_ONLY:
            return query

        filters = [f"site:{domain}" for domain in config.WEB_SEARCH_PREFERRED_DOMAINS]
        if not filters:
            return query
        return f"{query} {' OR '.join(filters)}"

    @staticmethod
    def _is_preferred_domain(domain: str) -> bool:
        domain = (domain or "").lower()
        if not domain:
            return False
        for preferred in config.WEB_SEARCH_PREFERRED_DOMAINS:
            if domain == preferred or domain.endswith(f".{preferred}") or preferred in domain:
                return True
        return False

    @classmethod
    def _category(cls, domain: str) -> str:
        if cls._is_preferred_domain(domain):
            return f"官方来源 · {domain}" if domain else "官方来源"
        return f"网页来源 · {domain}" if domain else "网页来源"


web_search_service = WebSearchService()
