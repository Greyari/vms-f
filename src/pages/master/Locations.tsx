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
  Building2,
  Ship,
  Upload,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Download,
} from "lucide-react"
import MasterImportDialog from "@/components/master/MasterImportDialog"
import MasterExportModal from "@/components/master/MasterExportModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"

export interface LocationItem {
  id: string
  name: string
  type: "location" | "repair_vessel" | "tug_boat" | "barge"
  vessel_type?: string | null
  code?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
  is_active: boolean
}

export default function Locations() {
  const { t } = useTranslation()
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const perPage = 100

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null)
  const [form, setForm] = useState({
    name: "",
    type: "location" as LocationItem["type"],
    vessel_type: "",
    code: "",
    call_sign: "",
    flag: "",
    port: "",
    captain: "",
    pic: "",
    is_active: true,
  })

  // Delete Alert Dialog State
  const [deleteTarget, setDeleteTarget] = useState<LocationItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | boolean> = {
        page: currentPage,
        per_page: perPage,
      }
      if (search.trim()) params.search = search.trim()
      if (typeFilter) params.type = typeFilter
      if (activeFilter !== "") params.is_active = activeFilter

      const res = await api.get("/locations", { params })
      const resData = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      setLocations(resData)
      setTotalPages(res.data?.last_page || 1)
      setTotalCount(res.data?.total || resData.length)
    } catch (error) {
      console.error("Gagal memuat data lokasi", error)
      toast.error("Gagal memuat daftar lokasi & kapal.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, typeFilter, activeFilter])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const openCreateModal = () => {
    setEditingItem(null)
    setForm({
      name: "",
      type: "location",
      vessel_type: "",
      code: "",
      call_sign: "",
      flag: "",
      port: "",
      captain: "",
      pic: "",
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEditModal = (item: LocationItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      type: item.type,
      vessel_type: item.vessel_type || "",
      code: item.code || "",
      call_sign: item.call_sign || "",
      flag: item.flag || "",
      port: item.port || "",
      captain: item.captain || "",
      pic: item.pic || "",
      is_active: Boolean(item.is_active),
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Nama lokasi / kapal wajib diisi.")
      return
    }

    const isVessel = form.type !== "location"
    if (isVessel && !form.code.trim()) {
      toast.error('Nomor Kode / IMO wajib diisi untuk kapal (isi "-" jika belum ada IMO).')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        vessel_type: form.vessel_type.trim() || null,
        is_active: form.is_active,
        call_sign: form.call_sign.trim() || null,
        flag: form.flag.trim() || null,
        port: form.port.trim() || null,
        captain: form.captain.trim() || null,
        pic: form.pic.trim() || null,
      }

      const rawCode = form.code.trim()
      if (isVessel) {
        payload.code =
          rawCode === "-"
            ? form.name
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, "_")
                .replace(/^_|_$/g, "")
            : rawCode
      } else if (rawCode && rawCode !== "-") {
        payload.code = rawCode
      }

      if (editingItem) {
        await api.put(`/locations/${editingItem.id}`, payload)
        toast.success(t("locations.toast_updated", "Lokasi / kapal berhasil diperbarui."))
      } else {
        await api.post("/locations", payload)
        toast.success(t("locations.toast_created", "Lokasi / kapal berhasil ditambahkan."))
      }
      setModalOpen(false)
      fetchLocations()
    } catch (error: unknown) {
      console.error("Submit lokasi gagal", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || t("locations.toast_save_failed", "Gagal menyimpan data lokasi."))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/locations/${deleteTarget.id}`)
      toast.success(t("locations.toast_deleted", "Lokasi / kapal berhasil dihapus."))
      setDeleteTarget(null)
      fetchLocations()
    } catch (error: unknown) {
      console.error("Hapus lokasi gagal", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || t("locations.toast_delete_failed", "Gagal menghapus lokasi."))
    } finally {
      setDeleting(false)
    }
  }

  const getTypeLabel = (type: LocationItem["type"]) => {
    switch (type) {
      case "location":
        return t("locations.type_land", "Lokasi Darat")
      case "repair_vessel":
        return "Repair Vessel"
      case "tug_boat":
        return "Tug Boat"
      case "barge":
        return "Barge"
      default:
        return type
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("locations.title", "Master Lokasi & Kapal")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("locations.description", "Kelola lokasi darat galangan, dermaga, serta kapal sandar & perbaikan (IMO, Call Sign, Bendera, Captain, & PIC/Note).")}
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
            <Download className="h-4 w-4 mr-1.5" />
            {t("common.export_excel", "Export Excel")}
          </Button>

          <Button onClick={openCreateModal} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("locations.add_location", "Tambah Lokasi / Kapal")}
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="location-type-filter"
                className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400"
              >
                {t("locations.filter_type", "Filter Tipe")}
              </label>
              <select
                id="location-type-filter"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">{t("locations.filter_all", "Semua Tipe")}</option>
                <option value="location">{t("locations.type_land", "Lokasi Darat")}</option>
                <option value="repair_vessel">Repair Vessel</option>
                <option value="tug_boat">Tug Boat</option>
                <option value="barge">Barge</option>
              </select>
            </div>

            {/* Active Filter */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="location-status-filter"
                className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400"
              >
                {t("common.status", "Status")}
              </label>
              <select
                id="location-status-filter"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">{t("common.filter_all_status", "Semua Status")}</option>
                <option value="1">{t("common.active_only", "Aktif Saja")}</option>
                <option value="0">{t("common.inactive_only", "Nonaktif Saja")}</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchLocations}
              disabled={loading}
              title={t("common.reload", "Muat Ulang")}
              className="cursor-pointer"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t("locations.search_placeholder", "Cari nama kapal, IMO, captain, atau PIC...")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">{t("locations.col_no", "No")}</TableHead>
                <TableHead>{t("locations.col_code_imo", "Kode / IMO")}</TableHead>
                <TableHead>{t("locations.col_description_name", "Description / Nama Lokasi & Kapal")}</TableHead>
                <TableHead>{t("locations.col_type_spec", "Tipe / Spesifikasi")}</TableHead>
                <TableHead>{t("locations.col_call_sign", "Call Sign")}</TableHead>
                <TableHead>{t("locations.col_flag", "Bendera")}</TableHead>
                <TableHead>{t("locations.col_captain", "Captain")}</TableHead>
                <TableHead>{t("locations.col_pic", "Note / PIC")}</TableHead>
                <TableHead>{t("locations.col_status", "Status")}</TableHead>
                <TableHead className="text-right">{t("locations.col_actions", "Aksi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">{t("common.loading", "Memuat data lokasi...")}</span>
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-zinc-500">
                    {t("locations.empty_text", "Tidak ada lokasi atau kapal ditemukan.")}
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((item, index) => {
                  const isPlace = item.type === "location"

                  return (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <TableCell className="text-center font-mono text-xs text-zinc-500">
                        {(currentPage - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {item.code || "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          {isPlace ? (
                            <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <Ship className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 items-start">
                          <Badge variant="outline" className="font-medium text-xs">
                            {getTypeLabel(item.type)}
                          </Badge>
                          {item.vessel_type && (
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              {item.vessel_type}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        {item.call_sign || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 text-xs">
                        {item.flag || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                        {item.captain || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 text-xs">
                        {item.pic || "-"}
                      </TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            {t("common.active", "Aktif")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-zinc-500">
                            {t("common.inactive", "Nonaktif")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title={t("common.edit", "Edit")}
                          aria-label={t("common.edit", "Edit")}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          {t("common.edit", "Edit")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          title={t("common.delete", "Hapus")}
                          aria-label={t("common.delete", "Hapus")}
                          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
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
            {t("locations.pagination_showing", "Menampilkan {{from}} hingga {{to}} dari {{total}} lokasi", {
              from: locations.length > 0 ? (currentPage - 1) * perPage + 1 : 0,
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

      {/* Modal Dialog Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingItem
                  ? t("locations.modal_edit_title", "Edit Lokasi atau Kapal")
                  : t("locations.modal_create_title", "Tambah Lokasi atau Kapal")}
              </DialogTitle>
              <DialogDescription>
                {t("locations.modal_desc", "Masukkan detail lokasi darat atau spesifikasi kapal galangan (IMO, Call Sign, Bendera, Captain, & Note/PIC).")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="location-name-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("locations.field_name_label", "Nama Lokasi / Kapal")} <span className="text-red-500">*</span>
                </label>
                <Input
                  id="location-name-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Misal: Slipway 1, MV Samudera Raya"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="location-type-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_type_label", "Tipe Lokasi")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="location-type-input"
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        type: e.target.value as LocationItem["type"],
                      }))
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="location">{t("locations.type_land", "Lokasi Darat")}</option>
                    <option value="repair_vessel">Repair Vessel</option>
                    <option value="tug_boat">Tug Boat</option>
                    <option value="barge">Barge</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="location-vessel-type-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_vessel_type_label", "Spesifikasi Tipe (Type)")}
                  </label>
                  <Input
                    id="location-vessel-type-input"
                    value={form.vessel_type}
                    onChange={(e) => setForm((p) => ({ ...p, vessel_type: e.target.value }))}
                    placeholder="Misal: OIL PRODUCTS TANKER, BARGE, OFFICE"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location-code-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("locations.field_code_imo_label", "Kode / IMO")} {form.type !== "location" && <span className="text-red-500">*</span>}
                </label>
                <Input
                  id="location-code-input"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder={
                    form.type === "location"
                      ? "Dihasilkan otomatis oleh sistem jika kosong"
                      : 'Nomor IMO (Wajib untuk kapal, isi "-" jika tanpa IMO)'
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="location-callsign-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_callsign_label", "Call Sign")}
                  </label>
                  <Input
                    id="location-callsign-input"
                    value={form.call_sign}
                    onChange={(e) => setForm((p) => ({ ...p, call_sign: e.target.value }))}
                    placeholder="Misal: YBDT, 9V9752"
                  />
                </div>
                <div>
                  <label
                    htmlFor="location-flag-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_flag_label", "Bendera")}
                  </label>
                  <Input
                    id="location-flag-input"
                    value={form.flag}
                    onChange={(e) => setForm((p) => ({ ...p, flag: e.target.value }))}
                    placeholder="Misal: INDONESIA, SINGAPORE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="location-captain-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_captain_label", "Captain / Nakhoda")}
                  </label>
                  <Input
                    id="location-captain-input"
                    value={form.captain}
                    onChange={(e) => setForm((p) => ({ ...p, captain: e.target.value }))}
                    placeholder="Misal: CAPT. SUTRISNO"
                  />
                </div>
                <div>
                  <label
                    htmlFor="location-pic-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    {t("locations.field_pic_label", "Note / PIC")}
                  </label>
                  <Input
                    id="location-pic-input"
                    value={form.pic}
                    onChange={(e) => setForm((p) => ({ ...p, pic: e.target.value }))}
                    placeholder="Misal: ALVI, SYAHRIAL"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location-port-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  {t("locations.field_port_label", "Pelabuhan Asal / Pangkalan")}
                </label>
                <Input
                  id="location-port-input"
                  value={form.port}
                  onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                  placeholder="Misal: Batam, Singapore"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="location-is-active-checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                />
                <label
                  htmlFor="location-is-active-checkbox"
                  className="text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  {t("locations.field_active_checkbox", "Status Aktif (dapat dipilih pada saat check-in tamu)")}
                </label>
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
                    {t("common.saving", "Menyimpan...")}
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
            <AlertDialogTitle>{t("common.confirm_delete_title", "Konfirmasi Hapus")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "locations.delete_confirm_desc",
                "Apakah Anda yakin ingin menghapus lokasi/kapal {{name}}? Tindakan ini tidak dapat dibatalkan jika lokasi pernah digunakan dalam kunjungan aktif.",
                { name: deleteTarget?.name || "" }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel", "Batal")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? t("common.processing", "Menghapus...") : t("common.confirm_delete", "Ya, Hapus")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Master Import Dialog */}
      <MasterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Lokasi & Kapal"
        description="Unggah berkas Excel (.xlsx / .xls / .csv) berisi daftar lokasi darat, dermaga, atau kapal sandar (IMONo, Description, CallSign, NationalityFlag, Type, Captain, Note)."
        templateEndpoint="/locations/template"
        templateFileName="template_locations_vessels.xlsx"
        previewEndpoint="/locations/import-preview"
        importEndpoint="/locations/import"
        columns={MASTER_ENTITIES.locations.importColumns}
        onSuccess={fetchLocations}
      />

      {/* Master Export Modal with Columns, Presets, Scope & Live Count */}
      <MasterExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        entityConfig={MASTER_ENTITIES.locations}
        currentFilters={{
          search,
          type: typeFilter,
        }}
      />
    </div>
  )
}
