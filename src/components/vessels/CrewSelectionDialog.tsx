import { useState, useEffect, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  Users,
  ShieldAlert,
  CheckSquare,
  Square,
  FileCheck,
} from "lucide-react"

export interface CrewCandidate {
  id: string
  visitor_no?: string | null
  name: string
  id_type: string
  id_number: string
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
  onSave: (crewIds: string[]) => void
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

  // Sync selected IDs from props
  useEffect(() => {
    setSelectedIds(new Set(selectedCrewIds))
  }, [selectedCrewIds])

  // Load candidates on open
  useEffect(() => {
    if (!open || !locationId) {
      return
    }

    setSearch("")

    async function loadCandidates() {
      setLoading(true)
      try {
        const params: Record<string, string> = {
          location_id: locationId,
        }
        if (arrivalId) {
          params.vessel_arrival_id = arrivalId
        }

        const res = await api.get("/vessel-arrivals/crew-candidates", { params })
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        setCandidates(raw)
      } catch {
        toast.error("Gagal memuat kandidat kru kapal")
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [open, locationId, arrivalId])

  // Filter candidates locally
  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidates
    const q = search.toLowerCase()
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.visitor_no && c.visitor_no.toLowerCase().includes(q)) ||
        (c.id_number && c.id_number.toLowerCase().includes(q)) ||
        (c.seaman_book_no && c.seaman_book_no.toLowerCase().includes(q)) ||
        (c.occupation && c.occupation.toLowerCase().includes(q))
    )
  }, [candidates, search])

  // Handlers
  const handleToggleCrew = (id: string, isBlacklisted: boolean) => {
    if (isBlacklisted) return

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
    const validIds = candidates
      .filter((c) => !c.is_blacklisted)
      .map((c) => c.id)
    setSelectedIds(new Set(validIds))
  }

  const handleClearAll = () => {
    setSelectedIds(new Set())
  }

  const handleApply = () => {
    onSave(Array.from(selectedIds))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Users className="h-5 w-5 text-blue-600" />
            Pilih Manifest Kru Kapal
          </DialogTitle>
          <DialogDescription>
            Pilih anggota kru pelaut yang bertugas pada transaksi sandar kapal ini. Kru dengan status blacklist dilarang dipilih.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar: Search and Selection Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, ID, buku pelaut..."
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              Pilih Semua
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Hapus Pilihan
            </Button>
            <Badge variant="secondary" className="px-2.5 py-1 text-xs">
              {selectedIds.size} Terpilih
            </Badge>
          </div>
        </div>

        {/* Table of Candidates */}
        <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg mt-3">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12 text-center">Pilih</TableHead>
                <TableHead>Nama Kru & No. Visitor</TableHead>
                <TableHead>Jabatan & Kebangsaan</TableHead>
                <TableHead>Buku Pelaut & Sertifikat</TableHead>
                <TableHead>Status / Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memuat kandidat kru kapal...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-zinc-500">
                    Tidak ada kandidat kru yang terdaftar untuk kapal ini.
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
                          ? "bg-red-50/60 dark:bg-red-950/20 text-zinc-400"
                          : isSelected
                          ? "bg-blue-50/40 dark:bg-blue-950/20"
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
                        </div>
                        <div className="text-xs text-zinc-500">
                          {candidate.visitor_no ? `ID: ${candidate.visitor_no}` : ""}
                          {candidate.id_number ? ` • ${candidate.id_type.toUpperCase()}: ${candidate.id_number}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{candidate.occupation || "-"}</div>
                        <div className="text-xs text-zinc-500">{candidate.nationality || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono">
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
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 flex items-center gap-1 w-fit">
                              <ShieldAlert className="h-3 w-3" />
                              BLACKLIST
                            </Badge>
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                              {candidate.blacklist_reason || "Dilarang bertugas"}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200">
                            Aktif
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
  )
}
