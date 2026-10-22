import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Ship,
  Loader2,
  Calendar,
  MapPin,
  User,
  Users,
  Building,
  FileCheck,
  LogIn,
  LogOut,
  UserPlus,
  History,
  X,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react"
import CrewSelectionDialog from "./CrewSelectionDialog"
import CrewPersonPanelModal from "./CrewPersonPanelModal"

interface CrewMember {
  id: string
  visitor_no?: string | null
  name: string
  id_type: string
  id_number: string
  gender?: string | null
  occupation?: string | null
  nationality?: string | null
  certificate?: string | null
  certificate_no?: string | null
  seaman_book_no?: string | null
  pivot?: {
    id?: string
    status?: "checked_in" | "checked_out" | string
    checked_in_at?: string | null
    checked_out_at?: string | null
    notes?: string | null
  }
}

export interface CrewLogEntry {
  id: string
  vessel_arrival_id: string
  visitor_id: string
  visit_id?: string | null
  action: "check_in" | "check_out" | string
  source?: string | null
  performed_by?: string | null
  performed_by_name?: string | null
  notes?: string | null
  logged_at: string
  visitor?: {
    id: string
    visitor_no?: string | null
    name: string
    id_type?: string | null
    id_number?: string | null
    occupation?: string | null
  } | null
}

interface ArrivalDetail {
  id: string
  location_id: string
  vessel_name: string
  sign_in_date: string
  sign_out_date?: string | null
  sign_in_port?: string | null
  sign_out_port?: string | null
  captain?: string | null
  local_agent_company?: string | null
  local_agent_name?: string | null
  local_agent_phone?: string | null
  local_agent_location?: string | null
  foreign_agent_company?: string | null
  foreign_agent_name?: string | null
  foreign_agent_phone?: string | null
  foreign_agent_location?: string | null
  vessel?: {
    id: string
    name: string
    code?: string | null
    type: string
    vessel_type?: string | null
    call_sign?: string | null
    flag?: string | null
    port?: string | null
    captain?: string | null
    pic?: string | null
  } | null
  crew?: CrewMember[]
  crew_logs?: CrewLogEntry[]
}

interface VesselArrivalDetailModalProps {
  open: boolean
  onClose: () => void
  arrivalId: string | null
  onUpdated?: () => void
}

const getSourceLabel = (source?: string | null, t?: (key: string, fallback: string) => string): string => {
  switch (source) {
    case "visit_checkin":
      return t ? t("vesselArrivals.source_visit_checkin", "Tambah Kunjungan (Gate)") : "Tambah Kunjungan (Gate)"
    case "vessel_signon":
      return t ? t("vesselArrivals.source_vessel_signon", "Manifest Kedatangan") : "Manifest Kedatangan"
    case "vessel_signout":
      return t ? t("vesselArrivals.source_vessel_signout", "Kapal Berangkat (Sign-Out)") : "Kapal Berangkat (Sign-Out)"
    case "manual":
    default:
      return t ? t("vesselArrivals.source_manual", "Check-In/Out Manual") : "Check-In/Out Manual"
  }
}

export default function VesselArrivalDetailModal({
  open,
  onClose,
  arrivalId,
  onUpdated,
}: VesselArrivalDetailModalProps) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<ArrivalDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingCrewId, setProcessingCrewId] = useState<string | null>(null)
  const [addCrewOpen, setAddCrewOpen] = useState(false)

  // Tabs & Log filters
  const [activeTab, setActiveTab] = useState<"manifest" | "logs">("manifest")
  const [selectedCrewFilter, setSelectedCrewFilter] = useState<string>("")
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("")
  const [actionNote, setActionNote] = useState<string>("")

  // Bulk selection & Person Panel
  const [selectedCrewIds, setSelectedCrewIds] = useState<Set<string>>(new Set())
  const [personPanelVisitorId, setPersonPanelVisitorId] = useState<string | null>(null)
  const [personPanelOpen, setPersonPanelOpen] = useState(false)

  useEffect(() => {
    if (!open || !arrivalId) {
      setDetail(null)
      setActiveTab("manifest")
      setSelectedCrewFilter("")
      setSelectedActionFilter("")
      setActionNote("")
      return
    }

    async function loadDetail() {
      setLoading(true)
      try {
        const res = await api.get(`/vessel-arrivals/${arrivalId}`)
        setDetail(res.data)
      } catch {
        toast.error("Gagal memuat detail kedatangan kapal")
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [open, arrivalId])

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return null
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

  const handleCrewCheckIn = async (crewIds: string[]) => {
    if (!detail || crewIds.length === 0) return
    setProcessingCrewId(crewIds[0])
    try {
      const payload: Record<string, any> = {
        crew_ids: crewIds,
      }
      if (actionNote.trim()) {
        payload.notes = actionNote.trim()
      }
      const res = await api.post(
        `/vessel-arrivals/${detail.id}/crew/check-in`,
        payload
      )
      setDetail(res.data)
      setActionNote("")
      toast.success("Kru berhasil di-check-in ke kapal.")
      onUpdated?.()
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal melakukan check-in kru."
      )
    } finally {
      setProcessingCrewId(null)
    }
  }

  const handleCrewCheckOut = async (crewIds: string[]) => {
    if (!detail || crewIds.length === 0) return
    setProcessingCrewId(crewIds[0])
    try {
      const payload: Record<string, any> = {
        crew_ids: crewIds,
      }
      if (actionNote.trim()) {
        payload.notes = actionNote.trim()
      }
      const res = await api.post(
        `/vessel-arrivals/${detail.id}/crew/check-out`,
        payload
      )
      setDetail(res.data)
      setActionNote("")
      toast.success("Kru berhasil di-check-out dari kapal.")
      onUpdated?.()
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal melakukan check-out kru."
      )
    } finally {
      setProcessingCrewId(null)
    }
  }

  const isInPort = detail && !detail.sign_out_date
  const checkedInCrew = (detail?.crew || []).filter(
    (c) => c.pivot?.status !== "checked_out"
  )
  const checkedOutCrew = (detail?.crew || []).filter(
    (c) => c.pivot?.status === "checked_out"
  )

  const sortedCrew = useMemo(() => {
    if (!detail?.crew) return []
    return [...detail.crew].sort((a, b) => {
      const aOut = a.pivot?.status === "checked_out" ? 1 : 0
      const bOut = b.pivot?.status === "checked_out" ? 1 : 0
      if (aOut !== bOut) return aOut - bOut
      return a.name.localeCompare(b.name)
    })
  }, [detail?.crew])

  const handleCrewReactivate = async (visitorId: string) => {
    if (!detail) return
    setProcessingCrewId(visitorId)
    try {
      const res = await api.post(
        `/vessel-arrivals/${detail.id}/crew/reactivate`,
        { visitor_id: visitorId }
      )
      setDetail(res.data)
      toast.success("Kru berhasil diaktifkan kembali.")
      onUpdated?.()
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal mengaktifkan kembali kru."
      )
    } finally {
      setProcessingCrewId(null)
    }
  }

  const toggleSelectCrew = (crewId: string) => {
    setSelectedCrewIds((prev) => {
      const next = new Set(prev)
      if (next.has(crewId)) {
        next.delete(crewId)
      } else {
        next.add(crewId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!detail?.crew || detail.crew.length === 0) return
    if (selectedCrewIds.size === detail.crew.length) {
      setSelectedCrewIds(new Set())
    } else {
      setSelectedCrewIds(new Set(detail.crew.map((c) => c.id)))
    }
  }

  const handleBulkCheckIn = async () => {
    const ids = Array.from(selectedCrewIds)
    if (ids.length === 0) return
    await handleCrewCheckIn(ids)
    setSelectedCrewIds(new Set())
  }

  const handleBulkCheckOut = async () => {
    const ids = Array.from(selectedCrewIds)
    if (ids.length === 0) return
    await handleCrewCheckOut(ids)
    setSelectedCrewIds(new Set())
  }

  // Synthesize fallback logs from crew pivot timestamps if crew_logs is not provided
  const allCrewLogs = useMemo<CrewLogEntry[]>(() => {
    if (Array.isArray(detail?.crew_logs) && detail!.crew_logs.length > 0) {
      return detail!.crew_logs
    }
    const fallback: CrewLogEntry[] = []
    for (const c of detail?.crew || []) {
      if (c.pivot?.checked_in_at) {
        fallback.push({
          id: `${c.id}-in`,
          vessel_arrival_id: detail?.id || "",
          visitor_id: c.id,
          action: "check_in",
          source: "vessel_signon",
          performed_by_name: "System",
          notes: c.pivot?.notes || "Check-In kru di kapal",
          logged_at: c.pivot.checked_in_at,
          visitor: {
            id: c.id,
            visitor_no: c.visitor_no,
            name: c.name,
            id_type: c.id_type,
            id_number: c.id_number,
            occupation: c.occupation,
          },
        })
      }
      if (c.pivot?.status === "checked_out" && c.pivot?.checked_out_at) {
        fallback.push({
          id: `${c.id}-out`,
          vessel_arrival_id: detail?.id || "",
          visitor_id: c.id,
          action: "check_out",
          source: "manual",
          performed_by_name: "System",
          notes: c.pivot?.notes || "Check-Out kru dari kapal",
          logged_at: c.pivot.checked_out_at,
          visitor: {
            id: c.id,
            visitor_no: c.visitor_no,
            name: c.name,
            id_type: c.id_type,
            id_number: c.id_number,
            occupation: c.occupation,
          },
        })
      }
    }
    return fallback.sort(
      (a, b) =>
        new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    )
  }, [detail])

  const filteredCrewLogs = useMemo(() => {
    return allCrewLogs.filter((log) => {
      if (selectedCrewFilter && log.visitor_id !== selectedCrewFilter) {
        return false
      }
      if (selectedActionFilter && log.action !== selectedActionFilter) {
        return false
      }
      return true
    })
  }, [allCrewLogs, selectedCrewFilter, selectedActionFilter])

  const handleOpenCrewLog = (crewId: string) => {
    setSelectedCrewFilter(crewId)
    setActiveTab("logs")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl md:max-w-7xl w-[96vw] max-h-[92vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {t("vesselArrivals.detail_title", "Detail Kedatangan Kapal")}: {detail?.vessel_name || t("common.loading", "Memuat...")}
            </DialogTitle>
            {detail && (
              <div>
                {isInPort ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                    {t("vesselArrivals.status_in_port", "Sedang Sandar")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t("vesselArrivals.status_departed", "Sudah Berangkat")}</Badge>
                )}
              </div>
            )}
          </div>
          <DialogDescription>
            {t("vesselArrivals.detail_desc", "Rincian informasi kapal, jadwal sandar pelabuhan, keagenan, serta check-in, check-out & riwayat log kru pelaut.")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {t("vesselArrivals.loading_details", "Memuat detail transaksi kapal...")}
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center py-16 text-zinc-500">
            {t("vesselArrivals.not_found", "Data kedatangan kapal tidak ditemukan.")}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pt-2 pr-1">
            {/* Seksi 1: Info Kapal & Rute */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-500" />
                  <span>{detail.vessel_name}</span>
                  {detail.vessel?.code && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {detail.vessel.code}
                    </Badge>
                  )}
                  {detail.vessel?.vessel_type && (
                    <Badge variant="secondary" className="text-xs">
                      {detail.vessel.vessel_type}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  {detail.vessel?.call_sign && (
                    <span>
                      Call Sign: <strong>{detail.vessel.call_sign}</strong>
                    </span>
                  )}
                  {detail.vessel?.flag && (
                    <span>
                      {t("vesselArrivals.quick_vessel_flag", "Bendera")}: <strong>{detail.vessel.flag}</strong>
                    </span>
                  )}
                  {detail.vessel?.pic && (
                    <span>
                      {t("vesselArrivals.quick_vessel_pic", "Note / PIC")}: <strong>{detail.vessel.pic}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("vesselArrivals.sign_in_time", "Waktu Masuk (Sign-In)")}
                  </div>
                  <div className="font-medium mt-0.5">{detail.sign_in_date}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {t("vesselArrivals.from_port", "Dari: {{port}}", { port: detail.sign_in_port || "-" })}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("vesselArrivals.sign_out_time", "Waktu Keluar (Sign-Out)")}
                  </div>
                  <div className="font-medium mt-0.5">
                    {detail.sign_out_date || t("vesselArrivals.not_departed", "Belum Berangkat")}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {t("vesselArrivals.to_port", "Ke: {{port}}", { port: detail.sign_out_port || "-" })}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {t("vesselArrivals.label_captain", "Nakhoda / Captain")}
                  </div>
                  <div className="font-medium mt-0.5">
                    {detail.captain || detail.vessel?.captain || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Seksi 2: Informasi Keagenan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  {t("vesselArrivals.local_agent_title", "Agen Lokal (Indonesia)")}
                </div>
                <div className="text-sm font-medium">
                  {detail.local_agent_company || "-"}
                </div>
                <div className="text-xs text-zinc-500">
                  PIC: {detail.local_agent_name || "-"} • Telp:{" "}
                  {detail.local_agent_phone || "-"}
                </div>
                {detail.local_agent_location && (
                  <div className="text-xs text-zinc-400">
                    {t("common.location", "Lokasi")}: {detail.local_agent_location}
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  {t("vesselArrivals.foreign_agent_title", "Agen Luar Negeri (Foreign)")}
                </div>
                <div className="text-sm font-medium">
                  {detail.foreign_agent_company || "-"}
                </div>
                <div className="text-xs text-zinc-500">
                  PIC: {detail.foreign_agent_name || "-"} • Telp:{" "}
                  {detail.foreign_agent_phone || "-"}
                </div>
                {detail.foreign_agent_location && (
                  <div className="text-xs text-zinc-400">
                    {t("common.location", "Lokasi")}: {detail.foreign_agent_location}
                  </div>
                )}
              </div>
            </div>

            {/* Seksi 3: Tab Switcher Manifest Kru vs Riwayat Log Keluar-Masuk Kru */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manifest")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "manifest"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t("vesselArrivals.tab_manifest", "Manifest Kru On-Board")}
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                      {detail.crew?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("logs")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "logs"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    {t("vesselArrivals.tab_movement_logs", "Riwayat Log Keluar-Masuk Kru")}
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                      {allCrewLogs.length}
                    </span>
                  </button>

                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs">
                    {checkedInCrew.length} {t("vesselArrivals.status_checked_in", "Check-In")}
                  </Badge>
                  {checkedOutCrew.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {checkedOutCrew.length} {t("vesselArrivals.status_checked_out", "Check-Out")}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder={t("vesselArrivals.action_note_placeholder", "Catatan Check-In/Out (opsional)...")}
                    className="h-8 w-52 text-xs"
                  />
                  {checkedInCrew.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(processingCrewId)}
                      onClick={() =>
                        handleCrewCheckOut(checkedInCrew.map((c) => c.id))
                      }
                      className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      {t("vesselArrivals.btn_checkout_all", "Check-Out Semua Kru")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAddCrewOpen(true)}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    {t("vesselArrivals.btn_checkin_add_crew", "Check-In / Tambah Kru")}
                  </Button>
                </div>
              </div>

              {/* Bulk Actions Bar if items selected */}
              {selectedCrewIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs">
                  <div className="font-medium text-blue-900 dark:text-blue-200">
                    {t("vesselArrivals.selected_crew_bar", "Terpilih {{count}} kru", { count: selectedCrewIds.size })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleBulkCheckIn}
                      className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300"
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      {t("vesselArrivals.bulk_checkin", "Check-In Terpilih")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleBulkCheckOut}
                      className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      {t("vesselArrivals.bulk_checkout", "Check-Out Terpilih")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCrewIds(new Set())}
                      className="h-7 text-xs text-zinc-500"
                    >
                      {t("common.cancel", "Batal")}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "manifest" ? (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
                      <TableRow>
                        <TableHead className="w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="p-1 hover:text-blue-600 transition-colors"
                            title={t("vesselArrivals.select_all_title", "Pilih semua")}
                          >
                            {detail.crew &&
                            detail.crew.length > 0 &&
                            selectedCrewIds.size === detail.crew.length ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-400" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="w-10 text-center">{t("vesselArrivals.col_no", "No")}</TableHead>
                        <TableHead>{t("vesselArrivals.col_crew_name_id", "Nama Kru & ID")}</TableHead>
                        <TableHead>{t("vesselArrivals.col_occupation", "Jabatan")}</TableHead>
                        <TableHead>{t("vesselArrivals.col_nationality", "Kebangsaan")}</TableHead>
                        <TableHead>{t("vesselArrivals.col_seaman_cert", "Buku Pelaut & Sertifikat")}</TableHead>
                        <TableHead>{t("vesselArrivals.col_status_checkin_out", "Status Check-In / Out")}</TableHead>
                        <TableHead className="text-right">{t("vesselArrivals.col_crew_actions", "Aksi Kru")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!sortedCrew || sortedCrew.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="h-24 text-center text-zinc-500 text-sm"
                          >
                            {t("vesselArrivals.no_crew_recorded", "Belum ada kru yang tercatat pada transaksi kedatangan ini.")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedCrew.map((member, idx) => {
                          const isCheckedOut =
                            member.pivot?.status === "checked_out"
                          const isExpected =
                            member.pivot?.status === "expected"
                          const isBusy = processingCrewId === member.id
                          const isSelected = selectedCrewIds.has(member.id)
                          const memberLogCount = allCrewLogs.filter(
                            (l) => l.visitor_id === member.id
                          ).length

                          return (
                            <TableRow
                              key={member.id}
                              className={`transition-colors ${
                                isCheckedOut
                                  ? "opacity-65 bg-zinc-50/60 dark:bg-zinc-900/40 text-zinc-500"
                                  : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50"
                              }`}
                            >
                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectCrew(member.id)}
                                  className="p-1 hover:text-blue-600 transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-zinc-400" />
                                  )}
                                </button>
                              </TableCell>
                              <TableCell className="text-center text-xs text-zinc-400">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPersonPanelVisitorId(member.id)
                                    setPersonPanelOpen(true)
                                  }}
                                  className="text-left group cursor-pointer"
                                >
                                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors underline-offset-2 group-hover:underline">
                                    {member.name}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {member.visitor_no
                                      ? `ID: ${member.visitor_no}`
                                      : ""}
                                    {member.id_number
                                      ? ` • ${member.id_type?.toUpperCase()}: ${member.id_number}`
                                      : ""}
                                  </div>
                                </button>
                              </TableCell>
                              <TableCell className="text-sm">
                                {member.occupation || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                                {member.nationality || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="text-xs font-mono">
                                  {member.seaman_book_no
                                    ? `Buku: ${member.seaman_book_no}`
                                    : "-"}
                                </div>
                                {member.certificate_no && (
                                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                    <FileCheck className="h-3 w-3 text-emerald-600" />
                                    {member.certificate_no}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isCheckedOut ? (
                                  <div className="space-y-0.5">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs opacity-80"
                                    >
                                      {t("vesselArrivals.status_checked_out", "Check-Out (Turun)")}
                                    </Badge>
                                    {member.pivot?.checked_out_at && (
                                      <div className="text-[11px] text-zinc-500">
                                        {t("vesselArrivals.out_label", "Keluar")}:{" "}
                                        {formatTimestamp(
                                          member.pivot.checked_out_at
                                        )}
                                      </div>
                                    )}
                                    {member.pivot?.notes && (
                                      <div className="text-[11px] text-zinc-400 italic">
                                        {member.pivot.notes}
                                      </div>
                                    )}
                                  </div>
                                ) : isExpected ? (
                                  <div className="space-y-0.5">
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-xs"
                                    >
                                      {t("vesselArrivals.status_expected", "Belum Check-In (Expected)")}
                                    </Badge>
                                    {member.pivot?.notes && (
                                      <div className="text-[11px] text-zinc-400 italic">
                                        {member.pivot.notes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                                      {t("vesselArrivals.status_checked_in", "Check-In (Di Kapal)")}
                                    </Badge>
                                    {member.pivot?.checked_in_at && (
                                      <div className="text-[11px] text-zinc-500">
                                        {t("vesselArrivals.in_label", "Masuk")}:{" "}
                                        {formatTimestamp(
                                          member.pivot.checked_in_at
                                        )}
                                      </div>
                                    )}
                                    {member.pivot?.notes && (
                                      <div className="text-[11px] text-zinc-400 italic">
                                        {member.pivot.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap space-x-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenCrewLog(member.id)}
                                  title={`${t("vesselArrivals.view_crew_log_title", "Lihat Riwayat Log")} ${member.name}`}
                                  className="h-7 px-2 text-xs text-zinc-600 hover:text-blue-600 dark:text-zinc-400"
                                >
                                  <History className="h-3 w-3 mr-1" />
                                  {t("vesselArrivals.btn_log", "Log")} ({memberLogCount})
                                </Button>

                                {isCheckedOut ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleCrewReactivate(member.id)
                                    }
                                    className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        {t("vesselArrivals.reactivate_btn", "Aktifkan Kembali")}
                                      </>
                                    )}
                                  </Button>
                                ) : isExpected ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleCrewCheckIn([member.id])
                                    }
                                    className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <LogIn className="h-3 w-3 mr-1" />
                                        {t("vesselArrivals.btn_checkin_crew", "Check-In Kru")}
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleCrewCheckOut([member.id])
                                    }
                                    className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <LogOut className="h-3 w-3 mr-1" />
                                        {t("vesselArrivals.btn_checkout_crew", "Check-Out Kru")}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Filter Bar untuk Riwayat Log Kru */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-850">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {t("vesselArrivals.filter_crew_label", "Filter Kru")}:
                      </span>
                      <select
                        aria-label="Filter Kru"
                        value={selectedCrewFilter}
                        onChange={(e) => setSelectedCrewFilter(e.target.value)}
                        className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">{t("vesselArrivals.filter_all_crew", "Semua Kru")} ({detail.crew?.length || 0})</option>
                        {(detail.crew || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.id_number})
                          </option>
                        ))}
                      </select>

                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 ml-2">
                        {t("vesselArrivals.filter_action_label", "Aksi:")}
                      </span>
                      <select
                        aria-label="Filter Aksi Log"
                        value={selectedActionFilter}
                        onChange={(e) => setSelectedActionFilter(e.target.value)}
                        className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">{t("vesselArrivals.filter_all_actions", "Semua Aksi")}</option>
                        <option value="check_in">{t("vesselArrivals.log_type_check_in", "Check-In (Masuk)")}</option>
                        <option value="check_out">{t("vesselArrivals.log_type_check_out", "Check-Out (Turun)")}</option>
                      </select>

                      {(selectedCrewFilter || selectedActionFilter) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCrewFilter("")
                            setSelectedActionFilter("")
                          }}
                          className="h-7 text-xs text-zinc-500"
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t("common.reset", "Reset Filter")}
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500">
                      {t("vesselArrivals.showing_logs_count", "Menampilkan {{count}} aktivitas log", { count: filteredCrewLogs.length })}
                    </div>
                  </div>

                  {/* Tabel Riwayat Log Keluar-Masuk Kru */}
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
                        <TableRow>
                          <TableHead className="w-12 text-center">{t("vesselArrivals.col_no", "No")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_activity_time", "Waktu Aktivitas")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_crew_name_identity", "Nama Kru & Identitas")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_status_action", "Status / Aksi")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_activity_source", "Sumber Aktivitas")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_officer", "Petugas")}</TableHead>
                          <TableHead>{t("vesselArrivals.col_notes", "Keterangan / Catatan")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCrewLogs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center text-zinc-500 text-sm"
                            >
                              {t("vesselArrivals.no_logs_found", "Belum ada riwayat log keluar-masuk kru untuk filter ini.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCrewLogs.map((log, index) => {
                            const isCheckIn = log.action === "check_in"
                            const crewInfo =
                              log.visitor ||
                              detail.crew?.find(
                                (c) => c.id === log.visitor_id
                              ) ||
                              null

                            return (
                              <TableRow
                                key={log.id}
                                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50"
                              >
                                <TableCell className="text-center text-xs text-zinc-500">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-mono text-xs whitespace-nowrap">
                                  {formatTimestamp(log.logged_at) || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                    {crewInfo?.name || t("vesselArrivals.crew_tag", "Kru Kapal")}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {crewInfo?.occupation
                                      ? `${crewInfo.occupation} • `
                                      : ""}
                                    {crewInfo?.id_number || "-"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isCheckIn ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                                      <LogIn className="h-3 w-3 mr-1" />
                                      {t("vesselArrivals.log_type_check_in", "Check-In (Masuk)")}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs"
                                    >
                                      <LogOut className="h-3 w-3 mr-1" />
                                      {t("vesselArrivals.log_type_check_out", "Check-Out (Turun)")}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-zinc-600 dark:text-zinc-300">
                                  {getSourceLabel(log.source, t)}
                                </TableCell>
                                <TableCell className="text-xs text-zinc-600 dark:text-zinc-300">
                                  {log.performed_by_name || t("vesselArrivals.default_officer", "Petugas Security")}
                                </TableCell>
                                <TableCell className="text-xs text-zinc-600 dark:text-zinc-300">
                                  {log.notes || "-"}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.close", "Tutup")}
          </Button>
        </DialogFooter>

        {detail && (
          <CrewSelectionDialog
            open={addCrewOpen}
            onClose={() => setAddCrewOpen(false)}
            locationId={detail.location_id}
            arrivalId={detail.id}
            selectedCrewIds={checkedInCrew.map((c) => c.id)}
            onSave={(crewIds) => {
              if (crewIds.length > 0) {
                handleCrewCheckIn(crewIds)
              }
            }}
          />
        )}

        <CrewPersonPanelModal
          open={personPanelOpen}
          onClose={() => {
            setPersonPanelOpen(false)
            setPersonPanelVisitorId(null)
          }}
          visitorId={personPanelVisitorId}
          onActionComplete={async () => {
            if (arrivalId) {
              try {
                const res = await api.get(`/vessel-arrivals/${arrivalId}`)
                setDetail(res.data)
              } catch {
                // silent
              }
            }
            onUpdated?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
