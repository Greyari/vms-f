import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useTranslation } from "@/context/I18nContext"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GlobalBlacklistPanel from "./GlobalBlacklistPanel"
import MasterImportDialog from "@/components/master/MasterImportDialog"
import MasterExportModal from "@/components/master/MasterExportModal"
import VisitorDetailModal from "@/components/master/VisitorDetailModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"
import { REASON_CATEGORIES, type ReasonCategory } from "@/types/hybrid"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileDown,
  Upload,
  ArrowLeft,
  Plus,
  Globe,
  Pencil,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ExternalLink,
  X,
  UserPlus,
  Users,
} from "lucide-react"

interface BlacklistedVisitor {
  id: number | string
  blacklist_id?: string
  visitor_id?: string | number | null
  visitor_no?: string
  id_type?: string
  id_number: string
  name: string
  badge_code?: string
  offences?: string
  blacklist_reason?: string
  date?: string
  blacklisted_at?: string
  remark?: string
  company?: string
  is_blacklisted: boolean
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

interface VisitorSearchResult {
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

const ITEMS_PER_PAGE = 10

export default function BlacklistedVisitors() {
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const [visitors, setVisitors] = useState<BlacklistedVisitor[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Unblacklist Confirm State
  const [unblacklistAlertOpen, setUnblacklistAlertOpen] = useState(false)
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<
    number | string | null
  >(null)

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<BlacklistedVisitor | null>(null)
  const [visitorDetailOpen, setVisitorDetailOpen] = useState(false)
  const [detailVisitorId, setDetailVisitorId] = useState<string | number | null>(null)

  // Form Modal State (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | number | null>(null)
  const [formData, setFormData] = useState<BlacklistFormState>(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Visitor Selection & Autocomplete State for Create
  const [visitorSearch, setVisitorSearch] = useState("")
  const [visitorCandidates, setVisitorCandidates] = useState<VisitorSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorSearchResult | null>(null)
  const [isNewVisitor, setIsNewVisitor] = useState(false)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Import / Export State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // "Naikkan ke global" (hybrid decisions PE-5, FE-4b): a fixed category travels, the note stays here.
  const [promoteTarget, setPromoteTarget] = useState<BlacklistedVisitor | null>(
    null
  )
  const [promoteCategory, setPromoteCategory] = useState<ReasonCategory | "">(
    ""
  )
  const [promoteNote, setPromoteNote] = useState("")
  const [promoting, setPromoting] = useState(false)

  const openPromote = (visitor: BlacklistedVisitor) => {
    setPromoteTarget(visitor)
    setPromoteCategory("")
    setPromoteNote(visitor.offences || visitor.blacklist_reason || "")
  }

  const submitPromote = async () => {
    if (!promoteTarget || !promoteCategory || !promoteNote.trim()) return
    setPromoting(true)
    try {
      await api.post("/global-blacklists", {
        visitor_id: promoteTarget.id,
        reason_category: promoteCategory,
        local_note: promoteNote.trim(),
      })
      toast.success(
        "Masuk antrean; dikirim ke Cloud Hub pada siklus sync berikutnya."
      )
      setPromoteTarget(null)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      toast.error(
        errors?.visitor_id?.[0] ||
          err.response?.data?.message ||
          "Gagal menaikkan ke blacklist global."
      )
    } finally {
      setPromoting(false)
    }
  }

  const fetchBlacklisted = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      }
      if (search) params.search = search

      const res = await api.get("/visitors/blacklisted", { params })
      const data = res.data
      if (data && Array.isArray(data.data)) {
        setVisitors(data.data)
        setCurrentPage(data.current_page || 1)
        setTotalPages(data.last_page || 1)
        setTotalItems(data.total || 0)
      } else if (Array.isArray(data)) {
        setVisitors(data)
        setTotalPages(1)
        setTotalItems(data.length)
      } else {
        setVisitors([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search])

  useEffect(() => {
    fetchBlacklisted()
  }, [fetchBlacklisted])

  // Debounced search for master visitors combobox
  useEffect(() => {
    if (isEditing || selectedVisitor || isNewVisitor) return
    if (!visitorSearch.trim()) {
      setVisitorCandidates([])
      setSearchDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await api.get(`/visitors/search?q=${encodeURIComponent(visitorSearch.trim())}`)
        const list = res.data?.data || res.data || []
        setVisitorCandidates(Array.isArray(list) ? list : [])
        setSearchDropdownOpen(true)
      } catch (err) {
        console.error(err)
        setVisitorCandidates([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [visitorSearch, isEditing, selectedVisitor, isNewVisitor])

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const openCreateModal = () => {
    setFormData({
      ...initialFormState,
      date: new Date().toISOString().slice(0, 10),
    })
    setFormErrors({})
    setSelectedVisitor(null)
    setIsNewVisitor(false)
    setVisitorSearch("")
    setVisitorCandidates([])
    setIsEditing(false)
    setEditId(null)
    setFormModalOpen(true)
  }

  const openEditModal = (visitor: BlacklistedVisitor) => {
    const rawDate = visitor.blacklisted_at || visitor.date || ""
    const formattedDate = rawDate ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10)

    setFormData({
      visitor_id: visitor.visitor_id || (typeof visitor.id === "string" && !visitor.id.startsWith("019") ? visitor.id : null),
      name: visitor.name || "",
      badge_code: visitor.badge_code || "",
      id_number:
        visitor.id_number && !visitor.id_number.startsWith("NOKTP")
          ? visitor.id_number
          : "",
      offences: visitor.offences || visitor.blacklist_reason || "",
      date: formattedDate,
      remark: visitor.remark || "",
      company: visitor.company || "",
    })
    setFormErrors({})
    setSelectedVisitor(null)
    setIsNewVisitor(false)
    setIsEditing(true)
    setEditId(visitor.id)
    setFormModalOpen(true)
  }

  const openDetailModal = (record: BlacklistedVisitor) => {
    setDetailRecord(record)
    setDetailModalOpen(true)
  }

  const openVisitorProfileModal = (vId: string | number) => {
    setDetailVisitorId(vId)
    setVisitorDetailOpen(true)
  }

  const handleSelectVisitor = (candidate: VisitorSearchResult) => {
    if (candidate.is_blacklisted) return

    setSelectedVisitor(candidate)
    setSearchDropdownOpen(false)
    setVisitorSearch("")
    setFormData((prev) => ({
      ...prev,
      visitor_id: candidate.id,
      name: candidate.name,
      id_number: candidate.id_number && !candidate.id_number.startsWith("NOKTP") ? candidate.id_number : "",
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
      if (isEditing && editId) {
        await api.put(`/visitors/blacklisted/${editId}`, formData)
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
      setFormModalOpen(false)
      fetchBlacklisted()
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

  const confirmUnblacklist = (id: number | string) => {
    setSelectedUnblacklistId(id)
    setUnblacklistAlertOpen(true)
  }

  const executeUnblacklist = async () => {
    if (!selectedUnblacklistId) return
    try {
      await api.post(`/visitors/${selectedUnblacklistId}/unblacklist`)
      toast.success(
        language === "en"
          ? "Visitor removed from blacklist successfully."
          : "Pengunjung berhasil dikeluarkan dari daftar blacklist."
      )
      fetchBlacklisted()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error.response?.data?.message ||
          (language === "en"
            ? "Failed to revoke blacklist status."
            : "Gagal mencabut status blacklist.")
      )
    } finally {
      setUnblacklistAlertOpen(false)
      setSelectedUnblacklistId(null)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/master/visitors")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("blacklist.back_to_visitors")}
          </Button>
          <h1 className="text-2xl font-bold">{t("blacklist.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("blacklist.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> {t("blacklist.import_btn")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {t("blacklist.export_btn")}
          </Button>
          <Button
            variant="destructive"
            onClick={openCreateModal}
            aria-label="Tambah Blacklist"
          >
            <Plus className="mr-2 h-4 w-4" /> {t("blacklist.add_blacklist")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="local" className="gap-4">
        <TabsList>
          <TabsTrigger value="local">{t("blacklist.tab_local")}</TabsTrigger>
          <TabsTrigger value="global">{t("blacklist.tab_global")}</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <GlobalBlacklistPanel />
        </TabsContent>

        <TabsContent value="local">
          {/* Filter Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder={t("blacklist.search_placeholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Table with EXACT Columns in Required Order */}
            <div className="overflow-hidden rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
                    <TableRow>
                      <TableHead className="w-12 text-center">{t("blacklist.col_no")}</TableHead>
                      <TableHead>{t("blacklist.col_name_of_offender")}</TableHead>
                      <TableHead>{t("blacklist.col_badge_code")}</TableHead>
                      <TableHead>{t("blacklist.col_ktp_no")}</TableHead>
                      <TableHead>{t("blacklist.col_offences")}</TableHead>
                      <TableHead>{t("blacklist.col_date")}</TableHead>
                      <TableHead>{t("blacklist.col_remark")}</TableHead>
                      <TableHead>{t("blacklist.col_company_name")}</TableHead>
                      <TableHead className="text-center">{t("blacklist.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && visitors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : visitors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-zinc-500"
                        >
                          {t("blacklist.empty_text")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      visitors.map((visitor, idx) => {
                        const rowNumber =
                          (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                        const displayDate = visitor.blacklisted_at
                          ? visitor.blacklisted_at.slice(0, 10)
                          : visitor.date
                            ? visitor.date.slice(0, 10)
                            : "-"

                        return (
                          <TableRow
                            key={visitor.id}
                            className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                          >
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {rowNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {visitor.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {visitor.badge_code || "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-medium">
                              {visitor.id_number &&
                              !visitor.id_number.startsWith("NOKTP") ? (
                                visitor.id_number
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <span
                                className="line-clamp-2 text-sm font-medium text-red-600 dark:text-red-400"
                                title={
                                  visitor.offences || visitor.blacklist_reason
                                }
                              >
                                {visitor.offences ||
                                  visitor.blacklist_reason ||
                                  "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {displayDate}
                            </TableCell>
                            <TableCell
                              className="max-w-[200px] truncate text-xs text-muted-foreground"
                              title={visitor.remark}
                            >
                              {visitor.remark || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {visitor.company || "-"}
                            </TableCell>
                            <TableCell className="space-x-1.5 text-center whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDetailModal(visitor)}
                                title={t("blacklist.btn_detail")}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                {t("blacklist.btn_detail")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(visitor)}
                                title={t("blacklist.btn_edit")}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                {t("blacklist.btn_edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPromote(visitor)}
                                aria-label="Naikkan ke global"
                                title="Naikkan ke global"
                              >
                                <Globe className="mr-1 h-3.5 w-3.5" />
                                {t("blacklist.btn_global")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmUnblacklist(visitor.id)}
                                aria-label="Cabut Blacklist"
                                title="Cabut Blacklist"
                                className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                {t("blacklist.btn_unblacklist")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                {t("blacklist.pagination_showing", {
                  from: visitors.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0,
                  to: Math.min(currentPage * ITEMS_PER_PAGE, totalItems),
                  total: totalItems,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={
                    currentPage >= totalPages || totalPages === 0 || loading
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Naikkan ke Blacklist Global */}
      <Dialog
        open={promoteTarget !== null}
        onOpenChange={(open) => !open && setPromoteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("blacklist.promote_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("blacklist.promote_dialog_desc", {
                name: promoteTarget?.name || "",
                id: promoteTarget?.id_number || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promote-category">{t("blacklist.promote_category_label")}</Label>
              <select
                id="promote-category"
                value={promoteCategory}
                onChange={(e) =>
                  setPromoteCategory(e.target.value as ReasonCategory)
                }
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">{t("blacklist.promote_category_placeholder")}</option>
                {REASON_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-note">
                {t("blacklist.promote_note_label")}
              </Label>
              <Textarea
                id="promote-note"
                rows={3}
                value={promoteNote}
                onChange={(e) => setPromoteNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromoteTarget(null)}
              disabled={promoting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={submitPromote}
              disabled={promoting || !promoteCategory || !promoteNote.trim()}
            >
              {promoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("blacklist.promote_submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Blacklist Record */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{t("blacklist.modal_detail_title")}</DialogTitle>
              {detailRecord?.is_blacklisted !== false ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t("blacklist.active_status")}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {t("blacklist.revoked_status")}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {t("blacklist.modal_detail_desc")}
            </DialogDescription>
          </DialogHeader>

          {detailRecord && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-zinc-50/50 p-4 dark:bg-zinc-900/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">{t("blacklist.col_name_of_offender")}</span>
                    <p className="font-semibold text-base">{detailRecord.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t("blacklist.col_badge_code")}</span>
                    <p className="font-mono">{detailRecord.badge_code || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">{t("blacklist.col_ktp_no")}</span>
                    <p className="font-mono">
                      {detailRecord.id_number && !detailRecord.id_number.startsWith("NOKTP")
                        ? detailRecord.id_number
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t("blacklist.col_company_name")}</span>
                    <p>{detailRecord.company || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">{t("blacklist.col_date")}</span>
                    <p className="font-mono">
                      {detailRecord.blacklisted_at?.slice(0, 10) || detailRecord.date?.slice(0, 10) || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40">
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                  {t("blacklist.col_offences")}
                </span>
                <p className="text-sm font-medium text-red-900 dark:text-red-200 whitespace-pre-wrap">
                  {detailRecord.offences || detailRecord.blacklist_reason || "-"}
                </p>
              </div>

              {detailRecord.remark && (
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-xs text-muted-foreground">{t("blacklist.col_remark")}</span>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {detailRecord.remark}
                  </p>
                </div>
              )}

              {/* Connected Visitor Link */}
              {detailRecord.visitor_id && (
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {t("blacklist.sourced_from_master")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setDetailModalOpen(false)
                      openVisitorProfileModal(detailRecord.visitor_id!)
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("blacklist.view_visitor_data")}
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailModalOpen(false)}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah / Edit Blacklist */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
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

          {/* STEP A: Autocomplete Visitor Combobox (Only in Create Mode) */}
          {!isEditing && (
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openVisitorProfileModal(selectedVisitor.id)}
                        className="h-7 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t("blacklist.view_visitor_data")}
                      </Button>
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
                readOnly={Boolean(selectedVisitor)}
                className={selectedVisitor ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" : ""}
                required
              />
              {selectedVisitor && (
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
                  readOnly={Boolean(selectedVisitor)}
                  className={selectedVisitor ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed font-mono" : "font-mono"}
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
                  readOnly={Boolean(selectedVisitor)}
                  className={selectedVisitor ? "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" : ""}
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
                onClick={() => setFormModalOpen(false)}
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

      {/* Alert Dialog Unblacklist */}
      <AlertDialog
        open={unblacklistAlertOpen}
        onOpenChange={setUnblacklistAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blacklist.unblacklist_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("blacklist.unblacklist_dialog_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUnblacklist}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t("blacklist.unblacklist_confirm_btn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Master Import Dialog with Preview & Duplicate Confirmation */}
      <MasterImportDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import Data Blacklist"
        description="Unggah file spreadsheet Excel (.xlsx / .xls / .csv) daftar blacklist dengan kolom: NO, NAME OF OFFENDER, Badge / H.I.D code, KTP NO, OFFENCES, DATE, REMARK, COMPANY NAME."
        templateEndpoint="/visitors/blacklisted/template"
        templateFileName="template_blacklist.xlsx"
        previewEndpoint="/visitors/blacklisted/import-preview"
        importEndpoint="/visitors/blacklisted/import"
        columns={[
          { key: "name_of_offender", label: "NAME OF OFFENDER" },
          { key: "badge_/_h.i.d_code", label: "Badge / H.I.D code" },
          { key: "ktp_no", label: "KTP NO" },
          { key: "offences", label: "OFFENCES" },
          { key: "date", label: "DATE" },
          { key: "remark", label: "REMARK" },
          { key: "company_name", label: "COMPANY NAME" },
        ]}
        onSuccess={fetchBlacklisted}
      />

      {/* Master Export Modal with Columns, Presets, Scope & Live Count */}
      <MasterExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityConfig={MASTER_ENTITIES.blacklist}
        currentFilters={{
          search,
        }}
      />

      {/* Visitor Profile Detail Modal */}
      <VisitorDetailModal
        open={visitorDetailOpen}
        onOpenChange={setVisitorDetailOpen}
        visitorId={detailVisitorId}
      />
    </div>
  )
}
