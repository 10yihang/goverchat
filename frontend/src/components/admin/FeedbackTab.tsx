import { useState } from "react"
import { useFeedbackList } from "@/hooks/api/useAdmin"
import { Card, CardContent, Badge, Skeleton } from "@/components/ui"
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

type FilterTab = "all" | "up" | "down"

const FILTER_OPTIONS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "up", label: "👍 好评" },
  { value: "down", label: "👎 差评" },
]

export function FeedbackTab() {
  const [filter, setFilter] = useState<FilterTab>("all")
  const { data, isLoading } = useFeedbackList(filter === "all" ? undefined : filter)

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  }

  const stats = data?.stats ?? { total: 0, up: 0, down: 0, satisfaction_rate: 0 }
  const items = data?.items ?? []

  const statCards = [
    { label: "反馈总数", value: stats.total, icon: MessageSquare, accent: "var(--color-primary)" },
    { label: "好评", value: stats.up, icon: ThumbsUp, accent: "var(--color-success)" },
    { label: "差评", value: stats.down, icon: ThumbsDown, accent: "var(--color-destructive)" },
    { label: "满意率", value: `${Math.round(stats.satisfaction_rate * 100)}%`, icon: TrendingUp, accent: "var(--color-accent-gold)" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-md"
                  style={{ background: `color-mix(in oklab, ${s.accent} 15%, white)` }}
                >
                  <Icon className="h-4 w-4" style={{ color: s.accent }} />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{s.label}</p>
                  <p className="font-mono text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: filter === opt.value ? "var(--color-primary)" : "var(--color-muted)",
              color: filter === opt.value ? "var(--color-primary-foreground)" : "var(--color-foreground)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">暂无反馈数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="px-3 py-2 text-left font-medium text-[var(--color-muted-foreground)]">时间</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--color-muted-foreground)]">用户问题</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--color-muted-foreground)]">回答摘要</th>
                <th className="px-3 py-2 text-center font-medium text-[var(--color-muted-foreground)]">评价</th>
              </tr>
            </thead>
            <tbody>
              {items.map((fb) => (
                <tr key={fb.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">
                    {fb.created_at ? formatDateTime(fb.created_at) : "-"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5">{fb.user_question ?? "-"}</td>
                  <td className="max-w-[300px] truncate px-3 py-2.5 text-[var(--color-muted-foreground)]">
                    {fb.bot_answer ?? "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {fb.rating === "up" ? (
                      <Badge tone="success">👍</Badge>
                    ) : (
                      <Badge tone="danger">👎</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
