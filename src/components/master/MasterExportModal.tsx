import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/context/I18nContext"
import { toast } from "sonner"
import api from "@/lib/axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
  CheckSquare,
  Square,
  Filter,
  Layers,
} from "lucide-react"
import type { MasterEntityConfig } from "@/config/masterEntities"

export interface MasterExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityConfig: MasterEntityConfig
  currentFilters?: Record<string, any>
}

type DatePreset =
  | "today"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "allTime"

export default function MasterExportModal({
  open,
  onOpenChange,
  entityConfig,
  currentFilters = {},
}: MasterExportModalProps) {
  const { language } = useTranslation()
  const isEn = language === "en"

  // Storage key for persisting selected columns
  const storageKey = `vms_export_cols_${entityConfig.key}`

  // Column selection state
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify saved columns still exist in config
          const validKeys = entityConfig.exportColumns.map((c) => c.key)
          const filtered = parsed.filter((k: string) => validKeys.includes(k))
          if (filtered.length > 0) return filtered
        }
      }
    } catch {
      // Fallback
    }
    return entityConfig.exportColumns
      .filter((c) => c.defaultSelected !== false)
      .map((c) => c.key)
  })

  // Date field derived automatically from entity config
  const dateField =
    entityConfig.defaultDateField ||
    entityConfig.dateFields?.[0]?.field ||
    "created_at"

  // Date Filter State
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [activePreset, setActivePreset] = useState<DatePreset | null>("allTime")

  // Format: "xlsx" or "csv"
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx")

  // Live Count Preview & Download State
  const [count, setCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Save column changes to localStorage
  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }

  const handleSelectAllColumns = () => {
    const all = entityConfig.exportColumns.map((c) => c.key)
    setSelectedColumns(all)
    try {
      localStorage.setItem(storageKey, JSON.stringify(all))
    } catch {
      // Ignore
    }
  }

  const handleClearAllColumns = () => {
    setSelectedColumns([])
    try {
      localStorage.setItem(storageKey, JSON.stringify([]))
    } catch {
      // Ignore
    }
  }

  // Quick Date Presets Helper
  const applyDatePreset = (preset: DatePreset) => {
    setActivePreset(preset)
    const now = new Date()
    const formatDate = (d: Date) => d.toISOString().slice(0, 10)

    if (preset === "allTime") {
      setStartDate("")
      setEndDate("")
      return
    }

    if (preset === "today") {
      const todayStr = formatDate(now)
      setStartDate(todayStr)
      setEndDate(todayStr)
      return
    }

    if (preset === "last7days") {
      const past = new Date()
      past.setDate(now.getDate() - 6)
      setStartDate(formatDate(past))
      setEndDate(formatDate(now))
      return
    }

    if (preset === "last30days") {
      const past = new Date()
      past.setDate(now.getDate() - 29)
      setStartDate(formatDate(past))
      setEndDate(formatDate(now))
      return
    }

    if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(formatDate(firstDay))
      setEndDate(formatDate(lastDay))
      return
    }

    if (preset === "lastMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(formatDate(firstDay))
      setEndDate(formatDate(lastDay))
      return
    }

    if (preset === "thisYear") {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setStartDate(formatDate(firstDay))
      setEndDate(formatDate(lastDay))
      return
    }
  }

  // Build active query params for count and export
  const buildParams = useCallback(() => {
    const params: Record<string, any> = {}

    // Automatically apply active table filters (search, status, type, etc.)
    if (currentFilters) {
      Object.entries(currentFilters).forEach(([k, v]) => {
        // Exclude pagination params
        if (
          k !== "page" &&
          k !== "per_page" &&
          v !== undefined &&
          v !== null &&
          v !== ""
        ) {
          params[k] = v
        }
      })
    }

    // Apply date range filter
    if (startDate) {
      params.start_date = startDate
      params.date_from = startDate
    }
    if (endDate) {
      params.end_date = endDate
      params.date_to = endDate
    }
    if (dateField) {
      params.date_field = dateField
    }

    return params
  }, [currentFilters, startDate, endDate, dateField])

  // Fetch count when filters change and modal is open
  useEffect(() => {
    if (!open) return

    let isMounted = true
    const timer = setTimeout(async () => {
      setLoadingCount(true)
      try {
        const params = buildParams()
        const res = await api.get(entityConfig.exportCountEndpoint, { params })
        if (isMounted) {
          setCount(typeof res.data?.count === "number" ? res.data.count : 0)
        }
      } catch {
        if (isMounted) {
          setCount(null)
        }
      } finally {
        if (isMounted) {
          setLoadingCount(false)
        }
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [open, buildParams, entityConfig.exportCountEndpoint])

  // Export action
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error(
        isEn
          ? "Please select at least one column to export."
          : "Pilih minimal satu kolom untuk diekspor."
      )
      return
    }

    setIsExporting(true)
    try {
      const params = buildParams()
      params.columns = selectedColumns.join(",")
      params.format = format
      params.lang = isEn ? "en" : "id"

      const response = await api.get(entityConfig.exportEndpoint, {
        params,
        responseType: "blob",
      })

      // Try reading filename from Content-Disposition header
      const headers = response?.headers || {}
      const disposition =
        headers["content-disposition"] || headers["Content-Disposition"]
      let filename = ""
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "")
        }
      }

      if (!filename) {
        const datePart =
          startDate && endDate
            ? `${startDate}_to_${endDate}`
            : new Date().toISOString().slice(0, 10)
        filename = `${entityConfig.key}_${datePart}.${format}`
      }

      const blob = new Blob([response.data], {
        type:
          format === "csv"
            ? "text/csv;charset=utf-8;"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(
        isEn
          ? `Successfully exported ${count ?? ""} records to ${filename}.`
          : `Berhasil mengekspor ${count ?? ""} data ke ${filename}.`
      )
      onOpenChange(false)
    } catch (err: any) {
      console.error("Export error:", err)
      toast.error(
        err.response?.data?.message ||
          (isEn ? "Failed to export data." : "Gagal mengekspor data.")
      )
    } finally {
      setIsExporting(false)
    }
  }

  const title = isEn ? `Export ${entityConfig.titleEn}` : `Ekspor ${entityConfig.titleId}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                {isEn ? entityConfig.descriptionEn : entityConfig.descriptionId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Active Table Filters Notice */}
          <div className="flex items-center gap-2 rounded-lg border border-blue-200/60 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            <Filter className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              {isEn
                ? "Export will apply currently active table filters."
                : "Export akan menerapkan filter yang sedang aktif di tabel."}
            </span>
          </div>

          {/* Date Range Filter (Simplified: no date field dropdown) */}
          <div className="rounded-lg border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span>{isEn ? "Date Range Filter" : "Filter Rentang Tanggal"}</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {isEn ? "Optional" : "Opsional"}
              </span>
            </div>

            {/* Presets */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[
                { id: "allTime", label: isEn ? "All Time" : "Semua Waktu" },
                { id: "today", label: isEn ? "Today" : "Hari Ini" },
                { id: "last7days", label: isEn ? "Last 7 Days" : "7 Hari Terakhir" },
                { id: "last30days", label: isEn ? "Last 30 Days" : "30 Hari Terakhir" },
                { id: "thisMonth", label: isEn ? "This Month" : "Bulan Ini" },
                { id: "lastMonth", label: isEn ? "Last Month" : "Bulan Lalu" },
                { id: "thisYear", label: isEn ? "This Year" : "Tahun Ini" },
              ].map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={activePreset === p.id ? "default" : "outline"}
                  className="h-6 px-2 text-xs"
                  onClick={() => applyDatePreset(p.id as DatePreset)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Manual Date Inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="export-start-date" className="text-xs text-zinc-500">
                  {isEn ? "Start Date" : "Tanggal Mulai"}
                </Label>
                <Input
                  id="export-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setActivePreset(null)
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="export-end-date" className="text-xs text-zinc-500">
                  {isEn ? "End Date" : "Tanggal Akhir"}
                </Label>
                <Input
                  id="export-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setActivePreset(null)
                  }}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Column Selection */}
          <div className="rounded-lg border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                <Layers className="h-4 w-4 text-zinc-500" />
                <span>
                  {isEn ? "Select Columns" : "Pilih Kolom Ekspor"} ({selectedColumns.length}/
                  {entityConfig.exportColumns.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={handleSelectAllColumns}
                >
                  <CheckSquare className="mr-1 h-3 w-3" />
                  {isEn ? "Select All" : "Pilih Semua"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  onClick={handleClearAllColumns}
                >
                  <Square className="mr-1 h-3 w-3" />
                  {isEn ? "Clear All" : "Hapus Semua"}
                </Button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {entityConfig.exportColumns.map((col) => {
                  const isChecked = selectedColumns.includes(col.key)
                  return (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center space-x-2 rounded p-1 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleColumn(col.key)}
                      />
                      <span className="text-xs text-zinc-700 select-none dark:text-zinc-300">
                        {isEn ? col.labelEn : col.labelId}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
            {selectedColumns.length === 0 && (
              <p className="mt-1.5 text-xs text-red-500">
                {isEn
                  ? "At least one column must be selected."
                  : "Minimal satu kolom harus dipilih."}
              </p>
            )}
          </div>

          {/* Section: Export Format & Live Count Preview */}
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3.5 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <div>
              <div className="text-xs font-medium text-zinc-500">
                {isEn ? "Format" : "Format File"}
              </div>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={format === "xlsx" ? "default" : "outline"}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setFormat("xlsx")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel (.xlsx)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={format === "csv" ? "default" : "outline"}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setFormat("csv")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  CSV (.csv)
                </Button>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-zinc-500">
                {isEn ? "Estimated Records:" : "Perkiraan Baris Data:"}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-base font-bold text-zinc-900 sm:justify-end dark:text-zinc-100">
                {loadingCount ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : count !== null ? (
                  <span>
                    {count.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      {isEn ? "rows" : "baris"}
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {isEn ? "Cancel" : "Batal"}
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEn ? "Exporting..." : "Mengekspor..."}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {isEn ? "Download Export" : "Unduh File Ekspor"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
