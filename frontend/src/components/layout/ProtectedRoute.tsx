import { Navigate, useLocation } from "react-router-dom"
import { useMe } from "@/hooks/api/useAuth"
import { PageLoader } from "./PageLoader"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: "admin" | "viewer"
}

export function ProtectedRoute({ children, requireRole = "admin" }: ProtectedRouteProps) {
  const { data, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <PageLoader hint="校验登录态…" />

  const user = data?.user
  if (!user) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (requireRole === "admin" && user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
