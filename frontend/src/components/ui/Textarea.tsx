import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[72px] w-full rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm leading-6 transition-colors",
        "placeholder:text-[var(--color-muted-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ borderColor: "var(--color-input)" }}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"
