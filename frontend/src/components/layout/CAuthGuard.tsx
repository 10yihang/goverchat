import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useCMe } from "@/hooks/api/useCAuth"
import { PageLoader } from "./PageLoader"

interface CAuthGuardProps {
  children: ReactNode
}

export function CAuthGuard({ children }: CAuthGuardProps) {
  const { data, isLoading } = useCMe()
  const location = useLocation()

  if (isLoading) return <PageLoader hint="校验登录态…" />

  if (!data?.authenticated || !data.user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <>{children}</>
}
