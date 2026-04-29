import { useState, type FormEvent } from "react"
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
} from "@/components/ui"
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Search,
  ArrowRight,
  Share2,
} from "lucide-react"
import { useProgressQuery } from "@/hooks/api/useService"
import { toast } from "sonner"
import type { ServiceItem, ProgressRecord, ProgressTimelineEntry } from "@/types/api"

interface ProgressFormProps {
  items: ServiceItem[]
}

export function ProgressForm({ items }: ProgressFormProps) {
  const [slug, setSlug] = useState("")
  const [queryNo, setQueryNo] = useState("")
  const mutation = useProgressQuery()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!queryNo.trim()) {
      toast.error("请输入受理编号")
      return
    }
    mutation.mutate({ service_slug: slug, query_no: queryNo.trim() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          办理进度查询
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>办事事项（选填）</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger>
                <SelectValue placeholder="不限事项" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>受理编号 *</Label>
            <Input
              value={queryNo}
              onChange={(e) => setQueryNo(e.target.value.toUpperCase())}
              placeholder="如 DL2604A8C3 / DL2026001"
              className="font-mono"
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={mutation.isPending}
          >
            <Search className="h-4 w-4" />
            {mutation.isPending ? "查询中..." : "查询进度"}
          </Button>
        </form>

        {mutation.data && !mutation.data.found && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {mutation.data.message || "未找到相关办理记录"}
            </p>
          </div>
        )}

        {mutation.data?.found && mutation.data.record && (
          <ProgressResult record={mutation.data.record} />
        )}
      </CardContent>
    </Card>
  )
}

function ProgressResult({ record }: { record: ProgressRecord }) {
  const meta = record.status_meta ?? { color: "var(--color-primary)", icon: "help-circle" }
  const color = meta.color.startsWith("#") || meta.color.startsWith("var") ? meta.color : "var(--color-primary)"

  return (
    <div className="mt-6 space-y-5">
      <div
        className="rounded-lg p-4"
        style={{
          background: `color-mix(in oklab, ${color} 8%, transparent)`,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-bold">{record.query_no}</span>
          <Badge tone="primary">{record.status}</Badge>
        </div>
        {record.service_title && (
          <p className="mt-1 text-sm text-muted-foreground">{record.service_title}</p>
        )}
        {record.applicant_name && (
          <p className="text-xs text-muted-foreground">申请人：{record.applicant_name}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          最近更新：{record.updated_at}
          {record.is_real ? <Badge tone="success" className="ml-2 text-[10px]">实时</Badge> : <Badge tone="neutral" className="ml-2 text-[10px]">演示</Badge>}
        </p>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/service-center?slug=${encodeURIComponent(record.service_title || "")}`
            const text = `【政务智聊】办理进度\n受理编号：${record.query_no}\n事项：${record.service_title || ""}\n当前状态：${record.status}\n查询链接：${url}`
            navigator.clipboard.writeText(text).then(
              () => toast.success("已复制分享信息到剪贴板"),
              () => toast.error("复制失败")
            )
          }}
          className="mt-2 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-[var(--color-muted)]"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Share2 className="h-3 w-3" />
          复制分享链接
        </button>
      </div>

      <EnhancedTimeline entries={record.timeline} color={color} />

      {record.next_step && (
        <div className="gov-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4" style={{ color }} />
            <span className="text-sm font-bold">下一步</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{record.next_step}</p>
        </div>
      )}

      {record.pending_materials.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">待补充材料</p>
          <div className="flex flex-wrap gap-1.5">
            {record.pending_materials.map((m, i) => (
              <Badge key={i} tone="warning">{m}</Badge>
            ))}
          </div>
        </div>
      )}

      {record.admin_remark && (
        <div
          className="rounded-md p-3 text-sm"
          style={{
            background: "color-mix(in oklab, var(--color-accent-gold) 8%, transparent)",
            borderLeft: "2px solid var(--color-accent-gold)",
          }}
        >
          <span className="text-xs font-semibold text-muted-foreground">办理备注</span>
          <p className="mt-1">{record.admin_remark}</p>
        </div>
      )}
    </div>
  )
}

function EnhancedTimeline({ entries, color }: { entries: ProgressTimelineEntry[]; color: string }) {
  return (
    <div className="relative">
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1
        const isCurrent = entry.done && (isLast || !entries[i + 1]?.done)

        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isCurrent ? "animate-pulse" : ""
                }`}
                style={{
                  background: entry.done
                    ? color
                    : "var(--color-card)",
                  border: entry.done ? "none" : `2px solid var(--color-border)`,
                  color: entry.done ? "#fff" : "var(--color-muted-foreground)",
                }}
              >
                {entry.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              {!isLast && (
                <div
                  className="w-0.5 grow"
                  style={{
                    background: entry.done
                      ? color
                      : "var(--color-border)",
                    minHeight: "24px",
                  }}
                />
              )}
            </div>

            <div className={`pb-5 ${isLast ? "" : ""}`}>
              <p
                className="text-sm font-semibold"
                style={{ color: entry.done ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}
              >
                {entry.label}
              </p>
              {entry.time ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.time}</p>
              ) : (
                <p className="mt-0.5 text-xs italic text-muted-foreground">等待中</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
