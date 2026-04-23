import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { AuthMeResponse, AuthUser } from "@/types/api"

const KEYS = {
  me: ["auth", "me"] as const,
}

export function useMe() {
  return useQuery<AuthMeResponse>({
    queryKey: KEYS.me,
    queryFn: () => api.get<AuthMeResponse>("/api/auth/me"),
    staleTime: 5 * 60_000,
  })
}

interface LoginVars {
  username: string
  password: string
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation<{ user: AuthUser }, Error, LoginVars>({
    mutationFn: (vars) => api.post<{ user: AuthUser }>("/api/auth/login", vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.me })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => api.post<void>("/api/auth/logout"),
    onSettled: () => {
      qc.setQueryData<AuthMeResponse>(KEYS.me, { authenticated: false, user: null })
      qc.invalidateQueries()
    },
  })
}
