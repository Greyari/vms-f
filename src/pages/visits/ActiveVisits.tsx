import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Trash2, Printer } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ActiveVisits() {
    const navigate = useNavigate();
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);

    // Advanced Table States
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Alert Dialog States
    const [alertOpen, setAlertOpen] = useState(false);
    const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedDeleteVisitId, setSelectedDeleteVisitId] = useState<number | null>(null);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const res = await api.get('/visits/active');
            setVisits(res.data);
        } catch (error) {
            console.error('Error fetching visits', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, []);

    const confirmCheckOut = (id: number) => {
        setSelectedVisitId(id);
        setAlertOpen(true);
    }

    const executeCheckOut = async () => {
        if (!selectedVisitId) return;
        setCheckoutLoading(selectedVisitId);
        try {
            await api.post(`/visits/${selectedVisitId}/checkout`);
            fetchVisits(); // Refresh list
        } catch (error) {
            console.error('Checkout failed', error);
            alert('Checkout failed!');
        } finally {
            setCheckoutLoading(null);
            setSelectedVisitId(null);
            setAlertOpen(false);
        }
    };

    const confirmDelete = (id: number) => {
        setSelectedDeleteVisitId(id);
        setDeleteAlertOpen(true);
    }

    const executeDelete = async () => {
        if (!selectedDeleteVisitId) return;
        try {
            await api.delete(`/visits/${selectedDeleteVisitId}`);
            fetchVisits(); // Refresh without reload
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete visit');
        } finally {
            setDeleteAlertOpen(false);
            setSelectedDeleteVisitId(null);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...visits];
        if (search) {
            result = result.filter(item => 
                (item.visitor?.name || '').toLowerCase().includes(search.toLowerCase()) || 
                (item.visitor_card?.card_no || '').toLowerCase().includes(search.toLowerCase())
            );
        }
        if (sortConfig !== null) {
            result.sort((a, b) => {
                const aVal = getNestedValue(a, sortConfig.key) || '';
                const bVal = getNestedValue(b, sortConfig.key) || '';
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [visits, search, sortConfig]);

    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSorted.slice(start, start + itemsPerPage);
    }, [filteredAndSorted, currentPage]);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Active Visitors</h1>
                    <p className="text-muted-foreground">Manage your active visitors master data and statuses.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input 
                            placeholder="Search visitor name or card no..." 
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
                            <TableRow>
                                <TableHead onClick={() => handleSort('ticket_number')} className="cursor-pointer">
                                    <div className="flex items-center">Ticket No <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('visitor_card.card_no')} className="cursor-pointer">
                                    <div className="flex items-center">Card No <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('visitor.name')} className="cursor-pointer">
                                    <div className="flex items-center">Visitor Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('staff.name')} className="cursor-pointer">
                                    <div className="flex items-center">Host Staff <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                </TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead onClick={() => handleSort('time_in')} className="cursor-pointer">
                                    <div className="flex items-center">Time In <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                </TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-zinc-500">No active visitors found.</TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((visit) => (
                                    <TableRow key={visit.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <TableCell className="font-mono text-zinc-600 dark:text-zinc-400">
                                            {visit.ticket_number || '-'}
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-900 dark:text-white">
                                            {visit.visitor_cards?.map((c: any) => c.card_no).join(', ') || '-'}
                                        </TableCell>
                                        <TableCell className="font-semibold py-2">
                                            <span>{visit.visitor?.name}</span> <br/>
                                            <span className="text-xs text-zinc-400 font-normal">{visit.visitor?.company || '-'}</span>
                                        </TableCell>
                                        <TableCell>{visit.staff?.name}</TableCell>
                                        <TableCell>{visit.purpose}</TableCell>
                                        <TableCell>{visit.time_in}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => confirmCheckOut(visit.id)}
                                                disabled={checkoutLoading === visit.id}
                                            >
                                                {checkoutLoading === visit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Out'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => navigate('/visits/print', { state: { visit } })}
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => confirmDelete(visit.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-zinc-500">
                        Showing {filteredAndSorted.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0 || loading}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will mark the visitor as checked out and record their exit time. The Visitor Card will be freed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeCheckOut}>Confirm Check Out</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Kunjungan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Riwayat kunjungan ini akan dihapus secara permanen, dan kartu visitor akan dikembalikan ke status "available".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Hapus Permanen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
