import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GlobalBlacklistPanel from "./GlobalBlacklistPanel"
import MasterImportDialog from "@/components/master/MasterImportDialog"
import MasterExportModal from "@/components/master/MasterExportModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"
import { REASON_CATEGORIES, type ReasonCategory } from "@/types/hybrid"
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileDown,
  Upload,
  ArrowLeft,
  Plus,
  Globe,
  Pencil,
} from "lucide-react"

interface BlacklistedVisitor {
  id: number | string
  visitor_no?: string
  id_type: string
  id_number: string
  name: string
  badge_code?: string
  offences?: string
  blacklist_reason?: string
  date?: string
  blacklisted_at?: string
  remark?: string
  company?: string
  is_blacklisted: boolean
}

interface BlacklistFormState {
  name: string
  badge_code: string
  id_number: string
  offences: string
  date: string
  remark: string
  company: string
}

const initialFormState: BlacklistFormState = {
  name: "",
  badge_code: "",
  id_number: "",
  offences: "",
  date: new Date().toISOString().slice(0, 10),
  remark: "",
  company: "",
}

const ITEMS_PER_PAGE = 10

export default function BlacklistedVisitors() {
  const navigate = useNavigate()
  const [visitors, setVisitors] = useState<BlacklistedVisitor[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Unblacklist Confirm State
  const [unblacklistAlertOpen, setUnblacklistAlertOpen] = useState(false)
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<
    number | string | null
  >(null)

  // Form Modal State (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | number | null>(null)
  const [formData, setFormData] = useState<BlacklistFormState>(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Import / Export State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // "Naikkan ke global" (hybrid decisions PE-5, FE-4b): a fixed category travels, the note stays here.
  const [promoteTarget, setPromoteTarget] = useState<BlacklistedVisitor | null>(
    null
  )
  const [promoteCategory, setPromoteCategory] = useState<ReasonCategory | "">(
    ""
  )
  const [promoteNote, setPromoteNote] = useState("")
  const [promoting, setPromoting] = useState(false)

  const openPromote = (visitor: BlacklistedVisitor) => {
    setPromoteTarget(visitor)
    setPromoteCategory("")
    setPromoteNote(visitor.offences || visitor.blacklist_reason || "")
  }

  const submitPromote = async () => {
    if (!promoteTarget || !promoteCategory || !promoteNote.trim()) return
    setPromoting(true)
    try {
      await api.post("/global-blacklists", {
        visitor_id: promoteTarget.id,
        reason_category: promoteCategory,
        local_note: promoteNote.trim(),
      })
      toast.success(
        "Masuk antrean; dikirim ke Cloud Hub pada siklus sync berikutnya."
      )
      setPromoteTarget(null)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      toast.error(
        errors?.visitor_id?.[0] ||
          err.response?.data?.message ||
          "Gagal menaikkan ke blacklist global."
      )
    } finally {
      setPromoting(false)
    }
  }

  const fetchBlacklisted = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      }
      if (search) params.search = search

      const res = await api.get("/visitors/blacklisted", { params })
      const data = res.data
      if (data && Array.isArray(data.data)) {
        setVisitors(data.data)
        setCurrentPage(data.current_page || 1)
        setTotalPages(data.last_page || 1)
        setTotalItems(data.total || 0)
      } else if (Array.isArray(data)) {
        setVisitors(data)
        setTotalPages(1)
        setTotalItems(data.length)
      } else {
        setVisitors([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search])

  useEffect(() => {
    fetchBlacklisted()
  }, [fetchBlacklisted])

  const openCreateModal = () => {
    setFormData({
      ...initialFormState,
      date: new Date().toISOString().slice(0, 10),
    })
    setFormErrors({})
    setIsEditing(false)
    setEditId(null)
    setFormModalOpen(true)
  }

  const openEditModal = (visitor: BlacklistedVisitor) => {
    const rawDate = visitor.blacklisted_at || visitor.date || ""
    const formattedDate = rawDate ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10)

    setFormData({
      name: visitor.name || "",
      badge_code: visitor.badge_code || "",
      id_number:
        visitor.id_number && !visitor.id_number.startsWith("NOKTP")
          ? visitor.id_number
          : "",
      offences: visitor.offences || visitor.blacklist_reason || "",
      date: formattedDate,
      remark: visitor.remark || "",
      company: visitor.company || "",
    })
    setFormErrors({})
    setIsEditing(true)
    setEditId(visitor.id)
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = "NAME OF OFFENDER wajib diisi."
    }
    if (!formData.offences.trim()) {
      errors.offences = "OFFENCES wajib diisi."
    }
    if (!formData.date.trim()) {
      errors.date = "DATE wajib diisi."
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    try {
      if (isEditing && editId) {
        await api.put(`/visitors/blacklisted/${editId}`, formData)
        toast.success("Data blacklist berhasil diperbarui.")
      } else {
        await api.post("/visitors/blacklisted", formData)
        toast.success("Data blacklist berhasil ditambahkan.")
      }
      setFormModalOpen(false)
      fetchBlacklisted()
    } catch (error: any) {
      console.error(error)
      const backendErrors = error.response?.data?.errors
      if (backendErrors) {
        const formatted: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(backendErrors)) {
          if (Array.isArray(msgs)) formatted[key] = msgs[0]
        }
        setFormErrors(formatted)
      }
      toast.error(
        error.response?.data?.message || "Gagal menyimpan data blacklist."
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmUnblacklist = (id: number | string) => {
    setSelectedUnblacklistId(id)
    setUnblacklistAlertOpen(true)
  }

  const executeUnblacklist = async () => {
    if (!selectedUnblacklistId) return
    try {
      await api.post(`/visitors/${selectedUnblacklistId}/unblacklist`)
      toast.success("Pengunjung berhasil dikeluarkan dari daftar blacklist")
      fetchBlacklisted()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error.response?.data?.message || "Gagal mencabut status blacklist"
      )
    } finally {
      setUnblacklistAlertOpen(false)
      setSelectedUnblacklistId(null)
    }
  }



  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/master/visitors")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Pengunjung
          </Button>
          <h1 className="text-2xl font-bold">Daftar Pengunjung Blacklist</h1>
          <p className="text-sm text-muted-foreground">
            Daftar individu yang dilarang memasuki kawasan galangan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="destructive" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Blacklist
          </Button>
        </div>
      </div>

      <Tabs defaultValue="local" className="gap-4">
        <TabsList>
          <TabsTrigger value="local">Lokal</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <GlobalBlacklistPanel />
        </TabsContent>

        <TabsContent value="local">
          {/* Filter Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Cari nama, KTP, badge, atau pelanggaran..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Table with EXACT Columns */}
            <div className="overflow-hidden rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                    <TableRow>
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead>NAME OF OFFENDER</TableHead>
                      <TableHead>Badge / H.I.D code</TableHead>
                      <TableHead>KTP NO</TableHead>
                      <TableHead>OFFENCES</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>REMARK</TableHead>
                      <TableHead>COMPANY NAME</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && visitors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : visitors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-zinc-500"
                        >
                          Tidak ada pengunjung dalam daftar blacklist.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visitors.map((visitor, idx) => {
                        const rowNumber =
                          (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                        const displayDate = visitor.blacklisted_at
                          ? visitor.blacklisted_at.slice(0, 10)
                          : visitor.date
                            ? visitor.date.slice(0, 10)
                            : "-"

                        return (
                          <TableRow
                            key={visitor.id}
                            className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                          >
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {rowNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {visitor.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {visitor.badge_code || "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-medium">
                              {visitor.id_number &&
                              !visitor.id_number.startsWith("NOKTP") ? (
                                visitor.id_number
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <span
                                className="line-clamp-2 text-sm font-medium text-red-600 dark:text-red-400"
                                title={
                                  visitor.offences || visitor.blacklist_reason
                                }
                              >
                                {visitor.offences ||
                                  visitor.blacklist_reason ||
                                  "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {displayDate}
                            </TableCell>
                            <TableCell
                              className="max-w-[200px] truncate text-xs text-muted-foreground"
                              title={visitor.remark}
                            >
                              {visitor.remark || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {visitor.company || "-"}
                            </TableCell>
                            <TableCell className="space-x-1.5 text-center whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(visitor)}
                                title="Ubah Data"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPromote(visitor)}
                                aria-label="Naikkan ke global"
                                title="Naikkan ke global"
                              >
                                <Globe className="mr-1 h-3.5 w-3.5" />
                                Global
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmUnblacklist(visitor.id)}
                                aria-label="Cabut Blacklist"
                                title="Cabut Blacklist"
                                className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                Cabut
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                Menampilkan{" "}
                {visitors.length > 0
                  ? (currentPage - 1) * ITEMS_PER_PAGE + 1
                  : 0}{" "}
                hingga {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari{" "}
                {totalItems} total blacklist
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={
                    currentPage >= totalPages || totalPages === 0 || loading
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Naikkan ke Blacklist Global */}
      <Dialog
        open={promoteTarget !== null}
        onOpenChange={(open) => !open && setPromoteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naikkan ke Blacklist Global</DialogTitle>
            <DialogDescription>
              {promoteTarget?.name} ({promoteTarget?.id_number}) akan ditolak di
              semua yard setelah sinkron. Hanya kategori yang dikirim ke yard
              lain; catatan di bawah tetap di yard ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promote-category">Kategori alasan</Label>
              <select
                id="promote-category"
                value={promoteCategory}
                onChange={(e) =>
                  setPromoteCategory(e.target.value as ReasonCategory)
                }
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Pilih kategori --</option>
                {REASON_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-note">
                Catatan lokal (tidak dikirim)
              </Label>
              <Textarea
                id="promote-note"
                rows={3}
                value={promoteNote}
                onChange={(e) => setPromoteNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromoteTarget(null)}
              disabled={promoting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={submitPromote}
              disabled={promoting || !promoteCategory || !promoteNote.trim()}
            >
              {promoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Naikkan ke global
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah / Edit Blacklist */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Data Blacklist" : "Tambah Data Blacklist"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Perbarui informasi pelanggaran dan identitas pelaku."
                : "Masukkan identitas dan catatan pelanggaran untuk memasukkan ke daftar blacklist."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">NAME OF OFFENDER *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nama lengkap pelaku..."
                required
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="id_number">KTP NO / Dokumen Identitas (Opsional)</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      id_number: e.target.value,
                    }))
                  }
                  placeholder="Nomor KTP, Passport, atau kosongkan..."
                  maxLength={50}
                />
                {formErrors.id_number && (
                  <p className="text-xs text-red-500">{formErrors.id_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge_code">Badge / H.I.D code</Label>
                <Input
                  id="badge_code"
                  value={formData.badge_code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      badge_code: e.target.value,
                    }))
                  }
                  placeholder="Contoh: HID-1029"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">DATE *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  required
                />
                {formErrors.date && (
                  <p className="text-xs text-red-500">{formErrors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">COMPANY NAME</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  placeholder="Nama instansi/perusahaan..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offences">OFFENCES *</Label>
              <Textarea
                id="offences"
                value={formData.offences}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, offences: e.target.value }))
                }
                placeholder="Tuliskan bentuk pelanggaran yang dilakukan..."
                rows={3}
                required
              />
              {formErrors.offences && (
                <p className="text-xs text-red-500">{formErrors.offences}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="remark">REMARK</Label>
              <Textarea
                id="remark"
                value={formData.remark}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, remark: e.target.value }))
                }
                placeholder="Catatan tambahan (opsional)..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormModalOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Simpan Perubahan" : "Tambahkan ke Blacklist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Unblacklist */}
      <AlertDialog
        open={unblacklistAlertOpen}
        onOpenChange={setUnblacklistAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencabutan Blacklist</AlertDialogTitle>
            <AlertDialogDescription>
              Pengunjung ini akan diizinkan kembali untuk melakukan kunjungan ke
              kawasan galangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUnblacklist}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Cabut Blacklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Master Import Dialog with Preview & Duplicate Confirmation */}
      <MasterImportDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import Data Blacklist"
        description="Unggah file spreadsheet Excel (.xlsx / .xls / .csv) daftar blacklist dengan kolom: NO, NAME OF OFFENDER, Badge / H.I.D code, KTP NO, OFFENCES, DATE, REMARK, COMPANY NAME."
        templateEndpoint="/visitors/blacklisted/template"
        templateFileName="template_blacklist.xlsx"
        previewEndpoint="/visitors/blacklisted/import-preview"
        importEndpoint="/visitors/blacklisted/import"
        columns={[
          { key: "name_of_offender", label: "NAME OF OFFENDER" },
          { key: "badge_/_h.i.d_code", label: "Badge / H.I.D code" },
          { key: "ktp_no", label: "KTP NO" },
          { key: "offences", label: "OFFENCES" },
          { key: "date", label: "DATE" },
          { key: "remark", label: "REMARK" },
          { key: "company_name", label: "COMPANY NAME" },
        ]}
        onSuccess={fetchBlacklisted}
      />

      {/* Master Export Modal with Columns, Presets, Scope & Live Count */}
      <MasterExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityConfig={MASTER_ENTITIES.blacklist}
        currentFilters={{
          search,
        }}
      />
    </div>
  )
}
