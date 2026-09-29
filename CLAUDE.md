# CLAUDE.md — VMS-web-react

Guidance for Claude Code when working in this repository. Container-level context lives in
`../CLAUDE.md` (`D:\INIT-ASL\VMS\CLAUDE.md`); the API and its rules in `../VMS-backend-laravel/CLAUDE.md`.
**Owner decisions for the hybrid program are authoritative in
`D:\INIT-ASL\docs\decisions\vms-hybrid-decisions.md`.**

## What this repo is

The security-counter SPA for the VMS gate: Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui, Vitest +
Testing Library. It ships inside the backend's release ZIP (built into Laravel's `public/`), so SPA and API
share one origin on the yard PC. UI/UX family reference: `VesselCert/vesselcert-web-react`.

## Git

**Never `git add`, `commit`, `push` or `rm`** — the owner does git. `.env` is still tracked in the index
until the owner runs `git rm --cached .env` (decision FE-1); `.gitignore` already lists it, so do not
`git add -A`. `.github/workflows/deploy.yml` (Azure Static Web Apps) was disabled on 2026-09-28 — the SWA now
belongs to the guest portal (decision B-3); do not re-enable it.

## How to write code here

- **API base URL** comes from `resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)` and defaults to
  `/api`. Never hard-code a host.
- **Nothing may need the internet at runtime** — no CDN, no Google Fonts; fonts are bundled.
- **`npm run build` = `tsc -b && vite build`** with `noUnusedLocals`: no unused imports or variables.
- **`verbatimModuleSyntax`** is on: import types with `import type { … }` (otherwise TS1484).
- Every `<DialogContent>` carries a `<DialogTitle>` and a `<DialogDescription>` (screen readers, and
  jsdom warnings in tests).
- Laravel paginators wrap items in `{ data, current_page, last_page, total }`; read lists defensively:
  `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])`.
- Downloads use `responseType: "blob"`; a 422 JSON error then arrives as a `Blob` — read it with
  `await err.response.data.text()` and `JSON.parse` (the 5,000-row print limit relies on this).
- `User.roles` can be `string[]` or `{ id, name }[]`; normalise before rendering.
- **One permission matrix for menu and routes** (`src/lib/routePermissions.ts`, decision FE-2): the
  sidebar shows an item and `App.tsx` guards its route from the same `ROUTE_PERMISSIONS` entry, so a user
  who types a URL they lack is sent to the dashboard. Add every new screen there. The dashboard (`/`)
  stays unguarded — it is the redirect target, and guarding it would loop. Unknown paths inside the layout
  render `pages/NotFound.tsx`.
- **Built-in roles are read-only** (`administrator`, `supervisor`, `security`; decision FE-3-ROLE): `Roles.tsx`
  reads `is_builtin` from `/api/roles` and offers only "Lihat" for them; the API refuses changes with 422 anyway.
- Company name on the pass and PDFs is still hard-coded to the CIS pilot's name; per-yard branding from
  `/api/app-config` is decision PE-7 (not built yet).

## Tests

- `npx vitest run` (jsdom, setup in `src/test/setup.ts`, which polyfills `ResizeObserver` for Radix and
  `cmdk`).
- Prefer role-scoped queries (`getByRole('heading', { name: … })`, `within(table)`) — several screens
  repeat words like "BLACKLIST" in badges and descriptions.
