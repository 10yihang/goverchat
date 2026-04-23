import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">HTTP 404</p>
      <h1 className="font-serif text-4xl font-bold">页面未找到</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        请检查地址栏，或返回首页继续浏览。
      </p>
      <Link
        to="/"
        className="rounded-md px-5 py-2 text-sm font-medium"
        style={{
          background: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
      >
        返回首页
      </Link>
    </div>
  )
}
