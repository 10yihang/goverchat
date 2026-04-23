import { useState } from "react"
import {
  Button,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@/components/ui"
import { useAdminServiceItems, useDeleteServiceItem } from "@/hooks/api/useAdmin"
import { ServiceItemFormDialog } from "./ServiceItemFormDialog"
import { toast } from "sonner"
import { Plus, Pencil, Power, Search } from "lucide-react"
import type { ServiceItem } from "@/types/api"

export function ServiceItemsTab() {
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)

  const { data, isLoading } = useAdminServiceItems({ keyword, category })
  const deleteMut = useDeleteServiceItem()

  const categories = data?.categories ?? []

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (item: ServiceItem) => { setEditing(item); setDialogOpen(true) }

  const handleToggleActive = (item: ServiceItem) => {
    if (item.is_active === 1) {
      deleteMut.mutate(item.slug, {
        onSuccess: (res) => toast.success(res.message || "已停用"),
        onError: (err) => toast.error(err.message),
      })
    } else {
      toast.info("请通过编辑功能重新启用事项")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-56 pl-8"
            placeholder="搜索事项…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建事项
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
              <TableHead>Slug</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>材料数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.slug}>
                <TableCell className="font-mono text-xs">{item.slug}</TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell><Badge tone="primary">{item.category}</Badge></TableCell>
                <TableCell>{item.materials.length}</TableCell>
                <TableCell>
                  <Badge tone={item.is_active === 1 ? "success" : "neutral"}>
                    {item.is_active === 1 ? "启用" : "停用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="编辑">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(item)} title="切换状态">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(data?.items ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  暂无办事事项
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <ServiceItemFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
