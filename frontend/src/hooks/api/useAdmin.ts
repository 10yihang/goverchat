import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { AdminOverview, KnowledgeItem, AdminUser, ServiceItem } from "@/types/api"

const KEYS = {
  overview: ["admin", "overview"] as const,
  knowledge: ["admin", "knowledge"] as const,
  users: ["admin", "users"] as const,
  serviceItems: ["admin", "service-items"] as const,
}

export function useAdminOverview({ enablePolling }: { enablePolling: boolean }) {
  return useQuery<{ overview: AdminOverview }>({
    queryKey: KEYS.overview,
    queryFn: () => api.get<{ overview: AdminOverview }>("/api/admin/overview"),
    refetchInterval: enablePolling ? 3000 : false,
  })
}

interface KnowledgeFilter { keyword?: string; category?: string }
interface KnowledgeListRes { items: KnowledgeItem[]; categories: string[] }
interface MutationMsg { message: string; id?: number }

export function useAdminKnowledge(filter: KnowledgeFilter) {
  return useQuery<KnowledgeListRes>({
    queryKey: [...KEYS.knowledge, filter],
    queryFn: () => api.get<KnowledgeListRes>("/api/admin/knowledge", { query: { ...filter } }),
  })
}

interface KnowledgePayload {
  question: string; answer: string; category: string; keywords: string; weight: number
}

export function useCreateKnowledge() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, KnowledgePayload>({
    mutationFn: (body) => api.post<MutationMsg>("/api/admin/knowledge", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.knowledge })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

export function useUpdateKnowledge() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, { id: number; body: Partial<KnowledgePayload & { is_active: number }> }>({
    mutationFn: ({ id, body }) => api.put<MutationMsg>(`/api/admin/knowledge/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.knowledge })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

export function useDeleteKnowledge() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, number>({
    mutationFn: (id) => api.del<MutationMsg>(`/api/admin/knowledge/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.knowledge })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

export function useReloadKnowledge() {
  return useMutation<MutationMsg, Error, void>({
    mutationFn: () => api.post<MutationMsg>("/api/admin/knowledge/reload"),
  })
}

interface UserListRes { items: AdminUser[] }

export function useAdminUsers() {
  return useQuery<UserListRes>({
    queryKey: KEYS.users,
    queryFn: () => api.get<UserListRes>("/api/admin/users"),
  })
}

interface CreateUserPayload { username: string; password: string; role: string }

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, CreateUserPayload>({
    mutationFn: (body) => api.post<MutationMsg>("/api/admin/users", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

interface UpdateUserPayload {
  id: number
  body: { role?: string; is_active?: number; password?: string }
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, UpdateUserPayload>({
    mutationFn: ({ id, body }) => api.put<MutationMsg>(`/api/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

interface ServiceItemFilter { keyword?: string; category?: string }
interface ServiceItemListRes { items: ServiceItem[]; categories: string[] }
interface ServiceItemMutRes { message: string; item?: ServiceItem }

export function useAdminServiceItems(filter: ServiceItemFilter) {
  return useQuery<ServiceItemListRes>({
    queryKey: [...KEYS.serviceItems, filter],
    queryFn: () => api.get<ServiceItemListRes>("/api/admin/service-items", { query: { ...filter } }),
  })
}

export function useUpsertServiceItem() {
  const qc = useQueryClient()
  return useMutation<ServiceItemMutRes, Error, { existingSlug?: string; body: ServiceItem }>({
    mutationFn: ({ existingSlug, body }) =>
      existingSlug
        ? api.put<ServiceItemMutRes>(`/api/admin/service-items/${existingSlug}`, body)
        : api.post<ServiceItemMutRes>("/api/admin/service-items", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.serviceItems })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

export function useDeleteServiceItem() {
  const qc = useQueryClient()
  return useMutation<MutationMsg, Error, string>({
    mutationFn: (slug) => api.del<MutationMsg>(`/api/admin/service-items/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.serviceItems })
      qc.invalidateQueries({ queryKey: KEYS.overview })
    },
  })
}

const TOGGLE_KEY = ["admin", "llm-chat-toggle"] as const

export function useLLMChatToggle() {
  return useQuery<import("@/types/api").LLMChatToggleStatus>({
    queryKey: TOGGLE_KEY,
    queryFn: () => api.get<import("@/types/api").LLMChatToggleStatus>("/api/admin/llm-chat-toggle"),
    staleTime: 30_000,
  })
}

export function useSetLLMChatToggle() {
  const qc = useQueryClient()
  return useMutation<{ enabled: boolean }, Error, boolean>({
    mutationFn: (enabled) => api.put<{ enabled: boolean }>("/api/admin/llm-chat-toggle", { enabled }),
    onSuccess: (d) => {
      qc.setQueryData(TOGGLE_KEY, d)
    },
  })
}

const FEEDBACK_KEY = ["admin", "feedback"] as const

export function useFeedbackList(rating?: "up" | "down") {
  return useQuery<import("@/types/api").FeedbackListResponse>({
    queryKey: [...FEEDBACK_KEY, rating],
    queryFn: () => api.get<import("@/types/api").FeedbackListResponse>("/api/admin/feedback", {
      query: rating ? { rating } : undefined,
    }),
    staleTime: 30_000,
  })
}

const HEALTH_KEY = ["admin", "health"] as const

export function useHealthCheck() {
  return useQuery<import("@/types/api").HealthCheckResponse>({
    queryKey: HEALTH_KEY,
    queryFn: () => api.get<import("@/types/api").HealthCheckResponse>("/api/admin/health"),
    staleTime: 30_000,
  })
}
