import { useState, useEffect, useCallback } from "react"
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
import BlacklistModal, { type BlacklistRecordData } from "@/components/master/BlacklistModal"
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

const ITEMS_PER_PAGE = 10

export default function BlacklistedVisitors() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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

  // Form Modal State (Create / Edit via reusable BlacklistModal)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<BlacklistRecordData | null>(null)

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
      toast.success(t("blacklist.toast_promote_success"))
      setPromoteTarget(null)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      toast.error(
        errors?.visitor_id?.[0] ||
          err.response?.data?.message ||
          t("blacklist.toast_promote_failed")
      )
    } finally {
      setPromoting(false)
    }
  }

  const fetchBlacklisted = useCallback(
    async (pageOverride?: number) => {
      setLoading(true)
      try {
        const targetPage = pageOverride ?? currentPage
        const params: Record<string, any> = {
          page: targetPage,
          per_page: ITEMS_PER_PAGE,
        }
        if (search) params.search = search

        const res = await api.get("/visitors/blacklisted", { params })
        const data = res.data
        if (data && Array.isArray(data.data)) {
          setVisitors(data.data)
          setCurrentPage(data.current_page || targetPage)
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
    },
    [currentPage, search]
  )

  useEffect(() => {
    fetchBlacklisted()
  }, [fetchBlacklisted])

  const handleMutationSuccess = useCallback(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
    void fetchBlacklisted(1)
  }, [currentPage, fetchBlacklisted])

  const openCreateModal = () => {
    setSelectedRecordForEdit(null)
    setFormModalOpen(true)
  }

  const openEditModal = (visitor: BlacklistedVisitor) => {
    setSelectedRecordForEdit(visitor as unknown as BlacklistRecordData)
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

  const confirmUnblacklist = (id: number | string) => {
    setSelectedUnblacklistId(id)
    setUnblacklistAlertOpen(true)
  }

  const executeUnblacklist = async () => {
    if (!selectedUnblacklistId) return
    try {
      await api.post(`/visitors/${selectedUnblacklistId}/unblacklist`)
      toast.success(t("blacklist.toast_unblacklist_success"))
      void fetchBlacklisted()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error.response?.data?.message || t("blacklist.toast_unblacklist_failed")
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

      {/* Reusable Blacklist Form Modal */}
      <BlacklistModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false)
          setSelectedRecordForEdit(null)
        }}
        onSuccess={handleMutationSuccess}
        blacklistRecord={selectedRecordForEdit}
        onViewVisitorProfile={openVisitorProfileModal}
      />

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
        title={t("blacklist.import_dialog_title")}
        description={t("blacklist.import_dialog_desc")}
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
        onSuccess={handleMutationSuccess}
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
