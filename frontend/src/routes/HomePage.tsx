import { Link } from "react-router-dom"
import { MessageSquare, BookOpen, Briefcase, FileCode } from "lucide-react"

const TILES = [
  {
    to: "/chat",
    icon: MessageSquare,
    title: "智能咨询",
    desc: "支持文本、语音、图片三种提问方式，知识库 + 联网检索双引擎兜底。",
    accent: "var(--color-primary)",
  },
  {
    to: "/guide",
    icon: BookOpen,
    title: "业务引导",
    desc: "分主题展开常办事项的办理步骤、所需材料与温馨提示。",
    accent: "var(--color-accent-gold)",
  },
  {
    to: "/service-center",
    icon: Briefcase,
    title: "办事服务",
    desc: "完整事项目录、办理通道、材料清单下载、办理进度查询。",
    accent: "var(--color-primary)",
  },
  {
    to: "/docs",
    icon: FileCode,
    title: "接口文档",
    desc: "31 个 RESTful 接口与三模态调用范例，便于二次开发与集成。",
    accent: "var(--color-accent-gold)",
  },
] as const

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-12">
      <section className="mb-12">
        <div
          className="rounded-xl px-10 py-14"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, black) 100%)",
            color: "var(--color-primary-foreground)",
          }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest opacity-70">
            Government Multimodal Assistant
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
            交通出行政务智能咨询
            <br />
            <span style={{ color: "var(--color-accent-gold)" }}>让政务更近一步</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed opacity-85">
            围绕驾驶证、机动车、违法处理三大领域，整合知识库检索、Whisper
            语音转写、Tesseract 图片识别与可选联网检索，提供"听得懂、答得准、办得了"的政务咨询体验。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/chat"
              className="rounded-md px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
              style={{
                background: "var(--color-accent-gold)",
                color: "var(--color-accent-gold-foreground)",
              }}
            >
              开始咨询 →
            </Link>
            <Link
              to="/service-center"
              className="rounded-md border px-6 py-2.5 text-sm font-medium opacity-90 transition-opacity hover:opacity-100"
              style={{ borderColor: "rgba(255,255,255,0.35)" }}
            >
              查询办事进度
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-bold">核心服务</h2>
          <span className="text-xs text-muted-foreground">点击卡片进入对应模块</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <Link
                key={tile.to}
                to={tile.to}
                className="gov-card group block p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-md"
                  style={{
                    background: `color-mix(in oklab, ${tile.accent} 12%, transparent)`,
                    color: tile.accent,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-serif text-lg font-bold">{tile.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tile.desc}</p>
                <div
                  className="mt-4 inline-flex items-center text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: tile.accent }}
                >
                  立即前往 →
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
