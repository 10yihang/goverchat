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
} from "lucide-react"
import { useProgressQuery } from "@/hooks/api/useService"
import { formatDateTime } from "@/lib/utils"
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
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{record.status}</Badge>
        <Badge tone="gold">{record.stage}</Badge>
        {record.is_real ? (
          <Badge tone="success">实时记录</Badge>
        ) : (
          <Badge tone="neutral">演示数据</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          更新于 {formatDateTime(record.updated_at)}
        </span>
      </div>

      {(record.service_title || record.applicant_name) && (
        <div
          className="rounded-md p-3 text-xs"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 5%, transparent)",
            borderLeft: "2px solid var(--color-primary)",
          }}
        >
          {record.service_title && (
            <div>
              <span className="text-muted-foreground">事项：</span>
              <span className="font-medium">{record.service_title}</span>
            </div>
          )}
          {record.applicant_name && (
            <div className="mt-1">
              <span className="text-muted-foreground">申请人：</span>
              <span className="font-medium">{record.applicant_name}</span>
            </div>
          )}
          <div className="mt-1">
            <span className="text-muted-foreground">受理编号：</span>
            <span className="font-mono font-medium">{record.query_no}</span>
          </div>
        </div>
      )}

      <Timeline entries={record.timeline} />

      {record.next_step && (
        <div className="rounded-md border p-3" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-xs font-semibold text-muted-foreground">下一步</span>
          <p className="mt-1 text-sm">{record.next_step}</p>
        </div>
      )}

      {record.admin_remark && (
        <div
          className="rounded-md p-3"
          style={{
            background: "color-mix(in oklab, var(--color-accent-gold) 8%, transparent)",
            borderLeft: "2px solid var(--color-accent-gold)",
          }}
        >
          <span className="text-xs font-semibold text-muted-foreground">办理人员备注</span>
          <p className="mt-1 text-sm">{record.admin_remark}</p>
        </div>
      )}

      {record.pending_materials.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-muted-foreground">待补材料</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {record.pending_materials.map((m, i) => (
              <Badge key={i} tone="warning">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Timeline({ entries }: { entries: ProgressTimelineEntry[] }) {
  return (
    <div className="relative ml-3 space-y-4 border-l" style={{ borderColor: "var(--color-primary)" }}>
      {entries.map((entry, i) => (
        <div key={i} className="relative pl-6">
          <span
            className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full"
            style={
              entry.done
                ? { background: "var(--color-primary)" }
                : {
                    background: "var(--color-card)",
                    border: "2px solid var(--color-primary)",
                  }
            }
          />
          <div className="flex items-center gap-2">
            {entry.done ? (
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "var(--color-primary)" }}
              />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{entry.label}</span>
          </div>
          {entry.time && (
            <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
              {entry.time}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
