import { useState, useEffect, useRef } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useTranslation } from "../context/I18nContext"
import { permissionFor, type GuardedPath } from "../lib/routePermissions"
import SyncIndicator from "../components/sync/SyncIndicator"
import {
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  CreditCard,
  UserCircle,
  MoreVertical,
  LayoutDashboard,
  ShieldOff,
  History,
  Printer,
  Ship,
  Building2,
  KeyRound,
  Sun,
  Moon,
  Globe,
} from "lucide-react"

export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { t, language, setLanguage } = useTranslation()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)

  // Same matrix as the route guards in App.tsx (decision FE-2).
  const can = (path: GuardedPath) => {
    const permission = permissionFor(path)
    return permission === undefined || hasPermission(permission)
  }
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const menuItems = [
    {
      title: t("nav.overview"),
      items: [
        {
          name: t("nav.dashboard"),
          path: "/",
          icon: LayoutDashboard,
          show: hasPermission("view_visits"),
        },
      ],
    },
    {
      title: t("nav.visitor_management"),
      items: [
        {
          name: t("nav.add_visit"),
          path: "/visits/create",
          icon: ClipboardList,
          show: can("/visits/create"),
        },
        {
          name: t("nav.active_visitors"),
          path: "/visits/activate",
          icon: Users,
          show: can("/visits/activate"),
        },
        {
          name: t("nav.reprint_pass"),
          path: "/visits/reprint",
          icon: Printer,
          show: can("/visits/reprint"),
        },
        {
          name: t("nav.crew_arrivals"),
          path: "/vessel-arrivals",
          icon: Ship,
          show: can("/vessel-arrivals"),
        },
      ],
    },
    {
      title: t("nav.master_data"),
      items: [
        {
          name: t("nav.locations_vessels"),
          path: "/master/locations",
          icon: Building2,
          show: can("/master/locations"),
        },
        {
          name: t("nav.staffs"),
          path: "/master/staffs",
          icon: Users,
          show: can("/master/staffs"),
        },
        {
          name: t("nav.cards"),
          path: "/master/cards",
          icon: CreditCard,
          show: can("/master/cards"),
        },
        {
          name: t("nav.card_vehicles"),
          path: "/master/vehicle-cards",
          icon: CreditCard,
          show: can("/master/vehicle-cards"),
        },
        {
          name: t("nav.visitors"),
          path: "/master/visitors",
          icon: Users,
          show: can("/master/visitors"),
        },
        {
          name: t("nav.blacklist"),
          path: "/master/visitors/blacklist",
          icon: ShieldOff,
          show: can("/master/visitors/blacklist"),
        },
      ],
    },
    {
      title: t("nav.reports"),
      items: [
        {
          name: t("nav.visitor_report"),
          path: "/reports/visits",
          icon: FileText,
          show: can("/reports/visits"),
        },
        {
          name: t("nav.vessel_report"),
          path: "/reports/vessels",
          icon: Ship,
          show: can("/reports/vessels"),
        },
        {
          name: t("nav.crew_report", "Laporan Kru Kapal"),
          path: "/reports/crew",
          icon: Users,
          show: can("/reports/crew"),
        },
      ],
    },
    {
      title: t("nav.system_settings"),
      items: [
        {
          name: t("nav.system_users"),
          path: "/settings/users",
          icon: Settings,
          show: can("/settings/users"),
        },
        {
          name: t("nav.activity_logs"),
          path: "/settings/logs",
          icon: History,
          show: can("/settings/logs"),
        },
        {
          name: t("nav.roles"),
          path: "/settings/roles",
          icon: KeyRound,
          show: can("/settings/roles"),
        },
        {
          name: t("nav.my_profile"),
          path: "/settings/profile",
          icon: UserCircle,
          show: true,
        },
      ],
    },
  ]

  // Flatten all visible navigation items to determine the most specific active route
  const allVisibleItems = menuItems.flatMap((group) =>
    group.items.filter((item) => item.show)
  )

  const activeNavItem = allVisibleItems
    .filter((item) => {
      if (item.path === "/") {
        return location.pathname === "/"
      }
      return (
        location.pathname === item.path ||
        location.pathname.startsWith(item.path + "/")
      )
    })
    .sort((a, b) => b.path.length - a.path.length)[0]

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-14 items-center border-b border-zinc-200 px-6 text-lg font-semibold dark:border-zinc-800">
          VMS Core
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {menuItems.map((group, i) => {
            const visibleItems = group.items.filter((item) => item.show)
            if (visibleItems.length === 0) return null

            return (
              <div key={i} className="mb-6 px-4">
                <h3 className="mb-2 px-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item, j) => {
                    const Icon = item.icon
                    const isActive = activeNavItem?.path === item.path

                    return (
                      <Link
                        key={j}
                        to={item.path}
                        className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="relative border-t border-zinc-200 p-4 dark:border-zinc-800"
          ref={dropdownRef}
        >
          {profileOpen && (
            <div className="absolute right-4 bottom-16 left-4 z-50 animate-in rounded-lg border border-zinc-200 bg-white p-1 shadow-lg duration-200 fade-in slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-950">
              <button
                onClick={() => {
                  setProfileOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white dark:bg-zinc-200 dark:text-zinc-900">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.name}
                </span>
                <span className="max-w-[130px] truncate text-xs text-zinc-500">
                  {user?.email || user?.username}
                </span>
              </div>
            </div>

            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 ${profileOpen ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
              aria-label="User Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header bar with Theme Toggle and Cloud hub sync indicator */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Visitor Management System
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center rounded-md border border-zinc-200 bg-white p-0.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
              <Globe className="mx-1.5 h-3.5 w-3.5 text-zinc-400" />
              <button
                type="button"
                onClick={() => setLanguage("id")}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  language === "id"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
                title="Bahasa Indonesia"
                aria-label="Bahasa Indonesia"
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  language === "en"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
                title="English"
                aria-label="English"
              >
                EN
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
              aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600" />
              )}
            </button>
            <SyncIndicator canRun={hasPermission("manage_blacklist")} />
          </div>
        </div>
        <div className="max-w-10xl container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
