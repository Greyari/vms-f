import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Upload, Download, FileDown } from 'lucide-react'; 
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
import { Textarea } from "@/components/ui/textarea";
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
import { Search, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, ShieldOff, ShieldCheck, Trash2, Ban } from "lucide-react";

export default function Visitors() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
    id: null as number | null, 
    id_type: 'ktp',
    id_number: '',
    name: '', 
    company: '', 
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Blacklist Modal States
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [blacklistTarget, setBlacklistTarget] = useState<any>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Unblacklist Confirm States
  const [unblacklistAlertOpen, setUnblacklistAlertOpen] = useState(false);
  const [selectedUnblacklistId, setSelectedUnblacklistId] = useState<number | null>(null);

  // Delete Confirm States
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  // Advanced Table States
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const showInfo = (message: string) => {
    setInfoMessage(message);
    setInfoOpen(true);
  };
  
  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/visitors');
      setVisitors(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const openEditForm = (visitor: any) => {
    setEditForm({
      id: visitor.id,
      id_type: visitor.id_type || 'ktp',
      id_number: visitor.id_number || '',
      name: visitor.name || '',
      company: visitor.company || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;
    setEditSubmitting(true);
    try {
      await api.put(`/visitors/${editForm.id}`, {
        id_type: editForm.id_type,
        id_number: editForm.id_number,
        name: editForm.name,
        company: editForm.company,
      });
      setEditModalOpen(false);
      fetchVisitors();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to update visitor';
      showInfo(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

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
        (item.id_number || '').toLowerCase().includes(search.toLowerCase()) ||
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

  const openBlacklistForm = (visitor: any) => {
    setBlacklistTarget(visitor);
    setBlacklistReason('');
    setBlacklistModalOpen(true);
  };

  const handleBlacklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/visitors/${blacklistTarget.id}/blacklist`, {
        reason: blacklistReason,
      });
      setBlacklistModalOpen(false);
      setBlacklistTarget(null);
      fetchVisitors();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to blacklist visitor';
      showInfo(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmUnblacklist = (id: number) => {
    setSelectedUnblacklistId(id);
    setUnblacklistAlertOpen(true);
  };

  const executeUnblacklist = async () => {
    if (!selectedUnblacklistId) return;
    try {
      await api.post(`/visitors/${selectedUnblacklistId}/unblacklist`);
      fetchVisitors();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to remove visitor from blacklist';
      showInfo(msg);
    } finally {
      setUnblacklistAlertOpen(false);
      setSelectedUnblacklistId(null);
    }
  };

  const confirmDelete = (id: number) => {
    setSelectedDeleteId(id);
    setDeleteAlertOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      await api.delete(`/visitors/${selectedDeleteId}`);
      fetchVisitors();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to delete visitor';
      showInfo(msg);
    } finally {
      setDeleteAlertOpen(false);
      setSelectedDeleteId(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/visitors/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visitors.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showInfo('Failed to export visitors');
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await api.get('/visitors/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visitor_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showInfo('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await api.post('/visitors/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportModalOpen(false);
      setImportFile(null);
      showInfo(res.data.message);
      fetchVisitors();
    } catch (error: any) {
      showInfo(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Visitor Management</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportModalOpen(true)} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button  onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => navigate('/master/visitors/blacklist')}>
            <Ban className="h-4 w-4 mr-2" />
            View Blacklist
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
                  <TableHead onClick={() => handleSort('id_type')} className="cursor-pointer">
                    <div className="flex items-center">Type <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('id_number')} className="cursor-pointer">
                    <div className="flex items-center">ID Number <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center">Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('company')} className="cursor-pointer">
                    <div className="flex items-center">Company <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('visits_count')} className="cursor-pointer">
                    <div className="flex items-center">Total Visits <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-zinc-500">No visitors found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((visitor) => (
                    <TableRow key={visitor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          visitor.id_type === 'ktp' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' :
                          visitor.id_type === 'sim' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                        }`}>
                          {visitor.id_type?.toUpperCase() || 'KTP'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {visitor.id_number}
                      </TableCell>
                      <TableCell>{visitor.name}</TableCell>
                      <TableCell>{visitor.company || '-'}</TableCell>
                      <TableCell>{visitor.visits_count}</TableCell>
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
                      <TableCell className="text-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(visitor)}
                        >
                          Edit
                        </Button>
                        {visitor.is_blacklisted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmUnblacklist(visitor.id)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Unblacklist
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBlacklistForm(visitor)}
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Blacklist
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmDelete(visitor.id)}
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

      {/* Edit Visitor Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Visitor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>ID Type</Label>
              <select
                value={editForm.id_type}
                onChange={(e) => setEditForm({ ...editForm, id_type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800"
              >
                <option value="ktp">KTP</option>
                <option value="sim">SIM</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input
                value={editForm.id_number}
                onChange={(e) => setEditForm({ ...editForm, id_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Visitor Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Visitor Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900">
              <div className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Download Template</p>
                <p className="text-zinc-500">Use this Excel template to format your data correctly.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} disabled={isDownloadingTemplate}>
                {isDownloadingTemplate
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <FileDown className="w-4 h-4 mr-2" />}
                {isDownloadingTemplate ? 'Downloading...' : 'Download'}
              </Button>
            </div>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Excel File</Label>
                <Input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!importFile || importing}>
                  {importing ? 'Importing...' : 'Upload & Import'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blacklist Form Modal */}
      <Dialog open={blacklistModalOpen} onOpenChange={setBlacklistModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist Visitor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBlacklistSubmit} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">Visitor</p>
              <p className="font-medium">{blacklistTarget?.name} — {blacklistTarget?.id_number}</p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Explain why this visitor is being blacklisted..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setBlacklistModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? 'Saving...' : 'Blacklist'}
              </Button>
            </div>
          </form>
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

      {/* Delete Confirm */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The visitor record will be permanently deleted. This is only possible if the visitor has no visit history linked to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={infoOpen} onOpenChange={setInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notice</AlertDialogTitle>
            <AlertDialogDescription>{infoMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInfoOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}