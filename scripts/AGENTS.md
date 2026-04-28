# scripts/ — 数据库初始化、数据导入、测试与运维

> 父：`../AGENTS.md`。一次性脚本、SQL 迁移、冒烟测试、PowerShell/Shell 启动辅助。**不入生产，只入开发流程。**

## OVERVIEW

18 个文件：2 个 Python 数据脚本 + 4 个 SQL（建表/迁移） + 3 个测试/验证脚本 + 5 个 PowerShell 启动辅助 + 2 个 Shell 脚本 + 1 个 SearXNG 配置 + 1 个 Node E2E 脚本。**所有脚本依赖父目录 Python 模块（`models/`, `services/`, `config.py`），必须从项目根运行。**

## STRUCTURE

```
scripts/
├── init_db.sql                        # ★ 全量建表 DDL（9 张表 + 默认 admin 用户）
├── migrate_add_in_chat_submission.sql # Phase 5 增量迁移：c_user + email_code + service_application
├── migrate_add_message_extras.sql     # chat_message 扩展字段迁移
├── migrate_add_rag_tables.sql         # RAG 相关表迁移（实验性）
├── import_knowledge.py                # ★ 知识库 CSV 导入（37 行 → kb_knowledge）
├── add_form_schema.py                 # 给 service_items.json 追加 form_schema 字段（一次性）
├── test_web_search.py                 # ★ 联网搜索冒烟测试
├── review_e2e_test.mjs                # Node.js E2E 端到端回顾测试
├── searxng-settings.yml               # SearXNG Docker 容器参考配置（非自动启动）
├── start_app.ps1                      # Windows 一键启动（带参数）
├── start_real.sh                      # macOS/Linux 启动脚本
├── check_env.ps1                      # Windows 环境检查
├── enter_env.ps1                      # venv 激活脚本
├── convert_with_word.vbs              # Word→TXT 转换辅助（VBScript）
├── verify_real.sh                     # 生产环境验证脚本
├── package.json                       # Node 脚本依赖（E2E 测试用）
├── package-lock.json
└── __init__.py                        # Python 包标记
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| 全量建表（含默认数据） | `init_db.sql` | 7 张表 + admin/admin123 默认用户；**生产前必改密码** |
| 新增 Phase 5 表 | `migrate_add_in_chat_submission.sql` | c_user / email_verification_code / service_application |
| 导入知识库 | `import_knowledge.py` | `--truncate` 清空重导；从 `data/knowledge.csv` 读取 |
| 联网搜索验证 | `test_web_search.py` | 需 `WEB_SEARCH_ENABLED=true` + SearXNG 运行中 |
| 表单 schema 注入 | `add_form_schema.py` | 给 `data/service_items.json` 的 7 个事项各加 form_schema |
| Windows 启动 | `start_app.ps1` | 带参启动：`-DbPassword "密码" -EnableWebSearch` |
| macOS/Linux 启动 | `start_real.sh` | 等价于 `PORT=5050 SERVE_SPA=true python app.py` |
| E2E 回顾测试 | `review_e2e_test.mjs` | `node review_e2e_test.mjs`；需 Flask 运行中 |

## CONVENTIONS

- **所有 Python 脚本从项目根运行**：`python scripts/import_knowledge.py` 不是 `cd scripts && python import_knowledge.py`。
- **SQL 文件不含 `CREATE DATABASE`**：先手动 `CREATE DATABASE gov` 再导入 DDL。
- **MySQL 用户用 `root@localhost`**：`init_db.sql` 里没有 `GRANT`，假设已有 root 权限。
- **PowerShell 脚本仅 Windows**：macOS/Linux 用户直接 `python app.py` 或 `bash start_real.sh`。
- **敏感信息不写死**：`scripts/init_db.sql` 有默认密码 `admin123`，生产使用前必须改 `SHA2(CONCAT('你的密码','govchat2026salt01'),256)`。

## ANTI-PATTERNS

- **不要在 CI/CD 中运行 `import_knowledge.py --truncate`**：会清空生产知识库；仅初始化环境用。
- **不要跳过 `init_db.sql` 直接跑迁移**：迁移依赖基础表结构；先跑 DDL 再跑迁移。
- **不要把 `scripts/searxng-settings.yml` 当自动配置**：是参考样例，SearXNG 服务需手动部署（Docker）。
- **不要在 `import_knowledge.py` 里改字段映射**：它假定 CSV 列名 = 数据库列名（`question/answer/category/keywords/weight`）。

## NOTES

- `migrate_add_rag_tables.sql` 是实验性迁移，与 Phase 5 无关；正式启用前 RAG pipeline 未完成。
- `convert_with_word.vbs` 仅 Windows 可用；用于 docx→txt 的 Word 自动化转换。
- `review_e2e_test.mjs` 使用 Node.js 原生 fetch，无需额外依赖（`package.json` 仅声明 type:module）。
