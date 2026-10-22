import { useState, useEffect } from "react"
import { useTranslation } from "@/context/I18nContext"
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
import { Loader2, Ship } from "lucide-react"
import SearchableLocationSelect from "@/components/common/SearchableLocationSelect"

interface CardRef {
  id: number | string
  card_no: string
  status?: string
}

interface LocationRef {
  id: number | string
  name: string
  code?: string | null
  type?: string | null
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
}

interface StaffRef {
  id: number | string
  staff_id?: string
  name: string
  department?: string
  company?: string
  address?: string
  gender?: string
}

export interface EditVisitModalProps {
  visit: Record<string, any> | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditVisitModal({

  visit,
  isOpen,
  onClose,
  onSuccess,
}: EditVisitModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Master data
  const [locations, setLocations] = useState<LocationRef[]>([])
  const [staffList, setStaffList] = useState<StaffRef[]>([])
  const [cardList, setCardList] = useState<CardRef[]>([])
  const [vehicleCards, setVehicleCards] = useState<CardRef[]>([])

  // Form states
  const [form, setForm] = useState<{
    location_id: string
    is_custom_host: boolean
    staff_id: string
    host_name: string
    visitor_company: string
    purpose: string
    vehicle_plate: string
    card_ids: string[]
    vehicle_card_id: string
  }>({
    location_id: "",
    is_custom_host: false,
    staff_id: "",
    host_name: "",
    visitor_company: "",
    purpose: "",
    vehicle_plate: "",
    card_ids: [],
    vehicle_card_id: "",
  })

  useEffect(() => {
    if (!isOpen || !visit) return

    // Pre-populate form from current visit
    const currentCardIds = (visit.visitor_cards || []).map((c: any) =>
      c.id ? c.id.toString() : ""
    ).filter(Boolean)

    const isCustom = !visit.staff_id && Boolean(visit.host_name)

    setForm({
      location_id: visit.location_id ? visit.location_id.toString() : "",
      is_custom_host: isCustom,
      staff_id: visit.staff_id ? visit.staff_id.toString() : "",
      host_name: visit.host_name || "",
      visitor_company:
        visit.visitor_company || visit.visitor?.company || "",
      purpose: visit.purpose || "",
      vehicle_plate: visit.vehicle_plate || "",
      card_ids: currentCardIds,
      vehicle_card_id: visit.vehicle_card_id
        ? visit.vehicle_card_id.toString()
        : "",
    })

    // Fetch master data (cards must include currently used cards)
    const loadMasterData = async () => {
      setLoading(true)
      try {
        const [locRes, staffRes, cardRes, vehicleRes] = await Promise.all([
          api.get("/locations", { params: { per_page: 1000 } }).catch(() => ({ data: [] })),
          api.get("/staffs", { params: { per_page: 1000 } }).catch(() => ({ data: [] })),
          api.get("/cards", { params: { per_page: 1000 } }).catch(() => ({ data: [] })),
          api.get("/vehicle-cards", { params: { per_page: 1000 } }).catch(() => ({ data: [] })),
        ])

        const locData = Array.isArray(locRes.data)
          ? locRes.data
          : locRes.data?.data || []
        setLocations(locData)

        const staffData = Array.isArray(staffRes.data)
          ? staffRes.data
          : staffRes.data?.data || []
        setStaffList(staffData)

        // Cards: include available cards OR cards assigned to this visit
        const rawCards = Array.isArray(cardRes.data)
          ? cardRes.data
          : cardRes.data?.data || []
        const currentCardIdSet = new Set(
          (visit.visitor_cards || []).map((c: any) =>
            c.id ? c.id.toString() : ""
          )
        )
        const relevantCards = rawCards.filter(
          (c: CardRef) =>
            c.status === "available" ||
            currentCardIdSet.has(c.id.toString())
        )
        setCardList(relevantCards)

        // Vehicle cards
        const rawVehicles = Array.isArray(vehicleRes.data)
          ? vehicleRes.data
          : vehicleRes.data?.data || []
        const relevantVehicles = rawVehicles.filter(
          (c: CardRef) =>
            c.status === "available" ||
            (visit.vehicle_card_id &&
              c.id.toString() === visit.vehicle_card_id.toString())
        )
        setVehicleCards(relevantVehicles)
      } catch (err) {
        console.error("Failed to load options for edit visit", err)
      } finally {
        setLoading(false)
      }
    }

    loadMasterData()
  }, [isOpen, visit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visit) return

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        location_id: form.location_id
          ? /^\d+$/.test(form.location_id)
            ? Number(form.location_id)
            : form.location_id
          : undefined,
        visitor_company: form.visitor_company.trim(),
        purpose: form.purpose.trim(),
        vehicle_plate: form.vehicle_plate.trim() || undefined,
        card_ids: form.card_ids,
        vehicle_card_id: form.vehicle_card_id
          ? /^\d+$/.test(form.vehicle_card_id)
            ? Number(form.vehicle_card_id)
            : form.vehicle_card_id
          : null,
      }

      if (form.is_custom_host) {
        payload.host_name = form.host_name.trim() || "Visitor Host"
        payload.staff_id = null
      } else {
        payload.staff_id = form.staff_id
          ? /^\d+$/.test(form.staff_id)
            ? Number(form.staff_id)
            : form.staff_id
          : null
        payload.host_name =
          staffList.find((s) => s.id.toString() === form.staff_id)?.name ||
          undefined
      }

      await api.put(`/visits/${visit.id}`, payload)
      toast.success(t("reprint.modal_toast_success", "Data kunjungan berhasil diperbarui"))
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Failed to update open visit", err)
      const status = err.response?.status
      const msg =
        err.response?.data?.message || t("reprint.modal_toast_failed", "Gagal memperbarui kunjungan terbuka")

      toast.error(msg)
      if (status === 422) {
        // If visit has already been checked out, close the modal
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!visit) return null

  const selectedLocation =
    locations.find((loc) => String(loc.id) === String(form.location_id)) || null
  const isSelectedLocationVessel =
    Boolean(selectedLocation?.type) && selectedLocation?.type !== "location"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reprint.modal_edit_title", "Edit Kunjungan Terbuka")}</DialogTitle>
          <DialogDescription>
            Tiket #{visit.ticket_number || visit.legacy_registration_no || visit.id} —{" "}
            {visit.visitor?.name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location_id">{t("reprint.modal_location_label", "Lokasi / Kapal")}</Label>
              <SearchableLocationSelect
                id="location_id"
                name="location_id"
                ariaLabel="Lokasi / Kapal"
                options={locations}
                value={form.location_id}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, location_id: val }))
                }
                placeholder="-- Cari & Pilih Lokasi / Kapal --"
                searchPlaceholder="Cari nama lokasi/kapal, IMO No, Captain, atau PIC..."
                required
                className="h-9"
              />
              {selectedLocation && isSelectedLocationVessel && (
                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between border-b border-blue-200/70 dark:border-blue-800/70 pb-1">
                    <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                      <Ship className="h-3.5 w-3.5" />
                      {selectedLocation.name} (IMO: {selectedLocation.code || "-"})
                    </span>
                    <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                      {selectedLocation.vessel_type || selectedLocation.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-3 text-zinc-700 dark:text-zinc-300">
                      <span>
                        Captain: <strong>{selectedLocation.captain || "-"}</strong>
                      </span>
                      <span>
                        Note/PIC: <strong>{selectedLocation.pic || "-"}</strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedLocation.captain && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              is_custom_host: true,
                              staff_id: "",
                              host_name: selectedLocation.captain || "",
                            }))
                          }
                          className="h-6 px-2 text-[11px]"
                        >
                          + Captain sbg Host
                        </Button>
                      )}
                      {selectedLocation.pic && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              is_custom_host: true,
                              staff_id: "",
                              host_name: selectedLocation.pic || "",
                            }))
                          }
                          className="h-6 px-2 text-[11px]"
                        >
                          + PIC sbg Host
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Host: Staff or Custom */}
            <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-zinc-500">
                  Host Destination
                </Label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_custom_host}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        is_custom_host: e.target.checked,
                      }))
                    }
                    className="rounded border-zinc-300"
                  />
                  <span>Custom Host</span>
                </label>
              </div>

              {!form.is_custom_host ? (
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="staff_id" className="text-xs">
                    Staf Host
                  </Label>
                  <select
                    id="staff_id"
                    name="staff_id"
                    value={form.staff_id}
                    onChange={handleChange}
                    className="flex h-9 w-full min-w-0 max-w-full truncate rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">{t("reprint.modal_select_staff", "-- Pilih Staf --")}</option>
                    {staffList.map((s) => {
                      const rawDetails = [s.staff_id, s.company, s.address || s.department].filter(Boolean).join(" - ")
                      const details = rawDetails.length > 45 ? `${rawDetails.slice(0, 45)}...` : rawDetails
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} {details ? `(${details})` : ""}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="host_name" className="text-xs">
                    Nama Custom Host
                  </Label>
                  <Input
                    id="host_name"
                    name="host_name"
                    value={form.host_name}
                    onChange={handleChange}
                    placeholder={t("reprint.modal_custom_host_placeholder", "Nama personil / departemen...")}
                  />
                </div>
              )}
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="visitor_company">{t("reprint.modal_company_label", "Perusahaan / Instansi (Company)")}</Label>
              <Input
                id="visitor_company"
                name="visitor_company"
                value={form.visitor_company}
                onChange={handleChange}
                placeholder={t("reprint.modal_company_placeholder", "Perusahaan tamu...")}
              />
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="purpose">{t("reprint.modal_purpose_label", "Keperluan / Purpose of Visit")}</Label>
              <Input
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                required
                placeholder={t("reprint.modal_purpose_placeholder", "Keperluan kunjungan...")}
              />
            </div>

            {/* Card Swap / Assignment */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="card_select">{t("reprint.modal_visitor_card_label", "Kartu Visitor (Opsional)")}</Label>
                <select
                  id="card_select"
                  value={form.card_ids[0] || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      card_ids: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">{t("reprint.modal_no_card", "Tidak Ada / Pilih Kartu")}</option>
                  {cardList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.card_no} {c.status === "available" ? "(Tersedia)" : "(Sedang Dipakai)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehicle_card_id">{t("reprint.modal_vehicle_card_label", "Kartu Kendaraan")}</Label>
                <select
                  id="vehicle_card_id"
                  name="vehicle_card_id"
                  value={form.vehicle_card_id}
                  onChange={handleChange}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">Tidak Ada</option>
                  {vehicleCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.card_no}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Plate */}
            <div className="space-y-1.5">
              <Label htmlFor="vehicle_plate">{t("reprint.modal_vehicle_plate_label", "Plat Nomor Kendaraan")}</Label>
              <Input
                id="vehicle_plate"
                name="vehicle_plate"
                value={form.vehicle_plate}
                onChange={handleChange}
                placeholder="e.g. BP 1234 XY"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? t("reprint.modal_saving", "Menyimpan...") : t("reprint.modal_save_changes", "Simpan Perubahan")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
