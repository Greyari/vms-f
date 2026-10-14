import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams, Link } from "react-router-dom"
import { toast } from "sonner"
import api from "@/lib/axios"
import { FALLBACK_COMPANY_NAME, useAppConfig } from "@/lib/appConfig"
import { useAuth } from "@/context/AuthContext"
import { Loader2, Printer, PlusCircle, ArrowLeft } from "lucide-react"

function Field({
  label,
  children,
  mono,
  bold,
  last,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
  bold?: boolean
  last?: boolean
}) {
  return (
    <div className={`flex pb-0.5 ${last ? "" : ""}`}>
      <span className="inline-block w-36 shrink-0 font-bold text-gray-700">
        {label}
      </span>
      <span
        className={`uppercase ${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""}`}
      >
        : {children}
      </span>
    </div>
  )
}

export default function PrintVisit() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Whose name goes on the pass comes from this yard's server (decision PE-7).
  const { config, ready: configReady } = useAppConfig()

  const [visit, setVisit] = useState<any>(location.state?.visit || null)
  const [loading, setLoading] = useState<boolean>(!location.state?.visit)

  // Print once both the pass and the yard's name are known, so paper never shows a placeholder.
  useEffect(() => {
    if (!visit || !configReady) return
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [visit, configReady])

  useEffect(() => {
    if (visit) return

    // Fallback: fetch pass data from API when directly navigated or refreshed
    if (id) {
      setLoading(true)
      api
        .get(`/visits/${id}/print`)
        .then((res) => {
          const visitData = res.data?.visit || res.data?.data || res.data
          setVisit(visitData)
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
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-zinc-50 font-sans dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Memuat data pass pengunjung...
        </p>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-10 text-center font-sans">
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
    user?.name || user?.username || visit.printed_by || visit.creator?.name || "Security Duty"
  const ticketNo =
    visit.ticket_number || visit.legacy_registration_no || `#${visit.id}`
  const cardsText =
    visit.visitor_cards
      ?.map((c: any) => c.card_no)
      .filter(Boolean)
      .join(", ") ||
    visit.card_no ||
    "-"
  const companyName = config.company_name.trim()

  return (
    <div className="min-h-screen bg-white font-sans text-black print:h-[15cm] print:min-h-0 print:w-[24cm] print:overflow-hidden print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Kertas continuous paper 20 cm x 15 cm (sobekan setengah), mode potret */
            @page {
              size: landscape;
              margin: 0;
            }
            @media print {
              html, body {
                width: 24cm;
                height: 15cm;
                margin: 0;
                padding: 0;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-container {
                width: 24cm !important;
                max-width: 24cm !important;
                height: 15cm !important;
                max-height: 15cm !important;
                margin: 0 !important;
                /* Safe area: atas/bawah 0.35cm, kiri/kanan 1.2cm (jalur tractor/lubang kertas) */
                padding: 0.35cm 0.50cm !important;
                box-sizing: border-box;
                overflow: hidden;
                page-break-inside: avoid;
                page-break-after: avoid;
              }
            }
          `,
        }}
      />

      {/* Area pass (satu-satunya yang tercetak) */}
      <div className="print-container mx-auto box-border flex w-[24cm] max-w-full h-[15cm] flex-col border border-dashed border-zinc-300 p-4 print:border-0">
        {/* Header */}
        <div className="mb-2 pb-1 text-center">
          <h1 className="text-xl leading-tight font-black tracking-widest uppercase">
            {(companyName || FALLBACK_COMPANY_NAME).toUpperCase()}
          </h1>
          {config.company_address && (
            <p className="text-[11px] leading-tight text-zinc-700">
              {config.company_address}
            </p>
          )}
          <h2 className="text-base leading-tight font-bold tracking-wider uppercase">
            VISITOR ENTRY PASS
          </h2>
          <p className="font-mono text-sm leading-tight font-bold tracking-widest">
            NO: {ticketNo}
          </p>
        </div>

        {/* Data */}
        <div className="grid grid-cols-2 gap-x-5 text-[13px]">
          <div className="space-y-0.5">
            <Field label="VISITOR NAME">
              {visit.visitor?.name || visit.visitor_name || "-"}
            </Field>
            <Field
              label={visit.visitor?.id_type?.toUpperCase() || "IDENTITAS"}
            >
              {visit.visitor?.id_number || "-"}
            </Field>
            <Field label="COMPANY">
              {visit.visitor_company || visit.visitor?.company || "-"}
            </Field>
            <Field label="DESTINATION">
              {visit.location_name || visit.location?.name || "-"}
            </Field>
            <Field label="HOST PERSON">
              {visit.host_name || visit.staff?.name || "-"}
            </Field>
            <Field label="ID CARDS">
              {cardsText}
            </Field>
          </div>

          <div className="space-y-0.5">
            <Field label="DATE">
              {visit.date ||
                (visit.check_in_at ? visit.check_in_at.slice(0, 10) : "-")}
            </Field>
            <Field label="TIME IN">
              {visit.time_in ||
                (visit.check_in_at ? visit.check_in_at.slice(11, 16) : "-")}
            </Field>
            <Field label="VEHICLE NO">
              {visit.vehicle_plate || visit.vehicle_no || "-"}
            </Field>
            <Field label="VEHICLE CARD">
              {visit.vehicle_card?.card_no ||
                visit.vehicleCard?.card_no ||
                "-"}
            </Field>
            <Field label="TIME OUT">
              {visit.time_out || "-"}
            </Field>
          </div>
        </div>

        {/* Purpose */}
        <div className="mt-0.5 pt-0.5 text-[13px] leading-snug">
          <Field label="PURPOSE" last>
            {visit.purpose || "-"}
          </Field>
        </div>

        {/* Rules */}
        <div className="my-1.5 grid grid-cols-2 gap-3 py-1 text-[13px] leading-tight">
          <div className="border-black pr-2">
            <p className="mb-0.5 uppercase">
              Rules & Regulations:
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-zinc-800">
              <li>Visitor pass must be visibly worn at all times in yard.</li>
              <li>
                {companyName || "The company"} is not liable for injury or
                property loss.
              </li>
              <li>
                Report lost pass immediately to Security. Replacement fee: Rp.
                50,000.
              </li>
            </ul>
          </div>
          <div className="pl-2">
            <p className="mb-0.5 uppercase">
              Ketentuan Yard:
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-zinc-800">
              <li>
                Pass harus selalu dikenakan selama berada di area galangan.
              </li>
              <li>
                Perusahaan tidak bertanggung jawab atas cedera atau kehilangan
                barang.
              </li>
              <li>
                Pass hilang segera lapor Pos Sekuriti. Biaya penggantian: Rp
                50.000.
              </li>
            </ul>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-auto grid grid-cols-3 gap-6 text-center text-xs uppercase">
          <div>
            <div className="h-8" />
            <div className="border-t border-black pt-0.5 font-bold">
              {printedBy}
            </div>
            <div className="text-[10px] text-zinc-600">Petugas / Security (Pencatat)</div>
          </div>
          <div>
            <div className="h-8" />
            <div className="border-t border-black pt-0.5 font-semibold">
              {visit.host_name || visit.staff?.name || "-"}
            </div>
            <div className="text-[10px] text-zinc-600">Host / Staff Dikunjungi</div>
          </div>
          <div>
            <div className="h-8" />
            <div className="border-t border-black pt-0.5">
              Visitor Signature
            </div>
            <div className="text-[10px] text-zinc-600">Tanda Tangan Tamu</div>
          </div>
        </div>
      </div>

      {/* Tombol layar (tidak ikut tercetak) */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        >
          <Printer className="h-4 w-4" />
          Print Pass Now
        </button>
        <button
          onClick={() => navigate("/visits/create")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          <PlusCircle className="h-4 w-4" />
          Add New Visit
        </button>
        <button
          onClick={() => navigate("/visits/activate")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Active Visits
        </button>
      </div>
    </div>
  )
}