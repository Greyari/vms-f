import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { isCancel } from "axios"
import { toast } from "sonner"
import api from "@/lib/axios"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command"
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
  UserPlus,
  ScanLine,
  Globe,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { GlobalBlacklistHit, PreRegistration } from "@/types/hybrid"

interface LocationItem {
  id: number | string
  name: string
  is_active?: boolean | number
}

interface StaffItem {
  id: number | string
  name: string
  department?: string
  is_active?: boolean | number
}

interface CardItem {
  id: number | string
  card_no: string
  status: string
  card_type?: string
}

interface PurposeItem {
  purpose?: string
  [key: string]: unknown
}

export default function CreateVisit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkingKtp, setCheckingKtp] = useState(false)

  const idInputRef = useRef<HTMLInputElement>(null)

  // Master data
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [cardList, setCardList] = useState<CardItem[]>([])
  const [vehicleList, setVehicleList] = useState<CardItem[]>([])
  const [purposeSuggestions, setPurposeSuggestions] = useState<string[]>([])

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [openKtp, setOpenKtp] = useState(false)
  const [openName, setOpenName] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Visitor check-ktp status
  const [visitorStatus, setVisitorStatus] = useState<
    "idle" | "new" | "registered" | "blacklisted"
  >("idle")
  const [blacklistReason, setBlacklistReason] = useState<string>("")

  // Combobox states
  const [openStaff, setOpenStaff] = useState(false)
  const [openCard, setOpenCard] = useState(false)
  const [openVehicle, setOpenVehicle] = useState(false)

  // Conflict modal state (close_open_visits = true)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState("")

  // Hybrid multi-yard (spec §6.2): scanned pre-registration, global blacklist, supervisor override.
  const [preRegCode, setPreRegCode] = useState("")
  const [preReg, setPreReg] = useState<PreRegistration | null>(null)
  const [lookingUpPreReg, setLookingUpPreReg] = useState(false)
  const [gender, setGender] = useState("")
  const [globalEntries, setGlobalEntries] = useState<GlobalBlacklistHit[]>([])
  const [overrideEntry, setOverrideEntry] = useState<GlobalBlacklistHit | null>(
    null
  )
  const [overrideReason, setOverrideReason] = useState("")

  const [currentTime, setCurrentTime] = useState(new Date())

  // Form State
  const [form, setForm] = useState<{
    id_type: string
    id_number: string
    name: string
    company: string
    location_id: string
    purpose: string
    is_custom_host: boolean
    staff_id: string
    host_name: string
    card_ids: string[]
    vehicle_card_id: string
    vehicle_no: string
  }>({
    id_type: "ktp",
    id_number: "",
    name: "",
    company: "",
    location_id: "",
    purpose: "",
    is_custom_host: false,
    staff_id: "",
    host_name: "",
    card_ids: [],
    vehicle_card_id: "",
    vehicle_no: "",
  })

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [locRes, staffRes, cardRes, vehicleRes, purposeRes] =
          await Promise.all([
            api.get("/locations").catch(() => ({ data: [] })),
            api.get("/staffs").catch(() => ({ data: [] })),
            api.get("/cards").catch(() => ({ data: [] })),
            api.get("/vehicle-cards").catch(() => ({ data: [] })),
            api.get("/lookups/purposes").catch(() => ({ data: [] })),
          ])

        // Parse locations
        const locData = Array.isArray(locRes.data)
          ? locRes.data
          : locRes.data?.data || []
        setLocations(locData)
        if (locData.length > 0 && !form.location_id) {
          setForm((prev) => ({
            ...prev,
            location_id: locData[0].id.toString(),
          }))
        }

        // Parse staff
        const staffData = Array.isArray(staffRes.data)
          ? staffRes.data
          : staffRes.data?.data || []
        setStaffList(staffData)
        if (staffData.length > 0 && !form.staff_id) {
          setForm((prev) => ({
            ...prev,
            staff_id: staffData[0].id.toString(),
          }))
        }

        // Parse cards
        const rawCards = Array.isArray(cardRes.data)
          ? cardRes.data
          : cardRes.data?.data || []
        const availableCards = rawCards.filter(
          (c: CardItem) => c.status === "available"
        )
        setCardList(availableCards)
        if (availableCards.length > 0 && form.card_ids.length === 0) {
          setForm((prev) => ({
            ...prev,
            card_ids: [availableCards[0].id.toString()],
          }))
        }

        // Parse vehicle cards
        const rawVehicles = Array.isArray(vehicleRes.data)
          ? vehicleRes.data
          : vehicleRes.data?.data || []
        const availableVehicles = rawVehicles.filter(
          (c: CardItem) => c.status === "available"
        )
        setVehicleList(availableVehicles)

        // Parse purposes
        const rawPurposes = Array.isArray(purposeRes.data)
          ? purposeRes.data
          : purposeRes.data?.data || []
        const pList = rawPurposes.map((p: PurposeItem | string) =>
          typeof p === "string" ? p : p.purpose || ""
        )
        setPurposeSuggestions(pList.filter(Boolean))
      } catch (error) {
        console.error("Failed to load master data", error)
      }
    }
    fetchMasterData()

    if (idInputRef.current) {
      idInputRef.current.focus()
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(timer)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      abortRef.current?.abort()
    }
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Same number, same document type = blocked; another type = the officer checks the document (SEC-4).
  const globalBlock =
    globalEntries.find((e) => e.id_type === form.id_type) ?? null
  const globalWarnings = globalEntries.filter((e) => e.id_type !== form.id_type)

  // A USB 2D scanner types the token and presses Enter; no webcam (decision FE-4a).
  const handlePreRegLookup = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const code = preRegCode.trim().toUpperCase()
    if (!code) return

    setLookingUpPreReg(true)
    try {
      const res = await api.get(
        `/pre-registrations/${encodeURIComponent(code)}`
      )
      const found = res.data?.data as PreRegistration
      if (found.status !== "pending") {
        setPreReg(null)
        toast.error(
          found.status === "checked_in"
            ? "Pra-registrasi ini sudah dipakai untuk check-in."
            : "Pra-registrasi ini sudah kedaluwarsa. Layani sebagai walk-in."
        )
        return
      }

      setPreReg(found)
      setGender(found.gender ?? "")
      setForm((prev) => ({
        ...prev,
        id_type: found.id_type,
        id_number: found.id_number,
        name: found.name,
        company: found.company ?? prev.company,
        purpose: found.purpose ?? prev.purpose,
        is_custom_host: Boolean(found.host_name),
        host_name: found.host_name ?? prev.host_name,
        vehicle_no: found.vehicle_no ?? prev.vehicle_no,
      }))
      toast.success(`Pra-registrasi ${found.token} dimuat.`)
      await checkIdentity(found.id_number)
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.info(
          "Kode ini belum tersinkron di gerbang ini. Layani sebagai walk-in."
        )
      } else {
        toast.error("Gagal membaca pra-registrasi.")
      }
    } finally {
      setLookingUpPreReg(false)
    }
  }

  // Probe check-ktp endpoint directly
  const handleCheckKtp = () => checkIdentity(form.id_number.trim())

  const checkIdentity = async (idVal: string) => {
    if (!idVal) {
      toast.error("Please enter an ID number first.")
      return
    }

    setCheckingKtp(true)
    try {
      const res = await api.get(
        `/visitors/check-ktp/${encodeURIComponent(idVal)}`
      )
      const visitor = res.data?.data
      setGlobalEntries(
        Array.isArray(res.data?.global_blacklist)
          ? res.data.global_blacklist
          : []
      )

      if (!visitor) {
        setVisitorStatus("new")
        setBlacklistReason("")
        toast.info("New visitor detected. Please complete registration fields.")
      } else if (visitor.is_blacklisted) {
        setVisitorStatus("blacklisted")
        setBlacklistReason(
          visitor.blacklist_reason || "Identified in visitor security blacklist"
        )
        setForm((prev) => ({
          ...prev,
          name: visitor.name || prev.name,
          company: visitor.company || prev.company,
        }))
        toast.error("Warning: This visitor is blacklisted!", {
          description: visitor.blacklist_reason,
        })
      } else {
        setVisitorStatus("registered")
        setBlacklistReason("")
        setForm((prev) => ({
          ...prev,
          name: visitor.name || prev.name,
          company: visitor.company || prev.company,
        }))
        toast.success(`Visitor found: ${visitor.name}`)
      }
    } catch (err) {
      console.error("Check KTP failed:", err)
      setVisitorStatus("new")
    } finally {
      setCheckingKtp(false)
    }
  }

  // Trigger search logic for suggestions popover
  const searchVisitor = (query: string, source: "ktp" | "name") => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    abortRef.current?.abort()

    if (!query || query.length < 2) {
      setSuggestions([])
      if (source === "ktp") setOpenKtp(false)
      if (source === "name") setOpenName(false)
      return
    }

    if (source === "ktp") {
      setOpenKtp(true)
      setOpenName(false)
    } else {
      setOpenName(true)
      setOpenKtp(false)
    }

    setSearching(true)

    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await api.get("/visits/search", {
          params: { q: query },
          signal: controller.signal,
        })
        const items = Array.isArray(res.data) ? res.data : res.data?.data || []
        setSuggestions(items)
      } catch (err) {
        if (!isCancel(err)) console.error(err)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)
  }

  const selectVisitor = (visitor: any) => {
    setForm((prev) => ({
      ...prev,
      id_type: visitor.id_type || "ktp",
      id_number: visitor.id_number,
      name: visitor.name,
      company: visitor.company || "",
    }))

    if (visitor.is_blacklisted) {
      setVisitorStatus("blacklisted")
      setBlacklistReason(
        visitor.blacklist_reason || "Identified in visitor security blacklist"
      )
      toast.warning("This visitor is blacklisted", {
        description: visitor.blacklist_reason ?? undefined,
      })
    } else {
      setVisitorStatus("registered")
      setBlacklistReason("")
    }
    setOpenKtp(false)
    setOpenName(false)
  }

  const submitVisit = async (closeOpenVisits = false, override?: string) => {
    if (visitorStatus === "blacklisted") {
      toast.error(
        "Cannot check-in a blacklisted visitor. Contact security administrator."
      )
      return
    }

    if (!form.location_id) {
      toast.error("Please select a Location / Vessel.")
      return
    }

    if (!form.is_custom_host && !form.staff_id && !form.host_name) {
      toast.error("Please select a Host Staff or provide a Custom Host.")
      return
    }

    // A pre-registration leaves gender empty; the officer completes it here (decision BE-2).
    if (preReg && !gender) {
      toast.error("Pilih jenis kelamin tamu pra-registrasi.")
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        name: form.name.trim(),
        company: form.company.trim(),
        location_id: form.location_id,
        purpose: form.purpose.trim(),
        card_ids: form.card_ids,
        vehicle_no: form.vehicle_no.trim() || undefined,
        vehicle_card_id: form.vehicle_card_id || undefined,
      }

      if (gender) payload.gender = gender
      if (preReg) payload.pre_registration_token = preReg.token
      if (override) {
        payload.override_global_blacklist = true
        payload.override_reason = override
      }

      if (form.is_custom_host) {
        payload.host_name = form.host_name.trim() || "Visitor Host"
      } else if (form.staff_id) {
        payload.staff_id = form.staff_id
      } else if (form.host_name) {
        payload.host_name = form.host_name.trim()
      }

      if (closeOpenVisits) {
        payload.close_open_visits = true
      }

      const res = await api.post("/visits", payload)
      const newVisit = res.data?.visit || res.data?.data || res.data

      for (const warning of (res.data?.warnings ??
        []) as GlobalBlacklistHit[]) {
        toast.warning(
          `Nomor ini ada di blacklist global sebagai ${warning.id_type.toUpperCase()} (${warning.reason_label}, ${warning.registered_by_yard}).`
        )
      }
      toast.success("Visitor checked in successfully!")
      navigate(`/visits/${newVisit.id}/print`, { state: { visit: newVisit } })
    } catch (err: any) {
      console.error("Visit submission error:", err)
      const status = err.response?.status
      const msg = err.response?.data?.message || ""

      // Global blacklist (SEC-7): a supervisor may let this one visit through with a reason.
      if (status === 422 && err.response?.data?.global_blacklist) {
        const hit = err.response.data.global_blacklist as GlobalBlacklistHit
        if (err.response.data.can_override) {
          setOverrideEntry(hit)
          setOverrideReason("")
        } else {
          toast.error(
            `Ditolak: blacklist global (${hit.reason_label}, didaftarkan ${hit.registered_by_yard}). Hubungi supervisor.`
          )
        }
        return
      }

      // Detect active open visit conflict
      if (
        status === 422 &&
        (msg.toLowerCase().includes("kunjungan terbuka") ||
          msg.toLowerCase().includes("open visit") ||
          msg.toLowerCase().includes("close_open_visits"))
      ) {
        setConflictMessage(
          msg ||
            "Pengunjung ini masih memiliki kunjungan terbuka. Apakah Anda ingin menutup kunjungan lama dan melanjutkan check-in?"
        )
        setConflictOpen(true)
        return
      }

      toast.error(
        msg || "Gagal merekam data kunjungan. Pastikan API dan data valid."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitVisit(false)
  }

  return (
    <div className="relative mx-auto max-w-4xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Visit</h1>
          <p className="text-sm text-zinc-500">
            Check ID card, select mandatory location, assign cards, and register
            visit.
          </p>
        </div>
      </div>

      <div className="absolute top-6 right-6 hidden text-right sm:block">
        <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
          Current Time
        </p>
        <div className="mt-1 inline-block rounded bg-zinc-100 px-3 py-1 font-mono text-2xl font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
          {currentTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      {/* Blacklist banner */}
      {visitorStatus === "blacklisted" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold tracking-wider text-red-900 uppercase dark:bg-red-900 dark:text-red-100">
              BLACKLISTED VISITOR
            </span>
            <p className="mt-1 text-sm font-medium">
              Alasan: {blacklistReason}
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              Entry denied. Form submission is disabled for security policy
              enforcement.
            </p>
          </div>
        </div>
      )}

      {/* Global blacklist (hybrid spec §6.2): red = refused, yellow = verify the document (SEC-4) */}
      {globalBlock && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold tracking-wider text-red-900 uppercase dark:bg-red-900 dark:text-red-100">
              BLACKLIST GLOBAL
            </span>
            <p className="mt-1 text-sm font-medium">
              {globalBlock.reason_label} · didaftarkan{" "}
              {globalBlock.registered_by_yard}
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              Check-in ditolak. Supervisor dapat meloloskan satu kunjungan
              dengan alasan tertulis.
            </p>
          </div>
        </div>
      )}
      {globalWarnings.map((w) => (
        <div
          key={`${w.id_type}-${w.registered_by_yard}`}
          className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Nomor yang sama ada di blacklist global sebagai{" "}
            {w.id_type.toUpperCase()} ({w.reason_label}, didaftarkan{" "}
            {w.registered_by_yard}). Periksa dokumen fisik dan cocokkan nama
            sebelum melanjutkan.
          </span>
        </div>
      ))}

      {/* Visitor Status Badges */}
      {visitorStatus === "registered" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <span>Registered visitor profile loaded.</span>
        </div>
      )}
      {visitorStatus === "new" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
          <UserPlus className="h-4 w-4 text-sky-600" />
          <span>
            New visitor detected. Please complete registration details below.
          </span>
        </div>
      )}

      {/* Pre-registration (decision FE-4a): the QR code carries only the token; read from the local mirror */}
      <form
        onSubmit={handlePreRegLookup}
        className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-4 md:flex-row md:items-end dark:border-zinc-700"
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="pre_registration_code">
            Kode pra-registrasi / scan QR
          </Label>
          <Input
            id="pre_registration_code"
            value={preRegCode}
            onChange={(e) => setPreRegCode(e.target.value)}
            placeholder="PR-XXXX-XXXX-XXXX"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={lookingUpPreReg || !preRegCode.trim()}
        >
          {lookingUpPreReg ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="mr-2 h-4 w-4" />
          )}
          Muat
        </Button>
      </form>
      {preReg && (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
          Pra-registrasi {preReg.token} · rencana datang {preReg.scheduled_date}
          {preReg.host_department ? ` · ${preReg.host_department}` : ""}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Step 1: Identity & ID Check */}
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="id_type">ID Type</Label>
            <select
              id="id_type"
              name="id_type"
              value={form.id_type}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="ktp">KTP</option>
              <option value="sim">SIM</option>
              <option value="passport">Passport</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="id_number">ID Number</Label>
            <Popover open={openKtp} onOpenChange={setOpenKtp}>
              <PopoverAnchor asChild>
                <Input
                  ref={idInputRef}
                  id="id_number"
                  name="id_number"
                  value={form.id_number}
                  onChange={(e) => {
                    handleChange(e)
                    searchVisitor(e.target.value, "ktp")
                  }}
                  onFocus={() => {
                    if (form.id_number.length >= 2) setOpenKtp(true)
                  }}
                  required
                  autoComplete="off"
                  placeholder="Type ID number..."
                />
              </PopoverAnchor>
              <PopoverContent
                className="w-[350px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandGroup>
                      {searching ? (
                        <div className="flex items-center justify-center p-4 text-sm text-zinc-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Searching...
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.id_number}
                            onSelect={() => selectVisitor(s)}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {s.id_number}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {s.name} - {s.company || "No Company"}
                              </span>
                            </div>
                            {s.is_blacklisted && (
                              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                                BLACKLISTED
                              </span>
                            )}
                          </CommandItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-zinc-500">
                          New visitor. Click Check to verify.
                        </div>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCheckKtp}
              disabled={checkingKtp || !form.id_number}
              className="h-10 w-full cursor-pointer"
            >
              {checkingKtp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Check / Search
            </Button>
          </div>
        </div>

        {/* Step 2: Visitor Profile Details */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Visitor Name</Label>
            <Popover open={openName} onOpenChange={setOpenName}>
              <PopoverAnchor asChild>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(e) => {
                    handleChange(e)
                    searchVisitor(e.target.value, "name")
                  }}
                  onFocus={() => {
                    if (form.name.length >= 2) setOpenName(true)
                  }}
                  required
                  autoComplete="off"
                  placeholder="Visitor full name..."
                />
              </PopoverAnchor>
              <PopoverContent
                className="w-[350px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandGroup>
                      {suggestions.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id_number}
                          onSelect={() => selectVisitor(s)}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-xs text-zinc-500">
                              {s.id_number} - {s.company || "No Company"}
                            </span>
                          </div>
                          {s.is_blacklisted && (
                            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                              BLACKLISTED
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company / Agency (Optional)</Label>
            <Input
              id="company"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="e.g. PT Mitra Maritim"
            />
          </div>

          {preReg && (
            <div className="space-y-2">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">-- Pilih --</option>
                <option value="M">Laki-laki</option>
                <option value="F">Perempuan</option>
              </select>
            </div>
          )}
        </div>

        {/* Step 3: Location / Vessel & Purpose */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location_id">Location / Vessel (Mandatory)</Label>
            <select
              id="location_id"
              name="location_id"
              value={form.location_id}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">-- Select Location / Vessel --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Visit</Label>
            <Input
              id="purpose"
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              list="purpose-suggestions"
              required
              placeholder="e.g. Survey, Meeting, Maintenance..."
            />
            <datalist id="purpose-suggestions">
              {purposeSuggestions.map((p, idx) => (
                <option key={idx} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Step 4: Host Selection (Staff or Custom Host) */}
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Host Destination</Label>
            <label className="flex cursor-pointer items-center gap-2 text-xs select-none">
              <input
                type="checkbox"
                checked={form.is_custom_host}
                onChange={(e) =>
                  setForm({ ...form, is_custom_host: e.target.checked })
                }
                className="rounded border-zinc-300"
              />
              <span>Specify Custom Host Name</span>
            </label>
          </div>

          {!form.is_custom_host ? (
            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff Host</Label>
              <Popover open={openStaff} onOpenChange={setOpenStaff}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between bg-white font-normal dark:bg-zinc-950",
                      !form.staff_id && "text-muted-foreground"
                    )}
                  >
                    {form.staff_id
                      ? staffList.find(
                          (item) => item.id.toString() === form.staff_id
                        )?.name
                      : "Select Host Staff..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                  <Command
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
                    <CommandInput placeholder="Search staff by name or dept..." />
                    <CommandList>
                      <CommandEmpty>No staff found.</CommandEmpty>
                      <CommandGroup>
                        {staffList.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`${item.name} ${item.department || ""} ${item.id}`}
                            onSelect={() => {
                              handleSelectChange("staff_id", item.id.toString())
                              setOpenStaff(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.staff_id === item.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-xs text-zinc-500">
                                {item.department}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="host_name">Custom Host Name</Label>
              <Input
                id="host_name"
                name="host_name"
                value={form.host_name}
                onChange={handleChange}
                placeholder="Enter host person or department..."
                required={form.is_custom_host}
              />
            </div>
          )}
        </div>

        {/* Step 5: Card Assignment */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="card_ids">Assign Visitor Cards</Label>
            <Popover open={openCard} onOpenChange={setOpenCard}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    form.card_ids.length === 0 && "text-muted-foreground"
                  )}
                >
                  {form.card_ids.length > 0
                    ? form.card_ids
                        .map(
                          (id) =>
                            cardList.find((c) => c.id.toString() === id)
                              ?.card_no
                        )
                        .filter(Boolean)
                        .join(", ")
                    : "Select Available Cards..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                <Command
                  filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }
                >
                  <CommandInput placeholder="Search cards..." />
                  <CommandList>
                    <CommandEmpty>No available card found.</CommandEmpty>
                    <CommandGroup>
                      {cardList.map((item) => {
                        const isSelected = form.card_ids.includes(
                          item.id.toString()
                        )
                        return (
                          <CommandItem
                            key={item.id}
                            value={`${item.card_no} ${item.id}`}
                            onSelect={() => {
                              const newSelection = isSelected
                                ? form.card_ids.filter(
                                    (id) => id !== item.id.toString()
                                  )
                                : [...form.card_ids, item.id.toString()]
                              handleSelectChange("card_ids", newSelection)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.card_no}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="vehicle_card_id">Vehicle Card (Optional)</Label>
            <Popover open={openVehicle} onOpenChange={setOpenVehicle}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !form.vehicle_card_id && "text-muted-foreground"
                  )}
                >
                  {form.vehicle_card_id
                    ? vehicleList.find(
                        (item) => item.id.toString() === form.vehicle_card_id
                      )?.card_no
                    : "None / Select Vehicle Card..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                <Command
                  filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }
                >
                  <CommandInput placeholder="Search vehicle card..." />
                  <CommandList>
                    <CommandEmpty>No vehicle card found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          handleSelectChange("vehicle_card_id", "")
                          setOpenVehicle(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !form.vehicle_card_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-zinc-500 italic">None</span>
                      </CommandItem>
                      {vehicleList.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.card_no} ${item.id}`}
                          onSelect={() => {
                            handleSelectChange(
                              "vehicle_card_id",
                              item.id.toString()
                            )
                            setOpenVehicle(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.vehicle_card_id === item.id.toString()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {item.card_no}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicle_no">Vehicle Plate Number (Optional)</Label>
          <Input
            id="vehicle_no"
            name="vehicle_no"
            className="w-full"
            value={form.vehicle_no}
            onChange={handleChange}
            placeholder="e.g. BP 1234 XY"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading || visitorStatus === "blacklisted"}
            className="w-full cursor-pointer md:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Save & Print Ticket"}
          </Button>
        </div>
      </form>

      {/* Conflict Modal: Open Visit Detected */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Kunjungan Terbuka Terdeteksi
            </DialogTitle>
            <DialogDescription className="text-zinc-700 dark:text-zinc-300">
              {conflictMessage}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-zinc-500">
            Sistem dapat melakukan check-out otomatis pada kunjungan terbuka
            sebelumnya secara atomik dan langsung mendaftarkan kunjungan baru
            ini.
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setConflictOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                setConflictOpen(false)
                submitVisit(true)
              }}
              disabled={loading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {loading ? "Memproses..." : "Tutup Kunjungan Lama & Check-In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor override of a global entry (decision SEC-7): one visit, reason required, audited */}
      <Dialog
        open={overrideEntry !== null}
        onOpenChange={(open) => !open && setOverrideEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Globe className="h-5 w-5" />
              Loloskan Satu Kunjungan
            </DialogTitle>
            <DialogDescription className="text-zinc-700 dark:text-zinc-300">
              Tamu ini ada di blacklist global ({overrideEntry?.reason_label},
              didaftarkan {overrideEntry?.registered_by_yard}). Override hanya
              untuk kunjungan ini, tercatat di activity log, dan tidak mencabut
              entri global.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="override_reason">
              Alasan (minimal 10 karakter)
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
              Batal
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
              Loloskan & Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
