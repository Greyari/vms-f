import { useState, useEffect, useCallback } from "react"
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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Upload,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"
import MasterImportDialog from "@/components/master/MasterImportDialog"
import MasterExportModal from "@/components/master/MasterExportModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"

interface Staff {
  id: string
  staff_id: string
  name: string
  company?: string
  gender?: string
  address?: string
  is_active: boolean
  deleted_at?: string
}

export default function Staffs() {
  const { t } = useTranslation()
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [trashedStaffs, setTrashedStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [trashedModalOpen, setTrashedModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const perPage = 100

  // Form State
  const [form, setForm] = useState({
    id: null as string | null,
    staff_id: "",
    name: "",
    company: "",
    gender: "",
    address: "",
    is_active: true,
  })

  // Alert Dialog States (Delete)
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  // Error Dialog States
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const showError = (message: string) => {
    setErrorMessage(message)
    setErrorOpen(true)
  }

  const fetchStaffs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: perPage,
      }
      if (search) params.search = search
      if (companyFilter) params.company = companyFilter
      if (statusFilter !== "") params.is_active = statusFilter

      const res = await api.get("/staffs", { params })
      const data = res.data
      if (data && Array.isArray(data.data)) {
        setStaffs(data.data)
        setCurrentPage(data.current_page || 1)
        setTotalPages(data.last_page || 1)
        setTotalItems(data.total || 0)
      } else if (Array.isArray(data)) {
        setStaffs(data)
        setTotalPages(1)
        setTotalItems(data.length)
      } else {
        setStaffs([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, companyFilter, statusFilter])

  const fetchTrashedStaffs = async () => {
    try {
      const res = await api.get("/staffs/trashed")
      setTrashedStaffs(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchStaffs()
  }, [fetchStaffs])

  const normalizeGender = (g?: string | null): string => {
    if (!g) return ""
    const upper = g.trim().toUpperCase()
    if (["M", "MALE", "LAKI-LAKI", "PRIA", "L"].includes(upper)) return "M"
    if (["F", "FEMALE", "PEREMPUAN", "WANITA", "P"].includes(upper)) return "F"
    return g
  }

  const openForm = (staff: Staff | null = null) => {
    if (staff) {
      setForm({
        id: staff.id,
        staff_id: staff.staff_id || "",
        name: staff.name || "",
        company: staff.company || "",
        gender: normalizeGender(staff.gender),
        address: staff.address || "",
        is_active: staff.is_active ?? true,
      })
    } else {
      setForm({
        id: null,
        staff_id: "",
        name: "",
        company: "",
        gender: "",
        address: "",
        is_active: true,
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (form.id) {
        await api.put(`/staffs/${form.id}`, form)
      } else {
        await api.post("/staffs", form)
      }
      setModalOpen(false)
      fetchStaffs()
    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.message || t("staffs.err_save_failed", "Gagal menyimpan data staf")
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string) => {
    setSelectedStaffId(id)
    setAlertOpen(true)
  }

  const executeDelete = async () => {
    if (!selectedStaffId) return
    try {
      await api.delete(`/staffs/${selectedStaffId}`)
      fetchStaffs()
    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.message || t("staffs.err_delete_failed", "Gagal menghapus data staf")
      showError(msg)
    } finally {
      setAlertOpen(false)
      setSelectedStaffId(null)
    }
  }

  const executeRestore = async (id: string) => {
    try {
      await api.post(`/staffs/${id}/restore`)
      fetchStaffs()
      fetchTrashedStaffs()
    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.message || t("staffs.err_restore_failed", "Gagal memulihkan staf")
      showError(msg)
    }
  }



  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("staffs.title", "Master Staf & Karyawan")}</h1>
          <p className="text-muted-foreground">
            {t("staffs.description", "Kelola data staf dan karyawan internal sebagai PIC/Host kunjungan.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("common.export_excel", "Export Excel")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              fetchTrashedStaffs()
              setTrashedModalOpen(true)
            }}
          >
            {t("staffs.view_trash", "Lihat Sampah")}
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> {t("common.import_excel", "Import Excel")}
          </Button>
          <Button onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" /> {t("staffs.add_staff", "Tambah Staf")}
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder={t("staffs.search_placeholder", "Cari nama, NIK, atau perusahaan...")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>

          <div>
            <Input
              placeholder={t("staffs.company_placeholder", "Filter perusahaan / unit...")}
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="statusFilter" className="whitespace-nowrap text-sm font-medium">
              {t("staffs.field_status", "Status Aktif")}
            </Label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-white text-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
            >
              <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("staffs.filter_all", "Semua Status")}</option>
              <option value="1" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("staffs.filter_active", "Aktif")}</option>
              <option value="0" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("staffs.filter_inactive", "Nonaktif")}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">{t("staffs.col_no", "NO")}</TableHead>
                <TableHead>{t("staffs.col_name", "NAME")}</TableHead>
                <TableHead>{t("staffs.col_staff_no", "STAFF NO")}</TableHead>
                <TableHead>{t("staffs.col_gender", "GENDER")}</TableHead>
                <TableHead>{t("staffs.col_address", "ADDRESS")}</TableHead>
                <TableHead>{t("staffs.col_company", "COMPANY")}</TableHead>
                <TableHead>{t("staffs.col_status", "TYPE")}</TableHead>
                <TableHead className="text-right">{t("staffs.col_actions", "AKSI")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && staffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : staffs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-zinc-500"
                  >
                    {t("staffs.empty_text", "Data staf tidak ditemukan.")}
                  </TableCell>
                </TableRow>
              ) : (
                staffs.map((staff, idx) => (
                  <TableRow
                    key={staff.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell className="text-center font-mono text-xs text-zinc-500">
                      {(currentPage - 1) * perPage + idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {staff.name}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {staff.staff_id}
                    </TableCell>
                    <TableCell>{staff.gender === "M" || staff.gender === "Male" ? t("common.male", "Laki-laki (M)") : staff.gender === "F" || staff.gender === "Female" ? t("common.female", "Perempuan (F)") : staff.gender || "-"}</TableCell>
                    <TableCell>{staff.address || "-"}</TableCell>
                    <TableCell>{staff.company || "-"}</TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {t("common.active", "Active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-zinc-500/30 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                          {t("common.inactive", "Inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(staff)}
                      >
                        {t("common.edit", "Edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(staff.id)}
                      >
                        {t("common.delete", "Hapus")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {t("staffs.pagination_showing", {
              from: staffs.length > 0 ? (currentPage - 1) * perPage + 1 : 0,
              to: Math.min(currentPage * perPage, totalItems),
              total: totalItems,
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
              disabled={
                currentPage === totalPages || totalPages === 0 || loading
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Form Tambah / Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("staffs.edit_staff", "Edit Data Staf") : t("staffs.add_staff_modal_title", "Tambah Data Staf")}
            </DialogTitle>
            <DialogDescription>
              {t("staffs.modal_desc", "Isi data lengkap staf internal berikut untuk kebutuhan PIC kunjungan.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form_staff_id">{t("staffs.field_staff_id", "Staff ID / NIK *")}</Label>
              <Input
                id="form_staff_id"
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                placeholder={t("staffs.staff_id_placeholder", "Contoh: EMP-001")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_name">{t("staffs.field_name", "Nama Lengkap *")}</Label>
              <Input
                id="form_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("staffs.name_placeholder", "Contoh: Budi Santoso")}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="form_company">{t("staffs.col_company", "Perusahaan")}</Label>
                <Input
                  id="form_company"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder={t("staffs.company_input_placeholder", "Contoh: PT Cemara Intan")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form_gender">{t("staffs.field_gender", "Jenis Kelamin / Gender")}</Label>
                <select
                  id="form_gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-white text-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
                >
                  <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("staffs.select_gender", "Pilih Jenis Kelamin")}</option>
                  <option value="M" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("common.male", "Laki-laki (M)")}</option>
                  <option value="F" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{t("common.female", "Perempuan (F)")}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_address">{t("staffs.field_address", "Address / Role")}</Label>
              <Input
                id="form_address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("staffs.address_placeholder", "Contoh: ADMIN, DIRECTOR, MANAGER")}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="form_is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="form_is_active" className="cursor-pointer text-sm font-medium">
                {t("staffs.field_status_working", "Status Aktif Bekerja")}
              </Label>
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                {t("common.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("common.processing", "Menyimpan...") : t("common.save", "Simpan")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Import Excel (Tahap 3 Standard) */}
      <MasterImportDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title={t("staffs.import_title", "Import Data Staf")}
        description={t("staffs.import_desc", "Unggah file spreadsheet Excel (.xlsx / .xls / .csv) untuk memperbarui data staf sekaligus.")}
        templateEndpoint="/staffs/template"
        templateFileName="template_staff.xlsx"
        previewEndpoint="/staffs/import-preview"
        importEndpoint="/staffs/import"
        columns={[
          { key: "staff_id", label: t("staffs.field_staff_id", "Staff ID / NIK") },
          { key: "name", label: t("staffs.col_name", "Nama Lengkap") },
          { key: "company", label: t("staffs.col_company", "Perusahaan") },
          { key: "gender", label: t("staffs.col_gender", "Gender") },
          { key: "address", label: t("staffs.col_address", "Alamat") },
        ]}
        onSuccess={fetchStaffs}
      />

      {/* Master Export Modal with Columns, Presets, Scope & Live Count */}
      <MasterExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityConfig={MASTER_ENTITIES.staffs}
        currentFilters={{
          search,
          company: companyFilter,
          status: statusFilter,
        }}
      />

      {/* Alert Dialog Konfirmasi Hapus */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("staffs.confirm_delete_title", "Konfirmasi Hapus")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("staffs.confirm_delete_desc_full", "Apakah Anda yakin ingin menghapus data staf ini? Data yang dihapus akan masuk ke daftar terhapus dan dapat dipulihkan kembali.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Batal")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t("common.yes_delete", "Ya, Hapus")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog Error */}
      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.error_occurred", "Terjadi Kesalahan")}</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorOpen(false)}>
              {t("common.close", "Tutup")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Data Terhapus */}
      <Dialog open={trashedModalOpen} onOpenChange={setTrashedModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("staffs.trashed_title", "Data Staf Terhapus")}</DialogTitle>
            <DialogDescription>
              {t("staffs.trashed_desc", "Daftar staf yang sebelumnya dihapus dan dapat dipulihkan kembali.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                  <TableRow>
                    <TableHead>{t("staffs.field_staff_id", "Staff ID / NIK")}</TableHead>
                    <TableHead>{t("staffs.col_name", "Nama Lengkap")}</TableHead>
                    <TableHead>{t("staffs.col_deleted_at", "Waktu Dihapus")}</TableHead>
                    <TableHead className="text-right">{t("staffs.col_actions", "Aksi")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedStaffs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-zinc-500"
                      >
                        {t("staffs.no_trashed", "Tidak ada data staf terhapus.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    trashedStaffs.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono font-medium text-zinc-500 line-through">
                          {staff.staff_id}
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {staff.name}
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {staff.deleted_at
                            ? new Date(staff.deleted_at).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => executeRestore(staff.id)}
                          >
                            {t("common.restore", "Pulihkan")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTrashedModalOpen(false)}
              >
                {t("common.close", "Tutup")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
