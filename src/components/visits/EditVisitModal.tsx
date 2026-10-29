import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Loader2,
  Pencil,
  Save,
  AlertTriangle,
  UserCheck,
} from "lucide-react"
import {
  type VisitFormValues,
  useVisitMasterData,
  VisitFormFields,
  resetCreateVisitCache,
} from "@/components/visits/VisitFormShared"

export interface EditableVisit {
  id: number | string
  ticket_number?: string | null
  legacy_registration_no?: string | null
  visitor_cards?: { id?: number | string; card_no?: string }[]
  visitor?: {
    id?: number | string
    visitor_no?: number | string | null
    name: string
    id_type?: string | null
    id_number?: string | null
    company?: string | null
    visitor_type?: string | null
    occupation?: string | null
    is_blacklisted?: boolean | number
    blacklist_reason?: string | null
  } | null
  visitor_name?: string | null
  visitor_company?: string | null
  location_id?: number | string | null
  location_name?: string | null
  location?: {
    id?: number | string
    name: string
    code?: string | null
    type?: string | null
    vessel_type?: string | null
    captain?: string | null
    pic?: string | null
  } | null
  staff_id?: number | string | null
  host_name?: string | null
  staff?: {
    id?: number | string
    name: string
    staff_id?: string | null
    company?: string | null
  } | null
  purpose?: string | null
  vehicle_no?: string | null
  vehicle_plate?: string | null
  vehicle_card_id?: number | string | null
  vehicle_card?: { id?: number | string; card_no?: string } | null
  checked_out_at?: string | null
  time_out?: string | null
}

export interface EditVisitModalProps {
  visit: EditableVisit | null
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
  const [submitting, setSubmitting] = useState(false)

  const heldVisitorCards = useMemo(
    () =>
      (visit?.visitor_cards ?? [])
        .filter((c) => c.id !== undefined && c.card_no)
        .map((c) => ({
          id: String(c.id),
          card_no: String(c.card_no),
        })),
    [visit?.visitor_cards]
  )

  const heldVehicleCard = useMemo(() => {
    if (visit?.vehicle_card?.id && visit?.vehicle_card?.card_no) {
      return {
        id: String(visit.vehicle_card.id),
        card_no: String(visit.vehicle_card.card_no),
      }
    }
    if (visit?.vehicle_card_id) {
      return {
        id: String(visit.vehicle_card_id),
        card_no: `#${visit.vehicle_card_id}`,
      }
    }
    return null
  }, [visit?.vehicle_card, visit?.vehicle_card_id])

  // Always bypass stale card cache on Edit open so available cards are fresh
  useEffect(() => {
    if (isOpen) {
      resetCreateVisitCache()
    }
  }, [isOpen])

  const {
    loadingMaster,
    locations,
    staffList,
    cardList,
    vehicleList,
    purposes,
  } = useVisitMasterData({
    enabled: isOpen && Boolean(visit),
    heldVisitorCards,
    heldVehicleCard,
  })

  const [form, setForm] = useState<VisitFormValues>({
    location_id: "",
    purpose: "",
    staff_id: "",
    card_ids: [],
    vehicle_card_id: "",
    vehicle_no: "",
    visitor_company: "",
  })

  const setField = <K extends keyof VisitFormValues>(
    k: K,
    v: VisitFormValues[K]
  ) => setForm((p) => ({ ...p, [k]: v }))

  // Pre-populate form when visit changes or modal opens
  useEffect(() => {
    if (!visit || !isOpen) return

    const locId = visit.location_id ?? visit.location?.id ?? ""
    const stfId = visit.staff_id ?? visit.staff?.id ?? ""
    const vCardId = visit.vehicle_card?.id ?? visit.vehicle_card_id ?? ""
    const cIds = (visit.visitor_cards ?? []).map((c) => String(c.id))
    const plate = visit.vehicle_no ?? visit.vehicle_plate ?? ""
    const company = visit.visitor_company ?? visit.visitor?.company ?? ""

    setForm({
      location_id: locId ? String(locId) : "",
      purpose: visit.purpose ?? "",
      staff_id: stfId ? String(stfId) : "",
      card_ids: cIds,
      vehicle_card_id: vCardId ? String(vCardId) : "",
      vehicle_no: plate,
      visitor_company: company,
    })
  }, [visit, isOpen])

  // Fallback matching by name if location_id or staff_id wasn't stored on legacy records
  useEffect(() => {
    if (!visit || !isOpen) return
    setForm((prev) => {
      let nextLocId = prev.location_id
      let nextStaffId = prev.staff_id

      if (!nextLocId && visit.location_name && locations.length > 0) {
        const matchedLoc = locations.find(
          (l) =>
            l.name.trim().toLowerCase() ===
            visit.location_name!.trim().toLowerCase()
        )
        if (matchedLoc) nextLocId = String(matchedLoc.id)
      }

      if (!nextStaffId && visit.host_name && staffList.length > 0) {
        const matchedStaff = staffList.find(
          (s) =>
            s.name.trim().toLowerCase() ===
            visit.host_name!.trim().toLowerCase()
        )
        if (matchedStaff) nextStaffId = String(matchedStaff.id)
      }

      if (nextLocId === prev.location_id && nextStaffId === prev.staff_id) {
        return prev
      }
      return {
        ...prev,
        location_id: nextLocId,
        staff_id: nextStaffId,
      }
    })
  }, [visit, isOpen, locations, staffList])

  const isCompleted = Boolean(visit?.checked_out_at || visit?.time_out)
  const isBlacklisted = Boolean(visit?.visitor?.is_blacklisted)

  const getVisitorTypeLabel = (vType?: string | null) => {
    if (!vType) return "-"
    switch (vType) {
      case "visitor":
      case "regular":
        return t("create_visit.type_visitor", "Pengunjung umum")
      case "crew":
        return t("create_visit.type_crew", "Kru kapal")
      case "temp_worker":
      case "contractor":
        return t("create_visit.type_temp_worker", "Tenaga kerja sementara")
      case "supplier":
        return t("create_visit.type_supplier", "Pemasok / vendor")
      case "others":
        return t("create_visit.type_others", "Lainnya")
      default:
        return vType
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visit) return

    if (isCompleted) {
      toast.error(
        t(
          "visit_history.cannot_edit_completed",
          "Kunjungan sudah selesai, tidak bisa diedit."
        )
      )
      onClose()
      return
    }

    if (isBlacklisted) {
      toast.error(
        t(
          "create_visit.toast_visitor_blacklisted",
          "Pengunjung ini masuk blacklist."
        )
      )
      return
    }

    if (!form.location_id) {
      toast.error(
        t("create_visit.toast_select_location", "Pilih lokasi / kapal tujuan.")
      )
      return
    }
    if (!form.purpose.trim()) {
      toast.error(
        t("create_visit.toast_enter_purpose", "Isi tujuan kunjungan.")
      )
      return
    }

    if (form.card_ids.length === 0) {
      toast.error(
        t("create_visit.toast_select_card", "Pilih kartu akses dulu.")
      )
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        location_id: form.location_id,
        purpose: form.purpose.trim(),
        visitor_company: (form.visitor_company ?? "").trim(),
        card_ids: form.card_ids,
        vehicle_no: form.vehicle_no.trim() ? form.vehicle_no.trim().toUpperCase() : null,
        vehicle_card_id: form.vehicle_card_id ? form.vehicle_card_id : null,
      }

      if (form.staff_id) {
        payload.staff_id = form.staff_id
      }

      await api.put(`/visits/${visit.id}`, payload)
      toast.success(
        t(
          "visit_history.edit_success",
          "Data kunjungan berhasil diperbarui."
        )
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { status?: number; data?: { message?: string } }
      }
      const status = errorObj?.response?.status
      const message = errorObj?.response?.data?.message

      if (status === 422 && message) {
        toast.error(message)
        if (
          message.toLowerCase().includes("ditutup") ||
          message.toLowerCase().includes("checked out") ||
          message.toLowerCase().includes("selesai")
        ) {
          onSuccess()
          onClose()
        }
      } else {
        toast.error(
          message ||
            t(
              "visit_history.edit_failed",
              "Gagal menyimpan perubahan kunjungan."
            )
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const visitorName =
    visit?.visitor?.name || visit?.visitor_name || "-"
  const visitorIdType = (visit?.visitor?.id_type || "KTP").toUpperCase()
  const visitorIdNumber = visit?.visitor?.id_number || "-"
  const ticketDisplay =
    visit?.ticket_number || visit?.legacy_registration_no || `#${visit?.id}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-4 w-4 text-blue-600" />
            {t("visit_history.edit_modal_title", "Edit Kunjungan Terbuka")}
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {ticketDisplay}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {t(
              "visit_history.edit_modal_subtitle",
              "Perbarui tujuan, staf yang dikunjungi, kartu pengunjung, kartu kendaraan, atau plat kendaraan untuk kunjungan aktif ini."
            )}
          </DialogDescription>
        </DialogHeader>

        {isBlacklisted && (
          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3.5 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-xs">
              <p className="font-semibold">
                {t(
                  "create_visit.banner_blacklist_title",
                  "Pengunjung masuk blacklist"
                )}
              </p>
              {visit?.visitor?.blacklist_reason && (
                <p className="mt-0.5">{visit.visitor.blacklist_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Ringkasan Identitas Pengunjung (Langkah 1 - Terkunci saat Edit) */}
        {visit && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  {t(
                    "visit_history.visitor_identity_title",
                    "Identitas Pengunjung"
                  )}
                </span>
              </div>
              <Badge variant="outline" className="text-xs uppercase">
                {getVisitorTypeLabel(visit.visitor?.visitor_type)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block">
                  {t("create_visit.summary_name", "Nama")}
                </span>
                <span className="font-semibold uppercase text-zinc-900 dark:text-zinc-100">
                  {visitorName}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">
                  {t("create_visit.summary_id", "ID")}
                </span>
                <span className="font-mono font-semibold uppercase text-zinc-900 dark:text-zinc-100">
                  {visitorIdType} {visitorIdNumber}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">
                  {t("create_visit.summary_company", "Perusahaan")}
                </span>
                <span className="font-semibold uppercase text-zinc-900 dark:text-zinc-100">
                  {form.visitor_company || visit.visitor_company || visit.visitor?.company || "-"}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <VisitFormFields
            mode="edit"
            form={form}
            onChangeField={setField}
            locations={locations}
            staffList={staffList}
            cardList={cardList}
            vehicleList={vehicleList}
            purposes={purposes}
            loadingMaster={loadingMaster}
            disabled={submitting || isCompleted || isBlacklisted}
            heldVisitorCards={heldVisitorCards}
          />

          <DialogFooter className="gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel", "Batal")}
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingMaster || isCompleted || isBlacklisted}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.saving", "Menyimpan...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("common.save_changes", "Simpan Perubahan")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
