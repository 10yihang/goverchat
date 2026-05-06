import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { queryClient } from "@/lib/queryClient"
import { AppLayout } from "@/components/layout/AppLayout"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { PageLoader } from "@/components/layout/PageLoader"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { CAuthGuard } from "@/components/layout/CAuthGuard"

const HomePage = lazy(() => import("@/routes/HomePage"))
const ChatPage = lazy(() => import("@/routes/ChatPage"))
const LoginPage = lazy(() => import("@/routes/LoginPage"))
const AdminLoginPage = lazy(() => import("@/routes/AdminLoginPage"))
const AdminPage = lazy(() => import("@/routes/AdminPage"))
const GuidePage = lazy(() => import("@/routes/GuidePage"))
const ServiceCenterPage = lazy(() => import("@/routes/ServiceCenterPage"))
const HallsPage = lazy(() => import("@/routes/HallsPage"))
const HallDetailPage = lazy(() => import("@/routes/HallDetailPage"))
const NotFoundPage = lazy(() => import("@/routes/NotFoundPage"))
const MyApplicationsPage = lazy(() => import("@/routes/MyApplicationsPage"))

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route
                  path="/chat"
                  element={
                    <CAuthGuard>
                      <ChatPage />
                    </CAuthGuard>
                  }
                />
                <Route path="/guide" element={<GuidePage />} />
                <Route path="/service-center" element={<ServiceCenterPage />} />
                <Route path="/halls" element={<HallsPage />} />
                <Route path="/halls/:id" element={<HallDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/my-applications"
                  element={
                    <CAuthGuard>
                      <MyApplicationsPage />
                    </CAuthGuard>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
