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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileDown,
  Upload,
  ArrowLeft,
  Plus,
} from "lucide-react"

interface BlacklistedVisitor {
  id: number | string
  visitor_no?: string
  id_type: string
  id_number: string
  name: string
  company?: string
  is_blacklisted: boolean
  blacklist_reason?: string
  blacklisted_at?: string
  blacklisted_by?: string
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
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<number | string | null>(null)

  // Add Blacklist Modal State
  const [addBlacklistModalOpen, setAddBlacklistModalOpen] = useState(false)
  const [addSearch, setAddSearch] = useState("")
  const [candidateVisitors, setCandidateVisitors] = useState<any[]>([])
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [addReason, setAddReason] = useState("")
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Import / Export State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

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

  // Search candidate visitors to blacklist
  const searchCandidates = async () => {
    if (!addSearch.trim()) return
    setCandidateLoading(true)
    try {
      const res = await api.get("/visitors", {
        params: { search: addSearch, is_blacklisted: "0", per_page: 5 },
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      setCandidateVisitors(list)
    } catch (error) {
      console.error(error)
    } finally {
      setCandidateLoading(false)
    }
  }

  const handleAddBlacklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate) {
      toast.error("Pilih pengunjung yang akan dimasukkan ke blacklist")
      return
    }
    setSubmittingAdd(true)
    try {
      await api.post(`/visitors/${selectedCandidate.id}/blacklist`, {
        reason: addReason,
      })
      toast.success("Pengunjung berhasil dimasukkan ke daftar blacklist")
      setAddBlacklistModalOpen(false)
      setSelectedCandidate(null)
      setAddReason("")
      setAddSearch("")
      setCandidateVisitors([])
      fetchBlacklisted()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal memasukkan ke daftar blacklist")
    } finally {
      setSubmittingAdd(false)
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

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      const res = await api.get("/visitors/blacklisted/template", {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "blacklist_template.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengunduh template.")
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setImportLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await api.post("/visitors/blacklisted/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setImportModalOpen(false)
      setFile(null)
      fetchBlacklisted()
      toast.success(res.data?.message || "Import data blacklist selesai.")
    } catch (error: any) {
      console.error(error)
      toast.error(
        error.response?.data?.message || "Format file import tidak sesuai template."
      )
    } finally {
      setImportLoading(false)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await api.get("/visitors/blacklisted/export", {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `blacklisted_visitors_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("File blacklist berhasil diekspor")
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengekspor data blacklist.")
    } finally {
      setExportLoading(false)
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
          <p className="text-muted-foreground text-sm">
            Daftar individu yang dilarang memasuki kawasan galangan ASL Shipyard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setSelectedCandidate(null)
              setAddReason("")
              setAddSearch("")
              setCandidateVisitors([])
              setAddBlacklistModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Blacklist
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full md:w-1/3">
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
                  <TableHead>Tanggal Blacklist</TableHead>
                  <TableHead>Alasan Blacklist</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    </TableCell>
                  </TableRow>
                ) : visitors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-zinc-500"
                    >
                      Tidak ada pengunjung dalam daftar blacklist.
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
                      <TableCell>{visitor.company || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {visitor.blacklisted_at
                          ? new Date(visitor.blacklisted_at).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <span
                          className="line-clamp-2 text-sm text-red-700 dark:text-red-400 font-medium"
                          title={visitor.blacklist_reason}
                        >
                          {visitor.blacklist_reason || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmUnblacklist(visitor.id)}
                          className="text-emerald-600 hover:text-emerald-700 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                          Cabut Blacklist
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
            hingga {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} total blacklist
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
              disabled={currentPage >= totalPages || totalPages === 0 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Tambah ke Daftar Blacklist */}
      <Dialog open={addBlacklistModalOpen} onOpenChange={setAddBlacklistModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah ke Daftar Blacklist</DialogTitle>
            <DialogDescription>
              Cari data pengunjung dan masukkan alasan pemblokiran akses.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBlacklistSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search_candidate">Cari Pengunjung</Label>
              <div className="flex gap-2">
                <Input
                  id="search_candidate"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Ketik nama atau nomor KTP..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={searchCandidates}
                  disabled={candidateLoading || !addSearch.trim()}
                >
                  {candidateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
                </Button>
              </div>
            </div>

            {/* Candidate Results */}
            {candidateVisitors.length > 0 && (
              <div className="space-y-1.5 rounded-md border p-2">
                <p className="text-xs font-medium text-muted-foreground">Pilih pengunjung:</p>
                {candidateVisitors.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`cursor-pointer rounded p-2 text-sm transition-colors ${
                      selectedCandidate?.id === cand.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-semibold">{cand.name}</p>
                    <p className="text-xs opacity-80">
                      {cand.id_type?.toUpperCase()}: {cand.id_number} ({cand.company || "Independen"})
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedCandidate && (
              <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-xs dark:bg-amber-950/30 text-amber-900 dark:text-amber-300">
                <p className="font-semibold">Pengunjung Terpilih:</p>
                <p>
                  {selectedCandidate.name} ({selectedCandidate.id_number}) - {selectedCandidate.company || "-"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add_reason">Alasan Blacklist *</Label>
              <Textarea
                id="add_reason"
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan atau pelanggaran..."
                rows={3}
                required
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddBlacklistModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!selectedCandidate || !addReason.trim() || submittingAdd}
              >
                {submittingAdd ? "Menyimpan..." : "Blacklist Pengunjung"}
              </Button>
            </div>
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
              kawasan galangan ASL Shipyard.
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

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data Blacklist</DialogTitle>
            <DialogDescription>
              Unggah file spreadsheet untuk memasukkan data blacklist sekaligus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Unduh Template Excel
                </p>
                <p className="text-zinc-500">
                  Format template untuk data blacklist pengunjung.
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
                Unduh
              </Button>
            </div>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import_file">Unggah File Excel</Label>
                <Input
                  id="import_file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                <Button type="submit" disabled={!file || importLoading}>
                  {importLoading ? "Mengimpor..." : "Upload & Import"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
