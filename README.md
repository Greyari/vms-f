# VMS — SPA Konter Gerbang

Layar konter security VMS: check-in/check-out, cetak pass setengah A4, master data (lokasi, kartu, staff,
visitor, blacklist), crew arrival, laporan, pengaturan. Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui.

SPA ini **tidak di-deploy sendiri**: `tools/windows/build-release.ps1` di repo `VMS-backend-laravel` membangunnya
dengan `VITE_API_BASE_URL=/api` dan menyalin `dist/` ke `public/` backend, sehingga SPA dan API satu origin di
PC server yard. Arah program: `D:\INIT-ASL\docs\decisions\vms-hybrid-decisions.md`.

## Setup lokal

```bash
npm ci
npm run dev
```

Base URL API: `VITE_API_BASE_URL`, default **`/api`** bila tidak diisi (`src/lib/axios.ts` →
`src/lib/apiBaseUrl.ts`). Untuk dev dengan backend `php artisan serve --port=8003`, buat `.env` lokal berisi
`VITE_API_BASE_URL=http://127.0.0.1:8003/api` (lihat `.env.example`). `.env` tidak di-commit.

## Skrip

| Perintah | Isi |
|---|---|
| `npm run dev` | Server dev Vite |
| `npm test` | Vitest (jsdom) |
| `npm run build` | `tsc -b && vite build` — sekaligus gerbang typecheck |
| `npm run lint` | ESLint |

## Deploy

On-prem: ikut paket rilis backend (`deploy-onprem.yml` di repo `VMS-backend-laravel`). Workflow lama Azure Static
Web Apps dimatikan 2026-09-28 dan berkasnya dihapus 2026-09-29 — Static Web App-nya kini milik portal tamu.
Satu-satunya workflow repo ini: `.github/workflows/quality.yml` (Vitest + build, push `production` dan PR).

## Git

Commit, push, dan perubahan index dikerjakan owner.
