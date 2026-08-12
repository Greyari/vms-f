import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"

import { Button } from "@/components/ui/button"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { FileDown, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Report() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])

  // To keep track of the currently applied filter for export
  const [appliedFilter, setAppliedFilter] = useState({
    start_date: "",
    end_date: "",
  })
  const [hasSearched, setHasSearched] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [serverPaginated, setServerPaginated] = useState(false)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const formatDateForApi = (d: Date | undefined) => {
    if (!d) return ""
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - offset * 60 * 1000)
    return localDate.toISOString().split("T")[0]
  }

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/visits/history", {
        params: {
          page: currentPage,
          start_date: appliedFilter.start_date,
          end_date: appliedFilter.end_date,
        },
      })
      // Defensive read: works whether the backend is paginated or a plain array.
      const rows = Array.isArray(res.data) ? res.data : (res.data.data ?? [])
      setRecords(rows)
      if (!Array.isArray(res.data) && res.data.last_page !== undefined) {
        setServerPaginated(true)
        setLastPage(res.data.last_page)
        setTotal(res.data.total ?? rows.length)
      } else {
        setServerPaginated(false)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch history data.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, appliedFilter])

  // Re-fetch whenever the applied filter or page changes (only after first search).
  useEffect(() => {
    if (hasSearched) loadRecords()
  }, [hasSearched, loadRecords])

  const fetchHistory = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedFilter({
      start_date: formatDateForApi(startDate),
      end_date: formatDateForApi(endDate),
    })
    setCurrentPage(1)
    setHasSearched(true)
  }

  const getDynamicFileName = (extension: string) => {
    const start = appliedFilter.start_date || "All"
    const end = appliedFilter.end_date || "All"
    return `VISITOR CIS, ${start} - ${end}.${extension}`
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await api.get("/visits/export", {
        params: {
          start_date: appliedFilter.start_date,
          end_date: appliedFilter.end_date,
        },
        responseType: "blob",
      })

      const blob = new Blob([res.data], {
        type:
          res.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      const fileName = getDynamicFileName("xlsx")

      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Failed to execute the Excel export.")
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await api.get("/visits/export-pdf", {
        params: {
          start_date: appliedFilter.start_date,
          end_date: appliedFilter.end_date,
        },
        responseType: "blob",
      })

      const blob = new Blob([res.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      const fileName = getDynamicFileName("pdf")

      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error("PDF Export failed", error)
      toast.error("Failed to execute the PDF export.")
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Report</h1>
          <p className="text-muted-foreground">Check the visit report.</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <form
          onSubmit={fetchHistory}
          className="mb-8 space-y-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-3">
            <div className="flex flex-col space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      formatDateForApi(startDate)
                    ) : (
                      <span>Pick a start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      formatDateForApi(endDate)
                    ) : (
                      <span>Pick an end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Searching..." : "Terapkan Filter"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-xl font-semibold">Preview Data</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPdf}
              disabled={pdfLoading || records.length === 0}
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-600"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {pdfLoading ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportLoading || records.length === 0}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {exportLoading ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Type</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Visitor Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Card No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No history data found. Apply filter to search.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.visitor?.id_type === "ktp"
                            ? "bg-blue-100 text-blue-700"
                            : record.visitor?.id_type === "sim"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {record.visitor?.id_type?.toUpperCase() || "KTP"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.visitor?.id_number}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {record.visitor?.name}
                    </TableCell>
                    <TableCell>{record.visitor?.company || "-"}</TableCell>
                    <TableCell>{record.staff?.name}</TableCell>
                    <TableCell>
                      {record.visitor_cards?.length
                        ? record.visitor_cards
                            .map((card: any) => card.card_no)
                            .join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.time_in}</TableCell>
                    <TableCell>{record.time_out || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls (server-driven when the API returns a paginator) */}
        {serverPaginated && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Page {currentPage} of {lastPage} · {total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                disabled={currentPage >= lastPage || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
