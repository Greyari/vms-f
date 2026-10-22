import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
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
  note?: string | null
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
  const { t } = useTranslation()
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
  const perPage = 100

  // Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingCard, setEditingCard] = useState<CardItem | null>(null)
  const [formCardNo, setFormCardNo] = useState("")
  const [formIdCardNo, setFormIdCardNo] = useState("")
  const [formName, setFormName] = useState("")
  const [formDateIssued, setFormDateIssued] = useState("")
  const [formStatus, setFormStatus] = useState<"available" | "lost" | "damaged">("available")
  const [formNote, setFormNote] = useState("")

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
      toast.error(t("cards.toast_load_failed", "Gagal memuat daftar kartu visitor."))
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter, cardNoFrom, cardNoTo, t])

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
    setFormNote("")
    setModalOpen(true)
  }

  const openEditModal = (card: CardItem) => {
    setEditingCard(card)
    setFormCardNo(card.card_no || "")
    setFormIdCardNo(card.id_card_no || "")
    setFormName(card.name || "")
    setFormDateIssued(card.date_issued ? String(card.date_issued).slice(0, 10) : "")
    setFormStatus(card.status === "in_use" ? "available" : (card.status || "available"))
    setFormNote(card.note || "")
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCardNo.trim()) {
      toast.error(t("cards.toast_card_no_required", "Nomor kartu wajib diisi."))
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
        note: formNote.trim() || null,
      }

      if (editingCard) {
        if (editingCard.status !== "in_use") {
          payload.status = formStatus
        }
        await api.put(`/cards/${editingCard.id}`, payload)
        toast.success(t("cards.toast_updated", "Kartu visitor berhasil diperbarui."))
      } else {
        payload.status = formStatus
        await api.post("/cards", payload)
        toast.success(t("cards.toast_created", "Kartu visitor baru berhasil ditambahkan."))
      }
      setModalOpen(false)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menyimpan kartu", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || t("cards.toast_save_failed", "Gagal menyimpan kartu."))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.status === "in_use") {
      toast.error(t("cards.toast_delete_in_use", "Kartu sedang digunakan dan tidak dapat dihapus."))
      setDeleteTarget(null)
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/cards/${deleteTarget.id}`)
      toast.success(t("cards.toast_deleted", "Kartu visitor berhasil dihapus."))
      setDeleteTarget(null)
      fetchCards()
    } catch (error: unknown) {
      console.error("Gagal menghapus kartu", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || t("cards.toast_delete_failed", "Gagal menghapus kartu."))
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: CardItem["status"]) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            {t("cards.status_available", "Available")}
          </Badge>
        )
      case "in_use":
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
            {t("cards.status_in_use", "In Use")}
          </Badge>
        )
      case "lost":
        return (
          <Badge variant="destructive" className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-300 dark:border-red-800">
            {t("cards.status_lost", "Lost")}
          </Badge>
        )
      case "damaged":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            {t("cards.status_damaged", "Damaged")}
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
          <h1 className="text-2xl font-bold tracking-tight">{t("cards.title", "Master Kartu Visitor")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("cards.subtitle", "Kelola inventaris kartu fisik tamu. Status kartu dikelola otomatis oleh sistem saat check-in dan check-out.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {t("common.import_excel", "Import Excel")}
          </Button>

          <Button
            variant="outline"
            onClick={() => setExportOpen(true)}
            className="cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {t("common.export_excel", "Export Excel")}
          </Button>

          <Button onClick={openCreateModal} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("cards.add_card", "Tambah Kartu")}
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
                {t("common.search", "Pencarian")}
              </label>
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="cards-search-input"
                  placeholder={t("cards.search_placeholder", "Cari nomor kartu, ID card, atau nama...")}
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
                {t("cards.field_status", "Status Kartu")}
              </label>
              <select
                id="cards-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">{t("common.all_status", "Semua Status")}</option>
                <option value="available">{t("cards.status_available", "Available")}</option>
                <option value="in_use">{t("cards.status_in_use", "In Use")}</option>
                <option value="lost">{t("cards.status_lost", "Lost")}</option>
                <option value="damaged">{t("cards.status_damaged", "Damaged")}</option>
              </select>
            </div>

            <div className="w-36">
              <label
                htmlFor="cards-from-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                {t("cards.number_from", "Nomor Awal")}
              </label>
              <Input
                id="cards-from-filter"
                placeholder={t("cards.number_from_placeholder", "Misal: VIS-001")}
                value={cardNoFrom}
                onChange={(e) => setCardNoFrom(e.target.value)}
              />
            </div>

            <div className="w-36">
              <label
                htmlFor="cards-to-filter"
                className="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1"
              >
                {t("cards.number_to", "Nomor Akhir")}
              </label>
              <Input
                id="cards-to-filter"
                placeholder={t("cards.number_to_placeholder", "Misal: VIS-100")}
                value={cardNoTo}
                onChange={(e) => setCardNoTo(e.target.value)}
              />
            </div>

            <Button type="submit" variant="secondary" className="cursor-pointer">
              {t("common.apply_filter", "Terapkan Filter")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchCards}
              disabled={loading}
              title={t("common.refresh", "Muat Ulang")}
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
                <TableHead className="w-12 text-center">{t("cards.col_no", "NO")}</TableHead>
                <TableHead>{t("cards.col_card_no", "CARD NO")}</TableHead>
                <TableHead>{t("cards.col_id_card_no", "ID CARD NO")}</TableHead>
                <TableHead>{t("cards.col_name", "NAME")}</TableHead>
                <TableHead>{t("cards.col_date_issued", "DATE ISSUED (TK)")}</TableHead>
                <TableHead>{t("cards.col_status", "STATUS")}</TableHead>
                <TableHead>{t("cards.col_notes", "CATATAN")}</TableHead>
                <TableHead className="text-right">{t("cards.col_actions", "AKSI")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">{t("cards.loading_cards", "Memuat data kartu...")}</span>
                  </TableCell>
                </TableRow>
              ) : cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-zinc-500">
                    {t("cards.empty_text", "Tidak ada kartu visitor ditemukan.")}
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
                      <TableCell className="max-w-[200px] text-xs text-zinc-600 dark:text-zinc-400">
                        {card.note ? (
                          <span className="truncate block font-normal" title={card.note}>
                            {card.note}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">-</span>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(card)}
                          title={t("cards.edit_card", "Edit Kartu")}
                          aria-label="Edit"
                          className="cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          {t("common.edit", "Edit")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(card)}
                          disabled={isInUse}
                          title={
                            isInUse
                              ? t("cards.delete_disabled_in_use", "Kartu sedang digunakan dan tidak dapat dihapus.")
                              : t("cards.delete_card_title", "Hapus Kartu")
                          }
                          aria-label="Hapus"
                          className={`cursor-pointer ${
                            isInUse
                              ? "opacity-40 cursor-not-allowed"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          {t("common.delete", "Hapus")}
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
            {t("cards.pagination_showing", {
              from: cards.length > 0 ? (currentPage - 1) * perPage + 1 : 0,
              to: Math.min(currentPage * perPage, totalCount),
              total: totalCount,
            })}
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
        <DialogContent className="sm:max-w-xl md:max-w-2xl w-[94vw]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? t("cards.edit_card", "Edit Kartu Visitor") : t("cards.add_card_modal_title", "Tambah Kartu Visitor")}
              </DialogTitle>
              <DialogDescription>
                {editingCard
                  ? t("cards.edit_desc", "Perbarui informasi, catatan, dan status fisik kartu visitor.")
                  : t("cards.add_desc", "Masukkan rincian kartu fisik visitor baru.")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="cards-cardno-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("cards.field_card_no_label", "CARD NO (Nomor Kartu)")} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="cards-cardno-input"
                  value={formCardNo}
                  onChange={(e) => setFormCardNo(e.target.value)}
                  placeholder={t("cards.number_from_placeholder", "Misal: ASL-2301")}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="cards-idcardno-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("cards.field_id_card_no", "ID CARD NO")}
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
                  {t("cards.field_name_label", "NAME (Nama Kartu)")}
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
                  {t("cards.field_date_issued_label", "DATE ISSUED (TK)")}
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
                  {t("cards.col_status", "STATUS")}
                </label>
                {editingCard && editingCard.status === "in_use" ? (
                  <div className="space-y-1">
                    <Input
                      id="cards-status-input"
                      value={t("cards.status_in_use_text", "In Use (Sedang Digunakan)")}
                      disabled
                      className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-zinc-500">
                      {t("cards.status_in_use_note", "Status In Use dikelola otomatis oleh check-in / check-out kunjungan.")}
                    </p>
                  </div>
                ) : (
                  <select
                    id="cards-status-input"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "available" | "lost" | "damaged")}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="available">{t("cards.opt_available", "Available (Tersedia)")}</option>
                    <option value="lost">{t("cards.opt_lost", "Lost (Hilang)")}</option>
                    <option value="damaged">{t("cards.opt_damaged", "Damaged (Rusak)")}</option>
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="cards-note-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("cards.field_notes", "CATATAN / KETERANGAN")}
                  {formStatus === "lost" && (
                    <span className="ml-1 text-amber-600 font-normal">
                      {t("cards.lost_hint", "(Disarankan: catat siapa yang menghilangkan, tanggal, atau kronologi)")}
                    </span>
                  )}
                  {formStatus === "damaged" && (
                    <span className="ml-1 text-rose-600 font-normal">
                      {t("cards.damaged_hint", "(Disarankan: catat rincian kerusakan kartu fisik)")}
                    </span>
                  )}
                </label>
                <Input
                  id="cards-note-input"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder={
                    formStatus === "lost"
                      ? t("cards.note_lost_placeholder", "Contoh: Hilang oleh tamu PT ABC di Dermaga 2 pada 19/10/2026...")
                      : formStatus === "damaged"
                      ? t("cards.note_damaged_placeholder", "Contoh: Chip RFID patah / kartu retak tidak terbaca reader...")
                      : t("cards.note_default_placeholder", "Catatan atau keterangan kartu (opsional)...")
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                {t("common.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    {t("common.processing", "Menyimpan...")}
                  </>
                ) : (
                  t("common.save", "Simpan")
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
            <AlertDialogTitle>{t("cards.confirm_delete_title", "Konfirmasi Hapus Kartu")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cards.confirm_delete_desc_full", { card_no: deleteTarget?.card_no || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel", "Batal")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? t("common.deleting", "Menghapus...") : t("common.yes_delete", "Ya, Hapus")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Master Import Dialog */}
      <MasterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title={t("cards.import_title", "Import Kartu Visitor")}
        description={t("cards.import_desc", "Unggah berkas Excel (.xlsx / .xls / .csv) berisi daftar nomor kartu fisik visitor.")}
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
