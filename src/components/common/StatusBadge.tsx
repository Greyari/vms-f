import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatusVariant = "success" | "warning" | "danger" | "neutral"

interface StatusBadgeProps {
  variant?: StatusVariant
  children: ReactNode
  className?: string
  dot?: boolean
}

const VARIANT_STYLES: Record<StatusVariant, { badge: string; dot: string }> = {
  success: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  danger: {
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  neutral: {
    badge:
      "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
}

export function StatusBadge({
  variant = "neutral",
  children,
  className,
  dot = false,
}: StatusBadgeProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        styles.badge,
        className
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export default StatusBadge
