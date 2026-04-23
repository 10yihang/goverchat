import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-md border bg-[var(--color-card)] px-3 py-1.5 text-sm transition-colors",
      "placeholder:text-[var(--color-muted-foreground)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&::file-selector-button]:mr-3 [&::file-selector-button]:rounded [&::file-selector-button]:border-0 [&::file-selector-button]:bg-[var(--color-muted)] [&::file-selector-button]:px-3 [&::file-selector-button]:py-1 [&::file-selector-button]:text-xs",
      className
    )}
    style={{ borderColor: "var(--color-input)" }}
    {...props}
  />
))
Input.displayName = "Input"
