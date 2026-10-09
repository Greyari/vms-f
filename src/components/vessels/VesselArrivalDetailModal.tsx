import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Ship,
  Loader2,
  Calendar,
  MapPin,
  User,
  Users,
  Building,
  FileCheck,
} from "lucide-react"

interface CrewMember {
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
}

interface ArrivalDetail {
  id: string
  location_id: string
  vessel_name: string
  sign_in_date: string
  sign_out_date?: string | null
  sign_in_port?: string | null
  sign_out_port?: string | null
  captain?: string | null
  local_agent_company?: string | null
  local_agent_name?: string | null
  local_agent_phone?: string | null
  local_agent_location?: string | null
  foreign_agent_company?: string | null
  foreign_agent_name?: string | null
  foreign_agent_phone?: string | null
  foreign_agent_location?: string | null
  vessel?: {
    id: string
    name: string
    code?: string | null
    type: string
    call_sign?: string | null
    flag?: string | null
    port?: string | null
  } | null
  crew?: CrewMember[]
}

interface VesselArrivalDetailModalProps {
  open: boolean
  onClose: () => void
  arrivalId: string | null
}

export default function VesselArrivalDetailModal({
  open,
  onClose,
  arrivalId,
}: VesselArrivalDetailModalProps) {
  const [detail, setDetail] = useState<ArrivalDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !arrivalId) {
      setDetail(null)
      return
    }

    async function loadDetail() {
      setLoading(true)
      try {
        const res = await api.get(`/vessel-arrivals/${arrivalId}`)
        setDetail(res.data)
      } catch {
        toast.error("Gagal memuat detail kedatangan kapal")
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [open, arrivalId])

  const isInPort = detail && !detail.sign_out_date

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Ship className="h-5 w-5 text-blue-600" />
              Detail Kedatangan Kapal: {detail?.vessel_name || "Memuat..."}
            </DialogTitle>
            {detail && (
              <div>
                {isInPort ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                    Sedang Sandar (In Port)
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Sudah Berangkat (Departed)
                  </Badge>
                )}
              </div>
            )}
          </div>
          <DialogDescription>
            Rincian informasi kapal, jadwal sandar pelabuhan, keagenan, dan manifest kru pelaut bertugas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Memuat detail transaksi kapal...
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center py-16 text-zinc-500">
            Data kedatangan kapal tidak ditemukan.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pt-2 pr-1">
            {/* Seksi 1: Info Kapal & Rute */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-500" />
                  <span>{detail.vessel_name}</span>
                  {detail.vessel?.code && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {detail.vessel.code}
                    </Badge>
                  )}
                </div>
                {detail.vessel?.flag && (
                  <span className="text-xs text-zinc-500">
                    Bendera: <strong>{detail.vessel.flag}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Masuk (Sign-In)
                  </div>
                  <div className="font-medium mt-0.5">{detail.sign_in_date}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    Dari: {detail.sign_in_port || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Keluar (Sign-Out)
                  </div>
                  <div className="font-medium mt-0.5">{detail.sign_out_date || "Belum Berangkat"}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    Ke: {detail.sign_out_port || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Nakhoda / Captain
                  </div>
                  <div className="font-medium mt-0.5">{detail.captain || "-"}</div>
                </div>
              </div>
            </div>

            {/* Seksi 2: Informasi Keagenan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  Agen Lokal (Indonesia)
                </div>
                <div className="text-sm font-medium">{detail.local_agent_company || "-"}</div>
                <div className="text-xs text-zinc-500">
                  PIC: {detail.local_agent_name || "-"} • Telp: {detail.local_agent_phone || "-"}
                </div>
                {detail.local_agent_location && (
                  <div className="text-xs text-zinc-400">Lokasi: {detail.local_agent_location}</div>
                )}
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  Agen Luar Negeri (Foreign)
                </div>
                <div className="text-sm font-medium">{detail.foreign_agent_company || "-"}</div>
                <div className="text-xs text-zinc-500">
                  PIC: {detail.foreign_agent_name || "-"} • Telp: {detail.foreign_agent_phone || "-"}
                </div>
                {detail.foreign_agent_location && (
                  <div className="text-xs text-zinc-400">Lokasi: {detail.foreign_agent_location}</div>
                )}
              </div>
            </div>

            {/* Seksi 3: Manifest Kru Kapal On-Board */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Manifest Kru Kapal On-Board
                </h4>
                <Badge variant="outline" className="text-xs">
                  {detail.crew?.length || 0} Kru
                </Badge>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Nama Kru & ID</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Kebangsaan</TableHead>
                      <TableHead>Buku Pelaut & Sertifikat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!detail.crew || detail.crew.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-zinc-500 text-sm">
                          Belum ada kru yang tercatat pada transaksi kedatangan ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.crew.map((member, idx) => (
                        <TableRow key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                          <TableCell className="text-center text-xs text-zinc-500">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                              {member.name}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {member.visitor_no ? `ID: ${member.visitor_no}` : ""}
                              {member.id_number ? ` • ${member.id_type?.toUpperCase()}: ${member.id_number}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{member.occupation || "-"}</TableCell>
                          <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                            {member.nationality || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-mono">
                              {member.seaman_book_no ? `Buku: ${member.seaman_book_no}` : "-"}
                            </div>
                            {member.certificate_no && (
                              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                <FileCheck className="h-3 w-3 text-emerald-600" />
                                {member.certificate_no}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
