import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Search,
  Loader2,
  Users,
  ShieldAlert,
  CheckSquare,
  Square,
  FileCheck,
  UserPlus,
  Ship,
  Building2,
  CheckCircle2,
} from "lucide-react"

export interface CrewCandidate {
  id: string
  visitor_no?: string | null
  name: string
  id_type: string
  id_number: string
  company?: string | null
  gender?: string | null
  occupation?: string | null
  nationality?: string | null
  certificate?: string | null
  certificate_no?: string | null
  seaman_book_no?: string | null
  is_blacklisted: boolean
  blacklist_reason?: string | null
}

interface CrewSelectionDialogProps {
  open: boolean
  onClose: () => void
  locationId: string
  arrivalId?: string
  selectedCrewIds: string[]
  onSave: (crewIds: string[], crewObjects?: CrewCandidate[]) => void
}

export default function CrewSelectionDialog({
  open,
  onClose,
  locationId,
  arrivalId,
  selectedCrewIds,
  onSave,
}: CrewSelectionDialogProps) {
  const [candidates, setCandidates] = useState<CrewCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Inline "Tambah Kru Baru" state
  const [newCrewOpen, setNewCrewOpen] = useState(false)
  const [creatingCrew, setCreatingCrew] = useState(false)
  const [newCrewForm, setNewCrewForm] = useState({
    name: "",
    id_type: "ktp",
    id_number: "",
    company: "",
    occupation: "",
    seaman_book_no: "",
  })
  const [newCrewErrors, setNewCrewErrors] = useState<Record<string, string>>({})

  // Debounce ref for remote search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync selected IDs from props (compare joined string to avoid resetting on inline array props)
  const selectedCrewKey = selectedCrewIds.join(",")
  useEffect(() => {
    setSelectedIds(new Set(selectedCrewIds))
  }, [selectedCrewKey])

  // Fetch candidates from API
  const fetchCandidates = async (query = "") => {
    if (!locationId) return
    setLoading(true)
    try {
      const params: Record<string, string> = {
        location_id: locationId,
      }
      if (arrivalId) {
        params.vessel_arrival_id = arrivalId
      }
      if (query.trim()) {
        params.search = query.trim()
      }

      const res = await api.get("/vessel-arrivals/crew-candidates", { params })
      const raw: CrewCandidate[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])

      setCandidates((prev) => {
        // Keep any previously selected candidates that might not be in the current search query
        const existingMap = new Map(prev.map((c) => [c.id, c]))
        raw.forEach((c) => existingMap.set(c.id, c))
        return Array.from(existingMap.values())
      })
    } catch {
      toast.error("Gagal memuat kandidat kru kapal")
    } finally {
      setLoading(false)
    }
  }

  // Load candidates on dialog open
  useEffect(() => {
    if (!open || !locationId) {
      return
    }

    setSearch("")
    fetchCandidates("")
  }, [open, locationId, arrivalId])

  // Trigger search with debounce
  useEffect(() => {
    if (!open || !locationId) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (search.trim()) {
        fetchCandidates(search.trim())
      }
    }, 400)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [search, open, locationId])

  // Filter candidates locally for snappy response
  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidates
    const q = search.toLowerCase()
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.visitor_no && String(c.visitor_no).toLowerCase().includes(q)) ||
        (c.id_number && c.id_number.toLowerCase().includes(q)) ||
        (c.seaman_book_no && c.seaman_book_no.toLowerCase().includes(q)) ||
        (c.occupation && c.occupation.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    )
  }, [candidates, search])

  // Handlers
  const handleToggleCrew = (id: string, isBlacklisted: boolean) => {
    if (isBlacklisted) {
      toast.error("Kru dengan status blacklist tidak dapat dipilih")
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const validFilteredIds = filteredCandidates
      .filter((c) => !c.is_blacklisted)
      .map((c) => c.id)

    setSelectedIds((prev) => {
      const next = new Set(prev)
      validFilteredIds.forEach((id) => next.add(id))
      return next
    })
    toast.info(`${validFilteredIds.length} kru ditambahkan ke pilihan`)
  }

  const handleClearAll = () => {
    setSelectedIds(new Set())
    toast.info("Pilihan kru telah dikosongkan")
  }

  const handleApply = () => {
    const validSelectedIds = Array.from(selectedIds).filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null"
    )
    const selectedList = candidates.filter((c) => validSelectedIds.includes(c.id))
    onSave(validSelectedIds, selectedList)
    toast.success(`${validSelectedIds.length} kru kapal berhasil diterapkan ke manifest`)
    onClose()
  }

  // Handle inline "Tambah Kru Baru"
  const handleOpenNewCrew = () => {
    setNewCrewForm({
      name: "",
      id_type: "ktp",
      id_number: "",
      company: "",
      occupation: "",
      seaman_book_no: "",
    })
    setNewCrewErrors({})
    setNewCrewOpen(true)
  }

  const handleCreateCrewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!newCrewForm.name.trim()) {
      errors.name = "Nama lengkap kru wajib diisi."
    }
    if (!newCrewForm.id_number.trim()) {
      errors.id_number = "Nomor identitas kru wajib diisi."
    }

    if (Object.keys(errors).length > 0) {
      setNewCrewErrors(errors)
      return
    }

    setCreatingCrew(true)
    try {
      const payload = {
        name: newCrewForm.name.trim(),
        id_type: newCrewForm.id_type,
        id_number: newCrewForm.id_number.trim(),
        company: newCrewForm.company.trim() || null,
        occupation: newCrewForm.occupation.trim() || null,
        seaman_book_no: newCrewForm.seaman_book_no.trim() || null,
        visitor_type: "crew",
        vessel_id: locationId || null,
      }

      const res = await api.post("/visitors", payload)
      const createdData = res.data?.visitor || res.data?.data || res.data

      if (!createdData || !createdData.id) {
        throw new Error("Gagal mendapatkan ID kru baru dari server")
      }

      const newCandidate: CrewCandidate = {
        id: String(createdData.id),
        visitor_no: createdData.visitor_no || null,
        name: createdData.name || newCrewForm.name.trim(),
        id_type: createdData.id_type || newCrewForm.id_type,
        id_number: createdData.id_number || newCrewForm.id_number.trim(),
        company: createdData.company || newCrewForm.company.trim() || null,
        occupation: createdData.occupation || newCrewForm.occupation.trim() || null,
        nationality: createdData.nationality || "Indonesia",
        certificate: createdData.certificate || null,
        certificate_no: createdData.certificate_no || null,
        seaman_book_no: createdData.seaman_book_no || newCrewForm.seaman_book_no.trim() || null,
        is_blacklisted: false,
        blacklist_reason: null,
      }

      setCandidates((prev) => [newCandidate, ...prev.filter((c) => c.id !== newCandidate.id)])
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.add(newCandidate.id)
        return next
      })
      setNewCrewOpen(false)
      toast.success(`Kru baru "${newCandidate.name}" berhasil ditambahkan dan otomatis dipilih.`)
    } catch (err: any) {
      console.error(err)
      const backendErrors = err.response?.data?.errors
      if (backendErrors) {
        const formatted: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(backendErrors)) {
          if (Array.isArray(msgs)) formatted[key] = msgs[0]
        }
        setNewCrewErrors(formatted)
      }
      toast.error(err.response?.data?.message || "Gagal menambahkan kru baru.")
    } finally {
      setCreatingCrew(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-blue-600" />
              Pilih Manifest Kru Kapal
            </DialogTitle>
            <DialogDescription>
              Pilih anggota kru pelaut yang bertugas pada transaksi sandar kapal ini. Kru dengan status blacklist dilarang dipilih.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar: Search, Actions, New Crew Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, ID, perusahaan, buku pelaut..."
                className="pl-9 h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1 text-blue-600" />
                Pilih Semua
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                <Square className="h-3.5 w-3.5 mr-1 text-zinc-500" />
                Hapus Pilihan
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenNewCrew}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Tambah Kru Baru
              </Button>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
                {selectedIds.size} Terpilih
              </Badge>
            </div>
          </div>

          {/* Inline Form: Tambah Kru Baru */}
          {newCrewOpen && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3.5 space-y-3 mt-1">
              <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Tambah Kru Baru Langsung
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewCrewOpen(false)}
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Tutup form kru baru"
                >
                  ✕
                </Button>
              </div>

              <form onSubmit={handleCreateCrewSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="inline_name">
                    Nama Lengkap Kru <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="inline_name"
                    value={newCrewForm.name}
                    onChange={(e) => setNewCrewForm({ ...newCrewForm, name: e.target.value })}
                    placeholder="Contoh: Muhammad Santoso"
                    className="mt-1 bg-white dark:bg-zinc-800"
                    autoFocus
                  />
                  {newCrewErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{newCrewErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label htmlFor="inline_id_type">
                      Tipe ID <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="inline_id_type"
                      value={newCrewForm.id_type}
                      onChange={(e) => setNewCrewForm({ ...newCrewForm, id_type: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                    >
                      <option value="ktp">KTP</option>
                      <option value="passport">Paspor</option>
                      <option value="sim">SIM</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="inline_id_number">
                      Nomor Identitas <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inline_id_number"
                      value={newCrewForm.id_number}
                      onChange={(e) => setNewCrewForm({ ...newCrewForm, id_number: e.target.value })}
                      placeholder="Nomor identitas..."
                      className="mt-1 bg-white dark:bg-zinc-800"
                    />
                    {newCrewErrors.id_number && (
                      <p className="text-xs text-red-500 mt-1">{newCrewErrors.id_number}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="inline_company">Perusahaan Pelayaran / Instansi</Label>
                  <Input
                    id="inline_company"
                    value={newCrewForm.company}
                    onChange={(e) => setNewCrewForm({ ...newCrewForm, company: e.target.value })}
                    placeholder="Contoh: PT. Pelayaran Nasional"
                    className="mt-1 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label htmlFor="inline_occupation">Jabatan / Pangkat</Label>
                    <Input
                      id="inline_occupation"
                      value={newCrewForm.occupation}
                      onChange={(e) => setNewCrewForm({ ...newCrewForm, occupation: e.target.value })}
                      placeholder="Contoh: Oiler, AB, Bosun"
                      className="mt-1 bg-white dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="inline_seaman">Buku Pelaut (Seaman Book)</Label>
                    <Input
                      id="inline_seaman"
                      value={newCrewForm.seaman_book_no}
                      onChange={(e) => setNewCrewForm({ ...newCrewForm, seaman_book_no: e.target.value })}
                      placeholder="Contoh: SB-12345"
                      className="mt-1 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewCrewOpen(false)}
                    disabled={creatingCrew}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingCrew}
                    onClick={handleCreateCrewSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {creatingCrew ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Simpan & Pilih Kru
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Table of Candidates */}
          <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg mt-3">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">Pilih</TableHead>
                  <TableHead>Nama Kru & No. Visitor</TableHead>
                  <TableHead>Jabatan & Kebangsaan</TableHead>
                  <TableHead>Perusahaan & Buku Pelaut</TableHead>
                  <TableHead>Status / Penanda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        Memuat kandidat kru kapal...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-4">
                        <Ship className="h-8 w-8 text-zinc-400 stroke-[1.5]" />
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">
                          {search.trim()
                            ? `Tidak ada kru yang cocok dengan kata kunci "${search}".`
                            : "Belum ada kandidat kru yang terdaftar untuk kapal ini."}
                        </p>
                        <p className="text-xs text-zinc-400 max-w-sm">
                          Anda dapat menambahkan kru baru secara langsung tanpa perlu meninggalkan formulir ini.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleOpenNewCrew}
                          className="mt-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Tambah Kru Sekarang
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = selectedIds.has(candidate.id)
                    const isBlacklisted = candidate.is_blacklisted

                    return (
                      <TableRow
                        key={candidate.id}
                        className={
                          isBlacklisted
                            ? "bg-red-50/70 dark:bg-red-950/20 text-zinc-400"
                            : isSelected
                            ? "bg-blue-50/50 dark:bg-blue-950/20"
                            : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50"
                        }
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            aria-label={`Pilih kru ${candidate.name}`}
                            checked={isSelected}
                            disabled={isBlacklisted}
                            onChange={() => handleToggleCrew(candidate.id, isBlacklisted)}
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {candidate.name}
                            {isSelected && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 inline shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {candidate.visitor_no ? `ID: ${candidate.visitor_no}` : ""}
                            {candidate.id_number
                              ? ` • ${candidate.id_type?.toUpperCase() || "ID"}: ${candidate.id_number}`
                              : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{candidate.occupation || "-"}</div>
                          <div className="text-xs text-zinc-500">{candidate.nationality || "Indonesia"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-zinc-400" />
                            {candidate.company || "-"}
                          </div>
                          <div className="text-xs font-mono text-zinc-500 mt-0.5">
                            {candidate.seaman_book_no ? `Buku: ${candidate.seaman_book_no}` : "-"}
                          </div>
                          {candidate.certificate_no && (
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <FileCheck className="h-3 w-3 text-emerald-600" />
                              {candidate.certificate_no} {candidate.certificate ? `(${candidate.certificate})` : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isBlacklisted ? (
                            <div className="space-y-1">
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 flex items-center gap-1 w-fit text-xs font-semibold">
                                <ShieldAlert className="h-3 w-3 text-red-600" />
                                BLACKLIST
                              </Badge>
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {candidate.blacklist_reason || "Dilarang bertugas di kapal"}
                              </p>
                            </div>
                          ) : isSelected ? (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 flex items-center gap-1 w-fit text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3 text-blue-600" />
                              Terpilih
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200 text-xs">
                              Siap Ditugaskan
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-700 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Terapkan Kru ({selectedIds.size} Terpilih)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
