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
  Building2,
  CreditCard,
  User,
  Printer,
  ChevronDown,
  ChevronUp,
  Edit2,
  AlertCircle,
  Ship,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GlobalBlacklistHit, PreRegistration } from "@/types/hybrid"

interface LocationItem {
  id: number | string
  name: string
  code?: string | null
  type?: "location" | "repair_vessel" | "tug_boat" | "barge" | string
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
  is_active?: boolean | number
}

interface StaffItem {
  id: number | string
  staff_id?: string
  name: string
  department?: string
  gender?: string
  address?: string
  company?: string
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

// Module-level cache to make revisiting Add Visit instant across the session
let cachedMasterData: {
  locations: LocationItem[]
  staffList: StaffItem[]
  purposeSuggestions: string[]
  cachedAt: number
} | null = null

const POPULAR_PURPOSES = [
  "Meeting",
  "Survey",
  "Delivery",
  "Maintenance",
  "Inspection",
  "Audit",
]

export default function CreateVisit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkingKtp, setCheckingKtp] = useState(false)
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [savingVisitorToMaster, setSavingVisitorToMaster] = useState(false)

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
  const [nameSearchQuery, setNameSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Visitor check-ktp status & details
  const [visitorStatus, setVisitorStatus] = useState<
    "idle" | "new" | "registered" | "blacklisted"
  >("idle")
  const [blacklistReason, setBlacklistReason] = useState<string>("")
  const [foundVisitor, setFoundVisitor] = useState<any | null>(null)
  const [isEditLockedVisitor, setIsEditLockedVisitor] = useState(true)
  const [showAdditionalData, setShowAdditionalData] = useState(false)

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
    occupation: string
    visitor_type: string
    phone: string
    email: string
    birth_place: string
    birth_date: string
    nationality: string
    address: string
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
    occupation: "",
    visitor_type: "visitor",
    phone: "",
    email: "",
    birth_place: "",
    birth_date: "",
    nationality: "Indonesia",
    address: "",
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
    let isMounted = true

    const fetchMasterData = async () => {
      // 1. Instant populate from client cache if fresh (< 5 mins)
      if (
        cachedMasterData &&
        Date.now() - cachedMasterData.cachedAt < 5 * 60 * 1000
      ) {
        setLocations(cachedMasterData.locations)
        setStaffList(cachedMasterData.staffList)
        setPurposeSuggestions(cachedMasterData.purposeSuggestions)
        if (cachedMasterData.locations.length > 0 && !form.location_id) {
          setForm((prev) => ({
            ...prev,
            location_id: cachedMasterData!.locations[0].id.toString(),
          }))
        }
        if (cachedMasterData.staffList.length > 0 && !form.staff_id) {
          setForm((prev) => ({
            ...prev,
            staff_id: cachedMasterData!.staffList[0].id.toString(),
          }))
        }
        setLoadingMaster(false)
      }

      // 2. Fetch fresh dynamic data from backend
      try {
        const [locRes, staffRes, cardsRes, vehRes, purposeRes] =
          await Promise.all([
            api.get("/locations", { params: { per_page: 2000 } }).catch(() => ({ data: [] })),
            api.get("/staffs", { params: { per_page: 100 } }).catch(() => ({ data: [] })),
            api.get("/cards").catch(() => ({ data: [] })),
            api.get("/vehicle-cards").catch(() => ({ data: [] })),
            api.get("/lookups/purposes").catch(() => ({ data: [] })),
          ])

        const locData = Array.isArray(locRes.data)
          ? locRes.data
          : locRes.data?.data || []
        const staffData = Array.isArray(staffRes.data)
          ? staffRes.data
          : staffRes.data?.data || []
        const rawCards = Array.isArray(cardsRes.data)
          ? cardsRes.data
          : cardsRes.data?.data || []
        const rawVehicles = Array.isArray(vehRes.data)
          ? vehRes.data
          : vehRes.data?.data || []
        const rawPurposes = Array.isArray(purposeRes.data)
          ? purposeRes.data
          : purposeRes.data?.data || []
        const pList = rawPurposes.map((p: PurposeItem | string) =>
          typeof p === "string" ? p : p.purpose || ""
        )

        if (!isMounted) return

        cachedMasterData = {
          locations: locData,
          staffList: staffData,
          purposeSuggestions: pList.filter(Boolean),
          cachedAt: Date.now(),
        }

        setLocations(locData)
        if (locData.length > 0 && !form.location_id) {
          setForm((prev) => ({
            ...prev,
            location_id: locData[0].id.toString(),
          }))
        }

        setStaffList(staffData)
        if (staffData.length > 0 && !form.staff_id) {
          setForm((prev) => ({
            ...prev,
            staff_id: staffData[0].id.toString(),
          }))
        }

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

        const availableVehicles = rawVehicles.filter(
          (c: CardItem) => c.status === "available"
        )
        setVehicleList(availableVehicles)

        setPurposeSuggestions(pList.filter(Boolean))
      } catch (error) {
        console.error("Failed to load master data", error)
      } finally {
        if (isMounted) setLoadingMaster(false)
      }
    }
    fetchMasterData()

    if (idInputRef.current) {
      idInputRef.current.focus()
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      isMounted = false
      clearInterval(timer)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      abortRef.current?.abort()
    }
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const globalBlock =
    globalEntries.find((e) => e.id_type === form.id_type) ?? null
  const globalWarnings = globalEntries.filter((e) => e.id_type !== form.id_type)

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
        setFoundVisitor(null)
        setIsEditLockedVisitor(false)
        toast.info("New visitor detected. Please complete registration fields.")
      } else if (visitor.is_blacklisted) {
        setVisitorStatus("blacklisted")
        setFoundVisitor(visitor)
        setBlacklistReason(
          visitor.blacklist_reason || "Identified in visitor security blacklist"
        )
        setForm((prev) => ({
          ...prev,
          name: visitor.name || prev.name,
          company: visitor.company || prev.company,
          occupation: visitor.occupation || prev.occupation,
          phone: visitor.phone || prev.phone,
          email: visitor.email || prev.email,
        }))
        setIsEditLockedVisitor(true)
        toast.error("Warning: This visitor is blacklisted!", {
          description: visitor.blacklist_reason,
        })
      } else {
        setVisitorStatus("registered")
        setFoundVisitor(visitor)
        setBlacklistReason("")
        setForm((prev) => ({
          ...prev,
          name: visitor.name || prev.name,
          company: visitor.company || prev.company,
          occupation: visitor.occupation || prev.occupation,
          phone: visitor.phone || prev.phone,
          email: visitor.email || prev.email,
        }))
        setIsEditLockedVisitor(true)
        toast.success(`Visitor found: ${visitor.name}`)
      }
    } catch (err) {
      console.error("Check KTP failed:", err)
      setVisitorStatus("new")
      setFoundVisitor(null)
      setIsEditLockedVisitor(false)
    } finally {
      setCheckingKtp(false)
    }
  }

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
    setFoundVisitor(visitor)
    setForm((prev) => ({
      ...prev,
      id_type: visitor.id_type || "ktp",
      id_number: visitor.id_number,
      name: visitor.name,
      company: visitor.company || "",
      occupation: visitor.occupation || prev.occupation,
      phone: visitor.phone || prev.phone,
      email: visitor.email || prev.email,
    }))

    if (visitor.is_blacklisted) {
      setVisitorStatus("blacklisted")
      setBlacklistReason(
        visitor.blacklist_reason || "Identified in visitor security blacklist"
      )
      setIsEditLockedVisitor(true)
      toast.warning("This visitor is blacklisted", {
        description: visitor.blacklist_reason ?? undefined,
      })
    } else {
      setVisitorStatus("registered")
      setBlacklistReason("")
      setIsEditLockedVisitor(true)
      toast.success(`Visitor selected: ${visitor.name}`)
    }
    setOpenKtp(false)
    setOpenName(false)
  }

  const handleSaveNewVisitorToMaster = async () => {
    if (!form.name.trim() || !form.id_number.trim()) {
      toast.error("Nama lengkap dan nomor identitas wajib diisi.")
      return
    }

    setSavingVisitorToMaster(true)
    try {
      const selectedLoc = locations.find(
        (loc) => loc.id.toString() === form.location_id.toString()
      )
      const isVessel = Boolean(
        selectedLoc && selectedLoc.type && selectedLoc.type !== "location"
      )

      const payload: Record<string, any> = {
        name: form.name.trim(),
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        company: form.company.trim() || null,
        occupation: form.occupation.trim() || null,
        visitor_type: form.visitor_type || "visitor",
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        birth_place: form.birth_place.trim() || null,
        birth_date: form.birth_date || null,
        gender: gender || null,
        nationality: form.nationality.trim() || "Indonesia",
        address: form.address.trim() || null,
        vessel_id:
          form.visitor_type === "crew" && isVessel ? form.location_id : null,
      }

      const res = await api.post("/visitors", payload)
      const saved = res.data?.visitor || res.data?.data || res.data
      setFoundVisitor(saved)
      setVisitorStatus("registered")
      setIsEditLockedVisitor(true)
      toast.success("Pengunjung baru berhasil disimpan ke Master Data.")
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || "Gagal menyimpan data pengunjung baru.")
    } finally {
      setSavingVisitorToMaster(false)
    }
  }

  const submitVisit = async (closeOpenVisits = false, override?: string) => {
    if (visitorStatus === "blacklisted") {
      toast.error(
        "Cannot check-in a blacklisted visitor. Contact security administrator."
      )
      return
    }

    if (!form.id_number.trim() || !form.name.trim()) {
      toast.error("Nomor identitas dan nama pengunjung wajib diisi.")
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

    if (preReg && !gender) {
      toast.error("Pilih jenis kelamin tamu pra-registrasi.")
      return
    }

    setLoading(true)
    try {
      const selectedLoc = locations.find(
        (loc) => loc.id.toString() === form.location_id.toString()
      )
      const isVessel = Boolean(
        selectedLoc && selectedLoc.type && selectedLoc.type !== "location"
      )

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

      if (form.occupation.trim()) payload.occupation = form.occupation.trim()
      if (form.phone.trim()) payload.phone = form.phone.trim()
      if (form.email.trim()) payload.email = form.email.trim()
      if (form.address.trim()) payload.address = form.address.trim()
      if (form.birth_place.trim()) payload.birth_place = form.birth_place.trim()
      if (form.birth_date) payload.birth_date = form.birth_date
      if (form.visitor_type) payload.visitor_type = form.visitor_type
      if (form.visitor_type === "crew" && isVessel) {
        payload.vessel_id = form.location_id
      }

      if (form.is_custom_host || form.host_name) {
        payload.host_name = form.host_name.trim()
      } else if (form.staff_id) {
        payload.staff_id = form.staff_id
      }

      if (gender) payload.gender = gender
      if (preReg) payload.pre_registration_token = preReg.token
      if (override) {
        payload.override_global_blacklist = true
        payload.override_reason = override
      }
      if (closeOpenVisits) {
        payload.close_open_visits = true
      }

      const res = await api.post("/visits", payload)
      toast.success("Visit successfully registered!")

      const visit = res.data?.visit || res.data
      if (visit && visit.id) {
        navigate(`/visits/${visit.id}/print`, {
          state: { visit },
        })
      } else {
        navigate("/active-visitors")
      }
    } catch (err: any) {
      console.error("Visit submission error:", err)
      const data = err.response?.data
      const status = err.response?.status
      const msg = data?.message || ""

      if (status === 422 && data?.global_blacklist) {
        if (data.can_override) {
          setOverrideEntry(data.global_blacklist)
          setOverrideReason("")
        } else {
          toast.error(
            data.message ||
              "Tamu ini ada di blacklist global. Check-in ditolak."
          )
        }
        return
      }

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
    <div className="relative mx-auto w-full max-w-[1600px] space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Pendaftaran Kunjungan (Add Visit)
          </h1>
          <p className="text-sm text-zinc-500">
            Periksa identitas pengunjung, pilih tujuan & host, alokasikan kartu akses, dan cetak tiket.
          </p>
        </div>

        {/* Current Time Clock */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Current Time
            </p>
            <div className="rounded bg-zinc-100 px-3 py-1 font-mono text-xl font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
              {currentTime.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Blacklist banner */}
      {visitorStatus === "blacklisted" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold tracking-wider text-red-900 uppercase dark:bg-red-900 dark:text-red-100">
              BLACKLISTED VISITOR
            </span>
            <p className="mt-1 text-sm font-medium">
              Alasan: {blacklistReason}
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              Entry denied. Form submission is disabled for security policy enforcement.
            </p>
          </div>
        </div>
      )}

      {/* Global blacklist (hybrid spec §6.2) */}
      {globalBlock && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold tracking-wider text-red-900 uppercase dark:bg-red-900 dark:text-red-100">
              BLACKLIST GLOBAL
            </span>
            <p className="mt-1 text-sm font-medium">
              {globalBlock.reason_label} · didaftarkan {globalBlock.registered_by_yard}
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              Check-in ditolak. Supervisor dapat meloloskan satu kunjungan dengan alasan tertulis.
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
            Nomor yang sama ada di blacklist global sebagai {w.id_type.toUpperCase()} ({w.reason_label}, didaftarkan {w.registered_by_yard}). Periksa dokumen fisik dan cocokkan nama sebelum melanjutkan.
          </span>
        </div>
      ))}

      {/* Pre-registration bar */}
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <form
          onSubmit={handlePreRegLookup}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="pre_registration_code" className="text-xs font-semibold">
              Kode Pra-registrasi / Scan QR (Opsional)
            </Label>
            <Input
              id="pre_registration_code"
              value={preRegCode}
              onChange={(e) => setPreRegCode(e.target.value)}
              placeholder="PR-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="bg-white dark:bg-zinc-950"
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
          <p className="mt-2 text-xs text-emerald-700 font-medium dark:text-emerald-400">
            ✓ Pra-registrasi {preReg.token} · rencana datang: {preReg.scheduled_date}
            {preReg.host_department ? ` · ${preReg.host_department}` : ""}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 3-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {/* ======================================================== */}
          {/* KOLOM KIRI: SECTION 1 - Identitas Pengunjung             */}
          {/* ======================================================== */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                1
              </span>
              <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Identitas Pengunjung (Visitor Identity)
              </h2>
            </div>

            {/* LANGKAH A: Input Cek / Cari Pengunjung */}
            <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Langkah A: Cek / Cari Pengunjung
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-1">
                  <Label htmlFor="id_type" className="text-xs">ID Type</Label>
                  <select
                    id="id_type"
                    name="id_type"
                    value={form.id_type}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="ktp">KTP</option>
                    <option value="sim">SIM</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="id_number" className="text-xs">ID Number *</Label>
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
                        placeholder="Ketik nomor identitas..."
                        className="h-9 bg-white text-xs dark:bg-zinc-950"
                      />
                    </PopoverAnchor>
                    <PopoverContent
                      className="w-[300px] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandGroup>
                            {searching ? (
                              <div className="flex items-center justify-center p-3 text-xs text-zinc-500">
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Mencari...
                              </div>
                            ) : suggestions.length > 0 ? (
                              suggestions.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={s.id_number}
                                  onSelect={() => selectVisitor(s)}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs">{s.id_number}</span>
                                    <span className="text-[11px] text-zinc-500">
                                      {s.name} {s.company ? `· ${s.company}` : ""}
                                    </span>
                                  </div>
                                  {s.is_blacklisted && (
                                    <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                                      BLACKLIST
                                    </span>
                                  )}
                                </CommandItem>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-zinc-500">
                                Pengunjung baru. Klik Cek/Cari untuk verifikasi.
                              </div>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckKtp}
                  disabled={checkingKtp || !form.id_number}
                  className="w-full cursor-pointer text-xs"
                >
                  {checkingKtp ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-3.5 w-3.5" />
                  )}
                  Check / Search ID
                </Button>
              </div>

              {/* Cari berdasarkan Nama (Autocomplete) */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="search_name" className="text-xs text-zinc-500">
                  Atau cari berdasarkan Nama Pengunjung:
                </Label>
                <Popover open={openName} onOpenChange={setOpenName}>
                  <PopoverAnchor asChild>
                    <div className="relative">
                      <Input
                        id="search_name"
                        value={nameSearchQuery}
                        onChange={(e) => {
                          setNameSearchQuery(e.target.value)
                          searchVisitor(e.target.value, "name")
                        }}
                        onFocus={() => {
                          if (nameSearchQuery.length >= 2) setOpenName(true)
                        }}
                        autoComplete="off"
                        placeholder="Ketik nama untuk mencari..."
                        className="h-9 bg-white pr-8 text-xs dark:bg-zinc-950"
                      />
                      <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-[300px] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          {searching ? (
                            <div className="flex items-center justify-center p-3 text-xs text-zinc-500">
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Mencari...
                            </div>
                          ) : suggestions.length > 0 ? (
                            suggestions.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.id_number}
                                onSelect={() => selectVisitor(s)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs">{s.name}</span>
                                  <span className="text-[11px] text-zinc-500">
                                    {s.id_number} {s.company ? `· ${s.company}` : ""}
                                  </span>
                                </div>
                                {s.is_blacklisted && (
                                  <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                                    BLACKLIST
                                  </span>
                                )}
                              </CommandItem>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-zinc-500">
                              Tidak ada saran nama ditemukan.
                            </div>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* LANGKAH B: Hasil Pengecekan */}
            {visitorStatus === "registered" && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50/80 p-3.5 space-y-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs dark:text-emerald-300">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>Pengunjung Ditemukan / Visitor Found</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditLockedVisitor(!isEditLockedVisitor)}
                    className="h-7 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300"
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    {isEditLockedVisitor ? "Edit Data" : "Kunci Data"}
                  </Button>
                </div>

                {/* Kartu Ringkasan Data */}
                <div className="rounded border border-emerald-200 bg-white p-2.5 text-xs space-y-1 text-zinc-800 dark:border-emerald-900/60 dark:bg-zinc-950 dark:text-zinc-200">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Nama:</span>
                    <span className="font-semibold">{form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ID:</span>
                    <span className="font-mono">{form.id_type.toUpperCase()} - {form.id_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Perusahaan:</span>
                    <span>{form.company || "-"}</span>
                  </div>
                  {foundVisitor?.visits_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Riwayat Kunjungan:</span>
                      <span className="font-medium text-primary">{foundVisitor.visits_count} kali</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visitorStatus === "new" && (
              <div className="rounded-md border border-sky-300 bg-sky-50/80 p-3.5 space-y-3 dark:border-sky-800 dark:bg-sky-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-800 font-semibold text-xs dark:text-sky-300">
                    <UserPlus className="h-4 w-4 text-sky-600" />
                    <span>Pengunjung Belum Terdaftar / New Visitor</span>
                  </div>
                </div>
                <p className="text-xs text-sky-700 dark:text-sky-400">
                  Data pengunjung belum ada di master. Lengkapi formulir di bawah ini untuk didaftarkan secara otomatis.
                </p>
              </div>
            )}

            {/* Form Input Detail Identitas (Editable / Read-only state) */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Visitor Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  readOnly={visitorStatus === "registered" && isEditLockedVisitor}
                  onChange={handleChange}
                  required
                  placeholder="Nama lengkap pengunjung..."
                  className={cn(
                    "h-9 text-xs",
                    visitorStatus === "registered" && isEditLockedVisitor && "bg-zinc-100 dark:bg-zinc-900"
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs">Company / Agency (Optional)</Label>
                <Input
                  id="company"
                  name="company"
                  value={form.company}
                  readOnly={visitorStatus === "registered" && isEditLockedVisitor}
                  onChange={handleChange}
                  placeholder="Contoh: PT Mitra Maritim"
                  className={cn(
                    "h-9 text-xs",
                    visitorStatus === "registered" && isEditLockedVisitor && "bg-zinc-100 dark:bg-zinc-900"
                  )}
                />
              </div>

              {/* Bagian Collapsible: Data Tambahan */}
              <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
                <button
                  type="button"
                  onClick={() => setShowAdditionalData(!showAdditionalData)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                >
                  <span>Data Tambahan / Additional Data (Opsional)</span>
                  {showAdditionalData ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showAdditionalData && (
                  <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="occupation" className="text-[11px]">Jabatan / Profesi</Label>
                        <Input
                          id="occupation"
                          name="occupation"
                          value={form.occupation}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          placeholder="Teknisi, Surveyor..."
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="visitor_type" className="text-[11px]">Tipe Pengunjung</Label>
                        <select
                          id="visitor_type"
                          name="visitor_type"
                          value={form.visitor_type}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <option value="visitor">Pengunjung Umum</option>
                          <option value="crew">Crew Kapal</option>
                          <option value="temporary_worker">Tenaga Kerja Sementara</option>
                          <option value="supplier">Supplier / Vendor</option>
                          <option value="others">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[11px]">Nomor Telepon</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={form.phone}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          placeholder="08123456789"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-[11px]">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={form.email}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          placeholder="email@domain.com"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="birth_place" className="text-[11px]">Tempat Lahir</Label>
                        <Input
                          id="birth_place"
                          name="birth_place"
                          value={form.birth_place}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          placeholder="Kota lahir..."
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="birth_date" className="text-[11px]">Tanggal Lahir</Label>
                        <Input
                          id="birth_date"
                          name="birth_date"
                          type="date"
                          value={form.birth_date}
                          disabled={visitorStatus === "registered" && isEditLockedVisitor}
                          onChange={handleChange}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="address" className="text-[11px]">Alamat Domisili</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={form.address}
                        disabled={visitorStatus === "registered" && isEditLockedVisitor}
                        onChange={handleChange}
                        placeholder="Alamat lengkap..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    {visitorStatus === "new" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveNewVisitorToMaster}
                        disabled={savingVisitorToMaster || !form.name.trim() || !form.id_number.trim()}
                        className="w-full text-xs"
                      >
                        {savingVisitorToMaster ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-3.5 w-3.5" />
                        )}
                        Simpan ke Master Pengunjung
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Pre-reg gender input requirement */}
              {preReg && (
                <div className="space-y-1 pt-2">
                  <Label htmlFor="gender" className="text-xs text-amber-700 font-semibold dark:text-amber-400">
                    Jenis Kelamin * (Wajib untuk Pra-registrasi)
                  </Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-amber-300 bg-amber-50/50 px-3 py-1 text-xs dark:border-amber-900 dark:bg-zinc-950"
                  >
                    <option value="">-- Pilih Jenis Kelamin --</option>
                    <option value="M">Laki-laki (M)</option>
                    <option value="F">Perempuan (F)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* KOLOM TENGAH: SECTION 2 - Tujuan Kunjungan & Host        */}
          {/* ======================================================== */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                2
              </span>
              <Building2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Tujuan Kunjungan & Host (Destination & Host)
              </h2>
            </div>

            <div className="space-y-4">
              {/* Lokasi / Vessel */}
              <div className="space-y-1.5">
                <Label htmlFor="location_id" className="text-xs font-semibold">
                  Location / Vessel (Mandatory) *
                </Label>
                <select
                  id="location_id"
                  name="location_id"
                  value={form.location_id}
                  onChange={handleChange}
                  required
                  disabled={loadingMaster}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {loadingMaster ? (
                    <option value="">Memuat daftar lokasi...</option>
                  ) : (
                    <option value="">-- Select Location / Vessel --</option>
                  )}
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.code && loc.type && loc.type !== "location"
                        ? ` (IMO: ${loc.code})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kartu Informasi Kapal (tampil jika yang dipilih adalah Kapal, bukan Lokasi Darat) */}
              {(() => {
                const selectedLocation =
                  locations.find(
                    (loc) => loc.id.toString() === form.location_id.toString()
                  ) || null
                const isSelectedVessel = Boolean(
                  selectedLocation &&
                    selectedLocation.type &&
                    selectedLocation.type !== "location"
                )
                if (!selectedLocation || !isSelectedVessel) return null

                return (
                  <div
                    role="region"
                    aria-label="Informasi Kapal Tujuan"
                    className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/25"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 pb-2 dark:border-emerald-800/60">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-950 dark:text-emerald-200">
                        <Ship className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Informasi Kapal: {selectedLocation.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedLocation.code && (
                          <Badge
                            variant="outline"
                            className="bg-white font-mono text-[11px] dark:bg-zinc-900"
                          >
                            IMO: {selectedLocation.code}
                          </Badge>
                        )}
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          {selectedLocation.vessel_type || selectedLocation.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300">
                      <div className="rounded bg-white/80 p-2 border border-emerald-100 dark:bg-zinc-900/70 dark:border-emerald-900/50">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Captain / Nakhoda
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedLocation.captain || "-"}
                        </span>
                        {selectedLocation.captain && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                is_custom_host: true,
                                host_name: selectedLocation.captain || "",
                              }))
                            }
                            className="mt-1 block text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
                          >
                            + Jadikan Captain sebagai Host
                          </button>
                        )}
                      </div>

                      <div className="rounded bg-white/80 p-2 border border-emerald-100 dark:bg-zinc-900/70 dark:border-emerald-900/50">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Note / PIC Kapal
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedLocation.pic || "-"}
                        </span>
                        {selectedLocation.pic && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                is_custom_host: true,
                                host_name: selectedLocation.pic || "",
                              }))
                            }
                            className="mt-1 block text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
                          >
                            + Jadikan PIC sebagai Host
                          </button>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Call Sign
                        </span>
                        <span className="font-mono font-medium">
                          {selectedLocation.call_sign || "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                          Bendera (Nationality Flag)
                        </span>
                        <span className="font-medium">
                          {selectedLocation.flag || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Purpose of Visit */}
              <div className="space-y-1.5">
                <Label htmlFor="purpose" className="text-xs font-semibold">
                  Purpose of Visit *
                </Label>
                <Input
                  id="purpose"
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  list="purpose-suggestions"
                  required
                  placeholder="Contoh: Survey, Meeting, Maintenance..."
                  className="h-10 text-xs"
                />
                <datalist id="purpose-suggestions">
                  {purposeSuggestions.map((p, idx) => (
                    <option key={idx} value={p} />
                  ))}
                </datalist>

                {/* Quick Purpose Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-zinc-500">
                    Saran Cepat:
                  </span>
                  {POPULAR_PURPOSES.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, purpose: tag }))
                      }
                      className={cn(
                        "rounded border px-2 py-0.5 text-[11px] transition-colors cursor-pointer",
                        form.purpose === tag
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Destination Section */}
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Host Destination
                  </Label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 select-none dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={form.is_custom_host}
                      onChange={(e) =>
                        setForm({ ...form, is_custom_host: e.target.checked })
                      }
                      className="rounded border-zinc-300"
                    />
                    <span>Custom Host Name</span>
                  </label>
                </div>

                {!form.is_custom_host ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="staff_id" className="text-xs">Staff Host PIC</Label>
                    <Popover open={openStaff} onOpenChange={setOpenStaff}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={loadingMaster}
                          className={cn(
                            "w-full justify-between bg-white text-xs font-normal dark:bg-zinc-950",
                            !form.staff_id && "text-muted-foreground"
                          )}
                        >
                          {loadingMaster
                            ? "Memuat daftar staf..."
                            : form.staff_id
                              ? (() => {
                                  const selected = staffList.find(
                                    (item) => item.id.toString() === form.staff_id
                                  )
                                  if (!selected) return "Pilih Staf PIC Host..."
                                  const details = [selected.staff_id, selected.company, selected.address || selected.department].filter(Boolean).join(" - ")
                                  return details ? `${selected.name} (${details})` : selected.name
                                })()
                              : "Pilih Staf PIC Host..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[460px]">
                        <Command
                          filter={(value, search) =>
                            value.toLowerCase().includes(search.toLowerCase())
                              ? 1
                              : 0
                          }
                        >
                          <CommandInput placeholder="Cari nama staf, staff no, company, address..." />
                          <CommandList>
                            <CommandEmpty>Staf tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {staffList.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.name} ${item.staff_id || ""} ${item.company || ""} ${item.address || ""} ${item.department || ""} ${item.gender || ""} ${item.id}`}
                                  onSelect={() => {
                                    handleSelectChange(
                                      "staff_id",
                                      item.id.toString()
                                    )
                                    setOpenStaff(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      form.staff_id === item.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold">{item.name}</span>
                                      {item.staff_id && (
                                        <span className="rounded bg-zinc-100 px-1 py-0.2 text-[10px] font-mono font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                          {item.staff_id}
                                        </span>
                                      )}
                                      {item.gender && (
                                        <span className="text-[10px] text-zinc-500">
                                          • {item.gender}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500">
                                      {[item.company, item.address || item.department].filter(Boolean).join(" • ") || "No Department"}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {form.staff_id && (() => {
                      const selected = staffList.find((item) => item.id.toString() === form.staff_id)
                      if (!selected) return null
                      return (
                        <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50/80 p-2 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <div><span className="text-zinc-400">Staff No:</span> <span className="font-mono font-medium">{selected.staff_id || "-"}</span></div>
                            <div><span className="text-zinc-400">Gender:</span> <span className="font-medium">{selected.gender || "-"}</span></div>
                            <div><span className="text-zinc-400">Company:</span> <span className="font-medium">{selected.company || "-"}</span></div>
                            <div><span className="text-zinc-400">Address / Role:</span> <span className="font-medium">{selected.address || selected.department || "-"}</span></div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="host_name" className="text-xs">Custom Host Name *</Label>
                    <Input
                      id="host_name"
                      name="host_name"
                      value={form.host_name}
                      onChange={handleChange}
                      placeholder="Masukkan nama staf / penanggung jawab..."
                      required={form.is_custom_host}
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KOLOM KANAN: SECTION 3 - Kartu Akses & Kendaraan         */}
          {/* ======================================================== */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                3
              </span>
              <CreditCard className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Kartu Akses & Kendaraan (Pass & Vehicle)
              </h2>
            </div>

            <div className="space-y-4">
              {/* Alokasi Kartu Akses Pengunjung */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="card_ids" className="text-xs font-semibold">
                    Assign Visitor Cards
                  </Label>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {loadingMaster
                      ? "Memuat..."
                      : `${cardList.length} kartu tersedia`}
                  </Badge>
                </div>

                {cardList.length === 0 && !loadingMaster ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Tidak ada kartu pengunjung yang tersedia. Pastikan ada kartu fisik berstatus "available" di sistem.
                    </span>
                  </div>
                ) : (
                  <Popover open={openCard} onOpenChange={setOpenCard}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={loadingMaster}
                        className={cn(
                          "w-full justify-between text-xs font-normal",
                          form.card_ids.length === 0 && "text-muted-foreground"
                        )}
                      >
                        {loadingMaster
                          ? "Memuat daftar kartu..."
                          : form.card_ids.length > 0
                            ? form.card_ids
                                .map(
                                  (id) =>
                                    cardList.find((c) => c.id.toString() === id)
                                      ?.card_no
                                )
                                .filter(Boolean)
                                .join(", ")
                            : "Pilih Kartu Akses Pengunjung..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[320px]">
                      <Command
                        filter={(value, search) =>
                          value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                        }
                      >
                        <CommandInput placeholder="Cari nomor kartu..." />
                        <CommandList>
                          <CommandEmpty>Kartu tidak ditemukan.</CommandEmpty>
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
                                  <span className="text-xs font-mono">{item.card_no}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Selected Cards Chips */}
                {form.card_ids.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-zinc-500">
                      Terpilih:
                    </span>
                    {form.card_ids.map((id) => {
                      const card = cardList.find((c) => c.id.toString() === id)
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {card ? card.card_no : `Card #${id}`}
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectChange(
                                "card_ids",
                                form.card_ids.filter((cId) => cId !== id)
                              )
                            }
                            className="ml-0.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Kartu Akses Kendaraan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vehicle_card_id" className="text-xs font-semibold">
                    Vehicle Card (Optional)
                  </Label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {loadingMaster
                      ? ""
                      : `${vehicleList.length} kartu`}
                  </span>
                </div>
                <Popover open={openVehicle} onOpenChange={setOpenVehicle}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={loadingMaster}
                      className={cn(
                        "w-full justify-between text-xs font-normal",
                        !form.vehicle_card_id && "text-muted-foreground"
                      )}
                    >
                      {loadingMaster
                        ? "Memuat..."
                        : form.vehicle_card_id
                          ? vehicleList.find(
                              (item) =>
                                item.id.toString() === form.vehicle_card_id
                            )?.card_no
                          : "None / Select Vehicle Card..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[320px]">
                    <Command
                      filter={(value, search) =>
                        value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                      }
                    >
                      <CommandInput placeholder="Cari nomor kartu kendaraan..." />
                      <CommandList>
                        <CommandEmpty>Kartu kendaraan tidak ditemukan.</CommandEmpty>
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
                            <span className="text-xs text-zinc-500 italic">Tidak menggunakan kartu</span>
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
                              <span className="text-xs font-mono">{item.card_no}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Plat Nomor Kendaraan */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicle_no" className="text-xs font-semibold">
                  Vehicle Plate Number (Optional)
                </Label>
                <Input
                  id="vehicle_no"
                  name="vehicle_no"
                  className="w-full text-xs"
                  value={form.vehicle_no}
                  onChange={handleChange}
                  placeholder="Contoh: BP 1234 XY"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar with Save & Print Ticket */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-4 bg-white/95 backdrop-blur border-t border-zinc-200 p-4 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-lg dark:bg-zinc-950/95 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-zinc-500 hidden sm:block">
            {visitorStatus === "blacklisted" ? (
              <span className="text-red-600 font-medium">
                Pendaftaran diblokir karena pengunjung berada dalam daftar blacklist.
              </span>
            ) : (
              <span>
                Pastikan data Section 1, 2, dan 3 telah lengkap sebelum mencetak tiket.
              </span>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <Button
              type="submit"
              disabled={loading || visitorStatus === "blacklisted"}
              className="w-full sm:w-auto h-11 px-8 font-semibold cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses & Menyimpan...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Save & Print Ticket
                </>
              )}
            </Button>
          </div>
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

      {/* Supervisor override of a global entry (decision SEC-7) */}
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
