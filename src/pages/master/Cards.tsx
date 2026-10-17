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
  CreditCard,
  FileDown,
  Upload,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import MasterImportDialog from "@/components/master/MasterImportDialog"
import MasterExportModal from "@/components/master/MasterExportModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"

export interface CardItem {
  id: number | string
  card_no: string
  id_card_no?: string | null
  name?: string | null
  date_issued?: string | null
  card_type?: "visitor" | "vehicle"
  status: "available" | "in_use" | "lost" | "damaged"
  created_at?: string
  updated_at?: string
}

function formatDateIssued(dateStr?: string | null) {
  if (!dateStr) return "-"
  const clean = dateStr.slice(0, 10)
  const parts = clean.split("-")
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

export default function Cards() {
  const [cards, setCards] = useState<CardItem[]>([])
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
  const [editingCard, setEditingCard] = useState<CardItem | null>(null)
  const [formCardNo, setFormCardNo] = useState("")
  const [formIdCardNo, setFormIdCardNo] = useState("")
  const [formName, setFormName] = useState("")
  const [formDateIssued, setFormDateIssued] = useState("")
  const [formStatus, setFormStatus] = useState<"available" | "lost" | "damaged">("available")

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<CardItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
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
      console.error("Gagal memuat kartu visitor", error)
      toast.error("Gagal memuat daftar kartu visitor.")
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
    setFormCardNo("")
    setFormIdCardNo("")
    setFormName("VISITOR GREEN")
    setFormDateIssued(new Date().toISOString().slice(0, 10))
    setFormStatus("available")
    setModalOpen(true)
  }

  const openEditModal = (card: CardItem) => {
    setEditingCard(card)
    setFormCardNo(card.card_no || "")
    setFormIdCardNo(card.id_card_no || "")
    setFormName(card.name || "")
    setFormDateIssued(card.date_issued ? String(card.date_issued).slice(0, 10) : "")
    setFormStatus(card.status === "in_use" ? "available" : (card.status || "available"))
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCardNo.trim()) {
      toast.error("Nomor kartu wajib diisi.")
      return
    }

    setSubmitting(true)
    try {
      let cardType = "visitor"
      if (formName.trim()) {
        const lower = formName.toLowerCase()
        if (lower.includes("green")) cardType = "visitor_green"
        else if (lower.includes("white")) cardType = "visitor_white"
        else if (lower.includes("crew")) cardType = "crew"
        else if (lower.includes("temp")) cardType = "temporary_worker"
        else if (lower.includes("special")) cardType = "special"
      }

      const payload: Record<string, unknown> = {
        card_no: formCardNo.trim(),
        id_card_no: formIdCardNo.trim() || null,
        name: formName.trim() || null,
        date_issued: formDateIssued || null,
        card_type: cardType,
      }

      if (editingCard) {
        if (editingCard.status !== "in_use") {
          payload.status = formStatus
        }
        await api.put(`/cards/${editingCard.id}`, payload)
        toast.success("Kartu visitor berhasil diperbarui.")
      } else {
        payload.status = formStatus
        await api.post("/cards", payload)
        toast.success("Kartu visitor baru berhasil ditambahkan.")
      }
      setModalOpen(false)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menyimpan kartu", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menyimpan kartu.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.status === "in_use") {
      toast.error("Kartu sedang digunakan dan tidak dapat dihapus.")
      setDeleteTarget(null)
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/cards/${deleteTarget.id}`)
      toast.success("Kartu visitor berhasil dihapus.")
      setDeleteTarget(null)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menghapus kartu", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menghapus kartu.")
    } finally {
      setDeleting(false)
    }
  }



  const getStatusBadge = (status: CardItem["status"]) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            Available
          </Badge>
        )
      case "in_use":
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
            In Use
          </Badge>
        )
      case "lost":
        return (
          <Badge variant="destructive" className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-300 dark:border-red-800">
            Lost
          </Badge>
        )
      case "damaged":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            Damaged
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
          <h1 className="text-2xl font-bold tracking-tight">Master Kartu Visitor</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kelola inventaris kartu fisik tamu. Status kartu dikelola otomatis oleh sistem saat
            check-in dan check-out.
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
            onClick={() => setExportOpen(true)}
            className="cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Export Excel
          </Button>

          <Button onClick={openCreateModal} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Kartu
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleApplyFilter} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="cards-search-input"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Pencarian
              </label>
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="cards-search-input"
                  placeholder="Cari nomor kartu, ID card, atau nama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-40">
              <label
                htmlFor="cards-status-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Status Kartu
              </label>
              <select
                id="cards-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Semua Status</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div className="w-36">
              <label
                htmlFor="cards-from-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Nomor Awal
              </label>
              <Input
                id="cards-from-filter"
                placeholder="Misal: VIS-001"
                value={cardNoFrom}
                onChange={(e) => setCardNoFrom(e.target.value)}
              />
            </div>

            <div className="w-36">
              <label
                htmlFor="cards-to-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Nomor Akhir
              </label>
              <Input
                id="cards-to-filter"
                placeholder="Misal: VIS-100"
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
                <TableHead className="w-12 text-center">NO</TableHead>
                <TableHead>CARD NO</TableHead>
                <TableHead>ID CARD NO</TableHead>
                <TableHead>NAME</TableHead>
                <TableHead>DATE ISSUED (TK)</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">Memuat data kartu...</span>
                  </TableCell>
                </TableRow>
              ) : cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                    Tidak ada kartu visitor ditemukan.
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
                        <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span>{card.card_no}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                        {card.id_card_no || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                        {card.name || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDateIssued(card.date_issued)}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(card)}
                          title="Edit Kartu"
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
                              ? "Kartu sedang digunakan dan tidak dapat dihapus."
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
                {editingCard ? "Edit Kartu Visitor" : "Tambah Kartu Visitor"}
              </DialogTitle>
              <DialogDescription>
                {editingCard
                  ? "Perbarui informasi dan status fisik kartu visitor."
                  : "Masukkan rincian kartu fisik visitor baru."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="cards-cardno-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  CARD NO (Nomor Kartu) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="cards-cardno-input"
                  value={formCardNo}
                  onChange={(e) => setFormCardNo(e.target.value)}
                  placeholder="Misal: ASL-2301"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="cards-idcardno-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  ID CARD NO
                </label>
                <Input
                  id="cards-idcardno-input"
                  value={formIdCardNo}
                  onChange={(e) => setFormIdCardNo(e.target.value)}
                  placeholder="Misal: 0005890502"
                />
              </div>

              <div>
                <label
                  htmlFor="cards-name-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  NAME (Nama Kartu)
                </label>
                <Input
                  id="cards-name-input"
                  list="card-names-suggestions"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: VISITOR GREEN atau VISITOR WHITE"
                />
                <datalist id="card-names-suggestions">
                  <option value="VISITOR GREEN" />
                  <option value="VISITOR WHITE" />
                  <option value="CREW" />
                  <option value="TEMPORARY WORKER" />
                  <option value="SPECIAL" />
                </datalist>
              </div>

              <div>
                <label
                  htmlFor="cards-dateissued-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  DATE ISSUED (TK)
                </label>
                <Input
                  id="cards-dateissued-input"
                  type="date"
                  value={formDateIssued}
                  onChange={(e) => setFormDateIssued(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="cards-status-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  STATUS
                </label>
                {editingCard && editingCard.status === "in_use" ? (
                  <div className="space-y-1">
                    <Input
                      id="cards-status-input"
                      value="In Use (Sedang Digunakan)"
                      disabled
                      className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Status In Use dikelola otomatis oleh check-in / check-out kunjungan.
                    </p>
                  </div>
                ) : (
                  <select
                    id="cards-status-input"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "available" | "lost" | "damaged")}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="available">Available (Tersedia)</option>
                    <option value="lost">Lost (Hilang)</option>
                    <option value="damaged">Damaged (Rusak)</option>
                  </select>
                )}
              </div>
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
            <AlertDialogTitle>Konfirmasi Hapus Kartu</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kartu visitor{" "}
              <strong>{deleteTarget?.card_no}</strong>? Kartu yang telah dihapus tidak dapat
              digunakan lagi untuk check-in.
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
        title="Import Kartu Visitor"
        description="Unggah berkas Excel (.xlsx / .xls / .csv) berisi daftar nomor kartu fisik visitor."
        templateEndpoint="/cards/template"
        templateFileName="template_cards.xlsx"
        previewEndpoint="/cards/import-preview"
        importEndpoint="/cards/import"
        columns={[
          { key: "card_no", label: "CARD NO" },
          { key: "id_card_no", label: "ID CARD NO" },
          { key: "name", label: "NAME" },
          { key: "date_issued", label: "DATE ISSUED (TK)" },
          { key: "status", label: "STATUS" },
        ]}
        onSuccess={fetchCards}
      />

      {/* Master Export Modal with Columns, Presets, Scope & Live Count */}
      <MasterExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        entityConfig={MASTER_ENTITIES.cards}
        currentFilters={{
          search,
          status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
          card_no_from: cardNoFrom,
          card_no_to: cardNoTo,
        }}
      />
    </div>
  )
}
