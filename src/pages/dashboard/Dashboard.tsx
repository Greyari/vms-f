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

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/dashboard")
      setData(res.data)
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true) // keep any previously loaded data visible
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

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-zinc-900" />
      </div>
    )

  // First-load failure. A blip during the 30s auto-refresh keeps the last good
  // data on screen instead of crashing on data.stats (was an unguarded null).
  if (!data)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-zinc-500">Failed to load dashboard data.</p>
        <button
          onClick={() => {
            setLoading(true)
            fetchData()
          }}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )

  const statCards = [
    {
      label: "Active Visitors",
      value: data.stats.active_visits,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      onClick: () => navigate("/visits/activate"),
    },
    {
      label: "This Month",
      value: data.stats.month_visits,
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      onClick: () => navigate("/visits/report"),
    },
    {
      label: "Total Visitors",
      value: data.stats.total_visitors,
      icon: Users,
      color: "text-zinc-600",
      bg: "bg-zinc-50 dark:bg-zinc-900",
      onClick: () => navigate("/master/visitors"),
    },
    {
      label: "Blacklisted",
      value: data.stats.blacklisted_visitors,
      icon: ShieldOff,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      onClick: () => navigate("/master/visitors/blacklist"),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Check out all the visitor data and charts for this week.
          </p>
        </div>
      </div>

      {/* Live-refresh failure banner: last-good data stays on screen. */}
      {error && data && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Live refresh failed — showing last loaded data
          </span>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/60 px-3 py-1 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`${card.bg} cursor-pointer rounded-lg border border-zinc-200 p-4 transition-shadow hover:shadow-md dark:border-zinc-800`}
          >
            <div className={`${card.color} mb-2`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Visits Last 7 Days
          </h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#18181b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cards Status */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Visitor Cards
              </h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Available</span>
                <span className="font-medium text-green-600">
                  {data.cards.available}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">In Use</span>
                <span className="font-medium text-orange-600">
                  {data.cards.in_use}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-zinc-500">Total</span>
                <span className="font-medium">{data.cards.total}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all"
                  style={{
                    width: `${data.cards.total > 0 ? (data.cards.in_use / data.cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Vehicle Cards
              </h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Available</span>
                <span className="font-medium text-green-600">
                  {data.vehicle_cards.available}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">In Use</span>
                <span className="font-medium text-orange-600">
                  {data.vehicle_cards.in_use}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-zinc-500">Total</span>
                <span className="font-medium">{data.vehicle_cards.total}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all"
                  style={{
                    width: `${data.vehicle_cards.total > 0 ? (data.vehicle_cards.in_use / data.vehicle_cards.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Active Visits */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Currently Active Visitors
        </h2>
        {data.recent_visits.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No active visitors
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.recent_visits.map((visit: any) => (
              <div
                key={visit.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {visit.visitor_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {visit.purpose} — {visit.staff_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-zinc-400">
                    {visit.time_in}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
