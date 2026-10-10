import { useState, useEffect, useCallback } from "react"
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

interface Staff {
  id: string
  staff_id: string
  name: string
  department?: string
  occupation?: string
  company?: string
  gender?: string
  birth_date?: string
  address?: string
  is_active: boolean
  deleted_at?: string
}

export default function Staffs() {
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [trashedStaffs, setTrashedStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [trashedModalOpen, setTrashedModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const perPage = 10

  // Form State
  const [form, setForm] = useState({
    id: null as string | null,
    staff_id: "",
    name: "",
    department: "",
    occupation: "",
    company: "",
    gender: "",
    birth_date: "",
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

  const openForm = (staff: Staff | null = null) => {
    if (staff) {
      setForm({
        id: staff.id,
        staff_id: staff.staff_id || "",
        name: staff.name || "",
        department: staff.department || "",
        occupation: staff.occupation || "",
        company: staff.company || "",
        gender: staff.gender || "",
        birth_date: staff.birth_date || "",
        address: staff.address || "",
        is_active: staff.is_active ?? true,
      })
    } else {
      setForm({
        id: null,
        staff_id: "",
        name: "",
        department: "",
        occupation: "",
        company: "",
        gender: "",
        birth_date: "",
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
      const msg = error.response?.data?.message || "Gagal menyimpan data staf"
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
      const msg = error.response?.data?.message || "Gagal menghapus data staf"
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
      const msg = error.response?.data?.message || "Gagal memulihkan staf"
      showError(msg)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (companyFilter) params.company = companyFilter
      if (statusFilter !== "") params.is_active = statusFilter

      const res = await api.get("/staffs/export", {
        params,
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `staffs_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      showError("Gagal mengekspor data staf.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Staf & Karyawan</h1>
          <p className="text-muted-foreground">
            Kelola data staf dan karyawan internal sebagai PIC/Host kunjungan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              fetchTrashedStaffs()
              setTrashedModalOpen(true)
            }}
          >
            Lihat Sampah
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Staf
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Cari nama, NIK, atau departemen..."
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
              placeholder="Filter perusahaan / unit..."
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="statusFilter" className="whitespace-nowrap text-sm font-medium">
              Status Aktif
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
              <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Semua Status</option>
              <option value="1" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Aktif</option>
              <option value="0" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead>Staff ID / NIK</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && staffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : staffs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-zinc-500"
                  >
                    Data staf tidak ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                staffs.map((staff) => (
                  <TableRow
                    key={staff.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell className="font-mono font-medium">
                      {staff.staff_id}
                    </TableCell>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>{staff.department || "-"}</TableCell>
                    <TableCell>{staff.company || "-"}</TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-zinc-500/30 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(staff)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(staff.id)}
                      >
                        Hapus
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
            Menampilkan {staffs.length > 0 ? (currentPage - 1) * perPage + 1 : 0}{" "}
            hingga {Math.min(currentPage * perPage, totalItems)} dari {totalItems} total staf
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
              {form.id ? "Edit Data Staf" : "Tambah Data Staf"}
            </DialogTitle>
            <DialogDescription>
              Isi data lengkap staf internal berikut untuk kebutuhan PIC kunjungan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form_staff_id">Staff ID / NIK *</Label>
              <Input
                id="form_staff_id"
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                placeholder="Contoh: EMP-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_name">Nama Lengkap *</Label>
              <Input
                id="form_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="form_department">Departemen</Label>
                <Input
                  id="form_department"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="Contoh: Commercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form_occupation">Jabatan / Posisi</Label>
                <Input
                  id="form_occupation"
                  value={form.occupation}
                  onChange={(e) =>
                    setForm({ ...form, occupation: e.target.value })
                  }
                  placeholder="Contoh: Manager"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="form_company">Perusahaan</Label>
                <Input
                  id="form_company"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Contoh: PT Cemara Intan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form_gender">Jenis Kelamin</Label>
                <select
                  id="form_gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-white text-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
                >
                  <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Pilih Jenis Kelamin</option>
                  <option value="M" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Laki-laki (M)</option>
                  <option value="F" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Perempuan (F)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_birth_date">Tanggal Lahir</Label>
              <Input
                id="form_birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) =>
                  setForm({ ...form, birth_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_address">Alamat</Label>
              <Input
                id="form_address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat domisili"
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
                Status Aktif Bekerja
              </Label>
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Import Excel (Tahap 3 Standard) */}
      <MasterImportDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import Data Staf"
        description="Unggah file spreadsheet Excel (.xlsx / .xls / .csv) untuk memperbarui data staf sekaligus."
        templateEndpoint="/staffs/template"
        templateFileName="template_staff.xlsx"
        previewEndpoint="/staffs/import-preview"
        importEndpoint="/staffs/import"
        columns={[
          { key: "staff_id", label: "Staff ID / NIK" },
          { key: "name", label: "Nama Lengkap" },
          { key: "department", label: "Departemen" },
          { key: "company", label: "Perusahaan" },
          { key: "occupation", label: "Jabatan" },
          { key: "gender", label: "Gender" },
        ]}
        onSuccess={fetchStaffs}
      />

      {/* Alert Dialog Konfirmasi Hapus */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data staf ini? Data yang dihapus
              akan masuk ke daftar terhapus dan dapat dipulihkan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog Error */}
      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terjadi Kesalahan</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorOpen(false)}>
              Tutup
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Data Terhapus */}
      <Dialog open={trashedModalOpen} onOpenChange={setTrashedModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Data Staf Terhapus</DialogTitle>
            <DialogDescription>
              Daftar staf yang sebelumnya dihapus dan dapat dipulihkan kembali.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                  <TableRow>
                    <TableHead>Staff ID / NIK</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Waktu Dihapus</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedStaffs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-zinc-500"
                      >
                        Tidak ada data staf terhapus.
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
                            Pulihkan
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
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
