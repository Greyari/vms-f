import { useState, useEffect, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Loader2, FileDown, Upload, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function Cards() {
  const [cards, setCards] = useState<any[]>([]);
  const [trashedCards, setTrashedCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [trashedModalOpen, setTrashedModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [form, setForm] = useState({ id: null, card_no: '', status: 'available' });
  const [file, setFile] = useState<File | null>(null);

  // Alert Dialog States
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  
  // Error Dialog States
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorOpen(true);
  }

  // Advanced Table States
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrashedCards = async () => {
    try {
      const res = await api.get('/cards/trashed');
      setTrashedCards(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCards();
    fetchTrashedCards();
  }, []);

  const openForm = (card: any = null) => {
    if (card) {
      setForm({ id: card.id, card_no: card.card_no, status: card.status });
    } else {
      setForm({ id: null, card_no: '', status: 'available' });
    }
    setModalOpen(true);
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
    let result = [...cards];
    if (search) {
      result = result.filter(item => 
        item.card_no.toLowerCase().includes(search.toLowerCase()) || 
        item.status.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [cards, search, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.id) {
        await api.put(`/cards/${form.id}`, form);
      } else {
        await api.post('/cards', form);
      }
      setModalOpen(false);
      fetchCards();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to save card';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setSelectedCardId(id);
    setAlertOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedCardId) return;
    try {
      await api.delete(`/cards/${selectedCardId}`);
      fetchCards();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to delete card';
      showError(msg);
    } finally {
      setAlertOpen(false);
      setSelectedCardId(null);
    }
  };

  const executeRestore = async (id: number) => {
    try {
      await api.post(`/cards/${id}/restore`);
      fetchCards();
      fetchTrashedCards();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to restore card';
      showError(msg);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get('/cards/template/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'card_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      showError("Failed to download template.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/cards/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportModalOpen(false);
      setFile(null);
      fetchCards();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Import failed. Please make sure the format is correct.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Visitor Cards</h1>
          <p className="text-muted-foreground">Manage your visitor card master data and statuses.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => { fetchTrashedCards(); setTrashedModalOpen(true); }}>
            View Deleted
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button onClick={() => openForm()}>Add Card</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search card no or status..." 
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
                <TableHead onClick={() => handleSort('card_no')} className="cursor-pointer">
                  <div className="flex items-center">Card No <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                  <div className="flex items-center">Status <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-zinc-500">No cards found.</TableCell>
                </TableRow>
              ) : (
                paginatedData.map((card) => (
                  <TableRow key={card.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <TableCell className="font-medium">{card.card_no}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${card.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'}`}>
                        {card.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openForm(card)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(card.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Card' : 'Add Card'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Card Number</Label>
              <Input 
                value={form.card_no} 
                onChange={(e) => setForm({...form, card_no: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={form.status} 
                onValueChange={(val) => setForm({ ...form, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Card Data</DialogTitle>
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
                <Button type="submit" disabled={!file || loading}>{loading ? 'Importing...' : 'Upload & Import'}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the visitor card. Note that cards currently linked to active visits might throw an error if deleted due to constraints.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-red-600 focus:ring-red-600 hover:bg-red-700">Delete Permanently</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>An Error Occurred</AlertDialogTitle>
                <AlertDialogDescription>
                    {errorMessage}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setErrorOpen(false)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={trashedModalOpen} onOpenChange={setTrashedModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deleted Visitor Cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
                  <TableRow>
                    <TableHead>Card No</TableHead>
                    <TableHead>Status Before Deletion</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-zinc-500">No deleted cards found.</TableCell>
                    </TableRow>
                  ) : (
                    trashedCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium text-zinc-500 line-through">{card.card_no}</TableCell>
                        <TableCell className="text-zinc-500">{card.status}</TableCell>
                        <TableCell className="text-zinc-500">{new Date(card.deleted_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => executeRestore(card.id)}>Restore</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setTrashedModalOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
