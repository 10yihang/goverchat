import * as LabelPrimitive from "@radix-ui/react-label"
import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-xs font-medium text-[var(--color-foreground)]", className)}
    {...props}
  />
))
Label.displayName = "Label"
