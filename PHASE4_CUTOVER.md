# Phase 4 — React 大爆破切换实施手册

**目标**：把单端口 Flask 应用从 Jinja 模板切换到 React SPA。
**预计耗时**：30–60 分钟（含 QA）。
**风险等级**：低（env 变量一键回滚，不动数据库，不动 API）。
**先决条件**：Phase 0/1/2/3 已完成。

---

## 0. 前置检查（5 分钟）

在 Windows 项目根目录 `C:\...\project_gr\` 运行：

```powershell
# 0.1 确认 Node 与 npm
node --version          # 期望 v18+ ；当前已知作者环境为 v25
npm  --version

# 0.2 确认 Python venv
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip show flask | findstr Version

# 0.3 确认 frontend 依赖已安装；若没有，先装
cd frontend
if (!(Test-Path node_modules)) { npm install }
cd ..

# 0.4 确认数据库可用
mysql -u root -p -e "USE gov_chat; SELECT COUNT(*) FROM kb_knowledge;"
```

如果任何一步失败 —— **停下来修复**，不要继续。

---

## 1. 构建 React 产物（2 分钟）

```powershell
cd frontend
npm run build
cd ..
```

**期望输出**：

```
✓ tsc -b && vite build
✓ 1908 modules transformed.
✓ ../static/dist/index.html        0.91 kB
✓ ../static/dist/assets/index-*.js 332 kB │ gzip: 104 kB
✓ ../static/dist/assets/ui-*.js    101 kB │ gzip:  33 kB
... (各 page chunk)
✓ built in <1s
```

确认：

```powershell
dir static\dist
# 应该看到：index.html、assets\、favicon.svg、icons.svg
```

如果 `static\dist\index.html` 不存在 → 构建失败，回到 Phase 3 排查。

---

## 2. 灰度启动（5 分钟）— 这是关键安全网

**不要立即清理旧模板。** 先用 `SERVE_SPA=true` 启动一次，新旧并存验证：

```powershell
# 终端 A：SPA 模式启动（新前端）
$env:SERVE_SPA="true"
$env:DB_PASSWORD="你的密码"        # 如非默认 Gr040103
.\.venv\Scripts\python.exe app.py
```

期望日志包含：

```
[Startup] SPA mode ON — serving C:\...\project_gr\static\dist
[Startup] TF-IDF matrix loaded
[Startup] Whisper preload thread started
* Running on http://0.0.0.0:5000
```

如果看到 `[Startup] SERVE_SPA=true but .../index.html missing` → **回到第 1 步重新构建**。

---

## 3. 7 路由 + 31 接口冒烟测试（10 分钟）

### 3.1 浏览器手测 7 个路由

打开 http://localhost:5000/ 逐个点：

| 路由 | 验证点 |
|------|--------|
| `/` | 看到深蓝 Hero + 4 张服务卡片 + Header 5 项导航 |
| `/chat` | 看到三栏布局（左：历史会话；中：输入框；右：猜你想问 6 个 chip） |
| `/guide` | 看到主题列表 + 选中主题的步骤 / 材料 / 提示 |
| `/service-center` | 看到 3 stat tiles + 分类 chips + 事项列表 + 进度查询表单 |
| `/docs` | 看到 7 个 Tabs，点开任一接口卡片能展开请求/响应示例 |
| `/login` | 看到居中卡片 + 用户名/密码输入 + 演示账号提示 |
| `/admin` | **未登录** → 应自动跳转到 `/login?next=%2Fadmin` |

### 3.2 登录 + 管理后台验证

- 在 `/login` 输入 admin / admin123（或你改过的密码）→ 自动跳到 `/admin`
- Admin 页面 4 个 Tab 切换：
  - **概览**：看到 4 个 KPI 数字 + 最近会话表 + 分类条形图 + 热门问题表
  - **知识库**：列表加载 + 点"新建知识"弹窗能开 + 点"重建索引"按钮 →
    看到 toast "TF-IDF 重建已触发" → 3-10 秒后看到 toast "✓ 索引已就绪"
  - **用户**：列表加载 + "新建用户"弹窗能开
  - **服务事项**：列表加载 + 表格显示

### 3.3 三模态聊天验证（最关键）

回到 `/chat`：

1. **文本**：输入"驾驶证如何换证" → 回车 → 看到 user 气泡 + bot 气泡 + 置信度徽章 + (可选) 服务卡片
2. **语音**：点 Mic 图标 → 红点开始闪 + 计时 → 说几句话 → 再点 Mic 停止 → 看到上传中指示器 → 看到识别后的 user 气泡（msg_type=voice）+ bot 回答
   - 若 503 错误 "语音模型正在预热" → Whisper 还没加载完，等 30 秒再试
3. **图片**：点图片图标 → 选一张包含中文文字的图 → 看到 OCR 结果作为 user 气泡 + bot 回答
   - 若 503 → OCR 未启用，跳过此步
4. **会话**：左侧栏出现刚才的会话 → 点"新建" → 切换 → 历史会话能拉回

### 3.4 自动化 API 冒烟（可选但推荐）

在另一个终端跑：

```powershell
# 公开接口
curl http://localhost:5000/api/auth/me
curl http://localhost:5000/api/guide/topics
curl http://localhost:5000/api/service/items
curl http://localhost:5000/api/history/sessions
curl -X POST http://localhost:5000/api/chat/session/new

# Admin 接口（先用浏览器登录拿 cookie，或用 curl --cookie-jar）
curl --cookie-jar cookies.txt --cookie cookies.txt `
  -X POST -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}' `
  http://localhost:5000/api/auth/login
curl --cookie cookies.txt http://localhost:5000/api/admin/overview
```

---

## 4. 决策点（关键路口）

### ✅ 一切正常 → 继续到第 5 步「持久化切换」
### ❌ 出问题 → 立即回滚

**回滚方法**：

```powershell
# 关掉 Flask（Ctrl+C），然后：
$env:SERVE_SPA=""
.\.venv\Scripts\python.exe app.py
```

回滚后 Flask 立刻回到 Jinja 模板模式，**完全不影响生产**。React 构建产物只是躺在 `static/dist/` 里没人用。

---

## 5. 持久化切换（5 分钟）

确认 SPA 模式所有功能都正常后，把环境变量持久化：

### 5.1 修改 PowerShell 启动脚本

打开 `scripts/start_app.ps1`，找到 `python app.py` 那一行，**之前**加：

```powershell
$env:SERVE_SPA = "true"
```

或者创建一个新脚本 `scripts/start_app_spa.ps1`：

```powershell
Set-Location $PSScriptRoot/..
$env:SERVE_SPA = "true"
$env:DB_PASSWORD = "你的密码"
.\.venv\Scripts\python.exe app.py
```

### 5.2 macOS / Linux 环境

在 `.envrc` (direnv) 或 shell 启动脚本：

```bash
export SERVE_SPA=true
export DB_PASSWORD=...
python app.py
```

---

## 6. 清理旧前端（10 分钟）— 可延后到下次发版

⚠️ **建议先观察 1-2 天再做这一步**，确保没有遗漏的引用。

### 6.1 备份后删除旧模板

```powershell
# 备份（可选）
mkdir _archive
Copy-Item templates\*.html _archive\

# 删除（保留 templates/AGENTS.md）
Remove-Item templates\index.html
Remove-Item templates\chat.html
Remove-Item templates\login.html
Remove-Item templates\admin.html
Remove-Item templates\guide.html
Remove-Item templates\service_center.html
Remove-Item templates\docs.html
```

### 6.2 删除旧 JS / CSS

```powershell
Remove-Item static\js\chat.js
Remove-Item static\js\service_center.js
Remove-Item static\css\chat.css
# 保留 static\downloads\ —— 7 个材料下载文件还在用
```

### 6.3 简化 app.py

清理后，`app.py` 里 13 个 `render_template` 路由就成了死代码（永远走 `if not SERVE_SPA:` 的 else 分支，但因为 SPA 是默认了，代码永远不执行）。

可以选择 **完全删除**这块（约 60 行）：

```python
# 删除以下整个 if 块（app.py L92-L150 附近）：
if not SERVE_SPA:
    @app.get("/")
    def index():
        ...
    # ... 其余 12 个路由
```

同时删除 `from flask import render_template` 中的 `render_template`（如果不再用）。

或者**保留**这块当 fallback —— 万一以后想临时回到老模板调试也方便。**推荐保留 1-2 个版本周期**。

### 6.4 更新 README

提到新的启动命令：

```bash
# 老的：python app.py
# 新的：
cd frontend && npm install && npm run build && cd ..
SERVE_SPA=true python app.py
```

---

## 7. 验收清单（最终签收）

- [ ] `static/dist/index.html` 存在
- [ ] `SERVE_SPA=true python app.py` 启动无报错
- [ ] http://localhost:5000/ 7 个路由全部正常渲染
- [ ] 三模态聊天（文本/语音/图片）全部能跑通
- [ ] Admin 4 个 Tab 全部加载 + 至少一次 CRUD 成功
- [ ] TF-IDF 重建轮询能正确收尾（看到"✓ 索引已就绪"toast）
- [ ] 浏览器 DevTools Network 面板无 4xx/5xx 异常请求
- [ ] 浏览器 DevTools Console 无 React 报错
- [ ] 启动脚本已更新，新人 clone 项目后跑得通

---

## 8. 已知不变 / 已知遗留

### 不变
- 数据库 schema 与所有 `/api/*` 端点完全一致
- 会话 localStorage key 仍是 `gov_session_id`，旧用户老会话能继续访问
- 鉴权机制（Flask session cookie）不变

### 遗留（**out of scope 此次切换**）
- `/api/history/<sid>` 仍无鉴权（known security debt，需要 schema 变更：`chat_session` 加 `user_id` 列）
- `service_catalog.upsert_item()` 并发写入仍无锁（依赖单管理员前提）
- `DEMO_PROGRESS_RECORDS` 仍是硬编码（5 条演示进度数据）
- `metrics_service` 仍是单进程内存（`gunicorn -w >1` 时各 worker 独立计数）

这些是 React 迁移之外的事，已记录在 `AGENTS.md`/`services/AGENTS.md`。

---

## 9. 发生意外时的应急联系

### 9.1 Flask 启动报 `SERVE_SPA=true but .../index.html missing`
→ 没构建。运行 `cd frontend && npm run build`。

### 9.2 浏览器打开 / 显示 Flask debug 错误
→ SPA 模式下应该看到 React 应用。检查 `os.environ.get("SERVE_SPA")` 是否生效：

```powershell
.\.venv\Scripts\python.exe -c "import os; print('SERVE_SPA=', os.environ.get('SERVE_SPA'))"
```

### 9.3 静态资源 404（CSS/JS 加载失败）
→ 通常是构建产物路径问题。检查 `static/dist/index.html` 里的 `<script src=>` 应该是 `./assets/index-*.js`（**相对路径**）。如果是绝对 `/assets/` 路径，说明 `vite.config.ts` 的 `base: './'` 配置丢了。

### 9.4 API 调用 401/403 但应该已登录
→ 浏览器 DevTools → Network → 看请求头是否带 `Cookie: session=...`。`apiClient.ts` 的 `credentials: 'include'` 应该自动带 cookie。

### 9.5 路由 `/admin` 一直跳转 login
→ 登录请求成功但 cookie 没保存。检查浏览器 Cookie 设置；或者 Flask `SECRET_KEY` 没设置（应该是 `gov-chat-secret-2026` 或你改过的值）。

### 9.6 完全无法解决 → 立即回滚
```powershell
$env:SERVE_SPA=""
.\.venv\Scripts\python.exe app.py
```
Flask 立刻回到 Jinja 模板模式，损失为零。

---

## 10. 完成后的状态

```
project_gr/
├── app.py                    # 改了 2 处（已完成）
├── frontend/                 # 完整 React 工程
│   └── ...                   # （Phase 0-3 产物）
├── static/dist/              # ★ 部署产物（npm run build 输出）
│   ├── index.html
│   └── assets/
├── templates/                # 待清理（第 6 步）
├── routes/ services/ models/ # 完全不变
├── PHASE4_CUTOVER.md         # 本文件
└── AGENTS.md                 # 待更新（推荐做完切换后再更新）
```

---

## 附录 A：app.py 实际改动 diff

Phase 4 已经替你改好了 app.py。以下是 diff 摘要：

```diff
@@ Phase 2 已加（之前完成）@@
+ from flask import abort, send_from_directory   # +2 imports
+ SPA_DIST_DIR = os.path.join(...)
+ SERVE_SPA = os.environ.get("SERVE_SPA", "").lower() in ("1", "true", "yes")

@@ Phase 4 新加 @@
+ if not SERVE_SPA:                              # 把 13 个 render_template 路由
      @app.get("/")                              # 放进条件块
      def index(): ...
      ...                                        # 13 routes total

  @app.errorhandler(404)
  def not_found(error):
      if request.path.startswith("/api/"):
          return jsonify(...), 404
+     if SERVE_SPA:                              # SPA 深链回填
+         return send_from_directory(SPA_DIST_DIR, "index.html")
      return render_template("docs.html"), 404

@@ Phase 2 已加（之前完成）@@
+ if SERVE_SPA:
+     @app.get("/dist/<path:filename>") def spa_asset(...): ...
+     @app.route("/", defaults={"path": ""})
+     @app.route("/<path:path>") def spa_fallback(...): ...
```

净增量 ≈ 30 行。可逆性：100%（删掉 `if not SERVE_SPA:` 的缩进即可恢复模板模式）。
