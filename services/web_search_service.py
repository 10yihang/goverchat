from __future__ import annotations

"""
联网搜索服务。

支持 Exa Search API（默认）和 SearXNG（可选）。
  Exa:   POST https://api.exa.ai/search  (需要 EXA_API_KEY)
  SearX: GET  {endpoint}?q=...&format=json
"""
import json
import logging
import re
from html import unescape
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import config
import requests as http_requests

logger = logging.getLogger(__name__)

_SPACE_RE = re.compile(r"\s+")
_TAG_RE = re.compile(r"<[^>]+>")


class WebSearchService:
    """联网检索服务。优先 Exa，回退 SearXNG。"""

    def is_enabled(self) -> bool:
        if not config.WEB_SEARCH_ENABLED:
            return False
        provider = config.WEB_SEARCH_PROVIDER.lower().strip()
        if provider == "exa":
            return bool(config.EXA_API_KEY)
        if provider == "searxng":
            return bool(config.WEB_SEARCH_ENDPOINT)
        return False

    def search(self, query: str, limit: int | None = None) -> list[dict]:
        """返回标准化后的搜索结果列表。"""
        if not self.is_enabled():
            return []

        if limit is None:
            limit = config.WEB_SEARCH_TOP_K

        provider = config.WEB_SEARCH_PROVIDER.lower().strip()

        try:
            if provider == "exa":
                return self._search_exa(query, limit)
            if provider == "searxng":
                return self._search_searxng(query, limit)
            logger.warning("[WebSearch] 未支持的 provider：%s", provider)
            return []
        except Exception as exc:
            logger.warning("[WebSearch] 搜索失败 provider=%s err=%s", provider, exc)
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

    # ── Exa Search ─────────────────────────────────────────────────

    def _search_exa(self, query: str, limit: int) -> list[dict]:
        """通过 Exa API 搜索。"""
        payload = {
            "query": query,
            "numResults": min(limit, 10),
            "type": "neural",
            "contents": {"text": {"maxCharacters": 300}},
        }
        resp = http_requests.post(
            "https://api.exa.ai/search",
            json=payload,
            headers={"x-api-key": config.EXA_API_KEY},
            timeout=config.WEB_SEARCH_TIMEOUT,
        )
        resp.raise_for_status()
        payload_data = resp.json()

        raw_results = payload_data.get("results") or []
        normalized = []
        for item in raw_results:
            url_value = (item.get("url") or "").strip()
            if not url_value:
                continue

            title = self._clean_text(item.get("title") or "网页结果")
            snippet = self._trim_snippet(
                self._clean_text(item.get("text") or "")
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
                "score": float(item.get("score") or 0.8),
                "is_official": self._is_preferred_domain(domain),
                "published_date": item.get("publishedDate", ""),
            })

        # gov.cn 域名优先
        reranked = sorted(
            normalized,
            key=lambda item: (
                0 if item["is_official"] else 1,
                -float(item.get("score") or 0.0),
            )
        )
        return reranked[:limit]

    # ── SearXNG（保留兼容）─────────────────────────────────────────

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

    # ── 公共 ───────────────────────────────────────────────────────

    def _compose_answer(self, query: str, sources: list[dict]) -> str:
        top_sources = sources[:3]
        fragments = []
        for source in top_sources:
            title = source.get("title") or "网页结果"
            snippet = source.get("snippet") or "该来源未返回摘要。"
            label = "官方来源" if source.get("is_official") else "网页来源"
            date_str = f" ({source.get('published_date','')})" if source.get("published_date") else ""
            fragments.append(f"[{label}{date_str}] {title}\n{snippet}")

        joined = "\n\n".join(f"{idx + 1}. {fragment}" for idx, fragment in enumerate(fragments))
        return (
            f"以下是与「{query}」相关的网页搜索结果：\n\n{joined}\n\n"
            f"以上内容来自 Exa 联网检索，请以官方网站最新信息为准。"
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
