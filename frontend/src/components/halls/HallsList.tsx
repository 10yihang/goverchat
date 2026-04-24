import { Building2 } from "lucide-react"
import { HallCard } from "./HallCard"
import type { Hall } from "@/types/api"

interface HallsListProps {
  halls: Hall[]
  activeId?: string | null
  isLoading?: boolean
  onHoverHall?: (id: string | null) => void
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-[var(--color-border)] p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded bg-[var(--color-muted)]" />
          <div className="h-3 w-20 rounded bg-[var(--color-muted)]" />
        </div>
        <div className="h-5 w-12 rounded-full bg-[var(--color-muted)]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[var(--color-muted)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--color-muted)]" />
      </div>
    </div>
  )
}

export function HallsList({ halls, activeId, isLoading, onHoverHall }: HallsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (halls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2
          className="mb-3 h-10 w-10"
          style={{ color: "var(--color-muted-foreground)" }}
        />
        <p className="text-sm font-medium">暂无符合条件的大厅</p>
        <p className="mt-1 text-xs text-muted-foreground">尝试切换业务类型筛选</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {halls.map((hall) => (
        <HallCard
          key={hall.id}
          hall={hall}
          isActive={activeId === hall.id}
          onClick={() => onHoverHall?.(null)}
        />
      ))}
    </div>
  )
}
