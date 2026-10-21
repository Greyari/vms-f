import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "@/context/I18nContext"
import api from "@/lib/axios"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Search,
  Loader2,
  X,
  Ship,
  User,
  Building2,
  IdCard,
  CheckCircle2,
  Clock,
  LogOut,
  AlertCircle,
} from "lucide-react"

export interface SearchVesselResult {
  id: string
  vessel_name: string
  location_id: string
  imo_no?: string | null
  call_sign?: string | null
  captain?: string | null
  sign_in_date: string
  sign_out_date?: string | null
  is_in_port: boolean
  active_crew_count: number
  completed_crew_count: number
}

export interface SearchCrewResult {
  visitor_id: string
  pivot_id?: string
  vessel_arrival_id: string
  name: string
  id_type: string
  id_number_masked: string
  company?: string | null
  occupation?: string | null
  phone?: string | null
  is_blacklisted: boolean
  status: "expected" | "checked_in" | "checked_out" | string
  checked_in_at?: string | null
  checked_out_at?: string | null
  notes?: string | null
  vessel_name: string
  sign_in_date?: string | null
  sign_out_date?: string | null
  is_active_placement: boolean
}

interface UnifiedVesselCrewSearchProps {
  onSelectVessel: (arrivalId: string) => void
  onSelectCrew: (visitorId: string) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text || "-"}</>
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = text.split(new RegExp(`(${escaped})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 px-0.5 rounded font-semibold text-inherit"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  } catch {
    return <>{text}</>
  }
}

export default function UnifiedVesselCrewSearch({
  onSelectVessel,
  onSelectCrew,
  inputRef,
  className = "",
}: UnifiedVesselCrewSearchProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    vessels: SearchVesselResult[]
    crew: SearchCrewResult[]
  }>({ vessels: [], crew: [] })
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const internalInputRef = useRef<HTMLInputElement>(null)
  const activeInputRef = inputRef || internalInputRef
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Combined flat list for keyboard arrow navigation
  const flatItems = [
    ...results.vessels.map((v) => ({ type: "vessel" as const, item: v })),
    ...results.crew.map((c) => ({ type: "crew" as const, item: c })),
  ]

  const executeSearch = useCallback(
    async (q: string, completed: boolean) => {
      const clean = q.trim()
      if (clean.length < 2) {
        setResults({ vessels: [], crew: [] })
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await api.get("/vessel-arrivals/search", {
          params: {
            q: clean,
            show_completed: completed ? 1 : 0,
          },
        })
        setResults({
          vessels: res.data?.vessels || [],
          crew: res.data?.crew || [],
        })
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (err) {
        console.error("Unified search failed:", err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced search on query or toggle change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.trim().length < 2) {
      setResults({ vessels: [], crew: [] })
      setLoading(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query, showCompleted)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, showCompleted, executeSearch])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === "ArrowDown" && query.trim().length >= 2) {
        setIsOpen(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
        const selected = flatItems[selectedIndex]
        if (selected.type === "vessel") {
          onSelectVessel(selected.item.id)
        } else {
          onSelectCrew(selected.item.visitor_id)
        }
        setIsOpen(false)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    setResults({ vessels: [], crew: [] })
    setIsOpen(false)
    activeInputRef.current?.focus()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("vessel.status_checked_in", "Checked In")}
          </Badge>
        )
      case "expected":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300">
            <Clock className="mr-1 h-3 w-3" />
            {t("vessel.status_expected", "Belum Check-In")}
          </Badge>
        )
      case "checked_out":
      default:
        return (
          <Badge variant="outline" className="text-zinc-500 border-zinc-300 dark:border-zinc-700">
            <LogOut className="mr-1 h-3 w-3" />
            {t("vessel.status_checked_out", "Check-Out")}
          </Badge>
        )
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={activeInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!isOpen && e.target.value.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onFocus={() => {
              if (query.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "vessel.search_placeholder",
              "Cari kapal atau nama kru, No. ID, Paspor, Seaman Book, Perusahaan..."
            )}
            className="pl-10 pr-10 h-10 w-full shadow-sm text-sm"
          />
          {loading ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Toggle Show Completed Placements */}
        <div className="flex items-center gap-2 px-1 shrink-0">
          <Switch
            id="show-completed-toggle"
            checked={showCompleted}
            onCheckedChange={(checked) => {
              setShowCompleted(checked)
              if (query.trim().length >= 2) {
                executeSearch(query, checked)
              }
            }}
          />
          <Label
            htmlFor="show-completed-toggle"
            className="text-xs font-medium cursor-pointer text-muted-foreground select-none"
          >
            {t("vessel.show_completed_placements", "Tampilkan yang selesai (Checked Out)")}
          </Label>
        </div>
      </div>

      {/* Dropdown Results Card */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-[75vh] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          {loading && flatItems.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t("common.searching", "Mencari kapal & kru...")}</span>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="mx-auto h-7 w-7 text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">
                {t("vessel.search_no_results", "Tidak ditemukan hasil")}
              </p>
              <p className="text-xs mt-1">
                {t("vessel.search_no_results_desc", "Tidak ada kapal atau kru yang cocok dengan kata kunci \"{{query}}\"", {
                  query,
                })}
              </p>
            </div>
          ) : (
            <div className="py-2 divide-y divide-border/50">
              {/* GROUP 1: KAPAL / VESSELS */}
              {results.vessels.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Ship className="h-3.5 w-3.5 text-primary" />
                      {t("vessel.group_vessels", "Kapal / Vessels")} ({results.vessels.length})
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {results.vessels.map((v, idx) => {
                      const isSelected = selectedIndex === idx
                      return (
                        <div
                          key={`vessel-${v.id}`}
                          onClick={() => {
                            onSelectVessel(v.id)
                            setIsOpen(false)
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-accent text-accent-foreground font-medium"
                              : "hover:bg-muted/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                              <Ship className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate text-foreground">
                                <HighlightText text={v.vessel_name} query={query} />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                {v.imo_no && (
                                  <span>
                                    IMO: <HighlightText text={v.imo_no} query={query} />
                                  </span>
                                )}
                                {v.call_sign && <span>Call Sign: {v.call_sign}</span>}
                                {v.captain && <span>Kapten: {v.captain}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {v.active_crew_count} {t("vessel.active_crew", "Kru Aktif")}
                            </Badge>
                            {v.is_in_port ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                                In Port
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-zinc-500 text-xs">
                                Departed
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* GROUP 2: KRU / CREW */}
              {results.crew.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {t("vessel.group_crew", "Kru / Crew")} ({results.crew.length})
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {results.crew.map((c, idx) => {
                      const itemIndex = results.vessels.length + idx
                      const isSelected = selectedIndex === itemIndex
                      const isCheckedOut = c.status === "checked_out"

                      return (
                        <div
                          key={`crew-${c.visitor_id}-${c.pivot_id || idx}`}
                          onClick={() => {
                            onSelectCrew(c.visitor_id)
                            setIsOpen(false)
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted/70"
                          } ${
                            isCheckedOut
                              ? "opacity-60 bg-muted/30 text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2 rounded-full shrink-0 ${
                                isCheckedOut
                                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                                  : "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold truncate">
                                  <HighlightText text={c.name} query={query} />
                                </span>
                                {c.is_blacklisted && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">
                                    BLACKLIST
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {c.company && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    <HighlightText text={c.company} query={query} />
                                  </span>
                                )}
                                {c.id_number_masked && (
                                  <span className="flex items-center gap-1">
                                    <IdCard className="h-3 w-3" />
                                    {c.id_type?.toUpperCase()}: {c.id_number_masked}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  <Ship className="h-3 w-3 text-muted-foreground" />
                                  <HighlightText text={c.vessel_name} query={query} />
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {getStatusBadge(c.status)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
