import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { GuideTopic } from "@/types/api"

const KEYS = {
  topics: ["guide", "topics"] as const,
  topic: (slug: string) => ["guide", "topic", slug] as const,
}

export function useGuideTopics() {
  return useQuery<{ items: GuideTopic[] }>({
    queryKey: KEYS.topics,
    queryFn: () => api.get<{ items: GuideTopic[] }>("/api/guide/topics"),
    staleTime: 5 * 60_000,
  })
}

export function useGuideTopic(slug: string | null) {
  return useQuery<{ item: GuideTopic }>({
    queryKey: KEYS.topic(slug ?? ""),
    queryFn: () => api.get<{ item: GuideTopic }>(`/api/guide/topics/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}
