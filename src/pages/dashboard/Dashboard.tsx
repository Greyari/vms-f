import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"
import { useAuth } from "@/context/AuthContext"
import {
  Users,
  ClipboardList,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Ship,
  Anchor,
  Plus,
  Printer,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Building2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/StatusBadge"

interface DashboardData {
  stats: {
    active_visits: number
    month_visits: number
    today_visits: number
    today_checkouts: number
    total_visitors: number
    blacklisted_visitors: number
    active_blacklists_count?: number
    active_crew?: number
    total_crew?: number
    active_vessels?: number
    total_vessels?: number
  }
  cards: {
    total: number
    available: number
    in_use: number
  }
  vehicle_cards: {
    total: number
    available: number
    in_use: number
  }
  vessels?: {
    total: number
    active_in_yard: number
    active_list: Array<{
      id: string
      vessel_name: string
      captain: string
      imo: string
      flag: string
      sign_in_date: string
      active_crew_count: number
    }>
  }
  crew?: {
    active_onboard: number
    total_registered: number
    recent_logs: Array<{
      id: string
      crew_name: string
      occupation: string
      vessel_name: string
      action: "check_in" | "check_out"
      time: string
    }>
  }
  chart: Array<{
    date: string
    total: number
  }>
  recent_visits: Array<{
    id: string | number
    ticket_number: string
    visitor_name: string
    visitor_type?: string
    company?: string
    location_name?: string
    is_vessel?: boolean
    staff_name: string
    time_in: string
    purpose: string
    card_no?: string
    vehicle_no?: string
  }>
}

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canViewVisits = hasPermission("view_visits")

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(canViewVisits)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    if (!canViewVisits) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get("/dashboard")
      setData(res.data)
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [canViewVisits])

  useEffect(() => {
    if (!canViewVisits) {
      setLoading(false)
      return
    }
    fetchData()

    // Polling cerdas: hanya refresh bila tab aktif
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData, canViewVisits])

  if (!canViewVisits) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Building2 className="mx-auto h-10 w-10 text-zinc-400" />
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("dashboard.welcome_title", "Selamat Datang di VMS")}
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">
            {t(
              "dashboard.no_visits_permission",
              "Akun Anda tidak memiliki hak akses untuk melihat ringkasan operasional dashboard kunjungan. Silakan gunakan menu di navigasi sebelah kiri untuk mengakses modul Anda."
            )}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="text-xs text-zinc-500">{t("dashboard.loading", "Memuat data operasional dashboard...")}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <p className="text-xs text-zinc-500">{t("dashboard.error_load", "Gagal memuat data dashboard.")}</p>
        <Button
          onClick={() => {
            setLoading(true)
            fetchData()
          }}
          size="sm"
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("dashboard.retry", "Coba Lagi")}
        </Button>
      </div>
    )
  }

  const statCards = [
    {
      label: t("dashboard.stat_active_yard", "Pengunjung Aktif di Yard"),
      value: data.stats.active_visits,
      sub: t("dashboard.stat_active_yard_sub", `Hari ini: +${data.stats.today_visits || 0} masuk · ${data.stats.today_checkouts || 0} keluar`).replace("{{today}}", String(data.stats.today_visits || 0)).replace("{{out}}", String(data.stats.today_checkouts || 0)),
      icon: UserCheck,
      isAccent: true,
      onClick: () => navigate("/visits/history"),
    },
    {
      label: t("dashboard.stat_crew_onboard", "Kru Kapal di Galangan (On-Board)"),
      value: data.crew?.active_onboard ?? data.stats.active_crew ?? 0,
      sub: t("dashboard.stat_crew_onboard_sub", `Dari ${data.stats.total_crew || 0} total kru terdaftar`).replace("{{total}}", String(data.stats.total_crew || 0)),
      icon: Anchor,
      onClick: () => navigate("/vessel-arrivals"),
    },
    {
      label: t("dashboard.stat_vessels_in_yard", "Kapal Bersandar di Galangan"),
      value: data.vessels?.active_in_yard ?? data.stats.active_vessels ?? 0,
      sub: t("dashboard.stat_vessels_in_yard_sub", `Dari ${data.stats.total_vessels || 0} total kapal di master data`).replace("{{total}}", String(data.stats.total_vessels || 0)),
      icon: Ship,
      onClick: () => navigate("/vessel-arrivals"),
    },
    {
      label: t("dashboard.stat_month_visits", "Kunjungan Bulan Ini"),
      value: data.stats.month_visits,
      sub: t("dashboard.stat_month_visits_sub", "Laporan rekapitulasi bulan berjalan"),
      icon: ClipboardList,
      onClick: () => navigate("/reports/visits"),
    },
    {
      label: t("dashboard.stat_total_visitors", "Database Pengunjung Master"),
      value: data.stats.total_visitors,
      sub: t("dashboard.stat_total_visitors_sub", "Tamu, vendor & kontraktor terdaftar"),
      icon: Users,
      onClick: () => navigate("/master/visitors"),
    },
    {
      label: t("dashboard.stat_blacklist", "Data Blacklist Terpantau"),
      value: data.stats.active_blacklists_count ?? data.stats.blacklisted_visitors ?? 0,
      sub: t("dashboard.stat_blacklist_sub", "Daftar cekal keamanan aktif"),
      icon: ShieldAlert,
      isDanger: (data.stats.active_blacklists_count ?? data.stats.blacklisted_visitors ?? 0) > 0,
      onClick: () => navigate("/master/visitors/blacklist"),
    },
  ]

  const activeVessels = data.vessels?.active_list || []
  const recentCrewLogs = data.crew?.recent_logs || []

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("dashboard.title", "Ringkasan Operasional")}
            </h1>
            <StatusBadge variant="success" dot>
              {t("dashboard.live_monitoring", "Live Monitoring")}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t("dashboard.subtitle", "Pusat pemantauan kunjungan harian, kapal & kru di galangan, serta status kartu akses.")}
          </p>
        </div>

        {/* Quick Actions: Primary Emerald + Clean Outlines */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate("/visits/create")}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.add_visit", "Tambah Kunjungan")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/visits/history")}
            className="h-8 text-xs font-medium"
          >
            {t("dashboard.visit_history", "Riwayat Kunjungan")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/vessel-arrivals")}
            className="h-8 text-xs font-medium"
          >
            {t("dashboard.vessel_arrivals", "Kedatangan Kapal / Kru")}
          </Button>
        </div>
      </div>

      {/* Live-refresh failure warning */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            {t("dashboard.connection_interrupted", "Koneksi auto-refresh terganggu — menampilkan data terakhir yang berhasil dimuat.")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            className="h-6 text-xs px-2"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {t("dashboard.reload", "Muat Ulang")}
          </Button>
        </div>
      )}

      {/* Stat Metric Cards Grid: Clean Neutral Cards with Single Emerald Accent */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`group relative cursor-pointer rounded-lg border border-zinc-200 bg-white p-3.5 shadow-2xs transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 ${
              card.isAccent ? "border-l-4 border-l-emerald-600" : ""
            } ${card.isDanger ? "border-l-4 border-l-red-600" : ""}`}
          >
            <div className="flex items-center justify-between text-zinc-400">
              <card.icon className="h-4 w-4" />
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-2.5">
              <p
                className={`text-2xl font-semibold tracking-tight ${
                  card.isDanger
                    ? "text-red-600 dark:text-red-400"
                    : card.isAccent
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {card.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {card.label}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart & Vessels on Left, Inventory & Crew Logs on Right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Kolom Kiri (2 Span) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Trend Kunjungan Mingguan */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("dashboard.chart_title", "Tren Kunjungan 7 Hari Terakhir")}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("dashboard.chart_subtitle", "Volume kunjungan masuk per hari di area galangan")}
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {t("dashboard.chart_badge", "7 Hari Terakhir")}
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={{ stroke: "#e4e4e7" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} axisLine={{ stroke: "#e4e4e7" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                    labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
                  />
                  <Bar dataKey="total" name={t("dashboard.chart_series", "Kunjungan")} fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kapal yang Sedang Berada di Galangan */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("dashboard.vessels_title", "Kapal Sedang Bersandar di Galangan")}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("dashboard.vessels_subtitle", "Daftar kapal aktif dengan personil kru yang sedang on-board")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/vessel-arrivals")}
                className="h-7 text-xs font-medium gap-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t("dashboard.view_all", "Lihat Semua")} ({data.vessels?.active_in_yard || 0})
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            {activeVessels.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 p-5 text-center dark:border-zinc-800">
                <Ship className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                <p className="mt-1 text-xs text-zinc-500">
                  {t("dashboard.no_active_vessels", "Tidak ada kedatangan kapal yang tercatat aktif saat ini.")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {activeVessels.map((v) => (
                  <div key={v.id} className="flex flex-col justify-between gap-1.5 py-2.5 sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                          {v.vessel_name}
                        </span>
                        {v.imo && v.imo !== "-" && (
                          <span className="rounded bg-zinc-100 px-1 py-0.2 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            IMO: {v.imo}
                          </span>
                        )}
                        {v.flag && v.flag !== "-" && (
                          <span className="text-[11px] text-zinc-500">
                            · {v.flag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {t("dashboard.captain", "Nakhoda")}: <span className="font-medium text-zinc-700 dark:text-zinc-300">{v.captain || "-"}</span> · {t("dashboard.sign_in", "Masuk")}: {v.sign_in_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="neutral">
                        {v.active_crew_count} {t("dashboard.crew_onboard", "Kru On-Board")}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Span): Inventory Kartu & Recent Crew Activity */}
        <div className="space-y-4">
          {/* Status Kartu Visitor */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("dashboard.visitor_cards", "Kartu Akses Pengunjung")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/master/cards")}
                className="h-6 px-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {t("dashboard.manage", "Kelola")}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">{t("dashboard.available", "Tersedia")}</span>
                <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                  {data.cards.available} {t("dashboard.cards_unit", "kartu")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">{t("dashboard.in_use", "Sedang Digunakan")}</span>
                <span className="font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                  {data.cards.in_use} {t("dashboard.cards_unit", "kartu")}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-xs font-medium dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">{t("dashboard.total_cards", "Total Kartu Fisik")}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{data.cards.total} {t("dashboard.cards_unit", "kartu")}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-600 transition-all"
                  style={{
                    width: `${data.cards.total > 0 ? (data.cards.in_use / data.cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status Kartu Kendaraan */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("dashboard.vehicle_cards", "Kartu Akses Kendaraan")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/master/vehicle-cards")}
                className="h-6 px-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {t("dashboard.manage", "Kelola")}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">{t("dashboard.available", "Tersedia")}</span>
                <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                  {data.vehicle_cards.available} {t("dashboard.cards_unit", "kartu")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">{t("dashboard.in_use", "Sedang Digunakan")}</span>
                <span className="font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                  {data.vehicle_cards.in_use} {t("dashboard.cards_unit", "kartu")}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-xs font-medium dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">{t("dashboard.total_vehicle_cards", "Total Kartu Kendaraan")}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{data.vehicle_cards.total} {t("dashboard.cards_unit", "kartu")}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all"
                  style={{
                    width: `${data.vehicle_cards.total > 0 ? (data.vehicle_cards.in_use / data.vehicle_cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Aktivitas Kru Kapal Terkini */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("dashboard.recent_crew_activity", "Aktivitas Kru Terkini")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/vessel-arrivals")}
                className="h-6 px-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {t("dashboard.full_log", "Log Lengkap")}
              </Button>
            </div>

            {recentCrewLogs.length === 0 ? (
              <p className="py-3 text-center text-xs text-zinc-500">
                {t("dashboard.no_recent_crew_activity", "Belum ada aktivitas kru tercatat baru-baru ini.")}
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentCrewLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800/60">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {log.crew_name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          ({log.occupation})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                        {t("dashboard.vessel", "Kapal")}: {log.vessel_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge variant={log.action === "check_in" ? "success" : "neutral"}>
                        {log.action === "check_in" ? t("dashboard.on_board", "On Board") : t("dashboard.sign_off", "Sign Off")}
                      </StatusBadge>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                        {log.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Currently Active Visitors Table */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("dashboard.active_visitors_table_title", "Pengunjung & Kru yang Sedang Aktif di Yard")}
              </h2>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {data.recent_visits.length} {t("dashboard.latest", "Terbaru")}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("dashboard.active_visitors_table_subtitle", "Daftar tamu dan kru kapal yang masih berstatus kunjungan terbuka (belum check-out)")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/visits/history")}
            className="h-7 text-xs font-medium gap-1"
          >
            {t("dashboard.view_all_active", "Lihat Semua Kunjungan Aktif")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {data.recent_visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <p className="mt-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("dashboard.no_active_visitors", "Tidak ada tamu aktif di area galangan saat ini.")}
            </p>
            <p className="text-[11px] text-zinc-400">
              {t("dashboard.all_checked_out", "Semua pengunjung telah melakukan check-out.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                <tr>
                  <th className="py-2 px-3">{t("dashboard.th_ticket", "No. Tiket")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_visitor", "Nama Pengunjung & Instansi")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_type", "Tipe")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_destination", "Tujuan (Lokasi / Kapal)")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_host", "Staf yang Dikunjungi / Nakhoda")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_card", "Kartu Akses")}</th>
                  <th className="py-2 px-3">{t("dashboard.th_time_in", "Jam Masuk")}</th>
                  <th className="py-2 px-3 text-right">{t("dashboard.th_action", "Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.recent_visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {visit.ticket_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {visit.visitor_name}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {visit.company || "-"} · {visit.purpose}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge variant="neutral">
                        {visit.visitor_type === "crew" ? t("dashboard.crew_badge", "Kru Kapal") : t("dashboard.guest_badge", "Tamu")}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                      <span>{visit.location_name || "-"}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                      {visit.staff_name || "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {visit.card_no && visit.card_no !== "-" && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {visit.card_no}
                          </span>
                        )}
                        {visit.vehicle_no && visit.vehicle_no !== "-" && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {visit.vehicle_no}
                          </span>
                        )}
                        {(!visit.card_no || visit.card_no === "-") && (!visit.vehicle_no || visit.vehicle_no === "-") && (
                          <span className="text-zinc-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        {visit.time_in}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/visits/${visit.id}/print`, { state: { visit } })}
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title={t("dashboard.print_pass_title", "Cetak Tiket Pass")}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/visits/history")}
                          className="h-7 px-2 text-[11px]"
                        >
                          {t("dashboard.manage", "Kelola")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
