import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PrintVisit() {
    const location = useLocation();
    const navigate = useNavigate();

    // Attempt to load visit data from React Router navigate state
    const visit = location.state?.visit;

    useEffect(() => {
        // Automatically open the print dialog after render
        if (visit) {
            setTimeout(() => {
                window.print();
            }, 500);
        } else {
            // If there's no state, user probably refreshed the print page manually
            alert('No ticket data found!');
            navigate('/visits');
        }
    }, [visit, navigate]);

    if (!visit) return <div className="p-10 font-sans text-black">No ticket data available.</div>;

    return (
        <div className="bg-white min-h-screen font-sans text-black overflow-hidden print:w-full">
            {/* CSS Injection for exact A5 landscape mode forcing */}
            <style dangerouslySetInnerHTML={{
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
            `}} />

            <div className="mx-auto w-full overflow-hidden p-6 box-border flex flex-col print:border-none border-b-4 border-dashed border-zinc-300">
                <div className="border-2 border-black p-1 flex-grow flex flex-col justify-between">
                    {/* Header Ticket */}
                    <div className="text-center mb-1 border-b-2 border-black">
                        <h1 className="text-xl font-bold tracking-widest mb-0">PT CEMARA INTAN SHIPYARD</h1>
                        <h2 className="text-sm font-bold tracking-widest inline-block mt-0">VISITOR ENTRY PASS</h2>
                        {visit.ticket_number && (
                            <p className="text-xs font-bold tracking-widest">NO: {visit.ticket_number}</p>
                        )}
                    </div>

                    <table className="w-full text-xs font-semibold border-collapse">
                        <tbody>
                            <tr>
                                {/* Column 1 */}
                                <td className="w-1/2 align-top pr-3 border-r border-gray-300">
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">VISITOR NAME</span>
                                        <span className="uppercase">: {visit.visitor?.name}</span>
                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">KTP / NIK</span>
                                        <span className="uppercase">: {visit.visitor?.ktp_number}</span>
                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">COMPANY</span>
                                        <span className="uppercase">: {visit.visitor?.company || '-'}</span>
                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">STAFF TO VISIT</span>
                                        <span className="uppercase">: {visit.staff?.name}</span>
                                    </div>
                                    <div className="flex pb-0">
                                        <span className="w-32 inline-block font-bold">ID CARDS</span>
                                        <span className="uppercase">
                                            : {visit.visitorCards?.map((c: any) => c.card_no).join(', ') || 'NO CARD'}
                                        </span>
                                    </div>
                                </td>

                                {/* Column 2 */}
                                <td className="w-1/2 align-top pl-3">
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">DATE</span>
                                        <span className="uppercase">: {new Date(visit.date).getDate() + visit.date}</span>

                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">TIME IN</span>
                                        <span className="uppercase">: {visit.time_in}</span>
                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">VEHICLE NO</span>
                                        <span className="uppercase">: {visit.vehicle_no || '-'}</span>
                                    </div>
                                    <div className="flex border-b border-gray-300 pb-0 mb-0">
                                        <span className="w-32 inline-block font-bold">VEHICLE CARD</span>
                                        <span className="uppercase">: {visit.vehicleCard?.card_no || '-'}</span>
                                    </div>
                                    <div className="flex pb-0">
                                        <span className="w-32 inline-block font-bold">TIME OUT</span>
                                        <span className="uppercase">: {visit.time_out || '-'}</span>
                                    </div>
                                </td>
                            </tr>

                            {/* Merged Purpose Row */}
                            <tr>
                                <td colSpan={2} className="border-t border-gray-300 pt-0">
                                    <div className="flex">
                                        <span className="w-32 inline-block font-bold">PURPOSE</span>
                                        <span className="uppercase">: {visit.purpose}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Rules & Regulations Section */}
                    <div className="grid grid-cols-2 gap-4 border-t-2 border-b-2 border-black py-2 mb-4">
                        <div className="text-[8px] pr-2 border-r border-black">
                            <p className="font-bold underline mb-1 uppercase text-[10px]">Rules and Regulations:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Visitor passes must be worn at all times within the yard premises</li>
                                <li>PT CEMARA INTAN SHIPYARD is not liable for any injuries, loss of life, or loss of personal property within the yard premises</li>
                                <li>If a visitor pass is lost, please report it immediately to the Security Department</li>
                                <li>The replacement fee for a lost or damaged pass is Rp. 50,000</li>
                            </ul>
                        </div>
                        <div className="text-[8px] pl-2">
                            <p className="font-bold underline mb-1 uppercase text-[10px]">Ketentuan-ketentuan:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Visitor Pass harus dipakai setiap saat diwilayah yard</li>
                                <li>PT CEMARA INTAN SHIPYARD tidak bertanggung jawab terhadap segala cedera, kehilangan nyawa, maupun kehilangan segala harta benda diwilayah yard</li>
                                <li>Apabila kehilangan Visitor Pass segera lapor ke Dept. Sekuriti</li>
                                <li>Biaya penggantian apabila hilang atau rusak adalah Rp. 50.000</li>
                            </ul>
                        </div>
                    </div>

                    {/* 3 Box Signature Grid aligned bottom */}
                    <div className="grid grid-cols-3 gap-8 text-center text-xs font-bold uppercase mt-auto">
                        <div>
                            <div className="h-16 flex items-end justify-center pb-1"></div>
                            <div className="border-t border-black pt-1 px-4">Security Duty</div>
                        </div>
                        <div>
                            <div className="h-16 flex items-end justify-center pb-1"></div>
                            <div className="border-t border-black pt-1 px-4">STAFF TO VISIT</div>
                        </div>
                        <div>
                            <div className="h-16 flex items-end justify-center pb-1"></div>
                            <div className="border-t border-black pt-1 px-4">Visitor Sign</div>
                        </div>
                    </div>

                    {/* Return button if viewing outside print context */}
                    <div className="mt-8 text-center print:hidden">
                        <button
                            onClick={() => navigate('/visits')}
                            className="bg-black hover:bg-zinc-800 transition-colors text-white px-6 py-2 rounded font-bold select-none text-sm cursor-pointer"
                        >
                            Return to Dashboard
                        </button>
                        <p className="text-xs text-gray-400 mt-2 font-normal lowercase">make sure your print dialog loaded automatically</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
