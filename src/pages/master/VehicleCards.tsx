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
  Plus,
  Pencil,
  Trash2,
  Car,
  FileDown,
  Upload,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import MasterImportDialog, {
  type ImportColumnDef,
} from "@/components/master/MasterImportDialog"

export interface VehicleCardItem {
  id: number | string
  card_no: string
  card_type: "vehicle"
  status: "available" | "in_use" | "lost"
  created_at?: string
  updated_at?: string
}

export default function VehicleCards() {
  const [cards, setCards] = useState<VehicleCardItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [cardNoFrom, setCardNoFrom] = useState("")
  const [cardNoTo, setCardNoTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const perPage = 15

  // Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingCard, setEditingCard] = useState<VehicleCardItem | null>(null)
  const [cardNo, setCardNo] = useState("")

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<VehicleCardItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        card_type: "vehicle",
        page: currentPage,
        per_page: perPage,
      }
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      if (cardNoFrom.trim()) params.card_no_from = cardNoFrom.trim()
      if (cardNoTo.trim()) params.card_no_to = cardNoTo.trim()

      const res = await api.get("/cards", { params })
      const resData = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      setCards(resData)
      setTotalPages(res.data?.last_page || 1)
      setTotalCount(res.data?.total || resData.length)
    } catch (error) {
      console.error("Gagal memuat kartu kendaraan", error)
      toast.error("Gagal memuat daftar kartu kendaraan.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter, cardNoFrom, cardNoTo])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchCards()
  }

  const openCreateModal = () => {
    setEditingCard(null)
    setCardNo("")
    setModalOpen(true)
  }

  const openEditModal = (card: VehicleCardItem) => {
    setEditingCard(card)
    setCardNo(card.card_no)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardNo.trim()) {
      toast.error("Nomor kartu kendaraan wajib diisi.")
      return
    }

    setSubmitting(true)
    try {
      if (editingCard) {
        await api.put(`/cards/${editingCard.id}`, { card_no: cardNo.trim() })
        toast.success("Nomor kartu kendaraan berhasil diperbarui.")
      } else {
        await api.post("/cards", {
          card_no: cardNo.trim(),
          card_type: "vehicle",
        })
        toast.success("Kartu kendaraan baru berhasil ditambahkan.")
      }
      setModalOpen(false)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menyimpan kartu kendaraan", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menyimpan kartu kendaraan.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.status === "in_use") {
      toast.error("Kartu kendaraan sedang digunakan dan tidak dapat dihapus.")
      setDeleteTarget(null)
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/cards/${deleteTarget.id}`)
      toast.success("Kartu kendaraan berhasil dihapus.")
      setDeleteTarget(null)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menghapus kartu", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menghapus kartu kendaraan.")
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get("/cards/export", {
        params: { card_type: "vehicle" },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `cards-vehicle-${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Ekspor data kartu kendaraan berhasil diunduh.")
    } catch (error) {
      console.error("Ekspor kartu kendaraan gagal", error)
      toast.error("Gagal mengekspor data kartu kendaraan.")
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: VehicleCardItem["status"]) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            Available
          </Badge>
        )
      case "in_use":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            In Use
          </Badge>
        )
      case "lost":
        return (
          <Badge variant="destructive" className="font-medium text-xs">
            Lost
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Kartu Kendaraan</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kelola kartu pass kendaraan (mobil, truk, motor) di area galangan shipyard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import Excel
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1.5" />
            )}
            Export Excel
          </Button>

          <Button onClick={openCreateModal} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Kartu Kendaraan
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="vehicle-cards-search-input"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Pencarian
              </label>
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="vehicle-cards-search-input"
                  placeholder="Cari nomor kartu kendaraan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-40">
              <label
                htmlFor="vehicle-cards-status-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Status Kartu
              </label>
              <select
                id="vehicle-cards-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Semua Status</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="w-36">
              <label
                htmlFor="vehicle-cards-from-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Nomor Awal
              </label>
              <Input
                id="vehicle-cards-from-filter"
                placeholder="Misal: VEH-001"
                value={cardNoFrom}
                onChange={(e) => setCardNoFrom(e.target.value)}
              />
            </div>

            <div className="w-36">
              <label
                htmlFor="vehicle-cards-to-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Nomor Akhir
              </label>
              <Input
                id="vehicle-cards-to-filter"
                placeholder="Misal: VEH-100"
                value={cardNoTo}
                onChange={(e) => setCardNoTo(e.target.value)}
              />
            </div>

            <Button type="submit" variant="secondary" className="cursor-pointer">
              Terapkan Filter
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchCards}
              disabled={loading}
              title="Muat Ulang"
              className="cursor-pointer"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </form>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nomor Kartu Kendaraan</TableHead>
                <TableHead>Tipe Kartu</TableHead>
                <TableHead>Status Operasional</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">Memuat data kartu kendaraan...</span>
                  </TableCell>
                </TableRow>
              ) : cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                    Tidak ada kartu kendaraan ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((card, index) => {
                  const isInUse = card.status === "in_use"

                  return (
                    <TableRow
                      key={card.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <TableCell className="text-center font-mono text-xs text-zinc-500">
                        {(currentPage - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Car className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span>{card.card_no}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs uppercase">
                          Vehicle
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(card)}
                          title="Edit Nomor Kartu"
                          aria-label="Edit"
                          className="cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(card)}
                          disabled={isInUse}
                          title={
                            isInUse
                              ? "Kartu kendaraan sedang digunakan dan tidak dapat dihapus."
                              : "Hapus Kartu"
                          }
                          aria-label="Hapus"
                          className={`cursor-pointer ${
                            isInUse
                              ? "opacity-40 cursor-not-allowed"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Hapus
                        </Button>
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
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Menampilkan {cards.length > 0 ? (currentPage - 1) * perPage + 1 : 0} hingga{" "}
            {Math.min(currentPage * perPage, totalCount)} dari {totalCount} kartu
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
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Dialog Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? "Edit Kartu Kendaraan" : "Tambah Kartu Kendaraan"}
              </DialogTitle>
              <DialogDescription>
                {editingCard
                  ? "Ubah nomor fisik kartu kendaraan."
                  : "Masukkan nomor kartu pass kendaraan baru. Status awal otomatis diset Available oleh sistem."}
              </DialogDescription>
            </DialogHeader>

            <div>
              <label
                htmlFor="vehicle-cards-cardno-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Nomor Kartu Kendaraan <span className="text-red-500">*</span>
              </label>
              <Input
                id="vehicle-cards-cardno-input"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                placeholder="Misal: VEH-001"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Kartu Kendaraan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kartu kendaraan{" "}
              <strong>{deleteTarget?.card_no}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Master Import Dialog */}
      <MasterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Kartu Kendaraan"
        description="Unggah berkas Excel (.xlsx / .csv) berisi nomor kartu fisik kendaraan."
        templateEndpoint="/vehicle-cards/template"
        templateFileName="template_vehicle_cards.xlsx"
        previewEndpoint="/vehicle-cards/import-preview"
        importEndpoint="/vehicle-cards/import"
        columns={[
          { key: "card_no", label: "Nomor Kartu Kendaraan" },
          { key: "status", label: "Status" },
        ]}
        onSuccess={fetchCards}
      />
    </div>
  )
}
