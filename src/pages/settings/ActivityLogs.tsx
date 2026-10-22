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

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  restored: "Restored",
  login: "Login",
  logout: "Logout",
  login_failed: "Login Failed",
}

const ACTION_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  restored: "secondary",
  login: "outline",
  logout: "outline",
  login_failed: "destructive",
}

const ALL = "__all__"

export default function ActivityLogs() {
  const { t } = useTranslation()
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
      default:
        return action
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
              {Object.keys(ACTION_LABEL).map((val) => (
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
                  const actorDisplay = log.causer_username
                    ? `@${log.causer_username}`
                    : log.causer_email || log.causer_name || t("logs.actor_system", "Sistem")

                  return (
                    <TableRow key={log.id || index} className="text-xs">
                      <TableCell className="text-center text-zinc-500 font-mono">
                        {(currentPage - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-700 dark:text-zinc-300">
                        {log.created_at}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {actorDisplay}
                        </div>
                        {log.causer_name && log.causer_username && (
                          <div className="text-[11px] text-zinc-500">
                            {log.causer_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ACTION_VARIANT[log.action] ?? "secondary"}
                          className="capitalize text-[11px]"
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
                          className="h-8 w-8 p-0"
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
              className="h-7 w-7 p-0"
              aria-label={t("common.previous", "Previous Page")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="h-7 w-7 p-0"
              aria-label={t("common.next", "Next Page")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-md dark:bg-zinc-900">
                <div>
                  <span className="text-zinc-500">{t("logs.time_occurred", "Waktu Kejadian:")}</span>
                  <div className="font-mono font-medium">{selectedLog.created_at}</div>
                </div>
                <div>
                  <span className="text-zinc-500">{t("logs.causer_label", "Pelaku (Causer):")}</span>
                  <div className="font-medium">
                    {selectedLog.causer_username ? `@${selectedLog.causer_username}` : selectedLog.causer_name || selectedLog.causer_email || t("logs.actor_system", "Sistem")}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">{t("logs.action_event", "Aksi / Event:")}</span>
                  <div>
                    <Badge variant={ACTION_VARIANT[selectedLog.action] ?? "secondary"} className="text-[10px]">
                      {getActionLabel(selectedLog.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">{t("logs.ip_address", "IP Address:")}</span>
                  <div className="font-mono">{selectedLog.ip_address || "-"}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500">{t("logs.subject_label", "Subjek:")}</span>
                  <div className="font-medium">
                    {selectedLog.subject_type}: {selectedLog.subject_label || selectedLog.subject_id || "-"}
                  </div>
                </div>
              </div>

              {/* Old vs New Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    {t("logs.payload_before", "Nilai Sebelumnya (Old Values)")}
                  </div>
                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 ? (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {Object.entries(selectedLog.old_values).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-zinc-100 py-1 dark:border-zinc-800">
                          <span className="text-zinc-500">{k}:</span>
                          <span className="text-red-600 font-medium truncate max-w-[180px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-400 italic">{t("logs.no_old_values", "Tidak ada nilai sebelumnya.")}</div>
                  )}
                </div>

                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    {t("logs.payload_after", "Nilai Baru (New Values)")}
                  </div>
                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 ? (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {Object.entries(selectedLog.new_values).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-zinc-100 py-1 dark:border-zinc-800">
                          <span className="text-zinc-500">{k}:</span>
                          <span className="text-emerald-600 font-medium truncate max-w-[180px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-400 italic">{t("logs.no_new_values", "Tidak ada nilai baru.")}</div>
                  )}
                </div>
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