import { useState, useRef } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Loader2,
  ArrowRight,
} from "lucide-react"

export interface ImportColumnDef {
  key: string
  label: string
  render?: (row: Record<string, unknown>) => React.ReactNode
}

export interface PreviewRow extends Record<string, unknown> {
  _row?: number
  _status?: "new" | "duplicate" | "error"
  _error?: string
  _identifier?: string
}

export interface DuplicateItem {
  row_number: number
  identifier: string
  existing_data: Record<string, unknown> | null
  new_data: Record<string, unknown>
}

export interface ErrorItem {
  row_number: number
  message: string
  data: Record<string, unknown>
}

export interface FailedItem {
  row_number: number
  identifier: string
  reason: string
}

interface MasterImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  templateEndpoint: string
  templateFileName: string
  previewEndpoint: string
  importEndpoint: string
  columns: ImportColumnDef[]
  onSuccess: () => void
}

type Step = "select" | "preview" | "summary"

export default function MasterImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateEndpoint,
  templateFileName,
  previewEndpoint,
  importEndpoint,
  columns,
  onSuccess,
}: MasterImportDialogProps) {
  const [step, setStep] = useState<Step>("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  // Preview Data
  const [previewData, setPreviewData] = useState<{
    total_rows: number
    preview: PreviewRow[]
    duplicates: DuplicateItem[]
    duplicate_count: number
    new_count: number
    error_count: number
    errors: ErrorItem[]
  } | null>(null)

  // Duplicate Resolution Mode: 'update' | 'replace'
  const [duplicateAction, setDuplicateAction] = useState<"update" | "replace">("update")
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false)

  // Result Summary Data
  const [summaryData, setSummaryData] = useState<{
    message: string
    total: number
    success: number
    created: number
    updated: number
    replaced: number
    failed: number
    failed_details: FailedItem[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    setStep("select")
    setSelectedFile(null)
    setPreviewData(null)
    setSummaryData(null)
    setShowDuplicatesOnly(false)
    setDuplicateAction("update")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const response = await api.get(templateEndpoint, {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", templateFileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Template Excel berhasil diunduh.")
    } catch (error) {
      console.error(error)
      toast.error("Gagal mengunduh template Excel.")
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleProcessPreview = async () => {
    if (!selectedFile) {
      toast.error("Silakan pilih file Excel/CSV terlebih dahulu.")
      return
    }

    setLoadingPreview(true)
    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await api.post(previewEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPreviewData(res.data)
      setStep("preview")
      toast.success(
        `Pratinjau selesai: ${res.data.total_rows} data ditemukan (${res.data.duplicate_count} duplikat, ${res.data.new_count} baru).`
      )
    } catch (error: unknown) {
      console.error(error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      const msg = maybeAxios.response?.data?.message || "Gagal memproses pratinjau file."
      toast.error(msg)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleExecuteImport = async () => {
    if (!selectedFile) return

    setLoadingImport(true)
    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("duplicate_action", duplicateAction)

    try {
      const res = await api.post(importEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setSummaryData(res.data)
      setStep("summary")
      onSuccess()
      toast.success("Proses import selesai.")
    } catch (error: unknown) {
      console.error(error)
      const maybeAxios = error as { response?: { data?: { message?: string } } }
      const msg = maybeAxios.response?.data?.message || "Gagal mengeksekusi import data."
      toast.error(msg)
    } finally {
      setLoadingImport(false)
    }
  }

  const displayedPreviewRows = previewData?.preview.filter((row) => {
    if (showDuplicatesOnly) {
      return row._status === "duplicate"
    }
    return true
  }) || []

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-h-[88vh] sm:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || "Unggah data secara massal menggunakan file Excel (.xlsx / .csv)."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b pb-3 text-xs font-medium text-zinc-500 dark:border-zinc-800">
          <div className={`flex items-center gap-1.5 ${step === "select" ? "text-blue-600 font-semibold dark:text-blue-400" : ""}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px]">1</span>
            Pilih File & Template
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
          <div className={`flex items-center gap-1.5 ${step === "preview" ? "text-blue-600 font-semibold dark:text-blue-400" : ""}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px]">2</span>
            Pratinjau & Aturan Duplikat
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
          <div className={`flex items-center gap-1.5 ${step === "summary" ? "text-blue-600 font-semibold dark:text-blue-400" : ""}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px]">3</span>
            Ringkasan Hasil
          </div>
        </div>

        {/* STEP 1: SELECT FILE */}
        {step === "select" && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    Unduh Format Template
                  </h4>
                  <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
                    Pastikan kolom file Anda sesuai dengan header template agar data dapat terbaca dengan sempurna.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="bg-white dark:bg-zinc-900 shrink-0"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Unduh Template (.xlsx)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-excel-file" className="text-xs font-semibold">
                Pilih File Spreadsheet Excel / CSV
              </Label>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-6 text-center hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
                <Upload className="mb-2 h-8 w-8 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {selectedFile ? selectedFile.name : "Klik atau seret file ke sini"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Format yang didukung: .xlsx, .xls, .csv (Maksimal 5MB)
                </p>
                <input
                  id="import-excel-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 cursor-pointer"
                >
                  {selectedFile ? "Ganti File" : "Pilih File dari Komputer"}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleProcessPreview}
                disabled={!selectedFile || loadingPreview}
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Membaca Data...
                  </>
                ) : (
                  <>
                    Lanjut ke Pratinjau
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & DUPLICATE MODAL */}
        {step === "preview" && previewData && (
          <div className="space-y-4 py-2">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500">Total Baris File</div>
                <div className="text-lg font-bold">{previewData.total_rows}</div>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                <div className="text-xs text-emerald-700 dark:text-emerald-400">Data Baru</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {previewData.new_count}
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-950 dark:bg-amber-950/20">
                <div className="text-xs text-amber-700 dark:text-amber-400">Data Duplikat</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {previewData.duplicate_count}
                </div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50/50 p-3 dark:border-red-950 dark:bg-red-950/20">
                <div className="text-xs text-red-700 dark:text-red-400">Format Error</div>
                <div className="text-lg font-bold text-red-700 dark:text-red-400">
                  {previewData.error_count}
                </div>
              </div>
            </div>

            {/* Duplicate Notice & Action Selection (Tahap 3 Requirement) */}
            {previewData.duplicate_count > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-3 flex-1">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Perhatian: Ditemukan {previewData.duplicate_count} Data yang Sudah Ada di Sistem
                      </h4>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                        Tentukan tindakan yang ingin Anda terapkan terhadap data yang sudah terdaftar sebelumnya:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <label
                        className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                          duplicateAction === "update"
                            ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:bg-zinc-900"
                            : "border-amber-200 bg-amber-100/40 hover:bg-white dark:border-amber-800/50 dark:bg-zinc-900/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicate_action"
                          value="update"
                          checked={duplicateAction === "update"}
                          onChange={() => setDuplicateAction("update")}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            Update (Perbarui Data Lama)
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Hanya memperbarui kolom/atribut yang terisi dari Excel tanpa menghapus histori data.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                          duplicateAction === "replace"
                            ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:bg-zinc-900"
                            : "border-amber-200 bg-amber-100/40 hover:bg-white dark:border-amber-800/50 dark:bg-zinc-900/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicate_action"
                          value="replace"
                          checked={duplicateAction === "replace"}
                          onChange={() => setDuplicateAction("replace")}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            Replace (Ganti Data Lama Sepenuhnya)
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Mengganti seluruh atribut data lama dengan data baru dari file Excel.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                        className="h-7 text-xs text-amber-900 dark:text-amber-200 underline p-0 hover:bg-transparent"
                      >
                        {showDuplicatesOnly
                          ? "Tampilkan Semua Data File"
                          : `Tampilkan Khusus ${previewData.duplicate_count} Data Duplikat Saja`}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Pratinjau Data ({displayedPreviewRows.length} baris ditampilkan):
                </span>
                {showDuplicatesOnly && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    Filter: Duplikat Saja
                  </Badge>
                )}
              </div>

              <div className="max-h-60 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                <Table className="text-xs">
                  <TableHeader className="bg-zinc-50 sticky top-0 dark:bg-zinc-900">
                    <TableRow>
                      <TableHead className="w-12 text-center">Baris</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      {columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedPreviewRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length + 2} className="h-20 text-center text-zinc-500">
                          Tidak ada data yang ditampilkan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedPreviewRows.map((row, idx) => (
                        <TableRow
                          key={idx}
                          className={
                            row._status === "duplicate"
                              ? "bg-amber-50/40 dark:bg-amber-950/20"
                              : row._status === "error"
                              ? "bg-red-50/40 dark:bg-red-950/20"
                              : ""
                          }
                        >
                          <TableCell className="text-center font-mono text-zinc-400">
                            {row._row || idx + 2}
                          </TableCell>
                          <TableCell>
                            {row._status === "new" && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px]">
                                Baru
                              </Badge>
                            )}
                            {row._status === "duplicate" && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none text-[10px]">
                                Duplikat
                              </Badge>
                            )}
                            {row._status === "error" && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-none text-[10px]">
                                Error
                              </Badge>
                            )}
                          </TableCell>
                          {columns.map((col) => (
                            <TableCell key={col.key} className="max-w-[200px] truncate">
                              {col.render ? col.render(row) : (row[col.key] ?? "-")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setStep("select")}>
                Kembali & Pilih File Lain
              </Button>
              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={loadingImport || previewData.total_rows === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loadingImport ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Menyimpan Data...
                  </>
                ) : (
                  <>
                    Lanjutkan & Eksekusi Simpan
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT SUMMARY */}
        {step === "summary" && summaryData && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
              <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Import Selesai Diproses
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {summaryData.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500">Total Diproses</div>
                <div className="text-xl font-bold">{summaryData.total}</div>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                <div className="text-xs text-emerald-700 dark:text-emerald-400">Berhasil Disimpan</div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {summaryData.success}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Baru: {summaryData.created} | Update: {summaryData.updated} | Ganti: {summaryData.replaced}
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-950 dark:bg-amber-950/20">
                <div className="text-xs text-amber-700 dark:text-amber-400">Diperbarui / Diganti</div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {summaryData.updated + summaryData.replaced}
                </div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50/50 p-3 dark:border-red-950 dark:bg-red-950/20">
                <div className="text-xs text-red-700 dark:text-red-400">Gagal / Ditolak</div>
                <div className="text-xl font-bold text-red-700 dark:text-red-400">
                  {summaryData.failed}
                </div>
              </div>
            </div>

            {/* Error details table if any failed */}
            {summaryData.failed > 0 && summaryData.failed_details.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <XCircle className="h-4 w-4" />
                  Rincian Baris yang Gagal ({summaryData.failed_details.length}):
                </div>
                <div className="max-h-40 overflow-auto rounded-md border border-red-200 bg-red-50/30 p-2 dark:border-red-950 dark:bg-red-950/20">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Baris</TableHead>
                        <TableHead className="w-32">Identitas</TableHead>
                        <TableHead>Alasan / Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.failed_details.map((fail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-zinc-500">
                            #{fail.row_number}
                          </TableCell>
                          <TableCell className="font-medium">
                            {fail.identifier}
                          </TableCell>
                          <TableCell className="text-red-700 dark:text-red-400">
                            {fail.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t dark:border-zinc-800">
              <Button type="button" onClick={handleClose}>
                Tutup & Selesai
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
