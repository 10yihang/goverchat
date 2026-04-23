export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  formData?: FormData
}

const STATUS_503_MESSAGES: Record<string, string> = {
  model_loading: "语音模型正在预热，请 30 秒后再试。",
  ocr_disabled: "图片识别服务未启用，请联系管理员。",
  ocr_unavailable: "图片识别引擎未就绪，请稍后再试。",
  service_unavailable: "依赖服务暂未就绪，请稍后再试。",
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return ""
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue
    usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ""
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }
  try {
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

function extractMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>
    const errKey = typeof p.error === "string" ? p.error : ""
    if (status === 503 && errKey && STATUS_503_MESSAGES[errKey]) {
      return STATUS_503_MESSAGES[errKey]
    }
    if (typeof p.message === "string" && p.message) return p.message
    if (typeof p.error === "string" && p.error) return p.error
  }
  if (status === 401) return "请先登录后再操作。"
  if (status === 403) return "无权访问，需要管理员权限。"
  if (status === 404) return "请求的资源不存在。"
  if (status === 413) return "上传文件过大（最大 16 MB）。"
  if (status >= 500) return "服务异常，请稍后再试。"
  return `请求失败（${status}）。`
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers = {}, query, formData, ...rest } = options

  const init: RequestInit = {
    credentials: "include",
    ...rest,
    headers: { ...headers },
  }

  if (formData) {
    init.body = formData
  } else if (body !== undefined) {
    init.body = JSON.stringify(body)
    ;(init.headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  let res: Response
  try {
    res = await fetch(`${url}${buildQuery(query)}`, init)
  } catch (e) {
    throw new ApiError(
      e instanceof Error && e.message ? `网络异常：${e.message}` : "网络异常，请检查连接后重试。",
      0
    )
  }

  const payload = await parseBody(res)
  if (!res.ok) {
    if (
      res.status === 401
      && typeof window !== "undefined"
      && url.startsWith("/api/")
      && !url.startsWith("/api/c-auth/")
      && !url.startsWith("/api/auth/")
    ) {
      const path = window.location.pathname + window.location.search
      const onLogin = path.startsWith("/login") || path.startsWith("/admin/login")
      if (!onLogin) {
        const target = `/login?next=${encodeURIComponent(path)}`
        window.setTimeout(() => {
          window.location.href = target
        }, 50)
      }
    }
    throw new ApiError(extractMessage(payload, res.status), res.status, payload)
  }
  return (payload ?? null) as T
}

export const api = {
  get: <T = unknown>(url: string, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "GET" }),
  post: <T = unknown>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "POST", body }),
  put: <T = unknown>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "PATCH", body }),
  del: <T = unknown>(url: string, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "DELETE" }),
  upload: <T = unknown>(url: string, formData: FormData, opts?: RequestOptions) =>
    apiRequest<T>(url, { ...opts, method: "POST", formData }),
}
