import { useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
} from "@/components/ui"
import { useUpsertServiceItem } from "@/hooks/api/useAdmin"
import { toast } from "sonner"
import type { ServiceItem, ServiceChannel, ServiceFaq } from "@/types/api"

interface ServiceItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ServiceItem | null
}

interface FormState {
  slug: string
  title: string
  category: string
  summary: string
  conditions: string
  materials: string
  process_steps: string
  tips: string
  keywords: string
  entry_label: string
  entry_url: string
  qa_seed: string
  download_name: string
  download_url: string
  faq: string
  channels: string
}

function arrayToLines(arr: string[]): string {
  return arr.join("\n")
}

function linesToArray(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
}

function faqToLines(faq: ServiceFaq[]): string {
  return faq.map((f) => `${f.q}|${f.a}`).join("\n")
}

function linesToFaq(text: string): ServiceFaq[] {
  return linesToArray(text).map((line) => {
    const [q = "", a = ""] = line.split("|", 2)
    return { q: q.trim(), a: a.trim() }
  })
}

function channelsToLines(channels: ServiceChannel[]): string {
  return channels.map((c) => `${c.name}|${c.type}|${c.url ?? ""}`).join("\n")
}

function linesToChannels(text: string): ServiceChannel[] {
  return linesToArray(text).map((line) => {
    const [name = "", type = "offline", url = ""] = line.split("|", 3)
    return { name: name.trim(), type: type.trim() as "online" | "offline", url: url.trim() || undefined }
  })
}

function toFormState(item: ServiceItem | null): FormState {
  if (!item) {
    return {
      slug: "", title: "", category: "", summary: "",
      conditions: "", materials: "", process_steps: "", tips: "", keywords: "",
      entry_label: "", entry_url: "", qa_seed: "",
      download_name: "", download_url: "", faq: "", channels: "",
    }
  }
  return {
    slug: item.slug,
    title: item.title,
    category: item.category,
    summary: item.summary,
    conditions: arrayToLines(item.conditions),
    materials: arrayToLines(item.materials),
    process_steps: arrayToLines(item.process_steps),
    tips: arrayToLines(item.tips),
    keywords: arrayToLines(item.keywords),
    entry_label: item.entry_label,
    entry_url: item.entry_url,
    qa_seed: item.qa_seed,
    download_name: item.download_name ?? "",
    download_url: item.download_url ?? "",
    faq: faqToLines(item.faq),
    channels: channelsToLines(item.channels),
  }
}

export function ServiceItemFormDialog({ open, onOpenChange, editing }: ServiceItemFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(editing))
  const upsertMut = useUpsertServiceItem()

  const resetAndClose = () => {
    setForm(toFormState(null))
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(toFormState(editing))
    onOpenChange(next)
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.slug.trim() || !form.title.trim() || !form.category.trim()) {
      toast.error("Slug、标题、分类为必填项")
      return
    }

    const body: ServiceItem = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      category: form.category.trim(),
      summary: form.summary.trim(),
      conditions: linesToArray(form.conditions),
      materials: linesToArray(form.materials),
      process_steps: linesToArray(form.process_steps),
      channels: linesToChannels(form.channels),
      faq: linesToFaq(form.faq),
      tips: linesToArray(form.tips),
      entry_label: form.entry_label.trim(),
      entry_url: form.entry_url.trim(),
      qa_seed: form.qa_seed.trim(),
      keywords: linesToArray(form.keywords),
      download_name: form.download_name.trim() || undefined,
      download_url: form.download_url.trim() || undefined,
      is_active: editing ? editing.is_active : 1,
    }

    upsertMut.mutate(
      { existingSlug: editing?.slug, body },
      {
        onSuccess: (res) => { toast.success(res.message || "保存成功"); resetAndClose() },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑事项" : "新建事项"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug *">
              <Input value={form.slug} onChange={set("slug")} disabled={!!editing} />
            </Field>
            <Field label="标题 *">
              <Input value={form.title} onChange={set("title")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="分类 *">
              <Input value={form.category} onChange={set("category")} />
            </Field>
            <Field label="QA Seed">
              <Input value={form.qa_seed} onChange={set("qa_seed")} />
            </Field>
          </div>
          <Field label="摘要">
            <Textarea rows={2} value={form.summary} onChange={set("summary")} />
          </Field>
          <Field label="办理条件（每行一条）">
            <Textarea rows={3} value={form.conditions} onChange={set("conditions")} />
          </Field>
          <Field label="所需材料（每行一条）">
            <Textarea rows={3} value={form.materials} onChange={set("materials")} />
          </Field>
          <Field label="办理流程（每行一步）">
            <Textarea rows={3} value={form.process_steps} onChange={set("process_steps")} />
          </Field>
          <Field label="温馨提示（每行一条）">
            <Textarea rows={2} value={form.tips} onChange={set("tips")} />
          </Field>
          <Field label="关键词（每行一个）">
            <Textarea rows={2} value={form.keywords} onChange={set("keywords")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="入口标签">
              <Input value={form.entry_label} onChange={set("entry_label")} />
            </Field>
            <Field label="入口 URL">
              <Input value={form.entry_url} onChange={set("entry_url")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="下载文件名">
              <Input value={form.download_name} onChange={set("download_name")} />
            </Field>
            <Field label="下载 URL">
              <Input value={form.download_url} onChange={set("download_url")} />
            </Field>
          </div>
          <Field label="FAQ（每行一条：问题|答案）">
            <Textarea rows={3} value={form.faq} onChange={set("faq")} placeholder="如何办理|请携带身份证前往窗口" />
          </Field>
          <Field label="办理通道（每行一条：名称|类型|URL）">
            <Textarea rows={3} value={form.channels} onChange={set("channels")} placeholder="线上办理|online|https://..." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={upsertMut.isPending}>
              取消
            </Button>
            <Button type="submit" disabled={upsertMut.isPending}>
              {upsertMut.isPending ? "提交中…" : editing ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}
