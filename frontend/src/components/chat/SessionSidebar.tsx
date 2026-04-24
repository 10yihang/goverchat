import { Plus, Clock } from "lucide-react"
import { Button, Skeleton } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { SessionSummary } from "@/types/api"

interface SessionSidebarProps {
  sessions: SessionSummary[] | undefined
  isLoading: boolean
  activeId: string | null
  onSelect: (sid: string) => void
  onNew: () => void
  isCreating: boolean
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 月前`
}

export function SessionSidebar({
  sessions,
  isLoading,
  activeId,
  onSelect,
  onNew,
  isCreating,
}: SessionSidebarProps) {
  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col border-r"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-serif text-sm font-bold">历史会话</h2>
        <Button variant="ghost" size="sm" onClick={onNew} disabled={isCreating}>
          <Plus className="h-3.5 w-3.5" />
          新建
        </Button>
      </div>

      <div className="chat-scroll flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <p className="px-4 py-8 text-center text-xs text-[var(--color-muted-foreground)]">
            暂无历史会话
          </p>
        )}

        {sessions?.map((s) => {
          const isActive = s.session_id === activeId
          return (
            <button
              key={s.session_id}
              type="button"
              onClick={() => onSelect(s.session_id)}
              className={cn(
                "gov-card mb-1.5 w-full cursor-pointer p-3 text-left transition-all hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]",
                isActive && "border-l-[3px]"
              )}
              style={isActive ? { borderLeftColor: "var(--color-accent-gold)" } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 truncate text-sm font-medium">
                  {s.preview || s.title || s.session_id.slice(0, 8)}
                </p>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    background: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  {s.message_count}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]">
                <Clock className="h-3 w-3" />
                {relativeTime(s.updated_at)}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

interface MobileDrawerProps extends SessionSidebarProps {
  open: boolean
  onClose: () => void
}

export function SessionDrawer({ open, onClose, ...rest }: MobileDrawerProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--color-background)]">
        <SessionSidebar {...rest} />
      </div>
    </>
  )
}
