import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  ChevronsUpDown,
  Building2,
  CreditCard,
  Ship,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export interface LocationItem {
  id: number | string
  name: string
  code?: string | null
  type?: string
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  captain?: string | null
  pic?: string | null
  is_active?: boolean | number
}

export interface StaffItem {
  id: number | string
  staff_id?: string
  name: string
  department?: string
  occupation?: string
  address?: string
  company?: string
  is_active?: boolean | number
}

export interface CardItem {
  id: number | string
  card_no: string
  status: string
}

export interface VisitorSearchResult {
  id: number | string
  name: string
  id_type?: string
  id_number?: string
  phone?: string | null
  company?: string | null
  visitor_type?: string | null
  visits_count?: number
  vessel_id?: string | number | null
  is_blacklisted?: boolean | number
  blacklist_reason?: string | null
  [key: string]: unknown
}

export interface VisitFormValues {
  location_id: string
  purpose: string
  staff_id: string
  card_ids: string[]
  vehicle_card_id: string
  vehicle_no: string
  visitor_company?: string
}

export interface Opt {
  value: string
  label: string
  sub?: string
  search?: string
  /** Opsi tetap tampil tapi tidak bisa dipilih (ditandai merah). */
  disabled?: boolean
  /** Label kecil di kanan opsi, mis. "IN USE". */
  badge?: string
}

type Row = { opt: Opt | null }

const WRAPPER_KEYS = [
  "data",
  "locations",
  "staffs",
  "cards",
  "vehicle_cards",
  "vehicleCards",
  "purposes",
  "items",
  "results",
  "visitors",
] as const

export const unwrap = (res: unknown): unknown[] => {
  if (!res) return []
  if (Array.isArray(res)) return res

  const hasDataProp = res && typeof res === "object" && "data" in res
  const payload = hasDataProp ? (res as { data: unknown }).data : res
  if (Array.isArray(payload)) return payload

  if (payload && typeof payload === "object") {
    for (const key of WRAPPER_KEYS) {
      const candidate = (payload as Record<string, unknown>)[key]
      if (Array.isArray(candidate)) return candidate
      if (candidate && typeof candidate === "object") {
        for (const nestedKey of WRAPPER_KEYS) {
          const nested = (candidate as Record<string, unknown>)[nestedKey]
          if (Array.isArray(nested)) return nested
        }
      }
    }
  }

  return []
}

export const CARD_CLASS =
  "rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"

export const UPPER_WHEN_FILLED = "[&:not(:placeholder-shown)]:uppercase"

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_VISIBLE_OPTIONS = 100

let cache: {
  locations: LocationItem[]
  staffList: StaffItem[]
  purposes: string[]
  at: number
} | null = null

export function resetCreateVisitCache() {
  cache = null
}

export function upperKeepCaret(e: React.ChangeEvent<HTMLInputElement>): string {
  const el = e.target
  const { selectionStart, selectionEnd } = el
  const next = el.value.toUpperCase()
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(selectionStart, selectionEnd)
    } catch {
      /* ignore */
    }
  })
  return next
}

export function focusNextField(from: HTMLElement) {
  const form = from.closest("form")
  if (!form) return
  const focusables = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])'
    )
  )
  const i = focusables.indexOf(from)
  if (i >= 0) focusables[i + 1]?.focus()
}

export function filterOptions(options: Opt[], q: string): Opt[] {
  const full = q.trim().toLowerCase()
  const tokens = full.split(/\s+/).filter(Boolean)
  if (!tokens.length) return options

  const scored: { o: Opt; s: number }[] = []
  for (const o of options) {
    const label = o.label.toLowerCase()
    const hay = `${label} ${(o.sub ?? "").toLowerCase()} ${(o.search ?? "").toLowerCase()}`
    if (!tokens.every((tk) => hay.includes(tk))) continue
    const s = label === full ? 0 : label.startsWith(full) ? 1 : label.includes(full) ? 2 : 3
    scored.push({ o, s })
  }
  return scored.sort((a, b) => a.s - b.s).map((x) => x.o)
}

/**
 * Kartu dianggap "sedang dipakai" jika statusnya bukan "available".
 * Kartu yang dipegang kunjungan yang sedang diedit (heldIds) tidak dianggap
 * dipakai, supaya tetap bisa dipilih / dilepas / ditukar.
 * ID selalu dibandingkan sebagai string agar UUID aman.
 */
export function isCardInUse(
  card: CardItem,
  heldIds?: Set<string>
): boolean {
  if (heldIds?.has(String(card.id))) return false
  return card.status !== "available"
}

export function cardStatusBadge(status: string): string {
  if (!status || status === "in_use") return "IN USE"
  return status.replace(/_/g, " ").toUpperCase()
}

/**
 * Filter lama (hanya kartu available + kartu yang dipegang kunjungan ini).
 * Dipertahankan supaya import/test lama tetap jalan.
 */
export function filterAvailableCards(
  allCards: CardItem[],
  heldCards: Array<{ id: number | string; card_no: string }> = []
): CardItem[] {
  const heldIds = new Set(heldCards.map((c) => String(c.id)).filter(Boolean))
  const seen = new Set<string>()
  const result: CardItem[] = []

  for (const held of heldCards) {
    const idStr = String(held.id)
    if (!idStr || seen.has(idStr)) continue
    const fromMaster = allCards.find((c) => String(c.id) === idStr)
    seen.add(idStr)
    result.push(
      fromMaster ?? {
        id: held.id,
        card_no: held.card_no,
        status: "in_use",
      }
    )
  }

  for (const card of allCards) {
    const idStr = String(card.id)
    if (seen.has(idStr)) continue
    if (card.status === "available" || heldIds.has(idStr)) {
      seen.add(idStr)
      result.push(card)
    }
  }

  return result
}

/**
 * BARU: tampilkan SEMUA kartu (termasuk yang sedang dipakai) supaya bisa
 * ditandai merah di dropdown. Kartu yang dipegang kunjungan ini dimasukkan
 * walau tidak ada di halaman pertama /cards.
 */
export function withHeldCards(
  allCards: CardItem[],
  heldCards: Array<{ id: number | string; card_no: string }> = []
): CardItem[] {
  const seen = new Set<string>()
  const result: CardItem[] = []

  for (const held of heldCards) {
    const idStr = String(held.id)
    if (!idStr || seen.has(idStr)) continue
    const fromMaster = allCards.find((c) => String(c.id) === idStr)
    seen.add(idStr)
    result.push(
      fromMaster ?? {
        id: held.id,
        card_no: held.card_no,
        status: "in_use",
      }
    )
  }

  for (const card of allCards) {
    const idStr = String(card.id)
    if (seen.has(idStr)) continue
    seen.add(idStr)
    result.push(card)
  }

  return result
}

/* ------------------------------------------------------------------ */
/* Shared Hook: useVisitMasterData                                     */
/* ------------------------------------------------------------------ */

export function useVisitMasterData(options?: {
  enabled?: boolean
  heldVisitorCards?: Array<{ id: number | string; card_no: string }>
  heldVehicleCard?: { id: number | string; card_no: string } | null
}) {
  const enabled = options?.enabled ?? true
  const heldVisitorCards = options?.heldVisitorCards ?? []
  const heldVehicleCard = options?.heldVehicleCard ?? null
  const { t } = useTranslation()
  const tRef = useRef(t)
  tRef.current = t

  const [loadingMaster, setLoadingMaster] = useState(true)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [rawCards, setRawCards] = useState<CardItem[]>([])
  const [rawVehicleCards, setRawVehicleCards] = useState<CardItem[]>([])
  const [purposes, setPurposes] = useState<string[]>([])

  const heldVisitorKey = heldVisitorCards.map((c) => `${c.id}:${c.card_no}`).join(",")
  const heldVehicleKey = heldVehicleCard ? `${heldVehicleCard.id}:${heldVehicleCard.card_no}` : ""

  useEffect(() => {
    if (!enabled) return
    let alive = true

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      setLocations(cache.locations)
      setStaffList(cache.staffList)
      setPurposes(cache.purposes)
      setLoadingMaster(false)
    } else {
      setLoadingMaster(true)
    }

    const fetchEndpoint = async (
      url: string,
      params?: Record<string, unknown>
    ): Promise<{ ok: boolean; data: unknown[] }> => {
      try {
        const res = params ? await api.get(url, { params }) : await api.get(url)
        return { ok: true, data: unwrap(res) }
      } catch (err: unknown) {
        const errorObj = err as { response?: { status?: number | string } }
        const statusCode = errorObj?.response?.status ?? "ERR"
        console.error(`[VisitForm] Failed to load master data from ${url}`, {
          endpoint: url,
          status: statusCode,
          error: err,
        })
        if (alive) {
          toast.error(
            tRef.current(
              "create_visit.toast_master_load_failed",
              "Gagal memuat data {{endpoint}} (status: {{status}}).",
              { endpoint: url, status: statusCode }
            )
          )
        }
        return { ok: false, data: [] }
      }
    }

    Promise.all([
      fetchEndpoint("/locations", { per_page: 1000 }),
      fetchEndpoint("/staffs", { per_page: 1000 }),
      fetchEndpoint("/cards", { per_page: 1000 }),
      fetchEndpoint("/vehicle-cards", { per_page: 1000 }),
      fetchEndpoint("/lookups/purposes"),
    ])
      .then(([locRes, staffRes, cardsRes, vehiclesRes, purposesRes]) => {
        if (!alive) return

        const activeLocations = (locRes.data as LocationItem[]).filter(
          (l: LocationItem) => l.is_active === undefined || Boolean(l.is_active)
        )
        const activeStaff = (staffRes.data as StaffItem[]).filter(
          (s: StaffItem) => s.is_active === undefined || Boolean(s.is_active)
        )
        const pList = (purposesRes.data as (string | { purpose?: string })[])
          .map((p) => (typeof p === "string" ? p : p?.purpose || ""))
          .filter(Boolean)

        if (locRes.ok) setLocations(activeLocations)
        if (staffRes.ok) setStaffList(activeStaff)
        if (purposesRes.ok) setPurposes(pList)
        if (cardsRes.ok) setRawCards(cardsRes.data as CardItem[])
        if (vehiclesRes.ok) setRawVehicleCards(vehiclesRes.data as CardItem[])

        if (locRes.ok && staffRes.ok && purposesRes.ok) {
          cache = {
            locations: activeLocations,
            staffList: activeStaff,
            purposes: pList,
            at: Date.now(),
          }
        }
      })
      .finally(() => {
        if (alive) setLoadingMaster(false)
      })

    return () => {
      alive = false
    }
  }, [enabled])

  // SEMUA kartu (yang dipakai ditandai merah di UI, tidak bisa dipilih)
  const cardList = useMemo(
    () => withHeldCards(rawCards, heldVisitorCards),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawCards, heldVisitorKey]
  )

  const vehicleList = useMemo(
    () =>
      withHeldCards(
        rawVehicleCards,
        heldVehicleCard ? [heldVehicleCard] : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawVehicleCards, heldVehicleKey]
  )

  const availableOnlyCardCount = useMemo(
    () => rawCards.filter((c) => c.status === "available").length,
    [rawCards]
  )

  const availableOnlyVehicleCardCount = useMemo(
    () => rawVehicleCards.filter((c) => c.status === "available").length,
    [rawVehicleCards]
  )

  return {
    loadingMaster,
    locations,
    staffList,
    cardList,
    vehicleList,
    purposes,
    availableOnlyCardCount,
    availableOnlyVehicleCardCount,
  }
}

/* ------------------------------------------------------------------ */
/* Small UI building blocks                                            */
/* ------------------------------------------------------------------ */

export function KeyHint({ extra }: { extra?: string }) {
  const { t } = useTranslation()
  return (
    <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      {extra && <div className="mb-0.5 text-center">{extra}</div>}
      {t(
        "create_visit.keyboard_hint",
        "↑ ↓ pilih · Enter pilih · Tab pilih & lanjut · Esc tutup"
      )}
    </div>
  )
}

export function EnterBadge() {
  const { t } = useTranslation()
  return (
    <kbd className="shrink-0 rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300">
      {t("create_visit.enter_key", "Enter ↵")}
    </kbd>
  )
}

export const ROW_BASE = "flex cursor-pointer items-center gap-2 border-l-4 px-3 py-2"
export const ROW_ACTIVE =
  "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
export const ROW_IDLE = "border-transparent"
export const ROW_LOCKED =
  "cursor-not-allowed border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-300"
export const DROPDOWN =
  "absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"

export function SearchSelect({
  id,
  inputRef,
  options,
  value,
  onChange,
  multiple,
  allowCustom,
  upper,
  placeholder,
  emptyText,
  noneLabel,
  disabled,
}: {
  id: string
  inputRef?: React.Ref<HTMLInputElement>
  options: Opt[]
  value: string[]
  onChange: (v: string[]) => void
  multiple?: boolean
  allowCustom?: boolean
  upper?: boolean
  placeholder: string
  emptyText: string
  noneLabel?: string
  disabled?: boolean
}) {
  const { t, formatNumber } = useTranslation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [navigated, setNavigated] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  )

  const q = allowCustom ? (value[0] ?? "") : editing ? query : ""
  const hasQuery = q.trim() !== ""

  const filtered = useMemo(() => filterOptions(options, q), [options, q])

  const visible = useMemo(() => {
    const ordered = hasQuery
      ? filtered
      : [...selected, ...options.filter((o) => !value.includes(o.value))]
    // Opsi yang bisa dipilih di atas, yang terkunci (merah) di bawah.
    const free = ordered.filter((o) => !o.disabled)
    const locked = ordered.filter((o) => o.disabled)
    return [...free, ...locked].slice(0, MAX_VISIBLE_OPTIONS)
  }, [hasQuery, filtered, selected, options, value])

  const rows: Row[] = useMemo(
    () => [
      ...(noneLabel && !hasQuery ? [{ opt: null }] : []),
      ...visible.map((opt) => ({ opt })),
    ],
    [noneLabel, hasQuery, visible]
  )

  useEffect(() => {
    setActive(0)
    setNavigated(false)
  }, [q])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  const canAccept = hasQuery || navigated

  const choose = (
    row: Row,
    how: "mouse" | "enter" | "tab",
    el?: HTMLInputElement
  ) => {
    const opt = row.opt

    // Opsi terkunci (kartu sedang dipakai) tidak bisa dipilih.
    // Kalau sudah terlanjur terpilih, tetap boleh dilepas.
    if (opt?.disabled && !value.includes(opt.value)) {
      if (how !== "tab") {
        toast.error(
          t(
            "create_visit.toast_option_locked",
            "{{item}} sedang dipakai. Pilih yang lain.",
            { item: opt.label }
          )
        )
      }
      return
    }

    if (!opt) onChange([])
    else if (multiple) {
      onChange(
        value.includes(opt.value)
          ? value.filter((v) => v !== opt.value)
          : [...value, opt.value]
      )
    } else {
      onChange([allowCustom ? opt.label : opt.value])
    }

    if (multiple && opt) {
      setQuery("")
      return
    }

    setOpen(false)
    setEditing(false)
    setQuery("")
    if (how === "mouse") (document.activeElement as HTMLElement | null)?.blur()
    if (how === "enter" && el) requestAnimationFrame(() => focusNextField(el))
  }

  const hasValue = allowCustom ? Boolean(value[0]?.trim()) : selected.length > 0

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    const count = rows.length

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setNavigated(true)
      setActive((i) => (count ? (i + 1) % count : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      setNavigated(true)
      setActive((i) => (count ? (i <= 0 ? count - 1 : i - 1) : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && canAccept && rows[active]) {
        choose(rows[active], "enter", e.currentTarget)
      } else if (!multiple && hasValue) {
        focusNextField(e.currentTarget)
      }
    } else if (e.key === "Tab" && !e.shiftKey) {
      if (open && canAccept && rows[active]) choose(rows[active], "tab")
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const inputValue = allowCustom
    ? (value[0] ?? "")
    : multiple
      ? query
      : editing
        ? query
        : (selected[0]?.label ?? "")

  const inputPlaceholder =
    !multiple && !allowCustom && editing && selected[0]
      ? selected[0].label
      : placeholder

  const showList = open && !disabled && (rows.length > 0 || !allowCustom)

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={inputValue}
        disabled={disabled}
        autoComplete="off"
        placeholder={inputPlaceholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        onChange={(e) => {
          setOpen(true)
          if (allowCustom) {
            onChange([upper ? upperKeepCaret(e) : e.target.value])
          } else {
            setEditing(true)
            setQuery(e.target.value)
          }
        }}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
          if (!multiple && !allowCustom) {
            setEditing(true)
            setQuery("")
          }
        }}
        onBlur={() => {
          setOpen(false)
          setEditing(false)
          setQuery("")
        }}
        onKeyDown={onKeyDown}
        className={cn("h-10 pr-9", UPPER_WHEN_FILLED)}
      />
      <ChevronsUpDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-50" />

      {showList && (
        <div className={DROPDOWN} onMouseDown={(e) => e.preventDefault()}>
          <div
            id={`${id}-list`}
            role="listbox"
            aria-multiselectable={multiple}
            ref={listRef}
            className="max-h-64 overflow-auto"
          >
            {rows.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                {emptyText}
              </div>
            ) : (
              rows.map((row, i) => {
                const isSel = row.opt
                  ? value.includes(row.opt.value)
                  : value.length === 0
                const locked = Boolean(row.opt?.disabled) && !isSel
                return (
                  <div
                    key={row.opt?.value ?? "__none__"}
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={locked}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choose(row, "mouse")
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      ROW_BASE,
                      locked ? ROW_LOCKED : i === active ? ROW_ACTIVE : ROW_IDLE
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSel ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {row.opt ? (
                        <>
                          <p className="truncate text-xs font-medium uppercase">
                            {row.opt.label}
                          </p>
                          {row.opt.sub && (
                            <p
                              className={cn(
                                "truncate text-[11px] uppercase",
                                locked ? "text-red-500" : "text-zinc-500"
                              )}
                            >
                              {row.opt.sub}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs italic text-zinc-500">{noneLabel}</p>
                      )}
                    </div>
                    {row.opt?.badge && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                          locked
                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        {row.opt.badge}
                      </span>
                    )}
                    {i === active && canAccept && !locked && <EnterBadge />}
                  </div>
                )
              })
            )}
          </div>
          {rows.length > 0 && (
            <KeyHint
              extra={
                (hasQuery ? filtered.length : options.length) > MAX_VISIBLE_OPTIONS
                  ? t(
                      "create_visit.picker_showing_limit",
                      "Menampilkan 100 dari {{total}} pilihan — ketik di kotak pencarian untuk menyaring.",
                      {
                        total: formatNumber(
                          hasQuery ? filtered.length : options.length
                        ),
                      }
                    )
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  )
}

export function SectionTitle({
  n,
  icon: Icon,
  children,
}: {
  n: number
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {n}
      </span>
      <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
      <h2 className="text-base font-semibold">{children}</h2>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared VisitFormFields (Step 2 & Step 3 used in Create and Edit)    */
/* ------------------------------------------------------------------ */

export interface VisitFormFieldsProps {
  mode: "create" | "edit"
  form: VisitFormValues
  onChangeField: <K extends keyof VisitFormValues>(
    key: K,
    val: VisitFormValues[K]
  ) => void
  locations: LocationItem[]
  staffList: StaffItem[]
  cardList: CardItem[]
  vehicleList: CardItem[]
  purposes: string[]
  loadingMaster: boolean
  disabled?: boolean
  locationInputRef?: React.Ref<HTMLInputElement>
  purposeInputRef?: React.Ref<HTMLInputElement>
  heldVisitorCards?: Array<{ id: number | string; card_no: string }>
  onResetDestination?: () => void
}

export function VisitFormFields({
  mode,
  form,
  onChangeField,
  locations,
  staffList,
  cardList,
  vehicleList,
  purposes,
  loadingMaster,
  disabled = false,
  locationInputRef,
  purposeInputRef,
  heldVisitorCards = [],
  onResetDestination,
}: VisitFormFieldsProps) {
  const { t, formatNumber } = useTranslation()

  const selectedLocation =
    locations.find((l) => String(l.id) === form.location_id) ?? null
  const isVessel = Boolean(
    selectedLocation?.type && selectedLocation.type !== "location"
  )

  const locationOptions = useMemo<Opt[]>(
    () =>
      locations.map((l) => ({
        value: String(l.id),
        label: l.name,
        sub: [
          l.code ? `IMO ${l.code}` : null,
          l.vessel_type || (l.type && l.type !== "location" ? l.type : null),
          l.captain,
          l.pic,
        ]
          .filter(Boolean)
          .join(" · "),
        search: [l.call_sign, l.flag, l.type].filter(Boolean).join(" "),
      })),
    [locations]
  )

  const staffOptions = useMemo<Opt[]>(
    () =>
      staffList.map((s) => ({
        value: String(s.id),
        label: s.name,
        sub: [s.staff_id, s.occupation, s.department || s.company, s.address]
          .filter(Boolean)
          .join(" · "),
      })),
    [staffList]
  )

  const purposeOptions = useMemo<Opt[]>(() => {
    const seen = new Set<string>()
    const out: Opt[] = []
    for (const p of purposes) {
      const label = p.trim().toUpperCase()
      if (label && !seen.has(label)) {
        seen.add(label)
        out.push({ value: label, label })
      }
    }
    return out
  }, [purposes])

  const heldIdsSet = useMemo(
    () => new Set(heldVisitorCards.map((c) => String(c.id))),
    [heldVisitorCards]
  )

  // Semua kartu tampil; yang sedang dipakai merah + tidak bisa dipilih.
  const cardOptions = useMemo<Opt[]>(
    () =>
      cardList.map((c) => {
        const inUse = isCardInUse(c, heldIdsSet)
        return {
          value: String(c.id),
          label: c.card_no,
          disabled: inUse,
          badge: inUse ? cardStatusBadge(c.status) : undefined,
          sub:
            mode === "edit" && heldIdsSet.has(String(c.id))
              ? t("visit_history.card_currently_held", "Dipegang kunjungan ini")
              : undefined,
        }
      }),
    [cardList, mode, heldIdsSet, t]
  )

  const vehicleOptions = useMemo<Opt[]>(
    () =>
      vehicleList.map((c) => {
        const inUse = isCardInUse(c, new Set(form.vehicle_card_id ? [form.vehicle_card_id] : []))
        return {
          value: String(c.id),
          label: c.card_no,
          disabled: inUse,
          badge: inUse ? cardStatusBadge(c.status) : undefined,
        }
      }),
    [vehicleList, form.vehicle_card_id]
  )

  const cardAvailableCount = useMemo(
    () => cardList.filter((c) => !isCardInUse(c, heldIdsSet)).length,
    [cardList, heldIdsSet]
  )
  const cardInUseCount = cardList.length - cardAvailableCount

  const vehicleAvailableCount = useMemo(
    () => vehicleOptions.filter((o) => !o.disabled).length,
    [vehicleOptions]
  )
  const vehicleInUseCount = vehicleOptions.length - vehicleAvailableCount

  const selectedStaff = useMemo(
    () => staffList.find((s) => String(s.id) === String(form.staff_id)),
    [staffList, form.staff_id]
  )

  return (
    <fieldset
      disabled={disabled}
      className={cn(
        "grid items-start gap-6 md:grid-cols-2",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* ===== 2. Tujuan & Staf yang Dikunjungi ===== */}
      <section className={cn(CARD_CLASS, "min-w-0 space-y-4")} data-tour="visit-destination-host">
        <div className="flex items-center justify-between">
          <SectionTitle n={2} icon={Building2}>
            {t("create_visit.section2_title", "Tujuan & Staf yang Dikunjungi")}
          </SectionTitle>
          {onResetDestination && (form.location_id || form.purpose || form.staff_id) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetDestination}
              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              title={t("create_visit.btn_reset_destination", "Kosongkan tujuan & staf yang dikunjungi")}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {t("common.reset", "Reset")}
            </Button>
          ) : null}
        </div>

        {mode === "edit" && (
          <div className="space-y-1.5">
            <Label htmlFor="visitor_company" className="text-xs font-semibold">
              {t("visit_history.company_label", "Perusahaan / Instansi")}
            </Label>
            <Input
              id="visitor_company"
              value={form.visitor_company ?? ""}
              onChange={(e) => onChangeField("visitor_company", e.target.value)}
              placeholder={t(
                "visit_history.company_placeholder",
                "Nama perusahaan / instansi..."
              )}
              className="h-10"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="location_id" className="text-xs font-semibold">
            {t("create_visit.location_vessel", "Lokasi / Kapal *")}
          </Label>
          <SearchSelect
            id="location_id"
            inputRef={locationInputRef}
            options={locationOptions}
            value={form.location_id ? [form.location_id] : []}
            onChange={(v) => onChangeField("location_id", v[0] ?? "")}
            disabled={loadingMaster}
            placeholder={
              loadingMaster
                ? t(
                    "create_visit.location_loading_placeholder",
                    "Memuat daftar lokasi & kapal..."
                  )
                : t(
                    "create_visit.location_select_placeholder",
                    "Ketik nama kapal / lokasi, IMO, captain, PIC, call sign..."
                  )
            }
            emptyText={t(
              "create_visit.location_empty",
              "Lokasi atau kapal tidak ditemukan."
            )}
          />
        </div>

        {selectedLocation && isVessel && (
          <div
            role="region"
            aria-label={t(
              "create_visit.vessel_info_aria",
              "Informasi kapal tujuan"
            )}
            className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <Ship className="h-4 w-4 text-emerald-600" />
                {selectedLocation.name}
              </div>
              <div className="flex gap-1.5">
                {selectedLocation.code && (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {t("create_visit.vessel_imo_prefix", "IMO")}:{" "}
                    {selectedLocation.code}
                  </Badge>
                )}
                <Badge className="bg-emerald-600 text-[10px] text-white">
                  {selectedLocation.vessel_type || selectedLocation.type}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [
                    t("create_visit.vessel_captain", "Captain / Nakhoda"),
                    selectedLocation.captain,
                  ],
                  [
                    t("create_visit.vessel_pic", "PIC Kapal"),
                    selectedLocation.pic,
                  ],
                ] as const
              ).map(([label, person]) => (
                <div
                  key={label}
                  className="rounded border border-emerald-100 bg-white/80 p-2 dark:border-emerald-900/50 dark:bg-zinc-900/70"
                >
                  <span className="block text-[10px] text-zinc-500">
                    {label}
                  </span>
                  <span className="font-semibold">{person || "-"}</span>
                </div>
              ))}
              <div>
                <span className="block text-[10px] text-zinc-500">
                  {t("create_visit.vessel_call_sign", "Call Sign")}
                </span>
                <span className="font-mono">
                  {selectedLocation.call_sign || "-"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">
                  {t("create_visit.vessel_flag", "Bendera")}
                </span>
                <span>{selectedLocation.flag || "-"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="purpose" className="text-xs font-semibold">
            {t("create_visit.purpose_of_visit", "Tujuan kunjungan *")}
          </Label>
          <SearchSelect
            id="purpose"
            inputRef={purposeInputRef}
            allowCustom
            upper={mode === "create"}
            options={purposeOptions}
            value={form.purpose ? [form.purpose] : []}
            onChange={(v) => onChangeField("purpose", v[0] ?? "")}
            placeholder={t(
              "create_visit.purpose_placeholder",
              "Ketik tujuan kunjungan..."
            )}
            emptyText=""
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="staff_id" className="text-xs font-semibold">
            {t("create_visit.host_label", "Staf yang Dikunjungi *")}
          </Label>
          <SearchSelect
            id="staff_id"
            options={staffOptions}
            value={form.staff_id ? [form.staff_id] : []}
            onChange={(v) => onChangeField("staff_id", v[0] ?? "")}
            disabled={loadingMaster}
            placeholder={
              loadingMaster
                ? t(
                    "create_visit.staff_loading_placeholder",
                    "Memuat daftar staf..."
                  )
                : t(
                    "create_visit.staff_select_placeholder",
                    "Ketik nama staf, nomor staf, perusahaan..."
                  )
            }
            emptyText={t("create_visit.staff_empty", "Staf tidak ditemukan.")}
          />
          {selectedStaff && (selectedStaff.occupation || selectedStaff.department) && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              <span className="rounded bg-blue-50 px-1.5 py-0.5 dark:bg-blue-950/40">
                {[selectedStaff.occupation, selectedStaff.department].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
          <p className="text-[11px] text-zinc-500">
            {t(
              "create_visit.host_add_hint",
              "Staf tidak ada di daftar? Tambahkan dulu di halaman Staf."
            )}
          </p>
        </div>
      </section>

      {/* ===== 3. Kartu & kendaraan ===== */}
      <section className={cn(CARD_CLASS, "min-w-0 space-y-4")} data-tour="visit-cards-section">
        <SectionTitle n={3} icon={CreditCard}>
          {t("create_visit.section3_title", "Kartu Akses & Kendaraan")}
        </SectionTitle>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="card_ids" className="text-xs font-semibold">
              {mode === "create"
                ? t(
                    "create_visit.visitor_card_label_required",
                    "Kartu pengunjung *"
                  )
                : t(
                    "create_visit.visitor_card_label",
                    "Kartu pengunjung (opsional)"
                  )}
            </Label>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-[11px]">
                {loadingMaster
                  ? t("common.loading", "Memuat...")
                  : t(
                      "create_visit.available_cards_count",
                      "{{count}} tersedia",
                      { count: formatNumber(cardAvailableCount) }
                    )}
              </Badge>
              {!loadingMaster && cardInUseCount > 0 && (
                <Badge className="border border-red-300 bg-red-50 font-mono text-[11px] text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {t(
                    "create_visit.in_use_cards_count",
                    "{{count}} dipakai",
                    { count: formatNumber(cardInUseCount) }
                  )}
                </Badge>
              )}
            </div>
          </div>
          <SearchSelect
            id="card_ids"
            multiple
            options={cardOptions}
            value={form.card_ids}
            onChange={(v) => onChangeField("card_ids", v)}
            disabled={loadingMaster}
            placeholder={t(
              "create_visit.select_cards_placeholder",
              "Ketik nomor kartu..."
            )}
            emptyText={t(
              "create_visit.cards_empty",
              "Kartu pengunjung tidak ditemukan."
            )}
          />
          {form.card_ids.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.card_ids.map((id) => {
                const cardNo =
                  cardList.find((c) => String(c.id) === id)?.card_no ??
                  heldVisitorCards.find((c) => String(c.id) === id)?.card_no ??
                  `#${id}`
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800"
                  >
                    {cardNo}
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={t(
                        "create_visit.remove_card_aria",
                        "Hapus kartu {{card}}",
                        { card: cardNo }
                      )}
                      onClick={() =>
                        onChangeField(
                          "card_ids",
                          form.card_ids.filter((c) => c !== id)
                        )
                      }
                      className="cursor-pointer text-zinc-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vehicle_card_id" className="text-xs font-semibold">
              {t(
                "create_visit.vehicle_card_label",
                "Kartu kendaraan (opsional)"
              )}
            </Label>
            <span className="font-mono text-[11px] text-zinc-500">
              {loadingMaster
                ? ""
                : t(
                    "create_visit.vehicle_cards_count",
                    "{{count}} kartu",
                    { count: formatNumber(vehicleAvailableCount) }
                  )}
              {!loadingMaster && vehicleInUseCount > 0 && (
                <span className="ml-1.5 text-red-600 dark:text-red-400">
                  {t(
                    "create_visit.in_use_cards_count",
                    "{{count}} dipakai",
                    { count: formatNumber(vehicleInUseCount) }
                  )}
                </span>
              )}
            </span>
          </div>
          <SearchSelect
            id="vehicle_card_id"
            options={vehicleOptions}
            value={form.vehicle_card_id ? [form.vehicle_card_id] : []}
            onChange={(v) => onChangeField("vehicle_card_id", v[0] ?? "")}
            disabled={loadingMaster}
            placeholder={t(
              "create_visit.select_vehicle_card_placeholder",
              "Ketik nomor kartu kendaraan..."
            )}
            emptyText={t(
              "create_visit.vehicle_cards_empty",
              "Kartu kendaraan tidak ditemukan."
            )}
            noneLabel={t(
              "create_visit.no_vehicle_card",
              "Tanpa kartu kendaraan"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vehicle_no" className="text-xs font-semibold">
            {t(
              "create_visit.vehicle_plate_label",
              "Plat nomor kendaraan (opsional)"
            )}
          </Label>
          <Input
            id="vehicle_no"
            value={form.vehicle_no}
            onChange={(e) => onChangeField("vehicle_no", upperKeepCaret(e))}
            autoComplete="off"
            placeholder={t(
              "create_visit.vehicle_plate_placeholder",
              "Contoh: BP 1234 XY"
            )}
            className="h-10"
          />
        </div>
      </section>
    </fieldset>
  )
}