import { useState } from 'react';
import api from '@/lib/axios';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Report() {
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);

    // To keep track of the currently applied filter for export
    const [appliedFilter, setAppliedFilter] = useState({ start_date: '', end_date: '' });

    const formatDateForApi = (d: Date | undefined) => {
        if (!d) return '';
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const fetchHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const stDateStr = formatDateForApi(startDate);
        const edDateStr = formatDateForApi(endDate);

        try {
            const res = await api.get('/visits/history', {
                params: {
                    start_date: stDateStr,
                    end_date: edDateStr
                }
            });
            setRecords(res.data);
            setAppliedFilter({ start_date: stDateStr, end_date: edDateStr });
        } catch (error) {
            console.error(error);
            alert('Failed to fetch history data.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExportLoading(true);
        try {
            const res = await api.get('/visits/export', {
                params: {
                    start_date: appliedFilter.start_date,
                    end_date: appliedFilter.end_date
                },
                responseType: 'blob'
            });

            const blob = new Blob([res.data], {
                type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const disposition = res.headers['content-disposition'];
            let fileName = 'visits.xlsx';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed', error);
            alert('Failed to execute the Excel export.');
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportPdf = async () => {
        setPdfLoading(true);
        try {
            const res = await api.get('/visits/export-pdf', {
                params: {
                    start_date: appliedFilter.start_date,
                    end_date: appliedFilter.end_date
                },
                responseType: 'blob'
            });

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'visitor-report.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('PDF Export failed', error);
            alert('Failed to execute the PDF export.');
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold">Visitor Reports</h1>
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <form onSubmit={fetchHistory} className="space-y-6 mb-8 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2 flex flex-col">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? formatDateForApi(startDate) : <span>Pick a start date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label>End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? formatDateForApi(endDate) : <span>Pick an end date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Searching...' : 'Terapkan Filter'}
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold">Preview Data</h2>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleExportPdf}
                            disabled={pdfLoading || records.length === 0}
                            variant="outline"
                            className="text-red-600 hover:text-red-600 hover:bg-red-50"
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            {pdfLoading ? 'Exporting...' : 'Export PDF'}
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={exportLoading || records.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            {exportLoading ? 'Exporting...' : 'Export Excel'}
                        </Button>
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>KTP</TableHead>
                                <TableHead>Visitor Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Card No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time In</TableHead>
                                <TableHead>Time Out</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">No history data found. Apply filter to search.</TableCell>
                                </TableRow>
                            ) : (
                                records.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                        <TableCell className="font-medium">{record.visitor?.ktp_number}</TableCell>
                                        <TableCell className="font-semibold">{record.visitor?.name}</TableCell>
                                        <TableCell>{record.visitor?.company || '-'}</TableCell>
                                        <TableCell>{record.staff?.name}</TableCell>
                                        <TableCell>{record.visitor_card?.card_no}</TableCell>
                                        <TableCell>{record.date}</TableCell>
                                        <TableCell>{record.time_in}</TableCell>
                                        <TableCell>{record.time_out || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
