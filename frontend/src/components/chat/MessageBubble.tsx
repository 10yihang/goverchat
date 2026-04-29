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
  CornerDownRight,
  Phone,
  MessageSquare,
  MapPin,
} from "lucide-react"

import { Badge, Button } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { AnswerSource, FormPrompt, KnowledgeSource, ServiceCard, ActionCard } from "@/types/api"
import { useFormSchema } from "@/hooks/api/useApplication"
import { InlineServiceForm } from "./InlineServiceForm"
import { FeedbackButtons } from "./FeedbackButtons"
import { api } from "@/lib/apiClient"
import { toast } from "sonner"

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
  follow_up_questions?: string[]
  action_card?: ActionCard | null
  id?: number
  _streaming?: boolean
}

interface MessageBubbleProps {
  message: DisplayMessage
  onFollowUpClick?: (text: string) => void
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value === 0) return <Badge tone="warning">兜底</Badge>
  const pct = Math.round(value * 100)
  const tone = value >= 0.6 ? "success" : value >= 0.3 ? "primary" : "neutral"
  return <Badge tone={tone}>{pct}%</Badge>
}

function AnswerSourceBadge({ source }: { source: AnswerSource }) {
  const label = source === "knowledge" ? "知识库" : source === "llm_rag" ? "RAG" : "联网"
  const tone = source === "knowledge" ? "primary" : source === "llm_rag" ? "success" : "gold"
  return <Badge tone={tone}>{label}</Badge>
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

export function MessageBubble({ message, onFollowUpClick }: MessageBubbleProps) {
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
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {message._streaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm" style={{ background: "var(--color-primary)" }} />
            )}
          </p>
        </div>

        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {message.confidence !== undefined && (
              <ConfidenceBadge value={message.confidence} />
            )}
            {message.answer_source && <AnswerSourceBadge source={message.answer_source} />}
            {message.msg_type === "voice" && <Badge tone="neutral">语音</Badge>}
            {!message._streaming && message.id && (
              <FeedbackButtons messageId={message.id} />
            )}
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
            prefill={formPrompt.prefill ?? null}
          />
        )}

        {!isUser && !formPrompt && manualFormOpen && card && card.has_form && (
          <OnDemandForm card={card} />
        )}

        {!isUser && !message._streaming && message.follow_up_questions && message.follow_up_questions.length > 0 && onFollowUpClick && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">您可能还想问：</p>
            <div className="flex flex-wrap gap-1.5">
              {message.follow_up_questions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onFollowUpClick(q)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-muted)]"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-primary)",
                  }}
                >
                  <CornerDownRight className="h-3 w-3" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isUser && !message._streaming && message.action_card && (
          <ActionCardInline card={message.action_card} />
        )}
      </div>
    </div>
  )
}

function ActionCardInline({ card }: { card: ActionCard }) {
  const [leaving, setLeaving] = useState(false)
  const [leaveMsg, setLeaveMsg] = useState("")
  const [leaveSent, setLeaveSent] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  async function handleLeave() {
    if (!leaveMsg.trim()) return
    setLeaving(true)
    try {
      await api.post("/api/chat/leave-message", { content: leaveMsg.trim() })
      setLeaveSent(true)
      toast.success("留言已提交")
    } catch {
      toast.error("留言提交失败")
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div
      className="gov-card mt-3 max-w-sm"
      style={{ borderLeft: "3px solid var(--color-accent-gold)" }}
    >
      <div className="p-3">
        <p className="text-sm font-bold">{card.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.actions.map((action, i) => {
            if (action.type === "tel") {
              return (
                <a key={i} href={`tel:${action.value}`} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-[var(--color-muted)]" style={{ borderColor: "var(--color-border)" }}>
                  <Phone className="h-3 w-3" />{action.label}
                </a>
              )
            }
            if (action.type === "navigate") {
              return (
                <Link key={i} to={action.value} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-[var(--color-muted)]" style={{ borderColor: "var(--color-border)" }}>
                  <MapPin className="h-3 w-3" />{action.label}
                </Link>
              )
            }
            if (action.type === "leave_message") {
              if (leaveSent) {
                return <span key={i} className="text-xs" style={{ color: "var(--color-success)" }}>✅ 留言已提交</span>
              }
              if (showLeave) {
                return (
                  <div key={i} className="w-full space-y-1.5">
                    <input
                      className="w-full rounded border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--color-border)" }}
                      placeholder="请留下您的问题和联系方式..."
                      value={leaveMsg}
                      onChange={(e) => setLeaveMsg(e.target.value)}
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleLeave}
                        disabled={leaving || !leaveMsg.trim()}
                        className="rounded px-2 py-0.5 text-xs text-white"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {leaving ? "提交中…" : "发送"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLeave(false)}
                        className="rounded px-2 py-0.5 text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setShowLeave(true)}
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-[var(--color-muted)]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <MessageSquare className="h-3 w-3" />{action.label}
                </button>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}
