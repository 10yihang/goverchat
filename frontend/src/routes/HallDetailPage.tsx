import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { useHall } from "@/hooks/api/useHalls"
import { HallDetail } from "@/components/halls/HallDetail"
import { PageLoader } from "@/components/layout/PageLoader"

export default function HallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: hall, isLoading, isError } = useHall(id ?? null)

  useEffect(() => {
    if (isError) toast.error("大厅信息加载失败")
  }, [isError])

  if (isLoading) return <PageLoader />

  if (isError || !hall) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium">未找到该办事大厅</p>
        <a
          href="/halls"
          className="text-sm"
          style={{ color: "var(--color-primary)" }}
        >
          返回大厅列表
        </a>
      </div>
    )
  }

  return <HallDetail hall={hall} />
}
