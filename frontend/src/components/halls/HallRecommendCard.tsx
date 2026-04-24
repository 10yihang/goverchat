import { Building2, MapPin, Users, ArrowRight, Navigation } from "lucide-react"
import { Link } from "react-router-dom"
import type { Hall } from "@/types/api"

interface HallRecommendCardProps {
  halls: Hall[]
  serviceSlug: string
  serviceTitle: string
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function isOpenNow(hours: Hall["hours"]): boolean {
  const now = new Date()
  const day = now.getDay()
  const hhmm = now.getHours() * 100 + now.getMinutes()
  let slot: string | null = null
  if (day >= 1 && day <= 5) slot = hours.weekday
  else if (day === 6) slot = hours.saturday
  else slot = hours.sunday
  if (!slot) return false
  const [start, end] = slot.split("-").map((t) => {
    const [h, m] = t.split(":").map(Number)
    return h * 100 + m
  })
  return hhmm >= start && hhmm <= end
}

export function HallRecommendCard({ halls, serviceSlug, serviceTitle }: HallRecommendCardProps) {
  const top3 = halls.slice(0, 3)

  return (
    <div
      className="mt-2 overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: "color-mix(in oklab, var(--color-primary) 6%, transparent)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Building2 className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
          可办「{serviceTitle}」的附近大厅
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {top3.map((hall) => {
          const open = isOpenNow(hall.hours)
          return (
            <Link
              key={hall.id}
              to={`/halls/${hall.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-muted)]"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: open
                    ? "color-mix(in oklab, var(--color-success) 10%, transparent)"
                    : "var(--color-muted)",
                }}
              >
                <Navigation
                  className="h-4 w-4"
                  style={{ color: open ? "var(--color-success)" : "var(--color-muted-foreground)" }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{hall.short_name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {hall.distance != null && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {formatDistance(hall.distance)}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    等待 {hall.wait_count ?? "—"} 人
                  </span>
                </div>
              </div>

              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={
                  open
                    ? {
                        background:
                          "color-mix(in oklab, var(--color-success) 12%, transparent)",
                        color: "var(--color-success)",
                      }
                    : {
                        background: "var(--color-muted)",
                        color: "var(--color-muted-foreground)",
                      }
                }
              >
                {open ? "营业中" : "已关闭"}
              </span>
            </Link>
          )
        })}
      </div>

      <Link
        to={`/halls?service=${serviceSlug}`}
        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--color-muted)]"
        style={{
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-primary)",
        }}
      >
        查看全部可办该业务的大厅
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
