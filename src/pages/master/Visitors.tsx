import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import {
  Upload,
  Download,
  Ban,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Plus,
  Eye,
  Edit,
  FileDown,
} from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
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

import VisitorDetailModal from "@/components/master/VisitorDetailModal"
import VisitorFormModal from "@/components/master/VisitorFormModal"

export interface Visitor {
  id: number | string
  visitor_no?: string | number
  id_type: string
  id_number: string
  name: string
  company?: string
  occupation?: string
  visitor_type?: string
  phone?: string
  email?: string
  address?: string
  birth_place?: string
  birth_date?: string
  gender?: string
  nationality?: string
  is_blacklisted: boolean
  blacklist_reason?: string
  blacklisted_by?: string
  visits_count?: number
}

const ITEMS_PER_PAGE = 10

export default function Visitors() {
  const navigate = useNavigate()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [visitorTypeFilter, setVisitorTypeFilter] = useState("")
  const [blacklistFilter, setBlacklistFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedVisitorId, setSelectedVisitorId] = useState<number | string | null>(null)

  // Form Modal State (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedVisitorForEdit, setSelectedVisitorForEdit] = useState<Visitor | null>(null)

  // Blacklist Reason Modal State
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)
  const [targetVisitorForBlacklist, setTargetVisitorForBlacklist] = useState<Visitor | null>(null)
  const [blacklistReason, setBlacklistReason] = useState("")
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false)

  // Unblacklist Confirm State
  const [unblacklistAlertOpen, setUnblacklistAlertOpen] = useState(false)
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<number | string | null>(null)

  // Delete Confirm State
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | string | null>(null)

  // Import Excel State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)

  const fetchVisitors = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      }
      if (search) params.search = search
      if (visitorTypeFilter) params.visitor_type = visitorTypeFilter
      if (blacklistFilter !== "") params.is_blacklisted = blacklistFilter

      const res = await api.get("/visitors", { params })
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
  }, [currentPage, search, visitorTypeFilter, blacklistFilter])

  useEffect(() => {
    fetchVisitors()
  }, [fetchVisitors])

  const openDetailModal = (visitorId: number | string) => {
    setSelectedVisitorId(visitorId)
    setDetailModalOpen(true)
  }

  const openCreateModal = () => {
    setSelectedVisitorForEdit(null)
    setFormModalOpen(true)
  }

  const openEditModal = (visitor: Visitor) => {
    setSelectedVisitorForEdit(visitor)
    setFormModalOpen(true)
  }

  const openBlacklistDialog = (visitor: Visitor) => {
    setTargetVisitorForBlacklist(visitor)
    setBlacklistReason("")
    setBlacklistModalOpen(true)
  }

  const handleBlacklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetVisitorForBlacklist) return
    setSubmittingBlacklist(true)
    try {
      await api.post(`/visitors/${targetVisitorForBlacklist.id}/blacklist`, {
        reason: blacklistReason,
      })
      toast.success("Pengunjung berhasil dimasukkan ke daftar blacklist")
      setBlacklistModalOpen(false)
      setTargetVisitorForBlacklist(null)
      fetchVisitors()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal memasukkan ke daftar blacklist")
    } finally {
      setSubmittingBlacklist(false)
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
      toast.success("Status blacklist pengunjung berhasil dicabut")
      fetchVisitors()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal mencabut status blacklist")
    } finally {
      setUnblacklistAlertOpen(false)
      setSelectedUnblacklistId(null)
    }
  }

  const confirmDelete = (id: number | string) => {
    setSelectedDeleteId(id)
    setDeleteAlertOpen(true)
  }

  const executeDelete = async () => {
    if (!selectedDeleteId) return
    try {
      await api.delete(`/visitors/${selectedDeleteId}`)
      toast.success("Data pengunjung berhasil dihapus")
      fetchVisitors()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal menghapus data pengunjung")
    } finally {
      setDeleteAlertOpen(false)
      setSelectedDeleteId(null)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (visitorTypeFilter) params.visitor_type = visitorTypeFilter
      if (blacklistFilter !== "") params.is_blacklisted = blacklistFilter

      const res = await api.get("/visitors/export", {
        params,
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `visitors_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("File pengunjung berhasil diekspor")
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengekspor data pengunjung")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      const res = await api.get("/visitors/template", { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "visitor_template.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengunduh template")
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) return
    setImporting(true)
    const formData = new FormData()
    formData.append("file", importFile)
    try {
      const res = await api.post("/visitors/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast.success(res.data?.message || "Import data pengunjung berhasil")
      setImportModalOpen(false)
      setImportFile(null)
      fetchVisitors()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal mengimpor file")
    } finally {
      setImporting(false)
    }
  }

  const getVisitorTypeBadge = (type?: string) => {
    switch (type) {
      case "contractor":
        return <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Contractor</Badge>
      case "crew":
        return <Badge variant="outline" className="border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">Crew</Badge>
      case "vip":
        return <Badge variant="outline" className="border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">VIP</Badge>
      case "regular":
      default:
        return <Badge variant="outline" className="border-zinc-500/30 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Regular</Badge>
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Pengunjung (Visitors)</h1>
          <p className="text-muted-foreground">
            Daftar induk seluruh pengunjung, kontraktor, dan kru kapal.
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
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            disabled={importing}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/master/visitors/blacklist")}
          >
            <Ban className="mr-2 h-4 w-4" />
            Daftar Blacklist
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengunjung
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Cari nama, KTP, atau perusahaan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="visitorTypeFilter" className="whitespace-nowrap text-sm font-medium">
              Tipe Pengunjung
            </Label>
            <select
              id="visitorTypeFilter"
              value={visitorTypeFilter}
              onChange={(e) => {
                setVisitorTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Semua Tipe</option>
              <option value="regular">Regular</option>
              <option value="contractor">Contractor</option>
              <option value="crew">Crew</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="blacklistFilter" className="whitespace-nowrap text-sm font-medium">
              Status Blacklist
            </Label>
            <select
              id="blacklistFilter"
              value={blacklistFilter}
              onChange={(e) => {
                setBlacklistFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Semua Status</option>
              <option value="0">Normal (Aktif)</option>
              <option value="1">Blacklisted</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                <TableRow>
                  <TableHead>No. Visitor</TableHead>
                  <TableHead>Identitas</TableHead>
                  <TableHead>Nama Pengunjung</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Kunjungan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    </TableCell>
                  </TableRow>
                ) : visitors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-zinc-500"
                    >
                      Data pengunjung tidak ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  visitors.map((visitor) => (
                    <TableRow
                      key={visitor.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {visitor.visitor_no || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground uppercase">
                            {visitor.id_type}
                          </span>
                          <span className="font-medium text-sm">
                            {visitor.id_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{visitor.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{visitor.company || "-"}</span>
                          {visitor.occupation && (
                            <span className="text-xs text-muted-foreground">{visitor.occupation}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getVisitorTypeBadge(visitor.visitor_type)}</TableCell>
                      <TableCell>
                        {visitor.is_blacklisted ? (
                          <Badge variant="outline" className="border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            Blacklisted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {visitor.visits_count || 0}
                      </TableCell>
                      <TableCell className="space-x-1 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(visitor.id)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Detail
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(visitor)}
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {visitor.is_blacklisted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmUnblacklist(visitor.id)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            Unblacklist
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBlacklistDialog(visitor)}
                          >
                            <ShieldOff className="mr-1 h-3.5 w-3.5" />
                            Blacklist
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmDelete(visitor.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Menampilkan {visitors.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}{" "}
            hingga {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} total pengunjung
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

      {/* Modal Detail Visitor */}
      <VisitorDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        visitorId={selectedVisitorId}
      />

      {/* Modal Form Pendaftaran / Edit Visitor */}
      <VisitorFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        visitor={selectedVisitorForEdit}
        onSuccess={() => {
          setFormModalOpen(false)
          fetchVisitors()
        }}
      />

      {/* Dialog Alasan Blacklist */}
      <Dialog open={blacklistModalOpen} onOpenChange={setBlacklistModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Masukan ke Daftar Blacklist</DialogTitle>
            <DialogDescription>
              Pengunjung yang masuk daftar blacklist tidak akan dapat diberikan izin masuk ke area ASL.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBlacklistSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Pengunjung:</p>
              <p className="text-sm text-muted-foreground">
                {targetVisitorForBlacklist?.name} ({targetVisitorForBlacklist?.id_number})
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blacklist_reason">Alasan Blacklist *</Label>
              <Textarea
                id="blacklist_reason"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Tuliskan alasan pelanggaran atau instruksi penolakan..."
                required
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlacklistModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={submittingBlacklist}>
                {submittingBlacklist ? "Menyimpan..." : "Blacklist Pengunjung"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Unblacklist */}
      <AlertDialog open={unblacklistAlertOpen} onOpenChange={setUnblacklistAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencabutan Blacklist</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memulihkan status pengunjung ini? Pengunjung akan dapat kembali melakukan kunjungan ke ASL.
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

      {/* Alert Dialog Hapus */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengunjung</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus pengunjung akan menghapus data induk pengunjung secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Import Excel */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data Pengunjung</DialogTitle>
            <DialogDescription>
              Unggah file spreadsheet Excel untuk memperbarui atau memasukkan pengunjung sekaligus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Unduh Template Excel
                </p>
                <p className="text-zinc-500">
                  Gunakan template format resmi untuk kolom visitor.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                {isDownloadingTemplate ? "Mengunduh..." : "Download"}
              </Button>
            </div>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import_file">Pilih File Excel</Label>
                <Input
                  id="import_file"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={!importFile || importing}>
                  {importing ? "Mengimpor..." : "Upload & Import"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
