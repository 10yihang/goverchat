#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [[ ! -f .env ]]; then
  echo "[ERR] .env not found — copy .env.example first"
  exit 1
fi

set -a
source .env
set +a

if [[ -z "${LLM_API_KEY:-}" || "${LLM_API_KEY}" == "sk-replace-with-your-key" ]]; then
  echo "[WARN] LLM_API_KEY 仍是占位值，意图识别会降级到关键字"
fi

if [[ -z "${SMTP_PASSWORD:-}" || "${SMTP_PASSWORD}" == "your_authorization_code" ]]; then
  echo "[WARN] SMTP_PASSWORD 仍是占位值，邮件无法实际发送"
fi

PORT="${PORT:-5050}"
SERVE_SPA="${SERVE_SPA:-true}"

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "[INFO] Port $PORT in use, killing existing process..."
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if [[ ! -f static/dist/index.html ]]; then
  echo "[INFO] static/dist 不存在，先构建前端..."
  (cd frontend && npm run build)
fi

echo "[INFO] LLM_API_BASE=$LLM_API_BASE  LLM_MODEL=$LLM_MODEL"
echo "[INFO] SMTP_HOST=$SMTP_HOST  SMTP_USER=$SMTP_USER"
echo "[INFO] DEBUG=$FLASK_DEBUG  SERVE_SPA=$SERVE_SPA  PORT=$PORT"
echo "[INFO] Open: http://127.0.0.1:$PORT"
echo ""

PORT="$PORT" SERVE_SPA="$SERVE_SPA" .venv/bin/python app.py
