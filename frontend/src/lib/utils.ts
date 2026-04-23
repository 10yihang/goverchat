import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDateTime(input: string | number | Date): string {
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number): string => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
