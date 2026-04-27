import { useLLMChatToggle, useSetLLMChatToggle } from "@/hooks/api/useAdmin"
import { Badge, Skeleton } from "@/components/ui"
import { Zap, ZapOff, Loader2 } from "lucide-react"

export function RuntimeControls() {
  const { data, isLoading } = useLLMChatToggle()
  const toggle = useSetLLMChatToggle()

  if (isLoading) return <Skeleton className="h-10 w-64" />

  const status = data ?? { enabled: false, config_enabled: false, llm_available: false }

  return (
    <div className="gov-card flex items-center gap-4 p-4">
      <div className="flex items-center gap-2">
        {status.enabled && status.llm_available ? (
          <Zap className="h-5 w-5 text-green-600" />
        ) : (
          <ZapOff className="h-5 w-5 text-[var(--color-muted-foreground)]" />
        )}
        <span className="text-sm font-medium">RAG 对话</span>
      </div>

      <button
        type="button"
        onClick={() => toggle.mutate(!status.enabled)}
        disabled={!status.config_enabled || toggle.isPending}
        className="relative h-6 w-11 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: status.enabled
            ? "var(--color-success)"
            : "var(--color-muted)",
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ left: status.enabled ? "calc(100% - 22px)" : "2px" }}
        />
        {toggle.isPending && (
          <Loader2 className="absolute top-0.5 h-5 w-5 animate-spin text-white" style={{ left: status.enabled ? "calc(100% - 22px)" : "2px" }} />
        )}
      </button>

      <div className="flex items-center gap-1.5">
        {!status.config_enabled && <Badge tone="warning">配置关闭</Badge>}
        {!status.llm_available && status.config_enabled && <Badge tone="neutral">LLM 不可用</Badge>}
        {status.config_enabled && status.llm_available && (
          <Badge tone={status.enabled ? "success" : "neutral"}>
            {status.enabled ? "已启用" : "已关闭"}
          </Badge>
        )}
      </div>
    </div>
  )
}
