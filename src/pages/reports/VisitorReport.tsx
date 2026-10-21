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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileDown,
  Printer,
  AlertTriangle,
} from "lucide-react"

export interface VisitReportItem {
  id: string
  ticket_number: string | null
  legacy_registration_no: string | null
  date: string | null
  time_in: string | null
  time_out: string | null
  checked_out_at: string | null
  purpose: string | null
  vehicle_no: string | null
  visitor_name?: string | null
  visitor_company?: string | null
  host_name?: string | null
  location_name?: string | null
  location_code?: string | null
  days_open: number
  visitor?: {
    id: string
    visitor_no: number
    name: string
    id_type: string
    id_number: string
    company: string | null
    visitor_type: string
  } | null
  staff?: {
    id: string
    staff_id: string
    name: string
  } | null
  location?: {
    id: string
    code: string | null
    name: string
    type: string
  } | null
  visitor_cards?: Array<{ id: string; card_no: string }>
  vehicle_card?: { id: string; card_no: string } | null
}

const ALL = "__all__"

export default function VisitorReport() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [exportExcelLoading, setExportExcelLoading] = useState(false)
  const [exportPdfLoading, setExportPdfLoading] = useState(false)
  const [records, setRecords] = useState<VisitReportItem[]>([])

  // Limit alert dialog state
  const [limitAlertOpen, setLimitAlertOpen] = useState(false)
  const [limitAlertMessage, setLimitAlertMessage] = useState("")

  // Filter Form State
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [visitorNoFrom, setVisitorNoFrom] = useState("")
  const [visitorNoTo, setVisitorNoTo] = useState("")
  const [visitorName, setVisitorName] = useState("")
  const [company, setCompany] = useState("")
  const [occupation, setOccupation] = useState("")
  const [staff, setStaff] = useState("")
  const [location, setLocation] = useState("")
  const [cardNo, setCardNo] = useState("")
  const [locationCodeOrVehicleNo, setLocationCodeOrVehicleNo] = useState("")
  const [visitorType, setVisitorType] = useState(ALL)
  const [cardType, setCardType] = useState(ALL)
  const [openOnly, setOpenOnly] = useState(false)

  // Applied Filter State for API and Pagination
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({})

  // Pagination State
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 100

  const fetchVisits = useCallback(async (filters: Record<string, any>, targetPage: number) => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: targetPage,
        per_page: perPage,
        ...filters,
      }

      const res = await api.get("/reports/visits", { params })
      const rows: VisitReportItem[] = Array.isArray(res.data)
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
      toast.error("Gagal memuat laporan kunjungan.")
    } finally {
      setLoading(false)
    }
  }, [perPage])

  useEffect(() => {
    fetchVisits(appliedFilters, page)
  }, [appliedFilters, page, fetchVisits])

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const newFilters: Record<string, any> = {}

    if (dateFrom) newFilters.date_from = dateFrom
    if (dateTo) newFilters.date_to = dateTo
    if (timeFrom) newFilters.time_from = timeFrom
    if (timeTo) newFilters.time_to = timeTo
    if (visitorNoFrom) newFilters.visitor_no_from = visitorNoFrom
    if (visitorNoTo) newFilters.visitor_no_to = visitorNoTo
    if (visitorName.trim()) newFilters.visitor_name = visitorName.trim()
    if (company.trim()) newFilters.company = company.trim()
    if (occupation.trim()) newFilters.occupation = occupation.trim()
    if (staff.trim()) newFilters.staff = staff.trim()
    if (location.trim()) newFilters.location = location.trim()
    if (cardNo.trim()) newFilters.card_no = cardNo.trim()
    if (locationCodeOrVehicleNo.trim()) newFilters.location_code_or_vehicle_no = locationCodeOrVehicleNo.trim()
    if (visitorType !== ALL) newFilters.visitor_type = visitorType
    if (cardType !== ALL) newFilters.card_type = cardType
    if (openOnly) newFilters.open_only = true

    setPage(1)
    setAppliedFilters(newFilters)
  }

  const handleResetFilter = () => {
    setDateFrom("")
    setDateTo("")
    setTimeFrom("")
    setTimeTo("")
    setVisitorNoFrom("")
    setVisitorNoTo("")
    setVisitorName("")
    setCompany("")
    setOccupation("")
    setStaff("")
    setLocation("")
    setCardNo("")
    setLocationCodeOrVehicleNo("")
    setVisitorType(ALL)
    setCardType(ALL)
    setOpenOnly(false)
    setPage(1)
    setAppliedFilters({})
  }

  const handleExportExcel = async () => {
    setExportExcelLoading(true)
    try {
      const res = await api.get("/reports/visits/export", {
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
      link.download = `visitor-report-${dateStr}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(t("visitor_report.export_excel_success", "File Excel berhasil diunduh."))
    } catch (err: any) {
      console.error(err)
      toast.error(t("visitor_report.export_excel_error", "Gagal mengunduh file Excel laporan kunjungan."))
    } finally {
      setExportExcelLoading(false)
    }
  }

  const handleExportPdf = async () => {
    setExportPdfLoading(true)
    try {
      const res = await api.get("/reports/visits/pdf", {
        params: appliedFilters,
        responseType: "blob",
      })

      const blob = new Blob([res.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const dateStr = new Date().toISOString().split("T")[0]
      link.download = `visitor-report-${dateStr}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(t("visitor_report.export_pdf_success", "Dokumen PDF berhasil diunduh."))
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 422) {
        let msg = t("visitor_report.limit_exceeded_msg", "Data yang akan dicetak melebihi batas maksimal 5.000 baris. Silakan persempit rentang tanggal atau filter lainnya sebelum mencetak dokumen.")
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text()
            const parsed = JSON.parse(text)
            if (parsed.message) msg = parsed.message
          } catch {
            // fallback default message
          }
        } else if (err.response.data?.message) {
          msg = err.response.data.message
        }
        setLimitAlertMessage(msg)
        setLimitAlertOpen(true)
      } else {
        toast.error(t("visitor_report.export_pdf_error", "Gagal mencetak dokumen PDF."))
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
            {t("visitor_report.title", "Laporan Kunjungan (Visitor Report)")}
          </h1>
          <p className="text-sm text-zinc-500">
            {t(
              "visitor_report.subtitle",
              "Audit riwayat kunjungan tamu, log pergerakan gerbang, dan pelaporan kepatuhan fasilitas."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || exportExcelLoading}
            onClick={handleExportExcel}
          >
            {exportExcelLoading ? (
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
            disabled={loading || exportPdfLoading}
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

      {/* Filter Box */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <Filter className="h-4 w-4" />
            {t("visitor_report.filter_title", "Filter Multi-Kriteria")}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Rentang Tanggal */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_from", "Tanggal Mulai")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date_to", "Tanggal Selesai")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Rentang Jam */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.time_from", "Jam Masuk (Dari)")}</Label>
              <Input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.time_to", "Jam Masuk (Sampai)")}</Label>
              <Input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Rentang Visitor No */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.visitor_no_from", "No. Visitor (Dari)")}</Label>
              <Input
                type="number"
                placeholder="cth. 100000"
                value={visitorNoFrom}
                onChange={(e) => setVisitorNoFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.visitor_no_to", "No. Visitor (Sampai)")}</Label>
              <Input
                type="number"
                placeholder="cth. 100500"
                value={visitorNoTo}
                onChange={(e) => setVisitorNoTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Nama & Perusahaan */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.visitor_name_label", "Nama Pengunjung")}</Label>
              <Input
                placeholder={t("visitor_report.visitor_name_placeholder", "Nama pengunjung...")}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.company_label", "Perusahaan")}</Label>
              <Input
                placeholder={t("visitor_report.company_placeholder", "Nama perusahaan...")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Host & Lokasi */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.host_label", "Staf / Host Tujuan")}</Label>
              <Input
                placeholder={t("visitor_report.host_placeholder", "Nama staf/host...")}
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.location_label", "Lokasi Tujuan")}</Label>
              <Input
                placeholder={t("visitor_report.location_placeholder", "Lokasi atau kapal...")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Nomor Kartu & Plat */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.card_no_label", "Nomor Kartu")}</Label>
              <Input
                placeholder={t("visitor_report.card_no_placeholder", "Nomor kartu...")}
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.vehicle_or_location_code", "Plat / Kode Lokasi")}</Label>
              <Input
                placeholder={t("visitor_report.plate_placeholder", "Plat kendaraan / IMO...")}
                value={locationCodeOrVehicleNo}
                onChange={(e) => setLocationCodeOrVehicleNo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Dropdown Tipe Visitor */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.visitor_type_label", "Tipe Pengunjung")}</Label>
              <Select value={visitorType} onValueChange={setVisitorType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("common.all", "Semua Tipe")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("common.all", "Semua Tipe")}</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="crew">Crew</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown Tipe Kartu */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("visitor_report.card_type_label", "Tipe Kartu")}</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("common.all", "Semua Kartu")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("common.all", "Semua Tipe")}</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox Open Only */}
            <div className="flex items-center space-x-2 pt-6 lg:col-span-2">
              <input
                id="open-only-checkbox"
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
              />
              <Label htmlFor="open-only-checkbox" className="text-sm font-medium cursor-pointer">
                {t("visitor_report.only_open_label", "Hanya Kunjungan Aktif (Open Only / Belum Checkout)")}
              </Label>
            </div>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="w-12 text-center">{t("common.no", "No")}</TableHead>
                <TableHead>{t("visitor_report.col_sign_in", "Tanggal & Jam Masuk")}</TableHead>
                <TableHead>{t("visitor_report.col_ticket", "No. Tiket")}</TableHead>
                <TableHead>{t("visitor_report.col_visitor", "Pengunjung")}</TableHead>
                <TableHead>{t("visitor_report.col_company", "Perusahaan")}</TableHead>
                <TableHead>{t("visitor_report.col_location", "Host / Lokasi")}</TableHead>
                <TableHead>{t("visitor_report.col_sign_out", "Jam Keluar")}</TableHead>
                <TableHead>{t("visitor_report.col_cards", "Kartu")}</TableHead>
                <TableHead>{t("visitor_report.col_vehicle", "Plat")}</TableHead>
                <TableHead>{t("visitor_report.col_purpose", "Tujuan / Keperluan")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs">{t("common.loading", "Memuat data laporan...")}</span>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-zinc-500">
                    {t("visitor_report.no_records", "Tidak ada data kunjungan ditemukan yang sesuai dengan kriteria filter.")}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((item, index) => {
                  const isOpen = !item.time_out && !item.checked_out_at
                  const cards = (item.visitor_cards && item.visitor_cards.length > 0)
                    ? item.visitor_cards.map((c) => c.card_no).join(", ")
                    : item.vehicle_card?.card_no || "-"

                  return (
                    <TableRow key={item.id || index} className="text-xs">
                      <TableCell className="text-center text-zinc-500 font-mono">
                        {(page - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.date || "-"}
                        </div>
                        <div className="text-zinc-500 font-mono text-[11px]">
                          {item.time_in ? `${item.time_in} WIB` : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.ticket_number || item.legacy_registration_no || "-"}
                        </div>
                        {item.legacy_registration_no && item.ticket_number && (
                          <div className="text-[10px] text-zinc-400 font-mono">
                            Ref: {item.legacy_registration_no}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.visitor?.name || item.visitor_name || "-"}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {item.visitor?.id_type?.toUpperCase()}: {item.visitor?.id_number || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.visitor_company || item.visitor?.company || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.host_name || item.staff?.name || "-"}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {item.location_name || item.location?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOpen ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                            OPEN
                          </Badge>
                        ) : (
                          <div className="font-mono text-zinc-700 dark:text-zinc-300">
                            {item.time_out || item.checked_out_at?.split(" ")[1]?.substring(0, 5) || "-"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {cards}
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.vehicle_no || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.purpose || undefined}>
                        {item.purpose || "-"}
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
            {t("common.total", "Total")} <strong className="text-zinc-900 dark:text-zinc-100">{total}</strong> {t("visitor_report.visits_count_label", "data kunjungan")}
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

      {/* 5,000 Rows Limit Alert Dialog */}
      <AlertDialog open={limitAlertOpen} onOpenChange={setLimitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              {t("visitor_report.limit_dialog_title", "Batas Cetak Terlampaui (Maksimal 5.000 Baris)")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
              {limitAlertMessage || t("visitor_report.limit_exceeded_msg", "Data yang akan dicetak melebihi batas maksimal 5.000 baris. Silakan persempit rentang tanggal atau filter lainnya sebelum mencetak dokumen.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLimitAlertOpen(false)}>
              {t("common.understood", "Mengerti")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
