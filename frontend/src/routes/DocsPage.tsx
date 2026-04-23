import {
  Send,
  Mic,
  History,
  ShieldCheck,
  BookOpen,
  Briefcase,
  Settings,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@/components/ui"
import { GroupSection, type Endpoint } from "@/components/docs/GroupSection"
import type { LucideIcon } from "lucide-react"

interface ApiGroup {
  key: string
  label: string
  icon: LucideIcon
  description: string
  endpoints: Endpoint[]
}

const GROUPS: ApiGroup[] = [
  {
    key: "chat",
    label: "智能问答",
    icon: Send,
    description: "文本问答与会话管理",
    endpoints: [
      {
        id: "chat-send",
        method: "POST",
        path: "/api/chat/send",
        description: "发送文本问题，返回知识库检索结果",
        request: `{
  "session_id": "可选，UUID 会话标识",
  "text": "如何办理驾驶证期满换证？"
}`,
        response: `{
  "session_id": "a1b2c3d4-...",
  "answer": "办理驾驶证期满换证需要...",
  "confidence": 0.8231,
  "knowledge_id": 12,
  "sources": [
    { "id": 12, "question": "驾驶证换证", "score": 0.82 }
  ],
  "service_card": { "slug": "license-renewal", "title": "驾驶证换证" },
  "answer_source": "knowledge_base"
}`,
      },
      {
        id: "chat-new-session",
        method: "POST",
        path: "/api/chat/session/new",
        description: "创建新会话，返回 session_id (201)",
        response: `// 201 Created
{
  "session_id": "e5f6a7b8-..."
}`,
      },
    ],
  },
  {
    key: "multimodal",
    label: "多模态",
    icon: Mic,
    description: "语音转写 (Whisper) 与图片识别 (Tesseract)",
    endpoints: [
      {
        id: "voice-upload",
        method: "POST",
        path: "/api/voice/upload",
        description: "上传音频文件，Whisper 转写后自动问答",
        hints: ["503 Whisper 未就绪"],
        request: `// multipart/form-data
audio: Blob (音频文件)
session_id: 可选`,
        response: `{
  "session_id": "...",
  "text": "转写出的文本",
  "answer": "...",
  "confidence": 0.76,
  "knowledge_id": 5,
  "sources": [...]
}`,
      },
      {
        id: "image-upload",
        method: "POST",
        path: "/api/image/upload",
        description: "上传图片，Tesseract OCR 识别后自动问答",
        hints: ["503 Tesseract 不可用", "422 无法识别文字"],
        request: `// multipart/form-data
image: File (图片文件)
session_id: 可选`,
        response: `{
  "session_id": "...",
  "text": "识别出的文字",
  "input_mode": "image",
  "filename": "upload_xxx.png",
  "answer": "...",
  "confidence": 0.65,
  "sources": [...]
}`,
      },
    ],
  },
  {
    key: "history",
    label: "会话历史",
    icon: History,
    description: "会话列表与消息记录查询",
    endpoints: [
      {
        id: "history-sessions",
        method: "GET",
        path: "/api/history/sessions",
        description: "获取所有会话列表（按更新时间倒序）",
        response: `{
  "sessions": [
    {
      "session_id": "a1b2c3d4-...",
      "message_count": 12,
      "preview": "如何办理驾驶证...",
      "updated_at": "2026-04-20 14:30:00"
    }
  ]
}`,
      },
      {
        id: "history-messages",
        method: "GET",
        path: "/api/history/<session_id>",
        description: "获取指定会话的消息列表（未知 sid 返回空数组，不报 404）",
        response: `{
  "session_id": "a1b2c3d4-...",
  "messages": [
    {
      "role": "user",
      "content": "驾驶证过期了怎么办？",
      "created_at": "2026-04-20 14:28:00"
    },
    {
      "role": "bot",
      "content": "您好，驾驶证过期需要...",
      "created_at": "2026-04-20 14:28:01"
    }
  ]
}`,
      },
    ],
  },
  {
    key: "auth",
    label: "认证",
    icon: ShieldCheck,
    description: "管理员登录、登出与身份校验",
    endpoints: [
      {
        id: "auth-login",
        method: "POST",
        path: "/api/auth/login",
        description: "管理员登录，成功设置 session cookie",
        hints: ["401 用户名或密码错误"],
        request: `{
  "username": "admin",
  "password": "admin123"
}`,
        response: `{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}`,
      },
      {
        id: "auth-logout",
        method: "POST",
        path: "/api/auth/logout",
        description: "登出，清除 session",
        response: `{
  "message": "已退出登录"
}`,
      },
      {
        id: "auth-me",
        method: "GET",
        path: "/api/auth/me",
        description: "获取当前登录状态",
        response: `// 已登录
{
  "authenticated": true,
  "user": { "id": 1, "username": "admin", "role": "admin" }
}

// 未登录
{
  "authenticated": false,
  "user": null
}`,
      },
    ],
  },
  {
    key: "guide",
    label: "业务引导",
    icon: BookOpen,
    description: "常办事项主题列表与详情",
    endpoints: [
      {
        id: "guide-topics",
        method: "GET",
        path: "/api/guide/topics",
        description: "获取所有引导主题列表",
        response: `{
  "items": [
    {
      "slug": "license-renewal",
      "title": "驾驶证期满换证",
      "category": "驾驶证业务",
      "summary": "..."
    }
  ]
}`,
      },
      {
        id: "guide-topic-detail",
        method: "GET",
        path: "/api/guide/topics/<slug>",
        description: "获取指定主题的详细办理步骤与材料",
        response: `{
  "item": {
    "slug": "license-renewal",
    "title": "驾驶证期满换证",
    "steps": ["准备材料", "前往车管所", "..."],
    "materials": ["身份证原件", "驾驶证原件", "..."],
    "tips": "建议提前在线预约..."
  }
}`,
      },
    ],
  },
  {
    key: "service",
    label: "办事服务",
    icon: Briefcase,
    description: "事项目录、详情与办理进度查询",
    endpoints: [
      {
        id: "service-items",
        method: "GET",
        path: "/api/service/items",
        description: "获取事项列表，支持分类和关键词筛选",
        request: `// Query Parameters
?category=驾驶证业务
&keyword=换证`,
        response: `{
  "items": [...],
  "categories": ["驾驶证业务", "机动车业务", "违法处理"],
  "hot_items": [...]
}`,
      },
      {
        id: "service-item-detail",
        method: "GET",
        path: "/api/service/items/<slug>",
        description: "获取指定事项的完整信息",
        response: `{
  "item": {
    "slug": "license-renewal",
    "title": "驾驶证期满换证",
    "category": "驾驶证业务",
    "materials": [...],
    "process": [...],
    "download_files": [...]
  }
}`,
      },
      {
        id: "service-progress",
        method: "POST",
        path: "/api/service/progress/query",
        description: "查询办理进度（演示数据）",
        request: `{
  "service_slug": "license-renewal",
  "query_no": "DL20260401001"
}`,
        response: `{
  "found": true,
  "message": "查询成功",
  "record": {
    "query_no": "DL20260401001",
    "status": "已受理",
    "steps": [
      { "name": "提交申请", "done": true, "time": "2026-04-01" },
      { "name": "审核中", "done": false }
    ]
  }
}`,
      },
    ],
  },
  {
    key: "admin",
    label: "后台管理",
    icon: Settings,
    description: "知识库、用户、事项 CRUD（需管理员权限）",
    endpoints: [
      {
        id: "admin-overview",
        method: "GET",
        path: "/api/admin/overview",
        description: "后台概览：知识条目数、用户数、TF-IDF 状态",
        admin: true,
        response: `{
  "knowledge_count": 37,
  "user_count": 1,
  "session_count": 128,
  "message_count": 456,
  "tfidf_ready": true,
  "tfidf_last_reload_at": "2026-04-20 10:00:00"
}`,
      },
      {
        id: "admin-knowledge-list",
        method: "GET",
        path: "/api/admin/knowledge",
        description: "分页获取知识条目列表",
        admin: true,
        response: `{
  "items": [...],
  "total": 37,
  "page": 1,
  "per_page": 20
}`,
      },
      {
        id: "admin-knowledge-create",
        method: "POST",
        path: "/api/admin/knowledge",
        description: "新增知识条目（触发 TF-IDF 热更新）",
        admin: true,
        request: `{
  "question": "如何办理临时号牌？",
  "answer": "办理临时号牌需要...",
  "category": "机动车业务",
  "keywords": "临时号牌 临牌"
}`,
        response: `{
  "id": 38,
  "message": "创建成功"
}`,
      },
      {
        id: "admin-knowledge-update",
        method: "PUT",
        path: "/api/admin/knowledge/<id>",
        description: "更新知识条目（触发 TF-IDF 热更新）",
        admin: true,
        request: `{
  "question": "更新后的问题",
  "answer": "更新后的回答",
  "category": "驾驶证业务",
  "keywords": "关键词1 关键词2"
}`,
        response: `{
  "message": "更新成功"
}`,
      },
      {
        id: "admin-knowledge-delete",
        method: "DELETE",
        path: "/api/admin/knowledge/<id>",
        description: "删除知识条目（触发 TF-IDF 热更新）",
        admin: true,
        response: `{
  "message": "删除成功"
}`,
      },
      {
        id: "admin-knowledge-reload",
        method: "POST",
        path: "/api/admin/knowledge/reload",
        description: "手动触发 TF-IDF 矩阵异步重建 (202)",
        admin: true,
        response: `// 202 Accepted
{
  "message": "TF-IDF 矩阵重建已启动"
}`,
      },
      {
        id: "admin-users-list",
        method: "GET",
        path: "/api/admin/users",
        description: "获取管理员用户列表",
        admin: true,
        response: `{
  "users": [
    { "id": 1, "username": "admin", "role": "admin", "created_at": "..." }
  ]
}`,
      },
      {
        id: "admin-users-create",
        method: "POST",
        path: "/api/admin/users",
        description: "新增管理员用户",
        admin: true,
        request: `{
  "username": "editor",
  "password": "secure_password",
  "role": "admin"
}`,
        response: `{
  "id": 2,
  "message": "用户创建成功"
}`,
      },
      {
        id: "admin-users-update",
        method: "PUT",
        path: "/api/admin/users/<id>",
        description: "更新用户信息",
        admin: true,
        request: `{
  "username": "editor_v2",
  "role": "admin"
}`,
        response: `{
  "message": "更新成功"
}`,
      },
      {
        id: "admin-service-items-list",
        method: "GET",
        path: "/api/admin/service-items",
        description: "获取办事事项管理列表",
        admin: true,
        response: `{
  "items": [
    { "slug": "license-renewal", "title": "驾驶证期满换证", "category": "..." }
  ]
}`,
      },
      {
        id: "admin-service-items-create",
        method: "POST",
        path: "/api/admin/service-items",
        description: "新增办事事项",
        admin: true,
        request: `{
  "slug": "vehicle-transfer",
  "title": "机动车过户",
  "category": "机动车业务",
  "materials": [...],
  "process": [...]
}`,
        response: `{
  "message": "事项创建成功"
}`,
      },
      {
        id: "admin-service-items-update",
        method: "PUT",
        path: "/api/admin/service-items/<slug>",
        description: "更新办事事项",
        admin: true,
        request: `{
  "title": "机动车过户（更新）",
  "materials": [...]
}`,
        response: `{
  "message": "更新成功"
}`,
      },
      {
        id: "admin-service-items-delete",
        method: "DELETE",
        path: "/api/admin/service-items/<slug>",
        description: "删除办事事项",
        admin: true,
        response: `{
  "message": "删除成功"
}`,
      },
    ],
  },
]

const TOTAL_ENDPOINTS = GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0)

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-12">
      <section className="mb-10">
        <div
          className="rounded-xl px-10 py-12"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, black) 100%)",
            color: "var(--color-primary-foreground)",
          }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest opacity-70">
            RESTful API Reference
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
            API 接口文档
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-85">
            政务智聊后端提供 {TOTAL_ENDPOINTS} 个 RESTful 接口，覆盖文本问答、语音转写、图片识别、会话管理、业务引导、办事服务与后台管理七大模块。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span
              className="rounded-md px-4 py-1.5 text-sm font-bold"
              style={{
                background: "var(--color-accent-gold)",
                color: "var(--color-accent-gold-foreground)",
              }}
            >
              {TOTAL_ENDPOINTS} 个接口
            </span>
            {GROUPS.map((g) => (
              <span key={g.key} className="text-xs opacity-70">
                {g.label}
                <span className="ml-1 font-mono font-bold opacity-90">{g.endpoints.length}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <Tabs defaultValue="chat">
        <TabsList className="mb-6 flex-wrap">
          {GROUPS.map((g) => {
            const Icon = g.icon
            return (
              <TabsTrigger key={g.key} value={g.key} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{g.label}</span>
                <Badge tone="neutral" className="ml-0.5 text-[10px]">
                  {g.endpoints.length}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            <GroupSection
              icon={g.icon}
              title={g.label}
              description={g.description}
              endpoints={g.endpoints}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
