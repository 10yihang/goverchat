import { MapPin, Clock, Users, Car, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { Hall } from "@/types/api"

interface HallCardProps {
  hall: Hall
  isActive?: boolean
  onClick?: () => void
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

export function HallCard({ hall, isActive, onClick }: HallCardProps) {
  const open = isOpenNow(hall.hours)

  return (
    <Link
      to={`/halls/${hall.id}`}
      onClick={onClick}
      className={cn(
        "group block rounded-lg border p-4 transition-all",
        "hover:shadow-md",
        isActive
          ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_4%,transparent)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-sm font-semibold leading-tight">
            {hall.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{hall.district}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              open
                ? "bg-[color-mix(in_oklab,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
                : "bg-[var(--color-muted)] text-muted-foreground",
            )}
          >
            {open ? "营业中" : "已关闭"}
          </span>
          {hall.distance != null && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {formatDistance(hall.distance)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{hall.address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{hall.hours.weekday}（周一至五）</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" />
            <span>当前等待 {hall.wait_count ?? "—"} 人</span>
          </div>
          {hall.parking && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Car className="h-3 w-3" />
              <span>可停车</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {hall.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-sm px-1.5 py-0.5 text-[10px]"
              style={{
                background:
                  "color-mix(in oklab, var(--color-accent-gold) 10%, transparent)",
                color: "var(--color-accent-gold-foreground)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  )
}
