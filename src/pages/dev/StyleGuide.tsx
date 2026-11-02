import { useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, Trash2, Printer, Download } from "lucide-react"

export default function StyleGuide() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <PageHeader
        title="VMS Design System & Style Guide"
        description="Acuan konsistensi palet warna, tipografi, kontrol tombol, status badge, tabel, dan modal."
        actions={
          <Button onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Contoh Modal
          </Button>
        }
      />

      {/* 1. Palet Warna Terbatas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          1. Palet Warna Terbatas (Netral + Satu Aksen + Status)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="h-10 rounded bg-emerald-600 mb-2" />
            <div className="text-xs font-semibold">Aksen Utama</div>
            <div className="text-[11px] text-zinc-500">Emerald (#059669)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="h-10 rounded bg-zinc-900 dark:bg-zinc-100 mb-2" />
            <div className="text-xs font-semibold">Netral Foreground</div>
            <div className="text-[11px] text-zinc-500">Zinc 900 / 100</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="h-10 rounded bg-emerald-500 mb-2" />
            <div className="text-xs font-semibold">Status Berhasil/Aktif</div>
            <div className="text-[11px] text-zinc-500">Green (#10b981)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="h-10 rounded bg-amber-500 mb-2" />
            <div className="text-xs font-semibold">Status Peringatan</div>
            <div className="text-[11px] text-zinc-500">Amber (#f59e0b)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
            <div className="h-10 rounded bg-red-600 mb-2" />
            <div className="text-xs font-semibold">Status Bahaya/Blacklist</div>
            <div className="text-[11px] text-zinc-500">Red (#dc2626)</div>
          </div>
        </div>
      </section>

      {/* 2. Tombol Konsisten */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          2. Ragam Tombol (Button Variants)
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tombol Utama
          </Button>
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Sekunder (Outline)
          </Button>
          <Button variant="destructive" className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            Bahaya (Destructive)
          </Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Printer className="h-3.5 w-3.5" />
            Small Action
          </Button>
        </div>
      </section>

      {/* 3. Status Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          3. Status Badge (Hanya Untuk Makna Semantik)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="success" dot>Aktif / Selesai</StatusBadge>
          <StatusBadge variant="warning" dot>Pending / Menunggu</StatusBadge>
          <StatusBadge variant="danger" dot>Blacklist / Tertolak</StatusBadge>
          <StatusBadge variant="neutral" dot>Selesai / Nonaktif</StatusBadge>
        </div>
      </section>

      {/* 4. Input & Filter Controls */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          4. Kontrol Form & Filter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input placeholder="Cari data..." className="pl-8" />
          </div>
          <Input placeholder="Input teks standar" />
          <Input type="date" />
        </div>
      </section>

      {/* 5. Tabel Standar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          5. Gaya Tabel Terpadu
        </h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <Table>
            <TableHeader className="bg-zinc-50/80 dark:bg-zinc-800/40">
              <TableRow>
                <TableHead className="w-16">No</TableHead>
                <TableHead>Nama Pengunjung</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">001</TableCell>
                <TableCell className="font-medium">Budi Santoso</TableCell>
                <TableCell className="text-zinc-500">PT. Mitra Bahari</TableCell>
                <TableCell><StatusBadge variant="success" dot>Aktif</StatusBadge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Detail</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">002</TableCell>
                <TableCell className="font-medium">John Doe</TableCell>
                <TableCell className="text-zinc-500">Global Shipping Ltd</TableCell>
                <TableCell><StatusBadge variant="danger" dot>Blacklist</StatusBadge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Detail</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Contoh Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Tindakan</DialogTitle>
            <DialogDescription>
              Dialog standar dengan tipografi, jarak kelipatan 4px, dan tombol aksi terpusat di kanan bawah.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-zinc-600 dark:text-zinc-300">
            Form atau konten konfirmasi ditampilkan di sini dengan kontras terbaca.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
