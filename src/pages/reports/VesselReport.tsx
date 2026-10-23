import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

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
  Search,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileDown,
  Printer,
  Ship,
  Users,
} from "lucide-react"

export interface CrewMember {
  id: string
  visitor_no: number
  name: string
  id_type: string
  id_number: string
  gender: string | null
  occupation: string | null
  nationality: string | null
  certificate: string | null
  certificate_no?: string | null
  seaman_book_no: string | null
}

export interface VesselReportItem {
  id: string
  location_id: string
  vessel_name?: string | null
  sign_in_date: string | null
  sign_in_port: string | null
  sign_out_date: string | null
  sign_out_port: string | null
  total_days: number
  captain: string | null
  local_agent_company?: string | null
  foreign_agent_company?: string | null
  vessel?: {
    id: string
    code: string | null
    name: string
    type: string
  } | null
  crew?: CrewMember[]
}

const ALL = "all"

export default function VesselReport() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"list_ships" | "list_ships_with_crew">("list_ships")
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportPdfLoading, setExportPdfLoading] = useState(false)
  const [records, setRecords] = useState<VesselReportItem[]>([])

  // Filters
  const [vesselName, setVesselName] = useState("")
  const [stayStatus, setStayStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [crewVisitorNoFrom, setCrewVisitorNoFrom] = useState("")
  const [crewVisitorNoTo, setCrewVisitorNoTo] = useState("")

  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({})

  // Pagination
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 100

  const fetchVesselReport = useCallback(
    async (currentMode: string, filters: Record<string, any>, targetPage: number) => {
      setLoading(true)
      try {
        const params: Record<string, any> = {
          mode: currentMode,
          page: targetPage,
          per_page: perPage,
          ...filters,
        }

        const res = await api.get("/reports/vessels", { params })
        const rows: VesselReportItem[] = Array.isArray(res.data)
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
        toast.error(t("vessel_report.fetch_error", "Gagal memuat laporan kedatangan kapal."))
      } finally {
        setLoading(false)
      }
    },
    [perPage, t]
  )

  useEffect(() => {
    fetchVesselReport(mode, appliedFilters, page)
  }, [mode, appliedFilters, page, fetchVesselReport])

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const newFilters: Record<string, any> = {}

    if (vesselName.trim()) newFilters.vessel_name = vesselName.trim()
    if (stayStatus && stayStatus !== "all") newFilters.stay_status = stayStatus
    if (dateFrom) newFilters.date_from = dateFrom
    if (dateTo) newFilters.date_to = dateTo
    if (mode === "list_ships_with_crew") {
      if (crewVisitorNoFrom) newFilters.crew_visitor_no_from = crewVisitorNoFrom
      if (crewVisitorNoTo) newFilters.crew_visitor_no_to = crewVisitorNoTo
    }

    setPage(1)
    setAppliedFilters(newFilters)
  }

  const handleResetFilter = () => {
    setVesselName("")
    setStayStatus("all")
    setDateFrom("")
    setDateTo("")
    setCrewVisitorNoFrom("")
    setCrewVisitorNoTo("")
    setPage(1)
    setAppliedFilters({})
  }

  const handleExportExcel = async () => {
    setExportLoading(true)
    try {
      const res = await api.get("/reports/vessels/export", {
        params: {
          mode,
          ...appliedFilters,
        },
        responseType: "blob",
      })

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const dateStr = new Date().toISOString().split("T")[0]
      link.download = `vessel-report-${mode}-${dateStr}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(t("vessel_report.export_success", "File Excel laporan kapal berhasil diunduh."))
    } catch (err: any) {
      console.error(err)
      toast.error(t("vessel_report.export_error", "Gagal mengunduh file Excel laporan kapal."))
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportPdf = async () => {
    setExportPdfLoading(true)
    try {
      const res = await api.get("/reports/vessels/pdf", {
        params: {
          mode,
          ...appliedFilters,
        },
        responseType: "blob",
      })

      const blob = new Blob([res.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const dateStr = new Date().toISOString().split("T")[0]
      link.download = `vessel-report-${mode}-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(t("vessel_report.export_pdf_success", "Dokumen PDF laporan kapal berhasil diunduh."))
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 422) {
        let msg = t("vessel_report.limit_exceeded_msg", "Data yang akan dicetak melebihi batas maksimal 5.000 baris. Silakan persempit rentang tanggal atau filter lainnya sebelum mencetak dokumen.")
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text()
            const parsed = JSON.parse(text)
            if (parsed.message) msg = parsed.message
          } catch {
            // fallback
          }
        } else if (err.response.data?.message) {
          msg = err.response.data.message
        }
        toast.error(msg)
      } else {
        toast.error(t("vessel_report.export_pdf_error", "Gagal mencetak dokumen PDF laporan kapal."))
      }
    } finally {
      setExportPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("vessel_report.title", "Laporan Kedatangan Kapal (Vessel Report)")}
          </h1>
          <p className="text-sm text-zinc-500">
            {t(
              "vessel_report.subtitle",
              "Rekapitulasi transaksi sandar kapal galangan, manifest kru on-board, dan perhitungan hari sandar."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || exportLoading || exportPdfLoading}
            onClick={handleExportExcel}
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {t("common.export_excel", "Export Excel")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || exportLoading || exportPdfLoading}
            onClick={handleExportPdf}
          >
            {exportPdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {t("common.print_pdf", "Cetak / PDF")}
          </Button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <Button
          type="button"
          variant={mode === "list_ships" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => {
            setMode("list_ships")
            setPage(1)
          }}
        >
          <Ship className="h-4 w-4" />
          {t("vessel_report.tab_list_ships", "Ringkasan Kapal (List Ships)")}
        </Button>
        <Button
          type="button"
          variant={mode === "list_ships_with_crew" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => {
            setMode("list_ships_with_crew")
            setPage(1)
          }}
        >
          <Users className="h-4 w-4" />
          {t("vessel_report.tab_list_ships_crew", "Rincian Bersama Kru (List Ships With Crew)")}
        </Button>
      </div>

      {/* Filter Box */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <Filter className="h-4 w-4" />
            {t("vessel_report.filter_box_title", "Filter Laporan Kapal")}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Nama Kapal */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("vessel_report.vessel_name_label", "Nama Kapal")}</Label>
              <Input
                placeholder={t("vessel_report.vessel_name_placeholder", "Nama kapal...")}
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Status Sandar */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("vessel_report.stay_status_label", "Status Sandar")}</Label>
              <Select value={stayStatus} onValueChange={setStayStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("vessel_report.stay_status_all", "Semua Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("vessel_report.stay_status_all", "Semua Status (All)")}</SelectItem>
                  <SelectItem value="not_out">{t("vessel_report.stay_status_not_out", "Sedang Sandar (Not Out)")}</SelectItem>
                  <SelectItem value="in">{t("vessel_report.stay_status_in", "Masuk pada Periode (In)")}</SelectItem>
                  <SelectItem value="out">{t("vessel_report.stay_status_out", "Sudah Keluar (Out)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rentang Tanggal */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_from", "Tanggal Dari")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_to", "Tanggal Sampai")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Rentang Kru Visitor No (Only for with crew mode) */}
            {mode === "list_ships_with_crew" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("vessel_report.crew_no_from", "No. Kru Dari")}</Label>
                  <Input
                    type="number"
                    placeholder="cth. 200000"
                    value={crewVisitorNoFrom}
                    onChange={(e) => setCrewVisitorNoFrom(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("vessel_report.crew_no_to", "No. Kru Sampai")}</Label>
                  <Input
                    type="number"
                    placeholder="cth. 200500"
                    value={crewVisitorNoTo}
                    onChange={(e) => setCrewVisitorNoTo(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {t("common.filter", "Terapkan Filter")}
            </Button>
          </div>
        </form>
      </div>

      {/* Table Data */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {mode === "list_ships" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="w-12 text-center">{t("common.no", "No")}</TableHead>
                  <TableHead>{t("vessel_report.col_vessel_name", "Nama Kapal & Kode")}</TableHead>
                  <TableHead>{t("vessel_report.col_sign_in", "Tanggal Sandar & Asal")}</TableHead>
                  <TableHead>{t("vessel_report.col_sign_out", "Tanggal Keluar & Tujuan")}</TableHead>
                  <TableHead>{t("vessel_report.col_total_days", "Total Hari")}</TableHead>
                  <TableHead>{t("vessel_report.col_captain", "Nakhoda / Captain")}</TableHead>
                  <TableHead>{t("common.agent", "Agen")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                      <span className="mt-2 block text-xs">{t("common.loading", "Memuat data kedatangan kapal...")}</span>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                      {t("vessel_report.no_records", "Tidak ada data kedatangan kapal yang sesuai dengan kriteria filter.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((item, index) => {
                    const isInPort = !item.sign_out_date
                    const shipName = item.vessel_name || item.vessel?.name || "-"
                    const shipCode = item.vessel?.code || "-"

                    return (
                      <TableRow key={item.id || index} className="text-xs">
                        <TableCell className="text-center text-zinc-500 font-mono">
                          {(page - 1) * perPage + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {shipName}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500">
                            {shipCode}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {item.sign_in_date || "-"}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {item.sign_in_port || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isInPort ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                              {t("vessel_report.in_port_badge", "IN PORT")}
                            </Badge>
                          ) : (
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {item.sign_out_date}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {item.sign_out_port || "-"}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {item.total_days} {t("vessel_report.days_unit", "Hari")}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.captain || "-"}</TableCell>
                        <TableCell>
                          <div className="text-[11px]">
                            {item.local_agent_company && (
                              <div>{t("vessel_report.agent_local", "Lokal")}: {item.local_agent_company}</div>
                            )}
                            {item.foreign_agent_company && (
                              <div className="text-zinc-500">{t("vessel_report.agent_foreign", "Asing")}: {item.foreign_agent_company}</div>
                            )}
                            {!item.local_agent_company && !item.foreign_agent_company && "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Mode List Ships With Crew */
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                <span className="mt-2 block text-xs">{t("common.loading", "Memuat data kapal dan manifest kru...")}</span>
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                {t("vessel_report.no_records", "Tidak ada data kedatangan kapal yang sesuai dengan kriteria filter.")}
              </div>
            ) : (
              records.map((item, index) => {
                const shipName = item.vessel_name || item.vessel?.name || "-"
                const shipCode = item.vessel?.code || "-"
                const isInPort = !item.sign_out_date
                const crewList = item.crew || []

                return (
                  <div key={item.id || index} className="p-4 space-y-3">
                    {/* Vessel Summary Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 p-3 rounded-md dark:bg-zinc-900/60">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-zinc-400 font-bold">
                          #{(page - 1) * perPage + index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mr-2">
                            {shipName}
                          </span>
                          <span className="font-mono text-xs text-zinc-500">
                            ({shipCode})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <div>
                          {t("vessel_arrivals.col_sign_in", "Masuk")}: <strong className="text-zinc-800 dark:text-zinc-200">{item.sign_in_date || "-"}</strong>
                        </div>
                        <div>
                          {t("vessel_arrivals.col_sign_out", "Keluar")}:{" "}
                          {isInPort ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">
                              {t("vessel_report.in_port_badge", "IN PORT")}
                            </Badge>
                          ) : (
                            <strong className="text-zinc-800 dark:text-zinc-200">{item.sign_out_date}</strong>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {item.total_days} {t("vessel_report.days_unit", "Hari")}
                        </Badge>
                        <div>
                          {t("vessel_arrivals.col_captain", "Kapten")}: <strong>{item.captain || "-"}</strong>
                        </div>
                        <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400 text-[10px]">
                          {crewList.length} {t("vessel_arrivals.crew_count_label", "Kru")}
                        </Badge>
                      </div>
                    </div>

                    {/* Crew Manifest Sub-Table */}
                    <div className="pl-4 pr-1">
                      {crewList.length === 0 ? (
                        <div className="text-xs text-zinc-400 italic py-2">
                          {t("vessel_report.no_crew", "Tidak ada kru terdaftar pada kedatangan kapal ini.")}
                        </div>
                      ) : (
                        <Table className="border rounded-md">
                          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                            <TableRow className="text-[11px]">
                              <TableHead className="w-12">{t("crew_report.col_crew_no", "No. Kru")}</TableHead>
                              <TableHead>{t("crew_report.col_crew_name", "Nama Kru")}</TableHead>
                              <TableHead>{t("crew_report.col_id_passport", "No. ID / Paspor")}</TableHead>
                              <TableHead>{t("crew_report.col_gender", "Gender")}</TableHead>
                              <TableHead>{t("crew_report.col_occupation", "Jabatan")}</TableHead>
                              <TableHead>{t("crew_report.col_nationality", "Kebangsaan")}</TableHead>
                              <TableHead>{t("crew_report.col_seaman_book", "Buku Pelaut")}</TableHead>
                              <TableHead>{t("crew_report.col_certificate", "Sertifikat")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {crewList.map((c, ci) => (
                              <TableRow key={c.id || ci} className="text-xs">
                                <TableCell className="font-mono text-zinc-500">
                                  {c.visitor_no}
                                </TableCell>
                                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {c.name}
                                </TableCell>
                                <TableCell className="font-mono text-[11px]">
                                  {c.id_type?.toUpperCase()}: {c.id_number}
                                </TableCell>
                                <TableCell>{c.gender || "-"}</TableCell>
                                <TableCell>{c.occupation || "-"}</TableCell>
                                <TableCell>{c.nationality || "-"}</TableCell>
                                <TableCell className="font-mono">{c.seaman_book_no || "-"}</TableCell>
                                <TableCell>{c.certificate || c.certificate_no || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div>
            {t("common.total", "Total")} <strong className="text-zinc-900 dark:text-zinc-100">{total}</strong> {t("vessel_report.vessel_transactions", "transaksi kapal")}
          </div>
          <div className="flex items-center gap-2">
            <span>
              {t("common.page", "Halaman")} {page} {t("common.of", "dari")} {lastPage || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="h-7 w-7 p-0"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="h-7 w-7 p-0"
              aria-label="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
