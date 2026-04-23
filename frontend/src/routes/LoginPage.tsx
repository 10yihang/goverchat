import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { Mail, Loader2, ArrowLeft, KeyRound } from "lucide-react"

import { useSendCode, useVerifyCode } from "@/hooks/api/useCAuth"
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

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

type Stage = "email" | "code"

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sendCode = useSendCode()
  const verifyCode = useVerifyCode()

  const [stage, setStage] = useState<Stage>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [emailError, setEmailError] = useState<string>("")
  const [codeError, setCodeError] = useState<string>("")
  const [cooldown, setCooldown] = useState<number>(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function validateEmail(): boolean {
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError("请输入邮箱")
      return false
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("邮箱格式不正确")
      return false
    }
    setEmailError("")
    return true
  }

  function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateEmail()) return
    if (cooldown > 0) return
    sendCode.mutate(
      { email: email.trim() },
      {
        onSuccess: (data) => {
          toast.success(data.message)
          setCooldown(data.cooldown ?? 60)
          setStage("code")
          if (data.dev_code) {
            toast.info(`开发模式验证码：${data.dev_code}`, { duration: 30_000 })
          }
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setCodeError("请输入 6 位数字验证码")
      return
    }
    setCodeError("")
    verifyCode.mutate(
      { email: email.trim(), code },
      {
        onSuccess: () => {
          toast.success("登录成功")
          const next = searchParams.get("next") ?? "/chat"
          navigate(next, { replace: true })
        },
        onError: (err) => {
          setCodeError(err.message)
        },
      },
    )
  }

  function handleResend() {
    if (cooldown > 0) return
    sendCode.mutate(
      { email: email.trim() },
      {
        onSuccess: (data) => {
          toast.success("验证码已重发")
          setCooldown(data.cooldown ?? 60)
          if (data.dev_code) {
            toast.info(`开发模式验证码：${data.dev_code}`, { duration: 30_000 })
          }
        },
        onError: (err) => toast.error(err.message),
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
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold">邮箱登录</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest opacity-70">
            Citizen Portal · Email + Verification Code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {stage === "email" ? "输入邮箱" : "输入验证码"}
            </CardTitle>
            <CardDescription>
              {stage === "email"
                ? "我们将向该邮箱发送 6 位验证码，无需密码即可登录"
                : `验证码已发送至 ${email}，5 分钟内有效`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stage === "email" ? (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError("")
                    }}
                    aria-invalid={!!emailError}
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={sendCode.isPending || cooldown > 0}
                >
                  {sendCode.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      发送中…
                    </>
                  ) : cooldown > 0 ? (
                    `${cooldown} 秒后可重试`
                  ) : (
                    "发送验证码"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="code">6 位验证码</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      if (codeError) setCodeError("")
                    }}
                    aria-invalid={!!codeError}
                    className="text-center text-lg tracking-[0.5em] font-mono"
                  />
                  {codeError && <p className="text-xs text-red-500">{codeError}</p>}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStage("email")
                      setCode("")
                      setCodeError("")
                    }}
                    className="flex-1"
                  >
                    更换邮箱
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-[2]"
                    disabled={verifyCode.isPending || code.length !== 6}
                  >
                    {verifyCode.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        验证中…
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        登 录
                      </>
                    )}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || sendCode.isPending}
                  className="block w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cooldown > 0 ? `${cooldown} 秒后可重新发送` : "重新发送验证码"}
                </button>
              </form>
            )}

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
