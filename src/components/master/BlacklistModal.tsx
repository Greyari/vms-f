import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Loader2,
  CheckCircle2,
  UserCheck,
  ExternalLink,
  X,
  UserPlus,
  Users,
  ShieldAlert,
} from "lucide-react"

export interface BlacklistRecordData {
  id: string | number
  visitor_id?: string | number | null
  visitor_no?: string | null
  name: string
  id_number: string
  id_type?: string
  badge_code?: string
  offences?: string
  blacklist_reason?: string
  date?: string
  blacklisted_at?: string
  remark?: string
  company?: string
}

export interface PreselectedVisitorData {
  id: string | number
  name: string
  id_type?: string
  id_number: string
  company?: string | null
  badge_code?: string | null
  visits_count?: number
}

export interface VisitorSearchResult {
  id: string | number
  visitor_no?: string | number
  name: string
  id_type: string
  id_number: string
  company?: string
  visits_count?: number
  is_blacklisted: boolean
  badge_code?: string
}

export interface BlacklistModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  blacklistRecord?: BlacklistRecordData | null
  preselectedVisitor?: PreselectedVisitorData | null
  onViewVisitorProfile?: (visitorId: string | number) => void
}

interface BlacklistFormState {
  visitor_id: string | number | null
  name: string
  badge_code: string
  id_number: string
  offences: string
  date: string
  remark: string
  company: string
}

const initialFormState: BlacklistFormState = {
  visitor_id: null,
  name: "",
  badge_code: "",
  id_number: "",
  offences: "",
  date: new Date().toISOString().slice(0, 10),
  remark: "",
  company: "",
}

export default function BlacklistModal({
  open,
  onClose,
  onSuccess,
  blacklistRecord,
  preselectedVisitor,
  onViewVisitorProfile,
}: BlacklistModalProps) {
  const { t, language } = useTranslation()

  const isEditing = Boolean(blacklistRecord)
  const isPreselected = Boolean(preselectedVisitor)

  const [formData, setFormData] = useState<BlacklistFormState>(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Visitor Selection & Autocomplete State for Create (Standalone Mode)
  const [visitorSearch, setVisitorSearch] = useState("")
  const [visitorCandidates, setVisitorCandidates] = useState<VisitorSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorSearchResult | null>(null)
  const [isNewVisitor, setIsNewVisitor] = useState(false)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Populate or reset form whenever open / record / preselected changes
  useEffect(() => {
    if (!open) {
      setFormErrors({})
      return
    }

    if (blacklistRecord) {
      const rawDate = blacklistRecord.blacklisted_at || blacklistRecord.date || ""
      const formattedDate = rawDate
        ? rawDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      setFormData({
        visitor_id:
          blacklistRecord.visitor_id ||
          (typeof blacklistRecord.id === "string" && !blacklistRecord.id.startsWith("019")
            ? blacklistRecord.id
            : null),
        name: blacklistRecord.name || "",
        badge_code: blacklistRecord.badge_code || "",
        id_number:
          blacklistRecord.id_number && !blacklistRecord.id_number.startsWith("NOKTP")
            ? blacklistRecord.id_number
            : "",
        offences: blacklistRecord.offences || blacklistRecord.blacklist_reason || "",
        date: formattedDate,
        remark: blacklistRecord.remark || "",
        company: blacklistRecord.company || "",
      })
      setSelectedVisitor(null)
      setIsNewVisitor(false)
    } else if (preselectedVisitor) {
      setFormData({
        visitor_id: preselectedVisitor.id,
        name: preselectedVisitor.name || "",
        badge_code: preselectedVisitor.badge_code || "",
        id_number:
          preselectedVisitor.id_number && !preselectedVisitor.id_number.startsWith("NOKTP")
            ? preselectedVisitor.id_number
            : "",
        offences: "",
        date: new Date().toISOString().slice(0, 10),
        remark: "",
        company: preselectedVisitor.company || "",
      })
      setSelectedVisitor({
        id: preselectedVisitor.id,
        name: preselectedVisitor.name,
        id_type: preselectedVisitor.id_type || "ktp",
        id_number: preselectedVisitor.id_number,
        company: preselectedVisitor.company || "",
        visits_count: preselectedVisitor.visits_count || 0,
        is_blacklisted: false,
        badge_code: preselectedVisitor.badge_code || "",
      })
      setIsNewVisitor(false)
    } else {
      setFormData({
        ...initialFormState,
        date: new Date().toISOString().slice(0, 10),
      })
      setSelectedVisitor(null)
      setIsNewVisitor(false)
      setVisitorSearch("")
      setVisitorCandidates([])
    }

    setFormErrors({})
  }, [open, blacklistRecord, preselectedVisitor])

  // Debounced visitor autocomplete search (only in standalone create mode)
  useEffect(() => {
    if (!open || isEditing || isPreselected || isNewVisitor || !visitorSearch.trim()) {
      if (!visitorSearch.trim()) {
        setVisitorCandidates([])
        setSearchDropdownOpen(false)
      }
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await api.get(`/visitors/search?q=${encodeURIComponent(visitorSearch.trim())}`)
        const items = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const mapped: VisitorSearchResult[] = items.map((v: any) => ({
          id: v.id,
          visitor_no: v.visitor_no,
          name: v.name,
          id_type: v.id_type || "ktp",
          id_number: v.id_number || "",
          company: v.company || "",
          visits_count: v.visits_count || v.total_visits || 0,
          is_blacklisted: Boolean(v.is_blacklisted),
          badge_code: v.badge_code || "",
        }))
        setVisitorCandidates(mapped)
        setSearchDropdownOpen(mapped.length > 0)
      } catch (err) {
        console.error("Autocomplete search error:", err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [visitorSearch, open, isEditing, isPreselected, isNewVisitor])

  // Click outside listener for combobox dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectVisitor = (candidate: VisitorSearchResult) => {
    if (candidate.is_blacklisted) {
      toast.error(
        language === "en"
          ? "This visitor is already blacklisted."
          : "Pengunjung ini sudah aktif di dalam daftar blacklist."
      )
      return
    }

    setSelectedVisitor(candidate)
    setSearchDropdownOpen(false)
    setVisitorSearch("")
    setFormData((prev) => ({
      ...prev,
      visitor_id: candidate.id,
      name: candidate.name,
      id_number:
        candidate.id_number && !candidate.id_number.startsWith("NOKTP")
          ? candidate.id_number
          : "",
      company: candidate.company || "",
      badge_code: candidate.badge_code || prev.badge_code || "",
    }))
  }

  const handleClearSelectedVisitor = () => {
    setSelectedVisitor(null)
    setFormData((prev) => ({
      ...prev,
      visitor_id: null,
      name: "",
      id_number: "",
      company: "",
    }))
  }

  const handleToggleNewVisitor = () => {
    setIsNewVisitor(true)
    setSelectedVisitor(null)
    setSearchDropdownOpen(false)
    setVisitorSearch("")
    setVisitorCandidates([])
    setFormData((prev) => ({
      ...prev,
      visitor_id: null,
      name: "",
      id_number: "",
      company: "",
    }))
  }

  const handleSwitchToRegistered = () => {
    setIsNewVisitor(false)
    setSelectedVisitor(null)
    setFormData((prev) => ({
      ...prev,
      visitor_id: null,
      name: "",
      id_number: "",
      company: "",
    }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!formData.name.trim()) {
      errors.name = `${t("blacklist.col_name_of_offender")} wajib diisi.`
    }
    if (!formData.id_number.trim()) {
      errors.id_number = `${t("blacklist.col_ktp_no")} wajib diisi.`
    }
    if (!formData.offences.trim()) {
      errors.offences = `${t("blacklist.col_offences")} wajib diisi.`
    }
    if (!formData.date.trim()) {
      errors.date = `${t("blacklist.col_date")} wajib diisi.`
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    try {
      if (isEditing && blacklistRecord) {
        await api.put(`/visitors/blacklisted/${blacklistRecord.id}`, formData)
        toast.success(
          language === "en"
            ? "Blacklist record updated successfully."
            : "Data blacklist berhasil diperbarui."
        )
      } else {
        await api.post("/visitors/blacklisted", formData)
        toast.success(
          language === "en"
            ? "Visitor successfully added to blacklist."
            : "Data blacklist berhasil ditambahkan."
        )
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      const backendErrors = error.response?.data?.errors
      if (backendErrors) {
        const formatted: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(backendErrors)) {
          if (Array.isArray(msgs)) formatted[key] = msgs[0]
        }
        setFormErrors(formatted)
      }
      toast.error(
        error.response?.data?.message ||
          (language === "en"
            ? "Failed to save blacklist record."
            : "Gagal menyimpan data blacklist.")
      )
    } finally {
      setSaving(false)
    }
  }

  const isVisitorLocked = Boolean(selectedVisitor || preselectedVisitor)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            {isEditing
              ? t("blacklist.modal_edit_title")
              : t("blacklist.modal_create_title")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("blacklist.modal_edit_desc")
              : t("blacklist.modal_create_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* STEP A: Autocomplete Visitor Combobox (Only in Create Mode when NOT preselected) */}
        {!isEditing && !isPreselected && (
          <div className="mb-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/70 p-3.5 dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <Users className="h-3.5 w-3.5 text-primary" />
                {t("blacklist.step_a_title")}
              </span>
              {!isNewVisitor ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleNewVisitor}
                  className="h-7 text-xs text-primary hover:text-primary/80"
                >
                  <UserPlus className="mr-1 h-3 w-3" />
                  {t("blacklist.not_registered_prompt")}{" "}
                  <span className="ml-1 underline">{t("blacklist.register_new_option")}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToRegistered}
                  className="h-7 text-xs text-primary hover:text-primary/80"
                >
                  <Users className="mr-1 h-3 w-3" />
                  {t("blacklist.use_registered_option")}
                </Button>
              )}
            </div>

            {selectedVisitor ? (
              /* Selected Visitor Banner with Lock Info & Profile Link */
              <div className="rounded-md border border-emerald-500/30 bg-emerald-50/80 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-100">
                          {selectedVisitor.name}
                        </p>
                        <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-400">
                          {t("blacklist.sourced_from_master")}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-emerald-800 dark:text-emerald-300">
                        {selectedVisitor.id_type?.toUpperCase()}: {selectedVisitor.id_number}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {selectedVisitor.company || "-"} &bull;{" "}
                        {t("blacklist.visits_count", {
                          count: selectedVisitor.visits_count || 0,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {onViewVisitorProfile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewVisitorProfile(selectedVisitor.id)}
                        className="h-7 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t("blacklist.view_visitor_data")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearSelectedVisitor}
                      className="h-7 text-xs"
                    >
                      <X className="mr-1 h-3 w-3" />
                      {t("blacklist.change_visitor")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : isNewVisitor ? (
              /* Unregistered Visitor Mode Banner */
              <div className="rounded-md border border-amber-500/30 bg-amber-50/70 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-medium">
                  {language === "en"
                    ? "Unregistered Visitor Mode: A new visitor record will be atomically created in Master Visitors and linked upon save."
                    : "Mode Pengunjung Belum Terdaftar: Data baru akan otomatis didaftarkan ke master Visitors dan langsung ditandai blacklist saat disimpan."}
                </p>
              </div>
            ) : (
              /* Combobox Search Input */
              <div className="relative" ref={comboboxRef}>
                <div className="relative">
                  <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    placeholder={t("blacklist.visitor_search_placeholder")}
                    value={visitorSearch}
                    onChange={(e) => setVisitorSearch(e.target.value)}
                    onFocus={() => {
                      if (visitorCandidates.length > 0) setSearchDropdownOpen(true)
                    }}
                    className="pl-8 text-sm"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute top-2.5 right-2.5 h-4 w-4 animate-spin text-zinc-400" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("blacklist.visitor_search_hint")}
                </p>

                {/* Dropdown Results */}
                {searchDropdownOpen && visitorCandidates.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                    {visitorCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => handleSelectVisitor(candidate)}
                        className={`flex items-center justify-between rounded-md p-2.5 text-sm transition-colors ${
                          candidate.is_blacklisted
                            ? "cursor-not-allowed bg-red-50/50 opacity-70 dark:bg-red-950/20"
                            : "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {candidate.name}
                            </span>
                            {candidate.is_blacklisted && (
                              <Badge variant="destructive" className="text-[10px] py-0">
                                {t("blacklist.already_blacklisted")}
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">
                            {candidate.id_type?.toUpperCase()}: {candidate.id_number}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {candidate.company || "-"} &bull;{" "}
                            {t("blacklist.visits_count", {
                              count: candidate.visits_count || 0,
                            })}
                          </p>
                        </div>
                        {!candidate.is_blacklisted && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectVisitor(candidate)
                            }}
                          >
                            {t("common.select")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Preselected Visitor Banner (When opened directly from Visitors table) */}
        {isPreselected && preselectedVisitor && (
          <div className="mb-2 rounded-md border border-emerald-500/30 bg-emerald-50/80 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-100">
                      {preselectedVisitor.name}
                    </p>
                    <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-400">
                      {t("blacklist.sourced_from_master")}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-emerald-800 dark:text-emerald-300">
                    {preselectedVisitor.id_type?.toUpperCase() || "ID"}: {preselectedVisitor.id_number}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {preselectedVisitor.company || "-"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0 font-medium">
                <UserCheck className="h-3 w-3 mr-1 text-emerald-600" />
                Data Terkunci
              </Badge>
            </div>
          </div>
        )}

        {/* FORM FIELDS IN EXACT SEQUENCE MATCHING TABLE COLUMNS:
            1. NAME OF OFFENDER (wajib)
            2. BADGE / H.I.D CODE
            3. KTP NO (wajib)
            4. OFFENCES (wajib, textarea)
            5. DATE (wajib, date picker)
            6. REMARK (opsional, textarea)
            7. COMPANY NAME (opsional)
        */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* 1. NAME OF OFFENDER */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">
              {t("blacklist.field_name")}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("blacklist.field_name_placeholder")}
              readOnly={isVisitorLocked}
              className={isVisitorLocked ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" : ""}
              required
            />
            {isVisitorLocked && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                &bull; {t("blacklist.sourced_from_master")}
              </p>
            )}
            {formErrors.name && (
              <p className="text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          {/* 2. BADGE / H.I.D CODE & 3. KTP NO */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 2. BADGE / H.I.D CODE */}
            <div className="space-y-1.5">
              <Label htmlFor="badge_code" className="text-xs font-semibold uppercase tracking-wider">
                {t("blacklist.field_badge")}
              </Label>
              <Input
                id="badge_code"
                value={formData.badge_code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    badge_code: e.target.value,
                  }))
                }
                placeholder={t("blacklist.field_badge_placeholder")}
              />
            </div>

            {/* 3. KTP NO */}
            <div className="space-y-1.5">
              <Label htmlFor="id_number" className="text-xs font-semibold uppercase tracking-wider">
                {t("blacklist.field_ktp")}
              </Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    id_number: e.target.value,
                  }))
                }
                placeholder={t("blacklist.field_ktp_placeholder")}
                readOnly={isVisitorLocked}
                className={isVisitorLocked ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed font-mono" : "font-mono"}
                maxLength={50}
                required
              />
              {formErrors.id_number && (
                <p className="text-xs text-red-500">{formErrors.id_number}</p>
              )}
            </div>
          </div>

          {/* 4. OFFENCES */}
          <div className="space-y-1.5">
            <Label htmlFor="offences" className="text-xs font-semibold uppercase tracking-wider">
              {t("blacklist.field_offences")}
            </Label>
            <Textarea
              id="offences"
              value={formData.offences}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, offences: e.target.value }))
              }
              placeholder={t("blacklist.field_offences_placeholder")}
              rows={3}
              required
            />
            {formErrors.offences && (
              <p className="text-xs text-red-500">{formErrors.offences}</p>
            )}
          </div>

          {/* 5. DATE & 7. COMPANY NAME */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 5. DATE */}
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider">
                {t("blacklist.field_date")}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
              {formErrors.date && (
                <p className="text-xs text-red-500">{formErrors.date}</p>
              )}
            </div>

            {/* 7. COMPANY NAME */}
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-wider">
                {t("blacklist.field_company")}
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
                placeholder={t("blacklist.field_company_placeholder")}
                readOnly={isVisitorLocked && Boolean(formData.company)}
                className={isVisitorLocked && Boolean(formData.company) ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" : ""}
              />
            </div>
          </div>

          {/* 6. REMARK */}
          <div className="space-y-1.5">
            <Label htmlFor="remark" className="text-xs font-semibold uppercase tracking-wider">
              {t("blacklist.field_remark")}
            </Label>
            <Textarea
              id="remark"
              value={formData.remark}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remark: e.target.value }))
              }
              placeholder={t("blacklist.field_remark_placeholder")}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t("blacklist.submit_edit") : t("blacklist.submit_create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
