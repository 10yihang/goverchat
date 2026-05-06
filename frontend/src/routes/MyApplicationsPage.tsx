import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, Eye, FilePlus, AlertTriangle, Send } from "lucide-react"
import { toast } from "sonner"

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Input,
  Label,
} from "@/components/ui"
import { useMyApplications, useSubmitSupplement } from "@/hooks/api/useApplication"
import { formatDateTime } from "@/lib/utils"
import type { ApplicationRecord } from "@/types/api"

const STATUS_TONE: Record<string, "primary" | "success" | "warning" | "neutral" | "danger"> = {
  已提交: "primary",
  审核中: "warning",
  材料待补充: "danger",
  办理完成: "success",
  已退回: "neutral",
}

const STATUS_ICON: Record<string, string> = {
  已提交: "📌",
  审核中: "⏳",
  材料待补充: "⚠️",
  办理完成: "✅",
  已退回: "↩️",
}

export default function MyApplicationsPage() {
  const { data: applications, isLoading } = useMyApplications()
  const [detailRecord, setDetailRecord] = useState<ApplicationRecord | null>(null)
  const [supplementRecord, setSupplementRecord] = useState<ApplicationRecord | null>(null)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center text-muted-foreground">加载中…</div>
      </div>
    )
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="gov-card text-center py-16">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="font-serif text-xl font-bold mb-2">暂无办件记录</h2>
          <p className="text-sm text-muted-foreground mb-6">
            您可以在聊天中输入想办理的事项，系统会为您打开办理表单。
          </p>
          <Link to="/chat">
            <Button variant="primary" className="gap-2">
              <Send className="h-4 w-4" />
              去聊天办理
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">我的办件</h1>
        <p className="text-sm text-muted-foreground mt-1">
          查看已提交的政务办理申请和最新处理进度。
        </p>
      </div>

      <div className="space-y-4">
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            record={app}
            onViewDetail={() => setDetailRecord(app)}
            onSupplement={() => setSupplementRecord(app)}
          />
        ))}
      </div>

      {detailRecord && (
        <ApplicationDetailDialog
          record={detailRecord}
          open={!!detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {supplementRecord && (
        <SupplementDialog
          record={supplementRecord}
          open={!!supplementRecord}
          onClose={() => setSupplementRecord(null)}
        />
      )}
    </div>
  )
}

function ApplicationCard({
  record,
  onViewDetail,
  onSupplement,
}: {
  record: ApplicationRecord
  onViewDetail: () => void
  onSupplement: () => void
}) {
  const needsSupplement = record.status === "材料待补充"

  return (
    <Card className={needsSupplement ? "border-[var(--color-accent-ochre)]" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="font-serif text-base">
              {STATUS_ICON[record.status] ?? ""} {record.service_title}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              受理编号：{record.query_no}
            </CardDescription>
          </div>
          <Badge tone={STATUS_TONE[record.status] ?? "neutral"}>
            {record.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
          <DetailItem label="申请人" value={record.applicant_name || "—"} />
          <DetailItem label="联系电话" value={record.applicant_phone || "—"} />
          <DetailItem label="提交时间" value={formatDateTime(record.created_at ?? "")} />
          <DetailItem label="更新时间" value={formatDateTime(record.updated_at ?? "")} />
        </div>

        {record.admin_remark && (
          <div
            className="rounded-md border p-3 text-xs space-y-1"
            style={{
              borderColor: "var(--color-border)",
              background: "color-mix(in oklab, var(--color-muted) 60%, transparent)",
            }}
          >
            <span className="font-bold text-muted-foreground">管理员备注：</span>
            <span>{record.admin_remark}</span>
          </div>
        )}

        {needsSupplement && (
          <div className="flex items-center gap-2 rounded-md bg-[var(--color-accent-ochre)]/10 border border-[var(--color-accent-ochre)]/30 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent-ochre)" }} />
            <div className="text-sm">
              <span className="font-medium" style={{ color: "var(--color-accent-ochre)" }}>
                该申请需要补充材料
              </span>
              {record.admin_remark && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {record.admin_remark}
                </p>
              )}
            </div>
          </div>
        )}

        {record.supplement_remark && (
          <div
            className="rounded-md border p-3 text-xs space-y-1"
            style={{
              borderColor: "var(--color-border)",
              background: "color-mix(in oklab, var(--color-muted) 40%, transparent)",
            }}
          >
            <span className="font-bold text-muted-foreground">已补充说明：</span>
            <span>{record.supplement_remark}</span>
            {record.supplement_updated_at && (
              <span className="ml-2 text-muted-foreground">
                （{formatDateTime(record.supplement_updated_at)}）
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" onClick={onViewDetail} className="h-8 px-3 text-xs gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            查看详情
          </Button>
          {needsSupplement && (
            <Button
              variant="primary"
              onClick={onSupplement}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <FilePlus className="h-3.5 w-3.5" />
              补充材料
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  )
}

function ApplicationDetailDialog({
  record,
  open,
  onClose,
}: {
  record: ApplicationRecord
  open: boolean
  onClose: () => void
}) {
  const formEntries = useMemo(() => {
    const data = record.form_data ?? {}
    return Object.entries(data)
  }, [record.form_data])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            申请详情 · <span className="font-mono text-base">{record.query_no}</span>
          </DialogTitle>
          <DialogDescription>
            {record.service_title} · 提交于 {formatDateTime(record.created_at ?? "")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">办理信息</h3>
            <div className="space-y-1 text-sm">
              <DetailRow label="受理编号" value={record.query_no} />
              <DetailRow label="办理事项" value={record.service_title} />
              <DetailRow label="当前状态">
                <Badge tone={STATUS_TONE[record.status] ?? "neutral"}>
                  {record.status}
                </Badge>
              </DetailRow>
              <DetailRow label="申请人" value={record.applicant_name || "—"} />
              <DetailRow label="手机号" value={record.applicant_phone || "—"} />
              <DetailRow label="更新时间" value={formatDateTime(record.updated_at ?? "")} />
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
                  <span className="font-medium">
                    {v == null || v === "" ? "—" : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {record.supplement_remark && (
          <div className="border-t pt-3 space-y-1.5">
            <h3 className="text-sm font-bold text-muted-foreground">补正记录</h3>
            <p className="text-sm">{record.supplement_remark}</p>
            {record.supplement_updated_at && (
              <p className="text-xs text-muted-foreground">
                补正时间：{formatDateTime(record.supplement_updated_at)}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}：</span>
      {children ?? <span>{value ?? "—"}</span>}
    </div>
  )
}

interface SupplementItem {
  name: string
  description: string
}

function SupplementDialog({
  record,
  open,
  onClose,
}: {
  record: ApplicationRecord
  open: boolean
  onClose: () => void
}) {
  const [items, setItems] = useState<SupplementItem[]>([{ name: "", description: "" }])
  const [remark, setRemark] = useState("")
  const supplementMut = useSubmitSupplement()

  function addItem() {
    setItems((prev) => [...prev, { name: "", description: "" }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof SupplementItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function handleSubmit() {
    const validItems = items.filter((item) => item.name.trim() || item.description.trim())
    if (validItems.length === 0) {
      toast.error("请至少填写一条补充材料信息")
      return
    }
    if (!remark.trim()) {
      toast.error("请填写补充说明")
      return
    }

    supplementMut.mutate(
      {
        query_no: record.query_no,
        supplement_data: { items: validItems },
        supplement_remark: remark.trim(),
      },
      {
        onSuccess: () => {
          toast.success("补充材料已提交，申请已重新进入审核")
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>补充材料 · {record.service_title}</DialogTitle>
          <DialogDescription>
            受理编号：{record.query_no}
            {record.admin_remark && (
              <>
                <br />
                管理员说明：{record.admin_remark}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-bold">补充材料</Label>
            {items.map((item, i) => (
              <div
                key={i}
                className="rounded-md border p-3 space-y-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    材料 {i + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      onClick={() => removeItem(i)}
                      className="h-6 px-2 text-xs text-[var(--color-accent-ochre)]"
                    >
                      移除
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">材料名称</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="如：身份证正反面照片"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">材料说明</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="如：已重新上传清晰版本"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="h-8 px-3 text-xs w-full"
            >
              添加一项材料
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supp-remark" className="text-sm font-bold">
              补充说明
            </Label>
            <Textarea
              id="supp-remark"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="请简要说明本次补正内容…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={supplementMut.isPending}
          >
            {supplementMut.isPending ? "提交中…" : "提交补正材料"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
