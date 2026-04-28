# services/ — 业务编排与外部资源单例

> 父：`../AGENTS.md`。本目录承载所有业务逻辑；route 只做参数清洗与转发，model 只管 SQL，剩下的全在这里。

## OVERVIEW

15 个文件，分两类：**有状态单例**（TFIDFService / ASRService — 持有重资源 + 双检锁 + 守护线程预热）与**无状态服务**（其余全部 — 模块加载即可用）。`chat_service.answer()` 是核心编排入口，三模态请求最终都汇聚到这里。

## WHERE TO LOOK

| Task | File:Symbol |
|------|-------------|
| 改回退链顺序（TF-IDF → web → fallback） | `chat_service.py:67` (`_should_fallback_to_web`) + `:64-72` |
| 调 TF-IDF 召回（拼 question+keywords、sublinear_tf） | `tfidf_service.py:62-69` |
| 触发热更新（管理端写库后） | `tfidf_service.reload()` — 守护线程 `tfidf-reload`，名字 grep 日志能定位 |
| Whisper 加载（懒导入 + 守护线程） | `asr_service.py:50-72` |
| ffmpeg 命令模板 | `asr_service.py:16-19` (`_FFMPEG_CMD`) — 用 `os.system`，中文路径有引号陷阱 |
| Tesseract 命令解析（PATH → 配置 → Windows 标准路径） | `ocr_service.py:24-37` (`@lru_cache(maxsize=1)`) |
| SearXNG 结果重排（官方域名优先） | `web_search_service.py:106-118` |
| 办事事项打分推荐 | `service_catalog.py:147-176` (`recommend_card`) |
| 演示进度数据 | `service_catalog.py:16-86` (`DEMO_PROGRESS_RECORDS`) — 5 条硬编码 |
| 鉴权装饰器 | `auth_service.py:81,91` (`login_required` / `admin_required`) |
| 请求耗时/错误聚合 | `metrics_service.py` — `deque(maxlen=300)`，仅供 `/api/admin/overview` 展示 |
| 业务引导主题 | `guide_service.py` — 只是 `service_catalog` 的 DTO 视图，无独立数据 |
| **LLM 意图识别** | `llm_service.py` — OpenAI 兼容 API；`recognize_intent()` → form_prompt；`ask()` 聊天补全 |
| **C 端邮箱验证码登录** | `c_auth_service.py` — `send_code` / `verify_code` / `logout`；冷却+锁定逻辑 |
| **SMTP 邮件发送** | `email_service.py` — SSL/STARTTLS 双模式；`send_verification_code` / `send_application_notification` |
| **办理申请全流程** | `application_service.py` — 表单校验 → 生成受理编号 → 落库 → 发邮件 + 状态变更通知 |
| **用户反馈** | `feedback_service.py` — 收集 session_id + rating + comment |
| **管理端配置** | `admin_settings.py` — 持久化 sitenotice / maintenance_mode |

## CONVENTIONS

- **新有状态服务**复制 `TFIDFService` 模板：`__new__` 双检 + `_initialized` 守卫 + `_*_lock` 保护可变态。
- **延迟导入重依赖**：`tfidf_service._do_load()` 在函数内 `from models.knowledge import …` 避免循环；`asr_service._do_preload()` 在函数内 `import whisper` 让启动失败不影响其他 service。
- **"未就绪"返回兜底**：`tfidf_service.search()` 矩阵未就绪时返回 `FALLBACK_ANSWER` 字典；`asr_service.transcribe()` 未就绪返回 `None`；route 层据此返回 503。
- **答案结构永远统一**：`{answer, confidence, knowledge_id, sources, session_id?, service_card?, answer_source?}` —— `web_search_service.answer()` 也按这个 shape 返回，便于 route 层无差别 jsonify。
- **logger 标签**：每个 service 用方括号前缀（`[TF-IDF]` / `[ASR]` / `[OCR]` / `[ChatService]` / `[WebSearch]`），和 `[Startup]` 配套，方便 `grep '\[ASR\]' app.log`。

## ANTI-PATTERNS

- **不要直接调 `tfidf_service._do_load()`**：会阻塞调用线程几秒（取决于知识量）；外部只能 `load()`（启动同步一次）或 `reload()`（守护线程异步）。
- **不要在 service 抛 HTTP 状态**：抛 `RuntimeError` 是允许的（`ocr_service.extract_text` 会抛），但**不要 `abort(503)`**；HTTP 由 route 决定。
- **不要并发调 `service_catalog.upsert_item()`**：`_save_all()` 是裸 `Path.write_text()`，无锁；目前只在 admin 路由调用，假设单管理员串行操作。
- **不要给 `metrics_service` 加多进程汇总**：`deque` 仅本进程内存有效；`gunicorn -w >1` 多 worker 会导致每个 worker 独立计数。
- **不要修改 `chat_service.answer()` 的写库顺序**：先 user 后 bot 的固定顺序保证前端按 id 升序拉历史时排版正确。
- **不要把 SMTP 凭证硬编码**：`email_service.py` 全部走 `config.SMTP_*`；生产前必须在 `.env` 或环境变量中设置。
- **不要在非 DEBUG 模式下暴露验证码**：`c_auth_service.py` 的 `dev_code` 字段仅 `FLASK_DEBUG=true` 时返回。
- **不要把 `form_prompt` 当必返字段**：意图识别置信度 < `LLM_INTENT_THRESHOLD` 时 `form_prompt` 为 None，前端据此不展开表单。

## UNIQUE STYLES

- **`@lru_cache(maxsize=1)` 当模块级懒缓存用**：见 `ocr_service._resolve_command()` —— Tesseract 路径只解析一次，后续调用零开销。
- **`urllib.request` 而非 `requests`**：`web_search_service.py` 故意只依赖标准库，`requirements.txt` 不引 `requests`，便于打包到无网环境。
- **演示进度数据放在模块顶层而非 JSON**：`DEMO_PROGRESS_RECORDS` 用 `tuple` 当 dict key（`(slug, query_no_upper)`），查询走 `O(1)` 哈希，反正只是 demo。
- **`auth_service.current_user()` 每次请求都查 DB**：保证 `is_active=0` 后立刻失效；不是性能瓶颈是因为 sys_user 表只有少量管理员。

## NOTES

- `chat_service.answer()` **必跑** `service_catalog_service.recommend_card(text)`（不管走 TF-IDF 还是 web 兜底），返回的 service_card 给前端展示侧栏推荐。
- `asr_service.transcribe()` 用 `os.system(ffmpeg ...)` 不是 `subprocess.run`；中文路径需要用引号包裹（已做），但极端字符可能炸——优先用英文文件名。
- `web_search_service.is_enabled()` = `WEB_SEARCH_ENABLED=true` 且 `WEB_SEARCH_ENDPOINT` 非空，缺一即不进回退分支。
- 想知道每张表 / 每个 endpoint，分别看 `../models/AGENTS.md` 与 `../routes/AGENTS.md`，本文件不重复。
