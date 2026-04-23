import { useState, useRef, useEffect, useCallback } from "react"
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
import {
  useAdminKnowledge,
  useUpdateKnowledge,
  useReloadKnowledge,
  useAdminOverview,
} from "@/hooks/api/useAdmin"
import { KnowledgeFormDialog } from "./KnowledgeFormDialog"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { Plus, Pencil, Power, Search, RefreshCcw, Loader2 } from "lucide-react"
import type { KnowledgeItem } from "@/types/api"

interface KnowledgeTabProps {
  onPollingChange: (polling: boolean) => void
}

export function KnowledgeTab({ onPollingChange }: KnowledgeTabProps) {
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeItem | null>(null)
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [rebuildSuccess, setRebuildSuccess] = useState(false)

  const capturedReloadAt = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useAdminKnowledge({ keyword, category })
  const { data: overviewData } = useAdminOverview({ enablePolling: isRebuilding })
  const updateMut = useUpdateKnowledge()
  const reloadMut = useReloadKnowledge()

  const stopPolling = useCallback(() => {
    setIsRebuilding(false)
    onPollingChange(false)
    capturedReloadAt.current = null
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [onPollingChange])

  useEffect(() => {
    if (!isRebuilding || capturedReloadAt.current === null) return
    const currentReloadAt = overviewData?.overview?.tfidf_last_reload_at ?? null
    if (currentReloadAt !== null && currentReloadAt > capturedReloadAt.current) {
      toast.success("✓ 索引已就绪")
      setRebuildSuccess(true)
      stopPolling()
      setTimeout(() => setRebuildSuccess(false), 2000)
    }
  }, [isRebuilding, overviewData, stopPolling])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  const handleReload = () => {
    const currentAt = overviewData?.overview?.tfidf_last_reload_at ?? 0
    capturedReloadAt.current = currentAt

    reloadMut.mutate(undefined, {
      onSuccess: () => {
        toast.info("TF-IDF 重建已触发，预计 3-10 秒")
        setIsRebuilding(true)
        onPollingChange(true)
        timeoutRef.current = setTimeout(() => {
          toast.warning("索引重建超时，请检查后台日志")
          stopPolling()
        }, 60_000)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  const handleToggleActive = (item: KnowledgeItem) => {
    const next = item.is_active === 1 ? 0 : 1
    updateMut.mutate(
      { id: item.id, body: { is_active: next } },
      {
        onSuccess: () => toast.success(next ? "已启用" : "已停用"),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (item: KnowledgeItem) => { setEditing(item); setDialogOpen(true) }

  const categories = data?.categories ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-56 pl-8"
            placeholder="搜索问题…"
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
        <div className="ml-auto flex gap-2">
          <Button
            variant={rebuildSuccess ? "gold" : "outline"}
            size="sm"
            onClick={handleReload}
            disabled={isRebuilding || reloadMut.isPending}
          >
            {isRebuilding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {isRebuilding ? "重建中…" : rebuildSuccess ? "✓ 已就绪" : "重建索引"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建知识
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>问题</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>关键词</TableHead>
              <TableHead>权重</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell className="max-w-[240px] truncate">{item.question}</TableCell>
                <TableCell><Badge tone="primary">{item.category}</Badge></TableCell>
                <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                  {item.keywords}
                </TableCell>
                <TableCell>{item.weight}</TableCell>
                <TableCell>
                  <Badge tone={item.is_active === 1 ? "success" : "neutral"}>
                    {item.is_active === 1 ? "启用" : "停用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.updated_at ? formatDateTime(item.updated_at) : "—"}
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
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  暂无知识条目
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <KnowledgeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
