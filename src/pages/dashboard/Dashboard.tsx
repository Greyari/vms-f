import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/axios"
import {
  Users,
  ClipboardList,
  CreditCard,
  Car,
  ShieldOff,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Ship,
  Anchor,
  PlusCircle,
  Printer,
  Clock,
  ArrowUpRight,
  Compass,
  CheckCircle2,
  LogIn,
  LogOut,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchData()

    // Auto refresh setiap 30 detik
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-zinc-900 dark:border-zinc-100" />
        <p className="text-sm font-medium text-zinc-500">Memuat data operasional dashboard...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-zinc-500">Gagal memuat data dashboard.</p>
        <Button
          onClick={() => {
            setLoading(true)
            fetchData()
          }}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </Button>
      </div>
    )
  }

  const statCards = [
    {
      label: "Pengunjung Aktif di Yard",
      value: data.stats.active_visits,
      sub: `Hari ini: +${data.stats.today_visits || 0} masuk · ${data.stats.today_checkouts || 0} keluar`,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-900/60",
      onClick: () => navigate("/visits/activate"),
    },
    {
      label: "Kru Kapal di Galangan (On-Board)",
      value: data.crew?.active_onboard ?? data.stats.active_crew ?? 0,
      sub: `Dari ${data.stats.total_crew || 0} total kru terdaftar`,
      icon: Anchor,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/70 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-900/60",
      onClick: () => navigate("/vessels/arrivals"),
    },
    {
      label: "Kapal Bersandar di Galangan",
      value: data.vessels?.active_in_yard ?? data.stats.active_vessels ?? 0,
      sub: `Dari ${data.stats.total_vessels || 0} total kapal di master data`,
      icon: Ship,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50/70 dark:bg-cyan-950/20",
      border: "border-cyan-200 dark:border-cyan-900/60",
      onClick: () => navigate("/vessels/arrivals"),
    },
    {
      label: "Kunjungan Bulan Ini",
      value: data.stats.month_visits,
      sub: "Laporan rekapitulasi bulan berjalan",
      icon: ClipboardList,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50/70 dark:bg-purple-950/20",
      border: "border-purple-200 dark:border-purple-900/60",
      onClick: () => navigate("/reports/visitors"),
    },
    {
      label: "Database Pengunjung Master",
      value: data.stats.total_visitors,
      sub: "Tamu, vendor & kontraktor terdaftar",
      icon: Users,
      color: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-50 dark:bg-zinc-900/50",
      border: "border-zinc-200 dark:border-zinc-800",
      onClick: () => navigate("/master/visitors"),
    },
    {
      label: "Data Blacklist Terpantau",
      value: data.stats.active_blacklists_count ?? data.stats.blacklisted_visitors ?? 0,
      sub: "Daftar cekal keamanan aktif",
      icon: ShieldOff,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50/70 dark:bg-rose-950/20",
      border: "border-rose-200 dark:border-rose-900/60",
      onClick: () => navigate("/master/visitors/blacklist"),
    },
  ]

  const activeVessels = data.vessels?.active_list || []
  const recentCrewLogs = data.crew?.recent_logs || []

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Action Hub */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard Operasional VMS
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              Live Monitoring
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Pusat pemantauan kunjungan harian, kapal & kru di galangan, serta status kartu akses.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate("/visits/create")}
            className="h-9 gap-1.5 bg-zinc-900 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <PlusCircle className="h-4 w-4" />
            + Tambah Kunjungan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/visits/activate")}
            className="h-9 gap-1.5 text-xs"
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            Kunjungan Aktif
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/vessels/arrivals")}
            className="h-9 gap-1.5 text-xs"
          >
            <Ship className="h-4 w-4 text-blue-600" />
            Kedatangan Kapal / Kru
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/visits/reprint")}
            className="h-9 gap-1.5 text-xs"
          >
            <Printer className="h-4 w-4 text-zinc-600" />
            Cetak Ulang Tiket
          </Button>
        </div>
      </div>

      {/* Live-refresh failure warning */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            Koneksi auto-refresh terganggu — menampilkan data terakhir yang berhasil dimuat.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            className="h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Muat Ulang
          </Button>
        </div>
      )}

      {/* Stat Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`group relative cursor-pointer rounded-xl border ${card.border} ${card.bg} p-4 transition-all hover:scale-[1.02] hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div className={`${card.color} rounded-lg p-2 bg-white/80 dark:bg-zinc-900/80 shadow-xs`}>
                <card.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {card.value}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                {card.label}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart & Vessels on Left, Inventory & Crew Logs on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri & Tengah (2 Span) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Trend Kunjungan Mingguan */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Tren Kunjungan 7 Hari Terakhir
                </h2>
                <p className="text-xs text-zinc-500">
                  Volume kunjungan masuk per hari di area galangan
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-mono font-medium">
                7 Hari Terakhir
              </Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
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
                  <Bar dataKey="total" name="Kunjungan" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kapal yang Sedang Berada di Galangan */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Kapal Sedang Bersandar di Galangan
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Daftar kapal aktif dengan personil kru yang sedang on-board
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/vessels/arrivals")}
                className="h-8 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Lihat Semua ({data.vessels?.active_in_yard || 0})
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            {activeVessels.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
                <Ship className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                <p className="mt-2 text-xs font-medium text-zinc-500">
                  Tidak ada kedatangan kapal yang tercatat aktif saat ini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {activeVessels.map((v) => (
                  <div key={v.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {v.vessel_name}
                        </span>
                        {v.imo && v.imo !== "-" && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            IMO: {v.imo}
                          </Badge>
                        )}
                        {v.flag && v.flag !== "-" && (
                          <span className="text-[11px] text-zinc-500">
                            • {v.flag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Nakhoda: <strong className="font-medium text-zinc-700 dark:text-zinc-300">{v.captain || "-"}</strong> · Masuk: {v.sign_in_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 font-medium text-xs">
                        <Anchor className="mr-1 h-3 w-3" />
                        {v.active_crew_count} Kru On-Board
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Span): Inventory Kartu & Recent Crew Activity */}
        <div className="space-y-6">
          {/* Status Kartu Visitor */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Kartu Akses Pengunjung
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/master/cards")}
                className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Kelola
              </Button>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tersedia (Available)</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {data.cards.available} kartu
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Sedang Digunakan (In Use)</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                  {data.cards.in_use} kartu
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-xs font-semibold dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">Total Kartu Fisik</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{data.cards.total} kartu</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${data.cards.total > 0 ? (data.cards.in_use / data.cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status Kartu Kendaraan */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Kartu Akses Kendaraan
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/master/vehicle-cards")}
                className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Kelola
              </Button>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tersedia (Available)</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {data.vehicle_cards.available} kartu
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Sedang Digunakan (In Use)</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                  {data.vehicle_cards.in_use} kartu
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-xs font-semibold dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">Total Kartu Kendaraan</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{data.vehicle_cards.total} kartu</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${data.vehicle_cards.total > 0 ? (data.vehicle_cards.in_use / data.vehicle_cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Aktivitas Kru Kapal Terkini */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Aktivitas Kru Terkini
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/vessels/arrivals")}
                className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Log Lengkap
              </Button>
            </div>

            {recentCrewLogs.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                Belum ada aktivitas kru tercatat baru-baru ini.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCrewLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-2 border-b border-zinc-50 pb-2.5 last:border-0 dark:border-zinc-900">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.crew_name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          ({log.occupation})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                        Kapal: {log.vessel_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {log.action === "check_in" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-[10px] text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <LogIn className="mr-0.5 h-2.5 w-2.5" /> On Board
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                          <LogOut className="mr-0.5 h-2.5 w-2.5" /> Sign Off
                        </Badge>
                      )}
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
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Pengunjung & Kru yang Sedang Aktif di Yard
              </h2>
              <Badge className="bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                {data.recent_visits.length} Terbaru
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Daftar tamu dan kru kapal yang masih berstatus kunjungan terbuka (belum check-out)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/visits/activate")}
            className="h-8 gap-1 text-xs"
          >
            Lihat Semua Kunjungan Aktif
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {data.recent_visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tidak ada tamu aktif di area galangan saat ini.
            </p>
            <p className="text-xs text-zinc-500">
              Semua pengunjung telah melakukan check-out.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3">No. Tiket</th>
                  <th className="py-2.5 px-3">Nama Pengunjung & Instansi</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Tujuan (Lokasi / Kapal)</th>
                  <th className="py-2.5 px-3">Host PIC / Nakhoda</th>
                  <th className="py-2.5 px-3">Kartu Akses</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.recent_visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {visit.ticket_number}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {visit.visitor_name}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {visit.company || "-"} · {visit.purpose}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {visit.visitor_type === "crew" ? (
                        <Badge variant="outline" className="bg-blue-50 text-[10px] text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                          <Anchor className="mr-0.5 h-2.5 w-2.5" /> Kru Kapal
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-zinc-50 text-[10px] text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
                          Tamu
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {visit.is_vessel ? (
                          <Ship className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>{visit.location_name || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                      {visit.staff_name || "-"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {visit.card_no && visit.card_no !== "-" && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {visit.card_no}
                          </span>
                        )}
                        {visit.vehicle_no && visit.vehicle_no !== "-" && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {visit.vehicle_no}
                          </span>
                        )}
                        {(!visit.card_no || visit.card_no === "-") && (!visit.vehicle_no || visit.vehicle_no === "-") && (
                          <span className="text-zinc-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        {visit.time_in}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/visits/${visit.id}/print`, { state: { visit } })}
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Cetak Tiket Pass"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/visits/activate")}
                          className="h-7 px-2 text-[11px]"
                        >
                          Kelola
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
