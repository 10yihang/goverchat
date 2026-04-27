import { Card, CardContent, Skeleton, Badge } from "@/components/ui"
import { useAdminOverview } from "@/hooks/api/useAdmin"
import { formatDateTime } from "@/lib/utils"
import {
  Users,
  Database,
  MessageSquare,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import type { AdminOverview } from "@/types/api"
import { RuntimeControls } from "./RuntimeControls"

interface OverviewTabProps {
  enablePolling: boolean
}

const KPI_CONFIG = [
  { key: "user_count" as const, label: "用户总数", icon: Users, accent: "var(--color-primary)" },
  { key: "knowledge_count" as const, label: "知识条目", icon: Database, accent: "var(--color-accent-gold)" },
  { key: "session_count" as const, label: "会话总数", icon: MessageSquare, accent: "var(--color-success)" },
  { key: "message_count" as const, label: "消息总数", icon: BarChart3, accent: "#8b5cf6" },
]

export function OverviewTab({ enablePolling }: OverviewTabProps) {
  const { data, isLoading } = useAdminOverview({ enablePolling })
  const overview = data?.overview

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!overview) return null

  return (
    <div className="space-y-6">
      <RuntimeControls />
      <KpiCards overview={overview} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSessions sessions={overview.recent_sessions} />
        <CategoryChart categories={overview.categories} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <HotQuestions questions={overview.hot_questions} />
        <RuntimeMetrics metrics={overview.metrics} overview={overview} />
      </div>
    </div>
  )
}

function KpiCards({ overview }: { overview: AdminOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {KPI_CONFIG.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.key} className="relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full w-1"
              style={{ background: kpi.accent }}
            />
            <CardContent className="flex items-center gap-4 p-5 pl-6">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: `color-mix(in oklab, ${kpi.accent} 12%, transparent)`,
                  color: kpi.accent,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-2xl font-bold">{overview[kpi.key].toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function RecentSessions({
  sessions,
}: {
  sessions: AdminOverview["recent_sessions"]
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">近期会话</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无会话记录</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 8).map((s) => (
              <div
                key={s.session_id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--color-muted)]"
              >
                <span className="truncate font-mono text-xs text-muted-foreground" style={{ maxWidth: "45%" }}>
                  {s.session_id.slice(0, 8)}…
                </span>
                <span className="text-xs text-muted-foreground">{s.message_count} 条</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(s.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CategoryChart({
  categories,
}: {
  categories: AdminOverview["categories"]
}) {
  const maxCount = Math.max(...categories.map((c) => c.count), 1)

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">分类分布</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无分类数据</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{cat.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat.count} 条 ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(cat.count / maxCount) * 100}%`,
                      background: "var(--color-primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HotQuestions({
  questions,
}: {
  questions: AdminOverview["hot_questions"]
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">热门问题</h3>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无热门问题</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--color-muted)]"
              >
                <span className="truncate" style={{ maxWidth: "75%" }}>
                  {q.question}
                </span>
                <Badge tone="primary">{q.count} 次</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RuntimeMetrics({
  metrics,
  overview,
}: {
  metrics: AdminOverview["metrics"]
  overview: AdminOverview
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">运行指标</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCell label="请求总数" value={metrics.request_count.toLocaleString()} />
          <MetricCell label="平均耗时" value={`${metrics.avg_duration_ms.toFixed(0)} ms`} />
          <MetricCell
            label="慢请求"
            value={String(metrics.slow_request_count)}
            warn={metrics.slow_request_count > 0}
          />
          <MetricCell
            label="错误数"
            value={String(metrics.error_count)}
            warn={metrics.error_count > 0}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          {overview.tfidf_ready ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-success)" }} />
          ) : (
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-warning)" }} />
          )}
          <span>TF-IDF 索引：{overview.tfidf_ready ? "就绪" : "未就绪"}</span>
          {overview.tfidf_last_reload_at && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDateTime(overview.tfidf_last_reload_at * 1000)}
            </span>
          )}
        </div>

        {metrics.top_paths.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">热门路径</p>
            <div className="space-y-1">
              {metrics.top_paths.slice(0, 5).map((p) => (
                <div key={p.path} className="flex items-center justify-between text-xs">
                  <span className="truncate font-mono text-muted-foreground" style={{ maxWidth: "70%" }}>
                    {p.path}
                  </span>
                  <span>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCell({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: "var(--color-border)" }}>
      <p className="font-serif text-xl font-bold" style={warn ? { color: "var(--color-warning)" } : undefined}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
