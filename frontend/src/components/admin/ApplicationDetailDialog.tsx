import { useState, useMemo, type FormEvent } from "react"
import { toast } from "sonner"

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import { useUpdateApplicationStatus } from "@/hooks/api/useApplication"
import { formatDateTime } from "@/lib/utils"
import type { ApplicationRecord } from "@/types/api"

interface ApplicationDetailDialogProps {
  record: ApplicationRecord
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS = ["已提交", "审核中", "材料待补充", "办理完成", "已退回"] as const

export function ApplicationDetailDialog({ record, open, onClose }: ApplicationDetailDialogProps) {
  const [status, setStatus] = useState<string>(record.status)
  const [remark, setRemark] = useState<string>(record.admin_remark ?? "")
  const updateMut = useUpdateApplicationStatus()

  const formEntries = useMemo(() => {
    const data = record.form_data ?? {}
    return Object.entries(data)
  }, [record.form_data])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!status) {
      toast.error("请选择新状态")
      return
    }
    updateMut.mutate(
      {
        app_id: record.id,
        status,
        admin_remark: remark.trim(),
      },
      {
        onSuccess: () => {
          toast.success("状态已更新，已通过邮件通知用户")
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            申请详情 ·{" "}
            <span className="font-mono text-base">{record.query_no}</span>
          </DialogTitle>
          <DialogDescription>
            {record.service_title} · 提交于 {formatDateTime(record.created_at ?? "")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">申请人信息</h3>
            <div className="space-y-1 text-sm">
              <DetailRow label="姓名" value={record.applicant_name || "—"} />
              <DetailRow label="手机号" value={record.applicant_phone || "—"} />
              <DetailRow label="邮箱" value={record.user_email || "—"} />
              <DetailRow
                label="当前状态"
                value={<Badge tone="primary">{record.status}</Badge>}
              />
              <DetailRow
                label="最后更新"
                value={formatDateTime(record.updated_at ?? "")}
              />
              {record.admin_remark && (
                <DetailRow label="管理员备注" value={record.admin_remark} />
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">表单内容</h3>
            <div
              className="max-h-[280px] space-y-1.5 overflow-y-auto rounded-md border p-3 text-xs"
              style={{
                borderColor: "var(--color-border)",
                background: "color-mix(in oklab, var(--color-muted) 60%, transparent)",
              }}
            >
              {formEntries.length === 0 && (
                <p className="text-muted-foreground">无表单数据</p>
              )}
              {formEntries.map(([k, v]) => (
                <div key={k}>
                  <span className="text-muted-foreground">{k}：</span>
                  <span className="font-medium">{v == null || v === "" ? "—" : String(v)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {record.supplement_remark && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-bold">用户补正内容</h3>
            <div className="rounded-md border p-3 text-sm space-y-2"
              style={{
                borderColor: "var(--color-border)",
                background: "color-mix(in oklab, var(--color-muted) 40%, transparent)",
              }}
            >
              <p>
                <span className="text-muted-foreground">补正说明：</span>
                {record.supplement_remark}
              </p>
              {record.supplement_updated_at && (
                <p className="text-xs text-muted-foreground">
                  补正时间：{formatDateTime(record.supplement_updated_at)}
                </p>
              )}
              {record.supplement_data && typeof record.supplement_data === "object" && (() => {
                const suppData = record.supplement_data as Record<string, unknown>
                const items = Array.isArray(suppData.items) ? suppData.items as Array<Record<string, unknown>> : null
                if (!items || items.length === 0) return null
                return (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">补充材料：</span>
                    {items.map((item, i: number) => (
                      <div key={i} className="rounded border p-2 text-xs"
                        style={{ borderColor: "var(--color-border)" }}>
                        <p className="font-medium">📎 {String(item.name ?? `材料 ${i + 1}`)}</p>
                        {Boolean(item.description) && (
                          <p className="text-muted-foreground mt-0.5">
                            {String(item.description)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-bold">更新办理状态</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">新状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remark">办理备注 / 退回原因</Label>
            <Textarea
              id="remark"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="如需通知用户补充材料、退回原因或其它说明，请在此填写"
            />
            <p className="text-xs text-muted-foreground">
              状态变更后，系统将自动通过邮件通知用户。
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={updateMut.isPending}>
              {updateMut.isPending ? "更新中…" : "更新并通知用户"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-16 shrink-0 text-muted-foreground">{label}：</span>
      <span>{value}</span>
    </div>
  )
}
