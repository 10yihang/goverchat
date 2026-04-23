import { ShieldCheck } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
      >
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div
        className="inline-flex items-center gap-1 rounded-md px-4 py-3"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="inline-block h-2 w-2 rounded-full animate-bounce"
            style={{
              background: "var(--color-muted-foreground)",
              animationDelay: `${delay}ms`,
              animationDuration: "0.6s",
            }}
          />
        ))}
      </div>
    </div>
  )
}
