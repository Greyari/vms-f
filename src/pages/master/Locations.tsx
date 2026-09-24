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
  Building2,
  Ship,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react"

export interface LocationItem {
  id: string
  name: string
  type: "location" | "repair_vessel" | "tug_boat" | "barge"
  code?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  is_active: boolean
}

export default function Locations() {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const perPage = 15

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null)
  const [form, setForm] = useState({
    name: "",
    type: "location" as LocationItem["type"],
    code: "",
    call_sign: "",
    flag: "",
    port: "",
    is_active: true,
  })

  // Delete Alert Dialog State
  const [deleteTarget, setDeleteTarget] = useState<LocationItem | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      code: "",
      call_sign: "",
      flag: "",
      port: "",
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEditModal = (item: LocationItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      type: item.type,
      code: item.code || "",
      call_sign: item.call_sign || "",
      flag: item.flag || "",
      port: item.port || "",
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
      toast.error("Nomor Kode / IMO wajib diisi untuk kapal.")
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        is_active: form.is_active,
        call_sign: form.call_sign.trim() || null,
        flag: form.flag.trim() || null,
        port: form.port.trim() || null,
      }

      if (isVessel || form.code.trim()) {
        payload.code = form.code.trim()
      }

      if (editingItem) {
        await api.put(`/locations/${editingItem.id}`, payload)
        toast.success("Lokasi / kapal berhasil diperbarui.")
      } else {
        await api.post("/locations", payload)
        toast.success("Lokasi / kapal berhasil ditambahkan.")
      }
      setModalOpen(false)
      fetchLocations()
    } catch (error: unknown) {
      console.error("Submit lokasi gagal", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menyimpan data lokasi.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/locations/${deleteTarget.id}`)
      toast.success("Lokasi / kapal berhasil dihapus.")
      setDeleteTarget(null)
      fetchLocations()
    } catch (error: unknown) {
      console.error("Hapus lokasi gagal", error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      toast.error(maybeAxios.response?.data?.message || "Gagal menghapus lokasi.")
    } finally {
      setDeleting(false)
    }
  }

  const getTypeLabel = (type: LocationItem["type"]) => {
    switch (type) {
      case "location":
        return "Lokasi Darat"
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
          <h1 className="text-2xl font-bold tracking-tight">Master Lokasi & Kapal</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kelola lokasi darat galangan, dermaga, serta kapal sandar & perbaikan.
          </p>
        </div>

        <Button onClick={openCreateModal} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Lokasi / Kapal
        </Button>
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
                Filter Tipe
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
                <option value="">Semua Tipe</option>
                <option value="location">Lokasi Darat</option>
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
                Status
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
                <option value="">Semua Status</option>
                <option value="1">Aktif Saja</option>
                <option value="0">Nonaktif Saja</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchLocations}
              disabled={loading}
              title="Muat Ulang"
              className="cursor-pointer"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Cari nama lokasi atau kode IMO..."
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
        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Lokasi / Kapal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kode / IMO</TableHead>
                <TableHead>Call Sign</TableHead>
                <TableHead>Bendera</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">Memuat data lokasi...</span>
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-zinc-500">
                    Tidak ada lokasi atau kapal ditemukan.
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
                      <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {isPlace ? (
                          <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Ship className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        )}
                        <span>{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {getTypeLabel(item.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {item.code || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {item.call_sign || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {item.flag || "-"}
                      </TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-zinc-500">
                            Nonaktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                          aria-label="Edit"
                          className="cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          title="Hapus"
                          aria-label="Hapus"
                          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
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
            Menampilkan {locations.length > 0 ? (currentPage - 1) * perPage + 1 : 0} hingga{" "}
            {Math.min(currentPage * perPage, totalCount)} dari {totalCount} lokasi
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
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Lokasi atau Kapal" : "Tambah Lokasi atau Kapal"}
              </DialogTitle>
              <DialogDescription>
                Masukkan detail lokasi darat atau spesifikasi kapal galangan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="location-name-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nama Lokasi / Kapal <span className="text-red-500">*</span>
                </label>
                <Input
                  id="location-name-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Misal: Slipway 1, MV Samudera Raya"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="location-type-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Tipe Lokasi <span className="text-red-500">*</span>
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
                  <option value="location">Lokasi Darat / Bangunan</option>
                  <option value="repair_vessel">Repair Vessel</option>
                  <option value="tug_boat">Tug Boat</option>
                  <option value="barge">Barge</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="location-code-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Kode / IMO {form.type !== "location" && <span className="text-red-500">*</span>}
                </label>
                <Input
                  id="location-code-input"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder={
                    form.type === "location"
                      ? "Dihasilkan otomatis oleh sistem jika kosong"
                      : "Nomor IMO (Wajib untuk kapal)"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="location-callsign-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Call Sign
                  </label>
                  <Input
                    id="location-callsign-input"
                    value={form.call_sign}
                    onChange={(e) => setForm((p) => ({ ...p, call_sign: e.target.value }))}
                    placeholder="Misal: YBDT"
                  />
                </div>
                <div>
                  <label
                    htmlFor="location-flag-input"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Bendera
                  </label>
                  <Input
                    id="location-flag-input"
                    value={form.flag}
                    onChange={(e) => setForm((p) => ({ ...p, flag: e.target.value }))}
                    placeholder="Misal: Indonesia"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location-port-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Pelabuhan Asal / Pangkalan
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
                  Status Aktif (dapat dipilih pada saat check-in tamu)
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
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus lokasi/kapal{" "}
              <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan jika lokasi
              pernah digunakan dalam kunjungan aktif.
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
    </div>
  )
}
