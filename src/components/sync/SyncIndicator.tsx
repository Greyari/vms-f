import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "@/context/I18nContext"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "@/types/hybrid"

const POLL_MS = 60_000

const LEVEL_STYLE: Record<SyncStatus["level"], { dot: string; labelKey: string; defaultLabel: string }> = {
  green: { dot: "bg-emerald-500", labelKey: "sync.synced", defaultLabel: "Sinkron" },
  yellow: { dot: "bg-amber-500", labelKey: "sync.sync_pending", defaultLabel: "Sinkron tertunda" },
  red: { dot: "bg-red-500", labelKey: "sync.not_synced", defaultLabel: "Tidak sinkron" },
  off: { dot: "bg-zinc-400", labelKey: "sync.sync_off", defaultLabel: "Sync cloud mati" },
}

/** Anything that is not a sync status (an old API, a proxy page) hides the indicator. */
function asStatus(data: unknown): SyncStatus | null {
  const candidate = data as Partial<SyncStatus> | null
  if (
    !candidate ||
    typeof candidate.level !== "string" ||
    !(candidate.level in LEVEL_STYLE)
  )
    return null
  return {
    ...candidate,
    channels: Array.isArray(candidate.channels) ? candidate.channels : [],
  } as SyncStatus
}

export default function SyncIndicator({
  canRun = false,
}: {
  canRun?: boolean
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [running, setRunning] = useState(false)

  const describe = (stat: SyncStatus): string => {
    if (stat.level === "off") return t("sync.hub_off_desc", "Gerbang berjalan tanpa Cloud Hub")
    if (stat.minutes_since_sync === null) return t("sync.never_synced", "Belum pernah sinkron")
    if (stat.minutes_since_sync < 1) return t("sync.last_synced_under_minute", "Terakhir sinkron < 1 menit lalu")
    return t("sync.last_synced_minutes", "Terakhir sinkron {{minutes}} menit lalu", {
      minutes: stat.minutes_since_sync,
    })
  }

  const load = useCallback(async () => {
    try {
      const res = await api.get("/sync/status")
      setStatus(asStatus(res?.data))
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const runNow = async () => {
    setRunning(true)
    try {
      const res = await api.post("/sync/run")
      setStatus(asStatus(res?.data))
      toast.success(t("sync.sync_success", "Siklus sync selesai."))
    } catch {
      toast.error(t("sync.sync_failed", "Sync gagal dijalankan. Periksa koneksi internet server."))
    } finally {
      setRunning(false)
    }
  }

  if (!status) return null

  const style = LEVEL_STYLE[status.level]
  const errors = status.channels.map((c) => c.last_error).filter(Boolean)
  const label = t(style.labelKey, style.defaultLabel)

  return (
    <div className="flex items-center gap-3" data-testid="sync-indicator">
      <div
        className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs dark:border-zinc-800"
        title={errors.length ? errors.join("\n") : undefined}
      >
        <span
          className={cn("h-2.5 w-2.5 rounded-full", style.dot)}
          aria-hidden="true"
        />
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500">· {describe(status)}</span>
        {status.pending_outbox > 0 && (
          <span className="rounded-full bg-amber-100 px-2 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            {t("sync.queued_count", "{{count}} antre", { count: status.pending_outbox })}
          </span>
        )}
      </div>
      {canRun && status.enabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={runNow}
          disabled={running}
          className="h-7 px-2 text-xs"
        >
          {running ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
          )}
          {t("sync.sync_now", "Sync sekarang")}
        </Button>
      )}
    </div>
  )
}
