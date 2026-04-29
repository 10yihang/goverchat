import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { Mail, Loader2, ArrowLeft, Lock } from "lucide-react"

import { useRegister, useLogin } from "@/hooks/api/useCAuth"
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui"

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

type TabValue = "login" | "register"

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registerMut = useRegister()
  const loginMut = useLogin()

  const [tab, setTab] = useState<TabValue>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function clearErrors() {
    setErrors({})
  }

  function handleRegister(e: FormEvent) {
    e.preventDefault()
    clearErrors()
    const errs: Record<string, string> = {}

    const em = email.trim()
    if (!em) errs.email = "请输入邮箱"
    else if (!EMAIL_REGEX.test(em)) errs.email = "邮箱格式不正确"

    if (!password) errs.password = "请输入密码"
    else if (password.length < 6) errs.password = "密码至少 6 位"

    if (password !== confirmPassword) errs.confirmPassword = "两次密码不一致"

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    registerMut.mutate(
      { email: em, password },
      {
        onSuccess: (data) => {
          toast.success(data.message)
          const next = searchParams.get("next") ?? "/chat"
          navigate(next, { replace: true })
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    clearErrors()
    const errs: Record<string, string> = {}

    const em = email.trim()
    if (!em) errs.email = "请输入邮箱"
    else if (!EMAIL_REGEX.test(em)) errs.email = "邮箱格式不正确"

    if (!password) errs.password = "请输入密码"

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    loginMut.mutate(
      { email: em, password },
      {
        onSuccess: (data) => {
          toast.success(data.message)
          const next = searchParams.get("next") ?? "/chat"
          navigate(next, { replace: true })
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const isPending = registerMut.isPending || loginMut.isPending

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
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold">
            {tab === "register" ? "注册账号" : "账号登录"}
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest opacity-70">
            Citizen Portal
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {tab === "register" ? "创建新账号" : "欢迎回来"}
            </CardTitle>
            <CardDescription>
              {tab === "register"
                ? "注册后即可使用全部功能"
                : "输入邮箱和密码登录"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); clearErrors() }}>
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="login" className="flex-1">登录</TabsTrigger>
                <TabsTrigger value="register" className="flex-1">注册</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱地址</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (errors.email) clearErrors() }}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="输入密码"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (errors.password) clearErrors() }}
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
                    {loginMut.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中…</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" />登 录</>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">邮箱地址</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (errors.email) clearErrors() }}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密码</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="至少 6 位"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (errors.password) clearErrors() }}
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">确认密码</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) clearErrors() }}
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>

                  <Button type="submit" variant="gold" className="w-full" disabled={isPending}>
                    {registerMut.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />注册中…</>
                    ) : (
                      <><Mail className="mr-2 h-4 w-4" />注 册</>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
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
