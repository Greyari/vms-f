import { useState, useEffect } from "react"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"

interface VisitorFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitor?: any | null
  onSuccess: () => void
}

export default function VisitorFormModal({
  open,
  onOpenChange,
  visitor,
  onSuccess,
}: VisitorFormModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [fetchingDetail, setFetchingDetail] = useState(false)
  const isBlacklisted = Boolean(visitor?.is_blacklisted)

  const [form, setForm] = useState({
    name: "",
    id_type: "ktp",
    id_number: "",
    company: "",
    occupation: "",
    visitor_type: "visitor",
    birth_place: "",
    birth_date: "",
    gender: "",
    nationality: "Indonesia",
    certificate_no: "",
    seaman_book_no: "",
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (visitor) {
      // Set initial values from prop first
      setForm({
        name: visitor.name || "",
        id_type: visitor.id_type || "ktp",
        id_number: visitor.id_number || "",
        company: visitor.company || "",
        occupation: visitor.occupation || "",
        visitor_type: visitor.visitor_type === "regular" ? "visitor" : visitor.visitor_type || "visitor",
        birth_place: visitor.birth_place || visitor.pob || "",
        birth_date: visitor.birth_date || visitor.dob || "",
        gender: visitor.gender ? (["M", "Male", "male", "L"].includes(visitor.gender) ? "M" : ["F", "Female", "female", "P"].includes(visitor.gender) ? "F" : visitor.gender) : "",
        nationality: visitor.nationality || "Indonesia",
        certificate_no: visitor.certificate_no || "",
        seaman_book_no: visitor.seaman_book_no || "",
      })

      // If we have visitor ID and api.get is available, fetch full profile to ensure all details are loaded
      if (visitor.id && typeof api.get === "function") {
        try {
          const req = api.get(`/visitors/${visitor.id}`)
          if (req && typeof req.then === "function") {
            setFetchingDetail(true)
            req
              .then((res: any) => {
                const data = res?.data?.visitor || res?.data?.data || res?.data
                if (data) {
                  setForm((prev) => ({
                    ...prev,
                    name: data.name ?? prev.name,
                    id_type: data.id_type ?? prev.id_type,
                    id_number: data.id_number ?? prev.id_number,
                    company: data.company ?? prev.company,
                    occupation: data.occupation ?? prev.occupation,
                    visitor_type: data.visitor_type === "regular" ? "visitor" : (data.visitor_type || prev.visitor_type),
                    birth_place: data.birth_place || data.pob || prev.birth_place,
                    birth_date: data.birth_date || data.dob || prev.birth_date,
                    gender: data.gender ?? prev.gender,
                    nationality: data.nationality ?? prev.nationality,
                    certificate_no: data.certificate_no ?? prev.certificate_no,
                    seaman_book_no: data.seaman_book_no ?? prev.seaman_book_no,
                  }))
                }
              })
              .catch((err: any) => {
                console.error("Gagal mengambil detail profil untuk edit", err)
              })
              .finally(() => {
                setFetchingDetail(false)
              })
          }
        } catch (e) {
          // Ignore if api.get not mocked in tests
        }
      }
    } else {
      setForm({
        name: "",
        id_type: "ktp",
        id_number: "",
        company: "",
        occupation: "",
        visitor_type: "visitor",
        birth_place: "",
        birth_date: "",
        gender: "",
        nationality: "Indonesia",
        certificate_no: "",
        seaman_book_no: "",
      })
    }
  }, [open, visitor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const isCrew = form.visitor_type === "crew"
    const payload: Record<string, any> = {
      name: form.name.trim(),
      id_type: form.id_type,
      id_number: form.id_number.trim(),
      company: form.company.trim() || null,
      occupation: form.occupation.trim() || null,
      visitor_type: form.visitor_type === "regular" ? "visitor" : form.visitor_type,
      gender: form.gender || null,
      birth_place: form.birth_place.trim() || null,
      birth_date: form.birth_date || null,
      nationality: form.nationality.trim() || "Indonesia",
    }

    if (isCrew) {
      payload.certificate_no = form.certificate_no.trim() || null
      payload.seaman_book_no = form.seaman_book_no.trim() || null
    }

    try {
      if (visitor?.id) {
        await api.put(`/visitors/${visitor.id}`, payload)
        toast.success(t("visitors.toast_update_success", "Data pengunjung berhasil diperbarui"))
      } else {
        await api.post("/visitors", payload)
        toast.success(t("visitors.toast_create_success", "Pengunjung baru berhasil didaftarkan"))
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || t("visitors.toast_save_failed", "Gagal menyimpan data pengunjung"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl md:max-w-5xl w-[94vw]">
        <DialogHeader>
          <DialogTitle>
            {visitor?.id ? t("visitors.edit_modal_title", "Edit Data Pengunjung") : t("visitors.create_modal_title", "Pendaftaran Pengunjung Baru")}
          </DialogTitle>
          <DialogDescription>
            {t("visitors.form_desc", "Lengkapi data diri dan identitas pengunjung untuk registrasi ke sistem VMS.")}
          </DialogDescription>
        </DialogHeader>

        {isBlacklisted && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {t("visitors.blacklist_security_warning", "Nomor identitas pengunjung blacklist dikunci demi integritas keamanan.")}
            </span>
          </div>
        )}

        {fetchingDetail && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("visitors.loading_detail", "Memuat rincian data lengkap pengunjung...")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tipe Pengunjung: Paling Atas */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
            <Label htmlFor="vfm_visitor_type" className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              {t("visitors.field_visitor_type", "Tipe Pengunjung *")}
            </Label>
            <select
              id="vfm_visitor_type"
              value={form.visitor_type}
              onChange={(e) => setForm({ ...form, visitor_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="visitor">{t("visitors.opt_type_regular", "Pengunjung Umum (Regular)")}</option>
              <option value="crew">{t("visitors.opt_type_crew", "Crew (Kru Kapal)")}</option>
              <option value="temporary_worker">{t("visitors.opt_type_contractor", "Tenaga Kerja Sementara / Kontraktor")}</option>
              <option value="supplier">{t("visitors.opt_type_supplier", "Supplier / Vendor")}</option>
              <option value="others">{t("visitors.opt_type_others", "Lainnya")}</option>
            </select>
          </div>

          {/* Section: Identitas Utama */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vfm_name">{t("visitors.field_name", "Nama Lengkap *")}</Label>
              <Input
                id="vfm_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("visitors.field_name_placeholder", "Contoh: Ahmad Dahlan")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_id_type">{t("visitors.field_id_type", "Tipe Identitas *")}</Label>
              <select
                id="vfm_id_type"
                value={form.id_type}
                disabled={isBlacklisted}
                onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="ktp">KTP (e-KTP)</option>
                <option value="sim">SIM (A/B/C)</option>
                <option value="passport">Paspor</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_id_number">{t("visitors.field_id_number", "Nomor Identitas *")}</Label>
              <Input
                id="vfm_id_number"
                value={form.id_number}
                disabled={isBlacklisted}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                placeholder={t("visitors.field_id_number_placeholder", "Nomor KTP / SIM / Paspor")}
                required
              />
            </div>
          </div>

          {/* Section: Instansi & Profesi */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vfm_company">{t("visitors.field_company", "Perusahaan / Instansi")}</Label>
              <Input
                id="vfm_company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder={form.visitor_type === "crew" ? "Contoh: PT Pelayaran Samudera" : "Nama perusahaan"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_occupation">{t("visitors.field_occupation", "Jabatan / Profesi")}</Label>
              <Input
                id="vfm_occupation"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                placeholder={form.visitor_type === "crew" ? "Contoh: Nahkoda, Mualim I, AB, KKM" : t("visitors.field_occupation_placeholder", "Contoh: Teknisi, Marine Inspector")}
              />
            </div>
          </div>

          {/* Section: Biodata Kelahiran & Kewarganegaraan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="vfm_gender">{t("visitors.field_gender", "Jenis Kelamin")}</Label>
              <select
                id="vfm_gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("visitors.opt_select_gender", "Pilih Jenis Kelamin")}</option>
                <option value="M">{t("common.male", "Laki-laki (M)")}</option>
                <option value="F">{t("common.female", "Perempuan (F)")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_pob">{t("visitors.field_pob", "Tempat Lahir")}</Label>
              <Input
                id="vfm_pob"
                value={form.birth_place}
                onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                placeholder={t("visitors.field_pob_placeholder", "Kota Kelahiran")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_dob">{t("visitors.field_dob", "Tanggal Lahir")}</Label>
              <Input
                id="vfm_dob"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_nationality">{t("visitors.field_nationality", "Kewarganegaraan")}</Label>
              <Input
                id="vfm_nationality"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                placeholder={t("visitors.field_nationality_placeholder", "Indonesia")}
              />
            </div>
          </div>

          {/* Section: Dokumen Crew Khusus */}
          {form.visitor_type === "crew" && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4 space-y-4 dark:border-sky-900/50 dark:bg-sky-950/20">
              <h4 className="font-semibold text-sky-950 text-sm dark:text-sky-300">
                {t("visitors.crew_docs_title", "Dokumen Kelautan Kru Kapal")}
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vfm_cert">{t("visitors.field_certificate_no", "Nomor Sertifikat")}</Label>
                  <Input
                    id="vfm_cert"
                    value={form.certificate_no}
                    onChange={(e) => setForm({ ...form, certificate_no: e.target.value })}
                    placeholder={t("visitors.field_certificate_no_placeholder", "Contoh: CERT-MAR-1234")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vfm_seaman">{t("visitors.field_seaman_book", "Buku Pelaut (Seaman Book)")}</Label>
                  <Input
                    id="vfm_seaman"
                    value={form.seaman_book_no}
                    onChange={(e) => setForm({ ...form, seaman_book_no: e.target.value })}
                    placeholder={t("visitors.field_seaman_book_placeholder", "Nomor Buku Pelaut")}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel", "Batal")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing", "Menyimpan...")}
                </>
              ) : visitor?.id ? (
                t("visitors.btn_submit_update", "Perbarui Pengunjung")
              ) : (
                t("visitors.btn_submit_create", "Daftar Pengunjung")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
