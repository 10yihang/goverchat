interface PageLoaderProps {
  hint?: string
}

export function PageLoader({ hint = "加载中…" }: PageLoaderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-10 w-10">
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-30"
          style={{ background: "var(--color-primary)" }}
        />
        <span
          className="absolute inset-1 rounded-full"
          style={{ background: "var(--color-primary)" }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
