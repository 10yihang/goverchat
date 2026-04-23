"""
Global configuration for the government chat prototype.

All values can be overridden by environment variables.
"""

import os


# ---------------------------------------------------------------------------
# MySQL
# ---------------------------------------------------------------------------
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_NAME = os.environ.get("DB_NAME", "gov")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "Gr040103")
DB_CHARSET = "utf8mb4"

DB_POOL_MIN_CACHED = 2
DB_POOL_MAX_CACHED = 5
DB_POOL_MAX_CONNECTIONS = 20


# ---------------------------------------------------------------------------
# Whisper ASR
# ---------------------------------------------------------------------------
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_LANG = "zh"
WHISPER_FP16 = False


# ---------------------------------------------------------------------------
# TF-IDF retrieval
# ---------------------------------------------------------------------------
TFIDF_THRESHOLD = float(os.environ.get("TFIDF_THRESHOLD", 0.15))
TFIDF_TOP_K = 3

FALLBACK_ANSWER = (
    "抱歉，我暂时没有找到与您问题直接相关的答案。"
    "建议您换一种更具体的问法，或拨打 12345 政务服务热线进一步咨询。"
)


# ---------------------------------------------------------------------------
# Web search fallback
# ---------------------------------------------------------------------------
WEB_SEARCH_ENABLED = os.environ.get("WEB_SEARCH_ENABLED", "false").lower() == "true"
WEB_SEARCH_PROVIDER = os.environ.get("WEB_SEARCH_PROVIDER", "searxng")
WEB_SEARCH_ENDPOINT = os.environ.get("WEB_SEARCH_ENDPOINT", "").strip()
WEB_SEARCH_TIMEOUT = float(os.environ.get("WEB_SEARCH_TIMEOUT", 8))
WEB_SEARCH_TOP_K = int(os.environ.get("WEB_SEARCH_TOP_K", 5))
WEB_SEARCH_TRIGGER_THRESHOLD = float(
    os.environ.get("WEB_SEARCH_TRIGGER_THRESHOLD", 0.35)
)
WEB_SEARCH_LANGUAGE = os.environ.get("WEB_SEARCH_LANGUAGE", "zh-CN")
WEB_SEARCH_SAFESEARCH = int(os.environ.get("WEB_SEARCH_SAFESEARCH", 1))
WEB_SEARCH_PREFERRED_DOMAINS = tuple(
    item.strip().lower()
    for item in os.environ.get(
        "WEB_SEARCH_PREFERRED_DOMAINS",
        "gov.cn,www.gov.cn",
    ).split(",")
    if item.strip()
)
WEB_SEARCH_OFFICIAL_ONLY = (
    os.environ.get("WEB_SEARCH_OFFICIAL_ONLY", "false").lower() == "true"
)
WEB_SEARCH_SNIPPET_MAX_LEN = int(os.environ.get("WEB_SEARCH_SNIPPET_MAX_LEN", 160))
WEB_SEARCH_USER_AGENT = os.environ.get(
    "WEB_SEARCH_USER_AGENT",
    "gov-chat-bot/1.0 (+local searxng fallback)",
)


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
VOICE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, "voice")
IMAGE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, "images")

ALLOWED_AUDIO_EXTENSIONS = {"wav", "mp3", "m4a", "ogg", "webm", "flac"}
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"}


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------
OCR_ENABLED = os.environ.get("OCR_ENABLED", "true").lower() == "true"
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "").strip()
OCR_LANG = os.environ.get("OCR_LANG", "chi_sim+eng").strip() or "chi_sim+eng"
OCR_TIMEOUT = int(os.environ.get("OCR_TIMEOUT", 25))
OCR_PSM = int(os.environ.get("OCR_PSM", 6))
OCR_MIN_TEXT_LENGTH = int(os.environ.get("OCR_MIN_TEXT_LENGTH", 2))


# ---------------------------------------------------------------------------
# Flask
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "gov-chat-secret-2026")
DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
SESSION_LIFETIME_HOURS = int(os.environ.get("SESSION_LIFETIME_HOURS", 24))
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]


# ---------------------------------------------------------------------------
# LLM intent classification (OpenAI-compatible API)
# ---------------------------------------------------------------------------
LLM_API_BASE = os.environ.get("LLM_API_BASE", "").strip()
LLM_API_KEY = os.environ.get("LLM_API_KEY", "").strip()
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini").strip()
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", 8))
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", 0))
LLM_INTENT_ENABLED = os.environ.get("LLM_INTENT_ENABLED", "true").lower() == "true"
LLM_INTENT_THRESHOLD = float(os.environ.get("LLM_INTENT_THRESHOLD", 0.6))


# ---------------------------------------------------------------------------
# SMTP / outbound email
# ---------------------------------------------------------------------------
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "true").lower() == "true"
SMTP_USE_STARTTLS = os.environ.get("SMTP_USE_STARTTLS", "false").lower() == "true"
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip() or SMTP_USER
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "政务智聊").strip()
SMTP_TIMEOUT = float(os.environ.get("SMTP_TIMEOUT", 15))


# ---------------------------------------------------------------------------
# C-end user (email login) settings
# ---------------------------------------------------------------------------
EMAIL_CODE_TTL_SEC = int(os.environ.get("EMAIL_CODE_TTL_SEC", 300))
EMAIL_CODE_RESEND_COOLDOWN = int(os.environ.get("EMAIL_CODE_RESEND_COOLDOWN", 60))
EMAIL_CODE_MAX_ATTEMPTS = int(os.environ.get("EMAIL_CODE_MAX_ATTEMPTS", 5))
EMAIL_CODE_LENGTH = 6
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5173").strip()


# ---------------------------------------------------------------------------
# In-chat form submission
# ---------------------------------------------------------------------------
FORM_SUBMISSION_ENABLED = (
    os.environ.get("FORM_SUBMISSION_ENABLED", "true").lower() == "true"
)
FORM_SUBMISSION_KEYWORD_FALLBACK = (
    "申请",
    "办理",
    "提交",
    "我要办",
    "我想办",
    "要办",
    "想办",
    "帮我办",
    "在哪办",
    "怎么申请",
    "如何申请",
    "立即办理",
    "马上办",
    "现在办",
)
