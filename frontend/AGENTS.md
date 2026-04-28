# frontend/ — React 19 SPA

> 父：`../AGENTS.md`。React 单页应用，构建产物喂给 Flask 静态托管（`SERVE_SPA=true`）。

## OVERVIEW

Vite + React 19 + TypeScript + Tailwind v4 + TanStack Query v5 + Zustand + React Router v6。**~9055 LOC TS / ~64 文件**。所有数据来自 Flask `/api/*`（同源，dev 通过 vite proxy）。无 SSR、无状态共享后端。生产构建 105 KB gzipped 首屏。

## STRUCTURE

```
frontend/
├── package.json
├── vite.config.ts        # base:'./', proxy /api → :5000, outDir ../static/dist
├── tsconfig.app.json     # path alias @/* → ./src/*
├── index.html            # 唯一 HTML 入口
└── src/
    ├── main.tsx          # createRoot + StrictMode
    ├── App.tsx           # Router + QueryClientProvider + Toaster + Lazy 11 routes
    ├── routes/           # 11 个页面（含 NotFoundPage + AdminLoginPage）
    ├── components/
    │   ├── ui/           # 13 个 shadcn 风格基础组件（Button/Card/Tabs/Dialog/Table/Select/...）
    │   ├── layout/       # Header / Footer / ProtectedRoute / CAuthGuard / PageLoader / ErrorBoundary / AppLayout
    │   ├── chat/         # 7 个组件：MessageBubble / ChatComposer / SessionSidebar / QuickPanel / MessageList / ChatTopBar / TypingIndicator
    │   ├── admin/        # 7 个：4 个 Tab + 3 个 FormDialog（含 application Tab）
    │   ├── service/      # 4 个：CategoryFilter / ItemCard / ItemDetail / ProgressForm
    │   ├── guide/        # 2 个：TopicSidebar / TopicDetail
    │   ├── halls/        # 6 个：地图 + 列表 + 详情（附近政务大厅模块）
    │   └── docs/         # 2 个：EndpointCard / GroupSection
    ├── hooks/
    │   ├── api/          # 8 个 domain hooks：useAuth / useCAuth / useChat / useGuide / useService / useAdmin / useApplication / useHalls
    │   └── useVoiceRecorder.ts  # MediaRecorder 自定义 hook
    ├── stores/           # Zustand：cAuthStore + chatStore (activeSessionId, persisted) + uiStore
    ├── lib/              # apiClient (fetch + 503 i18n) + queryClient + utils (cn/formatDateTime)
    ├── types/api.ts      # 10+ 个核心 type，与 Flask 响应 1:1 对齐
    ├── data/             # 静态数据（halls.json 等）
    └── styles/globals.css  # Tailwind v4 + CSS vars (深政务蓝/金/赭红 + Noto Serif/Sans/Mono)
```

## WHERE TO LOOK

| Task | File:Symbol |
|------|-------------|
| 改 API 调用（24 个 hooks 总览） | `hooks/api/use<Domain>.ts` |
| 改主题色 / 字体 / 间距 | `styles/globals.css`（CSS vars in `@theme` block） |
| 加新 UI 基础组件 | `components/ui/`（自己写 / 复制 shadcn / 装 radix）+ 在 `components/ui/index.ts` 导出 |
| 改 Flask API 错误中文化 | `lib/apiClient.ts` `STATUS_503_MESSAGES` 常量 |
| 改 TanStack Query 默认（staleTime/retry） | `lib/queryClient.ts` |
| 加新页面 | `routes/<Page>.tsx` + `App.tsx` lazy import + Header NAV_ITEMS |
| 改 admin 4 个 Tab 内容 | `components/admin/<Tab>.tsx`（OverviewTab/KnowledgeTab/UsersTab/ServiceItemsTab） |
| 改 C 端邮箱登录 | `routes/LoginPage.tsx` + `hooks/api/useCAuth.ts` + `components/layout/CAuthGuard.tsx` |
| 改聊天内联表单（办理） | `components/chat/MessageBubble.tsx` `form_prompt` 分支 + `hooks/api/useApplication.ts` |
| 改变理申请管理（admin） | `components/admin/ApplicationsTab.tsx` + `hooks/api/useAdmin.ts` 的 application 方法 |
| 改附近政务大厅 | `routes/HallsPage.tsx` + `routes/HallDetailPage.tsx` + `hooks/api/useHalls.ts` |
| 改 chat 消息气泡样式 | `components/chat/MessageBubble.tsx` |
| 改语音录制（MediaRecorder mime/duration） | `hooks/useVoiceRecorder.ts` |
| 改 admin 重建 TF-IDF 轮询逻辑 | `components/admin/KnowledgeTab.tsx` + `useAdminOverview({enablePolling})` |
| dev 启动 | `npm run dev`（5173，自动 proxy /api → 5000） |
| 生产构建 | `npm run build`（产物到 `../static/dist/`） |

## CONVENTIONS

- **数据层单一真相源**：服务端状态 → TanStack Query 缓存；客户端状态 → Zustand。**不要在 useState 里手动复制服务端数据**。
- **API hook 模板**：每个 domain 一个文件，导出 `KEYS` 常量 + `useXxx` 函数。query 用 `useQuery`，mutation 用 `useMutation`。失败 toast 用 `error.message`（apiClient 已 i18n 503）。
- **路由懒加载**：每个 route `React.lazy()` 包；`<Suspense fallback={<PageLoader />}>` 兜底。
- **CSS 变量优先**：内联样式用 `style={{ background: "var(--color-primary)" }}`；不要 hardcode 十六进制颜色。
- **路径别名**：`import { x } from "@/lib/utils"`，不写相对 `../../`。
- **Zustand persist**：`chatStore.activeSessionId` 走 localStorage（key=`gov_session_id`，与旧版兼容）；`cAuthStore` 不持久化（依赖 session cookie）。其他 UI 状态不持久化。
- **shadcn 风格组件命名**：PascalCase 文件名 + 单一组件主导（`Button.tsx`/`Dialog.tsx`/`Tabs.tsx`），副组件用命名 export。
- **Tailwind v4 `@theme`**：所有设计令牌在 `globals.css` 顶部 `@theme` 块；不要散到 tailwind.config.ts（v4 推荐 inline）。

## ANTI-PATTERNS

- **不要用 axios / fetch 直接调 API**：所有调用走 `lib/apiClient` 的 `api.get/post/put/del/upload`，统一带 `credentials: 'include'` + 503 中文化 + ApiError 包装。
- **不要把 chat 消息存进 Zustand**：用 `queryClient.setQueryData(['history', sid], ...)` 做 optimistic update。详见 `hooks/api/useChat.ts` 的 `onMutate` 模式。
- **不要在 route 文件里写超过 200 行**：拆到 `components/<page>/`。AdminPage 是 62 行的 orchestrator + 7 个 Tab/Dialog 子组件即是模板。
- **不要直接用 `MediaRecorder` / `getUserMedia`**：用 `useVoiceRecorder()` 自定义 hook，已处理 mime fallback、unmount cleanup、60s 超时。
- **不要绕过 ProtectedRoute**：admin 路径只能通过 `<ProtectedRoute requireRole="admin">` 包裹访问；否则 `useMe()` 401 也展示页面。
- **不要在生产 bundle 引入 chart 库**：admin 页面 KPI 图用纯 CSS bar（已在 OverviewTab 实现）；想加复杂图先评估首屏 bundle 增量。
- **不要改 vite.config.ts 的 `base: './'`**：Flask 静态托管必须用相对路径（不然 build 出来的 index.html 里 `/assets/...` 会被 Flask 当成路由）。
- **不要把 chat 页面的 CAuthGuard 跳过**：C 端用户必须在邮箱登录后才能进入聊天页和办事中心；未登录自动重定向到 `/login`。
- **不要直接调 `form_prompt` 而不检查 null**：LLM 意图识别不一定返回表单，前端必须 `form_prompt ? <InlineForm .../> : null`。
- **不要把 halls.json 当 API 数据**：`frontend/src/data/halls.json` 是静态演示数据；接真实数据后替换为 API 调用。

## UNIQUE STYLES

- **现代政务专业 + 高级感**：所有页面遵循 HomePage 视觉基准。深政务蓝主色 `oklch(0.35 0.07 245)` ≈ `#1e3a5f`，金色强调 `oklch(0.72 0.13 80)`，赭红警示 `oklch(0.55 0.18 25)`。serif 标题（Noto Serif SC）+ sans 正文（Noto Sans SC）+ mono 数字（JetBrains Mono）。圆角克制（`--radius: 0.5rem`），不超过 12px。
- **gov-card / gov-card-elevated** 工具类：在 `globals.css` `@layer utilities` 里。subtle / elevated 双层阴影，避免互联网产品的"卡片漂浮"风。
- **OKLCH 色彩空间**：`@theme` 全用 OKLCH 而不是 hex；保证跨设备色觉一致 + 易于 mix（`color-mix(in oklab, ...)`）。
- **TanStack Query 缓存策略分级**：
  - 静态数据（guide/topics, service/items detail）：`staleTime: 5min`
  - 列表（service/items, admin/knowledge）：`staleTime: 30-60s`
  - 实时数据（admin/overview 轮询）：`refetchInterval: 3000` 由外部 enable 控制
  - chat history：`staleTime: 0`（消息变更频繁，永远拉最新）
- **TF-IDF 重建轮询**：admin 点重建后，`useAdminOverview({enablePolling: true})` 开始 3s 轮询，前端比较 `tfidf_last_reload_at` 字段判断完成（这字段是 Phase 2 backend 加的）。
- **403/401 不重试**：`queryClient.ts` 的 `retry` 函数显式跳过这俩，避免登录失效后无限重试。

## COMMANDS

```bash
# 安装
npm install                      # 通过 .npmrc 走 npmmirror（中国大陆友好）

# Dev：vite dev server (5173) + 已配 proxy 到 Flask :5000
npm run dev

# 类型检查
npx tsc -b

# 生产构建 → ../static/dist/
npm run build

# 本地 preview built 产物（仅看静态服务效果）
npm run preview
```

## NOTES

- **dev workflow**：终端 A 跑 Flask（`python app.py`，无需 SERVE_SPA），终端 B 跑 `npm run dev`。浏览器开 http://localhost:5173 看新前端，HMR 即时生效；API 调用自动 proxy 到 5000。
- **生产 workflow**：`npm run build` → `SERVE_SPA=true python app.py` → 浏览器开 http://localhost:5000，单端口 React + API。
- **不要 commit `static/dist/`**：构建产物，每次 build 重写。建议 `.gitignore` 加 `static/dist/` 与 `frontend/node_modules/`。
- **shadcn-style 而非 shadcn CLI**：13 个 UI primitives 是手写复制版，不依赖 shadcn CLI（避免 `components.json` 配置 + 与项目结构冲突）。改起来是普通 React 文件。
- **lucide-react** 是 tree-shakeable 的 icon 库，每个图标都单独 chunk（看构建日志的 `*-*.js` 0.13 KB 们）。
