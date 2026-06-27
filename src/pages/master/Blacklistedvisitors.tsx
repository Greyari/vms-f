import { useState, useEffect, useMemo } from 'react';
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Search, Loader2, ArrowUpDown, ChevronLeft, ChevronRight,
  ShieldCheck, FileDown, Upload, ArrowLeft
} from "lucide-react";

export default function BlacklistedVisitors() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [unblacklistAlertOpen, setUnblacklistAlertOpen] = useState(false);
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const showInfo = (message: string) => {
    setInfoMessage(message);
    setInfoOpen(true);
  };

  const fetchBlacklisted = async () => {
    setLoading(true);
    try {
      const res = await api.get('/visitors/blacklisted');
      setVisitors(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklisted();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    let result = [...visitors];
    if (search) {
      result = result.filter(item =>
        (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.ktp_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.company || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [visitors, search, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const confirmUnblacklist = (id: number) => {
    setSelectedUnblacklistId(id);
    setUnblacklistAlertOpen(true);
  };

  const executeUnblacklist = async () => {
    if (!selectedUnblacklistId) return;
    try {
      await api.post(`/visitors/${selectedUnblacklistId}/unblacklist`);
      fetchBlacklisted();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to remove visitor from blacklist';
      showInfo(msg);
    } finally {
      setUnblacklistAlertOpen(false);
      setSelectedUnblacklistId(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get('/visitors/blacklisted/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'blacklist_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      showInfo("Failed to download template.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/visitors/blacklisted/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportModalOpen(false);
      setFile(null);
      fetchBlacklisted();
      showInfo(res.data?.message || 'Import completed.');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Import failed. Please make sure the format is correct.';
      showInfo(msg);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/visitors/blacklisted/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'blacklisted_visitors.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      showInfo("Failed to export blacklist data.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/master/visitors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Visitors
          </Button>
          <h1 className="text-2xl font-bold">Blacklisted Visitors</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportLoading || visitors.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search visitor name, KTP, or company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8"
            />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
                <TableRow>
                  <TableHead onClick={() => handleSort('ktp_number')} className="cursor-pointer">
                    <div className="flex items-center">KTP Number <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center">Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('company')} className="cursor-pointer">
                    <div className="flex items-center">Company <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500">No blacklisted visitors found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((visitor) => (
                    <TableRow key={visitor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <TableCell className="font-medium">{visitor.ktp_number}</TableCell>
                      <TableCell>{visitor.name}</TableCell>
                      <TableCell>{visitor.company || '-'}</TableCell>
                      <TableCell>
                        {visitor.is_blacklisted ? (
                          <span className="inline-flex items-center w-fit rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
                            Blacklisted
                          </span>
                        ) : (
                          <span className="inline-flex items-center w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2" title={visitor.blacklist_reason}>
                          {visitor.blacklist_reason || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmUnblacklist(visitor.id)}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Unblacklist
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-zinc-500">
            Showing {filteredAndSorted.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Blacklist Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900">
              <div className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Download Template</p>
                <p className="text-zinc-500">Use this Excel template to format your data correctly.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Excel File</Label>
                <Input type="file" accept=".xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!file || importLoading}>{importLoading ? 'Importing...' : 'Upload & Import'}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unblacklist Confirm */}
      <AlertDialog open={unblacklistAlertOpen} onOpenChange={setUnblacklistAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from blacklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Visitor ini akan diizinkan berkunjung kembali. Alasan blacklist sebelumnya akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeUnblacklist}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={infoOpen} onOpenChange={setInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notice</AlertDialogTitle>
            <AlertDialogDescription>
              {infoMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInfoOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}