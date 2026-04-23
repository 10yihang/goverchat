import { useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ClipboardCopy, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@/components/ui"
import { useSubmitApplication } from "@/hooks/api/useApplication"
import { useChatStore } from "@/stores/chatStore"
import type { ApplicationRecord, FormFieldSchema, FormSchema } from "@/types/api"
import type { DisplayMessage } from "./MessageBubble"

interface InlineServiceFormProps {
  serviceSlug: string
  serviceTitle: string
  schema: FormSchema
  intentSource?: string
  initialSubmittedNo?: string | null
}

type FormValues = Record<string, string>

function buildInitial(schema: FormSchema): FormValues {
  const out: FormValues = {}
  for (const field of schema.fields) {
    out[field.name] = ""
  }
  return out
}

function FieldRow({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldSchema
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const id = `field-${field.name}`
  const ariaRequired = field.required ? true : undefined

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <Textarea
          id={id}
          rows={3}
          placeholder={field.placeholder}
          value={value}
          maxLength={field.max_length}
          aria-required={ariaRequired}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  if (field.type === "select") {
    const options = field.options ?? []
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} aria-required={ariaRequired}>
            <SelectValue placeholder={field.placeholder ?? "请选择"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const inputType =
    field.type === "tel"
      ? "tel"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "number"
            ? "number"
            : "text"

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={id}
        type={inputType}
        placeholder={field.placeholder}
        value={value}
        maxLength={field.max_length}
        aria-required={ariaRequired}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function InlineServiceForm({
  serviceSlug,
  serviceTitle,
  schema,
  intentSource,
  initialSubmittedNo = null,
}: InlineServiceFormProps) {
  const [values, setValues] = useState<FormValues>(() => buildInitial(schema))
  const [submitted, setSubmitted] = useState<ApplicationRecord | null>(null)
  const [submittedNo, setSubmittedNo] = useState<string | null>(initialSubmittedNo)
  const submit = useSubmitApplication()
  const sessionId = useChatStore((s) => s.activeSessionId)
  const qc = useQueryClient()

  function handleChange(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    for (const field of schema.fields) {
      if (field.required && !values[field.name].trim()) {
        toast.error(`请填写：${field.label}`)
        return
      }
    }

    submit.mutate(
      {
        service_slug: serviceSlug,
        session_id: sessionId,
        form_data: values,
      },
      {
        onSuccess: (data) => {
          setSubmitted(data.application)
          setSubmittedNo(data.application.query_no)
          toast.success(`提交成功，受理编号 ${data.application.query_no}`)
          if (sessionId) {
            const confirmMsg: DisplayMessage = {
              role: "bot",
              content:
                `✅ 您的「${serviceTitle}」办理申请已成功提交。\n` +
                `受理编号：${data.application.query_no}\n` +
                `系统已将受理详情发送至您的邮箱，您可随时输入受理编号查询办理进度。`,
              msg_type: "text",
              created_at: new Date().toISOString(),
            }
            qc.setQueryData<DisplayMessage[]>(
              ["history", sessionId],
              (old) => [...(old ?? []), confirmMsg],
            )
          }
        },
      },
    )
  }

  function handleCopyQueryNo() {
    if (!submittedNo) return
    void navigator.clipboard
      .writeText(submittedNo)
      .then(() => toast.success("受理编号已复制"))
      .catch(() => toast.error("复制失败，请手动选中"))
  }

  if (submittedNo || submitted) {
    return (
      <div
        className="gov-card mt-3 max-w-md p-4"
        style={{ borderLeft: "3px solid var(--color-success, #0d8053)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="font-serif text-sm font-bold">已提交：{serviceTitle}</span>
        </div>
        <div
          className="rounded-md p-3 font-mono text-sm"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 6%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          受理编号：<b>{submittedNo}</b>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          系统已通过邮件发送受理确认；您可以输入此编号在聊天中查询办理进度。
        </p>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" onClick={handleCopyQueryNo}>
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
            复制编号
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gov-card mt-3 max-w-md p-4"
      style={{ borderLeft: "3px solid var(--color-primary)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
        <span className="font-serif text-sm font-bold">在线办理：{serviceTitle}</span>
        {intentSource && (
          <Badge tone="neutral" className="ml-auto text-[10px]">
            {intentSource === "llm" ? "AI 识别" : intentSource === "keyword" ? "关键字识别" : "手动触发"}
          </Badge>
        )}
      </div>
      {schema.intro && (
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          {schema.intro}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        {schema.fields.map((field) => (
          <FieldRow
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            onChange={(v) => handleChange(field.name, v)}
            disabled={submit.isPending}
          />
        ))}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中…
              </>
            ) : (
              schema.submit_label || "提交申请"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
