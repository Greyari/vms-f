import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams, Link } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"
import { Loader2, Printer, PlusCircle, ArrowLeft } from "lucide-react"

export default function PrintVisit() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [visit, setVisit] = useState<any>(location.state?.visit || null)
  const [loading, setLoading] = useState<boolean>(!location.state?.visit)

  useEffect(() => {
    if (visit) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }

    // Fallback: fetch pass data from API when directly navigated or refreshed
    if (id) {
      setLoading(true)
      api
        .get(`/visits/${id}/print`)
        .then((res) => {
          const visitData = res.data?.visit || res.data?.data || res.data
          setVisit(visitData)
          setTimeout(() => {
            window.print()
          }, 500)
        })
        .catch((err) => {
          console.error("Failed to fetch visit pass for print:", err)
          toast.error("Gagal memuat tiket pass kunjungan.")
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      toast.error("Nomor tiket tidak valid!")
      navigate("/visits/activate")
    }
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-950 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Memuat data pass pengunjung...
        </p>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-10 font-sans text-center">
        <p className="text-base font-semibold text-red-600">
          Data tiket pass tidak ditemukan.
        </p>
        <Link
          to="/visits/activate"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Kembali ke Kunjungan Aktif
        </Link>
      </div>
    )
  }

  const printedBy =
    visit.printed_by || user?.name || user?.username || "Security Duty"
  const ticketNo =
    visit.ticket_number || visit.legacy_registration_no || `#${visit.id}`
  const cardsText =
    visit.visitor_cards?.map((c: any) => c.card_no).filter(Boolean).join(", ") ||
    visit.card_no ||
    "-"

  return (
    <div className="min-h-screen bg-white font-sans text-black print:w-full print:p-0">
      {/* CSS Injection for exact half-A4 landscape/portrait printable receipt */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { 
              size: A4 portrait; 
              margin: 8mm; 
            }
            @media print {
              body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                background: white !important;
                color: black !important;
              }
              .print-container {
                width: 100%;
                max-height: 140mm; /* Exactly half page A4 */
                overflow: hidden;
                page-break-inside: avoid;
              }
            }
          `,
        }}
      />

      <div className="print-container mx-auto box-border flex w-full max-w-4xl flex-col p-4">
        <div className="flex flex-col border-2 border-black p-3">
          {/* Header Ticket */}
          <div className="mb-2 border-b-2 border-black pb-1 text-center">
            <h1 className="text-lg font-black tracking-widest uppercase">
              PT CEMARA INTAN SHIPYARD
            </h1>
            <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-800">
              VISITOR ENTRY PASS
            </h2>
            <p className="text-xs font-mono font-bold tracking-widest text-zinc-900">
              NO: {ticketNo}
            </p>
          </div>

          <table className="w-full border-collapse text-xs font-semibold">
            <tbody>
              <tr>
                {/* Column 1 */}
                <td className="w-1/2 border-r border-gray-400 pr-3 align-top space-y-1">
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      VISITOR NAME
                    </span>
                    <span className="uppercase font-bold">
                      : {visit.visitor?.name || visit.visitor_name || "-"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      {visit.visitor?.id_type?.toUpperCase() || "IDENTITAS"}
                    </span>
                    <span className="uppercase font-mono">
                      : {visit.visitor?.id_number || "-"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      COMPANY
                    </span>
                    <span className="uppercase">
                      : {visit.visitor_company || visit.visitor?.company || "-"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      DESTINATION
                    </span>
                    <span className="uppercase font-bold">
                      : {visit.location_name || visit.location?.name || "-"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      HOST PERSON
                    </span>
                    <span className="uppercase">
                      : {visit.host_name || visit.staff?.name || "-"}
                    </span>
                  </div>
                  <div className="flex pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      ID CARDS
                    </span>
                    <span className="uppercase font-mono font-bold">
                      : {cardsText}
                    </span>
                  </div>
                </td>

                {/* Column 2 */}
                <td className="w-1/2 pl-3 align-top space-y-1">
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      DATE
                    </span>
                    <span className="uppercase font-mono">
                      : {visit.date || (visit.check_in_at ? visit.check_in_at.slice(0, 10) : "-")}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      TIME IN
                    </span>
                    <span className="uppercase font-mono font-bold">
                      : {visit.time_in || (visit.check_in_at ? visit.check_in_at.slice(11, 16) : "-")}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      VEHICLE NO
                    </span>
                    <span className="uppercase font-mono">
                      : {visit.vehicle_plate || visit.vehicle_no || "-"}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      VEHICLE CARD
                    </span>
                    <span className="uppercase font-mono">
                      : {visit.vehicle_card?.card_no || visit.vehicleCard?.card_no || "-"}
                    </span>
                  </div>
                  <div className="flex pb-0.5">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      TIME OUT
                    </span>
                    <span className="uppercase font-mono">
                      : {visit.time_out || "-"}
                    </span>
                  </div>
                </td>
              </tr>

              {/* Merged Purpose Row */}
              <tr>
                <td colSpan={2} className="border-t border-gray-400 pt-1">
                  <div className="flex">
                    <span className="inline-block w-32 font-bold text-gray-700">
                      PURPOSE
                    </span>
                    <span className="uppercase font-semibold">
                      : {visit.purpose || "-"}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Rules & Regulations Section */}
          <div className="my-2 grid grid-cols-2 gap-3 border-t-2 border-b-2 border-black py-1.5 text-[8px]">
            <div className="border-r border-black pr-2">
              <p className="mb-0.5 font-bold uppercase underline">
                Rules & Regulations:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-zinc-800">
                <li>Visitor pass must be visibly worn at all times in yard.</li>
                <li>PT Cemara Intan Shipyard is not liable for injury or property loss.</li>
                <li>Report lost pass immediately to Security. Replacement fee: Rp. 50,000.</li>
              </ul>
            </div>
            <div className="pl-2">
              <p className="mb-0.5 font-bold uppercase underline">
                Ketentuan Yard:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-zinc-800">
                <li>Pass harus selalu dikenakan selama berada di area galangan.</li>
                <li>Perusahaan tidak bertanggung jawab atas cedera atau kehilangan barang.</li>
                <li>Pass hilang segera lapor Pos Sekuriti. Biaya penggantian: Rp 50.000.</li>
              </ul>
            </div>
          </div>

          {/* 3 Box Signature Grid */}
          <div className="mt-2 grid grid-cols-3 gap-4 text-center text-xs font-bold uppercase">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-black pt-1">
                Security Duty
              </div>
              <p className="mt-0.5 font-mono text-[9px] font-normal text-zinc-600">
                Printed By: {printedBy}
              </p>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-black pt-1">
                Host / Staff
              </div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-black pt-1">
                Visitor Signature
              </div>
            </div>
          </div>
        </div>

        {/* Screen Action Buttons (Print:hidden) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Pass Now
          </button>
          <button
            onClick={() => navigate("/visits/create")}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Add New Visit
          </button>
          <button
            onClick={() => navigate("/visits/activate")}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Active Visits
          </button>
        </div>
      </div>
    </div>
  )
}
