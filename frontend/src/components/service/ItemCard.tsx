import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { BookOpen } from "lucide-react"
import type { ServiceItem } from "@/types/api"

interface ItemCardProps {
  item: ServiceItem
  onDetail: (slug: string) => void
}

export function ItemCard({ item, onDetail }: ItemCardProps) {
  return (
    <div className="gov-card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-serif text-base font-bold leading-snug">
          {item.title}
        </h3>
        <Badge tone="primary" className="shrink-0">
          {item.category}
        </Badge>
      </div>
      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {item.summary}
      </p>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          {item.materials.length} 项材料
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDetail(item.slug)}
        >
          查看详情
        </Button>
      </div>
    </div>
  )
}
