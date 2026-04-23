import { Skeleton } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { GuideTopic } from "@/types/api"

interface TopicSidebarProps {
  topics: GuideTopic[]
  activeSlug: string | null
  onSelect: (slug: string) => void
  isLoading: boolean
}

function groupByCategory(topics: GuideTopic[]): Map<string, GuideTopic[]> {
  const map = new Map<string, GuideTopic[]>()
  for (const t of topics) {
    const list = map.get(t.category) ?? []
    list.push(t)
    map.set(t.category, list)
  }
  return map
}

export function TopicSidebar({ topics, activeSlug, onSelect, isLoading }: TopicSidebarProps) {
  if (isLoading) {
    return (
      <nav className="space-y-4">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g}>
            <Skeleton className="mb-2 h-4 w-20" />
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  const grouped = groupByCategory(topics)

  return (
    <nav className="space-y-5">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </p>
          <div className="space-y-0.5">
            {items.map((t) => {
              const active = t.slug === activeSlug
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => onSelect(t.slug)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "border-[color-mix(in_oklab,var(--color-accent-gold)_25%,transparent)] bg-[color-mix(in_oklab,var(--color-accent-gold)_6%,transparent)]"
                      : "hover:-translate-y-px hover:bg-[var(--color-muted)] hover:shadow-sm"
                  )}
                  style={active ? { borderLeftWidth: 3, borderLeftColor: "var(--color-accent-gold)" } : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <span className={cn("font-medium leading-snug", active && "text-[var(--color-foreground)]")}>
                      {t.title}
                    </span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.summary}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
