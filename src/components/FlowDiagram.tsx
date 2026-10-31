import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  ArrowDown,
  RotateCcw,
  Compass,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "@/context/I18nContext"
import { canAccessPath } from "@/lib/routePermissions"
import type { OverviewPagePath } from "@/config/appOverview"
import { Button } from "@/components/ui/button"

export interface FlowDiagramNode {
  id: string
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  path?: OverviewPagePath
}

export interface FlowDiagramProps {
  id?: string
  titleKey?: string
  nodes: FlowDiagramNode[]
  tourId?: string
  onStartTour?: (tourId: string) => void
}

export default function FlowDiagram({
  id,
  titleKey,
  nodes,
  tourId,
  onStartTour,
}: FlowDiagramProps) {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const [replayCount, setReplayCount] = useState(0)

  const canAccess = (path: OverviewPagePath): boolean => {
    if (path === "/") {
      return hasPermission("view_visits")
    }
    return canAccessPath(path, hasPermission)
  }

  return (
    <div
      data-tour={id ? `flow-diagram-${id}` : undefined}
      className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {titleKey && (
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t(titleKey)}
          </h4>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReplayCount((prev) => prev + 1)}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            {t("app_overview.flow_replay")}
          </Button>

          {tourId && onStartTour && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onStartTour(tourId)}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <Compass className="h-3 w-3" />
              {t("app_overview.flow_start_tour")}
            </Button>
          )}
        </div>
      </div>

      <ol
        key={replayCount}
        className="flex flex-col items-stretch gap-2 md:flex-row md:items-center"
      >
        {nodes.map((node, idx) => {
          const Icon = node.icon
          const hasPath = Boolean(node.path)
          const allowed = node.path ? canAccess(node.path) : false
          const isLink = hasPath && allowed
          const nodeDelayMs = idx * 140
          const lineDelayMs = idx * 140 + 70

          const cardInner = (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isLink
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {idx + 1}
                </span>
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isLink
                      ? "text-zinc-800 dark:text-zinc-200"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                />
                <p
                  className={`text-xs font-semibold ${
                    isLink
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {t(node.titleKey)}
                </p>
              </div>
              <p
                className={`mt-1.5 text-[11px] leading-relaxed ${
                  isLink
                    ? "text-zinc-600 dark:text-zinc-300"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {t(node.descriptionKey)}
              </p>
            </>
          )

          return (
            <li
              key={node.id}
              data-tour={
                id ? `flow-node-${id}-${node.id}` : `flow-node-${node.id}`
              }
              className="flex flex-1 flex-col items-stretch gap-2 md:flex-row md:items-center"
            >
              {isLink && node.path ? (
                <Link
                  to={node.path}
                  style={{ animationDelay: `${nodeDelayMs}ms` }}
                  className="vms-flow-node group flex-1 rounded-md border border-zinc-200 bg-white p-3 shadow-2xs transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  {cardInner}
                </Link>
              ) : (
                <div
                  data-disabled="true"
                  style={{ animationDelay: `${nodeDelayMs}ms` }}
                  className="vms-flow-node flex-1 rounded-md border border-dashed border-zinc-200 bg-zinc-100/70 p-3 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  {cardInner}
                </div>
              )}

              {idx < nodes.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{ animationDelay: `${lineDelayMs}ms` }}
                  className="vms-flow-connector flex shrink-0 items-center justify-center py-0.5 text-zinc-400 md:px-1 md:py-0 dark:text-zinc-600"
                >
                  <div className="hidden items-center md:flex">
                    <span className="h-0.5 w-4 bg-zinc-300 dark:bg-zinc-700" />
                    <ArrowRight className="-ml-1 h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col items-center md:hidden">
                    <span className="h-3 w-0.5 bg-zinc-300 dark:bg-zinc-700" />
                    <ArrowDown className="-mt-1 h-3.5 w-3.5" />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
