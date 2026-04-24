import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Building2, LocateFixed, List, Map } from "lucide-react"
import { toast } from "sonner"
import { useHalls } from "@/hooks/api/useHalls"
import { HallsList } from "@/components/halls/HallsList"
import { HallMap } from "@/components/halls/HallMap"
import { HallsFilter } from "@/components/halls/HallsFilter"
import { cn } from "@/lib/utils"

type ViewMode = "split" | "list" | "map"

export default function HallsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serviceFilter = searchParams.get("service") ?? ""

  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [locating, setLocating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("split")

  const { data: halls = [], isLoading, isError } = useHalls(userLat, userLng, serviceFilter || undefined)

  useEffect(() => {
    if (isError) toast.error("大厅数据加载失败，请刷新重试")
  }, [isError])

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("当前浏览器不支持定位")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setLocating(false)
        toast.success("已获取当前位置，列表已按距离排序")
      },
      () => {
        setLocating(false)
        toast.error("获取位置失败，请检查浏览器定位权限")
      },
      { timeout: 8000 },
    )
  }, [])

  const handleServiceChange = (slug: string) => {
    if (slug) setSearchParams({ service: slug }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div
        className="shrink-0 border-b px-6 py-4"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  background: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
                  color: "var(--color-primary)",
                }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold leading-tight">附近办事大厅</h1>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "加载中…" : `共 ${halls.length} 个大厅`}
                  {userLat != null ? " · 按距离排序" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-muted disabled:opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              >
                <LocateFixed className={cn("h-3.5 w-3.5", locating && "animate-spin")} />
                {locating ? "定位中…" : userLat ? "已定位" : "获取位置"}
              </button>

              <div
                className="hidden items-center rounded-lg border p-0.5 sm:flex"
                style={{ borderColor: "var(--color-border)" }}
              >
                {(["split", "list", "map"] as ViewMode[]).map((mode) => {
                  const Icon = mode === "list" ? List : mode === "map" ? Map : Building2
                  const label = mode === "list" ? "列表" : mode === "map" ? "地图" : "分栏"
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
                      style={
                        viewMode === mode
                          ? {
                              background: "var(--color-primary)",
                              color: "var(--color-primary-foreground)",
                            }
                          : { color: "var(--color-muted-foreground)" }
                      }
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <HallsFilter value={serviceFilter} onChange={handleServiceChange} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-7xl gap-0">
          {(viewMode === "split" || viewMode === "list") && (
            <aside
              className={cn(
                "h-full overflow-y-auto border-r p-4",
                viewMode === "split" ? "w-full sm:w-[380px]" : "w-full",
              )}
              style={{ borderColor: "var(--color-border)" }}
            >
              <HallsList
                halls={halls}
                activeId={activeId}
                isLoading={isLoading}
                onHoverHall={setActiveId}
              />
            </aside>
          )}

          {(viewMode === "split" || viewMode === "map") && (
            <main
              className={cn(
                "h-full p-4",
                viewMode === "split" ? "hidden flex-1 sm:block" : "w-full",
              )}
            >
              <HallMap
                halls={halls}
                activeId={activeId}
                userLat={userLat}
                userLng={userLng}
                onSelectHall={setActiveId}
              />
            </main>
          )}
        </div>
      </div>
    </div>
  )
}
