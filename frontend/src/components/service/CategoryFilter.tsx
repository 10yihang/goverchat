import { cn } from "@/lib/utils"
import { Filter } from "lucide-react"
import type { ServiceItem } from "@/types/api"

interface CategoryFilterProps {
  categories: string[]
  active: string
  onSelect: (cat: string) => void
  hotItems: ServiceItem[]
  onItemClick: (slug: string) => void
}

export function CategoryFilter({
  categories,
  active,
  onSelect,
  hotItems,
  onItemClick,
}: CategoryFilterProps) {
  return (
    <aside className="space-y-6">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          分类筛选
        </div>
        <div className="flex flex-col gap-1.5">
          <CategoryChip
            label="全部事项"
            isActive={active === ""}
            onClick={() => onSelect("")}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              isActive={active === cat}
              onClick={() => onSelect(cat)}
            />
          ))}
        </div>
      </div>

      {hotItems.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🔥 热门事项
          </div>
          <div className="space-y-1.5">
            {hotItems.map((item) => (
              <button
                key={item.slug}
                onClick={() => onItemClick(item.slug)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-[var(--color-muted)]"
                )}
              >
                <span className="line-clamp-1 font-medium">{item.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function CategoryChip({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-left text-sm font-medium transition-all",
        isActive
          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
          : "text-[var(--color-foreground)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-muted)]",
        !isActive && "border border-transparent"
      )}
    >
      {label}
    </button>
  )
}
