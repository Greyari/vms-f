import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { isCancel } from "axios"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Check,
  ChevronsUpDown,
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  Globe,
  Building2,
  CreditCard,
  User,
  Printer,
  Ship,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { GlobalBlacklistHit } from "@/types/hybrid"

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

type VisitorStatus = "idle" | "registered" | "blacklisted" | "notfound"

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

// eslint-disable-next-line react-refresh/only-export-components
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

const CARD =
  "rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"

// Tampilkan huruf besar saat ada isi (placeholder tetap normal)
const UPPER_WHEN_FILLED = "[&:not(:placeholder-shown)]:uppercase"

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_VISIBLE_OPTIONS = 100

// Cache sederhana supaya buka halaman ini lagi terasa instan
let cache: {
  locations: LocationItem[]
  staffList: StaffItem[]
  purposes: string[]
  at: number
} | null = null

// eslint-disable-next-line react-refresh/only-export-components
export function resetCreateVisitCache() {
  cache = null
}

// Ubah ke huruf besar tanpa membuat kursor loncat ke akhir teks
function upperKeepCaret(e: React.ChangeEvent<HTMLInputElement>): string {
  const el = e.target
  const { selectionStart, selectionEnd } = el
  const next = el.value.toUpperCase()
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(selectionStart, selectionEnd)
    } catch {
      /* abaikan */
    }
  })
  return next
}

// Pindahkan fokus ke input / tombol berikutnya di dalam form yang sama
function focusNextField(from: HTMLElement) {
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

/* ------------------------------------------------------------------ */
/* Potongan UI kecil                                                   */
/* ------------------------------------------------------------------ */

function KeyHint({ extra }: { extra?: string }) {
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

function EnterBadge() {
  const { t } = useTranslation()
  return (
    <kbd className="shrink-0 rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300">
      {t("create_visit.enter_key", "Enter ↵")}
    </kbd>
  )
}

const ROW_BASE = "flex cursor-pointer items-center gap-2 border-l-4 px-3 py-2"
const ROW_ACTIVE =
  "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
const ROW_IDLE = "border-transparent"
const DROPDOWN =
  "absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"

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
  onEnter?: () => void // dipanggil saat Enter tanpa memilih saran
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
        // Hasil pertama langsung tersorot, jadi Enter / Tab langsung memilihnya
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
      e.preventDefault() // jangan submit form
      if (open && active >= 0 && items[active]) pick(items[active])
      else if (onEnter) {
        setOpen(false)
        onEnter()
      }
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab memilih hasil yang tersorot. Fokus lanjut otomatis setelah pengunjung terverifikasi.
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
          onMouseDown={(e) => e.preventDefault()} // jaga fokus input saat klik / geser scrollbar
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
/* SearchSelect: kolom ketik-langsung-cari (satu / banyak pilihan)     */
/* ------------------------------------------------------------------ */

interface Opt {
  value: string
  label: string
  sub?: string
  search?: string
}

type Row = { opt: Opt | null } // opt null = baris "tanpa pilihan"

function filterOptions(options: Opt[], q: string): Opt[] {
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

function SearchSelect({
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
  /** Teks bebas (misalnya tujuan kunjungan): opsi hanya saran, ketikan tetap jadi nilai */
  allowCustom?: boolean
  /** Paksa huruf besar pada teks yang diketik (hanya untuk allowCustom) */
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

  // Teks yang dipakai untuk menyaring
  const q = allowCustom ? (value[0] ?? "") : editing ? query : ""
  const hasQuery = q.trim() !== ""

  const filtered = useMemo(() => filterOptions(options, q), [options, q])

  const visible = useMemo(() => {
    const ordered = hasQuery
      ? filtered
      : [...selected, ...options.filter((o) => !value.includes(o.value))]
    return ordered.slice(0, MAX_VISIBLE_OPTIONS)
  }, [hasQuery, filtered, selected, options, value])

  const rows: Row[] = useMemo(
    () => [
      ...(noneLabel && !hasQuery ? [{ opt: null }] : []),
      ...visible.map((opt) => ({ opt })),
    ],
    [noneLabel, hasQuery, visible]
  )

  // Setiap ketikan berubah: sorot hasil paling atas
  useEffect(() => {
    setActive(0)
    setNavigated(false)
  }, [q])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  // Boleh memilih dengan Enter / Tab hanya jika user sudah mengetik atau menavigasi
  const canAccept = hasQuery || navigated

  const choose = (
    row: Row,
    how: "mouse" | "enter" | "tab",
    el?: HTMLInputElement
  ) => {
    const opt = row.opt
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
      e.preventDefault() // jangan submit form
      if (open && canAccept && rows[active]) {
        choose(rows[active], "enter", e.currentTarget)
      } else if (!multiple && hasValue) {
        focusNextField(e.currentTarget) // sudah terisi: Enter = lanjut
      }
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab memilih yang tersorot lalu fokus pindah seperti biasa
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
                return (
                  <div
                    key={row.opt?.value ?? "__none__"}
                    role="option"
                    aria-selected={isSel}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choose(row, "mouse")
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(ROW_BASE, i === active ? ROW_ACTIVE : ROW_IDLE)}
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
                            <p className="truncate text-[11px] uppercase text-zinc-500">
                              {row.opt.sub}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs italic text-zinc-500">{noneLabel}</p>
                      )}
                    </div>
                    {i === active && canAccept && <EnterBadge />}
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

function SectionTitle({
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
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

export default function CreateVisit() {
  const { t, formatNumber } = useTranslation()
  const navigate = useNavigate()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const purposeInputRef = useRef<HTMLInputElement>(null)
  const tRef = useRef(t)
  tRef.current = t

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [loadingMaster, setLoadingMaster] = useState(true)

  // Master data
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [cardList, setCardList] = useState<CardItem[]>([])
  const [vehicleList, setVehicleList] = useState<CardItem[]>([])
  const [purposes, setPurposes] = useState<string[]>([])

  // Langkah 1: cari pengunjung (hanya cek, tidak menambah)
  const [nameQuery, setNameQuery] = useState("")
  const [idType, setIdType] = useState("ktp")
  const [idNumber, setIdNumber] = useState("")
  const [visitor, setVisitor] = useState<VisitorSearchResult | null>(null)
  const [status, setStatus] = useState<VisitorStatus>("idle")
  const [blacklistReason, setBlacklistReason] = useState("")
  const [globalEntries, setGlobalEntries] = useState<GlobalBlacklistHit[]>([])

  // Langkah 2 & 3
  const [form, setForm] = useState({
    location_id: "",
    purpose: "",
    staff_id: "",
    card_ids: [] as string[],
    vehicle_card_id: "",
    vehicle_no: "",
  })
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  // Dialog
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState("")
  const [overrideEntry, setOverrideEntry] = useState<GlobalBlacklistHit | null>(null)
  const [overrideReason, setOverrideReason] = useState("")

  const globalBlock = globalEntries.find((e) => e.id_type === idType) ?? null
  const globalWarnings = globalEntries.filter((e) => e.id_type !== idType)
  const canFill = status === "registered"

  /* ---------- load master data ---------- */
  useEffect(() => {
    let alive = true
    nameInputRef.current?.focus()

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      setLocations(cache.locations)
      setStaffList(cache.staffList)
      setPurposes(cache.purposes)
      setLoadingMaster(false)
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
        console.error(`[CreateVisit] Failed to load master data from ${url}`, {
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
        if (cardsRes.ok) {
          setCardList(
            (cardsRes.data as CardItem[]).filter((c: CardItem) => c.status === "available")
          )
        }
        if (vehiclesRes.ok) {
          setVehicleList(
            (vehiclesRes.data as CardItem[]).filter((c: CardItem) => c.status === "available")
          )
        }

        // Jangan menyimpan hasil kosong akibat error ke cache
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
  }, [])

  // Setelah pengunjung terverifikasi, fokus otomatis lanjut ke input berikutnya
  useEffect(() => {
    if (status !== "registered") return
    const raf = requestAnimationFrame(() => {
      const target = form.location_id ? purposeInputRef.current : locationInputRef.current
      target?.focus()
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

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
    }
  }

  // Cek nomor identitas ke server (juga mengambil blacklist global).
  // `fallback` = data dari daftar saran, dipakai jika server tidak mengembalikan data.
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
        t("create_visit.toast_select_staff_host", "Pilih staf host.")
      )
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
      if (visitor.phone) payload.phone = visitor.phone
      if (visitor.email) payload.email = visitor.email
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
        navigate("/active-visitors")
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

  /* ---------- opsi untuk SearchSelect ---------- */
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
        sub: [s.staff_id, s.company, s.address || s.department]
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

  const cardOptions = useMemo<Opt[]>(
    () => cardList.map((c) => ({ value: String(c.id), label: c.card_no })),
    [cardList]
  )
  const vehicleOptions = useMemo<Opt[]>(
    () => vehicleList.map((c) => ({ value: String(c.id), label: c.card_no })),
    [vehicleList]
  )

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

  /* ---------- render ---------- */
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-24">
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("create_visit.title", "Pendaftaran Kunjungan")}
        </h1>
        <p className="text-sm text-zinc-500">
          {t(
            "create_visit.subtitle",
            "Cari pengunjung, tentukan tujuan dan host, lalu cetak tiket."
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
        <section className={CARD}>
          <SectionTitle n={1} icon={User}>
            {t("create_visit.section1_title", "Cari Pengunjung")}
          </SectionTitle>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
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

              <div className="grid grid-cols-3 gap-2">
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
                    // Sudah ada pengunjung terpilih: Tab dari Nama langsung ke Lokasi
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
            <div>
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

        {/* Langkah 2 & 3 aktif setelah pengunjung dipilih */}
        <fieldset
          disabled={!canFill}
          className={cn(
            "grid items-start gap-6 md:grid-cols-2",
            !canFill && "pointer-events-none opacity-50"
          )}
        >
          {/* ===== 2. Tujuan & host ===== */}
          <section className={cn(CARD, "min-w-0 space-y-4")}>
            <SectionTitle n={2} icon={Building2}>
              {t("create_visit.section2_title", "Tujuan & Host")}
            </SectionTitle>

            <div className="space-y-1.5">
              <Label htmlFor="location_id" className="text-xs font-semibold">
                {t("create_visit.location_vessel", "Lokasi / Kapal *")}
              </Label>
              <SearchSelect
                id="location_id"
                inputRef={locationInputRef}
                options={locationOptions}
                value={form.location_id ? [form.location_id] : []}
                onChange={(v) => setField("location_id", v[0] ?? "")}
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
                upper
                options={purposeOptions}
                value={form.purpose ? [form.purpose] : []}
                onChange={(v) => setField("purpose", v[0] ?? "")}
                placeholder={t(
                  "create_visit.purpose_placeholder",
                  "Ketik tujuan kunjungan..."
                )}
                emptyText=""
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="staff_id" className="text-xs font-semibold">
                {t("create_visit.host_label", "Host *")}
              </Label>
              <SearchSelect
                id="staff_id"
                options={staffOptions}
                value={form.staff_id ? [form.staff_id] : []}
                onChange={(v) => setField("staff_id", v[0] ?? "")}
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
                emptyText={t(
                  "create_visit.staff_empty",
                  "Staf tidak ditemukan."
                )}
              />
              <p className="text-[11px] text-zinc-500">
                {t(
                  "create_visit.host_add_hint",
                  "Host tidak ada di daftar? Tambahkan dulu di halaman Staf."
                )}
              </p>
            </div>
          </section>

          {/* ===== 3. Kartu & kendaraan ===== */}
          <section className={cn(CARD, "min-w-0 space-y-4")}>
            <SectionTitle n={3} icon={CreditCard}>
              {t("create_visit.section3_title", "Kartu Akses & Kendaraan")}
            </SectionTitle>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="card_ids" className="text-xs font-semibold">
                  {t(
                    "create_visit.visitor_card_label",
                    "Kartu pengunjung (opsional)"
                  )}
                </Label>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {loadingMaster
                    ? t("common.loading", "Memuat...")
                    : t(
                        "create_visit.available_cards_count",
                        "{{count}} tersedia",
                        { count: formatNumber(cardList.length) }
                      )}
                </Badge>
              </div>
              <SearchSelect
                id="card_ids"
                multiple
                options={cardOptions}
                value={form.card_ids}
                onChange={(v) => setField("card_ids", v)}
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
                            setField(
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
                        { count: formatNumber(vehicleList.length) }
                      )}
                </span>
              </div>
              <SearchSelect
                id="vehicle_card_id"
                options={vehicleOptions}
                value={form.vehicle_card_id ? [form.vehicle_card_id] : []}
                onChange={(v) => setField("vehicle_card_id", v[0] ?? "")}
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
                onChange={(e) => setField("vehicle_no", upperKeepCaret(e))}
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

        {/* Bar bawah */}
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:mx-0 sm:flex-row sm:rounded-lg dark:border-zinc-800 dark:bg-zinc-950/95">
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
                "Lengkapi tujuan dan host, lalu cetak tiket."
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
            <DialogTitle className="flex items-center gap-2 text-amber-600">
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
              className="bg-amber-600 text-white hover:bg-amber-700"
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