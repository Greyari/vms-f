import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"

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
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  Printer,
  Pencil,
  Calendar,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Ship,
} from "lucide-react"
import EditVisitModal from "@/components/visits/EditVisitModal"

interface CardRef {
  id?: number | string
  card_no?: string
}

interface VisitorRef {
  id?: number | string
  name: string
  company?: string | null
  visitor_type?: string | null
  occupation?: string | null
  vessel_id?: string | null
}

interface LocationRef {
  id?: number | string
  name: string
  code?: string | null
  type?: string | null
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
}

interface StaffRef {
  id?: number | string
  name: string
}

export interface ReprintVisitRecord {
  id: number | string
  ticket_number?: string | null
  legacy_registration_no?: string | null
  visitor_cards?: CardRef[]
  visitor?: VisitorRef | null
  visitor_name?: string | null
  visitor_company?: string | null
  location_id?: number | string | null
  location?: LocationRef | null
  location_name?: string | null
  staff?: StaffRef | null
  host_name?: string | null
  purpose?: string | null
  time_in?: string | null
  check_in_at?: string | null
  checked_out_at?: string | null
  [key: string]: unknown
}

const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function Reprint() {
  const navigate = useNavigate()

  // Filters
  const [date, setDate] = useState<string>(getTodayString())
  const [search, setSearch] = useState<string>("")
  const [visits, setVisits] = useState<ReprintVisitRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Edit Modal
  const [editingVisit, setEditingVisit] = useState<ReprintVisitRecord | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 100

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { date }
      if (search.trim()) {
        params.name = search.trim()
      }
      const res = await api.get("/visits/reprint", { params })
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setVisits(data)
      setCurrentPage(1)
    } catch (error) {
      console.error("Error fetching reprint visits", error)
      toast.error("Gagal memuat daftar tiket kunjungan")
    } finally {
      setLoading(false)
    }
  }, [date, search])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  const filteredVisits = useMemo(() => {
    if (!search.trim()) return visits
    const q = search.toLowerCase()
    return visits.filter((v) => {
      const ticket = (v.ticket_number || v.legacy_registration_no || "").toLowerCase()
      const name = (v.visitor?.name || v.visitor_name || "").toLowerCase()
      const company = (v.visitor_company || v.visitor?.company || "").toLowerCase()
      const location = (v.location_name || v.location?.name || "").toLowerCase()
      const locCode = (v.location?.code || "").toLowerCase()
      const locCaptain = (v.location?.captain || "").toLowerCase()
      const locPic = (v.location?.pic || "").toLowerCase()
      const locType = (v.location?.vessel_type || v.location?.type || "").toLowerCase()
      const occupation = (v.visitor?.occupation || "").toLowerCase()
      const visitorType = (v.visitor?.visitor_type || "").toLowerCase()
      const host = (v.host_name || v.staff?.name || "").toLowerCase()
      return (
        ticket.includes(q) ||
        name.includes(q) ||
        company.includes(q) ||
        location.includes(q) ||
        locCode.includes(q) ||
        locCaptain.includes(q) ||
        locPic.includes(q) ||
        locType.includes(q) ||
        occupation.includes(q) ||
        visitorType.includes(q) ||
        host.includes(q)
      )
    })
  }, [visits, search])

  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredVisits.slice(start, start + itemsPerPage)
  }, [filteredVisits, currentPage])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cetak Ulang Pass Kunjungan</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pencarian dan pencetakan ulang tiket visitor pass berdasarkan tanggal operasional.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Controls: Date & Search */}
        <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="reprint-date-filter"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 cursor-pointer"
              >
                <Calendar className="h-4 w-4 text-zinc-500" />
                Tanggal Kunjungan
              </label>
              <Input
                id="reprint-date-filter"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchVisits}
              disabled={loading}
              title="Muat Ulang"
              className="cursor-pointer"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Cari tiket, nama tamu, atau PT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nomor Tiket</TableHead>
                <TableHead>Nama Pengunjung</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Lokasi / Kapal</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Waktu Masuk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs text-zinc-500">Memuat data tiket kunjungan...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-zinc-500">
                    Tidak ada tiket kunjungan ditemukan untuk tanggal ini.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((visit, index) => {
                  const isOpen = !visit.checked_out_at
                  const ticketNo =
                    visit.ticket_number || visit.legacy_registration_no || `#${visit.id}`
                  const visitorName =
                    visit.visitor?.name || visit.visitor_name || "-"
                  const company =
                    visit.visitor_company || visit.visitor?.company || "-"
                  const location =
                    visit.location_name || visit.location?.name || "-"
                  const host = visit.host_name || visit.staff?.name || "-"
                  const timeIn =
                    visit.time_in ||
                    (visit.check_in_at ? visit.check_in_at.slice(11, 16) : "-")

                  return (
                    <TableRow
                      key={visit.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <TableCell className="text-center font-mono text-xs text-zinc-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {ticketNo}
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-900 dark:text-white">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{visitorName}</span>
                          {visit.visitor?.visitor_type === "crew" && (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Anchor className="h-2.5 w-2.5" />
                              Crew Kapal
                              {visit.visitor?.occupation
                                ? ` • ${visit.visitor.occupation}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-300">
                        {company}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{location}</span>
                            {visit.location?.type &&
                              visit.location.type !== "location" && (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <Ship className="h-2.5 w-2.5" />
                                  {visit.location.vessel_type ||
                                    visit.location.type}
                                </span>
                              )}
                          </div>
                          {visit.location?.type &&
                            visit.location.type !== "location" &&
                            (visit.location.code ||
                              visit.location.captain ||
                              visit.location.pic) && (
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                                {visit.location.code && (
                                  <span className="font-mono">
                                    IMO: {visit.location.code}
                                  </span>
                                )}
                                {visit.location.captain && (
                                  <span>Capt: {visit.location.captain}</span>
                                )}
                                {visit.location.pic && (
                                  <span>PIC: {visit.location.pic}</span>
                                )}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-300">
                        {host}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {timeIn}
                      </TableCell>
                      <TableCell>
                        {isOpen ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-zinc-600 dark:text-zinc-400">
                            Checked Out
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-1.5 text-right whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate(`/visits/${visit.id}/print`, {
                              state: { visit },
                            })
                          }
                          title="Print Pass"
                          aria-label="Print Pass"
                          className="cursor-pointer"
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        {isOpen && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingVisit(visit)}
                            title="Edit Kunjungan"
                            aria-label="Edit Kunjungan"
                            className="cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Menampilkan{" "}
            {filteredVisits.length > 0
              ? (currentPage - 1) * itemsPerPage + 1
              : 0}{" "}
            hingga {Math.min(currentPage * itemsPerPage, filteredVisits.length)} dari{" "}
            {filteredVisits.length} kunjungan
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Visit Modal Integration */}
      <EditVisitModal
        visit={editingVisit}
        isOpen={Boolean(editingVisit)}
        onClose={() => setEditingVisit(null)}
        onSuccess={() => {
          setEditingVisit(null)
          fetchVisits()
        }}
      />
    </div>
  )
}
