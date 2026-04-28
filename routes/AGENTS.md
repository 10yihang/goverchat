# routes/ — 10 个 Blueprint，~40 个 Endpoint

> 父：`../AGENTS.md`。这一层是薄控制器：JSON 解析 → `.strip()` → 调 service → `jsonify`。除两处历史例外（见下），都禁止写 SQL / 业务逻辑。

## OVERVIEW

注册顺序由 `app.py:65-86` 决定。所有 `/api/*` 路径错误返回 JSON（`app.py:errorhandler`），HTML 路径 404 返回 `docs.html`。`@admin_required` 仅施加于 `admin.py` 13 个端点 + `app.py` 的 `/admin` HTML 入口。`@login_required`（C 端）施加于 chat/history/applications/c-auth 部分端点。

## WHERE TO LOOK

| Endpoint | File:Line | Service Called | Auth |
|----------|-----------|----------------|------|
| `POST /api/chat/send` | `chat.py:10` | `chat_service.answer` | — |
| `POST /api/chat/session/new` | `chat.py:37` | `chat_service.new_session` | — |
| `POST /api/voice/upload` | `voice.py:23` | `asr_service.transcribe` + `chat_service.answer` | — |
| `POST /api/image/upload` | `image.py:24` | `ocr_service.extract_text` + `chat_service.answer` | — |
| `GET /api/history/sessions` | `history.py:10` | `list_sessions` | — |
| `GET /api/history/<sid>` | `history.py:17` | `get_messages` | — ⚠️ |
| `POST /api/auth/login` | `auth.py:10` | `verify_user` + `login_user` | — |
| `POST /api/auth/logout` | `auth.py:26` | `logout_user` | — |
| `GET /api/auth/me` | `auth.py:32` | `current_user` | — |
| `GET /api/admin/overview` | `admin.py:37` | 5 条原生 SQL + `metrics_service.summary` | admin ⚠️ |
| `GET /api/admin/knowledge` | `admin.py:98` | `_knowledge_query` 动态 SQL | admin ⚠️ |
| `POST /api/admin/knowledge` | `admin.py:123` | `insert` + `tfidf_service.reload` | admin |
| `PUT /api/admin/knowledge/<id>` | `admin.py:146` | `update` + `tfidf_service.reload` | admin |
| `DELETE /api/admin/knowledge/<id>` | `admin.py:167` | `soft_delete` + `tfidf_service.reload` | admin |
| `POST /api/admin/knowledge/reload` | `admin.py:175` | `tfidf_service.reload` | admin |
| `GET /api/admin/users` | `admin.py:182` | `list_users` | admin |
| `POST /api/admin/users` | `admin.py:227` | `hash_password` + `insert_user` | admin |
| `PUT /api/admin/users/<id>` | `admin.py:246` | `update_user` (+ 可选 `hash_password`) | admin |
| `GET /api/admin/service-items` | `admin.py:188` | `service_catalog_service.list_items` | admin |
| `POST /api/admin/service-items` | `admin.py:201` | `service_catalog_service.upsert_item` | admin |
| `PUT /api/admin/service-items/<slug>` | `admin.py:211` | `service_catalog_service.upsert_item` | admin |
| `DELETE /api/admin/service-items/<slug>` | `admin.py:220` | `service_catalog_service.set_active(slug,0)` | admin |
| `GET /api/guide/topics` | `guide.py:10` | `guide_service.list_topics` | — |
| `GET /api/guide/topics/<slug>` | `guide.py:15` | `guide_service.get_topic` | — |
| `GET /api/service/items` | `service_center.py:10` | `service_catalog_service.list_items` + `categories` + `hot_items` | — |
| `GET /api/service/items/<slug>` | `service_center.py:24` | `service_catalog_service.get_item` | — |
| `POST /api/service/progress/query` | `service_center.py:32` | `service_catalog_service.query_progress` | — |
| `POST /api/c-auth/send-code` | `c_auth.py:10` | `c_auth_service.send_code` | — |
| `POST /api/c-auth/verify-code` | `c_auth.py:22` | `c_auth_service.verify_code` | — |
| `POST /api/c-auth/logout` | `c_auth.py:34` | `c_auth_service.logout` | — |
| `GET /api/c-auth/me` | `c_auth.py:40` | `current_user` | C login |
| `POST /api/applications` | `applications.py:10` | `application_service.submit` | C login |
| `GET /api/applications` | `applications.py:30` | `application_service.list_by_user` | C login |
| `GET /api/applications/<query_no>` | `applications.py:42` | `application_service.get_by_query_no` | C login |
| `GET /api/halls` | `service_center.py` | `service_catalog_service` | — |
| `GET /api/halls/<id>` | `service_center.py` | `service_catalog_service` | — |
| `POST /api/chat/feedback` | `chat.py:92` | `feedback_service.submit_feedback` | C login |

## CONVENTIONS

- **入参清洗模板**：`(request.get_json(silent=True) or {}).get(field) or ""` → `.strip()`；非空校验失败返 400；类型转换失败返 400 并在 message 写中文原因。
- **状态码语义**：200 默认；201 资源创建（含 `chat/session/new`）；202 异步触发（`knowledge/reload`）；400 校验；401 未登录；403 角色不足；404 资源不存在；422 OCR 提取失败；500 ASR 失败；503 模型/外部依赖未就绪。
- **依赖未就绪先于参数校验检查**：见 `voice.py:32` / `image.py:26-40`，先 `is_ready()` 再校验文件字段，避免传完文件才告诉用户没装模型。
- **session_id 处理统一走 `chat_service.ensure_session(...)`**：传 None 或不存在的 sid 都会自动 `create_session()` 返回新 id；route 不再判断。
- **接收 multipart 文件时**：用 `uuid.uuid4().hex + '.' + ext` 落盘，避免中文/重名冲突；`os.makedirs(..., exist_ok=True)` 兜底。

## ANTI-PATTERNS

- **不要在 route 写 SQL**：`admin.py:overview` (`:40-65`) 与 `admin.py:list_knowledge` (`:17-34, :98-120`) 已经违反，是历史债；新增管理接口请把 SQL 下沉到 `models/admin_metrics.py` 或扩展 `models/knowledge.py:search()`。
- **不要给 `/api/history/<sid>` 加缓存**：当前任何人凭 sid 都能拉，已经是漏洞；将来加权限前别再加缓存放大问题。
- **不要在 voice/image route 自己拼 ffmpeg/tesseract**：转码与识别全部在 service 内完成；route 只负责保存上传文件 + 调 service + 返回。
- **不要假设 `request.remote_addr` 真实**：被反代时常是 `127.0.0.1`；如需真实 IP 需读 `X-Forwarded-For`，目前未做。
- **不要在 admin 端点之外 import `models.db.execute`**：会破坏分层，下沉为模型函数再调用。

## UNIQUE STYLES

- **Blueprint 命名**：变量名 `<name>_bp`，注册名通常等于 `<name>`（admin/chat/voice/...）；唯一例外 `guide.py` 用 `guide_api` 因为根路由占了 `guide`。
- **错误返 JSON 但首选项是 `{error: <code>, message: <中文>}`**：见 `image.py:27-30, :49-55`；前端可按 `error` 字段做精细提示。
- **history 路由对不存在的 sid 返回空消息列表而非 404**：`history.py:25-26` —— 让前端拿 localStorage 里的旧 sid 也能优雅显示。
- **多模态输入回包追加字段**：voice 加 `text`，image 加 `text + input_mode + filename` —— 在统一 `chat_service.answer()` 输出之上手工补字段，前端据此展示"识别结果原文"。
