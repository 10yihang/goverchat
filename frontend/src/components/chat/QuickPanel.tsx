import { Link } from "react-router-dom"
import { Sparkles, Briefcase, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui"
import type { ServiceCard } from "@/types/api"

const QUICK_QUESTIONS = [
  "驾驶证期满换证需要什么材料？",
  "异地车辆年检如何办理？",
  "驾驶证遗失后怎么补办？",
  "如何处理交通违法记录？",
  "新车上牌需要哪些手续？",
  "机动车过户流程是什么？",
]

interface QuickPanelProps {
  onQuickQuestion: (q: string) => void
  serviceCard?: ServiceCard | null
}

export function QuickPanel({ onQuickQuestion, serviceCard }: QuickPanelProps) {
  return (
    <aside
      className="chat-scroll flex h-full w-[320px] shrink-0 flex-col gap-5 overflow-y-auto border-l p-4"
      style={{ borderColor: "var(--color-border)" }}
    >
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
          <h3 className="font-serif text-sm font-bold">猜你想问</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQuickQuestion(q)}
              className="gov-card cursor-pointer px-3 py-2 text-left text-xs leading-relaxed transition-all hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {serviceCard && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
            <h3 className="font-serif text-sm font-bold">推荐办事服务</h3>
          </div>
          <div
            className="gov-card p-4"
            style={{ borderLeft: "3px solid var(--color-accent-gold)" }}
          >
            <h4 className="font-serif text-sm font-bold">{serviceCard.title}</h4>
            <Badge tone="gold" className="mt-1">{serviceCard.category}</Badge>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {serviceCard.summary}
            </p>
            <Link
              to={`/service-center?slug=${serviceCard.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              查看详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
    </aside>
  )
}

interface MobileSheetProps extends QuickPanelProps {
  open: boolean
  onClose: () => void
}

export function QuickSheet({ open, onClose, ...rest }: MobileSheetProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-xl bg-[var(--color-background)] p-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <QuickPanel {...rest} />
      </div>
    </>
  )
}
