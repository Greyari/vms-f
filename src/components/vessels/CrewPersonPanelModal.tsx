import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/context/I18nContext"
import { toast } from "sonner"
import api from "@/lib/axios"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Ship,
  IdCard,
  Clock,
  CheckCircle2,
  LogOut,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ExternalLink,
  History,
  ShieldAlert,
} from "lucide-react"

export interface PersonPanelDetail {
  visitor: {
    id: string
    name: string
    visitor_no?: string | number | null
    id_type: string
    id_number: string
    company?: string | null
    occupation?: string | null
    phone?: string | null
    gender?: string | null
    nationality?: string | null
    is_blacklisted: boolean
    blacklist_reason?: string | null
  }
  current_placement: {
    vessel_arrival_id?: string | null
    vessel_name?: string | null
    location_id?: string | null
    status: "expected" | "checked_in" | "checked_out" | string
    checked_in_at?: string | null
    checked_out_at?: string | null
    notes?: string | null
    sign_in_date?: string | null
    sign_out_date?: string | null
  } | null
  logs: Array<{
    id: string
    vessel_arrival_id: string
    visitor_id: string
    action: "check_in" | "check_out" | string
    source?: string | null
    performed_by_name?: string | null
    notes?: string | null
    logged_at: string
    vessel_name?: string | null
  }>
}

interface CrewPersonPanelModalProps {
  open: boolean
  onClose: () => void
  visitorId: string | null
  onOpenVesselArrival?: (arrivalId: string) => void
  onViewVesselCrew?: (arrivalId: string) => void
  onActionComplete?: () => void
}

export default function CrewPersonPanelModal({
  open,
  onClose,
  visitorId,
  onOpenVesselArrival,
  onViewVesselCrew,
  onActionComplete,
}: CrewPersonPanelModalProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<PersonPanelDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Action fields
  const [customDateTime, setCustomDateTime] = useState("")
  const [notes, setNotes] = useState("")

  // Confirmations
  const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false)
  const [confirmCheckOutOpen, setConfirmCheckOutOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!visitorId) return
    setLoading(true)
    try {
      const res = await api.get(
        `/vessel-arrivals/crew/${visitorId}/placement-detail`
      )
      setData(res.data)
      setCustomDateTime("")
      setNotes("")
    } catch {
      toast.error(t("vessel.failed_load_person", "Gagal memuat data kru"))
      onClose()
    } finally {
      setLoading(false)
    }
  }, [visitorId, onClose, t])

  useEffect(() => {
    if (open && visitorId) {
      loadData()
    } else {
      setData(null)
      setNotes("")
      setCustomDateTime("")
    }
  }, [open, visitorId, loadData])

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "-"
    try {
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) return ts
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ts
    }
  }

  // Handle Check-In
  const handleCheckIn = async () => {
    if (!data?.current_placement?.vessel_arrival_id || !data.visitor.id) return
    if (data.visitor.is_blacklisted) {
      toast.error(
        t(
          "vessel.blacklisted_crew_cannot_checkin",
          "Kru berstatus blacklist dan tidak dapat di-check-in."
        )
      )
      return
    }

    setActionLoading(true)
    try {
      const payload: Record<string, any> = {
        visitor_id: data.visitor.id,
      }
      if (customDateTime) {
        payload.checked_in_at = customDateTime
      }
      if (notes.trim()) {
        payload.notes = notes.trim()
      }

      await api.post(
        `/vessel-arrivals/${data.current_placement.vessel_arrival_id}/crew/check-in`,
        payload
      )
      toast.success(
        t("vessel.checkin_success", "Kru {{name}} berhasil di-check-in.", {
          name: data.visitor.name,
        })
      )
      await loadData()
      onActionComplete?.()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.conflict?.[0] ||
        t("vessel.checkin_failed", "Gagal melakukan check-in.")
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Check-Out
  const handleCheckOut = async () => {
    if (!data?.current_placement?.vessel_arrival_id || !data.visitor.id) return

    setActionLoading(true)
    try {
      const payload: Record<string, any> = {
        visitor_id: data.visitor.id,
      }
      if (customDateTime) {
        payload.checked_out_at = customDateTime
      }
      if (notes.trim()) {
        payload.notes = notes.trim()
      }

      await api.post(
        `/vessel-arrivals/${data.current_placement.vessel_arrival_id}/crew/check-out`,
        payload
      )
      toast.success(
        t("vessel.checkout_success", "Kru {{name}} berhasil di-check-out.", {
          name: data.visitor.name,
        })
      )
      setConfirmCheckOutOpen(false)
      await loadData()
      onActionComplete?.()
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t("vessel.checkout_failed", "Gagal melakukan check-out.")
      )
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Reactivate
  const handleReactivate = async () => {
    if (!data?.current_placement?.vessel_arrival_id || !data.visitor.id) return

    setActionLoading(true)
    try {
      await api.post(
        `/vessel-arrivals/${data.current_placement.vessel_arrival_id}/crew/reactivate`,
        {
          visitor_id: data.visitor.id,
          notes: notes.trim() || undefined,
        }
      )
      toast.success(
        t("vessel.reactivate_success", "Kru {{name}} berhasil diaktifkan kembali.", {
          name: data.visitor.name,
        })
      )
      setConfirmReactivateOpen(false)
      await loadData()
      onActionComplete?.()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.conflict?.[0] ||
        t("vessel.reactivate_failed", "Gagal mengaktifkan kembali kru.")
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const visitor = data?.visitor
  const placement = data?.current_placement
  const isCheckedIn = placement?.status === "checked_in"
  const isCheckedOut = placement?.status === "checked_out"
  const isExpected = !placement || placement.status === "expected"

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 overflow-y-auto"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl font-bold text-foreground">
                  {visitor?.name || t("common.loading", "Memuat...")}
                </SheetTitle>
                {visitor?.is_blacklisted && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    BLACKLIST
                  </Badge>
                )}
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                {t("vessel.person_panel_subtitle", "Manajemen status kru kapal, check-in, check-out, dan riwayat penugasan")}
              </SheetDescription>
            </div>
            {visitor?.visitor_no && (
              <Badge variant="outline" className="font-mono text-xs">
                #{visitor.visitor_no}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("common.loading", "Memuat detail kru...")}</p>
          </div>
        ) : !visitor ? (
          <div className="flex-1 p-8 text-center text-muted-foreground">
            {t("vessel.no_person_data", "Data kru tidak ditemukan")}
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6">
            {/* Blacklist Alert Banner */}
            {visitor.is_blacklisted && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 flex items-start gap-3 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm">
                    {t("vessel.crew_blacklisted_title", "Peringatan: Kru Ini Dalam Daftar Blacklist")}
                  </p>
                  <p className="mt-0.5">
                    {visitor.blacklist_reason || t("vessel.blacklisted_no_reason", "Alasan tidak dicantumkan.")}
                  </p>
                </div>
              </div>
            )}

            {/* Current Placement Card */}
            <div className="rounded-xl border border-border p-4 bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Ship className="h-4 w-4 text-primary" />
                  {t("vessel.current_placement", "Penempatan Saat Ini")}
                </h4>
                {isCheckedIn && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    {t("vessel.status_checked_in", "Sudah Check-In")}
                  </Badge>
                )}
                {isExpected && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300">
                    <Clock className="mr-1 h-3.5 w-3.5" />
                    {t("vessel.status_expected", "Belum Check-In")}
                  </Badge>
                )}
                {isCheckedOut && (
                  <Badge variant="outline" className="text-zinc-500 border-zinc-300 dark:border-zinc-700">
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    {t("vessel.status_checked_out", "Sudah Check-Out")}
                  </Badge>
                )}
              </div>

              {placement ? (
                <div className="space-y-2 pt-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{t("vessel.vessel_name", "Nama Kapal")}</span>
                    <span className="font-bold text-foreground text-base">
                      {placement.vessel_name || "-"}
                    </span>
                  </div>
                  {placement.sign_in_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("vessel.arrival_date", "Kedatangan Kapal")}</span>
                      <span className="font-medium text-foreground">{placement.sign_in_date}</span>
                    </div>
                  )}
                  {placement.checked_in_at && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("vessel.checked_in_at", "Waktu Check-In")}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatTimestamp(placement.checked_in_at)}
                      </span>
                    </div>
                  )}
                  {placement.checked_out_at && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("vessel.checked_out_at", "Waktu Check-Out")}</span>
                      <span className="font-medium text-zinc-500">
                        {formatTimestamp(placement.checked_out_at)}
                      </span>
                    </div>
                  )}
                  {placement.notes && (
                    <div className="pt-1 text-xs text-muted-foreground italic border-t border-border/50">
                      &ldquo;{placement.notes}&rdquo;
                    </div>
                  )}

                  {placement.vessel_arrival_id && (onViewVesselCrew || onOpenVesselArrival) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose()
                        const handler = onViewVesselCrew || onOpenVesselArrival
                        if (handler) {
                          handler(placement.vessel_arrival_id!)
                        }
                      }}
                      className="w-full mt-2 text-xs flex items-center justify-center gap-1.5 h-8"
                    >
                      <Ship className="h-3.5 w-3.5 text-primary" />
                      {t("vessel.view_vessel_crew", "Lihat Semua Kru Kapal Ini")}
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">
                  {t("vessel.no_active_placement", "Belum ada riwayat penempatan kapal aktif.")}
                </p>
              )}
            </div>

            {/* Action Buttons Section */}
            {placement && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("vessel.action_title", "Aksi Penugasan Kru")}
                </h4>

                {/* Optional note input */}
                <div className="space-y-1">
                  <Label htmlFor="panel-action-note" className="text-xs text-muted-foreground">
                    {t("vessel.action_notes", "Catatan Petugas (Opsional)")}
                  </Label>
                  <Input
                    id="panel-action-note"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("vessel.note_placeholder", "Contoh: Naik kapal shift malam...")}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                {/* Large Action Button Based on Status */}
                {isExpected && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={actionLoading || visitor.is_blacklisted}
                    className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                    {t("vessel.btn_check_in", "CHECK-IN KRU")}
                  </Button>
                )}

                {isCheckedIn && (
                  <Button
                    onClick={() => setConfirmCheckOutOpen(true)}
                    disabled={actionLoading}
                    variant="destructive"
                    className="w-full h-12 text-base font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="h-5 w-5" />
                    )}
                    {t("vessel.btn_check_out", "CHECK-OUT KRU")}
                  </Button>
                )}

                {isCheckedOut && (
                  <Button
                    onClick={() => setConfirmReactivateOpen(true)}
                    disabled={actionLoading || visitor.is_blacklisted}
                    variant="outline"
                    className="w-full h-11 text-sm font-bold border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    {t("vessel.btn_reactivate", "AKTIFKAN KEMBALI (REACTIVATE)")}
                  </Button>
                )}
              </div>
            )}

            {/* Identity Details Card */}
            <div className="rounded-xl border border-border p-4 bg-card shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <IdCard className="h-4 w-4" />
                {t("vessel.crew_identity", "Identitas Kru")}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">{t("visitor.id_type", "Tipe ID")}</span>
                  <span className="font-semibold text-foreground uppercase">{visitor.id_type || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("visitor.id_number", "No. Identitas")}</span>
                  <span className="font-semibold text-foreground font-mono">{visitor.id_number || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("visitor.company", "Perusahaan")}</span>
                  <span className="font-semibold text-foreground">{visitor.company || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("visitor.occupation", "Jabatan / Profesi")}</span>
                  <span className="font-semibold text-foreground">{visitor.occupation || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("visitor.nationality", "Kebangsaan")}</span>
                  <span className="font-semibold text-foreground">{visitor.nationality || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("visitor.phone", "No. Telepon")}</span>
                  <span className="font-semibold text-foreground">{visitor.phone || "-"}</span>
                </div>
              </div>
            </div>

            {/* History / Log Timeline */}
            <div className="rounded-xl border border-border p-4 bg-card shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4" />
                {t("vessel.crew_history_timeline", "Riwayat Penugasan")} ({data?.logs?.length || 0})
              </h4>

              {data?.logs && data.logs.length > 0 ? (
                <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {data.logs.map((log) => {
                    const isCheckIn = log.action === "check_in"
                    return (
                      <div key={log.id} className="relative text-xs space-y-0.5">
                        <div
                          className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                            isCheckIn ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span className={isCheckIn ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                            {isCheckIn ? "CHECK-IN" : "CHECK-OUT"} &bull; {log.vessel_name || "Kapal"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {formatTimestamp(log.logged_at)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {log.performed_by_name ? `Oleh: ${log.performed_by_name}` : "Oleh: Sistem"}
                        </div>
                        {log.notes && (
                          <div className="text-[11px] text-muted-foreground italic">
                            &ldquo;{log.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-1">
                  {t("vessel.no_history_logs", "Belum ada riwayat check-in/out.")}
                </p>
              )}
            </div>
          </div>
        )}

        <SheetFooter className="p-4 border-t border-border bg-muted/10">
          <Button variant="outline" onClick={onClose} className="w-full text-xs">
            {t("common.close", "Tutup")}
          </Button>
        </SheetFooter>
      </SheetContent>

      {/* Check-Out Confirmation Dialog */}
      <AlertDialog open={confirmCheckOutOpen} onOpenChange={setConfirmCheckOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("vessel.confirm_checkout_title", "Konfirmasi Check-Out Kru")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "vessel.confirm_checkout_desc",
                "Apakah Anda yakin ingin melakukan check-out untuk kru {{name}} dari kapal {{vessel}}? Data penempatan akan berstatus selesai (abu-abu).",
                {
                  name: visitor?.name || "",
                  vessel: placement?.vessel_name || "",
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("vessel.btn_check_out", "Check-Out")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={confirmReactivateOpen} onOpenChange={setConfirmReactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("vessel.confirm_reactivate_title", "Konfirmasi Aktifkan Kembali Kru")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "vessel.confirm_reactivate_desc",
                "Aktifkan kembali kru {{name}} pada kapal {{vessel}}? Kru akan berstatus Check-In kembali.",
                {
                  name: visitor?.name || "",
                  vessel: placement?.vessel_name || "",
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("vessel.btn_reactivate", "Aktifkan Kembali")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
