import { useEffect, useRef, useState } from "react"
import AMapLoader from "@amap/amap-jsapi-loader"
import type { Hall } from "@/types/api"

declare global {
  interface Window {
    _AMapSecurityConfig: { securityJsCode: string }
  }
}

interface HallMapProps {
  halls: Hall[]
  activeId?: string | null
  userLat?: number
  userLng?: number
  onSelectHall?: (id: string) => void
}

const AMAP_KEY = "ceae0f784d1e49f09268490bbeee24d9"
const AMAP_SECURITY_CODE = "3ef664c5402c72cb096b3ae82125e5a7"

interface AMapInstance {
  setCenter(lnglat: [number, number]): void
  setZoom(zoom: number): void
  add(overlays: AMapMarker | AMapMarker[]): void
  remove(overlays: AMapMarker | AMapMarker[]): void
  destroy(): void
}

interface AMapMarkerOptions {
  position: [number, number]
  title?: string
  icon?: AMapIconInstance
}

interface AMapIconInstance {
  _brand: "AMapIcon"
}

interface AMapMarker {
  on(event: string, handler: () => void): void
  setIcon(icon: AMapIconInstance): void
  getPosition(): { lng: number; lat: number } | null
}

interface AMapConstructors {
  Map: new (container: HTMLElement, opts: object) => AMapInstance
  Marker: new (opts: AMapMarkerOptions) => AMapMarker
  Icon: new (opts: { size: AMapSizeInstance; image: string; imageSize: AMapSizeInstance }) => AMapIconInstance
  Size: new (w: number, h: number) => AMapSizeInstance
}

interface AMapSizeInstance {
  _brand: "AMapSize"
}

function makeMarkerIcon(AMap: AMapConstructors, active: boolean): AMapIconInstance {
  const color = active ? "oklch(0.35 0.07 245)" : "oklch(0.55 0.07 245)"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return new AMap.Icon({
    size: new AMap.Size(28, 36),
    image: url,
    imageSize: new AMap.Size(28, 36),
  })
}

export function HallMap({ halls, activeId, userLat, userLng, onSelectHall }: HallMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<AMapInstance | null>(null)
  const markersRef = useRef<Map<string, AMapMarker>>(new Map())
  const amapRef = useRef<AMapConstructors | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE }

    AMapLoader.load({
      key: AMAP_KEY,
      version: "2.0",
      plugins: ["AMap.Geolocation"],
    })
      .then((AMap: AMapConstructors) => {
        if (destroyed || !containerRef.current) return
        amapRef.current = AMap

        const center: [number, number] =
          userLat != null && userLng != null
            ? [userLng, userLat]
            : [116.397, 39.908]

        const map = new AMap.Map(containerRef.current, {
          zoom: 11,
          center,
        })
        mapRef.current = map

        halls.forEach((hall) => {
          const marker = new AMap.Marker({
            position: [hall.lng, hall.lat],
            title: hall.name,
            icon: makeMarkerIcon(AMap, hall.id === activeId),
          })
          marker.on("click", () => onSelectHall?.(hall.id))
          map.add(marker)
          markersRef.current.set(hall.id, marker)
        })
      })
      .catch(() => {
        if (!destroyed) setLoadError(true)
      })

    return () => {
      destroyed = true
      mapRef.current?.destroy()
      mapRef.current = null
      markersRef.current.clear()
      amapRef.current = null
    }
  }, [halls, userLat, userLng])

  useEffect(() => {
    const AMap = amapRef.current
    if (!AMap) return
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(makeMarkerIcon(AMap, id === activeId))
    })
  }, [activeId])

  if (loadError) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-lg border text-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-muted)",
          color: "var(--color-muted-foreground)",
        }}
      >
        地图加载失败，请检查网络后刷新
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg border"
      style={{ borderColor: "var(--color-border)" }}
    />
  )
}
