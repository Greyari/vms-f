import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Loader2 } from "lucide-react"
import SearchableLocationSelect from "@/components/common/SearchableLocationSelect"

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
  const [loading, setLoading] = useState(false)
  const [fetchingDetail, setFetchingDetail] = useState(false)
  const [vessels, setVessels] = useState<
    Array<{
      id: string
      name: string
      code?: string | null
      type: string
      vessel_type?: string | null
      captain?: string | null
      pic?: string | null
    }>
  >([])
  const isBlacklisted = Boolean(visitor?.is_blacklisted)

  const [form, setForm] = useState({
    name: "",
    id_type: "ktp",
    id_number: "",
    phone: "",
    email: "",
    company: "",
    occupation: "",
    visitor_type: "visitor",
    birth_place: "",
    birth_date: "",
    gender: "",
    nationality: "Indonesia",
    address: "",
    certificate_no: "",
    seaman_book_no: "",
    vessel_id: "",
  })

  useEffect(() => {
    if (!open || form.visitor_type !== "crew") return
    if (typeof api.get !== "function") return

    try {
      const req = api.get("/locations", { params: { per_page: 1000 } })
      if (req && typeof req.then === "function") {
        req
          .then((res: any) => {
            const raw = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? [])
            const onlyVessels = raw.filter((loc: any) => loc.type && loc.type !== "location")
            setVessels(onlyVessels)
          })
          .catch(() => {
            // Ignore vessel list fetch error
          })
      }
    } catch {
      // Ignore if api.get is not mocked in unit tests
    }
  }, [open, form.visitor_type])

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
        phone: visitor.phone || "",
        email: visitor.email || "",
        company: visitor.company || "",
        occupation: visitor.occupation || "",
        visitor_type: visitor.visitor_type === "regular" ? "visitor" : visitor.visitor_type || "visitor",
        birth_place: visitor.birth_place || visitor.pob || "",
        birth_date: visitor.birth_date || visitor.dob || "",
        gender: visitor.gender || "",
        nationality: visitor.nationality || "Indonesia",
        address: visitor.address || "",
        certificate_no: visitor.certificate_no || "",
        seaman_book_no: visitor.seaman_book_no || "",
        vessel_id: visitor.vessel_id || visitor.vessel?.id || "",
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
                    phone: data.phone ?? prev.phone,
                    email: data.email ?? prev.email,
                    company: data.company ?? prev.company,
                    occupation: data.occupation ?? prev.occupation,
                    visitor_type: data.visitor_type === "regular" ? "visitor" : (data.visitor_type || prev.visitor_type),
                    birth_place: data.birth_place || data.pob || prev.birth_place,
                    birth_date: data.birth_date || data.dob || prev.birth_date,
                    gender: data.gender ?? prev.gender,
                    nationality: data.nationality ?? prev.nationality,
                    address: data.address ?? prev.address,
                    certificate_no: data.certificate_no ?? prev.certificate_no,
                    seaman_book_no: data.seaman_book_no ?? prev.seaman_book_no,
                    vessel_id: data.vessel_id ?? data.vessel?.id ?? prev.vessel_id,
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
        phone: "",
        email: "",
        company: "",
        occupation: "",
        visitor_type: "visitor",
        birth_place: "",
        birth_date: "",
        gender: "",
        nationality: "Indonesia",
        address: "",
        certificate_no: "",
        seaman_book_no: "",
        vessel_id: "",
      })
    }
  }, [open, visitor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: Record<string, any> = {
      name: form.name.trim(),
      id_type: form.id_type,
      id_number: form.id_number.trim(),
      company: form.company.trim() || null,
      occupation: form.occupation.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      visitor_type: form.visitor_type === "regular" ? "visitor" : form.visitor_type,
      gender: form.gender || null,
      birth_place: form.birth_place.trim() || null,
      birth_date: form.birth_date || null,
      nationality: form.nationality.trim() || "Indonesia",
    }

    if (form.visitor_type === "crew") {
      payload.certificate_no = form.certificate_no.trim() || null
      payload.seaman_book_no = form.seaman_book_no.trim() || null
      payload.vessel_id = form.vessel_id || null
    }

    try {
      if (visitor?.id) {
        await api.put(`/visitors/${visitor.id}`, payload)
        toast.success("Data pengunjung berhasil diperbarui")
      } else {
        await api.post("/visitors", payload)
        toast.success("Pengunjung baru berhasil didaftarkan")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal menyimpan data pengunjung")
    } finally {
      setLoading(false)
    }
  }

  const selectedVessel = vessels.find((v) => v.id === form.vessel_id) || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {visitor?.id ? "Edit Data Pengunjung" : "Pendaftaran Pengunjung Baru"}
          </DialogTitle>
          <DialogDescription>
            Lengkapi data diri dan identitas pengunjung untuk registrasi ke sistem VMS.
          </DialogDescription>
        </DialogHeader>

        {isBlacklisted && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Nomor identitas pengunjung blacklist dikunci demi integritas keamanan.
            </span>
          </div>
        )}

        {fetchingDetail && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Memuat rincian data lengkap pengunjung...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Section: Identitas Utama */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vfm_name">Nama Lengkap *</Label>
              <Input
                id="vfm_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Ahmad Dahlan"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_id_type">Tipe Identitas *</Label>
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
              <Label htmlFor="vfm_id_number">Nomor Identitas *</Label>
              <Input
                id="vfm_id_number"
                value={form.id_number}
                disabled={isBlacklisted}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                placeholder="Nomor KTP / SIM / Paspor"
                required
              />
            </div>
          </div>

          {/* Section: Instansi & Tipe Visitor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vfm_company">Perusahaan / Instansi</Label>
              <Input
                id="vfm_company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Nama perusahaan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_occupation">Jabatan / Profesi</Label>
              <Input
                id="vfm_occupation"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                placeholder="Contoh: Teknisi, Marine Inspector"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_visitor_type">Tipe Pengunjung</Label>
              <select
                id="vfm_visitor_type"
                value={form.visitor_type}
                onChange={(e) => setForm({ ...form, visitor_type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="visitor">Pengunjung Umum (Regular)</option>
                <option value="crew">Crew (Kru Kapal)</option>
                <option value="temporary_worker">Tenaga Kerja Sementara / Kontraktor</option>
                <option value="supplier">Supplier / Vendor</option>
                <option value="others">Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_phone">Nomor Telepon</Label>
              <Input
                id="vfm_phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Contoh: 081234567890"
              />
            </div>
          </div>

          {/* Section: Kontak & Biodata Tambahan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vfm_email">Email</Label>
              <Input
                id="vfm_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_gender">Jenis Kelamin</Label>
              <select
                id="vfm_gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Pilih Jenis Kelamin</option>
                <option value="M">Laki-laki (M)</option>
                <option value="F">Perempuan (F)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vfm_pob">Tempat Lahir</Label>
              <Input
                id="vfm_pob"
                value={form.birth_place}
                onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                placeholder="Kota Kelahiran"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_dob">Tanggal Lahir</Label>
              <Input
                id="vfm_dob"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_nationality">Kewarganegaraan</Label>
              <Input
                id="vfm_nationality"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                placeholder="Indonesia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vfm_address">Alamat Domisili</Label>
            <Textarea
              id="vfm_address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat tempat tinggal lengkap..."
              rows={2}
            />
          </div>

          {/* Section: Dokumen Crew Khusus */}
          {form.visitor_type === "crew" && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4 space-y-4 dark:border-sky-900/50 dark:bg-sky-950/20">
              <h4 className="font-semibold text-sky-950 text-sm dark:text-sky-300">
                Dokumen Kelautan Kru Kapal
              </h4>
              <div className="space-y-2">
                <Label htmlFor="vfm_vessel_id">Kapal Tugas (Vessel)</Label>
                <SearchableLocationSelect
                  id="vfm_vessel_id"
                  ariaLabel="Kapal Tugas (Vessel)"
                  options={vessels}
                  value={form.vessel_id}
                  onChange={(val) => setForm({ ...form, vessel_id: val })}
                  placeholder="-- Cari & Pilih Kapal Tugas (Opsional) --"
                  searchPlaceholder="Cari nama kapal, IMO No, Captain, atau PIC..."
                  className="h-9 bg-white dark:bg-zinc-900"
                />
                {selectedVessel && (
                  <div className="rounded border border-sky-200 bg-white dark:bg-zinc-900 dark:border-sky-800 p-2 text-xs text-zinc-700 dark:text-zinc-300 flex flex-wrap gap-3">
                    <span>
                      IMO: <strong>{selectedVessel.code || "-"}</strong>
                    </span>
                    <span>
                      Tipe: <strong>{selectedVessel.vessel_type || selectedVessel.type}</strong>
                    </span>
                    <span>
                      Captain: <strong>{selectedVessel.captain || "-"}</strong>
                    </span>
                    <span>
                      Note/PIC: <strong>{selectedVessel.pic || "-"}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vfm_cert">Nomor Sertifikat</Label>
                  <Input
                    id="vfm_cert"
                    value={form.certificate_no}
                    onChange={(e) => setForm({ ...form, certificate_no: e.target.value })}
                    placeholder="Contoh: CERT-MAR-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vfm_seaman">Buku Pelaut (Seaman Book)</Label>
                  <Input
                    id="vfm_seaman"
                    value={form.seaman_book_no}
                    onChange={(e) => setForm({ ...form, seaman_book_no: e.target.value })}
                    placeholder="Nomor Buku Pelaut"
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
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : visitor?.id ? (
                "Perbarui Pengunjung"
              ) : (
                "Daftar Pengunjung"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
