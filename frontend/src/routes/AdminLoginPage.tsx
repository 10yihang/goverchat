import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react"
import { useLogin } from "@/hooks/api/useAuth"
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui"

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useLogin()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  function validate(): boolean {
    const errors: typeof fieldErrors = {}
    if (!username.trim()) errors.username = "请输入用户名"
    if (!password) errors.password = "请输入密码"
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: (data) => {
          const next = searchParams.get("next")
          if (next) {
            navigate(next, { replace: true })
          } else if (data.user.role === "admin") {
            navigate("/admin", { replace: true })
          } else {
            navigate("/", { replace: true })
          }
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 pt-20">
      <div className="w-full max-w-md">
        <div
          className="mb-6 rounded-xl px-8 py-10 text-center"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, black) 100%)",
            color: "var(--color-primary-foreground)",
          }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold">管理员登录</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest opacity-70">
            Government Console · Restricted Access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">账号验证</CardTitle>
            <CardDescription>请输入管理员凭证以访问后台系统</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }))
                  }}
                  aria-invalid={!!fieldErrors.username}
                />
                {fieldErrors.username && (
                  <p className="text-xs text-red-500">{fieldErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                  }}
                  aria-invalid={!!fieldErrors.password}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中…
                  </>
                ) : (
                  "登 录"
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              演示账号：admin / admin123（部署前请务必修改）
            </p>

            <div className="mt-4 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回首页
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
