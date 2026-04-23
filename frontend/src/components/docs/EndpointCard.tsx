import { useState } from "react"
import { Lock, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui"
import { cn } from "@/lib/utils"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

const METHOD_TONE: Record<HttpMethod, "primary" | "gold" | "warning" | "danger"> = {
  GET: "primary",
  POST: "gold",
  PUT: "warning",
  DELETE: "danger",
}

interface EndpointCardProps {
  method: HttpMethod
  path: string
  description: string
  admin?: boolean
  hints?: string[]
  request?: string
  response?: string
}

export function EndpointCard({
  method,
  path,
  description,
  admin,
  hints,
  request,
  response,
}: EndpointCardProps) {
  const [open, setOpen] = useState(false)
  const hasDetail = Boolean(request || response)

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        open
          ? "border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_3%,transparent)]"
          : "border-[var(--color-border)] bg-[var(--color-card)]"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => hasDetail && setOpen((v) => !v)}
        disabled={!hasDetail}
      >
        <Badge tone={METHOD_TONE[method]} className="w-16 justify-center font-mono text-[10px] tracking-wider">
          {method}
        </Badge>

        <code className="flex-1 truncate font-mono text-sm text-[var(--color-foreground)]">
          {path}
        </code>

        {admin && (
          <Lock
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--color-accent-gold)" }}
          />
        )}

        <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:block">
          {description}
        </span>

        {hasDetail && (
          <span className="shrink-0 text-[var(--color-muted-foreground)]">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>

      <p className="px-4 pb-2 text-xs text-[var(--color-muted-foreground)] sm:hidden">
        {description}
      </p>

      {hints && hints.length > 0 && (
        <div className="flex gap-1.5 px-4 pb-2">
          {hints.map((h) => (
            <Badge key={h} tone="warning" className="text-[10px]">
              {h}
            </Badge>
          ))}
        </div>
      )}

      {open && hasDetail && (
        <div className="grid gap-3 border-t border-[var(--color-border)] px-4 py-3 md:grid-cols-2">
          {request && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Request
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                <code className="font-mono text-xs leading-relaxed text-[var(--color-foreground)]">
                  {request}
                </code>
              </pre>
            </div>
          )}
          {response && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Response
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                <code className="font-mono text-xs leading-relaxed text-[var(--color-foreground)]">
                  {response}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { EndpointCardProps, HttpMethod }
