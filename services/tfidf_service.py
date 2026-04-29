from __future__ import annotations

"""
TF-IDF 检索服务（线程安全单例）
"""
import threading
import logging
import time
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import config
from utils.tokenizer import tokenize_to_str

logger = logging.getLogger(__name__)


class TFIDFService:
    """
    线程安全的 TF-IDF 单例服务。
    矩阵生命周期：
      load()  →  矩阵就绪
      reload() →  子线程热更新，原子替换矩阵，不阻塞主线程
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._matrix_lock = threading.RLock()
        self._vectorizer: TfidfVectorizer | None = None
        self._matrix = None  # scipy sparse matrix
        self._records: list[dict] = []  # 对应每行的知识条目
        self._ready = False
        self._last_reload_at: float | None = None
        self._initialized = True

    # ── 内部加载逻辑 ──────────────────────────────────────────────

    def _do_load(self) -> None:
        """从数据库读取知识条目并构建 TF-IDF 矩阵"""
        from models.db import get_pool_connection  # 延迟导入避免循环

        t0 = time.perf_counter()
        conn = get_pool_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, question, answer, category, keywords "
                    "FROM kb_knowledge WHERE is_active = 1 "
                    "ORDER BY weight DESC, id ASC"
                )
                records = list(cur.fetchall())
        finally:
            conn.close()
        if not records:
            logger.warning("[TF-IDF] 知识库为空，无法构建矩阵")
            return

        # 分词：question 与 keywords 拼接，提升召回
        corpus = []
        for r in records:
            text = (r.get("question") or "") + " " + (r.get("keywords") or "")
            corpus.append(tokenize_to_str(text))

        vectorizer = TfidfVectorizer(
            token_pattern=r"(?u)\b\w+\b",
            min_df=1,
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform(corpus)

        elapsed = time.perf_counter() - t0
        logger.info(
            "[TF-IDF] 矩阵构建完成：%d 条文档，%d 维特征，耗时 %.3f s",
            len(records),
            matrix.shape[1],
            elapsed,
        )

        with self._matrix_lock:
            self._vectorizer = vectorizer
            self._matrix = matrix
            self._records = records
            self._ready = True
            self._last_reload_at = time.time()

    # ── 公开接口 ──────────────────────────────────────────────────

    def load(self) -> None:
        """同步加载（应用启动时调用）"""
        self._do_load()

    def reload(self) -> None:
        """在子线程中热更新矩阵，不阻塞主线程"""
        t = threading.Thread(target=self._do_load, daemon=True, name="tfidf-reload")
        t.start()
        logger.info("[TF-IDF] 热更新子线程已启动")

    def is_ready(self) -> bool:
        return self._ready

    @property
    def last_reload_at(self) -> float | None:
        return self._last_reload_at

    def search(self, query: str, top_k: int = None) -> dict:
        """
        对用户输入计算 cosine_similarity，返回最相似的知识条目。

        Returns:
            {
                "answer": str,
                "confidence": float,   # 0~1，兜底时为 0
                "knowledge_id": int | None,
                "sources": list[dict]  # Top-K 原始结果（含得分）
            }
        """
        if top_k is None:
            top_k = config.TFIDF_TOP_K

        with self._matrix_lock:
            if not self._ready or self._vectorizer is None:
                return {
                    "answer": config.FALLBACK_ANSWER,
                    "confidence": 0.0,
                    "knowledge_id": None,
                    "sources": [],
                }

            query_vec = self._vectorizer.transform([tokenize_to_str(query)])
            sims = cosine_similarity(query_vec, self._matrix).flatten()

        # 取 Top-K 索引
        top_indices = sims.argsort()[::-1][:top_k]
        sources = []
        for idx in top_indices:
            r = self._records[idx]
            sources.append(
                {
                    "id": r["id"],
                    "question": r["question"],
                    "answer": r["answer"],
                    "category": r.get("category", ""),
                    "score": float(sims[idx]),
                }
            )

        best = sources[0] if sources else None
        if best is None or best["score"] < config.TFIDF_THRESHOLD:
            return {
                "answer": config.FALLBACK_ANSWER,
                "confidence": 0.0,
                "knowledge_id": None,
                "sources": sources,
            }

        return {
            "answer": best["answer"],
            "confidence": round(best["score"], 4),
            "knowledge_id": best["id"],
            "sources": sources,
        }

    def suggest_followups(self, query: str, top_k: int = 4) -> list[str]:
        """根据用户问题返回相关追问建议（Top-K 相似问题的 question 文本，排除最佳匹配）"""
        if top_k <= 0:
            return []

        with self._matrix_lock:
            if not self._ready or self._vectorizer is None or not self._records:
                return []

            query_vec = self._vectorizer.transform([tokenize_to_str(query)])
            sims = cosine_similarity(query_vec, self._matrix).flatten()

        seen: set[str] = set()
        suggestions: list[str] = []
        for idx in sims.argsort()[::-1]:
            q = (self._records[idx].get("question") or "").strip()
            if not q or q in seen:
                continue
            seen.add(q)
            suggestions.append(q)
            if len(suggestions) >= top_k:
                break
        return suggestions


# 全局单例
tfidf_service = TFIDFService()
