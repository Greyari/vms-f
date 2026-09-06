import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

export default function PrintVisit() {
  const location = useLocation()
  const navigate = useNavigate()

  // Attempt to load visit data from React Router navigate state
  const visit = location.state?.visit

  useEffect(() => {
    // Automatically open the print dialog after render
    if (visit) {
      setTimeout(() => {
        window.print()
      }, 500)
    } else {
      // If there's no state, user probably refreshed the print page manually
      toast.error("No ticket data found!")
      navigate("/visits")
    }
  }, [visit, navigate])

  if (!visit)
    return (
      <div className="p-10 font-sans text-black">No ticket data available.</div>
    )

  return (
    <div className="min-h-screen overflow-hidden bg-white font-sans text-black print:w-full">
      {/* CSS Injection for exact A5 landscape mode forcing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @page { 
                    size: A4 portrait; 
                    margin: 0; 
                }
                @media print {
                    body {
                        width: 210mm;
                        height: 297mm;
                    }
                    .print-container {
                        width: 100%;
                        height: 50%; /* Membatasi hanya setengah halaman A4 */
                        overflow: hidden;
                        border-bottom: 1px dashed #ccc; /* Penanda batas potong jika diperlukan */
                    }
                }
            `,
        }}
      />

      <div className="mx-auto box-border flex w-full flex-col overflow-hidden border-b-4 border-dashed border-zinc-300 p-6 print:border-none">
        <div className="flex flex-grow flex-col justify-between border-2 border-black p-1">
          {/* Header Ticket */}
          <div className="mb-1 border-b-2 border-black text-center">
            <h1 className="mb-0 text-xl font-bold tracking-widest">
              PT CEMARA INTAN SHIPYARD
            </h1>
            <h2 className="mt-0 inline-block text-sm font-bold tracking-widest">
              VISITOR ENTRY PASS
            </h2>
            {visit.ticket_number && (
              <p className="text-xs font-bold tracking-widest">
                NO: {visit.ticket_number}
              </p>
            )}
          </div>

          <table className="w-full border-collapse text-xs font-semibold">
            <tbody>
              <tr>
                {/* Column 1 */}
                <td className="w-1/2 border-r border-gray-300 pr-3 align-top">
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">
                      VISITOR NAME
                    </span>
                    <span className="uppercase">: {visit.visitor?.name}</span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">
                      {visit.visitor?.id_type?.toUpperCase() || "KTP"}
                    </span>
                    <span className="uppercase">
                      : {visit.visitor?.id_number}
                    </span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">COMPANY</span>
                    <span className="uppercase">
                      : {visit.visitor?.company || "-"}
                    </span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">
                      STAFF TO VISIT
                    </span>
                    <span className="uppercase">: {visit.staff?.name}</span>
                  </div>
                  <div className="flex pb-0">
                    <span className="inline-block w-32 font-bold">
                      ID CARDS
                    </span>
                    <span className="uppercase">
                      :{" "}
                      {visit.visitorCards
                        ?.map((c: any) => c.card_no)
                        .join(", ") || "NO CARD"}
                    </span>
                  </div>
                </td>

                {/* Column 2 */}
                <td className="w-1/2 pl-3 align-top">
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">DATE</span>
                    <span className="uppercase">
                      : {new Date(visit.date).getDate() + visit.date}
                    </span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">TIME IN</span>
                    <span className="uppercase">: {visit.time_in}</span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">
                      VEHICLE NO
                    </span>
                    <span className="uppercase">
                      : {visit.vehicle_no || "-"}
                    </span>
                  </div>
                  <div className="mb-0 flex border-b border-gray-300 pb-0">
                    <span className="inline-block w-32 font-bold">
                      VEHICLE CARD
                    </span>
                    <span className="uppercase">
                      : {visit.vehicleCard?.card_no || "-"}
                    </span>
                  </div>
                  <div className="flex pb-0">
                    <span className="inline-block w-32 font-bold">
                      TIME OUT
                    </span>
                    <span className="uppercase">: {visit.time_out || "-"}</span>
                  </div>
                </td>
              </tr>

              {/* Merged Purpose Row */}
              <tr>
                <td colSpan={2} className="border-t border-gray-300 pt-0">
                  <div className="flex">
                    <span className="inline-block w-32 font-bold">PURPOSE</span>
                    <span className="uppercase">: {visit.purpose}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Rules & Regulations Section */}
          <div className="mb-4 grid grid-cols-2 gap-4 border-t-2 border-b-2 border-black py-2">
            <div className="border-r border-black pr-2 text-[8px]">
              <p className="mb-1 text-[10px] font-bold uppercase underline">
                Rules and Regulations:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Visitor passes must be worn at all times within the yard
                  premises
                </li>
                <li>
                  PT CEMARA INTAN SHIPYARD is not liable for any injuries, loss
                  of life, or loss of personal property within the yard premises
                </li>
                <li>
                  If a visitor pass is lost, please report it immediately to the
                  Security Department
                </li>
                <li>
                  The replacement fee for a lost or damaged pass is Rp. 50,000
                </li>
              </ul>
            </div>
            <div className="pl-2 text-[8px]">
              <p className="mb-1 text-[10px] font-bold uppercase underline">
                Ketentuan-ketentuan:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>Visitor Pass harus dipakai setiap saat diwilayah yard</li>
                <li>
                  PT CEMARA INTAN SHIPYARD tidak bertanggung jawab terhadap
                  segala cedera, kehilangan nyawa, maupun kehilangan segala
                  harta benda diwilayah yard
                </li>
                <li>
                  Apabila kehilangan Visitor Pass segera lapor ke Dept. Sekuriti
                </li>
                <li>
                  Biaya penggantian apabila hilang atau rusak adalah Rp. 50.000
                </li>
              </ul>
            </div>
          </div>

          {/* 3 Box Signature Grid aligned bottom */}
          <div className="mt-auto grid grid-cols-3 gap-8 text-center text-xs font-bold uppercase">
            <div>
              <div className="flex h-16 items-end justify-center pb-1"></div>
              <div className="border-t border-black px-4 pt-1">
                Security Duty
              </div>
            </div>
            <div>
              <div className="flex h-16 items-end justify-center pb-1"></div>
              <div className="border-t border-black px-4 pt-1">
                STAFF TO VISIT
              </div>
            </div>
            <div>
              <div className="flex h-16 items-end justify-center pb-1"></div>
              <div className="border-t border-black px-4 pt-1">
                Visitor Sign
              </div>
            </div>
          </div>

          {/* Return button if viewing outside print context */}
          <div className="mt-8 text-center print:hidden">
            <button
              onClick={() => navigate("/visits/create")}
              className="cursor-pointer rounded bg-black px-6 py-2 text-sm font-bold text-white transition-colors select-none hover:bg-zinc-800"
            >
              Add New Visit
            </button>
            <p className="mt-2 text-xs font-normal text-gray-400 lowercase">
              make sure your print dialog loaded automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
