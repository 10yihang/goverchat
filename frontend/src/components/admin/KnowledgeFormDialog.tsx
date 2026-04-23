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
import { useCreateKnowledge, useUpdateKnowledge } from "@/hooks/api/useAdmin"
import { toast } from "sonner"
import type { KnowledgeItem } from "@/types/api"

interface KnowledgeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: KnowledgeItem | null
}

interface FormState {
  question: string
  answer: string
  category: string
  keywords: string
  weight: number
}

function toFormState(item: KnowledgeItem | null): FormState {
  if (!item) return { question: "", answer: "", category: "", keywords: "", weight: 1 }
  return {
    question: item.question,
    answer: item.answer,
    category: item.category,
    keywords: item.keywords,
    weight: item.weight,
  }
}

export function KnowledgeFormDialog({ open, onOpenChange, editing }: KnowledgeFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(editing))
  const createMut = useCreateKnowledge()
  const updateMut = useUpdateKnowledge()
  const isPending = createMut.isPending || updateMut.isPending

  const resetAndClose = () => {
    setForm(toFormState(null))
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(toFormState(editing))
    }
    onOpenChange(next)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim() || !form.category.trim()) {
      toast.error("问题、答案、分类为必填项")
      return
    }

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim(),
      keywords: form.keywords.trim(),
      weight: form.weight,
    }

    if (editing) {
      updateMut.mutate(
        { id: editing.id, body: payload },
        {
          onSuccess: (res) => { toast.success(res.message || "更新成功"); resetAndClose() },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: (res) => { toast.success(res.message || "创建成功"); resetAndClose() },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑知识" : "新建知识"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="问题 *">
            <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
          </Field>
          <Field label="答案 *">
            <Textarea rows={4} value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} />
          </Field>
          <Field label="分类 *">
            <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          </Field>
          <Field label="关键词">
            <Input
              value={form.keywords}
              onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
              placeholder="空格分隔"
            />
          </Field>
          <Field label="权重">
            <Input
              type="number"
              min={0}
              step={0.1}
              value={form.weight}
              onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) }))}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "提交中…" : editing ? "保存" : "创建"}
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
