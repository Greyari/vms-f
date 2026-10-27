import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "@/context/I18nContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Printer,
  Pencil,
  Eye,
  Clock,
  Anchor,
  Ship,
  Columns3,
  RotateCcw,
  RotateCw,
  LogOut,
  CheckSquare,
  Calendar,
  Filter,
  X,
  Car,
  CreditCard,
} from "lucide-react"
import EditVisitModal from "@/components/visits/EditVisitModal"
import { unwrap } from "@/components/visits/VisitFormShared"

export interface CardRef {
  id: number | string
  card_no: string
  status?: string
}

export interface VisitorRef {
  id?: number | string
  name: string
  id_type?: string | null
  id_number?: string | null
  company?: string | null
  visitor_type?: string | null
  occupation?: string | null
  phone?: string | null
  nationality?: string | null
  vessel_id?: string | null
}

export interface LocationRef {
  id?: number | string
  name: string
  code?: string | null
  type?: string | null
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
}

export interface StaffRef {
  id?: number | string
  name: string
  department?: string | null
  position?: string | null
  occupation?: string | null
}

export interface VisitRecord {
  id: number | string
  ticket_number?: string | null
  legacy_registration_no?: string | null
  visitor_cards?: CardRef[]
  visitor?: VisitorRef | null
  visitor_name?: string | null
  visitor_company?: string | null
  location_id?: number | string | null
  location?: LocationRef | null
  location_name?: string | null
  staff_id?: number | string | null
  staff?: StaffRef | null
  host_name?: string | null
  host_occupation?: string | null
  host_department?: string | null
  purpose?: string | null
  date?: string | null
  time_in?: string | null
  time_out?: string | null
  check_in_at?: string | null
  checked_in_at?: string | null
  days_open?: number
  checked_out_at?: string | null
  vehicle_no?: string | null
  vehicle_plate?: string | null
  plate_normalized?: string | null
  vehicle_card_id?: number | string | null
  vehicle_card?: CardRef | null
  created_by?: string | null
  created_by_name?: string | null
  checked_out_by?: string | null
  checked_out_by_name?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export type OptionalColumnKey =
  | "check_in_time"
  | "visitor_name"
  | "id_number"
  | "company"
  | "card_no"
  | "vehicle_card"
  | "plate_no"
  | "purpose"
  | "location"
  | "host"
  | "check_out_time"
  | "duration"
  | "created_by"

export const DEFAULT_VISIBLE_COLUMNS: OptionalColumnKey[] = [
  "check_in_time",
  "visitor_name",
  "card_no",
  "plate_no",
  "purpose",
]

export const ALL_OPTIONAL_COLUMNS: OptionalColumnKey[] = [
  "check_in_time",
  "visitor_name",
  "id_number",
  "company",
  "card_no",
  "vehicle_card",
  "plate_no",
  "purpose",
  "location",
  "host",
  "check_out_time",
  "duration",
  "created_by",
]

type StatusTab = "active" | "completed" | "all"
type DatePreset = "all" | "today" | "7d" | "30d" | "custom"

function formatLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatDateTimeFull(
  dateStr?: string | null,
  timeStr?: string | null,
  fullTimestamp?: string | null
): string {
  if (fullTimestamp) {
    try {
      const parsed = new Date(fullTimestamp.includes("T") ? fullTimestamp : fullTimestamp.replace(" ", "T"))
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
  }

  if (dateStr && timeStr) {
    try {
      const timeParts = timeStr.trim().split(":")
      const hh = (timeParts[0] || "00").padStart(2, "0")
      const mm = (timeParts[1] || "00").padStart(2, "0")
      const ss = (timeParts[2] || "00").padStart(2, "0")

      const dateParts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/")
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) {
          return `${dateParts[2].padStart(2, "0")}/${dateParts[1].padStart(2, "0")}/${dateParts[0]} ${hh}:${mm}:${ss}`
        } else {
          return `${dateParts[0].padStart(2, "0")}/${dateParts[1].padStart(2, "0")}/${dateParts[2]} ${hh}:${mm}:${ss}`
        }
      }
    } catch {
      // fallback
    }
  }

  if (dateStr) {
    return dateStr
  }

  return "-"
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Highlights matching search text, including tolerant plate matching
 * (ignoring spaces and hyphens when matching against plate numbers).
 */
export function HighlightText({
  text,
  query,
  isPlate = false,
}: {
  text: string | null | undefined
  query: string
  isPlate?: boolean
}) {
  const value = text ?? "-"
  const trimmed = query.trim()
  if (!trimmed || value === "-") {
    return <>{value}</>
  }

  // Standard substring regex first
  const directRegex = new RegExp(`(${escapeRegExp(trimmed)})`, "gi")
  if (directRegex.test(value)) {
    const parts = value.split(directRegex)
    return (
      <>
        {parts.map((part, idx) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark
              key={idx}
              className="rounded bg-amber-200/90 px-0.5 text-zinc-900 dark:bg-amber-500/40 dark:text-amber-100"
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={idx}>{part}</React.Fragment>
          )
        )}
      </>
    )
  }

  // Tolerant plate / ID highlighting: strip spaces/hyphens from query and allow optional separators between chars
  if (isPlate) {
    const cleanQuery = trimmed.replace(/[^a-zA-Z0-9]/g, "")
    if (cleanQuery.length >= 2) {
      const pattern = cleanQuery
        .split("")
        .map((ch) => escapeRegExp(ch))
        .join("[\\s\\-._]*")
      const plateRegex = new RegExp(`(${pattern})`, "gi")
      if (plateRegex.test(value)) {
        const parts = value.split(plateRegex)
        return (
          <>
            {parts.map((part, idx) =>
              idx % 2 === 1 ? (
                <mark
                  key={idx}
                  className="rounded bg-amber-200/90 px-0.5 text-zinc-900 dark:bg-amber-500/40 dark:text-amber-100"
                >
                  {part}
                </mark>
              ) : (
                <React.Fragment key={idx}>{part}</React.Fragment>
              )
            )}
          </>
        )
      }
    }
  }

  return <>{value}</>
}

function formatDuration(
  visit: VisitRecord,
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string
): string {
  const startStr =
    visit.date && visit.time_in
      ? `${visit.date}T${visit.time_in}`
      : visit.created_at || null

  if (!startStr) {
    if (typeof visit.days_open === "number" && visit.days_open > 0) {
      return `${visit.days_open} ${t("visit_history.days_unit", "hari")}`
    }
    return "-"
  }

  const start = new Date(startStr)
  const end = visit.checked_out_at ? new Date(visit.checked_out_at) : new Date()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    if (typeof visit.days_open === "number" && visit.days_open > 0) {
      return `${visit.days_open} ${t("visit_history.days_unit", "hari")}`
    }
    return "-"
  }

  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${Math.max(1, minutes)}m`
}

export default function VisitHistory() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()

  const canCheckout = hasPermission("checkout_visits")
  const canEdit =
    hasPermission("update_visits") ||
    hasPermission("create_visits") ||
    hasPermission("checkout_visits")
  const canDelete = hasPermission("delete_visits")

  // Column visibility state persisted per user in localStorage
  const storageKey = useMemo(
    () => `vms_visit_history_columns_v2_${user?.id || user?.username || "default"}`,
    [user?.id, user?.username]
  )

  const [visibleColumns, setVisibleColumns] = useState<OptionalColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((col): col is OptionalColumnKey =>
            ALL_OPTIONAL_COLUMNS.includes(col as OptionalColumnKey)
          )
          return valid
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_VISIBLE_COLUMNS
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns))
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, visibleColumns])

  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(e.target as Node)
      ) {
        setColumnMenuOpen(false)
      }
    }
    if (columnMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [columnMenuOpen])

  const toggleColumn = (col: OptionalColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const resetColumnsToDefault = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
  }

  const isColVisible = (col: OptionalColumnKey) => visibleColumns.includes(col)

  // Tabs & Filters State
  const [statusTab, setStatusTab] = useState<StatusTab>("active")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [visitorTypeFilter, setVisitorTypeFilter] = useState("")

  // Locations list for filter dropdown
  const [locations, setLocations] = useState<LocationRef[]>([])

  useEffect(() => {
    api
      .get("/locations?per_page=1000")
      .then((res) => {
        setLocations(unwrap(res) as LocationRef[])
      })
      .catch(() => {
        // Non-blocking if location master fetch fails
      })
  }, [])

  // 300ms Debounce for Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [perPage] = useState<number>(25)

  // Server Data State
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [totalItems, setTotalItems] = useState<number>(0)
  const [lastPage, setLastPage] = useState<number>(1)
  const [counts, setCounts] = useState<{
    active: number
    completed: number
    all: number
  }>({
    active: 0,
    completed: 0,
    all: 0,
  })

  // Selection State for Bulk Checkout
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Action Modals & Loading States
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [visitToCheckout, setVisitToCheckout] = useState<VisitRecord | null>(null)
  const [bulkCheckoutOpen, setBulkCheckoutOpen] = useState<boolean>(false)
  const [bulkCheckoutLoading, setBulkCheckoutLoading] = useState<boolean>(false)

  const [visitToDelete, setVisitToDelete] = useState<VisitRecord | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false)

  const [editingVisit, setEditingVisit] = useState<VisitRecord | null>(null)
  const [detailVisit, setDetailVisit] = useState<VisitRecord | null>(null)

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset)
    const today = new Date()
    if (preset === "all") {
      setDateFrom("")
      setDateTo("")
    } else if (preset === "today") {
      const todayStr = formatLocalDate(today)
      setDateFrom(todayStr)
      setDateTo(todayStr)
    } else if (preset === "7d") {
      const past = new Date(today)
      past.setDate(today.getDate() - 6)
      setDateFrom(formatLocalDate(past))
      setDateTo(formatLocalDate(today))
    } else if (preset === "30d") {
      const past = new Date(today)
      past.setDate(today.getDate() - 29)
      setDateFrom(formatLocalDate(past))
      setDateTo(formatLocalDate(today))
    }
    setCurrentPage(1)
  }

  const clearAllFilters = () => {
    setSearchInput("")
    setDebouncedSearch("")
    setDatePreset("all")
    setDateFrom("")
    setDateTo("")
    setLocationFilter("")
    setVisitorTypeFilter("")
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      dateFrom ||
      dateTo ||
      locationFilter ||
      visitorTypeFilter
  )

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        status: statusTab,
        page: currentPage,
        per_page: perPage,
        sort_by: sortBy,
        sort_dir: sortDir,
      }
      if (debouncedSearch) {
        params.search = debouncedSearch
      }
      if (dateFrom) {
        params.date_from = dateFrom
      }
      if (dateTo) {
        params.date_to = dateTo
      }
      if (locationFilter) {
        params.location_id = locationFilter
      }
      if (visitorTypeFilter) {
        params.visitor_type = visitorTypeFilter
      }

      const res = await api.get("/visits", { params })
      const payload = res.data

      const list: VisitRecord[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : []

      setVisits(list)
      setTotalItems(
        typeof payload?.total === "number" ? payload.total : list.length
      )
      setLastPage(
        typeof payload?.last_page === "number"
          ? Math.max(1, payload.last_page)
          : 1
      )

      if (payload?.counts) {
        setCounts({
          active: Number(payload.counts.active ?? 0),
          completed: Number(payload.counts.completed ?? 0),
          all: Number(payload.counts.all ?? 0),
        })
      } else {
        const activeCount = list.filter((v) => !v.checked_out_at).length
        const completedCount = list.filter((v) => Boolean(v.checked_out_at)).length
        setCounts({
          active: statusTab === "active" ? list.length : activeCount,
          completed: statusTab === "completed" ? list.length : completedCount,
          all: list.length,
        })
      }
    } catch (error: any) {
      console.error("Failed to fetch visits history", error)
      toast.error(
        error.response?.data?.message ||
          t("visit_history.fetch_error", "Gagal memuat data riwayat kunjungan")
      )
    } finally {
      setLoading(false)
    }
  }, [
    statusTab,
    currentPage,
    perPage,
    sortBy,
    sortDir,
    debouncedSearch,
    dateFrom,
    dateTo,
    locationFilter,
    visitorTypeFilter,
    t,
  ])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  // Clear selected checkboxes on tab/page change or when visits list updates
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) =>
        visits.some((v) => String(v.id) === id && !v.checked_out_at)
      )
    )
  }, [visits])

  const activeVisitsOnPage = useMemo(
    () => visits.filter((v) => !v.checked_out_at),
    [visits]
  )

  const allActiveOnPageSelected =
    activeVisitsOnPage.length > 0 &&
    activeVisitsOnPage.every((v) => selectedIds.includes(String(v.id)))

  const toggleSelectAllOnPage = () => {
    if (allActiveOnPageSelected) {
      const pageIds = new Set(activeVisitsOnPage.map((v) => String(v.id)))
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)))
    } else {
      const next = new Set(selectedIds)
      activeVisitsOnPage.forEach((v) => next.add(String(v.id)))
      setSelectedIds(Array.from(next))
    }
  }

  const toggleSelectRow = (visitId: string) => {
    setSelectedIds((prev) =>
      prev.includes(visitId)
        ? prev.filter((id) => id !== visitId)
        : [...prev, visitId]
    )
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortDir("asc")
    }
    setCurrentPage(1)
  }

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-zinc-400" />
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
    )
  }

  // Single Check-out execution
  const executeSingleCheckout = async () => {
    if (!visitToCheckout) return
    const visitId = String(visitToCheckout.id)
    if (checkoutLoading === visitId) return

    setCheckoutLoading(visitId)
    try {
      await api.post(`/visits/${visitId}/checkout`)
      toast.success(
        t(
          "visit_history.toast_checkout_success",
          "Pengunjung {{name}} berhasil check-out",
          {
            name:
              visitToCheckout.visitor?.name ||
              visitToCheckout.visitor_name ||
              t("visit_history.visitor_fallback", "Pengunjung"),
          }
        )
      )
      setSelectedIds((prev) => prev.filter((id) => id !== visitId))
      fetchVisits()
    } catch (error: any) {
      console.error("Checkout failed", error)
      toast.error(
        error.response?.data?.message ||
          t("visit_history.toast_checkout_failed", "Gagal melakukan check-out!")
      )
    } finally {
      setCheckoutLoading(null)
      setVisitToCheckout(null)
    }
  }

  // Bulk Check-out execution
  const executeBulkCheckout = async () => {
    if (selectedIds.length === 0 || bulkCheckoutLoading) return
    setBulkCheckoutLoading(true)
    try {
      const res = await api.post("/visits/bulk-checkout", {
        visit_ids: selectedIds,
      })
      const count = res.data?.checked_out_count ?? selectedIds.length
      toast.success(
        t(
          "visit_history.toast_bulk_checkout_success",
          "{{count}} kunjungan berhasil di-check-out",
          { count }
        )
      )
      setSelectedIds([])
      setBulkCheckoutOpen(false)
      fetchVisits()
    } catch (error: any) {
      console.error("Bulk checkout failed", error)
      toast.error(
        error.response?.data?.message ||
          t(
            "visit_history.toast_bulk_checkout_failed",
            "Gagal melakukan check-out massal!"
          )
      )
    } finally {
      setBulkCheckoutLoading(false)
    }
  }

  // Delete execution
  const executeDelete = async () => {
    if (!visitToDelete || deleteLoading) return
    setDeleteLoading(true)
    try {
      await api.delete(`/visits/${visitToDelete.id}`)
      toast.success(
        t("visit_history.toast_delete_success", "Data kunjungan berhasil dihapus")
      )
      setVisitToDelete(null)
      fetchVisits()
    } catch (error: any) {
      console.error("Delete failed", error)
      toast.error(
        error.response?.data?.message ||
          t("visit_history.toast_delete_failed", "Gagal menghapus kunjungan")
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const columnDefinitions: {
    key: OptionalColumnKey
    label: string
    sortKey?: string
  }[] = [
    {
      key: "check_in_time",
      label: t("visit_history.col_check_in", "Waktu Check-In"),
      sortKey: "date",
    },
    {
      key: "visitor_name",
      label: t("visit_history.col_visitor_name", "Nama Pengunjung"),
      sortKey: "visitor_name",
    },
    {
      key: "id_number",
      label: t("visit_history.col_id_number", "No. Identitas"),
    },
    {
      key: "company",
      label: t("visit_history.col_company", "Perusahaan"),
      sortKey: "visitor_company",
    },
    {
      key: "card_no",
      label: t("visit_history.col_card_no", "No. Kartu"),
    },
    {
      key: "vehicle_card",
      label: t("visit_history.col_vehicle_card", "Kartu Kendaraan"),
    },
    {
      key: "plate_no",
      label: t("visit_history.col_plate_no", "Plat Kendaraan (BP)"),
      sortKey: "vehicle_no",
    },
    {
      key: "purpose",
      label: t("visit_history.col_purpose", "Tujuan Kunjungan"),
      sortKey: "purpose",
    },
    {
      key: "location",
      label: t("visit_history.col_location", "Lokasi / Kapal"),
      sortKey: "location_name",
    },
    {
      key: "host",
      label: t("visit_history.col_host", "Staf Host"),
      sortKey: "host_name",
    },
    {
      key: "check_out_time",
      label: t("visit_history.col_check_out", "Waktu Check-Out"),
      sortKey: "checked_out_at",
    },
    {
      key: "duration",
      label: t("visit_history.col_duration", "Durasi"),
    },
    {
      key: "created_by",
      label: t("visit_history.col_created_by", "Dicatat Oleh"),
      sortKey: "created_by_name",
    },
  ]

  const completedDisabledTooltip = t(
    "visit_history.completed_disabled_tooltip",
    "Kunjungan sudah selesai, tidak bisa diedit"
  )

  const totalColSpan = 1 + visibleColumns.length + 2 // checkbox + visible optional + status + action

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("visit_history.title", "Riwayat Kunjungan")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t(
              "visit_history.subtitle",
              "Pantau pengunjung aktif, riwayat kunjungan selesai, check-out, edit, dan cetak ulang pass."
            )}
          </p>
        </div>

        {/* Status Segmented Control / Tabs */}
        <div
          role="tablist"
          aria-label={t("visit_history.status_filter_label", "Filter Status Kunjungan")}
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            role="tab"
            data-testid="tab-status-active"
            aria-selected={statusTab === "active"}
            onClick={() => {
              setStatusTab("active")
              setCurrentPage(1)
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusTab === "active"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{t("visit_history.tab_active", "Aktif")}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="tab-status-completed"
            aria-selected={statusTab === "completed"}
            onClick={() => {
              setStatusTab("completed")
              setCurrentPage(1)
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusTab === "completed"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>{t("visit_history.tab_completed", "Selesai")}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="tab-status-all"
            aria-selected={statusTab === "all"}
            onClick={() => {
              setStatusTab("all")
              setCurrentPage(1)
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>{t("visit_history.tab_all", "Semua")}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {counts.all}
            </span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        {/* Top Controls Row: Unified Search + Column Picker + Refresh */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t(
                "visit_history.search_placeholder",
                "Cari nama, KTP/ID, PT, no. kartu, plat kendaraan (BP 1234 XY), tujuan, host, lokasi..."
              )}
              className="pl-9 pr-8"
              aria-label={t("visit_history.search_aria", "Pencarian kunjungan")}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                aria-label={t("common.clear", "Bersihkan")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Column Picker Dropdown */}
            <div className="relative" ref={columnMenuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="column-picker-trigger"
                onClick={() => setColumnMenuOpen((o) => !o)}
                className="cursor-pointer gap-1.5"
              >
                <Columns3 className="h-4 w-4" />
                <span>{t("visit_history.columns_btn", "Kolom")}</span>
                <Badge
                  variant="secondary"
                  className="ml-0.5 px-1.5 py-0 text-[10px]"
                >
                  {visibleColumns.length + 2}
                </Badge>
              </Button>

              {columnMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t("visit_history.toggle_columns", "Tampilkan Kolom")}
                    </span>
                    <button
                      type="button"
                      onClick={resetColumnsToDefault}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t("visit_history.reset_columns", "Reset ke default")}
                    </button>
                  </div>

                  <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {columnDefinitions.map((col) => {
                      const checked = isColVisible(col.key)
                      return (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleColumn(col.key)}
                            className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                          />
                          <span className="text-zinc-700 dark:text-zinc-200">
                            {col.label}
                          </span>
                        </label>
                      )
                    })}

                    {/* Locked Columns */}
                    <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
                      <label className="flex items-center gap-2 rounded px-2 py-1 text-xs opacity-60">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="h-3.5 w-3.5 rounded border-zinc-300"
                        />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {t("visit_history.col_status", "Status")} (
                          {t("visit_history.always_visible", "Selalu tampil")})
                        </span>
                      </label>
                      <label className="flex items-center gap-2 rounded px-2 py-1 text-xs opacity-60">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="h-3.5 w-3.5 rounded border-zinc-300"
                        />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {t("visit_history.col_action", "Aksi")} (
                          {t("visit_history.always_visible", "Selalu tampil")})
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchVisits}
              disabled={loading}
              title={t("visit_history.reload", "Muat Ulang")}
              className="cursor-pointer"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Secondary Filter Bar: Date Presets, Custom Date Range, Location, Visitor Type */}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
          <div className="flex items-center gap-1 text-xs font-medium text-zinc-500">
            <Filter className="h-3.5 w-3.5" />
            <span>{t("visit_history.filters_label", "Filter:")}</span>
          </div>

          {/* Date Presets */}
          <div className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            {(
              [
                { id: "all", label: t("visit_history.preset_all", "Semua Tanggal") },
                { id: "today", label: t("visit_history.preset_today", "Hari ini") },
                { id: "7d", label: t("visit_history.preset_7d", "7 Hari") },
                { id: "30d", label: t("visit_history.preset_30d", "30 Hari") },
              ] as { id: DatePreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  datePreset === preset.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date From - Date To */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="date"
              value={dateFrom}
              aria-label={t("visit_history.date_from", "Dari Tanggal")}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setDatePreset("custom")
                setCurrentPage(1)
              }}
              className="h-8 w-36 text-xs"
            />
            <span className="text-zinc-400">-</span>
            <Input
              type="date"
              value={dateTo}
              aria-label={t("visit_history.date_to", "Sampai Tanggal")}
              onChange={(e) => {
                setDateTo(e.target.value)
                setDatePreset("custom")
                setCurrentPage(1)
              }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {/* Location/Vessel Filter */}
          <select
            value={locationFilter}
            aria-label={t("visit_history.filter_location", "Filter Lokasi / Kapal")}
            onChange={(e) => {
              setLocationFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="">
              {t("visit_history.all_locations", "Semua Lokasi / Kapal")}
            </option>
            {locations.map((loc) => (
              <option key={String(loc.id)} value={String(loc.id)}>
                {loc.name}
                {loc.type && loc.type !== "location" ? ` (${loc.type})` : ""}
              </option>
            ))}
          </select>

          {/* Visitor Type Filter */}
          <select
            value={visitorTypeFilter}
            aria-label={t("visit_history.filter_visitor_type", "Filter Tipe Pengunjung")}
            onChange={(e) => {
              setVisitorTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="">
              {t("visit_history.all_visitor_types", "Semua Tipe Pengunjung")}
            </option>
            <option value="general">
              {t("visit_history.type_general", "Umum / General")}
            </option>
            <option value="guest">
              {t("visit_history.type_guest", "Tamu / Guest")}
            </option>
            <option value="contractor">
              {t("visit_history.type_contractor", "Kontraktor / Contractor")}
            </option>
            <option value="vendor">
              {t("visit_history.type_vendor", "Vendor / Supplier")}
            </option>
            <option value="crew">
              {t("visit_history.type_crew", "Kru Kapal / Vessel Crew")}
            </option>
            <option value="official">
              {t("visit_history.type_official", "Pejabat / Official")}
            </option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t("visit_history.clear_filters", "Reset Filter")}
            </Button>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && canCheckout && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                {t(
                  "visit_history.bulk_selected_count",
                  "{{count}} kunjungan aktif dipilih",
                  { count: selectedIds.length }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs cursor-pointer"
              >
                {t("visit_history.clear_selection", "Batal Pilih")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setBulkCheckoutOpen(true)}
                disabled={bulkCheckoutLoading}
                className="h-8 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                {bulkCheckoutLoading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t(
                  "visit_history.bulk_checkout_btn",
                  "Check-out Terpilih ({{count}})",
                  { count: selectedIds.length }
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                {/* Bulk Selection Checkbox Column */}
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label={t(
                      "visit_history.select_all_active",
                      "Pilih semua kunjungan aktif di halaman ini"
                    )}
                    checked={allActiveOnPageSelected}
                    disabled={activeVisitsOnPage.length === 0 || !canCheckout}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:opacity-40 cursor-pointer"
                  />
                </TableHead>

                {/* Check-In: kolom pertama dari kiri (setelah checkbox) */}
                {isColVisible("check_in_time") && (
                  <TableHead
                    onClick={() => handleSort("date")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_check_in", "Waktu Masuk")}
                      {renderSortIcon("date")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("visitor_name") && (
                  <TableHead
                    onClick={() => handleSort("visitor_name")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_visitor_name", "Nama Pengunjung")}
                      {renderSortIcon("visitor_name")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("id_number") && (
                  <TableHead className="whitespace-nowrap">
                    {t("visit_history.col_id_number", "No. Identitas")}
                  </TableHead>
                )}

                {isColVisible("company") && (
                  <TableHead
                    onClick={() => handleSort("visitor_company")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_company", "Perusahaan")}
                      {renderSortIcon("visitor_company")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("card_no") && (
                  <TableHead className="whitespace-nowrap">
                    {t("visit_history.col_card_no", "No. Kartu")}
                  </TableHead>
                )}

                {isColVisible("vehicle_card") && (
                  <TableHead className="whitespace-nowrap">
                    {t("visit_history.col_vehicle_card", "Kartu Kendaraan")}
                  </TableHead>
                )}

                {isColVisible("plate_no") && (
                  <TableHead
                    onClick={() => handleSort("vehicle_no")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_plate_no", "Plat Kendaraan (BP)")}
                      {renderSortIcon("vehicle_no")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("purpose") && (
                  <TableHead
                    onClick={() => handleSort("purpose")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_purpose", "Tujuan Kunjungan")}
                      {renderSortIcon("purpose")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("location") && (
                  <TableHead
                    onClick={() => handleSort("location_name")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_location", "Lokasi / Kapal")}
                      {renderSortIcon("location_name")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("host") && (
                  <TableHead
                    onClick={() => handleSort("host_name")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_host", "Staf Host")}
                      {renderSortIcon("host_name")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("check_out_time") && (
                  <TableHead
                    onClick={() => handleSort("checked_out_at")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_check_out", "Waktu Keluar")}
                      {renderSortIcon("checked_out_at")}
                    </div>
                  </TableHead>
                )}

                {isColVisible("duration") && (
                  <TableHead className="whitespace-nowrap">
                    {t("visit_history.col_duration", "Durasi")}
                  </TableHead>
                )}

                {isColVisible("created_by") && (
                  <TableHead
                    onClick={() => handleSort("created_by_name")}
                    className="cursor-pointer select-none whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      {t("visit_history.col_created_by", "Dicatat Oleh")}
                      {renderSortIcon("created_by_name")}
                    </div>
                  </TableHead>
                )}

                {/* Locked Column: Status */}
                <TableHead className="whitespace-nowrap">
                  {t("visit_history.col_status", "Status")}
                </TableHead>

                {/* Locked Column: Action (Sticky right on horizontal scroll) */}
                <TableHead className="sticky right-0 bg-zinc-50/95 text-right whitespace-nowrap backdrop-blur-xs dark:bg-zinc-900/95">
                  {t("visit_history.col_action", "Aksi")}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">
                      {t("visit_history.loading", "Memuat riwayat kunjungan...")}
                    </span>
                  </TableCell>
                </TableRow>
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={totalColSpan}
                    className="h-32 text-center text-zinc-500"
                  >
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t("visit_history.empty_title", "Tidak ditemukan")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {t(
                        "visit_history.empty_desc",
                        "Tidak ada data kunjungan yang cocok dengan filter atau pencarian saat ini."
                      )}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => {
                  const isActive = !visit.checked_out_at
                  const visitIdStr = String(visit.id)
                  const isSelected = selectedIds.includes(visitIdStr)

                  const visitorName =
                    visit.visitor?.name || visit.visitor_name || "-"
                  const company =
                    visit.visitor_company || visit.visitor?.company || "-"
                  const idNumber = visit.visitor?.id_number || "-"
                  const idType = (visit.visitor?.id_type || "KTP").toUpperCase()
                  const cardNos =
                    visit.visitor_cards
                      ?.map((c) => c.card_no)
                      .filter(Boolean)
                      .join(", ") || "-"
                  const vehicleCardNo = visit.vehicle_card?.card_no || "-"
                  const plateNo = visit.vehicle_no || visit.vehicle_plate || "-"
                  const purpose = visit.purpose || "-"
                  const locationName =
                    visit.location_name || visit.location?.name || "-"
                  const hostName = visit.host_name || visit.staff?.name || "-"
                  const hostOccupation = visit.host_occupation || visit.staff?.occupation || null
                  const checkInDisplay = formatDateTimeFull(
                    visit.date,
                    visit.time_in,
                    visit.checked_in_at
                  )
                  const checkOutDisplay = visit.checked_out_at || visit.time_out
                    ? formatDateTimeFull(
                        visit.date,
                        visit.time_out,
                        visit.checked_out_at
                      )
                    : "-"

                  const daysOpen =
                    typeof visit.days_open === "number" ? visit.days_open : 0

                  return (
                    <TableRow
                      key={visitIdStr}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                      }`}
                    >
                      {/* Row Checkbox */}
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          aria-label={t(
                            "visit_history.select_row",
                            "Pilih kunjungan {{name}}",
                            { name: visitorName }
                          )}
                          checked={isSelected}
                          disabled={!isActive || !canCheckout}
                          onChange={() => toggleSelectRow(visitIdStr)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:opacity-30 cursor-pointer"
                        />
                      </TableCell>

                      {/* Check-in Time: kolom pertama dari kiri (setelah checkbox) */}
                      {isColVisible("check_in_time") && (
                        <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {checkInDisplay || "-"}
                        </TableCell>
                      )}

                      {/* Visitor Name */}
                      {isColVisible("visitor_name") && (
                        <TableCell className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>
                              <HighlightText
                                text={visitorName}
                                query={debouncedSearch}
                              />
                            </span>
                            {visit.visitor?.visitor_type === "crew" && (
                              <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                <Anchor className="h-2.5 w-2.5" />
                                {t("visit_history.crew_badge", "Crew Kapal")}
                                {visit.visitor?.occupation
                                  ? ` • ${visit.visitor.occupation}`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {!isColVisible("company") && company !== "-" && (
                            <div className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                              <HighlightText
                                text={company}
                                query={debouncedSearch}
                              />
                            </div>
                          )}
                          {(visit.ticket_number || visit.legacy_registration_no) && (
                            <div className="font-mono text-[11px] font-normal text-zinc-400">
                              #
                              <HighlightText
                                text={
                                  visit.ticket_number ||
                                  visit.legacy_registration_no
                                }
                                query={debouncedSearch}
                              />
                            </div>
                          )}
                        </TableCell>
                      )}

                      {/* ID Number */}
                      {isColVisible("id_number") && (
                        <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          <span className="mr-1 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-sans font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {idType}
                          </span>
                          <HighlightText
                            text={idNumber}
                            query={debouncedSearch}
                            isPlate
                          />
                        </TableCell>
                      )}

                      {/* Company */}
                      {isColVisible("company") && (
                        <TableCell className="text-zinc-700 dark:text-zinc-300">
                          <HighlightText
                            text={company}
                            query={debouncedSearch}
                          />
                        </TableCell>
                      )}

                      {/* Visitor Card No */}
                      {isColVisible("card_no") && (
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {cardNos !== "-" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800">
                              <CreditCard className="h-3 w-3 text-zinc-400" />
                              <HighlightText
                                text={cardNos}
                                query={debouncedSearch}
                              />
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Vehicle Card */}
                      {isColVisible("vehicle_card") && (
                        <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          <HighlightText
                            text={vehicleCardNo}
                            query={debouncedSearch}
                          />
                        </TableCell>
                      )}

                      {/* Plate Number (BP) */}
                      {isColVisible("plate_no") && (
                        <TableCell className="whitespace-nowrap">
                          {plateNo !== "-" ? (
                            <span className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                              <Car className="h-3 w-3 text-zinc-500" />
                              <HighlightText
                                text={plateNo}
                                query={debouncedSearch}
                                isPlate
                              />
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Purpose */}
                      {isColVisible("purpose") && (
                        <TableCell className="max-w-xs truncate text-zinc-700 dark:text-zinc-300">
                          <HighlightText
                            text={purpose}
                            query={debouncedSearch}
                          />
                        </TableCell>
                      )}

                      {/* Location / Vessel */}
                      {isColVisible("location") && (
                        <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>
                              <HighlightText
                                text={locationName}
                                query={debouncedSearch}
                              />
                            </span>
                            {visit.location?.type &&
                              visit.location.type !== "location" && (
                                <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                                  <Ship className="h-2.5 w-2.5" />
                                  {visit.location.vessel_type ||
                                    visit.location.type}
                                </span>
                              )}
                          </div>
                        </TableCell>
                      )}

                      {/* Host */}
                      {isColVisible("host") && (
                        <TableCell className="text-zinc-700 dark:text-zinc-300">
                          <div>
                            <HighlightText
                              text={hostName}
                              query={debouncedSearch}
                            />
                          </div>
                          {hostOccupation && (
                            <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              {hostOccupation}
                            </div>
                          )}
                        </TableCell>
                      )}

                      {/* Check-out Time */}
                      {isColVisible("check_out_time") && (
                        <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {checkOutDisplay}
                        </TableCell>
                      )}

                      {/* Duration */}
                      {isColVisible("duration") && (
                        <TableCell className="whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">
                          {formatDuration(visit, t)}
                        </TableCell>
                      )}

                      {/* Created By */}
                      {isColVisible("created_by") && (
                        <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          <HighlightText
                            text={visit.created_by_name || "-"}
                            query={debouncedSearch}
                          />
                        </TableCell>
                      )}

                      {/* Locked Column: Status */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {isActive ? (
                            <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {t("visit_history.status_active", "Aktif")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-zinc-600 dark:text-zinc-300"
                            >
                              {t("visit_history.status_completed", "Selesai")}
                            </Badge>
                          )}

                          {isActive && daysOpen > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              <Clock className="h-2.5 w-2.5" />
                              {daysOpen} {t("visit_history.days_unit", "hari")}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Locked Column: Action (Directly visible buttons) */}
                      <TableCell className="sticky right-0 bg-white/95 text-right whitespace-nowrap backdrop-blur-xs dark:bg-zinc-950/95">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Check-out Button */}
                          {canCheckout && (
                            <span
                              title={
                                !isActive
                                  ? completedDisabledTooltip
                                  : t(
                                      "visit_history.action_checkout",
                                      "Check-out Pengunjung"
                                    )
                              }
                            >
                              <Button
                                type="button"
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                data-testid={`btn-checkout-${visitIdStr}`}
                                disabled={
                                  !isActive || checkoutLoading === visitIdStr
                                }
                                onClick={() => setVisitToCheckout(visit)}
                                className={`h-8 px-2.5 text-xs font-semibold ${
                                  isActive
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                    : "cursor-not-allowed opacity-50"
                                }`}
                              >
                                {checkoutLoading === visitIdStr ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <LogOut className="mr-1 h-3.5 w-3.5" />
                                    {t("visit_history.btn_checkout", "Check-out")}
                                  </>
                                )}
                              </Button>
                            </span>
                          )}

                          {/* Reprint Button */}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            data-testid={`btn-reprint-${visitIdStr}`}
                            onClick={() =>
                              navigate(`/visits/${visit.id}/print`, {
                                state: { visit, isReprint: true },
                              })
                            }
                            title={t(
                              "visit_history.btn_reprint",
                              "Reprint Pass"
                            )}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            {t("visit_history.btn_reprint_short", "Reprint")}
                          </Button>

                          {/* Edit Button */}
                          {canEdit && (
                            <span
                              title={
                                !isActive
                                  ? completedDisabledTooltip
                                  : t(
                                      "visit_history.action_edit",
                                      "Edit Kunjungan"
                                    )
                              }
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid={`btn-edit-${visitIdStr}`}
                                disabled={!isActive}
                                title={
                                  !isActive
                                    ? completedDisabledTooltip
                                    : t(
                                        "visit_history.action_edit",
                                        "Edit Kunjungan"
                                      )
                                }
                                onClick={() => isActive && setEditingVisit(visit)}
                                className={`h-8 px-2.5 text-xs ${
                                  isActive
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-50"
                                }`}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                {t("visit_history.btn_edit", "Edit")}
                              </Button>
                            </span>
                          )}

                          {/* Detail Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`btn-detail-${visitIdStr}`}
                            onClick={() => setDetailVisit(visit)}
                            title={t(
                              "visit_history.btn_detail",
                              "Detail Kunjungan"
                            )}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            {t("visit_history.btn_detail_short", "Detail")}
                          </Button>

                          {/* Delete Button (Admin only) */}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setVisitToDelete(visit)}
                              title={t(
                                "visit_history.btn_delete",
                                "Hapus Kunjungan"
                              )}
                              className="h-8 px-2 text-xs cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("common.showing", "Menampilkan")}{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {totalItems > 0 ? (currentPage - 1) * perPage + 1 : 0}
            </span>{" "}
            {t("common.to", "hingga")}{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {Math.min(currentPage * perPage, totalItems)}
            </span>{" "}
            {t("common.of", "dari")}{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {totalItems}
            </span>{" "}
            {t("common.entries", "data")}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              {t("visit_history.page_indicator", "Halaman {{page}} dari {{total}}", {
                page: currentPage,
                current: currentPage,
                total: lastPage,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              aria-label={t("common.previous_page", "Halaman sebelumnya")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
              disabled={currentPage >= lastPage || loading}
              aria-label={t("common.next_page", "Halaman berikutnya")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Single Check-out Confirmation Dialog */}
      <AlertDialog
        open={Boolean(visitToCheckout)}
        onOpenChange={(open) => !open && setVisitToCheckout(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "visit_history.checkout_confirm_title",
                "Konfirmasi Check-out Pengunjung"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "visit_history.checkout_confirm_desc",
                "Tindakan ini akan mencatat waktu keluar untuk {{name}} dan mengembalikan kartu pengunjung serta kartu kendaraan ke status tersedia (available).",
                {
                  name:
                    visitToCheckout?.visitor?.name ||
                    visitToCheckout?.visitor_name ||
                    "",
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(checkoutLoading)}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSingleCheckout}
              disabled={Boolean(checkoutLoading)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {t(
                "visit_history.checkout_confirm_btn",
                "Ya, Check-out Sekarang"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Check-out Confirmation Dialog */}
      <AlertDialog open={bulkCheckoutOpen} onOpenChange={setBulkCheckoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "visit_history.bulk_checkout_confirm_title",
                "Konfirmasi Check-out Massal"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "visit_history.bulk_checkout_confirm_desc",
                "Anda akan melakukan check-out untuk {{count}} kunjungan aktif sekaligus. Semua kartu pengunjung dan kartu kendaraan terkait akan otomatis dikembalikan ke status tersedia.",
                { count: selectedIds.length }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkCheckoutLoading}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkCheckout}
              disabled={bulkCheckoutLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {t(
                "visit_history.bulk_checkout_confirm_btn",
                "Konfirmasi Check-out Massal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(visitToDelete)}
        onOpenChange={(open) => !open && setVisitToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("visit_history.delete_confirm_title", "Hapus Kunjungan?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "visit_history.delete_confirm_desc",
                "Tindakan ini tidak dapat dibatalkan. Riwayat kunjungan akan dihapus secara permanen dan kartu yang sedang dipakai akan dikembalikan ke status tersedia."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              {t("common.cancel", "Batal")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleteLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("common.delete", "Hapus Permanen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Modal */}
      <Dialog
        open={Boolean(detailVisit)}
        onOpenChange={(open) => !open && setDetailVisit(null)}
      >
        <DialogContent className="max-w-xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>
                {t("visit_history.detail_title", "Detail Kunjungan")}
              </span>
              {detailVisit && (
                <Badge
                  variant={detailVisit.checked_out_at ? "secondary" : "default"}
                  className={
                    detailVisit.checked_out_at
                      ? ""
                      : "bg-emerald-600 text-white"
                  }
                >
                  {detailVisit.checked_out_at
                    ? t("visit_history.status_completed", "Selesai")
                    : t("visit_history.status_active", "Aktif")}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("visit_history.detail_subtitle", "Nomor Tiket:")}{" "}
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {detailVisit?.ticket_number ||
                  detailVisit?.legacy_registration_no ||
                  `#${detailVisit?.id}`}
              </span>
            </DialogDescription>
          </DialogHeader>

          {detailVisit && (
            <div className="grid grid-cols-1 gap-3 py-2 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.col_visitor_name", "Nama Pengunjung")}
                </span>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {detailVisit.visitor?.name || detailVisit.visitor_name || "-"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {(detailVisit.visitor?.id_type || "KTP").toUpperCase()}:{" "}
                  {detailVisit.visitor?.id_number || "-"}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.col_company", "Perusahaan")}
                </span>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {detailVisit.visitor_company ||
                    detailVisit.visitor?.company ||
                    "-"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t("visit_history.visitor_type_label", "Tipe:")}{" "}
                  {detailVisit.visitor?.visitor_type || "-"}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.col_location", "Lokasi / Kapal")}
                </span>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {detailVisit.location_name ||
                    detailVisit.location?.name ||
                    "-"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t("visit_history.col_host", "Staf Host")}:{" "}
                  {detailVisit.host_name || detailVisit.staff?.name || "-"}
                  {(detailVisit.host_occupation || detailVisit.staff?.occupation)
                    ? ` (${detailVisit.host_occupation || detailVisit.staff?.occupation})`
                    : ""}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.col_purpose", "Tujuan Kunjungan")}
                </span>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {detailVisit.purpose || "-"}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.col_card_no", "No. Kartu")} &{" "}
                  {t("visit_history.col_plate_no", "Plat Kendaraan (BP)")}
                </span>
                <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("visit_history.col_card_no", "No. Kartu")}:{" "}
                  {detailVisit.visitor_cards
                    ?.map((c) => c.card_no)
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {t("visit_history.col_vehicle_card", "Kartu Kendaraan")}:{" "}
                  {detailVisit.vehicle_card?.card_no || "-"}
                </p>
                <p className="mt-0.5 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {t("visit_history.col_plate_no", "Plat Kendaraan (BP)")}:{" "}
                  {detailVisit.vehicle_no || detailVisit.vehicle_plate || "-"}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase text-zinc-400">
                  {t("visit_history.timestamps_label", "Waktu & Petugas")}
                </span>
                <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold">
                    {t("visit_history.col_check_in", "Waktu Masuk")}:
                  </span>{" "}
                  {formatDateTimeFull(detailVisit.date, detailVisit.time_in, detailVisit.checked_in_at)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold">
                    {t("visit_history.col_check_out", "Waktu Keluar")}:
                  </span>{" "}
                  {detailVisit.checked_out_at || detailVisit.time_out
                    ? formatDateTimeFull(detailVisit.date, detailVisit.time_out, detailVisit.checked_out_at)
                    : "-"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t("visit_history.col_created_by", "Dicatat Oleh")}:{" "}
                  {detailVisit.created_by_name || "-"}
                </p>
                {detailVisit.checked_out_by_name && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("visit_history.checked_out_by", "Check-out Oleh")}:{" "}
                    {detailVisit.checked_out_by_name}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {detailVisit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const target = detailVisit
                  setDetailVisit(null)
                  navigate(`/visits/${target.id}/print`, {
                    state: { visit: target, isReprint: true },
                  })
                }}
                className="cursor-pointer"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                {t("visit_history.btn_reprint", "Reprint Pass")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailVisit(null)}
            >
              {t("common.close", "Tutup")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Edit Visit Modal */}
      <EditVisitModal
        visit={editingVisit}
        isOpen={Boolean(editingVisit)}
        onClose={() => setEditingVisit(null)}
        onSuccess={() => {
          setEditingVisit(null)
          fetchVisits()
        }}
      />
    </div>
  )
}