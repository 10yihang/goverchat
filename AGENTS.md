# AGENTS.md — 政务智聊 Project Knowledge Base

**Generated:** 2026-04-23 · **Mode:** post-Phase 4 SPA cutover · **Scope:** Flask + MySQL + TF-IDF + Whisper + Tesseract 多模态政务问答原型，**前端已迁移到 React SPA**

---

## OVERVIEW

毕业设计原型。Flask 工厂 (`app.py`) 注册 8 个 Blueprint，编排本地 TF-IDF 检索（jieba+sklearn）→ 可选 SearXNG 联网回退 → 三模态输入（文本 / Whisper 语音 / Tesseract OCR 图片）。前端是独立 React SPA（`frontend/`，6125 LOC TS），构建产物 `static/dist/` 由 Flask 单端口托管（`SERVE_SPA=true`）。后台管理改动知识库后立即触发 TF-IDF 异步热更新。**~2.6K LOC Python 后端 + ~6K LOC TypeScript 前端。**

## STRUCTURE

```
project_gr/
├── app.py                # Flask 工厂 + 8 蓝图 + 启动钩子 + SPA 静态托管（SERVE_SPA gated）
├── config.py             # 全部配置（30+ 项），所有可被环境变量覆盖
├── routes/   → routes/AGENTS.md     # 8 个 Blueprint，31 个 endpoint
├── services/ → services/AGENTS.md   # 业务编排 + 单例 + 线程池
├── models/   → models/AGENTS.md     # PyMySQL 连接池 + 4 张表 CRUD
├── frontend/ → frontend/AGENTS.md   # ★ React 19 + Vite + TS SPA（64 文件）
├── static/
│   ├── dist/             # ★ React 构建产物（npm run build 输出，gitignore）
│   └── downloads/        # 7 个事项材料 .txt（仍由 Flask 静态服务）
├── templates/ → templates/AGENTS.md # 仅剩 AGENTS.md（旧 7 个 HTML 已删，备份在 _archive_old_frontend/）
├── utils/                # tokenizer.py + gov_dict.txt + stopwords.txt（jieba 启动一次）
├── scripts/              # init_db.sql / import_knowledge.py / start_app.ps1 等
├── data/                 # knowledge.csv (37 行) + service_items.json (7 项)
├── uploads/{voice,images}# 运行时自动创建，临时文件
├── docs/                 # 论文/中期报告 .docx / .md（非代码，勿入构建）
├── PHASE4_CUTOVER.md     # React 切换实施手册（Phase 4 产物）
└── _archive_old_frontend/# 旧前端备份（templates + static/js + static/css）
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| 改前端任何 UI / 加新页面 | `frontend/` → 见 `frontend/AGENTS.md` |
| 新增 HTTP 接口 | `routes/<blueprint>.py` → 调 `services/` |
| 改问答编排逻辑 | `services/chat_service.py:answer()` |
| 调 TF-IDF 阈值 / 联网回退阈值 | `config.py` (`TFIDF_THRESHOLD=0.15`, `WEB_SEARCH_TRIGGER_THRESHOLD=0.35`) |
| 改 Whisper / Tesseract 模型或路径 | `config.py` (`WHISPER_MODEL`, `TESSERACT_CMD`) |
| 增删改知识条目 → 必须刷向量矩阵 | `models/knowledge.py` + 调用 `tfidf_service.reload()` |
| 新建 / 修改办事服务事项 | `data/service_items.json`（管理端走 `service_catalog_service.upsert_item()`） |
| 改启动端口 | `PORT` 环境变量（默认 5000），如 macOS 上 5000 被 AirPlay 占可用 `PORT=5050` |
| dev 双进程启动 | 终端 A: `python app.py` · 终端 B: `cd frontend && npm run dev`（5173 + proxy） |
| 生产构建 + 单端口启动 | `cd frontend && npm run build && cd .. && SERVE_SPA=true python app.py` |
| 重建 / 导入知识库 | `mysql -u root -p < scripts/init_db.sql` 然后 `python scripts/import_knowledge.py [--truncate]` |
| 验证联网搜索 | `python scripts/test_web_search.py` |
| Phase 4 切换实施 / 回滚 / 故障排查 | `PHASE4_CUTOVER.md` |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `create_app` | factory | `app.py:23` | Flask 工厂；注册 8 蓝图、CORS、错误处理、SPA fallback (env-gated)、启动钩子 |
| `_startup` | startup | `app.py:213` | 创建 uploads 目录 + `tfidf_service.load()` 同步 + `asr_service.preload()` 异步 |
| `chat_service.answer` | orchestrator | `services/chat_service.py:34` | TF-IDF 检索 → 阈值低则 web 兜底 → recommend_card → 落库 user/bot 两条消息 |
| `TFIDFService` | singleton | `services/tfidf_service.py:18` | 双重检查锁单例；`load()` 同步、`reload()` 守护线程异步、`search()` 走 RLock；新增 `last_reload_at` property |
| `ASRService` | singleton | `services/asr_service.py:22` | `preload()` 守护线程加载 Whisper；未就绪时 `transcribe()` 返回 None |
| `OcrService` | stateless | `services/ocr_service.py:17` | `subprocess.run(tesseract)`；`_resolve_command()` 走 `@lru_cache` |
| `WebSearchService` | stateless | `services/web_search_service.py:24` | SearXNG `/search?format=json`；按 `WEB_SEARCH_PREFERRED_DOMAINS` 重排 |
| `ServiceCatalogService` | stateless | `services/service_catalog.py:89` | 读写 `data/service_items.json`；`recommend_card()` 关键词打分 |
| `init_pool` / `execute` | DB helper | `models/db.py:15,68` | DBUtils PooledDB（min=2/max=20）；`execute()` 统一封装 fetchone/fetchall/commit |
| `get_pool_connection` | DB helper | `models/db.py:47` | **后台线程专用**：绕过 Flask `g` 上下文的连接获取，调用方负责 close |
| `admin_required` / `login_required` | decorator | `services/auth_service.py:91,81` | Flask session-based；API 路径 → JSON 401/403，HTML 路径 → redirect |
| `App` (前端) | router | `frontend/src/App.tsx` | React Router + QueryClientProvider + 7 lazy routes + Toaster |
| `apiClient` (前端) | fetch wrapper | `frontend/src/lib/apiClient.ts` | credentials:include + 503 中文化 + ApiError 包装 |

## CONVENTIONS

- 所有可调参数集中在 `config.py`，仅靠环境变量覆盖；**不要**散落硬编码到业务代码。
- 路由层**只**做 `(data.get(x) or "").strip()` 入参清洗 + 调用 service + jsonify；业务逻辑下沉到 `services/`，SQL 下沉到 `models/`。
- 知识库写操作（POST/PUT/DELETE `/api/admin/knowledge*`）后**必须**调 `tfidf_service.reload()`；模式见 `routes/admin.py:142,163,171`。
- Service 层"未就绪"返回 None / fallback 字典；**不要**在 service 抛 503，由 route 层根据 `is_ready()` 显式返回。
- 中文 logger 标签前缀：`[TF-IDF]` / `[ASR]` / `[OCR]` / `[ChatService]` / `[Startup]` / `[WebSearch]` —— 沿用，方便 grep 日志。
- 会话标识用 `uuid.uuid4()`；前端 localStorage key 为 `gov_session_id`（`frontend/src/stores/chatStore.ts`，与旧前端兼容）。
- 前端所有 API 调用走 `frontend/src/lib/apiClient.ts`（credentials:include），由 TanStack Query 缓存。

## ANTI-PATTERNS (THIS PROJECT)

- **不要部署默认凭证**：`config.py` 默认 `DB_PASSWORD="Gr040103"` / `SECRET_KEY="gov-chat-secret-2026"`，`scripts/init_db.sql` 默认 admin/admin123。生产前必须替换。
- **不要在请求线程同步重建 TF-IDF 矩阵**：始终用 `tfidf_service.reload()`（守护线程），勿直接调 `_do_load()`。
- **不要在守护线程里调 `models/*.py` 的查询函数**：它们走 `models.db.get_db()` 依赖 Flask `g`。后台线程用 `models.db.get_pool_connection()` + 手写 cursor + 手动 close（见 `tfidf_service._do_load()` 的实现）。
- **不要在 `execute()` 调用时 SQL 含 `%%` 但又不传 args**：PyMySQL 仅在传入 args 时才把 `%%` 解析为字面 `%`。如需用 `DATE_FORMAT` 但无参数，传空 tuple `args=()`（见 `models/user.py:list_users()`）。
- **不要把 `service_catalog.upsert_item()` 当线程安全用**：JSON 文件读写无锁，并发管理端写入会损坏；目前依赖 admin 单管理员前提。
- **不要把 `DEMO_PROGRESS_RECORDS` 当真实数据**：`services/service_catalog.py:16-86` 是硬编码 5 条演示进度，对应办事进度查询接口；接真实业务前必须替换。
- **不要忽略 `add_message()` 失败**：`chat_service.answer()` 里写库失败仅 `logger.warning`，仍返回答案；如需强一致性自行加事务。
- **不要在 `routes/admin.py:overview/list_knowledge` 之外再写多 SQL 路由**：这两个本身已违反"薄控制器"约定，是历史债，新写请下沉到 `models/`。
- **不要把 `/api/history/<session_id>` 当受保护接口**：当前无鉴权，任何人能拉别人会话；公开演示版可接受，正式上线前必须加权限（需要 schema 变更，加 `chat_session.user_id` 列）。
- **不要把 `static/dist/` commit 进 git**：构建产物。同样 `frontend/node_modules/`。建议加 `.gitignore`。
- **不要改 React 的 `vite.config.ts` 的 `base: './'`**：Flask 静态托管必须用相对路径。

## UNIQUE STYLES

- **单例 + 双重检查锁**：所有有状态 service（TFIDF/ASR）走 `__new__` + `cls._lock` 双检；新增同类 service 复制此模板。
- **异步预热**：重资源（Whisper 模型、TF-IDF 矩阵）在 `app.py:_startup()` 期间异步加载，不阻塞监听端口；route 层用 `is_ready()` 兜底返回 503。
- **统一回答结构**：`{answer, confidence, knowledge_id, sources, session_id, service_card?, answer_source?}` —— 文本 / 语音 / 图片三入口最终都是这同一份。
- **回退链**：`tfidf_service.search()` → 若 `confidence<0.35` 且 `WEB_SEARCH_ENABLED` 走 `web_search_service.answer()` → 仍无则用 `config.FALLBACK_ANSWER`。
- **SPA 模式可逆切换**：`SERVE_SPA=true` 启用 React SPA；不设则走旧 Jinja 模板（templates/ 已清空，需要先从 `_archive_old_frontend/` 还原才能回退）。
- **TF-IDF 重建可观测性**：`/api/admin/overview` 暴露 `tfidf_last_reload_at` 时间戳，前端 admin 重建后 3s 轮询比较，知道何时索引就绪。
- **PowerShell 优先**：作者主开发环境为 Windows；macOS/Linux 用户跳过 `scripts/*.ps1`，直接 `python app.py`（端口被占可加 `PORT=5050`）。

## COMMANDS

```bash
# === 一次性初始化 ===
mysql -u root -p < scripts/init_db.sql
python scripts/import_knowledge.py        # 追加 / --truncate 清空再导

# === Dev 工作流 ===
# 终端 A：Flask（提供 /api/* JSON）
python app.py
# 终端 B：Vite dev server（提供 React HMR + proxy）
cd frontend && npm install && npm run dev
# 浏览器：http://localhost:5173

# === 生产构建 + 单端口启动 ===
cd frontend && npm run build && cd ..
SERVE_SPA=true python app.py             # → http://localhost:5000

# === Windows 一键带配置 ===
.\scripts\check_env.ps1
.\scripts\start_app.ps1 -DbPassword "..." [-EnableWebSearch -WebSearchEndpoint "http://127.0.0.1:8080/search"]

# === macOS 端口冲突时（5000 被 AirPlay）===
PORT=5050 SERVE_SPA=true python app.py

# === 联网搜索冒烟 ===
python scripts/test_web_search.py
```

## NOTES

- **不是 git 仓库**：`/Users/huangyihang/Code/project_gr` 无 `.git`；提交流程依赖外部备份。
- **`requirements.txt` 不带 OCR / Web 依赖**：`tesseract` 是系统二进制（PATH 或 `TESSERACT_CMD`）；SearXNG 也是外部服务（`scripts/searxng-settings.yml` 是参考样例，非自动启动）。
- **首启 Whisper 会下载 466MB 到 `~/.cache/whisper/`**：内网/无网环境提前手动 `whisper.load_model("small")`。
- **README 与实情有出入**：早期 README 写"100 条知识 / 10 个分类"，当前 `data/knowledge.csv` 实为 37 行 / 6 个分类。修改前先核对。
- **`uploads/voice/*` 与 `uploads/images/*` 由 `asr_service.transcribe()` 与 `routes/image.py` 创建**；ASR 自带 `finally` 清理临时 wav，OCR 不清理原图。
- **macOS 5000 被 AirPlay Receiver 占**：通过系统设置 → 通用 → AirDrop & Handoff → 关闭 AirPlay 接收器；或用 `PORT=5050`。
