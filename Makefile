# ============================================================
# 政务智聊 · 一键开发 / 部署 Makefile
# 用法： make help
# ============================================================

# Tab 必须是真实 tab；本文件用 tab 缩进（请勿改成空格）

SHELL          := /bin/bash
.SHELLFLAGS    := -eu -o pipefail -c
.DEFAULT_GOAL  := help

# ---- 配置（可被环境变量覆盖：make dev PORT=5060） ----
PROJECT_DIR    := $(shell pwd)
VENV           := .venv
PY             := $(VENV)/bin/python
PIP            := $(VENV)/bin/pip
PORT           ?= 5050
LOG            ?= /tmp/gov-flask.log
ENV_FILE       := .env
ENV_TEMPLATE   := .env.example
DB_NAME        ?= gov

# .env 里有就用 .env 里的，没有就用上面的默认值
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

# 颜色
C_GREEN := \033[1;32m
C_BLUE  := \033[1;34m
C_RED   := \033[1;31m
C_YEL   := \033[1;33m
C_DIM   := \033[2m
C_OFF   := \033[0m

# ============================================================
# 帮助
# ============================================================

.PHONY: help
help: ## 显示所有可用命令
	@printf "$(C_BLUE)政务智聊 · Make 命令$(C_OFF)\n\n"
	@printf "$(C_YEL)安装$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(install|setup|env)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_YEL)开发 / 启动$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(dev|run|start|stop|restart|logs|status|build)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_YEL)数据库$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(db|migrate)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_YEL)测试 / 验证$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(test|verify|smoke|check)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_YEL)清理$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(clean|kill)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_YEL)一键$(C_OFF)\n"
	@grep -hE '^[a-z-]+:.*?## .*$$' Makefile | grep -E '^(all)' | awk 'BEGIN {FS=":.*?## "}; {printf "  $(C_GREEN)%-22s$(C_OFF) %s\n", $$1, $$2}'
	@printf "\n$(C_DIM)当前配置：PORT=$(PORT)  ENV=$(ENV_FILE)$(if $(LLM_API_BASE),  LLM_API_BASE=$(LLM_API_BASE))$(if $(SMTP_HOST),  SMTP_HOST=$(SMTP_HOST))$(C_OFF)\n"
	@printf "$(C_DIM)示例：make all   # 一键全部就绪并启动$(C_OFF)\n\n"

# ============================================================
# 安装 / 环境
# ============================================================

.PHONY: env
env: ## 从 .env.example 创建 .env（已存在则不覆盖）
	@if [ -f $(ENV_FILE) ]; then \
		printf "$(C_YEL)[skip]$(C_OFF) $(ENV_FILE) 已存在；如需重置请先 rm $(ENV_FILE)\n"; \
	else \
		cp $(ENV_TEMPLATE) $(ENV_FILE); \
		printf "$(C_GREEN)[ok]$(C_OFF) 已创建 $(ENV_FILE)\n"; \
		printf "$(C_YEL)请编辑 $(ENV_FILE) 填入 LLM_API_KEY / SMTP_PASSWORD / DB_PASSWORD$(C_OFF)\n"; \
	fi

$(VENV)/bin/python:
	@printf "$(C_BLUE)→ 创建虚拟环境 $(VENV)$(C_OFF)\n"
	@python3 -m venv $(VENV)

.PHONY: install
install: $(VENV)/bin/python ## 安装后端 Python 依赖到 .venv
	@printf "$(C_BLUE)→ 安装 Python 依赖$(C_OFF)\n"
	@$(PIP) install --upgrade pip --quiet
	@$(PIP) install -r requirements.txt
	@printf "$(C_GREEN)[ok]$(C_OFF) 后端依赖就绪\n"

.PHONY: install-frontend
install-frontend: ## 安装前端 npm 依赖（首次或 package.json 变更后）
	@printf "$(C_BLUE)→ 安装前端依赖$(C_OFF)\n"
	@cd frontend && npm install
	@printf "$(C_GREEN)[ok]$(C_OFF) 前端依赖就绪\n"

.PHONY: setup
setup: install install-frontend env ## 一次性完成所有依赖安装 + .env 创建

# ============================================================
# 数据库
# ============================================================

.PHONY: db-init
db-init: ## 全量初始化数据库（首次部署，会建所有 7 张表 + 默认管理员）
	@printf "$(C_BLUE)→ 初始化数据库 $(DB_NAME)（密码：$$DB_PASSWORD）$(C_OFF)\n"
	@mysql -u $${DB_USER:-root} -p$${DB_PASSWORD} -h $${DB_HOST:-localhost} < scripts/init_db.sql
	@printf "$(C_GREEN)[ok]$(C_OFF) 数据库已建好\n"

.PHONY: db-migrate
db-migrate: ## 增量迁移（已有部署追加 c_user / email_code / application 等新表）
	@printf "$(C_BLUE)→ 执行迁移 migrate_add_in_chat_submission.sql$(C_OFF)\n"
	@mysql -u $${DB_USER:-root} -p$${DB_PASSWORD} -h $${DB_HOST:-localhost} $(DB_NAME) < scripts/migrate_add_in_chat_submission.sql
	@printf "$(C_GREEN)[ok]$(C_OFF) 迁移完成\n"

.PHONY: db-migrate-rag
db-migrate-rag: ## 增量迁移（追加 sys_setting / message_feedback 表，RAG 功能所需）
	@printf "$(C_BLUE)→ 执行迁移 migrate_add_rag_tables.sql$(C_OFF)\n"
	@mysql -u $${DB_USER:-root} -p$${DB_PASSWORD} -h $${DB_HOST:-localhost} $(DB_NAME) < scripts/migrate_add_rag_tables.sql
	@printf "$(C_GREEN)[ok]$(C_OFF) RAG 迁移完成（sys_setting + message_feedback）\n"

.PHONY: db-import
db-import: ## 导入知识库 CSV（追加模式，不清空）
	@$(PY) scripts/import_knowledge.py

.PHONY: db-import-fresh
db-import-fresh: ## 导入知识库 CSV（先清空 kb_knowledge）
	@$(PY) scripts/import_knowledge.py --truncate

.PHONY: db-form-schema
db-form-schema: ## 给 7 个 service_items 注入 form_schema 字段（一次性）
	@$(PY) scripts/add_form_schema.py

.PHONY: db-status
db-status: ## 查看数据库当前表与行数
	@mysql -u $${DB_USER:-root} -p$${DB_PASSWORD} -h $${DB_HOST:-localhost} $(DB_NAME) -e "\
		SELECT 'kb_knowledge' AS tbl, COUNT(*) AS row_count FROM kb_knowledge \
		UNION ALL SELECT 'chat_session', COUNT(*) FROM chat_session \
		UNION ALL SELECT 'chat_message', COUNT(*) FROM chat_message \
		UNION ALL SELECT 'sys_user', COUNT(*) FROM sys_user \
		UNION ALL SELECT 'c_user', COUNT(*) FROM c_user \
		UNION ALL SELECT 'email_verification_code', COUNT(*) FROM email_verification_code \
		UNION ALL SELECT 'service_application', COUNT(*) FROM service_application \
		UNION ALL SELECT 'sys_setting', COUNT(*) FROM sys_setting \
		UNION ALL SELECT 'message_feedback', COUNT(*) FROM message_feedback;" 2>&1 \
		| grep -v "Using a password"

# ============================================================
# 前端构建
# ============================================================

.PHONY: build
build: ## 前端生产构建（输出到 static/dist/）
	@printf "$(C_BLUE)→ 前端 production build$(C_OFF)\n"
	@cd frontend && npm run build

.PHONY: typecheck
typecheck: ## 前端 TypeScript 类型检查
	@cd frontend && npx tsc -b

# ============================================================
# 启动 / 停止
# ============================================================

.PHONY: kill
kill: ## 杀掉占用 $(PORT) 的进程
	@PIDS=$$(lsof -ti:$(PORT) 2>/dev/null || true); \
	if [ -n "$$PIDS" ]; then \
		printf "$(C_YEL)[kill]$(C_OFF) 杀掉占用 $(PORT) 的进程：$$PIDS\n"; \
		echo $$PIDS | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
	else \
		printf "$(C_DIM)[skip]$(C_OFF) $(PORT) 端口空闲\n"; \
	fi

.PHONY: dev
dev: kill ## 前台启动 Flask（dev 双进程：终端 A 用此命令，终端 B 用 make dev-frontend）
	@printf "$(C_BLUE)→ Flask dev 启动 :$(PORT)$(C_OFF)\n"
	@printf "$(C_DIM)前端 dev server 请另开终端跑：$(C_GREEN)make dev-frontend$(C_OFF)\n\n"
	@PORT=$(PORT) SERVE_SPA=false $(PY) app.py

.PHONY: dev-frontend
dev-frontend: ## 前台启动 Vite dev server (5173, HMR + proxy 到 Flask)
	@cd frontend && npm run dev

.PHONY: start
start: kill build ## 一键启动（生产 SPA 模式：先构建前端，再单端口起 Flask）
	@printf "$(C_BLUE)→ Flask SPA 启动 :$(PORT)（前台）$(C_OFF)\n"
	@printf "$(C_DIM)Ctrl-C 退出 / 浏览器访问：$(C_GREEN)http://127.0.0.1:$(PORT)$(C_OFF)\n\n"
	@PORT=$(PORT) SERVE_SPA=true $(PY) app.py

.PHONY: start-bg
start-bg: kill build ## 后台启动（日志写 $(LOG)，用 make logs / make stop 管理）
	@printf "$(C_BLUE)→ Flask SPA 后台启动 :$(PORT)（日志：$(LOG)）$(C_OFF)\n"
	@PORT=$(PORT) SERVE_SPA=true nohup $(PY) app.py > $(LOG) 2>&1 & \
		PID=$$!; disown $$PID 2>/dev/null || true; \
		echo $$PID > /tmp/gov-flask.pid; \
		printf "$(C_GREEN)[ok]$(C_OFF) 已后台启动 PID $$PID\n"
	@sleep 5
	@if curl -sf http://127.0.0.1:$(PORT)/api/c-auth/me >/dev/null 2>&1; then \
		printf "$(C_GREEN)[ok]$(C_OFF) 健康检查通过 → http://127.0.0.1:$(PORT)\n"; \
	else \
		printf "$(C_RED)[err]$(C_OFF) 健康检查失败，查看日志：$(C_GREEN)make logs$(C_OFF)\n"; \
		tail -20 $(LOG); \
		exit 1; \
	fi

.PHONY: stop
stop: ## 停止后台 Flask
	@if [ -f /tmp/gov-flask.pid ]; then \
		PID=$$(cat /tmp/gov-flask.pid); \
		kill -9 $$PID 2>/dev/null && printf "$(C_GREEN)[ok]$(C_OFF) 已停止 PID $$PID\n" || printf "$(C_YEL)[skip]$(C_OFF) PID $$PID 已不存在\n"; \
		rm -f /tmp/gov-flask.pid; \
	else \
		$(MAKE) kill; \
	fi

.PHONY: restart
restart: stop start-bg ## 重启后台 Flask

.PHONY: logs
logs: ## 实时查看 Flask 后台日志（Ctrl-C 退出查看，不影响进程）
	@if [ -f $(LOG) ]; then tail -f $(LOG); else printf "$(C_RED)日志文件不存在：$(LOG)$(C_OFF)\n"; fi

.PHONY: status
status: ## 查看 Flask 进程状态
	@PID=$$(lsof -ti:$(PORT) 2>/dev/null | head -1); \
	if [ -n "$$PID" ]; then \
		printf "$(C_GREEN)[running]$(C_OFF) PID $$PID 监听 :$(PORT)\n"; \
		ps -p $$PID -o pid,etime,command | tail -1; \
		printf "\n$(C_DIM)健康检查：$(C_OFF)"; \
		HTTP_INFO=$$(curl -s -w "HTTP %{http_code}  %{time_total}s" -o /dev/null http://127.0.0.1:$(PORT)/api/c-auth/me); \
		printf "%s\n" "$$HTTP_INFO"; \
	else \
		printf "$(C_DIM)[stopped]$(C_OFF) 端口 $(PORT) 没有进程\n"; \
	fi

# ============================================================
# 测试 / 验证
# ============================================================

.PHONY: smoke
smoke: ## 后端冒烟（不连接 DB，只检查 import 与路由注册）
	@printf "$(C_BLUE)→ 后端冒烟测试$(C_OFF)\n"
	@$(PY) -c "import sys, types; \
sys.modules['models.db'] = types.ModuleType('models.db'); \
sys.modules['models.db'].init_pool = lambda: None; \
sys.modules['models.db'].close_db = lambda e=None: None; \
sys.modules['models.db'].execute = lambda *a, **k: None; \
sys.modules['models.db'].get_db = lambda: None; \
sys.modules['models.db'].get_pool_connection = lambda: None; \
import app; \
flask_app = app.create_app(); \
print(f'[ok] Flask app created, {len(list(flask_app.url_map.iter_rules()))} routes registered')" \
		2>&1 | grep -v 'jieba\|UserWarning\|pkg_resources'

.PHONY: verify
verify: ## 真实端到端验证（需 Flask 已启动；交互式）：make verify EMAIL=you@xx.com
	@if [ -z "$$EMAIL" ]; then \
		printf "$(C_RED)[err]$(C_OFF) 用法：make verify EMAIL=你的邮箱\n"; exit 1; \
	fi
	@./scripts/verify_real.sh "$$EMAIL"

.PHONY: check-env
check-env: ## 检查 .env 关键字段是否填了真实值
	@if [ ! -f $(ENV_FILE) ]; then \
		printf "$(C_RED)[err]$(C_OFF) $(ENV_FILE) 不存在，先 make env\n"; exit 1; \
	fi
	@printf "$(C_BLUE)→ 检查 $(ENV_FILE)$(C_OFF)\n"
	@grep -E '^(LLM_API_KEY|SMTP_PASSWORD|DB_PASSWORD|SECRET_KEY)=' $(ENV_FILE) | while IFS='=' read k v; do \
		case "$$v" in \
			"sk-replace-with-your-key"|"your_authorization_code"|"change_me_in_production") \
				printf "  $(C_RED)✗$(C_OFF) %-20s 仍是占位值\n" "$$k" ;; \
			"") \
				printf "  $(C_RED)✗$(C_OFF) %-20s 为空\n" "$$k" ;; \
			*) \
				printf "  $(C_GREEN)✓$(C_OFF) %-20s 已填\n" "$$k" ;; \
		esac \
	done

# ============================================================
# 清理
# ============================================================

.PHONY: clean
clean: ## 清理构建产物（前端 dist + Python 缓存）
	@printf "$(C_BLUE)→ 清理构建产物$(C_OFF)\n"
	@rm -rf static/dist
	@find . -type d -name __pycache__ -not -path "./$(VENV)/*" -not -path "./frontend/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -not -path "./$(VENV)/*" -delete 2>/dev/null || true
	@printf "$(C_GREEN)[ok]$(C_OFF) 清理完成\n"

.PHONY: clean-all
clean-all: clean stop ## 深度清理（含 venv + node_modules + 上传文件 + 后台进程）
	@printf "$(C_YEL)→ 深度清理$(C_OFF)\n"
	@rm -rf $(VENV) frontend/node_modules uploads/voice/* uploads/images/*
	@printf "$(C_GREEN)[ok]$(C_OFF) 深度清理完成\n"

# ============================================================
# 一键命令（最常用）
# ============================================================

.PHONY: all
all: setup db-migrate db-migrate-rag db-import db-form-schema check-env start-bg ## 一键完成全部就绪并后台启动
	@printf "\n$(C_GREEN)═══════════════════════════════════════════════════$(C_OFF)\n"
	@printf "$(C_GREEN) 政务智聊已就绪！$(C_OFF)\n"
	@printf "$(C_GREEN)═══════════════════════════════════════════════════$(C_OFF)\n\n"
	@printf "  浏览器：$(C_BLUE)http://127.0.0.1:$(PORT)$(C_OFF)\n"
	@printf "  日志：  $(C_DIM)make logs$(C_OFF)\n"
	@printf "  停止：  $(C_DIM)make stop$(C_OFF)\n"
	@printf "  重启：  $(C_DIM)make restart$(C_OFF)\n"
	@printf "  端到端：$(C_DIM)make verify EMAIL=你的邮箱$(C_OFF)\n\n"
