import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { isCancel } from "axios"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  Globe,
  User,
  Printer,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { GlobalBlacklistHit } from "@/types/hybrid"
import {
  type LocationItem,
  type StaffItem,
  type CardItem,
  type VisitorSearchResult,
  type VisitFormValues,
  unwrap,
  resetCreateVisitCache,
  isCardInUse,
  useVisitMasterData,
  VisitFormFields,
  SectionTitle,
  KeyHint,
  EnterBadge,
  CARD_CLASS,
  UPPER_WHEN_FILLED,
  ROW_BASE,
  ROW_ACTIVE,
  ROW_IDLE,
  DROPDOWN,
} from "@/components/visits/VisitFormShared"

// Re-export for backwards compatibility with existing imports/tests
// eslint-disable-next-line react-refresh/only-export-components
export { unwrap, resetCreateVisitCache }
export type { LocationItem, StaffItem, CardItem, VisitorSearchResult }

type VisitorStatus = "idle" | "registered" | "blacklisted" | "notfound"

/* ------------------------------------------------------------------ */
/* Autocomplete pengunjung (keyboard + klik + tap)                     */
/* ------------------------------------------------------------------ */

function VisitorAutocomplete({
  id,
  value,
  placeholder,
  onChange,
  onPick,
  onEnter,
  inputRef,
  tabIndex,
}: {
  id: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  onPick: (visitor: VisitorSearchResult) => void
  onEnter?: () => void
  inputRef?: React.Ref<HTMLInputElement>
  tabIndex?: number
}) {
  const { t } = useTranslation()
  const [items, setItems] = useState<VisitorSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      ctrl.current?.abort()
    },
    []
  )

  useEffect(() => {
    if (active >= 0) {
      listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
    }
  }, [active])

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current)
    ctrl.current?.abort()
    setActive(-1)

    if (q.trim().length < 2) {
      setItems([])
      setOpen(false)
      setLoading(false)
      return
    }

    setOpen(true)
    setLoading(true)
    timer.current = setTimeout(async () => {
      const c = new AbortController()
      ctrl.current = c
      try {
        const res = await api.get("/visits/search", {
          params: { q: q.trim() },
          signal: c.signal,
        })
        const list = unwrap(res) as VisitorSearchResult[]
        setItems(list)
        setActive(list.length ? 0 : -1)
      } catch (err) {
        if (!isCancel(err)) console.error(err)
      } finally {
        if (!c.signal.aborted) setLoading(false)
      }
    }, 250)
  }

  const pick = (visitor: VisitorSearchResult) => {
    setOpen(false)
    setItems([])
    setActive(-1)
    onPick(visitor)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open && items.length) setOpen(true)
      setActive((i) => (items.length ? (i + 1) % items.length : -1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && active >= 0 && items[active]) pick(items[active])
      else if (onEnter) {
        setOpen(false)
        onEnter()
      }
    } else if (e.key === "Tab" && !e.shiftKey) {
      if (open && !loading && active >= 0 && items[active]) {
        e.preventDefault()
        pick(items[active])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        tabIndex={tabIndex}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value)
          search(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn("h-10 pr-9", UPPER_WHEN_FILLED)}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-zinc-400" />
      ) : (
        <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-400" />
      )}

      {open && (
        <div
          className={DROPDOWN}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            id={`${id}-list`}
            role="listbox"
            ref={listRef}
            className="max-h-64 overflow-auto"
          >
            {!loading && items.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                {t(
                  "create_visit.no_matching_visitors",
                  "Tidak ada pengunjung yang cocok."
                )}
              </div>
            ) : (
              items.map((s, i) => (
                <div
                  key={s.id}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(s)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(ROW_BASE, i === active ? ROW_ACTIVE : ROW_IDLE)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium uppercase">
                      {s.name}
                    </p>
                    <p className="truncate text-xs uppercase text-zinc-500">
                      {(s.id_type || "ktp").toUpperCase()} {s.id_number}
                      {s.company ? ` · ${s.company}` : ""}
                    </p>
                  </div>
                  {s.is_blacklisted && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                      {t("create_visit.badge_blacklist", "BLACKLIST")}
                    </span>
                  )}
                  {i === active && <EnterBadge />}
                </div>
              ))
            )}
          </div>
          {items.length > 0 && <KeyHint />}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Halaman CreateVisit                                                 */
/* ------------------------------------------------------------------ */

export default function CreateVisit() {
  const { t, formatNumber } = useTranslation()
  const navigate = useNavigate()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const purposeInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  // Shared Master Data Hook
  const {
    loadingMaster,
    locations,
    staffList,
    cardList,
    vehicleList,
    purposes,
  } = useVisitMasterData({ enabled: true })

  // Langkah 1: cari pengunjung (hanya cek, tidak menambah)
  const [nameQuery, setNameQuery] = useState("")
  const [idType, setIdType] = useState("ktp")
  const [idNumber, setIdNumber] = useState("")
  const [visitor, setVisitor] = useState<VisitorSearchResult | null>(null)
  const [status, setStatus] = useState<VisitorStatus>("idle")
  const [blacklistReason, setBlacklistReason] = useState("")
  const [globalEntries, setGlobalEntries] = useState<GlobalBlacklistHit[]>([])

  // Caching Section 2 (Destination & Host) in sessionStorage
  const CACHE_DESTINATION_KEY = "vms_last_destination_host"

  const loadCachedDestination = (): { location_id: string; purpose: string; staff_id: string } => {
    try {
      const raw = sessionStorage.getItem(CACHE_DESTINATION_KEY)
      if (!raw) return { location_id: "", purpose: "", staff_id: "" }
      const parsed = JSON.parse(raw)
      return {
        location_id: typeof parsed.location_id === "string" ? parsed.location_id : "",
        purpose: typeof parsed.purpose === "string" ? parsed.purpose : "",
        staff_id: typeof parsed.staff_id === "string" ? parsed.staff_id : "",
      }
    } catch {
      return { location_id: "", purpose: "", staff_id: "" }
    }
  }

  const saveCachedDestination = (data: { location_id: string; purpose: string; staff_id: string }) => {
    try {
      sessionStorage.setItem(CACHE_DESTINATION_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  const clearCachedDestination = () => {
    try {
      sessionStorage.removeItem(CACHE_DESTINATION_KEY)
    } catch {
      // ignore
    }
  }

  // Langkah 2 & 3
  const [form, setForm] = useState<VisitFormValues>(() => {
    const cached = loadCachedDestination()
    return {
      location_id: cached.location_id,
      purpose: cached.purpose,
      staff_id: cached.staff_id,
      card_ids: [],
      vehicle_card_id: "",
      vehicle_no: "",
    }
  })
  const setField = <K extends keyof VisitFormValues>(
    k: K,
    v: VisitFormValues[K]
  ) => {
    setForm((p) => {
      const updated = { ...p, [k]: v }
      if (k === "location_id" || k === "purpose" || k === "staff_id") {
        saveCachedDestination({
          location_id: updated.location_id,
          purpose: updated.purpose,
          staff_id: updated.staff_id,
        })
      }
      return updated
    })
  }

  const handleResetDestination = () => {
    clearCachedDestination()
    setForm((p) => ({
      ...p,
      location_id: "",
      purpose: "",
      staff_id: "",
    }))
  }

  // Dialog
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState("")
  const [overrideEntry, setOverrideEntry] = useState<GlobalBlacklistHit | null>(null)
  const [overrideReason, setOverrideReason] = useState("")

  const globalBlock = globalEntries.find((e) => e.id_type === idType) ?? null
  const globalWarnings = globalEntries.filter((e) => e.id_type !== idType)
  const canFill = status === "registered"

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  // Setelah pengunjung terverifikasi, fokus otomatis lanjut ke input lokasi
  useEffect(() => {
    if (status !== "registered") return
    const raf = requestAnimationFrame(() => {
      locationInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Jika kartu yang sudah dipilih ternyata berubah jadi "in use" (data master
  // ter-refresh), buang dari pilihan supaya tidak terkirim ke backend.
  useEffect(() => {
    if (form.card_ids.length === 0) return
    const stillFree = form.card_ids.filter((id) => {
      const card = cardList.find((c) => String(c.id) === String(id))
      return !card || !isCardInUse(card)
    })
    if (stillFree.length !== form.card_ids.length) {
      setForm((p) => ({ ...p, card_ids: stillFree }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardList])

  /* ---------- cek pengunjung ---------- */
  const clearResult = () => {
    setVisitor(null)
    setStatus("idle")
    setBlacklistReason("")
    setGlobalEntries([])
  }

  const applyVisitor = (v: VisitorSearchResult | null) => {
    if (!v) {
      setVisitor(null)
      setStatus("notfound")
      setBlacklistReason("")
      return
    }
    setVisitor(v)
    setNameQuery(v.name || "")
    setIdType(v.id_type || "ktp")
    setIdNumber(v.id_number || "")
    if (v.vessel_id) setField("location_id", String(v.vessel_id))

    if (v.is_blacklisted) {
      const reason =
        (v.blacklist_reason as string | undefined) ||
        t(
          "create_visit.default_blacklist_reason",
          "Terdaftar di blacklist keamanan"
        )
      setStatus("blacklisted")
      setBlacklistReason(reason)
      toast.error(
        t(
          "create_visit.toast_visitor_blacklisted",
          "Pengunjung ini masuk blacklist."
        ),
        { description: reason }
      )
    } else {
      setStatus("registered")
      setBlacklistReason("")
      requestAnimationFrame(() => {
        locationInputRef.current?.focus()
      })
    }
  }

  const checkIdentity = async (idVal: string, fallback?: VisitorSearchResult) => {
    if (!idVal.trim()) {
      toast.error(
        t("create_visit.toast_enter_id_first", "Isi nomor identitas dulu.")
      )
      return
    }
    setChecking(true)
    try {
      const res = await api.get(
        `/visitors/check-ktp/${encodeURIComponent(idVal.trim())}`
      )
      setGlobalEntries(
        Array.isArray(res.data?.global_blacklist)
          ? res.data.global_blacklist
          : []
      )
      applyVisitor(res.data?.data ?? fallback ?? null)
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number } }
      if (errorObj?.response?.status === 404 && !fallback) {
        applyVisitor(null)
      } else if (fallback) {
        applyVisitor(fallback)
      } else {
        toast.error(
          t(
            "create_visit.toast_check_visitor_failed",
            "Gagal memeriksa pengunjung. Coba lagi."
          )
        )
      }
    } finally {
      setChecking(false)
    }
  }

  const resetVisitor = () => {
    clearResult()
    setNameQuery("")
    setIdNumber("")
    nameInputRef.current?.focus()
  }

  /* ---------- kirim kunjungan ---------- */
  const selectedLocation =
    locations.find((l) => String(l.id) === form.location_id) ?? null
  const isVessel = Boolean(
    selectedLocation?.type && selectedLocation.type !== "location"
  )

  const submitVisit = async (closeOpenVisits = false, override?: string) => {
    if (status !== "registered" || !visitor) {
      toast.error(
        t(
          "create_visit.toast_select_registered_visitor",
          "Pilih pengunjung yang sudah terdaftar dulu."
        )
      )
      return
    }
    if (!form.location_id) {
      return toast.error(
        t(
          "create_visit.toast_select_location",
          "Pilih lokasi / kapal tujuan."
        )
      )
    }
    if (!form.purpose.trim()) {
      return toast.error(
        t("create_visit.toast_enter_purpose", "Isi tujuan kunjungan.")
      )
    }
    if (!form.staff_id) {
      return toast.error(
        t("create_visit.toast_select_staff_host", "Pilih staf yang dikunjungi.")
      )
    }

    // Kartu pengunjung wajib dipilih sebelum request ke backend.
    if (form.card_ids.length === 0) {
      return toast.error(
        t("create_visit.toast_select_card", "Pilih kartu akses dulu.")
      )
    }

    // Tolak kartu pengunjung yang sedang dipakai.
    const usedSelected = cardList.filter(
      (c) => form.card_ids.includes(String(c.id)) && isCardInUse(c)
    )
    if (usedSelected.length > 0) {
      return toast.error(
        t(
          "create_visit.toast_card_in_use",
          "Ada kartu yang sedang dipakai. Pilih kartu lain."
        )
      )
    }

    // Tolak kartu kendaraan yang sedang dipakai.
    if (form.vehicle_card_id) {
      const selectedVehicleCard = vehicleList.find(
        (c) => String(c.id) === String(form.vehicle_card_id)
      )
      if (selectedVehicleCard && isCardInUse(selectedVehicleCard)) {
        return toast.error(
          t(
            "create_visit.toast_vehicle_card_in_use",
            "Kartu kendaraan yang dipilih sedang dipakai. Pilih kartu lain."
          )
        )
      }
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        id_type: visitor.id_type || idType,
        id_number: visitor.id_number,
        name: visitor.name,
        company: visitor.company || "",
        location_id: form.location_id,
        purpose: form.purpose.trim().toUpperCase(),
        staff_id: form.staff_id,
        card_ids: form.card_ids,
        vehicle_no: form.vehicle_no.trim().toUpperCase() || undefined,
        vehicle_card_id: form.vehicle_card_id || undefined,
      }
      if (visitor.occupation) payload.occupation = visitor.occupation
      if (visitor.visitor_type) payload.visitor_type = visitor.visitor_type
      if (visitor.visitor_type === "crew" && isVessel) {
        payload.vessel_id = form.location_id
      }

      if (override) {
        payload.override_global_blacklist = true
        payload.override_reason = override
      }
      if (closeOpenVisits) payload.close_open_visits = true

      const res = await api.post("/visits", payload)
      const created = res.data?.visit || res.data
      if (created?.id) {
        toast.dismiss()
        navigate(`/visits/${created.id}/print`, { state: { visit: created } })
      } else {
        toast.success(
          t("create_visit.toast_visit_recorded", "Kunjungan berhasil dicatat.")
        )
        navigate("/visits/history")
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number
          data?: {
            message?: string
            global_blacklist?: GlobalBlacklistHit
            can_override?: boolean
            open_visit_id?: string | number
          }
        }
      }
      const data = errorObj?.response?.data
      const code = errorObj?.response?.status
      const msg: string = data?.message || ""

      if (code === 422 && data?.global_blacklist) {
        if (data.can_override) {
          setOverrideEntry(data.global_blacklist)
          setOverrideReason("")
        } else {
          toast.error(
            msg ||
              t(
                "create_visit.toast_global_blacklist_rejected",
                "Pengunjung ini ada di blacklist global. Check-in ditolak."
              )
          )
        }
        return
      }

      const lower = msg.toLowerCase()
      if (
        code === 422 &&
        (Boolean(data?.open_visit_id) ||
          lower.includes("kunjungan terbuka") ||
          lower.includes("open visit") ||
          lower.includes("active visit") ||
          lower.includes("close_open_visits"))
      ) {
        setConflictMessage(
          msg ||
            t(
              "create_visit.conflict_default_message",
              "Pengunjung ini masih punya kunjungan terbuka. Tutup kunjungan lama dan lanjutkan check-in?"
            )
        )
        setConflictOpen(true)
        return
      }

      toast.error(
        msg ||
          t(
            "create_visit.toast_submit_failed",
            "Gagal mencatat kunjungan. Periksa data lalu coba lagi."
          )
      )
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-24">
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("create_visit.title", "Pendaftaran Kunjungan")}
        </h1>
        <p className="text-sm text-zinc-500">
          {t(
            "create_visit.subtitle",
            "Cari pengunjung, tentukan tujuan dan staf yang dikunjungi, lalu cetak tiket."
          )}
        </p>
      </div>

      {/* Banner blacklist */}
      {status === "blacklisted" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold">
              {t(
                "create_visit.banner_blacklist_title",
                "Pengunjung masuk blacklist"
              )}
            </p>
            <p>
              {t(
                "create_visit.banner_blacklist_reason",
                "Alasan: {{reason}}",
                { reason: blacklistReason }
              )}
            </p>
            <p className="mt-1 text-xs">
              {t(
                "create_visit.banner_blacklist_help",
                "Check-in tidak bisa dilanjutkan. Hubungi administrator keamanan."
              )}
            </p>
          </div>
        </div>
      )}
      {globalBlock && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold">
              {t(
                "create_visit.banner_global_blacklist_title",
                "Blacklist global"
              )}
            </p>
            <p>
              {t(
                "create_visit.banner_global_blacklist_detail",
                "{{reason}} · didaftarkan {{yard}}",
                {
                  reason: globalBlock.reason_label,
                  yard: globalBlock.registered_by_yard,
                }
              )}
            </p>
            <p className="mt-1 text-xs">
              {t(
                "create_visit.banner_global_blacklist_help",
                "Check-in ditolak. Supervisor dapat meloloskan satu kunjungan dengan alasan tertulis."
              )}
            </p>
          </div>
        </div>
      )}
      {globalWarnings.map((w) => (
        <div
          key={`${w.id_type}-${w.registered_by_yard}`}
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {t(
              "create_visit.banner_global_warning",
              "Nomor yang sama ada di blacklist global sebagai {{id_type}} ({{reason}}, didaftarkan {{yard}}). Periksa dokumen fisik dan cocokkan nama sebelum melanjutkan.",
              {
                id_type: w.id_type.toUpperCase(),
                reason: w.reason_label,
                yard: w.registered_by_yard,
              }
            )}
          </span>
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitVisit(false)
        }}
        className="space-y-6"
      >
        {/* ===== 1. Cari pengunjung ===== */}
        <section className={CARD_CLASS} data-tour="visit-search-section">
          <SectionTitle n={1} icon={User}>
            {t("create_visit.section1_title", "Cari Pengunjung")}
          </SectionTitle>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5" data-tour="visit-name-search">
                <Label htmlFor="visitor_name" className="text-xs font-semibold">
                  {t("create_visit.field_name", "Nama")}
                </Label>
                <VisitorAutocomplete
                  id="visitor_name"
                  inputRef={nameInputRef}
                  value={nameQuery}
                  placeholder={t(
                    "create_visit.search_name_placeholder",
                    "Ketik nama pengunjung..."
                  )}
                  onChange={(v) => {
                    setNameQuery(v)
                    if (status !== "idle") {
                      clearResult()
                      setIdNumber("")
                    }
                  }}
                  onPick={(s) => {
                    setNameQuery(s.name || "")
                    setIdType(s.id_type || "ktp")
                    setIdNumber(s.id_number || "")
                    checkIdentity(s.id_number || "", s)
                  }}
                />
                <p className="text-[11px] text-zinc-500">
                  {t(
                    "create_visit.search_name_hint",
                    "Hasil teratas langsung tersorot: tekan Enter atau Tab untuk memilih, atau ketuk nama dari daftar."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                {t(
                  "create_visit.or_search_by_id",
                  "atau cari dengan nomor identitas"
                )}
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="grid grid-cols-3 gap-2" data-tour="visit-id-lookup">
                <div className="space-y-1.5">
                  <Label htmlFor="id_type" className="text-xs font-semibold">
                    {t("create_visit.id_type", "Jenis ID")}
                  </Label>
                  <select
                    id="id_type"
                    tabIndex={-1}
                    value={idType}
                    onChange={(e) => {
                      setIdType(e.target.value)
                      if (status !== "idle") clearResult()
                    }}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="ktp">
                      {t("create_visit.id_type_ktp", "KTP")}
                    </option>
                    <option value="sim">
                      {t("create_visit.id_type_sim", "SIM")}
                    </option>
                    <option value="passport">
                      {t("create_visit.id_type_passport", "Paspor")}
                    </option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="id_number" className="text-xs font-semibold">
                    {t("create_visit.id_number", "Nomor ID")}
                  </Label>
                  <VisitorAutocomplete
                    id="id_number"
                    value={idNumber}
                    tabIndex={status === "registered" ? -1 : undefined}
                    placeholder={t(
                      "create_visit.id_number_placeholder",
                      "Ketik nomor, tekan Enter untuk cek"
                    )}
                    onChange={(v) => {
                      setIdNumber(v)
                      if (status !== "idle") {
                        clearResult()
                        setNameQuery("")
                      }
                    }}
                    onPick={(s) => {
                      setNameQuery(s.name || "")
                      setIdType(s.id_type || "ktp")
                      setIdNumber(s.id_number || "")
                      checkIdentity(s.id_number || "", s)
                    }}
                    onEnter={() => checkIdentity(idNumber)}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                tabIndex={-1}
                disabled={checking || !idNumber.trim()}
                onClick={() => checkIdentity(idNumber)}
                className="w-full"
              >
                {checking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {t("create_visit.check_id_btn", "Cek nomor ID")}
              </Button>
            </div>

            {/* Hasil */}
            <div data-tour="visit-status-panel">
              {status === "idle" && (
                <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  {t(
                    "create_visit.result_idle_placeholder",
                    "Hasil pengecekan akan muncul di sini."
                  )}
                </div>
              )}

              {(status === "registered" || status === "blacklisted") &&
                visitor && (
                  <div
                    className={cn(
                      "space-y-3 rounded-md border p-4",
                      status === "registered"
                        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-red-300 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm font-semibold",
                          status === "registered"
                            ? "text-emerald-800 dark:text-emerald-300"
                            : "text-red-800 dark:text-red-300"
                        )}
                      >
                        {status === "registered" ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        {status === "registered"
                          ? t(
                              "create_visit.status_registered",
                              "Pengunjung ditemukan"
                            )
                          : t(
                              "create_visit.status_blacklisted",
                              "Pengunjung diblacklist"
                            )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        onClick={resetVisitor}
                        className="h-7 text-xs"
                      >
                        <X className="mr-1 h-3 w-3" />{" "}
                        {t("create_visit.change_visitor_btn", "Ganti")}
                      </Button>
                    </div>
                    <dl className="space-y-1 rounded border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                      {[
                        [
                          t("create_visit.summary_name", "Nama"),
                          visitor.name,
                        ],
                        [
                          t("create_visit.summary_id", "ID"),
                          `${(visitor.id_type || idType).toUpperCase()} ${visitor.id_number}`,
                        ],
                        [
                          t("create_visit.summary_company", "Perusahaan"),
                          visitor.company || "-",
                        ],
                        [
                          t("create_visit.summary_type", "Tipe"),
                          getVisitorTypeLabel(visitor.visitor_type),
                        ],
                        ...(visitor.visits_count !== undefined
                          ? [
                              [
                                t(
                                  "create_visit.summary_visit_history",
                                  "Riwayat kunjungan"
                                ),
                                t(
                                  "create_visit.summary_visit_count",
                                  "{{count}} kali",
                                  { count: formatNumber(Number(visitor.visits_count)) }
                                ),
                              ],
                            ]
                          : []),
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-zinc-500">{k}</dt>
                          <dd className="text-right font-medium uppercase">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

              {status === "notfound" && (
                <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserX className="h-4 w-4" />{" "}
                    {t(
                      "create_visit.status_not_found",
                      "Pengunjung belum terdaftar"
                    )}
                  </div>
                  <p className="text-xs">
                    {t(
                      "create_visit.not_found_help",
                      "Halaman ini hanya untuk mengecek. Daftarkan pengunjung di menu Data Pengunjung, lalu cari lagi di sini."
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetVisitor}
                  >
                    {t("create_visit.search_again_btn", "Cari lagi")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Langkah 2 & 3 (Komponen Bersama VisitFormFields) */}
        <VisitFormFields
          mode="create"
          form={form}
          onChangeField={setField}
          onResetDestination={handleResetDestination}
          locations={locations}
          staffList={staffList}
          cardList={cardList}
          vehicleList={vehicleList}
          purposes={purposes}
          loadingMaster={loadingMaster}
          disabled={!canFill}
          locationInputRef={locationInputRef}
          purposeInputRef={purposeInputRef}
        />

        {/* Bar bawah */}
        <div
          data-tour="visit-submit-bar"
          className="sticky bottom-0 z-20 -mx-4 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:mx-0 sm:flex-row sm:rounded-lg dark:border-zinc-800 dark:bg-zinc-950/95"
        >
          <p className="hidden text-xs text-zinc-500 sm:block">
            {status === "blacklisted" ? (
              <span className="font-medium text-red-600">
                {t(
                  "create_visit.footer_status_blacklisted",
                  "Pendaftaran diblokir karena pengunjung masuk blacklist."
                )}
              </span>
            ) : status === "registered" ? (
              t(
                "create_visit.footer_status_registered",
                "Lengkapi tujuan, staf yang dikunjungi, dan kartu, lalu cetak tiket."
              )
            ) : (
              t(
                "create_visit.footer_status_idle",
                "Cari dan pilih pengunjung terlebih dahulu."
              )
            )}
          </p>
          <Button
            type="submit"
            disabled={loading || !canFill}
            className="h-11 w-full px-8 font-semibold sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("create_visit.submitting_btn", "Menyimpan...")}
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />{" "}
                {t("create_visit.submit_btn", "Simpan & Cetak Tiket")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Dialog: kunjungan lama masih terbuka */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />{" "}
              {t("create_visit.conflict_title", "Kunjungan lama masih terbuka")}
            </DialogTitle>
            <DialogDescription>{conflictMessage}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-zinc-500">
            {t(
              "create_visit.conflict_desc",
              "Kunjungan lama akan di-check-out otomatis, lalu kunjungan baru langsung didaftarkan."
            )}
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setConflictOpen(false)}
              disabled={loading}
            >
              {t("common.cancel", "Batal")}
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                setConflictOpen(false)
                submitVisit(true)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t(
                "create_visit.close_and_checkin",
                "Tutup kunjungan lama & check-in"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: override supervisor untuk blacklist global */}
      <Dialog
        open={overrideEntry !== null}
        onOpenChange={(open) => !open && setOverrideEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Globe className="h-5 w-5" />{" "}
              {t(
                "create_visit.override_title",
                "Loloskan satu kunjungan (override supervisor)"
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                "create_visit.override_desc",
                "Pengunjung ini ada di blacklist global ({{reason}}, didaftarkan {{yard}}). Override hanya berlaku untuk kunjungan ini, tercatat di log aktivitas, dan tidak mencabut entri global.",
                {
                  reason: overrideEntry?.reason_label ?? "-",
                  yard: overrideEntry?.registered_by_yard ?? "-",
                }
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="override_reason">
              {t(
                "create_visit.override_reason_label",
                "Alasan (minimal 10 karakter)"
              )}
            </Label>
            <Textarea
              id="override_reason"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setOverrideEntry(null)}
              disabled={loading}
            >
              {t("common.cancel", "Batal")}
            </Button>
            <Button
              variant="destructive"
              disabled={loading || overrideReason.trim().length < 10}
              onClick={() => {
                const reason = overrideReason.trim()
                setOverrideEntry(null)
                submitVisit(false, reason)
              }}
            >
              {t("create_visit.override_submit", "Loloskan & check-in")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}