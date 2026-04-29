import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/apiClient"
import { useCAuthStore } from "@/stores/cAuthStore"
import type {
  CAuthMeResponse,
  CUser,
  SendCodeResponse,
  VerifyCodeResponse,
} from "@/types/api"

export const C_AUTH_KEYS = {
  me: ["c-auth", "me"] as const,
}

export function useCMe() {
  const setUser = useCAuthStore((s) => s.setUser)
  return useQuery<CAuthMeResponse>({
    queryKey: C_AUTH_KEYS.me,
    queryFn: async () => {
      const r = await api.get<CAuthMeResponse>("/api/c-auth/me")
      setUser(r.user)
      return r
    },
    staleTime: 60_000,
  })
}

interface SendCodeVars {
  email: string
}

export function useSendCode() {
  return useMutation<SendCodeResponse, ApiError, SendCodeVars>({
    mutationFn: (v) => api.post<SendCodeResponse>("/api/c-auth/send-code", { email: v.email }),
  })
}

interface VerifyCodeVars {
  email: string
  code: string
}

export function useVerifyCode() {
  const qc = useQueryClient()
  const setUser = useCAuthStore((s) => s.setUser)
  return useMutation<VerifyCodeResponse, ApiError, VerifyCodeVars>({
    mutationFn: (v) => api.post<VerifyCodeResponse>("/api/c-auth/verify-code", v),
    onSuccess: (data) => {
      setUser(data.user)
      qc.setQueryData<CAuthMeResponse>(C_AUTH_KEYS.me, {
        authenticated: true,
        user: data.user,
      })
    },
  })
}

export function useCLogout() {
  const qc = useQueryClient()
  const logout = useCAuthStore((s) => s.logout)
  return useMutation<{ ok: true }, ApiError, void>({
    mutationFn: () => api.post<{ ok: true }>("/api/c-auth/logout"),
    onSettled: () => {
      logout()
      qc.setQueryData<CAuthMeResponse>(C_AUTH_KEYS.me, {
        authenticated: false,
        user: null,
      })
      qc.removeQueries({ queryKey: ["history"] })
      qc.removeQueries({ queryKey: ["sessions"] })
      qc.removeQueries({ queryKey: ["my-applications"] })
    },
  })
}

interface RegisterVars {
  email: string
  password: string
  display_name?: string
}

interface RegisterResponse {
  ok: boolean
  message: string
  user: CUser
  is_new: boolean
}

export function useRegister() {
  const qc = useQueryClient()
  const setUser = useCAuthStore((s) => s.setUser)
  return useMutation<RegisterResponse, ApiError, RegisterVars>({
    mutationFn: (v) => api.post<RegisterResponse>("/api/c-auth/register", v),
    onSuccess: (data) => {
      setUser(data.user)
      qc.setQueryData<CAuthMeResponse>(C_AUTH_KEYS.me, {
        authenticated: true,
        user: data.user,
      })
    },
  })
}

interface LoginVars {
  email: string
  password: string
}

interface LoginResponse {
  ok: boolean
  message: string
  user: CUser
  is_new: boolean
}

export function useLogin() {
  const qc = useQueryClient()
  const setUser = useCAuthStore((s) => s.setUser)
  return useMutation<LoginResponse, ApiError, LoginVars>({
    mutationFn: (v) => api.post<LoginResponse>("/api/c-auth/login", v),
    onSuccess: (data) => {
      setUser(data.user)
      qc.setQueryData<CAuthMeResponse>(C_AUTH_KEYS.me, {
        authenticated: true,
        user: data.user,
      })
    },
  })
}

export function useCurrentCUser(): CUser | null {
  return useCAuthStore((s) => s.user)
}
