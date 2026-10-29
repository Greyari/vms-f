import { useState } from "react"
import {
  UserCheck,
  AlertTriangle,
  UserX,
  Ship,
  Building2,
  CreditCard,
  Printer,
  CheckCircle2,
  RotateCcw,
  Search,
  LogOut,
  FileSpreadsheet,
  Anchor,
  Users,
  QrCode,
  Car,
  Compass,
  Link2,
  Plus,
  Eye,
  X,
} from "lucide-react"
import { useTranslation } from "@/context/I18nContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SimulatorTabId = "visit-create" | "visit-history" | "vessel-crew"

interface OverviewSimulatorProps {
  activeTab?: SimulatorTabId
  onTabChange?: (tab: SimulatorTabId) => void
  onStartTour?: (tourId: string) => void
}

type DummyVisitorScenario = "verified" | "blocked" | "unregistered"

interface DummyVisitRow {
  id: string
  visitorName: string
  company: string
  destination: string
  hostName: string
  visitorCard: string
  vehicleCard?: string
  plateNo: string
  checkInTime: string
  status: "active" | "completed"
}

interface DummyCrewRow {
  id: string
  name: string
  rank: string
  docNo: string
  linkedToVessel: boolean
  status: "expected" | "onboard" | "checked_out"
}

interface DummyVesselItem {
  id: string
  name: string
  type: "repair" | "tugboat"
  descKey?: string
  customDesc?: string
  meta: string
  departed: boolean
}

const INITIAL_VESSELS: DummyVesselItem[] = [
  {
    id: "vessel-1",
    name: "MV. OCEAN STAR (IMO 9412830)",
    type: "repair",
    descKey: "app_overview.simulator.vessel_crew.repair_vessel_desc",
    meta: "Captain: CAPT. DMITRY IVANOV · Agen: PT SAMUDERA AGENT",
    departed: false,
  },
  {
    id: "vessel-2",
    name: "TB. ASL BEACON (IMO 9104521)",
    type: "tugboat",
    descKey: "app_overview.simulator.vessel_crew.tugboat_desc",
    meta: "Captain: CAPT. BUDI PRASETYO · Armada Internal Galangan",
    departed: false,
  },
]

const INITIAL_HISTORY_ROWS: DummyVisitRow[] = [
  {
    id: "VIS-2026-081",
    visitorName: "BUDI SANTOSO",
    company: "PT MARITIM JAYA",
    destination: "MV. OCEAN STAR (IMO 9412830)",
    hostName: "HENDRA WIJAYA",
    visitorCard: "V-001",
    vehicleCard: "VH-01",
    plateNo: "BP 8821 XY",
    checkInTime: "08:30",
    status: "active",
  },
  {
    id: "VIS-2026-082",
    visitorName: "DEDI KURNIAWAN",
    company: "PT BAJA TEKNIK",
    destination: "WORKSHOP FABRIKASI",
    hostName: "SITI RAHMA",
    visitorCard: "V-004",
    plateNo: "BP 4109 ZC",
    checkInTime: "09:15",
    status: "active",
  },
  {
    id: "VIS-2026-079",
    visitorName: "SARI PUSPITA",
    company: "SURVEYOR KLASIFIKASI",
    destination: "GEDUNG UTAMA OFFICE",
    hostName: "HENDRA WIJAYA",
    visitorCard: "V-008",
    plateNo: "-",
    checkInTime: "07:45",
    status: "completed",
  },
]

const INITIAL_CREW_ROWS: DummyCrewRow[] = [
  {
    id: "CRW-1",
    name: "CAPT. DMITRY IVANOV",
    rank: "MASTER / CAPTAIN",
    docNo: "PASSPORT RU7781920",
    linkedToVessel: true,
    status: "expected",
  },
  {
    id: "CRW-2",
    name: "ALEXEY PETROV",
    rank: "CHIEF ENGINEER",
    docNo: "PASSPORT RU8812034",
    linkedToVessel: true,
    status: "onboard",
  },
  {
    id: "CRW-3",
    name: "WAYAN SUDARMA",
    rank: "AB SEAMAN",
    docNo: "KTP 5171021904920002",
    linkedToVessel: false,
    status: "expected",
  },
]

export default function OverviewSimulator({
  activeTab: controlledTab,
  onTabChange,
  onStartTour,
}: OverviewSimulatorProps) {
  const { t } = useTranslation()
  const [internalTab, setInternalTab] = useState<SimulatorTabId>("visit-create")
  const currentTab = controlledTab ?? internalTab

  const handleSelectTab = (tab: SimulatorTabId) => {
    setInternalTab(tab)
    onTabChange?.(tab)
  }

  // --- Tab 1 State: Simulasi Registrasi Tamu ---
  const [scenario, setScenario] = useState<DummyVisitorScenario>("verified")
  const [lookupMethod, setLookupMethod] = useState<"name" | "id">("name")
  const [selectedDest, setSelectedDest] = useState<"vessel" | "office">("vessel")
  const [selectedHost, setSelectedHost] = useState("HENDRA WIJAYA · Marine Supt")
  const [selectedCard, setSelectedCard] = useState("V-001")
  const [plateInput, setPlateInput] = useState("BP 8821 XY")
  const [passPrinted, setPassPrinted] = useState(false)

  const handleScenarioChange = (next: DummyVisitorScenario) => {
    setScenario(next)
    setPassPrinted(false)
  }

  const handleResetVisitSim = () => {
    setScenario("verified")
    setLookupMethod("name")
    setSelectedDest("vessel")
    setSelectedHost("HENDRA WIJAYA · Marine Supt")
    setSelectedCard("V-001")
    setPlateInput("BP 8821 XY")
    setPassPrinted(false)
  }

  // --- Tab 2 State: Simulasi Riwayat & Check-out ---
  const [historyRows, setHistoryRows] =
    useState<DummyVisitRow[]>(INITIAL_HISTORY_ROWS)
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "active" | "completed"
  >("all")
  const [plateSearch, setPlateSearch] = useState("")
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [reprintRowId, setReprintRowId] = useState<string | null>(null)

  const filteredHistoryRows = historyRows.filter((row) => {
    if (historyFilter !== "all" && row.status !== historyFilter) return false
    if (plateSearch.trim()) {
      const q = plateSearch.trim().toLowerCase()
      return (
        row.visitorName.toLowerCase().includes(q) ||
        row.plateNo.toLowerCase().includes(q) ||
        row.visitorCard.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleSingleCheckout = (id: string) => {
    setHistoryRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, status: "completed" } : row
      )
    )
    setSelectedRowIds((prev) => prev.filter((item) => item !== id))
  }

  const handleBulkCheckout = () => {
    if (selectedRowIds.length === 0) return
    const targetSet = new Set(selectedRowIds)
    setHistoryRows((prev) =>
      prev.map((row) =>
        targetSet.has(row.id) ? { ...row, status: "completed" } : row
      )
    )
    setSelectedRowIds([])
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleResetHistorySim = () => {
    setHistoryRows(INITIAL_HISTORY_ROWS)
    setHistoryFilter("all")
    setPlateSearch("")
    setSelectedRowIds([])
    setReprintRowId(null)
  }

  // --- Tab 3 State: Simulasi Kapal & Kru (dengan Modal Interaktif) ---
  const [vessels, setVessels] = useState<DummyVesselItem[]>(INITIAL_VESSELS)
  const [vesselMode, setVesselMode] = useState<"repair" | "tugboat">("repair")
  const [repairVesselDeparted, setRepairVesselDeparted] = useState(false)
  const [crewRows, setCrewRows] = useState<DummyCrewRow[]>(INITIAL_CREW_ROWS)
  const [crewQuickSearch, setCrewQuickSearch] = useState("")
  const [crewModalOpen, setCrewModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [crewSelectSubModalOpen, setCrewSelectSubModalOpen] = useState(false)
  const [registeredSuccessNotice, setRegisteredSuccessNotice] = useState(false)
  const [newVesselName, setNewVesselName] = useState(
    "MV. PACIFIC GLORY (IMO 9523114)"
  )
  const [newVesselOrigin, setNewVesselOrigin] = useState("Port of Singapore")
  const [newVesselCaptain, setNewVesselCaptain] = useState("CAPT. RONALD TAN")
  const [newVesselAgent, setNewVesselAgent] = useState("PT SAMUDERA PERKASA")
  const [selectedInitialCrewIds, setSelectedInitialCrewIds] = useState<string[]>(
    []
  )
  const [exportedLogNotice, setExportedLogNotice] = useState(false)

  const filteredCrewRows = crewRows.filter((c) => {
    if (!crewQuickSearch.trim()) return true
    const q = crewQuickSearch.trim().toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.rank.toLowerCase().includes(q) ||
      c.docNo.toLowerCase().includes(q)
    )
  })

  const handleLinkCrewToVessel = (id: string) => {
    setCrewRows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, linkedToVessel: true } : c))
    )
  }

  const handleCrewStatusChange = (
    id: string,
    nextStatus: DummyCrewRow["status"]
  ) => {
    setCrewRows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    )
  }

  const handleOpenCrewModalFor = (mode: "repair" | "tugboat") => {
    setVesselMode(mode)
    setCrewModalOpen(true)
  }

  const handleSubmitRegisterVessel = () => {
    const isTug =
      newVesselName.includes("TB.") || newVesselName.includes("BG.")
    const newVessel: DummyVesselItem = {
      id: `vessel-${Date.now()}`,
      name: newVesselName,
      type: isTug ? "tugboat" : "repair",
      customDesc: isTug
        ? "Tipe: Tugboat / Barge — Armada operasional yang menetap (Stay)."
        : "Tipe: Repair Vessel — Kapal perbaikan yang sandar untuk pemeliharaan galangan.",
      meta: `Captain: ${newVesselCaptain} · Agen: ${newVesselAgent} · Dari: ${newVesselOrigin}`,
      departed: false,
    }
    setVessels((prev) => [newVessel, ...prev])
    if (selectedInitialCrewIds.length > 0) {
      setCrewRows((prev) =>
        prev.map((c) =>
          selectedInitialCrewIds.includes(c.id)
            ? { ...c, linkedToVessel: true }
            : c
        )
      )
    }
    setRegisteredSuccessNotice(true)
    setRegisterModalOpen(false)
  }

  const handleResetVesselSim = () => {
    setVesselMode("repair")
    setRepairVesselDeparted(false)
    setVessels(INITIAL_VESSELS)
    setCrewRows(INITIAL_CREW_ROWS)
    setCrewQuickSearch("")
    setCrewModalOpen(false)
    setRegisterModalOpen(false)
    setCrewSelectSubModalOpen(false)
    setRegisteredSuccessNotice(false)
    setSelectedInitialCrewIds([])
    setExportedLogNotice(false)
  }

  const reprintedVisit =
    historyRows.find((r) => r.id === reprintRowId) ?? null

  const activeTourForTab =
    currentTab === "vessel-crew" ? "tour-vessel-flow" : "tour-visit-flow"

  return (
    <div className="space-y-4">
      {/* Simulator Top Bar & Scenario Tabs */}
      <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label={t("app_overview.simulator.tabs_aria")}
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === "visit-create"}
              onClick={() => handleSelectTab("visit-create")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                currentTab === "visit-create"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {t("app_overview.simulator.tab_visit_create")}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentTab === "visit-history"}
              onClick={() => handleSelectTab("visit-history")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                currentTab === "visit-history"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("app_overview.simulator.tab_visit_history")}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentTab === "vessel-crew"}
              onClick={() => handleSelectTab("vessel-crew")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                currentTab === "vessel-crew"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <Ship className="h-3.5 w-3.5" />
              {t("app_overview.simulator.tab_vessel_crew")}
            </button>
          </div>

          {onStartTour && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStartTour(activeTourForTab)}
              className="h-8 gap-1.5 text-xs"
            >
              <Compass className="h-3.5 w-3.5" />
              {t("app_overview.flow_start_tour")}
            </Button>
          )}
        </div>

      {/* =================================================================== */}
      {/* TAB 1: SIMULASI REGISTRASI & CETAK PASS (/visits/create)            */}
      {/* =================================================================== */}
      {currentTab === "visit-create" && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          {/* Mock Browser Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <code className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                /visits/create
              </code>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("app_overview.simulator.visit_create.window_caption")}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetVisitSim}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              {t("app_overview.simulator.reset_btn")}
            </Button>
          </div>

          {/* Step 1: Cari Pengunjung (By Nama atau By Nomor ID) */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    1
                  </span>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {t("app_overview.simulator.visit_create.step1_heading")}
                  </span>
                </div>

                <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setLookupMethod("name")}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition-colors",
                      lookupMethod === "name"
                        ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500"
                    )}
                  >
                    {t("app_overview.simulator.visit_create.method_by_name")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookupMethod("id")}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition-colors",
                      lookupMethod === "id"
                        ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500"
                    )}
                  >
                    {t("app_overview.simulator.visit_create.method_by_id")}
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {lookupMethod === "name"
                  ? t("app_overview.simulator.visit_create.method_name_hint")
                  : t("app_overview.simulator.visit_create.method_id_hint")}
              </p>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleScenarioChange("verified")}
                  className={cn(
                    "flex flex-col items-start rounded-md border p-2.5 text-left text-xs transition-all",
                    scenario === "verified"
                      ? "border-emerald-500 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-3.5 w-3.5" />
                    {t("app_overview.simulator.visit_create.preset_safe_label")}
                  </span>
                  <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {lookupMethod === "name"
                      ? "Nama: BUDI SANTOSO"
                      : "KTP: 2171041208890001"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScenarioChange("blocked")}
                  className={cn(
                    "flex flex-col items-start rounded-md border p-2.5 text-left text-xs transition-all",
                    scenario === "blocked"
                      ? "border-red-500 bg-red-50/70 font-semibold text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t(
                      "app_overview.simulator.visit_create.preset_blocked_label"
                    )}
                  </span>
                  <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {lookupMethod === "name"
                      ? "Nama: RUDI HARTONO"
                      : "KTP: 2171099901850009"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScenarioChange("unregistered")}
                  className={cn(
                    "flex flex-col items-start rounded-md border p-2.5 text-left text-xs transition-all",
                    scenario === "unregistered"
                      ? "border-amber-500 bg-amber-50/70 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <UserX className="h-3.5 w-3.5" />
                    {t("app_overview.simulator.visit_create.preset_new_label")}
                  </span>
                  <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {lookupMethod === "name"
                      ? "Nama: ANDI PRATAMA"
                      : "SIM: 3174051102940003"}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Status Panel Result */}
            <div className="flex flex-col justify-center">
              {scenario === "verified" && (
                <div className="space-y-2.5 rounded-lg border border-emerald-300 bg-emerald-50/80 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <UserCheck className="h-4 w-4" />
                      {t("app_overview.simulator.visit_create.status_verified")}
                    </span>
                    <Badge className="bg-emerald-600 text-[10px] text-white">
                      {t(
                        "app_overview.simulator.visit_create.badge_ready_checkin"
                      )}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 rounded border border-zinc-200 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="text-zinc-500">
                      {t("app_overview.simulator.visit_create.label_visitor")}:
                    </span>
                    <span className="text-right font-semibold">
                      BUDI SANTOSO
                    </span>
                    <span className="text-zinc-500">ID / PT:</span>
                    <span className="text-right font-medium">
                      KTP 2171041208890001 · PT MARITIM JAYA
                    </span>
                  </div>
                </div>
              )}

              {scenario === "blocked" && (
                <div className="space-y-2.5 rounded-lg border border-red-300 bg-red-50/80 p-3.5 dark:border-red-900 dark:bg-red-950/30">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      {t("app_overview.simulator.visit_create.status_blocked")}
                    </span>
                    <Badge variant="destructive" className="text-[10px]">
                      {t(
                        "app_overview.simulator.visit_create.badge_entry_denied"
                      )}
                    </Badge>
                  </div>
                  <p className="rounded border border-red-200 bg-white p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-zinc-950 dark:text-red-300">
                    {t(
                      "app_overview.simulator.visit_create.blocked_reason_text"
                    )}
                  </p>
                </div>
              )}

              {scenario === "unregistered" && (
                <div className="space-y-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <UserX className="h-4 w-4" />
                    {t(
                      "app_overview.simulator.visit_create.status_unregistered"
                    )}
                  </div>
                  <p className="text-xs">
                    {t(
                      "app_overview.simulator.visit_create.unregistered_help_text"
                    )}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleScenarioChange("verified")}
                    className="h-7 text-xs"
                  >
                    {t(
                      "app_overview.simulator.visit_create.simulate_register_btn"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 & Step 3: Dipisah Jelas antara Tujuan/Host dan Kartu Akses */}
          <div
            className={cn(
              "grid gap-4 md:grid-cols-2",
              scenario !== "verified" && "pointer-events-none opacity-45"
            )}
          >
            {/* Step 2: Pilih Lokasi / Kapal & Staf Penerima (Host) */}
            <div className="space-y-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  2
                </span>
                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("app_overview.simulator.visit_create.step2_heading")}
                </span>
              </div>

              <div className="space-y-2">
                <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t("app_overview.simulator.visit_create.select_dest_label")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDest("vessel")
                      setPassPrinted(false)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                      selectedDest === "vessel"
                        ? "border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <Ship className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">MV. OCEAN STAR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDest("office")
                      setPassPrinted(false)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                      selectedDest === "office"
                        ? "border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">GEDUNG UTAMA OFFICE</span>
                  </button>
                </div>

                {selectedDest === "vessel" && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11px] dark:border-emerald-900/60 dark:bg-emerald-950/25">
                    <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-200">
                      <span>MV. OCEAN STAR · IMO 9412830</span>
                      <Badge className="bg-emerald-600 text-[10px] text-white">
                        Repair Vessel
                      </Badge>
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Captain: CAPT. DMITRY IVANOV · PIC: HENDRA WIJAYA · Flag:
                      PANAMA
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <label
                    htmlFor="sim-host-select"
                    className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    {t("app_overview.simulator.visit_create.select_host_label")}
                  </label>
                  <select
                    id="sim-host-select"
                    value={selectedHost}
                    onChange={(e) => {
                      setSelectedHost(e.target.value)
                      setPassPrinted(false)
                    }}
                    className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="HENDRA WIJAYA · Marine Supt">
                      HENDRA WIJAYA · Marine Supt
                    </option>
                    <option value="SITI RAHMA · HSE Officer">
                      SITI RAHMA · HSE Officer
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Pilih Kartu Akses Fisik & Kendaraan */}
            <div className="space-y-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  3
                </span>
                <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("app_overview.simulator.visit_create.step3_heading")}
                </span>
              </div>

              <div className="space-y-2">
                <span className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t("app_overview.simulator.visit_create.select_card_label")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["V-001", "V-002"].map((cardNo) => (
                    <button
                      key={cardNo}
                      type="button"
                      onClick={() => {
                        setSelectedCard(cardNo)
                        setPassPrinted(false)
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        selectedCard === cardNo
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      )}
                    >
                      {cardNo} ({t("app_overview.simulator.card_available")})
                    </button>
                  ))}
                  <span className="inline-flex cursor-not-allowed items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-600 opacity-75 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    V-003 ({t("app_overview.simulator.card_in_use")})
                  </span>
                </div>

                <div className="pt-1">
                  <label
                    htmlFor="sim-plate-input"
                    className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    <Car className="h-3 w-3" />
                    {t(
                      "app_overview.simulator.visit_create.vehicle_plate_label"
                    )}
                  </label>
                  <Input
                    id="sim-plate-input"
                    value={plateInput}
                    onChange={(e) => {
                      setPlateInput(e.target.value.toUpperCase())
                      setPassPrinted(false)
                    }}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Sticky Submit Bar & Cetak Tiket */}
          <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                4
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {scenario === "verified"
                  ? t("app_overview.simulator.visit_create.footer_ready")
                  : t("app_overview.simulator.visit_create.footer_locked")}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={scenario !== "verified"}
              onClick={() => setPassPrinted(true)}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("app_overview.simulator.visit_create.print_btn")}
            </Button>
          </div>

          {/* Visual Preview of Half-A4 Visitor Pass Ticket */}
          {passPrinted && scenario === "verified" && (
            <div className="rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 p-4 dark:border-emerald-700 dark:bg-emerald-950/20">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("app_overview.simulator.visit_create.pass_preview_title")}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  ½ A4 LANDSCAPE PASS
                </Badge>
              </div>

              <div className="grid gap-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-xs sm:grid-cols-3 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                    VISITOR PASS · VMS SHIPYARD
                  </p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    BUDI SANTOSO
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    PT MARITIM JAYA · KTP 2171041208890001
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
                    <div>
                      <span className="block text-[10px] text-zinc-400">
                        {t("app_overview.simulator.visit_create.pass_dest")}
                      </span>
                      <span className="font-semibold">
                        {selectedDest === "vessel"
                          ? "MV. OCEAN STAR (IMO 9412830)"
                          : "GEDUNG UTAMA OFFICE"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-400">
                        HOST
                      </span>
                      <span className="font-semibold">{selectedHost}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-md border border-zinc-200 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold">
                      #VIS-2026-081
                    </span>
                    <QrCode className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div className="my-1.5 space-y-1">
                    <Badge className="bg-zinc-900 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
                      CARD: {selectedCard}
                    </Badge>
                    {plateInput && (
                      <span className="block font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                        {plateInput} · VH-01
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {t("app_overview.simulator.visit_create.pass_signatures")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SIMULASI RIWAYAT & CHECK-OUT (/visits/history)               */}
      {/* =================================================================== */}
      {currentTab === "visit-history" && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          {/* Mock Browser Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <code className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                /visits/history
              </code>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("app_overview.simulator.visit_history.window_caption")}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetHistorySim}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              {t("app_overview.simulator.reset_btn")}
            </Button>
          </div>

          {/* Live Physical Card Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t("app_overview.simulator.visit_history.card_strip_label")}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {historyRows.map((row) => {
                const inUse = row.status === "active"
                return (
                  <span
                    key={row.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                      inUse
                        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    )}
                  >
                    <CreditCard className="h-3 w-3" />
                    {row.visitorCard}
                    {row.vehicleCard ? ` + ${row.vehicleCard}` : ""} ·{" "}
                    {inUse
                      ? t("app_overview.simulator.card_in_use")
                      : t("app_overview.simulator.card_available")}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Filter Tabs + Plate Search + Bulk Check-Out */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              {(["all", "active", "completed"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setHistoryFilter(tabKey)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    historyFilter === tabKey
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {t(`app_overview.simulator.visit_history.filter_${tabKey}`)}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                  placeholder={t(
                    "app_overview.simulator.visit_history.search_placeholder"
                  )}
                  aria-label={t(
                    "app_overview.simulator.visit_history.search_placeholder"
                  )}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {selectedRowIds.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkCheckout}
                  className="h-8 gap-1.5 text-xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("app_overview.simulator.visit_history.bulk_checkout_btn")} (
                  {selectedRowIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="w-8 p-2.5 text-center">#</th>
                  <th className="p-2.5">
                    {t("app_overview.simulator.visit_history.col_visitor")}
                  </th>
                  <th className="p-2.5">
                    {t("app_overview.simulator.visit_history.col_destination")}
                  </th>
                  <th className="p-2.5">
                    {t("app_overview.simulator.visit_history.col_card_plate")}
                  </th>
                  <th className="p-2.5">
                    {t("app_overview.simulator.visit_history.col_status")}
                  </th>
                  <th className="p-2.5 text-right">
                    {t("app_overview.simulator.visit_history.col_action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredHistoryRows.map((row) => {
                  const isActive = row.status === "active"
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={!isActive}
                          checked={selectedRowIds.includes(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                          aria-label={row.visitorName}
                          className="h-3.5 w-3.5 rounded border-zinc-300"
                        />
                      </td>
                      <td className="p-2.5">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.visitorName}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {row.company} · {row.checkInTime}
                        </p>
                      </td>
                      <td className="p-2.5">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {row.destination}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Host: {row.hostName}
                        </p>
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        <span className="font-semibold">{row.visitorCard}</span>
                        {row.vehicleCard ? ` + ${row.vehicleCard}` : ""}
                        <span className="block text-zinc-500">
                          {row.plateNo}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {isActive ? (
                          <Badge className="bg-emerald-600 text-[10px] text-white">
                            {t(
                              "app_overview.simulator.visit_history.status_in_yard"
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {t(
                              "app_overview.simulator.visit_history.status_checked_out"
                            )}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReprintRowId(
                                reprintRowId === row.id ? null : row.id
                              )
                            }
                            className="h-7 gap-1 px-2 text-[11px]"
                          >
                            <Printer className="h-3 w-3" />
                            Reprint Pass
                          </Button>

                          {isActive && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSingleCheckout(row.id)}
                              className="h-7 gap-1 px-2.5 text-[11px]"
                            >
                              <LogOut className="h-3 w-3" />
                              Check-Out
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {reprintedVisit && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              <span>
                <strong>Reprint Pass ({reprintedVisit.id}):</strong>{" "}
                {reprintedVisit.visitorName} — {reprintedVisit.destination} (
                {reprintedVisit.visitorCard})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReprintRowId(null)}
                className="h-6 px-2 text-[11px]"
              >
                OK
              </Button>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: SIMULASI KEDATANGAN KAPAL & MANIFEST KRU (/vessel-arrivals)  */}
      {/* =================================================================== */}
      {currentTab === "vessel-crew" && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          {/* Mock Browser Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <code className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                /vessel-arrivals
              </code>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("app_overview.simulator.vessel_crew.window_caption")}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetVesselSim}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              {t("app_overview.simulator.reset_btn")}
            </Button>
          </div>

          {/* Prerequisite Flow Steps Banner */}
          <div className="grid gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs sm:grid-cols-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="space-y-1 rounded border border-blue-100 bg-white p-2.5 dark:border-blue-900/40 dark:bg-zinc-900">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {t("app_overview.simulator.vessel_crew.prereq_step1_title")}
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {t("app_overview.simulator.vessel_crew.prereq_step1_desc")}
              </p>
            </div>
            <div className="space-y-1 rounded border border-blue-100 bg-white p-2.5 dark:border-blue-900/40 dark:bg-zinc-900">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {t("app_overview.simulator.vessel_crew.prereq_step2_title")}
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {t("app_overview.simulator.vessel_crew.prereq_step2_desc")}
              </p>
            </div>
            <div className="space-y-1 rounded border border-blue-100 bg-white p-2.5 dark:border-blue-900/40 dark:bg-zinc-900">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {t("app_overview.simulator.vessel_crew.prereq_step3_title")}
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {t("app_overview.simulator.vessel_crew.prereq_step3_desc")}
              </p>
            </div>
          </div>

          {/* Step 1 on the Page: Daftar Transaksi Kedatangan Kapal Sandar */}
          <div className="space-y-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("app_overview.simulator.vessel_crew.table_title")}
                </span>
                <p className="text-[11px] text-zinc-500">
                  {t("app_overview.simulator.vessel_crew.table_desc")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  data-tour="vessel-create-btn"
                  onClick={() => setRegisterModalOpen(true)}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("app_overview.simulator.vessel_crew.create_arrival_btn")}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-tour="vessel-open-detail-btn"
                  onClick={() => handleOpenCrewModalFor("repair")}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  {t("app_overview.simulator.vessel_crew.open_crew_modal_btn")}
                </Button>
              </div>
            </div>

            {registeredSuccessNotice && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {t("app_overview.simulator.vessel_crew.arrival_created_msg")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRegisteredSuccessNotice(false)}
                  className="h-6 px-2 text-[11px]"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* List / Table of Active Vessels in Port */}
            <div className="grid gap-3 sm:grid-cols-2">
              {vessels.map((v) => {
                const isSelected = vesselMode === v.type
                const isStay = v.type === "tugboat"
                const isDeparted =
                  v.type === "repair" &&
                  (v.departed || (v.id === "vessel-1" && repairVesselDeparted))
                const VesselIcon = isStay ? Anchor : Ship

                return (
                  <div
                    key={v.id}
                    className={cn(
                      "flex flex-col justify-between rounded-lg border p-3 text-left text-xs transition-all",
                      isSelected
                        ? isStay
                          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30"
                          : "border-blue-500 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                          <VesselIcon
                            className={cn(
                              "h-4 w-4",
                              isStay ? "text-emerald-600" : "text-blue-600"
                            )}
                          />
                          {v.name}
                        </span>
                        {isStay ? (
                          <Badge className="bg-emerald-600 text-[10px] text-white">
                            {t("app_overview.simulator.vessel_crew.status_stay")}
                          </Badge>
                        ) : (
                          <Badge
                            variant={isDeparted ? "secondary" : "default"}
                            className="text-[10px]"
                          >
                            {isDeparted
                              ? t(
                                  "app_overview.simulator.vessel_crew.status_departed"
                                )
                              : t(
                                  "app_overview.simulator.vessel_crew.status_in_port"
                                )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {v.descKey ? t(v.descKey) : v.customDesc}
                      </p>
                      <p className="text-[10px] text-zinc-500">{v.meta}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCrewModalFor(v.type)}
                        className="h-7 gap-1 text-[11px]"
                      >
                        <Eye className="h-3 w-3" />
                        {t(
                          "app_overview.simulator.vessel_crew.open_crew_modal_btn"
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* =============================================================== */}
          {/* MODAL DIALOG: CATAT KEDATANGAN KAPAL BARU                       */}
          {/* =============================================================== */}
          {registerModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sim-vessel-register-title"
              data-tour="vessel-form-modal-dialog"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            >
              <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="space-y-1">
                    <span
                      id="sim-vessel-register-title"
                      className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
                    >
                      <Ship className="h-4 w-4 text-emerald-600" />
                      {t(
                        "app_overview.simulator.vessel_crew.register_modal_title"
                      )}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {t(
                        "app_overview.simulator.vessel_crew.register_modal_subtitle"
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRegisterModalOpen(false)}
                    aria-label={t(
                      "app_overview.simulator.vessel_crew.close_modal_btn"
                    )}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="space-y-3.5 text-xs">
                  <div data-tour="vessel-form-select-vessel">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      {t(
                        "app_overview.simulator.vessel_crew.form_vessel_label"
                      )}
                    </label>
                    <select
                      value={newVesselName}
                      onChange={(e) => setNewVesselName(e.target.value)}
                      className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <option value="MV. PACIFIC GLORY (IMO 9523114)">
                        MV. PACIFIC GLORY (IMO 9523114) — Repair Vessel
                      </option>
                      <option value="TB. BRAVO TUG (IMO 9382101)">
                        TB. BRAVO TUG (IMO 9382101) — Tugboat / Stay
                      </option>
                      <option value="BG. MARITIM 08 (IMO 8841022)">
                        BG. MARITIM 08 (IMO 8841022) — Barge / Stay
                      </option>
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t(
                          "app_overview.simulator.vessel_crew.form_port_label"
                        )}
                      </label>
                      <Input
                        value={newVesselOrigin}
                        onChange={(e) => setNewVesselOrigin(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t(
                          "app_overview.simulator.vessel_crew.form_captain_label"
                        )}
                      </label>
                      <Input
                        value={newVesselCaptain}
                        onChange={(e) => setNewVesselCaptain(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      {t(
                        "app_overview.simulator.vessel_crew.form_agent_label"
                      )}
                    </label>
                    <Input
                      value={newVesselAgent}
                      onChange={(e) => setNewVesselAgent(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Initial Crew Selection */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                          {t(
                            "app_overview.simulator.vessel_crew.form_crew_label"
                          )}
                        </span>
                        <p className="text-[11px] text-zinc-500">
                          {selectedInitialCrewIds.length > 0
                            ? `${selectedInitialCrewIds.length} kru terpilih untuk kapal ini`
                            : t(
                                "app_overview.simulator.vessel_crew.form_crew_desc"
                              )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-tour="vessel-form-manage-crew-btn"
                        onClick={() => setCrewSelectSubModalOpen(true)}
                        className="h-7 text-xs bg-white dark:bg-zinc-900 font-medium"
                      >
                        {t(
                          "app_overview.simulator.vessel_crew.manage_crew_submodal_btn"
                        )}
                      </Button>
                    </div>

                    {selectedInitialCrewIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800">
                        {crewRows
                          .filter((c) =>
                            selectedInitialCrewIds.includes(c.id)
                          )
                          .map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[11px] gap-1 px-2 py-0.5"
                            >
                              <span>{c.name}</span>
                              <span className="text-zinc-400">({c.rank})</span>
                            </Badge>
                          ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                        Belum ada kru yang dipilih. Klik tombol &ldquo;Kelola
                        Kru Kapal&rdquo; di atas untuk memilih kru pelaut.
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRegisterModalOpen(false)}
                    className="h-8 text-xs"
                  >
                    {t("app_overview.simulator.cancel_btn")}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    data-tour="vessel-form-submit-btn"
                    onClick={handleSubmitRegisterVessel}
                    className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t(
                      "app_overview.simulator.vessel_crew.submit_arrival_btn"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SUB-MODAL DIALOG: PILIH & KELOLA KRU KAPAL (SELEKSI KRU)        */}
          {/* =============================================================== */}
          {crewSelectSubModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sim-crew-select-title"
              data-tour="vessel-crew-dialog-content"
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
            >
              <div className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="space-y-1">
                    <span
                      id="sim-crew-select-title"
                      className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
                    >
                      <Users className="h-4 w-4 text-blue-600" />
                      {t(
                        "app_overview.simulator.vessel_crew.crew_select_dialog_title"
                      )}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {t(
                        "app_overview.simulator.vessel_crew.crew_select_dialog_subtitle"
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrewSelectSubModalOpen(false)}
                    aria-label={t(
                      "app_overview.simulator.vessel_crew.close_modal_btn"
                    )}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Candidate Kru List */}
                <div
                  data-tour="vessel-crew-dialog-list"
                  className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 max-h-60 overflow-y-auto"
                >
                  {crewRows.map((crew) => {
                    const isChecked = selectedInitialCrewIds.includes(crew.id)
                    return (
                      <label
                        key={crew.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors cursor-pointer",
                          isChecked
                            ? "border-blue-500 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-950/40"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInitialCrewIds((prev) => [
                                ...prev,
                                crew.id,
                              ])
                            } else {
                              setSelectedInitialCrewIds((prev) =>
                                prev.filter((id) => id !== crew.id)
                              )
                            }
                          }}
                          className="rounded border-zinc-300"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {crew.name}
                          </span>
                          <span className="ml-2 text-[11px] text-zinc-500">
                            ({crew.rank} · {crew.docNo})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            crew.linkedToVessel
                              ? "text-blue-600 border-blue-200 dark:border-blue-800"
                              : "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                          )}
                        >
                          {crew.linkedToVessel
                            ? "Penugasan Lain"
                            : "Siap Ditugaskan"}
                        </Badge>
                      </label>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCrewSelectSubModalOpen(false)}
                    className="h-8 text-xs"
                  >
                    {t("app_overview.simulator.cancel_btn")}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    data-tour="vessel-crew-dialog-apply-btn"
                    onClick={() => setCrewSelectSubModalOpen(false)}
                    className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t(
                      "app_overview.simulator.vessel_crew.apply_crew_btn",
                      {
                        count: selectedInitialCrewIds.length,
                      }
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MODAL DIALOG INTERAKTIF: PILIH KAPAL DULU -> KELOLA KRU        */}
          {/* =============================================================== */}
          {crewModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sim-crew-modal-title"
              data-tour="vessel-detail-modal-dialog"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            >
              <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="space-y-1">
                    <span
                      id="sim-crew-modal-title"
                      className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
                    >
                      <Ship className="h-4 w-4 text-blue-600" />
                      {t("app_overview.simulator.vessel_crew.modal_title")}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {t("app_overview.simulator.vessel_crew.modal_subtitle")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCrewModalOpen(false)}
                    aria-label={t(
                      "app_overview.simulator.vessel_crew.close_modal_btn"
                    )}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* LANGKAH 1 DI DALAM MODAL: PILIH / KONFIRMASI KAPAL */}
                <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <span className="block text-xs font-semibold text-blue-950 dark:text-blue-200">
                    {t(
                      "app_overview.simulator.vessel_crew.step1_select_vessel"
                    )}
                  </span>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setVesselMode("repair")}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2 text-left text-xs transition-colors",
                        vesselMode === "repair"
                          ? "border-blue-600 bg-white font-bold text-blue-950 shadow-xs dark:border-blue-500 dark:bg-zinc-900 dark:text-blue-100"
                          : "border-zinc-200 bg-white/70 text-zinc-700 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Ship className="h-3.5 w-3.5 text-blue-600" />
                        MV. OCEAN STAR (IMO 9412830)
                      </span>
                      <Badge className="text-[10px] bg-blue-600 text-white">
                        Repair Vessel
                      </Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVesselMode("tugboat")}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2 text-left text-xs transition-colors",
                        vesselMode === "tugboat"
                          ? "border-emerald-600 bg-white font-bold text-emerald-950 shadow-xs dark:border-emerald-500 dark:bg-zinc-900 dark:text-emerald-100"
                          : "border-zinc-200 bg-white/70 text-zinc-700 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Anchor className="h-3.5 w-3.5 text-emerald-600" />
                        TB. ASL BEACON (IMO 9104521)
                      </span>
                      <Badge className="text-[10px] bg-emerald-600 text-white">
                        Stay
                      </Badge>
                    </button>
                  </div>

                  <div className="rounded border border-blue-100 bg-white p-2.5 text-[11px] text-zinc-600 sm:flex sm:items-center sm:justify-between dark:border-blue-900/30 dark:bg-zinc-900 dark:text-zinc-300">
                    <div>
                      <strong>Kapal Terpilih: </strong>
                      {vesselMode === "repair"
                        ? "MV. OCEAN STAR · IMO 9412830 · Capt. Dmitry Ivanov"
                        : "TB. ASL BEACON · IMO 9104521 · Capt. Budi Prasetyo"}
                    </div>
                    <div className="mt-1 sm:mt-0 font-mono text-[10px]">
                      Status:{" "}
                      {vesselMode === "repair"
                        ? repairVesselDeparted
                          ? "Departed"
                          : "In Port"
                        : "Permanent Stay"}
                    </div>
                  </div>
                </div>

                {/* LANGKAH 2 DI DALAM MODAL: MANAJEMEN MANIFEST KRU KAPAL */}
                <div className="space-y-3 rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t("app_overview.simulator.vessel_crew.step2_manage_crew")}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExportedLogNotice(true)}
                        className="h-7 gap-1 px-2.5 text-xs"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        {t("app_overview.simulator.vessel_crew.export_btn")}
                      </Button>

                      {vesselMode === "repair" && !repairVesselDeparted && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setRepairVesselDeparted(true)}
                          className="h-7 gap-1 px-2.5 text-xs"
                        >
                          <Ship className="h-3.5 w-3.5" />
                          {t("app_overview.simulator.vessel_crew.depart_btn")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filter Pencarian Kru */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={crewQuickSearch}
                      onChange={(e) => setCrewQuickSearch(e.target.value)}
                      placeholder={t(
                        "app_overview.simulator.vessel_crew.quick_search_placeholder"
                      )}
                      aria-label={t(
                        "app_overview.simulator.vessel_crew.quick_search_placeholder"
                      )}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  {/* Tabel Manifest Kru di Modal */}
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                          <th className="p-2.5">
                            {t("app_overview.simulator.vessel_crew.col_crew")}
                          </th>
                          <th className="p-2.5">
                            {t(
                              "app_overview.simulator.vessel_crew.col_rank_doc"
                            )}
                          </th>
                          <th className="p-2.5">
                            {t("app_overview.simulator.vessel_crew.col_status")}
                          </th>
                          <th className="p-2.5 text-right">
                            {t("app_overview.simulator.vessel_crew.col_action")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredCrewRows.map((crew) => (
                          <tr key={crew.id}>
                            <td className="p-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                              {crew.name}
                            </td>
                            <td className="p-2.5 text-zinc-600 dark:text-zinc-400">
                              {crew.rank} ·{" "}
                              <span className="font-mono text-[11px]">
                                {crew.docNo}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {!crew.linkedToVessel ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                >
                                  {t(
                                    "app_overview.simulator.vessel_crew.status_unlinked"
                                  )}
                                </Badge>
                              ) : crew.status === "expected" ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Expected
                                </Badge>
                              ) : crew.status === "onboard" ? (
                                <Badge className="bg-emerald-600 text-[10px] text-white">
                                  On-Board
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Checked-Out
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {!crew.linkedToVessel ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    handleLinkCrewToVessel(crew.id)
                                  }
                                  className="h-7 gap-1 px-2.5 text-[11px]"
                                >
                                  <Plus className="h-3 w-3" />
                                  <Link2 className="h-3 w-3" />
                                  {t(
                                    "app_overview.simulator.vessel_crew.link_crew_btn"
                                  )}
                                </Button>
                              ) : crew.status === "expected" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    handleCrewStatusChange(crew.id, "onboard")
                                  }
                                  className="h-7 px-2.5 text-[11px]"
                                >
                                  Check-In Kru
                                </Button>
                              ) : crew.status === "onboard" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCrewStatusChange(
                                      crew.id,
                                      "checked_out"
                                    )
                                  }
                                  className="h-7 px-2.5 text-[11px]"
                                >
                                  Check-Out Kru
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCrewStatusChange(crew.id, "onboard")
                                  }
                                  className="h-7 px-2.5 text-[11px]"
                                >
                                  Check-In Kru
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {exportedLogNotice && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <span>
                        {t(
                          "app_overview.simulator.vessel_crew.export_success_msg"
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExportedLogNotice(false)}
                        className="h-6 px-2 text-[11px]"
                      >
                        OK
                      </Button>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500">
                    Satu kru aktif hanya dapat ditempatkan pada satu kapal sandar.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCrewModalOpen(false)}
                    className="h-8 text-xs"
                  >
                    {t("app_overview.simulator.vessel_crew.close_modal_btn")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
