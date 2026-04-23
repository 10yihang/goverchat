import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, ApiError } from "@/lib/apiClient"
import type {
  ApplicationRecord,
  FormSchema,
  ApplicationsAdminResponse,
} from "@/types/api"

export const APPLICATION_KEYS = {
  mine: ["my-applications"] as const,
  byNo: (qn: string) => ["application", qn] as const,
  schema: (slug: string) => ["form-schema", slug] as const,
  admin: (filter: AdminFilter) => ["admin-applications", filter] as const,
}

interface SubmitVars {
  service_slug: string
  session_id: string | null
  form_data: Record<string, string>
}

interface SubmitResponse {
  application: ApplicationRecord
}

interface FormSchemaResponse {
  slug: string
  title: string
  category: string
  form_schema: FormSchema
}

export function useFormSchema(slug: string | null) {
  return useQuery<FormSchemaResponse>({
    queryKey: APPLICATION_KEYS.schema(slug ?? ""),
    queryFn: () => api.get<FormSchemaResponse>(`/api/service/items/${slug}/form-schema`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}

export function useSubmitApplication() {
  const qc = useQueryClient()
  return useMutation<SubmitResponse, ApiError, SubmitVars>({
    mutationFn: (v) =>
      api.post<SubmitResponse>("/api/applications", {
        service_slug: v.service_slug,
        session_id: v.session_id ?? undefined,
        form_data: v.form_data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.mine })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

interface MyApplicationsResponse {
  applications: ApplicationRecord[]
}

export function useMyApplications() {
  return useQuery<ApplicationRecord[]>({
    queryKey: APPLICATION_KEYS.mine,
    queryFn: async () => {
      const r = await api.get<MyApplicationsResponse>("/api/applications")
      return r.applications
    },
    staleTime: 30_000,
  })
}

export interface AdminFilter {
  status?: string
  service_slug?: string
  keyword?: string
}

export function useAdminApplications(filter: AdminFilter) {
  return useQuery<ApplicationsAdminResponse>({
    queryKey: APPLICATION_KEYS.admin(filter),
    queryFn: () => {
      const query: Record<string, string> = {}
      if (filter.status) query.status = filter.status
      if (filter.service_slug) query.service_slug = filter.service_slug
      if (filter.keyword) query.keyword = filter.keyword
      return api.get<ApplicationsAdminResponse>("/api/admin/applications", { query })
    },
    staleTime: 10_000,
  })
}

interface UpdateStatusVars {
  app_id: number
  status: string
  admin_remark?: string
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation<{ application: ApplicationRecord }, ApiError, UpdateStatusVars>({
    mutationFn: (v) =>
      api.patch<{ application: ApplicationRecord }>(
        `/api/admin/applications/${v.app_id}`,
        { status: v.status, admin_remark: v.admin_remark ?? "" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] })
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.mine })
    },
    onError: (err) => toast.error(err.message),
  })
}
