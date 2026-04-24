import { useQuery } from "@tanstack/react-query"
import hallsData from "@/data/halls.json"
import type { Hall } from "@/types/api"

const KEYS = {
  halls: ["halls"] as const,
  hall: (id: string) => ["halls", "detail", id] as const,
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function mockWaitCount(windows: number): number {
  return Math.max(2, Math.floor(Math.random() * windows * 2))
}

const rawHalls = hallsData.halls as Hall[]

export function useHalls(userLat?: number, userLng?: number, serviceFilter?: string) {
  return useQuery<Hall[]>({
    queryKey: [...KEYS.halls, userLat, userLng, serviceFilter],
    queryFn: () => {
      return rawHalls
        .filter((h) => !serviceFilter || h.services.includes(serviceFilter))
        .map((h) => ({
          ...h,
          distance:
            userLat != null && userLng != null
              ? calcDistance(userLat, userLng, h.lat, h.lng)
              : undefined,
          wait_count: mockWaitCount(h.windows),
        }))
        .sort((a, b) => {
          if (a.distance != null && b.distance != null) return a.distance - b.distance
          return 0
        })
    },
    staleTime: 30_000,
  })
}

export function useHall(id: string | null) {
  return useQuery<Hall | undefined>({
    queryKey: KEYS.hall(id ?? ""),
    queryFn: () => {
      const hall = rawHalls.find((h) => h.id === id)
      if (!hall) throw new Error("未找到该大厅信息")
      return { ...hall, wait_count: mockWaitCount(hall.windows) }
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}
