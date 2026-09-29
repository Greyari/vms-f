import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "@/types/hybrid"

const POLL_MS = 60_000

/** Anything that is not a sync status (an old API, a proxy page) hides the indicator. */
function asStatus(data: unknown): SyncStatus | null {
  const candidate = data as Partial<SyncStatus> | null
  if (!candidate || typeof candidate.level !== "string" || !(candidate.level in LEVEL_STYLE)) return null
  return { ...candidate, channels: Array.isArray(candidate.channels) ? candidate.channels : [] } as SyncStatus
}

const LEVEL_STYLE: Record<SyncStatus["level"], { dot: string; label: string }> = {
  green: { dot: "bg-emerald-500", label: "Sinkron" },
  yellow: { dot: "bg-amber-500", label: "Sinkron tertunda" },
  red: { dot: "bg-red-500", label: "Tidak sinkron" },
  off: { dot: "bg-zinc-400", label: "Sync cloud mati" },
}

function describe(status: SyncStatus): string {
  if (status.level === "off") return "Gerbang berjalan tanpa Cloud Hub"
  if (status.minutes_since_sync === null) return "Belum pernah sinkron"
  if (status.minutes_since_sync < 1) return "Terakhir sinkron < 1 menit lalu"
  return `Terakhir sinkron ${status.minutes_since_sync} menit lalu`
}

/**
 * The header indicator of hybrid decision FE-4c / PE-6: green when blacklist and pre-registrations
 * synced within five minutes, yellow within thirty, red after that or never. The gate works the same
 * whatever it shows; it only tells the officer how fresh the global blacklist is.
 */
export default function SyncIndicator({ canRun = false }: { canRun?: boolean }) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [running, setRunning] = useState(false)

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
      toast.success("Siklus sync selesai.")
    } catch {
      toast.error("Sync gagal dijalankan. Periksa koneksi internet server.")
    } finally {
      setRunning(false)
    }
  }

  if (!status) return null

  const style = LEVEL_STYLE[status.level]
  const errors = status.channels.map((c) => c.last_error).filter(Boolean)

  return (
    <div className="flex items-center gap-3" data-testid="sync-indicator">
      <div
        className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs dark:border-zinc-800"
        title={errors.length ? errors.join("\n") : undefined}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} aria-hidden="true" />
        <span className="font-medium">{style.label}</span>
        <span className="text-zinc-500">· {describe(status)}</span>
        {status.pending_outbox > 0 && (
          <span className="rounded-full bg-amber-100 px-2 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            {status.pending_outbox} antre
          </span>
        )}
      </div>
      {canRun && status.enabled && (
        <Button variant="ghost" size="sm" onClick={runNow} disabled={running} aria-label="Sync sekarang">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      )}
    </div>
  )
}
