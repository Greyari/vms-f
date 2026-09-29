import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GlobalBlacklistEntry, OutboxRow } from "@/types/hybrid"

const STATUS_LABEL: Record<OutboxRow["status"], string> = {
  pending: "Menunggu dikirim",
  sent: "Diterima hub",
  rejected: "Ditolak hub",
}

/**
 * The Global tab of the Blacklist page (hybrid spec §6.3, decisions FE-4b, SEC-3): the mirror of the
 * global blacklist, revocation of entries this yard registered, and the queue of requests waiting for
 * the hub. Changes appear in the list only after the hub accepts them and the next pull brings them back.
 */
export default function GlobalBlacklistPanel() {
  const [entries, setEntries] = useState<GlobalBlacklistEntry[]>([])
  const [outbox, setOutbox] = useState<OutboxRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"active" | "revoked" | "all">("active")
  const [revoking, setRevoking] = useState<GlobalBlacklistEntry | null>(null)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { status }
      if (search.trim()) params.search = search.trim()
      const [list, queue] = await Promise.all([
        api.get("/global-blacklists", { params }),
        api
          .get("/global-blacklists/outbox")
          .catch(() => ({ data: { data: [] } })),
      ])
      setEntries(Array.isArray(list.data) ? list.data : (list.data?.data ?? []))
      setOutbox(queue.data?.data ?? [])
    } catch {
      toast.error("Gagal memuat blacklist global.")
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const submitRevoke = async () => {
    if (!revoking || !note.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/global-blacklists/${revoking.id}/revoke`, {
        local_note: note.trim(),
      })
      toast.success(
        "Pencabutan masuk antrean dan dikirim pada siklus sync berikutnya."
      )
      setRevoking(null)
      setNote("")
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Pencabutan gagal dicatat.")
    } finally {
      setSubmitting(false)
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      await api.post("/sync/run")
      toast.success("Siklus sync selesai.")
      load()
    } catch {
      toast.error("Sync gagal dijalankan.")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Cari nama atau nomor identitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Cari blacklist global"
            />
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Status entri"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-9 rounded-md border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-800"
            >
              <option value="active">Aktif</option>
              <option value="revoked">Dicabut</option>
              <option value="all">Semua</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={syncNow}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync sekarang
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead>Identitas</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Didaftarkan oleh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-zinc-500"
                  >
                    Tidak ada entri blacklist global.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-muted-foreground uppercase">
                          {entry.id_type}
                        </span>
                        <span className="text-sm font-medium">
                          {entry.id_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>{entry.reason_label}</TableCell>
                    <TableCell>{entry.registered_by_yard}</TableCell>
                    <TableCell>
                      {entry.is_active ? "Aktif" : "Dicabut"}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.can_revoke ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevoking(entry)}
                        >
                          <ShieldCheck className="mr-1.5 h-4 w-4" /> Cabut
                          global
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {entry.is_active
                            ? `Hanya ${entry.registered_by_yard} yang bisa mencabut`
                            : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {outbox.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold">
            Antrean kirim ke Cloud Hub
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                <TableRow>
                  <TableHead>Permintaan</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Catatan lokal</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outbox.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.action === "add"
                        ? `Naikkan (${row.reason_label ?? "-"})`
                        : "Cabut"}
                    </TableCell>
                    <TableCell>
                      {row.name}{" "}
                      <span className="font-mono text-xs text-zinc-500">
                        {row.id_number}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px] text-xs">
                      {row.local_note ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.requested_by ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {STATUS_LABEL[row.status]}
                      {row.last_error && (
                        <div className="text-red-600 dark:text-red-400">
                          {row.last_error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cabut dari blacklist global</DialogTitle>
            <DialogDescription>
              {revoking?.name} ({revoking?.id_number}). Pencabutan dikirim ke
              Cloud Hub dan berlaku di semua yard setelah sinkron. Alasan di
              bawah hanya tersimpan di yard ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-note">Alasan pencabutan (lokal)</Label>
            <Textarea
              id="revoke-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevoking(null)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={submitRevoke}
              disabled={submitting || !note.trim()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cabut global
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
