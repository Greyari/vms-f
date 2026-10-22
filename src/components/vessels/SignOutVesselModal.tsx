import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

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
import { LogOut, Loader2, Ship, Calendar, MapPin } from "lucide-react"
import type { VesselArrivalItem } from "@/pages/vessels/VesselArrivals"

interface SignOutVesselModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  arrival: VesselArrivalItem | null
}

export default function SignOutVesselModal({
  open,
  onClose,
  onSuccess,
  arrival,
}: SignOutVesselModalProps) {
  const { t } = useTranslation()
  const [signOutDate, setSignOutDate] = useState("")
  const [signOutPort, setSignOutPort] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !arrival) {
      setError("")
      return
    }

    const today = new Date().toISOString().split("T")[0]
    setSignOutDate(today)
    setSignOutPort("")
    setError("")
  }, [open, arrival])

  if (!arrival) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signOutDate) {
      setError(t("vesselArrivals.err_sign_out_date_required", "Tanggal keberangkatan wajib diisi."))
      return
    }

    if (arrival.sign_in_date && signOutDate < arrival.sign_in_date) {
      setError(t("vesselArrivals.err_sign_out_before_sign_in", "Tanggal keberangkatan tidak boleh mendahului tanggal kedatangan."))
      return
    }

    setError("")
    setSubmitting(true)

    try {
      await api.put(`/vessel-arrivals/${arrival.id}`, {
        sign_out_date: signOutDate,
        sign_out_port: signOutPort.trim() || null,
      })

      toast.success(t("vesselArrivals.toast_vessel_signed_out", "Kapal {{name}} berhasil dicatat sign-out", { name: arrival.vessel_name }))
      onSuccess()
      onClose()
    } catch {
      toast.error(t("vesselArrivals.toast_sign_out_failed", "Gagal mencatat keberangkatan kapal"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <LogOut className="h-5 w-5 text-amber-600" />
            {t("vesselArrivals.sign_out_modal_title", "Sign-Out Keberangkatan Kapal")}
          </DialogTitle>
          <DialogDescription>
            {t("vesselArrivals.sign_out_modal_desc", "Catat tanggal dan pelabuhan tujuan keberangkatan kapal yang telah selesai berlabuh di galangan.")}
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan Kapal */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Ship className="h-4 w-4 text-blue-500" />
            {arrival.vessel_name}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t("vesselArrivals.sign_in_time", "Tanggal Masuk")}: <span className="font-medium text-zinc-800 dark:text-zinc-200">{arrival.sign_in_date}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {t("vesselArrivals.sign_in_port_label", "Pelabuhan Asal")}: <span className="font-medium text-zinc-800 dark:text-zinc-200">{arrival.sign_in_port || "-"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <Label htmlFor="quick-sign-out-date">
              {t("vesselArrivals.sign_out_date_label", "Tanggal Keberangkatan")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick-sign-out-date"
              type="date"
              aria-label={t("vesselArrivals.sign_out_date_aria", "Tanggal Keberangkatan")}
              value={signOutDate}
              onChange={(e) => setSignOutDate(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="quick-sign-out-port">{t("vesselArrivals.sign_out_port_label", "Pelabuhan Tujuan")}</Label>
            <Input
              id="quick-sign-out-port"
              aria-label={t("vesselArrivals.sign_out_port_aria", "Pelabuhan Tujuan")}
              value={signOutPort}
              onChange={(e) => setSignOutPort(e.target.value)}
              placeholder={t("vesselArrivals.sign_out_port_placeholder", "Misal: SINGAPORE, JAKARTA...")}
              disabled={submitting}
              className="mt-1"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing", "Memproses...")}
                </>
              ) : (
                t("vesselArrivals.btn_confirm_departure", "Konfirmasi Keberangkatan")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
