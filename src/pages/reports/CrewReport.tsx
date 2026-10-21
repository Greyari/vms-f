import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "@/context/I18nContext"
import { toast } from "sonner"
import api from "@/lib/axios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Ship,
  Search,
  RotateCcw,
  FileDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  LogOut,
  FileCheck,
} from "lucide-react"
import CrewPersonPanelModal from "@/components/vessels/CrewPersonPanelModal"

export interface CrewPlacementItem {
  id: string
  vessel_arrival_id: string
  visitor_id: string
  status: "expected" | "checked_in" | "checked_out" | string
  checked_in_at: string | null
  checked_out_at: string | null
  notes: string | null
  created_at: string
  visitor?: {
    id: string
    visitor_no?: number | string | null
    name: string
    id_type: string
    id_number: string
    gender?: string | null
    occupation?: string | null
    nationality?: string | null
    company?: string | null
    certificate?: string | null
    certificate_no?: string | null
    seaman_book_no?: string | null
    phone?: string | null
    is_blacklisted?: boolean
  } | null
  vessel_arrival?: {
    id: string
    vessel_name?: string | null
    sign_in_date?: string | null
    sign_out_date?: string | null
    sign_in_port?: string | null
    sign_out_port?: string | null
    captain?: string | null
    vessel?: {
      id: string
      name: string
      code?: string | null
      vessel_type?: string | null
      call_sign?: string | null
      flag?: string | null
    } | null
  } | null
}

const ALL = "all"

export default function CrewReport() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [records, setRecords] = useState<CrewPlacementItem[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [vesselName, setVesselName] = useState("")
  const [status, setStatus] = useState("all")
  const [nationality, setNationality] = useState("")
  const [company, setCompany] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({})

  // Pagination
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 50

  // Person panel drawer
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null)
  const [personPanelOpen, setPersonPanelOpen] = useState(false)

  const fetchCrewReport = useCallback(
    async (filters: Record<string, any>, targetPage: number) => {
      setLoading(true)
      try {
        const params: Record<string, any> = {
          page: targetPage,
          per_page: perPage,
          ...filters,
        }

        const res = await api.get("/reports/crew", { params })
        const rows: CrewPlacementItem[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? [])

        setRecords(rows)
        if (!Array.isArray(res.data) && res.data?.last_page !== undefined) {
          setLastPage(res.data.last_page)
          setTotal(res.data.total ?? rows.length)
        } else {
          setLastPage(1)
          setTotal(rows.length)
        }
      } catch (err: any) {
        console.error(err)
        toast.error(t("crew_report.fetch_error", "Gagal memuat laporan kru kapal."))
      } finally {
        setLoading(false)
      }
    },
    [perPage, t]
  )

  useEffect(() => {
    fetchCrewReport(appliedFilters, page)
  }, [appliedFilters, page, fetchCrewReport])

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const newFilters: Record<string, any> = {}

    if (search.trim()) newFilters.search = search.trim()
    if (vesselName.trim()) newFilters.vessel_name = vesselName.trim()
    if (status && status !== "all") newFilters.status = status
    if (nationality.trim()) newFilters.nationality = nationality.trim()
    if (company.trim()) newFilters.company = company.trim()
    if (dateFrom) newFilters.date_from = dateFrom
    if (dateTo) newFilters.date_to = dateTo

    setPage(1)
    setAppliedFilters(newFilters)
  }

  const handleResetFilter = () => {
    setSearch("")
    setVesselName("")
    setStatus("all")
    setNationality("")
    setCompany("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
    setAppliedFilters({})
  }

  const handleExportExcel = async () => {
    setExportLoading(true)
    try {
      const res = await api.get("/reports/crew/export", {
        params: appliedFilters,
        responseType: "blob",
      })

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const dateStr = new Date().toISOString().split("T")[0]
      link.download = `vessel-crew-report-${dateStr}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(t("crew_report.export_success", "File Excel laporan kru kapal berhasil diunduh."))
    } catch (err: any) {
      console.error(err)
      toast.error(t("crew_report.export_error", "Gagal mengunduh file Excel laporan kru kapal."))
    } finally {
      setExportLoading(false)
    }
  }

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

  // Summary counts
  const stats = useMemo(() => {
    let checkedIn = 0
    let checkedOut = 0
    let expected = 0
    records.forEach((r) => {
      if (r.status === "checked_in") checkedIn++
      else if (r.status === "checked_out") checkedOut++
      else if (r.status === "expected") expected++
    })
    return { checkedIn, checkedOut, expected }
  }, [records])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {t("crew_report.title", "Laporan & Ekspor Kru Kapal")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t(
              "crew_report.subtitle",
              "Daftar lengkap kru kapal yang bertugas, dokumen pelaut, riwayat status check-in/out, dan ekspor data."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            disabled={loading || exportLoading}
            onClick={handleExportExcel}
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {t("crew_report.export_excel", "Ekspor Excel (.xlsx)")}
          </Button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-zinc-200 dark:border-zinc-700">
          {t("crew_report.total_crew_shown", "Total Data")}: <strong>{total}</strong>
        </Badge>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs px-3 py-1">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          {t("crew_report.active_onboard", "Di Kapal (Halaman ini)")}: <strong>{stats.checkedIn}</strong>
        </Badge>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-xs px-3 py-1">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {t("crew_report.expected_count", "Belum Check-In")}: <strong>{stats.expected}</strong>
        </Badge>
        <Badge variant="secondary" className="text-xs px-3 py-1 text-zinc-500">
          <LogOut className="h-3.5 w-3.5 mr-1" />
          {t("crew_report.checked_out_count", "Sudah Turun")}: <strong>{stats.checkedOut}</strong>
        </Badge>
      </div>

      {/* Filter Box */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Filter className="h-4 w-4 text-blue-600" />
            {t("crew_report.filter_title", "Filter Pencarian Kru Kapal")}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Search General */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("crew_report.search_label", "Cari Kru / Dokumen")}</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t("crew_report.search_placeholder", "Nama, no identitas, buku pelaut...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Nama Kapal */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("crew_report.vessel_name", "Nama Kapal")}</Label>
              <div className="relative">
                <Ship className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t("crew_report.vessel_placeholder", "Cari nama kapal...")}
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Status Penempatan */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("crew_report.status_label", "Status Penempatan")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.all", "Semua")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("crew_report.status_all", "Semua Status")}</SelectItem>
                  <SelectItem value="checked_in">{t("crew_report.status_checked_in", "Di Kapal (Checked-In)")}</SelectItem>
                  <SelectItem value="expected">{t("crew_report.status_expected", "Belum Check-In (Expected)")}</SelectItem>
                  <SelectItem value="checked_out">{t("crew_report.status_checked_out", "Sudah Turun (Checked-Out)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kebangsaan */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor.nationality", "Kebangsaan")}</Label>
              <Input
                placeholder={t("crew_report.nationality_placeholder", "cth. Indonesia, Philippines...")}
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Perusahaan / Agen */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor.company", "Perusahaan")}</Label>
              <Input
                placeholder={t("crew_report.company_placeholder", "Perusahaan / PT...")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Tanggal Dari */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_from", "Tanggal Dari")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Tanggal Sampai */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_to", "Tanggal Sampai")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Search className="h-3.5 w-3.5 mr-1.5" />
                {t("common.filter", "Terapkan Filter")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                title={t("common.reset", "Reset")}
                className="h-9 px-3 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Table Data */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>{t("crew_report.col_crew_name", "Nama Kru & Identitas")}</TableHead>
                <TableHead>{t("crew_report.col_occupation", "Jabatan & Bangsa")}</TableHead>
                <TableHead>{t("crew_report.col_seaman_book", "Buku Pelaut / Sertifikat")}</TableHead>
                <TableHead>{t("crew_report.col_vessel", "Kapal & Rute")}</TableHead>
                <TableHead>{t("crew_report.col_status", "Status Penempatan")}</TableHead>
                <TableHead>{t("crew_report.col_timestamps", "Waktu Check-In / Out")}</TableHead>
                <TableHead>{t("crew_report.col_notes", "Keterangan")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("common.loading", "Memuat data...")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-zinc-500 text-sm">
                    {t("crew_report.no_records", "Tidak ada data kru kapal yang cocok dengan filter yang dipilih.")}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((item, index) => {
                  const isCheckedIn = item.status === "checked_in"
                  const isCheckedOut = item.status === "checked_out"
                  const isExpected = item.status === "expected"
                  const crew = item.visitor
                  const arrival = item.vessel_arrival

                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors ${
                        isCheckedOut ? "opacity-75 bg-zinc-50/30 dark:bg-zinc-900/20 text-muted-foreground" : ""
                      }`}
                    >
                      <TableCell className="text-center text-xs text-zinc-400">
                        {(page - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            if (crew?.id) {
                              setSelectedVisitorId(crew.id)
                              setPersonPanelOpen(true)
                            }
                          }}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors underline-offset-2 group-hover:underline">
                            {crew?.name || "-"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {crew?.visitor_no ? `No: ${crew.visitor_no} • ` : ""}
                            {crew?.id_type ? `${crew.id_type.toUpperCase()}: ${crew.id_number}` : ""}
                          </div>
                          {crew?.company && (
                            <div className="text-[11px] text-zinc-400">
                              {crew.company}
                            </div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{crew?.occupation || "-"}</div>
                        <div className="text-xs text-zinc-500">{crew?.nationality || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono">
                          {crew?.seaman_book_no ? `Buku: ${crew.seaman_book_no}` : "-"}
                        </div>
                        {(crew?.certificate_no || crew?.certificate) && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <FileCheck className="h-3 w-3 text-emerald-600" />
                            {crew.certificate_no || crew.certificate}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                          <Ship className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          {arrival?.vessel_name || "-"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {arrival?.vessel?.code ? `IMO: ${arrival.vessel.code} • ` : ""}
                          {arrival?.sign_in_port ? `Dari: ${arrival.sign_in_port}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCheckedIn ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("crew_report.status_checked_in", "Di Kapal")}
                          </Badge>
                        ) : isCheckedOut ? (
                          <Badge variant="secondary" className="text-xs opacity-80">
                            <LogOut className="h-3 w-3 mr-1" />
                            {t("crew_report.status_checked_out", "Check-Out")}
                          </Badge>
                        ) : isExpected ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {t("crew_report.status_expected", "Belum Check-In")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono space-y-0.5">
                        {item.checked_in_at && (
                          <div className="text-emerald-700 dark:text-emerald-400">
                            In: {formatTimestamp(item.checked_in_at)}
                          </div>
                        )}
                        {item.checked_out_at && (
                          <div className="text-zinc-500">
                            Out: {formatTimestamp(item.checked_out_at)}
                          </div>
                        )}
                        {!item.checked_in_at && !item.checked_out_at && "-"}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 max-w-xs truncate">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <div>
            {t("common.showing", "Menampilkan")} <strong>{records.length}</strong> {t("common.from", "dari")}{" "}
            <strong>{total}</strong> {t("crew_report.records_count", "data kru")}
          </div>

          <div className="flex items-center gap-2">
            <span>
              {t("common.page", "Halaman")} {page} {t("common.of", "dari")} {lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Person Detail Panel Modal */}
      <CrewPersonPanelModal
        open={personPanelOpen}
        onClose={() => {
          setPersonPanelOpen(false)
          setSelectedVisitorId(null)
        }}
        visitorId={selectedVisitorId}
        onActionComplete={() => fetchCrewReport(appliedFilters, page)}
      />
    </div>
  )
}
