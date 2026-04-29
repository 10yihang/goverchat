import { Card, CardContent, Skeleton, Badge } from "@/components/ui"
import { useAdminOverview, useHealthCheck } from "@/hooks/api/useAdmin"
import { formatDateTime } from "@/lib/utils"
import {
  Users,
  Database,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Activity,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBar,
  Bar,
} from "recharts"
import type { AdminOverview, HealthCheckItem } from "@/types/api"
import { RuntimeControls } from "./RuntimeControls"

interface OverviewTabProps {
  enablePolling: boolean
}

const KPI_CONFIG = [
  { key: "user_count" as const, label: "管理员", icon: Users, accent: "var(--color-primary)" },
  { key: "c_user_count" as const, label: "C端用户", icon: UserCheck, accent: "var(--color-success)", fallback: 0 },
  { key: "knowledge_count" as const, label: "知识条目", icon: Database, accent: "var(--color-accent-gold)" },
  { key: "session_count" as const, label: "会话总数", icon: MessageSquare, accent: "#8b5cf6" },
]

const DONUT_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-accent-gold)",
  "#8b5cf6",
  "var(--color-warning)",
  "#ec4899",
  "#06b6d4",
  "#f97316",
]

const APP_STATUS_COLORS: Record<string, string> = {
  "已提交": "#8b5cf6",
  "审核中": "var(--color-primary)",
  "材料待补充": "var(--color-warning)",
  "办理完成": "var(--color-success)",
  "已退回": "var(--color-destructive)",
}

export function OverviewTab({ enablePolling }: OverviewTabProps) {
  const { data, isLoading } = useAdminOverview({ enablePolling })
  const { data: healthData, isLoading: healthLoading } = useHealthCheck()
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
      <HealthCard checks={healthData?.checks} isLoading={healthLoading} />
      <div className="grid gap-6 lg:grid-cols-2">
        <MessageTrendChart data={overview.daily_trend ?? []} />
        <CategoryPieChart categories={overview.categories} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AppStatusChart statusCounts={overview.app_status_counts ?? {}} />
        <RecentSessions sessions={overview.recent_sessions} />
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
        const value = overview[kpi.key] ?? (kpi as { fallback?: number }).fallback ?? 0
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
                <p className="font-serif text-2xl font-bold">{Number(value).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function MessageTrendChart({ data }: { data: AdminOverview["daily_trend"] }) {
  const hasData = data && data.length > 0
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">近 7 天消息量趋势</h3>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            暂无趋势数据
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cnt"
                  name="消息数"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--color-primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CategoryPieChart({ categories }: { categories: AdminOverview["categories"] }) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-serif text-base font-bold">分类分布</h3>
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            暂无分类数据
          </div>
        </CardContent>
      </Card>
    )
  }

  const pieData = categories.map((c) => ({
    name: c.category,
    value: c.count,
  }))

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">分类分布</h3>
        <div className="flex items-center gap-4">
          <div className="h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                      stroke="var(--color-card)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {categories.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="truncate">{cat.category}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {cat.count} 条
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AppStatusChart({ statusCounts }: { statusCounts: Record<string, number> }) {
  const entries = Object.entries(statusCounts)
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 font-serif text-base font-bold">办理申请分布</h3>
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            暂无申请数据
          </div>
        </CardContent>
      </Card>
    )
  }

  const barData = entries.map(([status, count]) => ({
    status,
    count,
    fill: APP_STATUS_COLORS[status] ?? "var(--color-primary)",
  }))

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-serif text-base font-bold">办理申请分布</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBar data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="status" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" name="申请数" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
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

function HealthCard({
  checks,
  isLoading,
}: {
  checks?: HealthCheckItem[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-base font-bold">系统健康状态</h3>
          </div>
          <Skeleton className="mt-3 h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!checks || checks.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-base font-bold">系统健康状态</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">暂无健康数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          <h3 className="font-serif text-base font-bold">系统健康状态</h3>
        </div>
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              {check.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-warning)" }} />
              )}
              <span className="min-w-0 truncate font-medium">{check.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {check.latency_ms != null ? `${check.latency_ms}ms` : check.ok ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
