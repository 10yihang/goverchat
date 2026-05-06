import { useMemo, useState } from "react"
import { ClipboardList, Filter, RefreshCw } from "lucide-react"

import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import { useAdminApplications } from "@/hooks/api/useApplication"
import { formatDateTime } from "@/lib/utils"
import type { ApplicationRecord } from "@/types/api"
import { ApplicationDetailDialog } from "./ApplicationDetailDialog"

const STATUS_TONE: Record<string, "primary" | "success" | "warning" | "neutral" | "danger"> = {
  已提交: "primary",
  审核中: "warning",
  材料待补充: "warning",
  办理完成: "success",
  已退回: "danger",
}

const ALL_VALUE = "__all__"

export function ApplicationsTab() {
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE)
  const [keywordInput, setKeywordInput] = useState<string>("")
  const [keyword, setKeyword] = useState<string>("")
  const [activeRecord, setActiveRecord] = useState<ApplicationRecord | null>(null)

  const filter = useMemo(
    () => ({
      status: statusFilter === ALL_VALUE ? "" : statusFilter,
      keyword,
    }),
    [statusFilter, keyword],
  )

  const { data, isLoading, refetch, isFetching } = useAdminApplications(filter)

  const items = data?.items ?? []
  const statusCounts = data?.status_counts ?? {}

  function applyKeyword() {
    setKeyword(keywordInput.trim())
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          办理申请
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {Object.entries(statusCounts).map(([s, n]) => (
            <Badge key={s} tone={STATUS_TONE[s] ?? "neutral"}>
              {s} {n}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto h-8 px-2.5 text-xs"
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          刷新
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>全部状态</SelectItem>
              {(data?.status_options ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="搜索受理编号 / 姓名 / 手机号 / 邮箱"
            className="h-8 w-[280px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyKeyword()
            }}
          />
          <Button variant="outline" onClick={applyKeyword} className="h-8 px-3 text-xs">
            搜索
          </Button>
        </div>
      </div>

      <div className="rounded-md border" style={{ borderColor: "var(--color-border)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">受理编号</TableHead>
              <TableHead>事项</TableHead>
              <TableHead>申请人</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead className="w-[110px]">状态</TableHead>
              <TableHead className="w-[100px]">补正</TableHead>
              <TableHead className="w-[160px]">提交时间</TableHead>
              <TableHead className="w-[80px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  加载中…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  暂无申请记录
                </TableCell>
              </TableRow>
            )}
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs font-bold">{row.query_no}</TableCell>
                <TableCell>{row.service_title}</TableCell>
                <TableCell>{row.applicant_name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{row.applicant_phone || "—"}</TableCell>
                <TableCell>
                  <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge>
                </TableCell>
                <TableCell>
                  {row.supplement_remark ? (
                    <span className="text-xs text-[var(--color-accent-gold)] font-medium">
                      已补正
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(row.created_at ?? "")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveRecord(row)}
                    className="h-7 px-2 text-xs"
                  >
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {activeRecord && (
        <ApplicationDetailDialog
          record={activeRecord}
          open={!!activeRecord}
          onClose={() => setActiveRecord(null)}
        />
      )}
    </div>
  )
}
