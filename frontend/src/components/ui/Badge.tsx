import { cva, type VariantProps } from "class-variance-authority"
import { type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium leading-none",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]",
        primary:
          "bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)] border border-[color-mix(in_oklab,var(--color-primary)_25%,transparent)]",
        gold:
          "bg-[color-mix(in_oklab,var(--color-accent-gold)_18%,transparent)] text-[oklch(0.42_0.12_75)] border border-[color-mix(in_oklab,var(--color-accent-gold)_35%,transparent)]",
        success:
          "bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[oklch(0.4_0.12_155)] border border-[color-mix(in_oklab,var(--color-success)_30%,transparent)]",
        warning:
          "bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[oklch(0.42_0.12_75)] border border-[color-mix(in_oklab,var(--color-warning)_35%,transparent)]",
        danger:
          "bg-[color-mix(in_oklab,var(--color-destructive)_12%,transparent)] text-[var(--color-destructive)] border border-[color-mix(in_oklab,var(--color-destructive)_30%,transparent)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
