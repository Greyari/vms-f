# Panduan Internasionalisasi (i18n) VMS Core

Dokumentasi ini menjelaskan arsitektur dua bahasa (English & Bahasa Indonesia) pada aplikasi VMS Core (Visitor Management System), cara menambahkan kunci terjemahan baru, dan cara menambahkan bahasa baru.

---

## 1. Arsitektur & Prinsip Desain

- **Stack**: React 19 + TypeScript + Vite.
- **Provider**: `src/context/I18nContext.tsx` (`I18nProvider` & `useTranslation`).
- **File Kamus Terpusat**:
  - `src/i18n/locales/id.json` (Bahasa Indonesia - Default)
  - `src/i18n/locales/en.json` (English)
- **Persistensi**: Disimpan di `localStorage.getItem("vms_lang")`. Berganti secara instan di UI tanpa reload browser dan tanpa menghilangkan isian form yang sedang aktif.
- **Integritas Database & API**: Semua nilai enum di database (`regular`, `crew`, `active`, `completed`, `lost`, dsb.), endpoint API, payload request, serta parameter query tetap netral dan tidak diubah. Hanya teks tampilan pengguna (*presentation layer*) yang diterjemahkan.

---

## 2. Struktur Namespace

Kamus terjemahan disusun berdasarkan namespace terstruktur agar rapi dan tidak tumpang tindih:

| Namespace | Deskripsi |
|---|---|
| `common` | Teks umum berulang (Simpan, Batal, Hapus, Edit, Cari, Reset, Detail, Pagination, dsb.) |
| `layout` & `nav` | Sidebar, Header, Breadcrumb, Jam, Sync Status |
| `auth` | Halaman login, validasi sesi, rate limit |
| `dashboard` | Metrik operasional, tren grafik, tabel pengunjung aktif yard |
| `create_visit` / `addVisit` | Form tambah kunjungan (tamu, kru, vendor, override supervisor) |
| `active_visits` / `activateVisit` | Monitoring pengunjung aktif di yard & proses check-out |
| `reprint` / `reprintPass` | Pencarian tiket dan cetak ulang pass |
| `vesselArrivals` | Kedatangan kapal, manifest kru, agen lokal/asing |
| `locations` | Master lokasi darat, dermaga, dan kapal sandar |
| `staffs` | Master data staff / host |
| `cards` & `vehicleCards` | Master kartu akses visitor & kendaraan |
| `visitors` & `blacklist` | Master data pengunjung & daftar cekal (Blacklist) |
| `reportsVisits`, `reportsVessels`, `reportsCrew` | Laporan kunjungan, kapal, dan manifest kru pelaut |
| `users`, `logs`, `roles`, `profile` | Pengaturan pengguna, audit log, matriks permission, dan profil akun |
| `errors` | Halaman 404/NotFound, error boundary, jaringan terputus |

---

## 3. Cara Menambah Kunci Baru

### Langkah 1: Tambahkan Kunci ke `id.json` dan `en.json`

Pastikan kedua file memiliki kunci yang identik:

```json
// src/i18n/locales/id.json
{
  "common": {
    "my_new_feature": "Fitur Baru Saya"
  }
}

// src/i18n/locales/en.json
{
  "common": {
    "my_new_feature": "My New Feature"
  }
}
```

### Langkah 2: Gunakan di Komponen React

```tsx
import { useTranslation } from "@/context/I18nContext"

export default function MyComponent() {
  const { t, formatDate, formatNumber } = useTranslation()

  return (
    <div>
      {/* Teks statis dengan fallback */}
      <h1>{t("common.my_new_feature", "Fitur Baru Saya")}</h1>

      {/* Interpolasi variabel dinamis */}
      <p>{t("common.showing_count", { count: 25 })}</p>

      {/* Format tanggal lokal otomatis */}
      <span>{formatDate(new Date())}</span>
    </div>
  )
}
```

---

## 4. Cara Menambah Bahasa Baru (Misal: Mandarin `zh`)

1. Buat file kamus baru di `src/i18n/locales/zh.json`.
2. Buka `src/context/I18nContext.tsx`:
   - Tambahkan tipe bahasa: `export type Language = "id" | "en" | "zh"`
   - Impor file kamus: `import zhDict from "@/i18n/locales/zh.json"`
   - Daftarkan ke `dictionaries`:
     ```ts
     const dictionaries: Record<Language, Record<string, any>> = {
       id: idDict,
       en: enDict,
       zh: zhDict,
     }
     ```
3. Tambahkan tombol bahasa baru pada komponen Language Switcher di Header (`src/layouts/AppLayout.tsx`).
4. Jalankan `npm run i18n:check` untuk memastikan seluruh kunci lengkap.

---

## 5. Skrip Pengecekan Regresi Otomatis

Aplikasi dilengkapi skrip validasi integritas i18n otomatis:

```bash
npm run i18n:check
```

Skrip ini secara ketat memverifikasi 3 hal:
1. **Key Parity Audit**: Memastikan kunci di `id.json` dan `en.json` 100% identik tanpa ada kunci yang tertinggal di salah satu bahasa.
2. **Codebase Scan**: Memindai seluruh berkas `.ts` dan `.tsx` di dalam `src/` untuk memastikan setiap pemanggilan fungsi `t("namespace.key")` terdefinisi di file kamus.
3. **Unused Keys Report**: Mendeteksi dan melaporkan kunci-kunci kamus yang tidak terpakai secara statis agar kamus tetap ringkas dan bersih.
