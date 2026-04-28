# models/ — DB 连接池与 7 张表 CRUD

> 父：`../AGENTS.md`。所有 SQL 在这里；外部只通过 `db.execute()` 或本目录公开函数访问数据库。建表 DDL 在 `../scripts/init_db.sql`。

## OVERVIEW

10 个文件：`db.py` 池化 + 通用 `execute()`；`knowledge.py` / `conversation.py` / `user.py` / `c_user.py` / `application.py` / `email_code.py` / `feedback.py` / `admin_settings.py` 是表级 CRUD。所有函数返回 `dict` / `list[dict]` / 标量 / `None`，对外保持 dict-cursor 形态。**事务不暴露**：每个 `execute(commit=True)` 都是独立事务，跨表操作没有事务包装。

## SCHEMA SUMMARY

源文件：`../scripts/init_db.sql`。

| Table | Cols | Indexes | Notes |
|-------|------|---------|-------|
| `kb_knowledge` | id, question, answer, category, keywords, weight, is_active, created_at, updated_at | `idx_category`, `idx_is_active` | TF-IDF 矩阵源；写后必须 `tfidf_service.reload()` |
| `chat_session` | id, session_id (UQ), user_agent (≤512), ip_address, created_at | `uq_session_id` | session_id = uuid4 字符串；user_agent 入库前在 `conversation.py:21` 截断 |
| `chat_message` | id, session_id (FK), role enum, content, msg_type enum, confidence DECIMAL(6,4), knowledge_id, created_at | `idx_session`, `idx_knowledge`, FK CASCADE | role ∈ {user,bot}; msg_type ∈ {text,voice}（无 image，OCR 走 text） |
| `sys_user` | id, username (UQ), password, salt, role enum, is_active, created_at | `uq_username` | password = `SHA256(plain+salt)`，salt 16 字节 hex；role ∈ {admin,viewer} |
| `c_user` | id, email (UQ), nickname, is_active, created_at, last_login_at | `uq_email` | C 端用户（邮箱+验证码登录，无密码）；与 sys_user 体系分离 |
| `email_verification_code` | id, email, code, expires_at, attempts, is_used, created_at | `idx_email` | 6 位验证码，5 分钟过期，5 次错误锁定，60s 重发冷却 |
| `service_application` | id, query_no (UQ), user_id, service_slug, form_data JSON, status, created_at, updated_at | `uq_query_no`, `idx_user`, `idx_status` | 办理申请；状态变更后 `application_service` 自动发邮件通知 |
| `user_feedback` | id, session_id, rating, comment, created_at | — | 用户反馈；`feedback_service` 负责写入 |
| `admin_settings` | id, key (UQ), value, updated_at | `uq_key` | 管理端配置项持久化（如首页公告、维护模式） |

## WHERE TO LOOK

| Task | File:Symbol |
|------|-------------|
| 拿一行 / 多行 / 写库 | `db.py:56` (`execute(sql, args, fetchone/fetchall/commit)`) |
| 连接池配置 | `db.py:15` (`init_pool`) — `mincached=2/maxcached=5/maxconnections=20` |
| 请求结束自动归还连接 | `db.py:47` (`close_db`) — 由 `app.teardown_appcontext` 注册 |
| TF-IDF 矩阵的数据源 | `knowledge.py:9` (`get_all_active`) — 只取 `is_active=1`，按 `weight DESC, id ASC` |
| 知识写操作 → 必须配 reload | `knowledge.py:26,36,57` (`insert/update/soft_delete`) |
| C 端用户 CRUD | `c_user.py` — `find_by_email` / `create` / `update_last_login` |
| 验证码存取 | `email_code.py` — `create` / `find_valid` / `increment_attempts` / `mark_used` |
| 办理申请 CRUD | `application.py` — `create` / `find_by_query_no` / `list_by_user` / `update_status` / `list_all` |
| 用户反馈写入 | `feedback.py` — `create`（session_id + rating + comment） |
| 管理端配置 | `admin_settings.py` — `get` / `set`（key-value，仅有 sitenotice / maintenance_mode 两个 key） |
| 动态字段更新模板 | `knowledge.py:36-54` 与 `user.py:49-75` —— 列名拼 f-string，但 mapping 写死，无注入 |
| 创建 / 校验会话 | `conversation.py:14` (`create_session`) / `:25` (`session_exists`) |
| 写消息 | `conversation.py:101` (`add_message`) — `chat_service.answer()` 调两次（user+bot） |
| 拉历史 | `conversation.py:127` (`get_messages`) — 按 id 升序，前端按此排版 |
| 会话列表（带预览/计数） | `conversation.py:34` (`list_sessions`) — 4 个嵌套子查询，慢查询警惕 |
| 用户校验 | `user.py:9` (`get_by_username`) —— **唯一**返回 password+salt 的接口 |
| 用户列表 / by id | `user.py:20,31` —— 不返回密码 |

## CONVENTIONS

- **永远走 `execute()`**：禁止在 model 之外 `cur.execute()`；保证所有 SQL 都受到 try/rollback 包装。
- **参数化查询**：值用 `%s` 占位，绝不 f-string 拼值。f-string 只允许拼**列名/SQL 片段**，且来源必须是模块内 hardcoded mapping（见 `knowledge.py:41-45` / `user.py:60-66`）。
- **DATE_FORMAT 转字符串再返**：所有 `created_at/updated_at` 在 SQL 里 `DATE_FORMAT(... '%%Y-%%m-%%d %%H:%%i:%%S')` 输出；前端拿到的是字符串，不必再处理时区。注意 `%%` 是 PyMySQL 转义（避免 `%Y` 被当占位符）。
- **软删而非硬删**：`knowledge.soft_delete` 只置 `is_active=0`；TF-IDF 矩阵会从下次 `reload()` 起忽略。chat_message 与 chat_session 走 FK CASCADE，删 session 自动删消息。
- **partial update**：`knowledge.update` / `user.update_user` 收 `None` 表示"不改"；只更新非 None 字段。

## ANTI-PATTERNS

- **不要在请求处理中开事务跨多表**：`execute()` 没暴露事务上下文；如需跨表原子写（例如同时建 session+消息），手工 `get_db()` + `with conn.cursor()` + 手动 `conn.commit()`。
- **不要在 model 之外做 SQL**：`routes/admin.py:overview/list_knowledge` 是历史债，新代码不要复制。
- **不要在 `chat_message` 写 `confidence > 1`**：DECIMAL(6,4) 实际只能存 `9.9999`；TF-IDF 余弦相似度天然 ≤1，安全；外部分数源（web 兜底当前固定 0.0）也别越界。
- **不要把 `add_message` 当幂等**：自增 id，重试会插重复消息；`chat_service.answer()` 失败仅 warning 不重试，没有副作用。
- **不要硬删 sys_user**：当前没接口，也别加；`is_active=0` 即可锁号。
- **不要假设 `list_sessions` 的子查询能撑大数据量**：4 个相关子查询是 O(N×M)，几千会话就慢；正式场景需要冗余字段或物化。

## UNIQUE STYLES

- **DictCursor 全局默认**：`init_pool(cursorclass=pymysql.cursors.DictCursor)`，所有 `fetchone/fetchall` 直接拿 dict，无需手工 zip 列名。
- **f-string 列名拼接 + hardcoded mapping**：`knowledge.update` 只允许更新固定 6 列；新增列必须先扩 `mapping`，否则被静默丢弃 —— 既阻挡注入又强制 schema 对齐。
- **`autocommit=False`** + **`execute()` 自带 rollback**：DDL 之外的所有写都受到自动回滚；正常路径需要显式传 `commit=True`，没传就不会真写库（debug 时常见 bug）。

## NOTES

- 没有 ORM、没有 migration 工具；schema 改动手工改 `init_db.sql` 并配 `ALTER TABLE` 脚本。
- 默认管理员见 `init_db.sql:88-94`：`admin / admin123`，salt = `govchat2026salt01`；**生产前必改**。
- `count_users() / count_active()` 用于 `/api/admin/overview` 的数字面板，不要替换成 INFORMATION_SCHEMA 估值（会偏小）。
