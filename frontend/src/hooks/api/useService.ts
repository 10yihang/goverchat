import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { ServiceItem, ProgressQueryResponse } from "@/types/api"

const KEYS = {
  items: (category?: string, keyword?: string) =>
    ["service", "items", { category, keyword }] as const,
  item: (slug: string | null) => ["service", "item", slug] as const,
}

interface ItemsResponse {
  items: ServiceItem[]
  categories: string[]
  hot_items: ServiceItem[]
}

export function useServiceItems(category?: string, keyword?: string) {
  return useQuery<ItemsResponse>({
    queryKey: KEYS.items(category, keyword),
    queryFn: () =>
      api.get<ItemsResponse>("/api/service/items", {
        query: { category, keyword },
      }),
    staleTime: 60_000,
  })
}

export function useServiceItem(slug: string | null) {
  return useQuery<{ item: ServiceItem }>({
    queryKey: KEYS.item(slug),
    queryFn: () => api.get<{ item: ServiceItem }>(`/api/service/items/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}

interface ProgressVars {
  service_slug: string
  query_no: string
}

export function useProgressQuery() {
  return useMutation<ProgressQueryResponse, Error, ProgressVars>({
    mutationFn: (vars) =>
      api.post<ProgressQueryResponse>("/api/service/progress/query", vars),
  })
}
