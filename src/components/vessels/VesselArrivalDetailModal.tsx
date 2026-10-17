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
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react"
import CrewSelectionDialog from "./CrewSelectionDialog"

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
  pivot?: {
    id?: string
    status?: "checked_in" | "checked_out" | string
    checked_in_at?: string | null
    checked_out_at?: string | null
    notes?: string | null
  }
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
    vessel_type?: string | null
    call_sign?: string | null
    flag?: string | null
    port?: string | null
    captain?: string | null
    pic?: string | null
  } | null
  crew?: CrewMember[]
}

interface VesselArrivalDetailModalProps {
  open: boolean
  onClose: () => void
  arrivalId: string | null
  onUpdated?: () => void
}

export default function VesselArrivalDetailModal({
  open,
  onClose,
  arrivalId,
  onUpdated,
}: VesselArrivalDetailModalProps) {
  const [detail, setDetail] = useState<ArrivalDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingCrewId, setProcessingCrewId] = useState<string | null>(null)
  const [addCrewOpen, setAddCrewOpen] = useState(false)

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

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return null
    try {
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) return ts
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ts
    }
  }

  const handleCrewCheckIn = async (crewIds: string[]) => {
    if (!detail || crewIds.length === 0) return
    setProcessingCrewId(crewIds[0])
    try {
      const res = await api.post(`/vessel-arrivals/${detail.id}/crew/check-in`, {
        crew_ids: crewIds,
      })
      setDetail(res.data)
      toast.success("Kru berhasil di-check-in ke kapal.")
      onUpdated?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal melakukan check-in kru.")
    } finally {
      setProcessingCrewId(null)
    }
  }

  const handleCrewCheckOut = async (crewIds: string[]) => {
    if (!detail || crewIds.length === 0) return
    setProcessingCrewId(crewIds[0])
    try {
      const res = await api.post(`/vessel-arrivals/${detail.id}/crew/check-out`, {
        crew_ids: crewIds,
      })
      setDetail(res.data)
      toast.success("Kru berhasil di-check-out dari kapal.")
      onUpdated?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal melakukan check-out kru.")
    } finally {
      setProcessingCrewId(null)
    }
  }

  const isInPort = detail && !detail.sign_out_date
  const checkedInCrew = (detail?.crew || []).filter(
    (c) => c.pivot?.status !== "checked_out"
  )
  const checkedOutCrew = (detail?.crew || []).filter(
    (c) => c.pivot?.status === "checked_out"
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
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
            Rincian informasi kapal, jadwal sandar pelabuhan, keagenan, serta check-in & check-out kru pelaut bertugas.
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-500" />
                  <span>{detail.vessel_name}</span>
                  {detail.vessel?.code && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {detail.vessel.code}
                    </Badge>
                  )}
                  {detail.vessel?.vessel_type && (
                    <Badge variant="secondary" className="text-xs">
                      {detail.vessel.vessel_type}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  {detail.vessel?.call_sign && (
                    <span>
                      Call Sign: <strong>{detail.vessel.call_sign}</strong>
                    </span>
                  )}
                  {detail.vessel?.flag && (
                    <span>
                      Bendera: <strong>{detail.vessel.flag}</strong>
                    </span>
                  )}
                  {detail.vessel?.pic && (
                    <span>
                      Note / PIC: <strong>{detail.vessel.pic}</strong>
                    </span>
                  )}
                </div>
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
                  <div className="font-medium mt-0.5">
                    {detail.captain || detail.vessel?.captain || "-"}
                  </div>
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

            {/* Seksi 3: Manifest Kru Kapal On-Board & Check-In / Check-Out */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Manifest Kru Kapal On-Board
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {detail.crew?.length || 0} Kru
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs">
                    {checkedInCrew.length} Check-In
                  </Badge>
                  {checkedOutCrew.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {checkedOutCrew.length} Check-Out
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {checkedInCrew.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(processingCrewId)}
                      onClick={() => handleCrewCheckOut(checkedInCrew.map((c) => c.id))}
                      className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      Check-Out Semua Kru
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAddCrewOpen(true)}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Check-In / Tambah Kru
                  </Button>
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Nama Kru & ID</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Kebangsaan</TableHead>
                      <TableHead>Buku Pelaut & Sertifikat</TableHead>
                      <TableHead>Status Check-In / Out</TableHead>
                      <TableHead className="text-right">Aksi Kru</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!detail.crew || detail.crew.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-zinc-500 text-sm">
                          Belum ada kru yang tercatat pada transaksi kedatangan ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detail.crew.map((member, idx) => {
                        const isCheckedOut = member.pivot?.status === "checked_out"
                        const isBusy = processingCrewId === member.id

                        return (
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
                            <TableCell>
                              {isCheckedOut ? (
                                <div className="space-y-0.5">
                                  <Badge variant="secondary" className="text-xs">
                                    Check-Out (Turun)
                                  </Badge>
                                  {member.pivot?.checked_out_at && (
                                    <div className="text-[11px] text-zinc-500">
                                      Keluar: {formatTimestamp(member.pivot.checked_out_at)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                                    Check-In (Di Kapal)
                                  </Badge>
                                  {member.pivot?.checked_in_at && (
                                    <div className="text-[11px] text-zinc-500">
                                      Masuk: {formatTimestamp(member.pivot.checked_in_at)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isCheckedOut ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isBusy}
                                  onClick={() => handleCrewCheckIn([member.id])}
                                  className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <LogIn className="h-3 w-3 mr-1" />
                                      Check-In Kru
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isBusy}
                                  onClick={() => handleCrewCheckOut([member.id])}
                                  className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <LogOut className="h-3 w-3 mr-1" />
                                      Check-Out Kru
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
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

        {detail && (
          <CrewSelectionDialog
            open={addCrewOpen}
            onClose={() => setAddCrewOpen(false)}
            locationId={detail.location_id}
            arrivalId={detail.id}
            selectedCrewIds={checkedInCrew.map((c) => c.id)}
            onSave={(crewIds) => {
              if (crewIds.length > 0) {
                handleCrewCheckIn(crewIds)
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
