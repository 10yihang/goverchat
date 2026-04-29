import { Copy, Trash2, Presentation } from "lucide-react"
import { Button } from "@/components/ui"
import { toast } from "sonner"

interface ChatTopBarProps {
  sessionId: string | null
  onClear: () => void
  onDemoToggle?: () => void
  demoActive?: boolean
}

export function ChatTopBar({ sessionId, onClear, onDemoToggle, demoActive }: ChatTopBarProps) {
  const title = sessionId ? `会话 ${sessionId.slice(0, 8)}…` : "新会话"

  function handleCopy() {
    if (!sessionId) return
    navigator.clipboard.writeText(sessionId).then(
      () => toast.success("会话 ID 已复制"),
      () => toast.error("复制失败")
    )
  }

  return (
    <div
      className="flex h-11 shrink-0 items-center justify-between border-b px-6"
      style={{ borderColor: "var(--color-border)" }}
    >
      <h2 className="truncate font-serif text-sm font-bold">{title}</h2>
      <div className="flex items-center gap-1">
        {onDemoToggle && (
          <Button
            variant={demoActive ? "gold" : "ghost"}
            size="icon"
            onClick={onDemoToggle}
            title="演示模式"
            className="h-7 w-7"
          >
            <Presentation className="h-3.5 w-3.5" />
          </Button>
        )}
        {sessionId && (
          <Button variant="ghost" size="icon" onClick={handleCopy} title="复制会话 ID" className="h-7 w-7">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClear} title="新建会话" className="h-7 w-7">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
