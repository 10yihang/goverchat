#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

PORT="${PORT:-5050}"
BASE="http://127.0.0.1:$PORT"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <your-email-for-verification>"
  echo "Example: $0 me@qq.com"
  exit 1
fi
EMAIL="$1"
COOKIES=$(mktemp -t govchat.XXXXXX.cookies)
trap "rm -f $COOKIES" EXIT

echo "==============================================="
echo "  政务智聊 · 真实模式端到端验证"
echo "  Target: $BASE"
echo "  Email:  $EMAIL"
echo "==============================================="
echo ""

step() { printf "\n\033[1;36m[STEP %s] %s\033[0m\n" "$1" "$2"; }
ok() { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗\033[0m %s\n" "$1"; }

step 1 "GET /api/c-auth/me — 检查匿名状态"
RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/c-auth/me")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [[ "$CODE" == "200" ]] && echo "$BODY" | grep -q '"authenticated": false'; then
  ok "匿名状态正常 (HTTP 200, authenticated=false)"
else
  fail "异常: HTTP $CODE, body=$BODY"
  exit 1
fi

step 2 "POST /api/c-auth/send-code — 真实邮件发送"
RESP=$(curl -s -w "\n%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\"}" "$BASE/api/c-auth/send-code")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "  Response: $BODY"
if [[ "$CODE" != "200" ]]; then
  fail "发送失败 HTTP $CODE — 检查 SMTP_HOST/USER/PASSWORD/USE_SSL 是否正确"
  exit 1
fi
if echo "$BODY" | grep -q '"dev_code"'; then
  fail "⚠️  仍返回 dev_code，说明 FLASK_DEBUG=true 或 SMTP 没配置"
  echo "    → 编辑 .env 设 FLASK_DEBUG=false 并填 SMTP_*，然后重启"
  exit 1
fi
ok "邮件已发送，请打开 $EMAIL 邮箱查看（subject 含「您的登录验证码」）"

echo ""
read -p "  请输入你收到的 6 位验证码: " CODE_INPUT
if [[ ! "$CODE_INPUT" =~ ^[0-9]{6}$ ]]; then
  fail "格式错: 必须是 6 位数字"
  exit 1
fi

step 3 "POST /api/c-auth/verify-code — 验证登录"
RESP=$(curl -s -c "$COOKIES" -w "\n%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE_INPUT\"}" "$BASE/api/c-auth/verify-code")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [[ "$CODE" == "200" ]] && echo "$BODY" | grep -q '"ok": true'; then
  ok "登录成功"
  echo "  $BODY" | python3 -m json.tool 2>/dev/null | sed 's/^/    /'
else
  fail "验证失败 HTTP $CODE: $BODY"
  exit 1
fi

step 4 "GET /api/c-auth/me — 用 cookie 查身份"
RESP=$(curl -s -b "$COOKIES" "$BASE/api/c-auth/me")
echo "  $RESP" | python3 -m json.tool 2>/dev/null | sed 's/^/    /'
if echo "$RESP" | grep -q '"authenticated": true'; then
  ok "Session cookie 有效"
else
  fail "session 无效"; exit 1
fi

step 5 "POST /api/chat/send — 测试 LLM 意图识别（关键）"
RESP=$(curl -s -b "$COOKIES" -X POST -H 'Content-Type: application/json' \
  -d '{"text":"我想办理驾驶证期满换证"}' "$BASE/api/chat/send")
echo "  --- intent_meta ---"
echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('  answer (前 60 字):', data['answer'][:60])
print('  service_card.has_form:', data.get('service_card', {}).get('has_form'))
intent = data.get('intent_meta', {})
print('  intent:    ', intent.get('intent'))
print('  confidence:', intent.get('confidence'))
print('  source:    ', intent.get('source'))
print('  reason:    ', intent.get('reason'))
print('  form_prompt 已附加:', bool(data.get('form_prompt')))
" 2>/dev/null

INTENT_SOURCE=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('intent_meta',{}).get('source','?'))")
case "$INTENT_SOURCE" in
  llm)     ok "★ LLM 真实调用成功！(source=llm)" ;;
  keyword) fail "降级到关键字 — 请检查 LLM_API_BASE / LLM_API_KEY / LLM_MODEL 是否正确，或查看 Flask 日志 [LLM] 标签" ;;
  *)       fail "意图分类返回异常 source=$INTENT_SOURCE" ;;
esac

step 6 "POST /api/applications — 提交一个真实申请（触发提交确认邮件）"
RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIES" -X POST -H 'Content-Type: application/json' \
  -d "{
    \"service_slug\": \"driver-license-renewal\",
    \"form_data\": {
      \"name\": \"测试用户\",
      \"id_number\": \"320101199001011234\",
      \"phone\": \"15812345678\",
      \"license_no\": \"320101199001011234\",
      \"expire_date\": \"2026-06-30\",
      \"physical_check_date\": \"2026-04-20\",
      \"delivery_method\": \"邮寄送达\",
      \"delivery_address\": \"江苏省南京市玄武区中山路 1 号\"
    }
  }" "$BASE/api/applications")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  QUERY_NO=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['application']['query_no'])")
  ok "申请已提交，受理编号: $QUERY_NO"
  ok "请检查 $EMAIL 是否收到「申请已提交」确认邮件"
else
  fail "提交失败 HTTP $CODE: $BODY"
fi

echo ""
echo "==============================================="
echo "  全部步骤完成"
echo "==============================================="
echo ""
echo "下一步浏览器测试："
echo "  打开 $BASE/login → 用 $EMAIL 登录 → /chat 发「我要办驾驶证换证」"
echo "  → 应自动展开表单（LLM 识别）→ 填表提交 → 收到第 3 封邮件"
echo "  → /admin/login 用 admin/admin123 → 「办理申请」Tab → 改你刚提交的状态"
echo "  → 收到第 4 封邮件"
