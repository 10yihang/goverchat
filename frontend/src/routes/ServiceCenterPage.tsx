import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Briefcase, Layers, Download } from "lucide-react"
import { Input, Card, CardContent, Skeleton } from "@/components/ui"
import { useServiceItems } from "@/hooks/api/useService"
import { CategoryFilter } from "@/components/service/CategoryFilter"
import { ItemCard } from "@/components/service/ItemCard"
import { ItemDetail } from "@/components/service/ItemDetail"
import { ProgressForm } from "@/components/service/ProgressForm"

export default function ServiceCenterPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get("category") ?? ""
  const keyword = params.get("keyword") ?? ""
  const slug = params.get("slug") ?? ""

  const { data, isLoading } = useServiceItems(
    category || undefined,
    keyword || undefined
  )

  const items = data?.items ?? []
  const categories = data?.categories ?? []
  const hotItems = data?.hot_items ?? []

  const downloadCount = useMemo(
    () => items.filter((i) => i.download_url).length,
    [items]
  )

  function setFilter(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-10">
      <section className="mb-8">
        <div
          className="rounded-xl px-8 py-10 lg:px-10 lg:py-12"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, black) 100%)",
            color: "var(--color-primary-foreground)",
          }}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-widest opacity-70">
            Service Center
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-4xl">
            办事服务中心
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-85">
            浏览完整事项目录，查看办理条件与材料清单，下载所需文件，查询办理进度。
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <StatTile
              icon={Briefcase}
              label="事项总数"
              value={isLoading ? "—" : String(items.length)}
            />
            <StatTile
              icon={Layers}
              label="分类数"
              value={isLoading ? "—" : String(categories.length)}
            />
            <StatTile
              icon={Download}
              label="可下载材料"
              value={isLoading ? "—" : String(downloadCount)}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-[260px]">
          {isLoading ? (
            <SidebarSkeleton />
          ) : (
            <CategoryFilter
              categories={categories}
              active={category}
              onSelect={(cat) => setFilter("category", cat)}
              hotItems={hotItems}
              onItemClick={(s) => setFilter("slug", s)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setFilter("keyword", e.target.value)}
              placeholder="搜索事项名称或关键词..."
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyItems />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <ItemCard
                  key={item.slug}
                  item={item}
                  onDetail={(s) => setFilter("slug", s)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-full shrink-0 lg:w-[380px]">
          {slug ? (
            <Card>
              <ItemDetail slug={slug} />
            </Card>
          ) : (
            <ProgressForm items={items} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-5 py-3"
      style={{ background: "rgba(255,255,255,0.12)" }}
    >
      <Icon className="h-5 w-5 opacity-80" />
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

function EmptyItems() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Briefcase className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">暂无匹配的办事事项</p>
    </div>
  )
}
