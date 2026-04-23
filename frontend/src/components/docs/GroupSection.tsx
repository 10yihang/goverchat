import type { LucideIcon } from "lucide-react"
import { EndpointCard, type EndpointCardProps } from "./EndpointCard"

interface Endpoint extends EndpointCardProps {
  id: string
}

interface GroupSectionProps {
  icon: LucideIcon
  title: string
  description: string
  endpoints: Endpoint[]
}

export function GroupSection({ icon: Icon, title, description, endpoints }: GroupSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold">{title}</h3>
          <p className="text-xs text-[var(--color-muted-foreground)]">{description}</p>
        </div>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: "color-mix(in oklab, var(--color-accent-gold) 15%, transparent)",
            color: "oklch(0.42 0.12 75)",
          }}
        >
          {endpoints.length} 个接口
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {endpoints.map((ep) => (
          <EndpointCard key={ep.id} {...ep} />
        ))}
      </div>
    </div>
  )
}

export type { Endpoint, GroupSectionProps }
