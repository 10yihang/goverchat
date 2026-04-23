import { useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui"
import { useCreateUser, useUpdateUser } from "@/hooks/api/useAdmin"
import { toast } from "sonner"
import type { AdminUser } from "@/types/api"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AdminUser | null
}

interface FormState {
  username: string
  password: string
  role: "admin" | "viewer"
}

function toFormState(user: AdminUser | null): FormState {
  if (!user) return { username: "", password: "", role: "viewer" }
  return { username: user.username, password: "", role: user.role }
}

export function UserFormDialog({ open, onOpenChange, editing }: UserFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(editing))
  const createMut = useCreateUser()
  const updateMut = useUpdateUser()
  const isPending = createMut.isPending || updateMut.isPending

  const resetAndClose = () => {
    setForm(toFormState(null))
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(toFormState(editing))
    onOpenChange(next)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!editing && (!form.username.trim() || !form.password.trim())) {
      toast.error("用户名和密码为必填项")
      return
    }

    if (editing) {
      const body: { role?: string; password?: string } = { role: form.role }
      if (form.password.trim()) body.password = form.password.trim()
      updateMut.mutate(
        { id: editing.id, body },
        {
          onSuccess: (res) => { toast.success(res.message || "更新成功"); resetAndClose() },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      createMut.mutate(
        { username: form.username.trim(), password: form.password.trim(), role: form.role },
        {
          onSuccess: (res) => { toast.success(res.message || "创建成功"); resetAndClose() },
          onError: (err) => toast.error(err.message),
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑用户" : "新建用户"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="用户名 *">
            <Input
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              disabled={!!editing}
            />
          </Field>
          <Field label={editing ? "密码（留空则不修改）" : "密码 *"}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </Field>
          <Field label="角色">
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as "admin" | "viewer" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="viewer">普通用户</SelectItem>
              </SelectContent>
            </Select>
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
