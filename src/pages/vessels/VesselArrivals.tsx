import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"

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
  Plus,
  Pencil,
  Trash2,
  Ship,
  Eye,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Users,
} from "lucide-react"
import VesselArrivalFormModal from "@/components/vessels/VesselArrivalFormModal"
import VesselArrivalDetailModal from "@/components/vessels/VesselArrivalDetailModal"
import SignOutVesselModal from "@/components/vessels/SignOutVesselModal"

export interface VesselArrivalItem {
  id: string
  location_id: string
  vessel_name: string
  sign_in_date: string
  sign_out_date?: string | null
  sign_in_port?: string | null
  sign_out_port?: string | null
  captain?: string | null
  local_agent_company?: string | null
  local_agent_name?: string | null
  local_agent_phone?: string | null
  local_agent_location?: string | null
  foreign_agent_company?: string | null
  foreign_agent_name?: string | null
  foreign_agent_phone?: string | null
  foreign_agent_location?: string | null
  crew_count?: number
  checked_in_crew_count?: number
  crew?: Array<{
    id: string
    name?: string
    visitor_no?: string
    id_number?: string
    occupation?: string
  }>
  vessel?: {
    id: string
    name: string
    code?: string | null
    type: string
    vessel_type?: string | null
    captain?: string | null
    pic?: string | null
  } | null
}

const ITEMS_PER_PAGE = 10

export default function VesselArrivals() {
  const [arrivals, setArrivals] = useState<VesselArrivalItem[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [stayStatusFilter, setStayStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<VesselArrivalItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form Modal State (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedArrivalForEdit, setSelectedArrivalForEdit] = useState<VesselArrivalItem | null>(null)

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedArrivalIdForDetail, setSelectedArrivalIdForDetail] = useState<string | null>(null)

  // Sign Out Modal State
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [selectedArrivalForSignOut, setSelectedArrivalForSignOut] = useState<VesselArrivalItem | null>(null)

  const fetchArrivals = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      }

      if (search.trim()) {
        params.vessel_name = search.trim()
      }

      if (stayStatusFilter && stayStatusFilter !== "all") {
        params.stay_status = stayStatusFilter
      }

      if (dateFrom) {
        params.date_from = dateFrom
      }

      if (dateTo) {
        params.date_to = dateTo
      }

      const res = await api.get("/vessel-arrivals", { params })
      const rawList = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? [])

      setArrivals(rawList)
      setTotalPages(res.data?.last_page || 1)
      setTotalItems(res.data?.total || rawList.length)
    } catch {
      toast.error("Gagal memuat data kedatangan kapal")
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, stayStatusFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchArrivals()
  }, [fetchArrivals])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchArrivals()
  }

  const handleResetFilters = () => {
    setSearch("")
    setStayStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  const handleDeleteClick = (arrival: VesselArrivalItem) => {
    setItemToDelete(arrival)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/vessel-arrivals/${itemToDelete.id}`)
      toast.success("Data kedatangan kapal berhasil dihapus")
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      fetchArrivals()
    } catch {
      toast.error("Gagal menghapus data kedatangan kapal")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Kedatangan Kapal & Kru
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Pencatatan sandar kapal galangan, rute pelabuhan, keagenan, dan manifest kru kapal.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedArrivalForEdit(null)
            setFormModalOpen(true)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Catat Kedatangan Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kapal..."
              className="pl-9"
            />
          </div>

          <div>
            <label htmlFor="stay-status-filter" className="sr-only">
              Filter Status Sandar
            </label>
            <select
              id="stay-status-filter"
              aria-label="Filter status sandar"
              value={stayStatusFilter}
              onChange={(e) => {
                setStayStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status Sandar</option>
              <option value="not_out">Sedang Sandar</option>
              <option value="out">Sudah Berangkat</option>
            </select>
          </div>

          <div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Tanggal masuk dari"
              placeholder="Dari Tanggal"
            />
          </div>

          <div>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setCurrentPage(1)
              }}
              aria-label="Tanggal masuk sampai"
              placeholder="Sampai Tanggal"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="default" className="flex-1">
              Cari
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              title="Reset Filter"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Tabel Kedatangan Kapal */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Kapal & Kode IMO</TableHead>
                <TableHead>Kedatangan (Sign-In)</TableHead>
                <TableHead>Keberangkatan (Sign-Out)</TableHead>
                <TableHead>Nakhoda / Captain</TableHead>
                <TableHead className="text-center">Kru Sandar</TableHead>
                <TableHead>Agen</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memuat data kedatangan kapal...
                    </div>
                  </TableCell>
                </TableRow>
              ) : arrivals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                    Tidak ada data kedatangan kapal yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                arrivals.map((arrival, index) => {
                  const isInPort = !arrival.sign_out_date
                  return (
                    <TableRow key={arrival.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50">
                      <TableCell className="text-center font-medium text-zinc-500 text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Ship className="h-4 w-4 text-blue-500 shrink-0" />
                          {arrival.vessel_name}
                        </div>
                        {arrival.vessel?.code && (
                          <Badge variant="outline" className="mt-1 font-mono text-xs">
                            {arrival.vessel.code}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{arrival.sign_in_date}</div>
                        <div className="text-xs text-zinc-500">
                          {arrival.sign_in_port ? `Dari: ${arrival.sign_in_port}` : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isInPort ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                            Sedang Sandar
                          </Badge>
                        ) : (
                          <div>
                            <Badge variant="secondary" className="mb-1">
                              Sudah Berangkat
                            </Badge>
                            <div className="text-sm font-medium">{arrival.sign_out_date}</div>
                            <div className="text-xs text-zinc-500">
                              {arrival.sign_out_port ? `Ke: ${arrival.sign_out_port}` : "-"}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">
                        {arrival.captain || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="flex items-center gap-1 mx-auto w-fit text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            <Users className="h-3 w-3" />
                            {arrival.crew_count ?? 0} Kru
                          </Badge>
                          {typeof arrival.checked_in_crew_count === "number" && (arrival.crew_count ?? 0) > 0 && (
                            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              {arrival.checked_in_crew_count} Check-In
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                        <div>{arrival.local_agent_company || "-"}</div>
                        {arrival.foreign_agent_company && (
                          <div className="text-zinc-400">{arrival.foreign_agent_company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Lihat Detail Sandar"
                            onClick={() => {
                              setSelectedArrivalIdForDetail(arrival.id)
                              setDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Kedatangan Kapal"
                            onClick={() => {
                              setSelectedArrivalForEdit(arrival)
                              setFormModalOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4 text-blue-600 hover:text-blue-800 dark:text-blue-400" />
                          </Button>
                          {isInPort && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sign-Out Keberangkatan"
                              onClick={() => {
                                setSelectedArrivalForSignOut(arrival)
                                setSignOutModalOpen(true)
                              }}
                            >
                              <LogOut className="h-4 w-4 text-amber-600 hover:text-amber-800 dark:text-amber-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus"
                            onClick={() => handleDeleteClick(arrival)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginasi */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>
            Total <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalItems}</span> transaksi kedatangan kapal
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Kedatangan Kapal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data transaksi kedatangan kapal{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">{itemToDelete?.vessel_name}</strong>? Tindakan ini akan menghapus data sandar dan melepaskan seluruh manifest kru terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Modal (Create / Edit) */}
      <VesselArrivalFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchArrivals}
        arrivalToEdit={selectedArrivalForEdit}
      />

      {/* Detail Modal */}
      <VesselArrivalDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        arrivalId={selectedArrivalIdForDetail}
        onUpdated={fetchArrivals}
      />

      {/* Sign-Out Quick Modal */}
      <SignOutVesselModal
        open={signOutModalOpen}
        onClose={() => setSignOutModalOpen(false)}
        onSuccess={fetchArrivals}
        arrival={selectedArrivalForSignOut}
      />
    </div>
  )
}
