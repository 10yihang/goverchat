import { useState } from "react"
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@/components/ui"
import { useAdminUsers, useUpdateUser } from "@/hooks/api/useAdmin"
import { UserFormDialog } from "./UserFormDialog"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { Plus, Pencil, Power } from "lucide-react"
import type { AdminUser } from "@/types/api"

export function UsersTab() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const { data, isLoading } = useAdminUsers()
  const updateMut = useUpdateUser()

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (user: AdminUser) => { setEditing(user); setDialogOpen(true) }

  const handleToggleActive = (user: AdminUser) => {
    const next = user.is_active === 1 ? 0 : 1
    updateMut.mutate(
      { id: user.id, body: { is_active: next } },
      {
        onSuccess: () => toast.success(next ? "已启用" : "已停用"),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button size="sm" className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建用户
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <Badge tone={user.role === "admin" ? "gold" : "neutral"}>
                    {user.role === "admin" ? "管理员" : "普通用户"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={user.is_active === 1 ? "success" : "neutral"}>
                    {user.is_active === 1 ? "启用" : "停用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.created_at ? formatDateTime(user.created_at) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="编辑">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(user)} title="切换状态">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(data?.items ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  暂无用户
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
