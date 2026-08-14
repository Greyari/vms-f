import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"

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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  User,
  Globe,
  Clock,
  ArrowRight,
} from "lucide-react"

type LogRow = {
  id: string
  causer_id: string | null
  causer_name: string | null
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
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [subjectTypes, setSubjectTypes] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState(ALL)
  const [subjectFilter, setSubjectFilter] = useState(ALL)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/activity-logs", {
        params: {
          page: currentPage,
          search: search || undefined,
          action: actionFilter !== ALL ? actionFilter : undefined,
          subject_type: subjectFilter !== ALL ? subjectFilter : undefined,
          per_page: 15,
        },
      })
      setLogs(res.data.data ?? [])
      setLastPage(res.data.last_page ?? 1)
      setTotal(res.data.total ?? 0)
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch activity logs.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, actionFilter, subjectFilter])

  const loadSubjectTypes = async () => {
    try {
      const res = await api.get("/activity-logs/subject-types")
      setSubjectTypes(res.data ?? [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadSubjectTypes()
  }, [])

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, actionFilter, subjectFilter])

  const openDetail = (log: LogRow) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "—"
    if (typeof v === "boolean") return v ? "true" : "false"
    if (typeof v === "object") return JSON.stringify(v, null, 2)
    return String(v)
  }

  // Union of keys touched by this log entry
  const changedFields = (log: LogRow) => {
    const keys = new Set([
      ...Object.keys(log.old_values ?? {}),
      ...Object.keys(log.new_values ?? {}),
    ])
    return Array.from(keys)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Activity Logs</h1>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search user or record name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {Object.entries(ACTION_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="All data types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All data types</SelectItem>
              {subjectTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-zinc-500"
                  >
                    No activity found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell className="whitespace-nowrap text-sm text-zinc-500">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {log.causer_name ?? "System"}
                      </div>
                      {log.causer_email && (
                        <div className="text-xs text-zinc-500">
                          {log.causer_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[log.action] ?? "outline"}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.subject_type ? (
                        <>
                          <span className="font-medium">
                            {log.subject_type}
                          </span>
                          {log.subject_label && (
                            <span className="text-zinc-500">
                              {" "}
                              — {log.subject_label}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(log.old_values || log.new_values) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(log)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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
              disabled={currentPage === lastPage || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL / DIALOG DETIK AKTIVITAS */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-2xl lg:max-w-3xl flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Badge variant={ACTION_VARIANT[selectedLog?.action ?? ""] ?? "outline"}>
                {ACTION_LABEL[selectedLog?.action ?? ""] ?? selectedLog?.action}
              </Badge>
              <DialogTitle className="text-lg font-semibold">
                {selectedLog?.subject_type ?? "Activity Detail"}
                {selectedLog?.subject_label && (
                  <span className="text-zinc-500 font-normal ml-1">
                    ({selectedLog.subject_label})
                  </span>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 pt-1">
              Log ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
              {/* Metadata Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-zinc-500">Performed By</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedLog.causer_name ?? "System"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-zinc-500">Timestamp</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-zinc-500">IP Address</p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                      {selectedLog.ip_address ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Field Changes Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Data Changes
                </h3>

                {changedFields(selectedLog).length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <Table className="w-full table-fixed">
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                        <TableRow>
                          <TableHead className="w-1/4">Field</TableHead>
                          <TableHead className="w-3/8">Old Value</TableHead>
                          <TableHead className="w-3/8">New Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {changedFields(selectedLog).map((field) => {
                          const oldVal = selectedLog.old_values?.[field]
                          const newVal = selectedLog.new_values?.[field]
                          const isDifferent = oldVal !== newVal

                          return (
                            <TableRow key={field} className="align-top">
                              <TableCell className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 break-all">
                                {field}
                              </TableCell>
                              <TableCell className="bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-200 font-mono text-xs break-all whitespace-pre-wrap">
                                {formatValue(oldVal)}
                              </TableCell>
                              <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-mono text-xs break-all whitespace-pre-wrap">
                                {formatValue(newVal)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
                    No detailed field-level changes recorded for this event.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}