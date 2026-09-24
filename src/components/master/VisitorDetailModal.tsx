import { useState, useEffect, useCallback } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  AlertTriangle,
  User,
  History,
  Building,
  Anchor,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"

interface VisitRecord {
  id: number | string
  ticket_no: string
  check_in_at: string
  check_out_at?: string | null
  status: string
  location?: { name: string }
  location_name?: string
  staff?: { name: string }
  host_name?: string
  purpose?: string
}

interface VisitorProfile {
  id: number | string
  visitor_no?: string
  id_type: string
  id_number: string
  name: string
  company?: string
  occupation?: string
  pob?: string
  dob?: string
  gender?: string
  nationality?: string
  phone?: string
  email?: string
  address?: string
  visitor_type?: string
  is_blacklisted: boolean
  blacklist_reason?: string
  blacklisted_at?: string
  certificate_no?: string
  seaman_book_no?: string
  vessel?: { id: number | string; name: string }
  vessel_name?: string
  visits?: VisitRecord[]
}

interface VisitorDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitorId: string | number | null
}

export default function VisitorDetailModal({
  open,
  onOpenChange,
  visitorId,
}: VisitorDetailModalProps) {
  const [visitor, setVisitor] = useState<VisitorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile")

  const fetchVisitorDetail = useCallback(async () => {
    if (!visitorId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/visitors/${visitorId}`)
      // Respons bisa langsung object atau dibungkus { data: ... }
      const data = res.data?.data ? res.data.data : res.data
      setVisitor(data)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || "Gagal memuat profil pengunjung")
    } finally {
      setLoading(false)
    }
  }, [visitorId])

  useEffect(() => {
    if (open && visitorId) {
      setActiveTab("profile")
      fetchVisitorDetail()
    } else {
      setVisitor(null)
    }
  }, [open, visitorId, fetchVisitorDetail])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Detail Profil Pengunjung</DialogTitle>
            {visitor?.visitor_type && (
              <Badge variant="outline" className="capitalize">
                {visitor.visitor_type}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Informasi lengkap dan riwayat kunjungan pengunjung ID: {visitorId}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        ) : !visitor ? (
          <div className="py-8 text-center text-zinc-500">
            Data pengunjung tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Banner Blacklist jika diblacklist */}
            {visitor.is_blacklisted && (
              <div className="rounded-lg border border-red-500/40 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="font-semibold text-sm">
                      Pengunjung ini berada dalam daftar blacklist!
                    </h4>
                    <p className="mt-1 text-xs">
                      <span className="font-medium">Alasan:</span> {visitor.blacklist_reason || "Tidak disebutkan."}
                    </p>
                    {visitor.blacklisted_at && (
                      <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">
                        Waktu blacklist: {new Date(visitor.blacklisted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div role="tablist" className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Informasi Profil
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-4 w-4" />
                Riwayat Kunjungan ({visitor.visits?.length || 0})
              </button>
            </div>

            {/* Tab Content: Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6 pt-2">
                {/* Identitas Diri */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                    <User className="h-4 w-4 text-primary" />
                    Identitas Pribadi
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nomor Visitor</p>
                      <p className="font-mono font-medium text-sm text-primary">
                        {visitor.visitor_no || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                      <p className="font-medium text-sm">{visitor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipe & Nomor Identitas</p>
                      <p className="font-mono text-sm">
                        <span className="font-semibold uppercase">{visitor.id_type}</span>: <span>{visitor.id_number}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempat / Tanggal Lahir</p>
                      <p className="text-sm">
                        {visitor.pob || "-"}, {visitor.dob || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
                      <p className="text-sm">
                        {visitor.gender === "M"
                          ? "Laki-laki (M)"
                          : visitor.gender === "F"
                          ? "Perempuan (F)"
                          : visitor.gender || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Kewarganegaraan</p>
                      <p className="text-sm">{visitor.nationality || "Indonesia"}</p>
                    </div>
                  </div>
                </div>

                {/* Perusahaan & Kontak */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                    <Building className="h-4 w-4 text-primary" />
                    Perusahaan & Kontak
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Perusahaan / Instansi</p>
                      <p className="font-medium text-sm">{visitor.company || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jabatan / Posisi</p>
                      <p className="text-sm">{visitor.occupation || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nomor Telepon</p>
                      <p className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {visitor.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {visitor.email || "-"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Alamat Domisili</p>
                      <p className="flex items-start gap-1.5 text-sm">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {visitor.address || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dokumen Maritim (jika kru atau data tersedia) */}
                {(visitor.visitor_type === "crew" ||
                  visitor.certificate_no ||
                  visitor.seaman_book_no ||
                  visitor.vessel ||
                  visitor.vessel_name) && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-900 text-sm dark:text-blue-300">
                      <Anchor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Dokumen Maritim & Kru Kapal
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">No. Sertifikat Keahlian</p>
                        <p className="font-mono font-medium text-sm">
                          {visitor.certificate_no || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Buku Pelaut (Seaman Book)</p>
                        <p className="font-mono font-medium text-sm">
                          {visitor.seaman_book_no || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kapal Bertugas</p>
                        <p className="font-medium text-sm">
                          {visitor.vessel?.name || visitor.vessel_name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: History */}
            {activeTab === "history" && (
              <div className="space-y-4 pt-2">
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                      <TableRow>
                        <TableHead>No. Tiket</TableHead>
                        <TableHead>Waktu Masuk</TableHead>
                        <TableHead>Waktu Keluar</TableHead>
                        <TableHead>Lokasi Tujuan</TableHead>
                        <TableHead>Host PIC</TableHead>
                        <TableHead>Keperluan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!visitor.visits || visitor.visits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                            Belum ada riwayat kunjungan untuk pengunjung ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        visitor.visits.map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell className="font-mono text-xs font-medium text-primary">
                              {visit.ticket_no}
                            </TableCell>
                            <TableCell className="text-xs">
                              {visit.check_in_at ? new Date(visit.check_in_at).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {visit.check_out_at ? (
                                new Date(visit.check_out_at).toLocaleString()
                              ) : (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  Masih Aktif
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {visit.location?.name || visit.location_name || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {visit.staff?.name || visit.host_name || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {visit.purpose || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
