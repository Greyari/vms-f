import { useState, useEffect, useCallback } from "react"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"
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
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
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

interface BlacklistHistoryItem {
  id: number | string
  badge_code?: string
  offences?: string
  date?: string
  blacklisted_at?: string
  remark?: string
  company?: string
  is_active: boolean
  unblacklisted_at?: string | null
}

interface VisitorProfile {
  id: number | string
  visitor_no?: string | number
  id_type: string
  id_number: string
  name: string
  company?: string
  occupation?: string
  pob?: string
  dob?: string
  birth_place?: string
  birth_date?: string
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
  blacklists?: BlacklistHistoryItem[]
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
  const { t } = useTranslation()
  const [visitor, setVisitor] = useState<VisitorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "security">("profile")

  const fetchVisitorDetail = useCallback(async () => {
    if (!visitorId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/visitors/${visitorId}`)
      const raw = res.data?.visitor || (res.data?.data ? res.data.data : res.data)
      
      let visitsList: VisitRecord[] = []
      if (raw.visits && Array.isArray(raw.visits) && raw.visits.length > 0) {
        visitsList = raw.visits.map((v: any) => ({
          id: v.id,
          ticket_no: v.ticket_number || v.ticket_no,
          check_in_at: v.check_in_at || (v.date && v.time_in ? `${v.date} ${v.time_in}` : v.time_in || v.date),
          check_out_at: v.check_out_at || (v.date && v.time_out ? `${v.date} ${v.time_out}` : v.checked_out_at),
          status: v.status || (v.checked_out_at || v.time_out ? "closed" : "open"),
          location: v.location || { name: v.location_name || "-" },
          location_name: v.location_name || v.location?.name,
          staff: v.staff || { name: v.host_name || "-" },
          host_name: v.host_name || v.staff?.name,
          purpose: v.purpose || "-",
        }))
      } else {
        try {
          const visitsRes = await api.get(`/visitors/${visitorId}/visits`)
          if (visitsRes.data?.visits && Array.isArray(visitsRes.data.visits)) {
            visitsList = visitsRes.data.visits.map((v: any) => ({
              id: v.id,
              ticket_no: v.ticket_number || v.ticket_no,
              check_in_at: v.check_in_at || (v.date && v.time_in ? `${v.date} ${v.time_in}` : v.time_in || v.date),
              check_out_at: v.check_out_at || (v.date && v.time_out ? `${v.date} ${v.time_out}` : v.checked_out_at),
              status: v.status || (v.checked_out_at || v.time_out ? "closed" : "open"),
              location: v.location || { name: v.location_name || "-" },
              location_name: v.location_name || v.location?.name,
              staff: v.staff || { name: v.host_name || "-" },
              host_name: v.host_name || v.staff?.name,
              purpose: v.purpose || "-",
            }))
          }
        } catch {
          // Non-critical if visits history endpoint is quiet
        }
      }

      setVisitor({
        ...raw,
        pob: raw.pob || raw.birth_place || "",
        dob: raw.dob || raw.birth_date || "",
        birth_place: raw.birth_place || raw.pob || "",
        birth_date: raw.birth_date || raw.dob || "",
        visits: visitsList,
        blacklists: Array.isArray(raw.blacklists) ? raw.blacklists : [],
      })
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || t("visitors.toast_load_failed", "Gagal memuat profil pengunjung"))
    } finally {
      setLoading(false)
    }
  }, [visitorId, t])

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
            <DialogTitle>{t("visitors.detail_modal_title", "Detail Profil Pengunjung")}</DialogTitle>
            {visitor?.visitor_type && (
              <Badge variant="outline" className="capitalize">
                {visitor.visitor_type}
              </Badge>
            )}
            {visitor?.is_blacklisted ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                {t("common.blacklisted", "Blacklisted")}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t("common.active", "Aktif")}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {t("visitors.info_desc", { id: String(visitorId || "") })}
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
            {t("visitors.empty_text", "Data pengunjung tidak ditemukan.")}
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
                      {t("visitors.banner_blacklist_title", "Pengunjung ini berada dalam daftar blacklist!")}
                    </h4>
                    <p className="mt-1 text-xs">
                      <span className="font-medium">{t("visitors.reason_label", "Alasan:")}</span> {visitor.blacklist_reason || t("visitors.reason_not_specified", "Tidak disebutkan.")}
                    </p>
                    {visitor.blacklisted_at && (
                      <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">
                        {t("visitors.blacklist_time", { time: new Date(visitor.blacklisted_at).toLocaleString() })}
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
                {t("visitors.tab_profile", "Informasi Profil")}
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
                {t("visitors.tab_history", { count: visitor.visits?.length || 0 })}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "security"}
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "security"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                {t("visitors.tab_security", "Status Keamanan")}
              </button>
            </div>

            {/* Tab Content: Profile (Identitas & Kontak) */}
            {activeTab === "profile" && (
              <div className="space-y-6 pt-2">
                {/* Identitas Diri */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                    <User className="h-4 w-4 text-primary" />
                    {t("visitors.section_personal", "Identitas Pribadi")}
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_visitor_no", "Nomor Visitor")}</p>
                      <p className="font-mono font-medium text-sm text-primary">
                        {visitor.visitor_no ? String(visitor.visitor_no) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.field_name", "Nama Lengkap")}</p>
                      <p className="font-medium text-sm">{visitor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_id_and_type", "Tipe & Nomor Identitas")}</p>
                      <p className="font-mono text-sm">
                        <span className="font-semibold uppercase">{visitor.id_type}</span>: <span>{visitor.id_number}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_pob_dob", "Tempat / Tanggal Lahir")}</p>
                      <p className="text-sm">
                        {visitor.birth_place || visitor.pob || "-"}, {visitor.birth_date || visitor.dob || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_gender", "Jenis Kelamin")}</p>
                      <p className="text-sm">
                        {visitor.gender === "M"
                          ? t("common.male", "Laki-laki (M)")
                          : visitor.gender === "F"
                          ? t("common.female", "Perempuan (F)")
                          : visitor.gender || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_nationality", "Kewarganegaraan")}</p>
                      <p className="text-sm">{visitor.nationality || "Indonesia"}</p>
                    </div>
                  </div>
                </div>

                {/* Perusahaan & Kontak */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                    <Building className="h-4 w-4 text-primary" />
                    {t("visitors.section_company_contact", "Kontak & Alamat Domisili")}
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_company", "Perusahaan / Instansi")}</p>
                      <p className="font-medium text-sm">{visitor.company || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("visitors.lbl_occupation", "Jabatan / Profesi")}</p>
                      <p className="text-sm">{visitor.occupation || "-"}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {t("visitors.lbl_phone", "Nomor Telepon")}
                      </p>
                      <p className="font-mono text-sm">{visitor.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {t("visitors.lbl_email", "Email")}
                      </p>
                      <p className="text-sm">{visitor.email || "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {t("visitors.lbl_address", "Alamat Domisili")}
                      </p>
                      <p className="text-sm">{visitor.address || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Dokumen Crew / Maritim jika tipe Crew */}
                {visitor.visitor_type === "crew" && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/30 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-sky-900 text-sm dark:text-sky-300">
                      <Anchor className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      {t("visitors.section_crew_docs", "Dokumen Maritim & Kru Kapal")}
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("visitors.lbl_cert_no", "Nomor Sertifikat")}</p>
                        <p className="font-mono font-medium text-sm">
                          {visitor.certificate_no || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("visitors.lbl_seaman_book", "Buku Pelaut (Seaman Book)")}</p>
                        <p className="font-mono font-medium text-sm">
                          {visitor.seaman_book_no || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("visitors.lbl_assigned_vessel", "Kapal Bertugas")}</p>
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
                        <TableHead>{t("visitors.col_ticket_no", "No. Tiket")}</TableHead>
                        <TableHead>{t("visitors.col_time_in", "Waktu Masuk")}</TableHead>
                        <TableHead>{t("visitors.col_time_out", "Waktu Keluar")}</TableHead>
                        <TableHead>{t("visitors.col_dest_location", "Lokasi Tujuan")}</TableHead>
                        <TableHead>{t("visitors.col_host_pic", "Host PIC")}</TableHead>
                        <TableHead>{t("visitors.col_purpose", "Keperluan")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!visitor.visits || visitor.visits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                            {t("visitors.no_visits", "Belum ada riwayat kunjungan untuk pengunjung ini.")}
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
                                  {t("visitors.still_active", "Masih Aktif")}
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

            {/* Tab Content: Security / Blacklist */}
            {activeTab === "security" && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-semibold text-sm">
                    {t("visitors.security_status_title", "Status Keamanan Pengunjung")}
                  </h4>
                  {visitor.is_blacklisted ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-600 font-medium">
                        <ShieldAlert className="h-5 w-5" />
                        <span>
                          {t("visitors.status_blacklisted_desc", "Status: DIBLACKLIST (Dilarang Masuk Area)")}
                        </span>
                      </div>
                      <div className="rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
                        <p className="font-medium">
                          {t("visitors.offence_reason", "Alasan Pelanggaran:")}
                        </p>
                        <p className="mt-1">
                          {visitor.blacklist_reason || t("visitors.reason_not_specified", "Tidak ada alasan spesifik tercatat.")}
                        </p>
                        {visitor.blacklisted_at && (
                          <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                            {t("visitors.action_time", "Waktu Ditindak: {{time}}", {
                              time: new Date(visitor.blacklisted_at).toLocaleString(),
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium">
                        {t("visitors.status_clean_desc", "Status: Bersih / Aktif (Izin kunjungan normal)")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Riwayat Blacklist */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    {t("visitors.blacklist_history_title", "Riwayat Blacklist (Blacklist History)")}
                  </h4>
                  {(!visitor.blacklists || visitor.blacklists.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {t("visitors.no_blacklist_history", "Belum ada catatan riwayat blacklist untuk pengunjung ini.")}
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                          <TableRow>
                            <TableHead className="text-xs">{t("blacklist.col_date", "Tanggal")}</TableHead>
                            <TableHead className="text-xs">{t("blacklist.col_badge", "Badge / H.I.D")}</TableHead>
                            <TableHead className="text-xs">{t("blacklist.col_offences", "Pelanggaran (Offences)")}</TableHead>
                            <TableHead className="text-xs">{t("blacklist.col_remark", "Keterangan (Remark)")}</TableHead>
                            <TableHead className="text-xs">{t("common.status", "Status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visitor.blacklists.map((bl, i) => (
                            <TableRow key={bl.id || i}>
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {bl.date || (bl.blacklisted_at ? bl.blacklisted_at.slice(0, 10) : "-")}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{bl.badge_code || "-"}</TableCell>
                              <TableCell className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {bl.offences || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{bl.remark || "-"}</TableCell>
                              <TableCell className="text-xs">
                                {bl.is_active ? (
                                  <Badge variant="destructive" className="text-[10px] py-0">
                                    {t("common.active", "Aktif")}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 border-emerald-500/30">
                                    {t("visitors.status_revoked", "Dicabut")}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.close", "Tutup")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
