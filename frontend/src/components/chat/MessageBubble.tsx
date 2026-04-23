import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ShieldCheck,
  User,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Briefcase,
  Sparkles,
} from "lucide-react"

import { Badge, Button } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { AnswerSource, FormPrompt, KnowledgeSource, ServiceCard } from "@/types/api"
import { useFormSchema } from "@/hooks/api/useApplication"
import { InlineServiceForm } from "./InlineServiceForm"

export interface DisplayMessage {
  role: "user" | "bot"
  content: string
  msg_type?: "text" | "voice"
  confidence?: number
  knowledge_id?: number | null
  created_at?: string
  sources?: KnowledgeSource[]
  service_card?: ServiceCard | null
  answer_source?: AnswerSource
  form_prompt?: FormPrompt | null
}

interface MessageBubbleProps {
  message: DisplayMessage
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value === 0) return <Badge tone="warning">兜底</Badge>
  const pct = Math.round(value * 100)
  const tone = value >= 0.6 ? "success" : value >= 0.3 ? "primary" : "neutral"
  return <Badge tone={tone}>{pct}%</Badge>
}

function AnswerSourceBadge({ source }: { source: AnswerSource }) {
  return (
    <Badge tone={source === "knowledge" ? "primary" : "gold"}>
      {source === "knowledge" ? "知识库" : "联网"}
    </Badge>
  )
}

function SourceList({ sources }: { sources: KnowledgeSource[] }) {
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{ color: "var(--color-primary)" }}
      >
        引用 {sources.length} 条
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {sources.map((s, i) => (
            <li
              key={`${s.knowledge_id ?? i}-${i}`}
              className="rounded border px-2.5 py-1.5 text-xs"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-muted)",
              }}
            >
              <span className="text-[var(--color-muted-foreground)]">{s.question}</span>
              <Badge tone="neutral" className="ml-2">
                {Math.round(s.score * 100)}%
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface InlineServiceCardProps {
  card: ServiceCard
  formAlreadyVisible: boolean
  onApplyClick: () => void
}

function InlineServiceCard({ card, formAlreadyVisible, onApplyClick }: InlineServiceCardProps) {
  return (
    <div
      className="gov-card mt-3 max-w-md p-4"
      style={{ borderLeft: "3px solid var(--color-accent-gold)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <Briefcase className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
        <span className="font-serif text-sm font-bold">{card.title}</span>
      </div>
      <Badge tone="gold" className="mb-2">{card.category}</Badge>
      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {card.summary}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          to={`/service-center?slug=${card.slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: "var(--color-primary)" }}
        >
          查看详情 <ArrowRight className="h-3 w-3" />
        </Link>
        {card.has_form && !formAlreadyVisible && (
          <Button
            type="button"
            variant="gold"
            onClick={onApplyClick}
            className="ml-auto h-7 px-2.5 text-xs"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            立即办理
          </Button>
        )}
      </div>
    </div>
  )
}

interface OnDemandFormProps {
  card: ServiceCard
}

function OnDemandForm({ card }: OnDemandFormProps) {
  const { data, isLoading, error } = useFormSchema(card.slug)
  if (isLoading) {
    return (
      <div className="mt-3 max-w-md rounded-md border border-dashed px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
        正在加载办理表单…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="mt-3 max-w-md rounded-md border border-dashed px-3 py-2 text-xs text-red-500">
        无法加载办理表单：{error?.message ?? "未知错误"}
      </div>
    )
  }
  return (
    <InlineServiceForm
      serviceSlug={card.slug}
      serviceTitle={card.title}
      schema={data.form_schema}
      intentSource="manual"
    />
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const [manualFormOpen, setManualFormOpen] = useState(false)

  const card = message.service_card ?? null
  const formPrompt = message.form_prompt ?? null

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isUser ? "var(--color-accent-gold)" : "var(--color-primary)",
          color: isUser ? "var(--color-accent-gold-foreground)" : "var(--color-primary-foreground)",
        }}
      >
        {isUser ? <User className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[75%] min-w-0", isUser && "text-right")}>
        <div
          className={cn("inline-block rounded-md px-4 py-2.5 text-sm leading-relaxed", isUser && "text-left")}
          style={
            isUser
              ? {
                  background:
                    "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, black) 100%)",
                  color: "var(--color-primary-foreground)",
                  borderLeft: "2px solid var(--color-accent-gold)",
                }
              : {
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }
          }
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {message.confidence !== undefined && (
              <ConfidenceBadge value={message.confidence} />
            )}
            {message.answer_source && <AnswerSourceBadge source={message.answer_source} />}
            {message.msg_type === "voice" && <Badge tone="neutral">语音</Badge>}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceList sources={message.sources} />
        )}

        {!isUser && card && (
          <InlineServiceCard
            card={card}
            formAlreadyVisible={!!formPrompt || manualFormOpen}
            onApplyClick={() => setManualFormOpen(true)}
          />
        )}

        {!isUser && formPrompt && (
          <InlineServiceForm
            serviceSlug={formPrompt.service_slug}
            serviceTitle={formPrompt.service_title}
            schema={formPrompt.form_schema}
            intentSource={formPrompt.intent_source}
          />
        )}

        {!isUser && !formPrompt && manualFormOpen && card && card.has_form && (
          <OnDemandForm card={card} />
        )}
      </div>
    </div>
  )
}
