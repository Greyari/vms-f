import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Search,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  ShieldAlert,
} from "lucide-react"

export interface LogRow {
  id: string
  causer_id: string | null
  causer_name: string | null
  causer_username: string | null
  causer_email: string | null
  action: string
  subject_type: string | null
  subject_id: string | null
  subject_label: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

export function formatLogDateTime(raw?: string | null): string {
  if (!raw) return "-"
  try {
    const parsed = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"))
    if (!Number.isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, "0")
      const m = String(parsed.getMonth() + 1).padStart(2, "0")
      const y = parsed.getFullYear()
      const hh = String(parsed.getHours()).padStart(2, "0")
      const mm = String(parsed.getMinutes()).padStart(2, "0")
      const ss = String(parsed.getSeconds()).padStart(2, "0")
      return `${d}/${m}/${y} ${hh}:${mm}:${ss}`
    }
  } catch {
    // fallback
  }
  return raw
}

export function getRelativeTime(raw?: string | null, isIndo = true): string {
  if (!raw) return ""
  try {
    const parsed = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"))
    if (Number.isNaN(parsed.getTime())) return ""
    const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000)
    if (diffSec < 0) return ""
    if (diffSec < 45) return isIndo ? "baru saja" : "just now"
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return isIndo ? `${diffMin} mnt lalu` : `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return isIndo ? `${diffHr} jam lalu` : `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 30) return isIndo ? `${diffDay} hari lalu` : `${diffDay}d ago`
    return ""
  } catch {
    return ""
  }
}

const FIELD_LABELS: Record<string, { id: string; en: string }> = {
  name: { id: "Nama", en: "Name" },
  visitor_name: { id: "Nama Pengunjung", en: "Visitor Name" },
  company: { id: "Perusahaan", en: "Company" },
  visitor_company: { id: "Perusahaan Pengunjung", en: "Visitor Company" },
  host_name: { id: "Nama Staf yang Dikunjungi", en: "Staff to Visit Name" },
  host_occupation: { id: "Jabatan Staf", en: "Staff Occupation" },
  host_department: { id: "Departemen Staf", en: "Staff Department" },
  department: { id: "Departemen", en: "Department" },
  occupation: { id: "Jabatan / Pekerjaan", en: "Occupation" },
  location_name: { id: "Tujuan Lokasi", en: "Destination Location" },
  location_id: { id: "ID Lokasi", en: "Location ID" },
  purpose: { id: "Keperluan / Tujuan", en: "Purpose" },
  status: { id: "Status", en: "Status" },
  ticket_number: { id: "Nomor Tiket", en: "Ticket Number" },
  card_no: { id: "Nomor Kartu", en: "Card Number" },
  visitor_cards: { id: "Kartu Pengunjung", en: "Visitor Cards" },
  vehicle_no: { id: "Nomor Plat Kendaraan", en: "Vehicle Plate Number" },
  vehicle_card_id: { id: "Kartu Kendaraan", en: "Vehicle Card" },
  phone: { id: "Nomor Telepon", en: "Phone Number" },
  email: { id: "Email", en: "Email" },
  username: { id: "Username", en: "Username" },
  role: { id: "Peran / Role", en: "Role" },
  roles: { id: "Daftar Peran", en: "Roles List" },
  permissions: { id: "Hak Akses", en: "Permissions" },
  id_type: { id: "Tipe Identitas", en: "ID Type" },
  id_number: { id: "Nomor Identitas", en: "ID Number" },
  gender: { id: "Jenis Kelamin", en: "Gender" },
  nationality: { id: "Kewarganegaraan", en: "Nationality" },
  vessel_name: { id: "Nama Kapal", en: "Vessel Name" },
  vessel_id: { id: "ID Kapal", en: "Vessel ID" },
  date: { id: "Tanggal", en: "Date" },
  time_in: { id: "Jam Masuk", en: "Time In" },
  time_out: { id: "Jam Keluar", en: "Time Out" },
  checked_in_at: { id: "Waktu Check-In", en: "Check-In Time" },
  checked_out_at: { id: "Waktu Check-Out", en: "Check-Out Time" },
  created_by: { id: "Dibuat Oleh (ID)", en: "Created By (ID)" },
  created_by_name: { id: "Petugas Pencatat", en: "Recording Officer" },
  checked_out_by: { id: "Di-Checkout Oleh (ID)", en: "Checked Out By (ID)" },
  checked_out_by_name: { id: "Petugas Check-Out", en: "Checkout Officer" },
  printed_by: { id: "Dicetak Oleh", en: "Printed By" },
  is_active: { id: "Status Aktif", en: "Active Status" },
  notes: { id: "Catatan", en: "Notes" },
  remarks: { id: "Keterangan", en: "Remarks" },
  reason: { id: "Alasan", en: "Reason" },
  password: { id: "Kata Sandi", en: "Password" },
  code: { id: "Kode", en: "Code" },
}

function getFieldLabel(key: string, isIndo: boolean): { title: string; technical: string } {
  const item = FIELD_LABELS[key]
  if (item) {
    return {
      title: isIndo ? item.id : item.en,
      technical: key,
    }
  }
  const humanized = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    title: humanized,
    technical: key,
  }
}

function renderValue(val: any, t: any) {
  if (val === null || val === undefined || val === "") {
    return (
      <span className="italic text-zinc-400">
        ({t("logs.empty_val", "Kosong / Tidak diisi")})
      </span>
    )
  }
  if (typeof val === "boolean") {
    return (
      <span className="font-mono font-semibold text-[11px]">
        {val ? "TRUE (Ya)" : "FALSE (Tidak)"}
      </span>
    )
  }
  if (typeof val === "object") {
    return (
      <pre className="max-h-56 overflow-auto rounded bg-zinc-900/5 p-2 font-mono text-[11px] leading-relaxed text-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        {JSON.stringify(val, null, 2)}
      </pre>
    )
  }
  return (
    <div className="break-words break-all whitespace-pre-wrap font-sans text-xs">
      {String(val)}
    </div>
  )
}

const ACTION_LABEL_FALLBACK: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  restored: "Restored",
  login: "Login",
  logout: "Logout",
  login_failed: "Login Failed",
}

const ALL = "__all__"

export default function ActivityLogs() {
  const { t, language } = useTranslation()
  const isIndo = language === "id"

  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [subjectTypes, setSubjectTypes] = useState<string[]>([])

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return t("logs.action_created", "Created")
      case "updated":
        return t("logs.action_updated", "Updated")
      case "deleted":
        return t("logs.action_deleted", "Deleted")
      case "restored":
        return t("logs.action_restored", "Restored")
      case "login":
        return t("logs.action_login", "Login")
      case "logout":
        return t("logs.action_logout", "Logout")
      case "login_failed":
        return t("logs.action_login_failed", "Login Failed")
      case "reprinted":
        return t("logs.action_reprinted", "Cetak Ulang Pass")
      case "checked_in":
        return t("logs.action_checked_in", "Check-In")
      case "checked_out":
        return t("logs.action_checked_out", "Check-Out")
      case "blacklisted":
        return t("logs.action_blacklisted", "Masuk Blacklist")
      case "unblacklisted":
        return t("logs.action_unblacklisted", "Dicabut Blacklist")
      default:
        return ACTION_LABEL_FALLBACK[action] || action
    }
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "created":
      case "checked_in":
        return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
      case "updated":
        return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
      case "deleted":
      case "login_failed":
      case "blacklisted":
        return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
      case "restored":
      case "unblacklisted":
        return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
      case "reprinted":
        return "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
      case "checked_out":
        return "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
      case "login":
      case "logout":
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
    }
  }

  // Filters
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState(ALL)
  const [subjectFilter, setSubjectFilter] = useState(ALL)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 100

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)

  const fetchSubjectTypes = async () => {
    try {
      const res = await api.get("/activity-logs/subject-types")
      const types = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      setSubjectTypes(types)
    } catch {
      // non-critical
    }
  }

  const fetchLogs = useCallback(
    async (filters: Record<string, any>, page: number) => {
      setLoading(true)
      try {
        const params: Record<string, any> = {
          page,
          per_page: perPage,
          ...filters,
        }

        const res = await api.get("/activity-logs", { params })
        const payload = res.data

        const rows: LogRow[] = Array.isArray(payload)
          ? payload
          : (payload?.data ?? [])

        setLogs(rows)
        if (!Array.isArray(payload) && payload?.last_page !== undefined) {
          setLastPage(payload.last_page)
          setTotal(payload.total ?? rows.length)
        } else {
          setLastPage(1)
          setTotal(rows.length)
        }
      } catch (err) {
        console.error(err)
        toast.error(t("logs.toast_load_failed", "Gagal memuat log aktivitas."))
      } finally {
        setLoading(false)
      }
    },
    [perPage, t]
  )

  useEffect(() => {
    fetchSubjectTypes()
  }, [])

  useEffect(() => {
    fetchLogs(appliedFilters, currentPage)
  }, [appliedFilters, currentPage, fetchLogs])

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const newFilters: Record<string, any> = {}

    if (search.trim()) newFilters.search = search.trim()
    if (actionFilter !== ALL) newFilters.action = actionFilter
    if (subjectFilter !== ALL) newFilters.subject_type = subjectFilter

    setCurrentPage(1)
    setAppliedFilters(newFilters)
  }

  const handleResetFilter = () => {
    setSearch("")
    setActionFilter(ALL)
    setSubjectFilter(ALL)
    setCurrentPage(1)
    setAppliedFilters({})
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("logs.title", "Log Aktivitas Sistem (Activity Logs)")}
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            {t("logs.description", "Jejak audit seluruh perubahan data, pencatatan check-in/out, dan sesi login pengguna sistem.")}
          </p>
        </div>
      </div>

      {/* Filter Box */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t("logs.search_placeholder", "Cari pelaku atau subjek...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-full md:w-44 text-sm">
              <SelectValue placeholder={t("logs.filter_all_actions", "Semua Aksi")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("logs.filter_all_actions", "Semua Aksi")}</SelectItem>
              {Object.keys(ACTION_LABEL_FALLBACK).map((val) => (
                <SelectItem key={val} value={val}>
                  {getActionLabel(val)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {subjectTypes.length > 0 && (
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="h-9 w-full md:w-44 text-sm">
                <SelectValue placeholder={t("logs.filter_all_subjects", "Semua Subjek")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("logs.filter_all_subjects", "Semua Subjek")}</SelectItem>
                {subjectTypes.map((tVal) => (
                  <SelectItem key={tVal} value={tVal}>
                    {tVal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilter}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("common.reset", "Reset")}
            </Button>
            <Button type="submit" size="sm" className="gap-1.5" disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {t("common.search", "Cari")}
            </Button>
          </div>
        </form>
      </div>

      {/* Table Data */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="w-12 text-center">{t("common.no", "No")}</TableHead>
                <TableHead>{t("logs.col_timestamp", "Waktu")}</TableHead>
                <TableHead>{t("logs.col_user", "Pelaku")}</TableHead>
                <TableHead>{t("logs.col_event", "Event")}</TableHead>
                <TableHead>{t("logs.col_subject", "Subjek")}</TableHead>
                <TableHead>{t("logs.col_ip", "IP Address")}</TableHead>
                <TableHead className="w-20 text-right">{t("common.detail", "Detail")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs">{t("logs.loading_logs", "Memuat log aktivitas...")}</span>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500 text-xs">
                    {t("logs.empty_logs", "Tidak ada aktivitas yang tercatat sesuai filter.")}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => {
                  const actorDisplay = log.causer_name || (log.causer_username ? `@${log.causer_username}` : log.causer_email) || t("logs.actor_system", "Sistem")

                  return (
                    <TableRow key={log.id || index} className="text-xs hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                      <TableCell className="text-center text-zinc-500 font-mono">
                        {(currentPage - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-700 dark:text-zinc-300">
                        <div className="font-semibold text-xs whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {formatLogDateTime(log.created_at)}
                        </div>
                        {getRelativeTime(log.created_at, isIndo) && (
                          <div className="text-[10px] text-zinc-500 whitespace-nowrap">
                            ({getRelativeTime(log.created_at, isIndo)})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {actorDisplay}
                        </div>
                        {log.causer_username && (
                          <div className="text-[11px] font-mono text-zinc-500">
                            @{log.causer_username}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[11px] font-semibold border ${getActionBadgeClass(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {log.subject_label || log.subject_id || "-"}
                        </div>
                        {log.subject_type && (
                          <div className="text-[11px] text-zinc-500">
                            {log.subject_type}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-600 dark:text-zinc-400">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("logs.view_detail_aria", "Lihat Detail Log")}
                          onClick={() => {
                            setSelectedLog(log)
                            setDetailOpen(true)
                          }}
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div>
            Total <strong className="text-zinc-900 dark:text-zinc-100">{total}</strong> {t("logs.entries_suffix", "entri aktivitas")}
          </div>
          <div className="flex items-center gap-2">
            <span>
              {t("logs.page_info", { current: currentPage, total: lastPage || 1 })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="h-7 w-7 p-0 cursor-pointer"
              aria-label={t("common.previous", "Previous Page")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="h-7 w-7 p-0 cursor-pointer"
              aria-label={t("common.next", "Next Page")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              {t("logs.detail_title", "Detail Log Aktivitas")}
            </DialogTitle>
            <DialogDescription>
              {t("logs.detail_desc", "Rincian perubahan atribut data dan konteks audit pergerakan sistem.")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Context Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                <div>
                  <span className="text-[11px] font-medium text-zinc-500">{t("logs.time_occurred", "Waktu Kejadian:")}</span>
                  <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatLogDateTime(selectedLog.created_at)}
                  </div>
                  {getRelativeTime(selectedLog.created_at, isIndo) && (
                    <div className="text-[10px] text-zinc-400">
                      ({getRelativeTime(selectedLog.created_at, isIndo)})
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-medium text-zinc-500">{t("logs.causer_label", "Pelaku (Causer):")}</span>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedLog.causer_name || (selectedLog.causer_username ? `@${selectedLog.causer_username}` : selectedLog.causer_email) || t("logs.actor_system", "Sistem")}
                  </div>
                  {selectedLog.causer_username && (
                    <div className="text-[11px] font-mono text-zinc-500">
                      @{selectedLog.causer_username}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-medium text-zinc-500">{t("logs.action_event", "Aksi / Event:")}</span>
                  <div className="mt-0.5">
                    <Badge variant="outline" className={`capitalize text-[11px] font-semibold border ${getActionBadgeClass(selectedLog.action)}`}>
                      {getActionLabel(selectedLog.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-zinc-500">{t("logs.ip_address", "IP Address:")}</span>
                  <div className="font-mono text-zinc-800 dark:text-zinc-200">{selectedLog.ip_address || "-"}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-medium text-zinc-500">{t("logs.subject_label", "Subjek Data:")}</span>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedLog.subject_type && (
                      <span className="font-mono text-blue-600 dark:text-blue-400 mr-1.5">[{selectedLog.subject_type}]</span>
                    )}
                    {selectedLog.subject_label || selectedLog.subject_id || "-"}
                  </div>
                </div>
              </div>

              {/* Data Changes: Diff Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {t("logs.changes_heading", "Perubahan Data (Field Changes)")}
                  </h3>
                </div>

                {(() => {
                  const hasOld = selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0
                  const hasNew = selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0

                  if (!hasOld && !hasNew) {
                    return (
                      <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-zinc-500 dark:border-zinc-800">
                        {t("logs.no_changes_recorded", "Tidak ada perubahan nilai atribut data pada aktivitas ini (aktivitas sesi / non-mutasi).")}
                      </div>
                    )
                  }

                  const keys = Array.from(
                    new Set([
                      ...Object.keys(selectedLog.old_values || {}),
                      ...Object.keys(selectedLog.new_values || {}),
                    ])
                  )

                  return (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      <div className="grid grid-cols-12 bg-zinc-100 px-3 py-2 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="col-span-4">{t("logs.col_attribute", "Nama Atribut / Kolom")}</div>
                        <div className="col-span-4 text-rose-700 dark:text-rose-400">{t("logs.payload_before", "Nilai Sebelumnya (Old Values)")}</div>
                        <div className="col-span-4 text-emerald-700 dark:text-emerald-400">{t("logs.payload_after", "Nilai Baru (New Values)")}</div>
                      </div>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {keys.map((k) => {
                          const oldVal = selectedLog.old_values ? selectedLog.old_values[k] : undefined
                          const newVal = selectedLog.new_values ? selectedLog.new_values[k] : undefined
                          const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal)
                          const label = getFieldLabel(k, isIndo)

                          return (
                            <div
                              key={k}
                              className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-start transition-colors ${
                                isDifferent ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                              }`}
                            >
                              {/* Kolom Field Name */}
                              <div className="col-span-4 pr-1">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {label.title}
                                </div>
                                <div className="font-mono text-[10px] text-zinc-400 break-all">
                                  {label.technical}
                                </div>
                              </div>
                              {/* Kolom Old Value */}
                              <div className="col-span-4 rounded-md bg-rose-50/70 p-2 text-rose-900 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 min-h-[38px]">
                                {oldVal !== undefined ? (
                                  renderValue(oldVal, t)
                                ) : (
                                  <span className="italic text-zinc-400">
                                    ({t("logs.not_present", "Tidak ada")})
                                  </span>
                                )}
                              </div>
                              {/* Kolom New Value */}
                              <div className="col-span-4 rounded-md bg-emerald-50/70 p-2 text-emerald-900 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40 min-h-[38px]">
                                {newVal !== undefined ? (
                                  renderValue(newVal, t)
                                ) : (
                                  <span className="italic text-zinc-400">
                                    ({t("logs.not_present", "Tidak ada")})
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setDetailOpen(false)}>
                  {t("common.close", "Tutup")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
