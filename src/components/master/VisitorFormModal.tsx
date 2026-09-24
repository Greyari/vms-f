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
  const [loading, setLoading] = useState(false)
  const isBlacklisted = Boolean(visitor?.is_blacklisted)

  const [form, setForm] = useState({
    name: "",
    id_type: "ktp",
    id_number: "",
    phone: "",
    email: "",
    company: "",
    occupation: "",
    visitor_type: "regular",
    pob: "",
    dob: "",
    gender: "",
    nationality: "Indonesia",
    address: "",
    certificate_no: "",
    seaman_book_no: "",
  })

  useEffect(() => {
    if (open) {
      if (visitor) {
        setForm({
          name: visitor.name || "",
          id_type: visitor.id_type || "ktp",
          id_number: visitor.id_number || "",
          phone: visitor.phone || "",
          email: visitor.email || "",
          company: visitor.company || "",
          occupation: visitor.occupation || "",
          visitor_type: visitor.visitor_type || "regular",
          pob: visitor.pob || "",
          dob: visitor.dob || "",
          gender: visitor.gender || "",
          nationality: visitor.nationality || "Indonesia",
          address: visitor.address || "",
          certificate_no: visitor.certificate_no || "",
          seaman_book_no: visitor.seaman_book_no || "",
        })
      } else {
        setForm({
          name: "",
          id_type: "ktp",
          id_number: "",
          phone: "",
          email: "",
          company: "",
          occupation: "",
          visitor_type: "regular",
          pob: "",
          dob: "",
          gender: "",
          nationality: "Indonesia",
          address: "",
          certificate_no: "",
          seaman_book_no: "",
        })
      }
    }
  }, [open, visitor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (visitor?.id) {
        await api.put(`/visitors/${visitor.id}`, form)
        toast.success("Data pengunjung berhasil diperbarui")
      } else {
        await api.post("/visitors", form)
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
                <option value="regular">Regular</option>
                <option value="contractor">Contractor</option>
                <option value="crew">Crew (Kru Kapal)</option>
                <option value="vip">VIP</option>
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

          {/* Section: Data Diri Tambahan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vfm_pob">Tempat Lahir</Label>
              <Input
                id="vfm_pob"
                value={form.pob}
                onChange={(e) => setForm({ ...form, pob: e.target.value })}
                placeholder="Kota kelahiran"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vfm_dob">Tanggal Lahir</Label>
              <Input
                id="vfm_dob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
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
                <option value="">Pilih Gender</option>
                <option value="M">Laki-laki (M)</option>
                <option value="F">Perempuan (F)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vfm_email">Email</Label>
              <Input
                id="vfm_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
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
            <Input
              id="vfm_address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat tempat tinggal saat ini"
            />
          </div>

          {/* Section: Dokumen Kru Kapal (Tampil jika visitor_type === 'crew') */}
          {form.visitor_type === "crew" && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-50/20 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <h4 className="mb-3 font-semibold text-blue-900 text-sm dark:text-blue-300">
                Informasi Dokumen Pelaut & Kru Kapal
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vfm_certificate_no">Nomor Sertifikat Maritim</Label>
                  <Input
                    id="vfm_certificate_no"
                    value={form.certificate_no}
                    onChange={(e) =>
                      setForm({ ...form, certificate_no: e.target.value })
                    }
                    placeholder="Contoh: CERT-MAR-00123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vfm_seaman_book_no">Buku Pelaut (Seaman Book)</Label>
                  <Input
                    id="vfm_seaman_book_no"
                    value={form.seaman_book_no}
                    onChange={(e) =>
                      setForm({ ...form, seaman_book_no: e.target.value })
                    }
                    placeholder="Contoh: SB-IDN-99881"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                "Simpan Perubahan"
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
