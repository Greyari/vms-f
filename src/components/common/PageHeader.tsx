import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
