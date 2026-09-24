import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"

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
import {
  Search,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Printer,
  Pencil,
  Clock,
} from "lucide-react"
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
import EditVisitModal from "@/components/visits/EditVisitModal"

interface CardRef {
  id?: number | string
  card_no?: string
  status?: string
}

interface VisitorRef {
  id?: number | string
  name: string
  company?: string | null
}

interface LocationRef {
  id?: number | string
  name: string
}

interface StaffRef {
  id?: number | string
  name: string
}

export interface VisitRecord {
  id: number | string
  ticket_number?: string | null
  legacy_registration_no?: string | null
  visitor_cards?: CardRef[]
  visitor?: VisitorRef | null
  visitor_company?: string | null
  location?: LocationRef | null
  location_name?: string | null
  staff?: StaffRef | null
  host_name?: string | null
  purpose?: string | null
  time_in?: string | null
  check_in_at?: string | null
  days_open?: number
  checked_out_at?: string | null
  vehicle_plate?: string | null
  vehicle_card?: CardRef | null
  [key: string]: unknown
}

export default function ActiveVisits() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  // Advanced Table States
  const [search, setSearch] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Alert Dialog States
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null)

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [selectedDeleteVisitId, setSelectedDeleteVisitId] = useState<
    string | null
  >(null)

  // Edit Modal State
  const [editingVisit, setEditingVisit] = useState<VisitRecord | null>(null)

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const res = await api.get("/visits/active")
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setVisits(data)
    } catch (error) {
      console.error("Error fetching active visits", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisits()
  }, [])

  const confirmCheckOut = (visit: VisitRecord) => {
    setSelectedVisit(visit)
    setAlertOpen(true)
  }

  const executeCheckOut = async () => {
    if (!selectedVisit) return
    const visitId = selectedVisit.id.toString()
    setCheckoutLoading(visitId)
    try {
      await api.post(`/visits/${visitId}/checkout`)
      toast.success(
        `Visitor ${selectedVisit.visitor?.name || "visitor"} checked out`
      )
      fetchVisits()
    } catch (error: any) {
      console.error("Checkout failed", error)
      toast.error(error.response?.data?.message || "Checkout failed!")
    } finally {
      setCheckoutLoading(null)
      setSelectedVisit(null)
      setAlertOpen(false)
    }
  }

  const confirmDelete = (id: string) => {
    setSelectedDeleteVisitId(id)
    setDeleteAlertOpen(true)
  }

  const executeDelete = async () => {
    if (!selectedDeleteVisitId) return
    try {
      await api.delete(`/visits/${selectedDeleteVisitId}`)
      toast.success("Visit deleted")
      fetchVisits()
    } catch (error: any) {
      console.error("Delete failed", error)
      toast.error(error.response?.data?.message || "Failed to delete visit")
    } finally {
      setDeleteAlertOpen(false)
      setSelectedDeleteVisitId(null)
    }
  }

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getNestedValue = (obj: Record<string, any>, path: string): string => {
    const val = path.split(".").reduce((acc, part) => acc && acc[part], obj)
    return val !== undefined && val !== null ? String(val) : ""
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...visits]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((item) => {
        const name = (item.visitor?.name || "").toLowerCase()
        const company = (
          item.visitor_company ||
          item.visitor?.company ||
          ""
        ).toLowerCase()
        const ticket = (item.ticket_number || "").toLowerCase()
        const legacyNo = (item.legacy_registration_no || "").toLowerCase()
        const location = (
          item.location_name ||
          item.location?.name ||
          ""
        ).toLowerCase()
        const cards = (item.visitor_cards || [])
          .map((c) => (c.card_no || "").toLowerCase())
          .join(" ")

        return (
          name.includes(q) ||
          company.includes(q) ||
          ticket.includes(q) ||
          legacyNo.includes(q) ||
          location.includes(q) ||
          cards.includes(q)
        )
      })
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortConfig.key)
        const bVal = getNestedValue(b, sortConfig.key)

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return result
  }, [visits, search, sortConfig])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSorted.slice(start, start + itemsPerPage)
  }, [filteredAndSorted, currentPage])

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Visitors</h1>
          <p className="text-sm text-zinc-500">
            Monitoring open visits, overdue stays, and rapid check-out operations.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search visitor name, company, or card no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead
                  onClick={() => handleSort("ticket_number")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Ticket No <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Card No</TableHead>
                <TableHead
                  onClick={() => handleSort("visitor.name")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Visitor Name <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("location_name")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Destination <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead
                  onClick={() => handleSort("time_in")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Time In <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Days Open</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-zinc-500"
                  >
                    No active visitors found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((visit) => {
                  const daysOpen =
                    typeof visit.days_open === "number"
                      ? visit.days_open
                      : 0

                  return (
                    <TableRow
                      key={visit.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <TableCell className="font-mono text-zinc-600 dark:text-zinc-400">
                        {visit.ticket_number ||
                          visit.legacy_registration_no ||
                          "-"}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-white">
                        {visit.visitor_cards
                          ?.map((c) => c.card_no)
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </TableCell>
                      <TableCell className="py-2 font-semibold">
                        <span>{visit.visitor?.name}</span> <br />
                        <span className="text-xs font-normal text-zinc-500">
                          {visit.visitor_company ||
                            visit.visitor?.company ||
                            "-"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                        {visit.location_name ||
                          visit.location?.name ||
                          "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-300">
                        {visit.host_name || visit.staff?.name || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-300">
                        {visit.purpose || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {visit.time_in || visit.check_in_at || "-"}
                      </TableCell>
                      <TableCell>
                        {daysOpen > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            {daysOpen} hari ({daysOpen}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Hari ini
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmCheckOut(visit)}
                          disabled={checkoutLoading === visit.id.toString()}
                          className="cursor-pointer"
                        >
                          {checkoutLoading === visit.id.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Check Out"
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate(`/visits/${visit.id}/print`, {
                              state: { visit },
                            })
                          }
                          title="Cetak Pass"
                          className="cursor-pointer"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingVisit(visit)}
                          title="Edit Kunjungan Terbuka"
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {hasPermission("delete_visits") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              confirmDelete(visit.id.toString())
                            }
                            title="Hapus Kunjungan"
                            className="cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Showing{" "}
            {filteredAndSorted.length > 0
              ? (currentPage - 1) * itemsPerPage + 1
              : 0}{" "}
            to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)}{" "}
            of {filteredAndSorted.length} entries
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={
                currentPage === totalPages || totalPages === 0 || loading
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Check Out Confirmation Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will mark visitor{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedVisit?.visitor?.name}
              </strong>{" "}
              as checked out and record their exit time. The assigned visitor cards
              will be released to available status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeCheckOut}>
              Confirm Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kunjungan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Riwayat kunjungan ini akan
              dihapus secara permanen, dan kartu visitor akan dikembalikan ke
              status "available".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Visit Modal */}
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
