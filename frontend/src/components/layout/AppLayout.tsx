import { Outlet, useLocation } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"

export function AppLayout() {
  const location = useLocation()
  const isChatRoute = location.pathname === "/chat"

  return (
    <div className={isChatRoute ? "flex h-screen flex-col overflow-hidden" : "flex min-h-screen flex-col"}>
      <Header />
      <main className={isChatRoute ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0"}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
