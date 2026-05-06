import { NavLink, Link } from "react-router-dom"
import { LogOut, Mail, ShieldCheck } from "lucide-react"

import { useMe, useLogout } from "@/hooks/api/useAuth"
import { useCMe, useCLogout } from "@/hooks/api/useCAuth"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "首页" },
  { to: "/chat", label: "智能咨询" },
  { to: "/guide", label: "业务引导" },
  { to: "/service-center", label: "办事服务" },
  { to: "/halls", label: "附近大厅" },
]

function NavTab({ to, label }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative px-3 py-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span>{label}</span>
          {isActive && (
            <span
              className="absolute -bottom-[1px] left-0 right-0 h-[2px]"
              style={{ background: "var(--color-accent-gold)" }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

export function Header() {
  const { data: adminMe } = useMe()
  const adminLogout = useLogout()
  const { data: cMe } = useCMe()
  const cLogout = useCLogout()

  const adminUser = adminMe?.user ?? null
  const cUser = cMe?.user ?? null

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur"
      style={{
        borderColor: "var(--color-border)",
        background: "color-mix(in oklab, var(--color-card) 92%, transparent)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ background: "var(--color-primary)" }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--color-primary-foreground)" }} />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-base font-bold tracking-tight">
              交通出行政务智能咨询
            </div>
            <div className="text-[11px] text-muted-foreground">
              Gov · Multimodal · Knowledge Base
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavTab key={item.to} {...item} />
          ))}
          {cUser && <NavTab to="/my-applications" label="我的办件" />}
        </nav>

        <div className="flex items-center gap-2">
          {cUser ? (
            <>
              <span className="hidden text-xs text-muted-foreground md:inline">
                <Mail className="mr-1 inline h-3 w-3" />
                {cUser.email}
              </span>
              <button
                type="button"
                onClick={() => cLogout.mutate()}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                style={{ borderColor: "var(--color-border)" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                退出
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
            >
              登录
            </Link>
          )}

          {adminUser ? (
            <>
              <Link
                to="/admin"
                className="hidden rounded-md px-3 py-1.5 text-xs font-medium transition-colors md:inline"
                style={{
                  background: "var(--color-accent-gold)",
                  color: "var(--color-accent-gold-foreground)",
                }}
              >
                管理后台 · {adminUser.username}
              </Link>
              <button
                type="button"
                onClick={() => adminLogout.mutate()}
                className="hidden items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted md:flex"
                style={{ borderColor: "var(--color-border)" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                退出管理
              </button>
            </>
          ) : (
            <Link
              to="/admin/login"
              className="hidden rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted md:inline"
              style={{ borderColor: "var(--color-border)" }}
            >
              管理员入口
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
