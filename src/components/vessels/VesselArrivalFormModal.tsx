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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Ship, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { VesselArrivalItem } from "@/pages/vessels/VesselArrivals"
import CrewSelectionDialog from "./CrewSelectionDialog"
import SearchableLocationSelect from "@/components/common/SearchableLocationSelect"

interface LocationOption {
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
  is_active: boolean
}

interface VesselArrivalFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  arrivalToEdit?: VesselArrivalItem | null
}

export default function VesselArrivalFormModal({
  open,
  onClose,
  onSuccess,
  arrivalToEdit,
}: VesselArrivalFormModalProps) {
  const isEdit = Boolean(arrivalToEdit)

  // Vessel locations
  const [vessels, setVessels] = useState<LocationOption[]>([])
  const [loadingVessels, setLoadingVessels] = useState(false)

  // Inline Create Vessel State
  const [newVesselOpen, setNewVesselOpen] = useState(false)
  const [creatingVessel, setCreatingVessel] = useState(false)
  const [newVesselForm, setNewVesselForm] = useState({
    name: "",
    type: "repair_vessel",
    vessel_type: "",
    code: "",
    call_sign: "",
    flag: "",
    captain: "",
    pic: "",
  })

  // Form Fields
  const [locationId, setLocationId] = useState("")
  const [signInDate, setSignInDate] = useState("")
  const [signOutDate, setSignOutDate] = useState("")
  const [signInPort, setSignInPort] = useState("")
  const [signOutPort, setSignOutPort] = useState("")
  const [captain, setCaptain] = useState("")

  // Agent Fields
  const [localAgentCompany, setLocalAgentCompany] = useState("")
  const [localAgentName, setLocalAgentName] = useState("")
  const [localAgentPhone, setLocalAgentPhone] = useState("")
  const [localAgentLocation, setLocalAgentLocation] = useState("")

  const [foreignAgentCompany, setForeignAgentCompany] = useState("")
  const [foreignAgentName, setForeignAgentName] = useState("")
  const [foreignAgentPhone, setForeignAgentPhone] = useState("")
  const [foreignAgentLocation, setForeignAgentLocation] = useState("")

  // Crew Selection
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([])
  const [selectedCrewList, setSelectedCrewList] = useState<
    Array<{
      id: string
      name: string
      occupation?: string | null
      id_number?: string | null
      company?: string | null
    }>
  >([])
  const [crewDialogOpen, setCrewDialogOpen] = useState(false)

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Load vessels
  useEffect(() => {
    if (!open) return

    async function loadVessels() {
      setLoadingVessels(true)
      try {
        const res = await api.get("/locations", { params: { per_page: 2000 } })
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        // Filter out non-vessel locations
        const filteredVessels = raw.filter(
          (loc: LocationOption) => loc.type !== "location"
        )
        setVessels(filteredVessels)
      } catch {
        toast.error("Gagal memuat daftar kapal")
      } finally {
        setLoadingVessels(false)
      }
    }

    loadVessels()
  }, [open])

  // Populate form on open/edit
  useEffect(() => {
    if (!open) {
      setErrors({})
      setNewVesselOpen(false)
      return
    }

    if (arrivalToEdit) {
      setLocationId(arrivalToEdit.location_id || "")
      setSignInDate(arrivalToEdit.sign_in_date || "")
      setSignOutDate(arrivalToEdit.sign_out_date || "")
      setSignInPort(arrivalToEdit.sign_in_port || "")
      setSignOutPort(arrivalToEdit.sign_out_port || "")
      setCaptain(arrivalToEdit.captain || "")
      setLocalAgentCompany(arrivalToEdit.local_agent_company || "")
      setLocalAgentName(arrivalToEdit.local_agent_name || "")
      setLocalAgentPhone(arrivalToEdit.local_agent_phone || "")
      setLocalAgentLocation(arrivalToEdit.local_agent_location || "")
      setForeignAgentCompany(arrivalToEdit.foreign_agent_company || "")
      setForeignAgentName(arrivalToEdit.foreign_agent_name || "")
      setForeignAgentPhone(arrivalToEdit.foreign_agent_phone || "")
      setForeignAgentLocation(arrivalToEdit.foreign_agent_location || "")

      if (arrivalToEdit.crew && Array.isArray(arrivalToEdit.crew)) {
        setSelectedCrewIds(arrivalToEdit.crew.map((c) => c.id))
        setSelectedCrewList(
          arrivalToEdit.crew.map((c: any) => ({
            id: c.id,
            name: c.name,
            occupation: c.occupation,
            id_number: c.id_number,
            company: c.company,
          }))
        )
      } else if (arrivalToEdit.id) {
        api.get(`/vessel-arrivals/${arrivalToEdit.id}`)
          .then((res) => {
            const crewList = res.data?.crew
            if (Array.isArray(crewList)) {
              setSelectedCrewIds(crewList.map((c: { id: string }) => c.id))
              setSelectedCrewList(
                crewList.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  occupation: c.occupation,
                  id_number: c.id_number,
                  company: c.company,
                }))
              )
            }
          })
          .catch(() => {
            // Ignore background fetch error
          })
      } else {
        setSelectedCrewIds([])
        setSelectedCrewList([])
      }
    } else {
      // Default to today
      const today = new Date().toISOString().split("T")[0]
      setLocationId("")
      setSignInDate(today)
      setSignOutDate("")
      setSignInPort("")
      setSignOutPort("")
      setCaptain("")
      setLocalAgentCompany("")
      setLocalAgentName("")
      setLocalAgentPhone("")
      setLocalAgentLocation("")
      setForeignAgentCompany("")
      setForeignAgentName("")
      setForeignAgentPhone("")
      setForeignAgentLocation("")
      setSelectedCrewIds([])
      setSelectedCrewList([])
    }
  }, [open, arrivalToEdit])

  const selectedVessel = vessels.find((v) => v.id === locationId) || null

  const handleSelectVessel = (newId: string) => {
    setLocationId(newId)
    const found = vessels.find((v) => v.id === newId)
    if (found?.captain && !captain.trim()) {
      setCaptain(found.captain)
    }
  }

  const handleCreateVessel = async () => {
    if (!newVesselForm.name.trim()) {
      toast.error("Nama kapal wajib diisi.")
      return
    }
    const rawCode = newVesselForm.code.trim()
    const resolvedCode =
      !rawCode || rawCode === "-"
        ? newVesselForm.name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
        : rawCode

    setCreatingVessel(true)
    try {
      const payload = {
        name: newVesselForm.name.trim(),
        type: newVesselForm.type,
        vessel_type: newVesselForm.vessel_type.trim() || null,
        code: resolvedCode,
        call_sign: newVesselForm.call_sign.trim() || null,
        flag: newVesselForm.flag.trim() || null,
        captain: newVesselForm.captain.trim() || null,
        pic: newVesselForm.pic.trim() || null,
        is_active: true,
      }
      const res = await api.post("/locations", payload)
      const created: LocationOption = res.data?.data || res.data
      if (created && created.id) {
        setVessels((prev) => [created, ...prev.filter((v) => v.id !== created.id)])
        setLocationId(created.id)
        if (created.captain || newVesselForm.captain.trim()) {
          setCaptain(created.captain || newVesselForm.captain.trim())
        }
        setNewVesselOpen(false)
        setNewVesselForm({
          name: "",
          type: "repair_vessel",
          vessel_type: "",
          code: "",
          call_sign: "",
          flag: "",
          captain: "",
          pic: "",
        })
        toast.success(`Kapal "${created.name}" berhasil ditambahkan dan dipilih.`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menambahkan data kapal baru.")
    } finally {
      setCreatingVessel(false)
    }
  }

  const handleRemoveCrew = (crewId: string, crewName?: string) => {
    setSelectedCrewIds((prev) => prev.filter((id) => id !== crewId))
    setSelectedCrewList((prev) => prev.filter((c) => c.id !== crewId))
    toast.info(`Kru ${crewName ? `"${crewName}" ` : ""}dihapus dari manifest`)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!locationId) {
      newErrors.location_id = "Kapal wajib dipilih."
    }

    if (!signInDate) {
      newErrors.sign_in_date = "Tanggal kedatangan wajib diisi."
    }

    if (signOutDate && signInDate && signOutDate < signInDate) {
      newErrors.sign_out_date =
        "Tanggal keberangkatan tidak boleh mendahului tanggal kedatangan."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
        const validCrewIds = selectedCrewIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null"
        )

        const payload: Record<string, unknown> = {
          location_id: locationId,
          sign_in_date: signInDate,
          sign_out_date: signOutDate || null,
          sign_in_port: signInPort.trim() || null,
          sign_out_port: signOutPort.trim() || null,
          captain: captain.trim() || null,
          local_agent_company: localAgentCompany.trim() || null,
          local_agent_name: localAgentName.trim() || null,
          local_agent_phone: localAgentPhone.trim() || null,
          local_agent_location: localAgentLocation.trim() || null,
          foreign_agent_company: foreignAgentCompany.trim() || null,
          foreign_agent_name: foreignAgentName.trim() || null,
          foreign_agent_phone: foreignAgentPhone.trim() || null,
          foreign_agent_location: foreignAgentLocation.trim() || null,
          crew_ids: validCrewIds,
        }

      if (isEdit && arrivalToEdit) {
        await api.put(`/vessel-arrivals/${arrivalToEdit.id}`, payload)
        toast.success("Data kedatangan kapal berhasil diperbarui")
      } else {
        await api.post("/vessel-arrivals", payload)
        toast.success("Kedatangan kapal baru berhasil dicatat")
      }

      onSuccess()
      onClose()
    } catch {
      toast.error(
        isEdit
          ? "Gagal memperbarui kedatangan kapal"
          : "Gagal mencatat kedatangan kapal baru"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Ship className="h-5 w-5 text-blue-600" />
            {isEdit
              ? "Edit Kedatangan Kapal"
              : "Catat Kedatangan Kapal Baru"}
          </DialogTitle>
          <DialogDescription>
            Masukkan informasi kapal, tanggal dan pelabuhan sandar, nakhoda, keagenan, serta manifest kru.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Bagian 1: Data Kapal & Jadwal Sandar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Informasi Kapal & Jadwal Sandar
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewVesselOpen((prev) => !prev)}
                className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {newVesselOpen ? "Tutup Form Kapal" : "Tambah Kapal Baru"}
              </Button>
            </div>

            {newVesselOpen && (
              <div
                role="region"
                aria-label="Form Tambah Kapal Baru"
                className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Tambah Master Kapal Baru
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label htmlFor="quick-vessel-name" className="text-xs">
                      Description / Nama Kapal <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quick-vessel-name"
                      value={newVesselForm.name}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Contoh: GAS WIDURI"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-code" className="text-xs">
                      IMO No / Kode
                    </Label>
                    <Input
                      id="quick-vessel-code"
                      value={newVesselForm.code}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, code: e.target.value }))}
                      placeholder='Nomor IMO atau "-"'
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-category" className="text-xs">
                      Kategori Kapal
                    </Label>
                    <select
                      id="quick-vessel-category"
                      value={newVesselForm.type}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, type: e.target.value }))}
                      className="mt-1 w-full h-8 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="repair_vessel">Repair Vessel</option>
                      <option value="tug_boat">Tug Boat</option>
                      <option value="barge">Barge</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-type" className="text-xs">
                      Type (Spesifikasi)
                    </Label>
                    <Input
                      id="quick-vessel-type"
                      value={newVesselForm.vessel_type}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, vessel_type: e.target.value }))}
                      placeholder="Contoh: LPG TANKER"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-callsign" className="text-xs">
                      Call Sign
                    </Label>
                    <Input
                      id="quick-vessel-callsign"
                      value={newVesselForm.call_sign}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, call_sign: e.target.value }))}
                      placeholder="Contoh: POJR"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-flag" className="text-xs">
                      Nationality Flag
                    </Label>
                    <Input
                      id="quick-vessel-flag"
                      value={newVesselForm.flag}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, flag: e.target.value }))}
                      placeholder="Contoh: INDONESIA"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-vessel-captain" className="text-xs">
                      Captain
                    </Label>
                    <Input
                      id="quick-vessel-captain"
                      value={newVesselForm.captain}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, captain: e.target.value }))}
                      placeholder="Contoh: CAPT. SUTRISNO"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="quick-vessel-pic" className="text-xs">
                      Note / PIC
                    </Label>
                    <Input
                      id="quick-vessel-pic"
                      value={newVesselForm.pic}
                      onChange={(e) => setNewVesselForm((p) => ({ ...p, pic: e.target.value }))}
                      placeholder="Contoh: ALVI"
                      className="mt-1 h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewVesselOpen(false)}
                    disabled={creatingVessel}
                    className="h-7 text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateVessel}
                    disabled={creatingVessel}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {creatingVessel ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan & Pilih Kapal"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vessel-select">
                  Pilih Kapal <span className="text-red-500">*</span>
                </Label>
                <SearchableLocationSelect
                  id="vessel-select"
                  ariaLabel="Pilih Kapal"
                  options={vessels}
                  value={locationId}
                  onChange={(val) => handleSelectVessel(val)}
                  placeholder="-- Cari & Pilih Kapal (Nama, IMO, Captain, PIC) --"
                  searchPlaceholder="Cari nama kapal, IMO No, Captain, PIC, atau Tipe..."
                  disabled={loadingVessels || submitting}
                  className="mt-1 h-10"
                />
                {errors.location_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.location_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="captain-input">Nakhoda / Captain</Label>
                <Input
                  id="captain-input"
                  aria-label="Nakhoda"
                  value={captain}
                  onChange={(e) => setCaptain(e.target.value)}
                  placeholder="Nama kapten kapal..."
                  disabled={submitting}
                  className="mt-1"
                />
              </div>

              {selectedVessel && (
                <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 p-3 text-xs grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <span className="text-zinc-500 block">IMO / Kode</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedVessel.code || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Spesifikasi Tipe</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedVessel.vessel_type || selectedVessel.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Call Sign / Bendera</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedVessel.call_sign || "-"} / {selectedVessel.flag || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Captain Master</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedVessel.captain || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Note / PIC</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedVessel.pic || "-"}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="sign-in-date">
                  Tanggal Kedatangan (Sign-In) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sign-in-date"
                  type="date"
                  aria-label="Tanggal Kedatangan"
                  value={signInDate}
                  onChange={(e) => setSignInDate(e.target.value)}
                  disabled={submitting}
                  className="mt-1"
                />
                {errors.sign_in_date && (
                  <p className="text-xs text-red-500 mt-1">{errors.sign_in_date}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sign-in-port">Pelabuhan Asal</Label>
                <Input
                  id="sign-in-port"
                  aria-label="Pelabuhan Asal"
                  value={signInPort}
                  onChange={(e) => setSignInPort(e.target.value)}
                  placeholder="Misal: SINGAPORE / BATAM"
                  disabled={submitting}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sign-out-date">Tanggal Keberangkatan (Sign-Out)</Label>
                <Input
                  id="sign-out-date"
                  type="date"
                  aria-label="Tanggal Keberangkatan"
                  value={signOutDate}
                  onChange={(e) => setSignOutDate(e.target.value)}
                  disabled={submitting}
                  className="mt-1"
                />
                {errors.sign_out_date && (
                  <p className="text-xs text-red-500 mt-1">{errors.sign_out_date}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sign-out-port">Pelabuhan Tujuan</Label>
                <Input
                  id="sign-out-port"
                  aria-label="Pelabuhan Tujuan"
                  value={signOutPort}
                  onChange={(e) => setSignOutPort(e.target.value)}
                  placeholder="Misal: JAKARTA / JURONG"
                  disabled={submitting}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Bagian 2: Informasi Keagenan Lokal & Asing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 border-b pb-1">
              Informasi Keagenan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agen Lokal */}
              <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Agen Lokal (Indonesia)
                </span>
                <div>
                  <Label htmlFor="local-agent-company">Perusahaan Agen Lokal</Label>
                  <Input
                    id="local-agent-company"
                    aria-label="Perusahaan Agen Lokal"
                    value={localAgentCompany}
                    onChange={(e) => setLocalAgentCompany(e.target.value)}
                    placeholder="Nama PT / Agen lokal..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="local-agent-name">Nama Petugas Agen</Label>
                  <Input
                    id="local-agent-name"
                    value={localAgentName}
                    onChange={(e) => setLocalAgentName(e.target.value)}
                    placeholder="Nama PIC agen lokal..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="local-agent-phone">Nomor Telepon</Label>
                  <Input
                    id="local-agent-phone"
                    value={localAgentPhone}
                    onChange={(e) => setLocalAgentPhone(e.target.value)}
                    placeholder="08..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Agen Asing */}
              <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Agen Luar Negeri (Foreign Agent)
                </span>
                <div>
                  <Label htmlFor="foreign-agent-company">Perusahaan Agen Asing</Label>
                  <Input
                    id="foreign-agent-company"
                    value={foreignAgentCompany}
                    onChange={(e) => setForeignAgentCompany(e.target.value)}
                    placeholder="Nama agen asing..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="foreign-agent-name">Nama Petugas Agen</Label>
                  <Input
                    id="foreign-agent-name"
                    value={foreignAgentName}
                    onChange={(e) => setForeignAgentName(e.target.value)}
                    placeholder="PIC agen asing..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="foreign-agent-phone">Nomor Telepon</Label>
                  <Input
                    id="foreign-agent-phone"
                    value={foreignAgentPhone}
                    onChange={(e) => setForeignAgentPhone(e.target.value)}
                    placeholder="+..."
                    disabled={submitting}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bagian 3: Ringkasan Manifest Kru */}
          <div className="space-y-3 p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
                <Users className="h-4 w-4 text-blue-600" />
                <span>
                  Manifest Kru Kapal: <strong>{selectedCrewIds.length} Kru Terpilih</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!locationId || submitting}
                onClick={() => setCrewDialogOpen(true)}
                className="bg-white dark:bg-zinc-800 text-xs font-medium"
              >
                Kelola Kru Kapal
              </Button>
            </div>

            {selectedCrewIds.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Daftar Kru yang Ditugaskan:
                </span>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {selectedCrewList.length > 0 ? (
                    selectedCrewList.map((crew) => (
                      <Badge
                        key={crew.id}
                        variant="secondary"
                        className="flex items-center gap-1.5 py-1 px-2.5 bg-white dark:bg-zinc-800 border text-xs text-zinc-800 dark:text-zinc-200 shadow-sm"
                      >
                        <span className="font-medium">{crew.name}</span>
                        {crew.occupation && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            ({crew.occupation})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCrew(crew.id, crew.name)}
                          className="ml-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus dari manifest"
                          aria-label={`Hapus ${crew.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    selectedCrewIds.map((id) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1.5 py-1 px-2.5 bg-white dark:bg-zinc-800 border text-xs shadow-sm"
                      >
                        <span>Kru #{id.slice(0, 8)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrew(id)}
                          className="ml-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus dari manifest"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                Belum ada kru yang dipilih. Klik "Kelola Kru Kapal" untuk memilih atau menambahkan kru pelaut.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Kedatangan"
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Crew Selection Dialog */}
        {locationId && (
          <CrewSelectionDialog
            open={crewDialogOpen}
            onClose={() => setCrewDialogOpen(false)}
            locationId={locationId}
            arrivalId={arrivalToEdit?.id}
            selectedCrewIds={selectedCrewIds}
            onSave={(ids, crewObjects) => {
              setSelectedCrewIds(ids)
              if (crewObjects) {
                setSelectedCrewList(
                  crewObjects.map((c) => ({
                    id: c.id,
                    name: c.name,
                    occupation: c.occupation,
                    id_number: c.id_number,
                    company: c.company,
                  }))
                )
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
