import { useEffect, useState } from "react"
import {
  MapPin,
  Phone,
  Clock,
  Car,
  Navigation,
  ChevronLeft,
  Copy,
  Check,
  Train,
  Tag,
  Building2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Hall } from "@/types/api"
import serviceData from "@/data/service_items.json"

interface HallDetailProps {
  hall: Hall
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

function useWaitCount(windows: number) {
  const [count, setCount] = useState(() => Math.max(2, Math.floor(Math.random() * windows * 2)))
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(Math.max(2, Math.floor(Math.random() * windows * 2)))
    }, 30_000)
    return () => clearInterval(timer)
  }, [windows])
  return count
}

export function HallDetail({ hall }: HallDetailProps) {
  const open = isOpenNow(hall.hours)
  const waitCount = useWaitCount(hall.windows)
  const [copied, setCopied] = useState(false)

  const handleCopyPhone = async () => {
    await navigator.clipboard.writeText(hall.phone)
    setCopied(true)
    toast.success("电话号码已复制")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNavigate = () => {
    const url = `https://uri.amap.com/navigation?to=${hall.lng},${hall.lat},${encodeURIComponent(hall.name)}&mode=car&callnative=1`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const relatedServices = serviceData.items.filter((item) =>
    hall.services.includes(item.slug),
  )

  const waitRatio = Math.min(waitCount / (hall.windows * 2), 1)
  const waitLevel = waitRatio < 0.3 ? "少" : waitRatio < 0.7 ? "中" : "多"
  const waitColor =
    waitLevel === "少"
      ? "var(--color-success)"
      : waitLevel === "中"
        ? "var(--color-warning)"
        : "var(--color-destructive)"

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-16 pt-8">
      <Link
        to="/halls"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        返回大厅列表
      </Link>

      <div className="gov-card-elevated overflow-hidden">
        <div
          className="px-6 py-5"
          style={{ background: "var(--color-primary)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight" style={{ color: "var(--color-primary-foreground)" }}>
                {hall.name}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "color-mix(in oklab, var(--color-primary-foreground) 70%, transparent)" }}>
                {hall.city} · {hall.district}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                open
                  ? "bg-[color-mix(in_oklab,var(--color-success)_20%,transparent)] text-[var(--color-success)]"
                  : "bg-[rgba(0,0,0,0.2)] text-white/70",
              )}
            >
              {open ? "营业中" : "已关闭"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {hall.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm px-2 py-0.5 text-xs"
                style={{
                  background: "color-mix(in oklab, var(--color-primary-foreground) 12%, transparent)",
                  color: "var(--color-primary-foreground)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0" style={{ borderColor: "var(--color-border)" }}>
          <div className="px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              实时排队
            </p>
            <div className="flex items-end gap-3">
              <span className="font-mono text-4xl font-bold" style={{ color: waitColor }}>
                {waitCount}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">人等待 · 当前{waitLevel}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--color-muted)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${waitRatio * 100}%`, background: waitColor }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              共 {hall.windows} 个服务窗口
            </p>
          </div>

          <div className="px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              快捷操作
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleNavigate}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90"
                style={{
                  background: "var(--color-accent-gold)",
                  color: "var(--color-accent-gold-foreground)",
                }}
              >
                <Navigation className="h-4 w-4" />
                导航前往（高德地图）
              </button>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted"
                style={{ borderColor: "var(--color-border)" }}
              >
                {copied ? (
                  <Check className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "已复制" : `致电 ${hall.phone}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="gov-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold">
          <Clock className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
          基本信息
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm">{hall.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm">{hall.phone}</p>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm">周一至周五 {hall.hours.weekday}</p>
              {hall.hours.saturday ? (
                <p className="text-sm">周六 {hall.hours.saturday}</p>
              ) : (
                <p className="text-sm text-muted-foreground">周六不开放</p>
              )}
              <p className="text-sm text-muted-foreground">周日不开放</p>
            </div>
          </div>
          {hall.transit && (
            <div className="flex items-start gap-3">
              <Train className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm">{hall.transit}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm">{hall.parking ? "提供停车场" : "暂无停车场"}</p>
          </div>
        </div>
      </div>

      <div className="gov-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold">
          <Tag className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
          可办业务（{relatedServices.length} 项）
        </h2>
        {relatedServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无业务信息</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {relatedServices.map((service) => (
              <Link
                key={service.slug}
                to={`/service-center?item=${service.slug}`}
                className="group flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
                  }}
                >
                  <Building2 className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight group-hover:underline">
                    {service.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{service.category}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
