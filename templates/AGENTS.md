# templates/ — 旧 Jinja 模板（已弃用）

> **状态**：本目录里的 7 个 HTML 文件已于 React 迁移（Phase 4）后删除。前端整体迁移到 `../frontend/` 的 React SPA。**留这个 AGENTS.md 是为了让来读历史的人知道发生了什么。**

## 现在这里

```
templates/
└── AGENTS.md      # 你正在看的文件
```

仅一个文件。Flask 工厂仍把 `templates/` 注册为 `template_folder`，因为 `app.py:create_app()` 当 `SERVE_SPA` 未设时还能 `render_template(...)`（13 条路由仍在 `if not SERVE_SPA:` 块内，作为应急回退）。但目录里已无 .html 文件 —— **回退到模板模式需要先恢复文件**（见下文）。

## 历史

迁移前曾包含：
- `index.html` (692 LOC) · 首页
- `chat.html` (83 LOC) · 聊天页（外联 `static/js/chat.js`，645 LOC）
- `admin.html` (651 LOC) · 后台（内联 JS 全在文件里）
- `login.html` (180 LOC)
- `guide.html` (332 LOC)
- `service_center.html` (626 LOC) · 外联 `static/js/service_center.js`，392 LOC
- `docs.html` (177 LOC)

合计约 **2741 LOC HTML + 1037 LOC JS + 666 LOC CSS**。无 Jinja 继承（每页独立），4 个页面把整段 JS 写在 `<script>` 里。

## 备份位置

`../_archive_old_frontend/` 保留了完整 .html / .js / .css 副本（Phase 4 cutover 时 `cp` 过去）。**不要 commit 这个 archive 目录** —— 加进 `.gitignore` 或定期清理。

## 想回退到旧前端？

```bash
# 1. 恢复文件
cp _archive_old_frontend/*.html templates/
mkdir -p static/css static/js
cp _archive_old_frontend/css/* static/css/
cp _archive_old_frontend/js/* static/js/

# 2. 启动时不设 SERVE_SPA
python app.py     # → http://localhost:5000 走旧 Jinja 模板
```

## 推荐

确认 React SPA 在生产稳定运行 1-2 个版本周期后：
1. 删除 `_archive_old_frontend/`
2. 删除 `app.py:create_app()` 里 `if not SERVE_SPA:` 包住的 13 条 `render_template` 路由
3. 删除 `from flask import render_template` 的 `render_template` 导入
4. 删除本目录（`rm -rf templates/`），同时改 `Flask(template_folder="templates")` 为不传或传别的
5. 删除本 AGENTS.md
