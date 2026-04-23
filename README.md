# 政务智聊 · 多模态政务问答原型

Flask + MySQL + TF-IDF + Whisper + Tesseract + LLM 意图识别 + SMTP，前端 React 19 + TypeScript + Tailwind。
三模态输入（文字 / 语音 / 图片）+ 邮箱无密码登录 + 聊天内联表单办理 + 邮件通知闭环。

毕业设计原型，仅供学习演示，不代表任何官方政策。

---

## 新增能力（Phase 5：聊天内联办理）

| 能力 | 说明 |
|------|------|
| **邮箱+验证码登录** | C 端用户使用邮箱接收 6 位验证码登录，无需密码；与管理员账号体系完全分离 |
| **聊天内联办理** | 用户在聊天中表达办理意图（"我要办驾驶证换证"），由 LLM 识别后自动展开办理表单；service_card 上还提供"立即办理"按钮兜底 |
| **真实申请受理编号** | 提交后生成 `DL250424A8C3` 风格受理编号，写入 `service_application` 表，可在聊天中通过编号查询真实进度 |
| **SMTP 邮件闭环** | 申请提交、状态变更两类事件自动通过邮件通知用户 |
| **管理后台办理** | admin 可在新增的"办理申请" Tab 中查看所有申请、按状态筛选、变更状态（自动触发邮件通知） |

---

## 快速开始（dev 双进程）

```bash
# 0. 准备 .env（首次运行）
cp .env.example .env
# 编辑 .env：填 DB_PASSWORD / SMTP_* / LLM_API_*
# 加载 .env 推荐用 direnv 或 set -a; source .env; set +a

# 1. 后端：MySQL + Python 依赖
mysql -u root -p < scripts/init_db.sql               # 全量建表（含新表）
# 已有部署只需追加迁移：
# mysql -u root -p gov < scripts/migrate_add_in_chat_submission.sql
python scripts/import_knowledge.py
python scripts/add_form_schema.py                    # 给 service_items 注入 form_schema（一次性）
pip install -r requirements.txt

# 2. 前端：Node 依赖
cd frontend && npm install && cd ..

# 3. 同时起两个进程
# 终端 A
python app.py                        # → :5000，提供 /api/* JSON

# 终端 B
cd frontend && npm run dev           # → :5173，自动 proxy /api → :5000

# 浏览器开 http://localhost:5173
```

## 生产模式（单端口）

```bash
cd frontend && npm run build         # 构建 React 到 ../static/dist/
cd ..
SERVE_SPA=true python app.py         # → :5000，单端口托管 React + API
```

详细切换流程见 [`PHASE4_CUTOVER.md`](./PHASE4_CUTOVER.md)。

---

## 技术栈

### 后端 (`app.py` + `routes/` + `services/` + `models/`)
- Flask 3.0.3 / PyMySQL 1.1 / DBUtils 连接池（min=2/max=20）
- scikit-learn TF-IDF + jieba 中文分词（37 条知识 / 6 个分类）
- OpenAI Whisper（语音转文字，默认 `small` 模型）
- Tesseract（图片 OCR，需系统二进制）
- 可选：SearXNG 联网检索（`WEB_SEARCH_ENABLED=true`）

### 前端 (`frontend/`)
- React 19 + TypeScript + Vite + Tailwind v4
- TanStack Query v5（服务端状态） + Zustand（客户端状态）
- React Router v6 + shadcn-style UI（13 个 Radix-based 基础组件）
- 7 个页面 / 24 个 API hooks / 6125 LOC TS / 145 KB gzipped 首屏

---

## 目录速览

| 路径 | 内容 |
|------|------|
| `app.py` | Flask 工厂 + 8 蓝图 + 启动钩子 + SPA fallback (env-gated) |
| `config.py` | 30+ 配置项，全部环境变量可覆盖 |
| `routes/`*.py | 8 个 Blueprint，31 个 endpoint |
| `services/`*.py | 业务编排（chat / tfidf / asr / ocr / web_search / catalog / auth / metrics） |
| `models/`*.py | 数据访问层（kb_knowledge / chat_session / chat_message / sys_user） |
| `frontend/src/` | React SPA 全部源码 |
| `static/dist/` | React 构建产物（npm run build 输出，不入 git） |
| `static/downloads/` | 7 个事项材料 .txt（仍由 Flask 静态服务） |
| `data/` | knowledge.csv (37 行) + service_items.json (7 项) |
| `scripts/` | init_db.sql / import_knowledge.py / start_app.ps1 等 |
| `_archive_old_frontend/` | 旧 Jinja 模板备份（迁移 React 后保留 1-2 周） |
| `AGENTS.md` (各目录) | 各模块的设计约定与陷阱备忘 |

---

## 环境要求

| 依赖 | 版本 | 备注 |
|------|------|------|
| Python | ≥ 3.10（实测 3.12） | venv 推荐 |
| Node.js | ≥ 18（实测 25） | 仅前端构建用 |
| MySQL | ≥ 8.0（实测 9.6） | 默认数据库名 `gov` |
| ffmpeg | 任意新版（PATH 内） | Whisper 转码用 |
| tesseract | 5.x（PATH 或 `TESSERACT_CMD`） | 可选，OCR 用 |

---

## 配置参数（环境变量）

| 变量 | 默认 | 说明 |
|------|------|------|
| `SERVE_SPA` | `false` | `true` 启用 React SPA；不设走旧模板 |
| `PORT` | `5000` | Flask 监听端口（macOS 5000 被 AirPlay 占可用 5050） |
| `DB_HOST` | `localhost` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_NAME` | `gov` | 数据库名 |
| `DB_USER` | `root` | 用户名 |
| `DB_PASSWORD` | `Gr040103` | **生产前必改** |
| `SECRET_KEY` | `gov-chat-secret-2026` | Flask session **生产前必改** |
| `WHISPER_MODEL` | `small` | tiny / base / small / medium |
| `TESSERACT_CMD` | （PATH） | 显式 tesseract 路径 |
| `TFIDF_THRESHOLD` | `0.15` | 低于此值返回兜底回复 |
| `TFIDF_TOP_K` | `3` | 返回 Top-K 相似 |
| `MAX_CONTENT_LENGTH` | `16777216` | 上传文件上限 (16 MB) |
| `WEB_SEARCH_ENABLED` | `false` | 启用联网搜索回退 |
| `WEB_SEARCH_ENDPOINT` | `""` | SearXNG `/search` 地址 |
| `WEB_SEARCH_TRIGGER_THRESHOLD` | `0.35` | 触发联网搜索的本地置信度阈值 |
| `WEB_SEARCH_PREFERRED_DOMAINS` | `gov.cn,www.gov.cn` | 优先域名 |
| `WEB_SEARCH_OFFICIAL_ONLY` | `false` | 仅保留优先域名结果 |
| `LLM_API_BASE` | （必填） | OpenAI 兼容端点，如 `https://api.deepseek.com/v1` |
| `LLM_API_KEY` | （必填） | LLM API Key |
| `LLM_MODEL` | `gpt-4o-mini` | 使用的模型名 |
| `LLM_INTENT_THRESHOLD` | `0.6` | 意图识别置信度阈值，超过才弹表单 |
| `SMTP_HOST` | （必填） | SMTP 服务器，如 `smtp.qq.com` |
| `SMTP_PORT` | `465` | SSL 端口；STARTTLS 改 587 |
| `SMTP_USE_SSL` | `true` | SSL 模式（QQ 邮箱推荐） |
| `SMTP_USER` | （必填） | SMTP 用户名/邮箱 |
| `SMTP_PASSWORD` | （必填） | SMTP 密码或授权码（**不是邮箱密码**） |
| `SMTP_FROM_EMAIL` | = `SMTP_USER` | 发件人邮箱 |
| `SMTP_FROM_NAME` | `政务智聊` | 发件人显示名 |
| `EMAIL_CODE_TTL_SEC` | `300` | 验证码有效期（秒） |
| `EMAIL_CODE_RESEND_COOLDOWN` | `60` | 同邮箱两次发送间隔（秒） |
| `EMAIL_CODE_MAX_ATTEMPTS` | `5` | 单条验证码最大错误尝试次数 |
| `FORM_SUBMISSION_ENABLED` | `true` | 是否启用聊天内联办理 |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | 邮件链接里的站点 URL |
| `CORS_ALLOWED_ORIGINS` | `localhost:5173,127.0.0.1:5173` | 允许的跨源前端，逗号分隔 |
| `SESSION_LIFETIME_HOURS` | `24` | Cookie 寿命（小时） |

### SMTP 配置示例

| 邮箱 | HOST | PORT | USE_SSL | 备注 |
|------|------|------|---------|------|
| QQ 邮箱 | `smtp.qq.com` | `465` | `true` | 用 [SMTP 授权码](https://service.mail.qq.com/detail/0/53)，不是登录密码 |
| 163 邮箱 | `smtp.163.com` | `465` | `true` | 用客户端授权密码 |
| Gmail | `smtp.gmail.com` | `587` | `false`（USE_STARTTLS=true） | 需要应用专用密码 |
| 阿里云邮 | `smtp.mxhichina.com` | `465` | `true` | 邮箱密码即可 |

### 开发模式回退

未配置 SMTP 时，验证码会写入后端日志；只有当 `FLASK_DEBUG=true` 时，验证码同时通过 API 响应字段 `dev_code` 返回前端（前端会用 toast 显示）。**生产必须关闭 DEBUG**，否则将形成认证旁路漏洞。

---

## API 总览

完整文档见 React 应用内 `/docs` 页面（运行后访问）。新增 Phase 5 端点见下方。

| Group | Endpoints |
|-------|-----------|
| chat | POST `/api/chat/send`, POST `/api/chat/session/new`（**需 C 端登录**） |
| voice | POST `/api/voice/upload`（multipart，**需 C 端登录**） |
| image | POST `/api/image/upload`（multipart，**需 C 端登录**） |
| history | GET `/api/history/sessions`, GET `/api/history/<sid>`（**需 C 端登录 + 归属校验**） |
| **c-auth**（新） | POST `/api/c-auth/send-code`, POST `/api/c-auth/verify-code`, POST `/api/c-auth/logout`, GET `/api/c-auth/me` |
| auth | POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`（**仅管理员**） |
| guide | GET `/api/guide/topics`, GET `/api/guide/topics/<slug>` |
| service | GET `/api/service/items`, GET `/api/service/items/<slug>`, GET `/api/service/items/<slug>/form-schema`, POST `/api/service/progress/query` |
| **applications**（新） | POST `/api/applications`, GET `/api/applications`, GET `/api/applications/<query_no>`（**需 C 端登录**） |
| admin | overview / knowledge CRUD + reload / users CRUD / service-items CRUD / applications 列表+状态修改 |

### 统一响应结构（chat / voice / image）

```json
{
  "session_id": "uuid",
  "answer": "答案文本",
  "confidence": 0.7925,
  "knowledge_id": 1,
  "sources": [{"id":1, "question":"...", "score":0.79}],
  "service_card": {"slug":"...", "title":"...", "summary":"...", "has_form": true},
  "answer_source": "knowledge",
  "form_prompt": {
    "service_slug": "driver-license-renewal",
    "service_title": "驾驶证期满换证",
    "form_schema": { "submit_label": "提交", "fields": [/* ... */] },
    "intent_source": "llm",
    "intent_confidence": 0.83
  }
}
```

`form_prompt` 仅当 LLM 识别为"办理意图"且置信度≥`LLM_INTENT_THRESHOLD` 时下发。前端展开内联表单；用户点击 service_card 上的"立即办理"也可手动触发（兜底路径）。

---

## Whisper 模型

| 模型 | 大小 | 推荐场景 |
|------|------|---------|
| tiny | 75 MB | 内存极度受限 |
| base | 145 MB | 内存 < 4 GB |
| **small** | **466 MB** | **推荐**（中文精度最好） |
| medium | 1.5 GB | 高精度需求 |

首启自动下载到 `~/.cache/whisper/`。无网环境提前缓存：

```python
import whisper; whisper.load_model("small")
```

---

## 联网搜索回退（可选）

启用后，本地 TF-IDF 置信度低于 `WEB_SEARCH_TRIGGER_THRESHOLD` 时自动调 SearXNG。

```bash
WEB_SEARCH_ENABLED=true \
WEB_SEARCH_PROVIDER=searxng \
WEB_SEARCH_ENDPOINT=http://127.0.0.1:8080/search \
python app.py
```

冒烟测试：

```bash
python scripts/test_web_search.py
```

部署 SearXNG 推荐用官方 Docker 容器，参考样例 `scripts/searxng-settings.yml`。

---

## Windows 一键启动

```powershell
.\scripts\check_env.ps1
.\scripts\start_app.ps1 `
  -DbPassword "你的MySQL密码" `
  -FfmpegBin "D:\bs\ffmpeg\ffmpeg\bin" `
  -EnableWebSearch `
  -WebSearchEndpoint "http://127.0.0.1:8080/search"
```

---

## 数据库 Schema

7 张表，DDL 在 `scripts/init_db.sql`；增量迁移见 `scripts/migrate_add_in_chat_submission.sql`：

| Table | 用途 |
|-------|------|
| `kb_knowledge` | 知识库（TF-IDF 矩阵源） |
| `chat_session` | 会话头（uuid + user_id 关联 c_user） |
| `chat_message` | 消息流（user/bot 双角色） |
| `sys_user` | 管理员账号（默认 admin / admin123，**生产前必改**） |
| **`c_user`** | C 端用户（邮箱+验证码登录，无密码） |
| **`email_verification_code`** | 邮箱验证码（5 分钟过期 + 5 次错误锁定 + 60s 重发冷却） |
| **`service_application`** | 用户提交的办理申请（含表单 JSON、状态、受理编号） |

---

## 知识库扩充

每条知识录 2-3 种问法变体 + `keywords` 同义词，能显著提升 TF-IDF 召回：

```csv
question: 如何办理户口迁移
keywords: 户口迁移 户籍转移 迁户口 落户 户籍变更
```

修改 CSV 后：

```bash
python scripts/import_knowledge.py --truncate    # 全量重导
# 然后管理后台点"重建索引"，或重启 Flask
```

---

## 论文配图说明

| 图表 | 工具 | 内容 |
|------|------|------|
| 系统架构图（三层） | draw.io | React SPA → Flask API → MySQL |
| TF-IDF 检索流程图 | draw.io | 分词→向量化→余弦相似度→阈值判断 |
| 三模态输入时序图 | PlantUML | 前端录音 → multipart 上传 → Whisper/Tesseract → chat_service.answer → DB → 前端 |
| ER 图 | dbdiagram.io | 4 张表关系 |
| React 组件树 | mermaid | App → AppLayout → 7 routes → 各页面组件 |

---

## 文档导航

- 各模块设计约定：`AGENTS.md`（项目根 + 各子目录）
- React SPA 切换流程：[`PHASE4_CUTOVER.md`](./PHASE4_CUTOVER.md)
- 前端架构详解：[`frontend/AGENTS.md`](./frontend/AGENTS.md)
- 后端业务编排约定：[`services/AGENTS.md`](./services/AGENTS.md)
- 数据访问约定与陷阱：[`models/AGENTS.md`](./models/AGENTS.md)
- 路由薄控制器约定：[`routes/AGENTS.md`](./routes/AGENTS.md)
