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

**Never `git add`, `commit`, `push` or `rm`** — the owner does git (exceptions only when the owner asks in chat).
`.env` was removed from the index with `git rm --cached .env` on 2026-09-29 at the owner's request (decision FE-1);
the removal is staged until the owner commits it. `.gitignore` lists it; the local file stays on disk. The old Azure Static Web Apps `deploy.yml` was disabled on 2026-09-28 and deleted on 2026-09-29 — the
SWA now belongs to the guest portal (decision B-3); never add a deploy workflow here. The only workflow is
`.github/workflows/quality.yml` (Vitest + build on push to `production` and on pull requests; no secrets).

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
- **Company name, address and logo on the pass come from `GET /api/app-config`** (decision PE-7, 2026-09-29),
  through `useAppConfig()` in `src/lib/appConfig.ts`: one build serves every yard, each yard's `.env` names its
  company (`VMS_COMPANY_*`). Never hard-code a yard's name. `PrintVisit` opens the print dialog only once the
  config has answered (or failed — then it prints "VISITOR MANAGEMENT SYSTEM"), so paper never shows a
  placeholder. Tests that render the pass call `resetAppConfigCache()` in `beforeEach`.
- **Hybrid screens (roadmap step 8, 2026-09-29)**: the pre-registration code field on `CreateVisit` is its own
  `<form>` — a USB 2D scanner types the token and presses Enter, which must not submit the check-in. Whether a
  supervisor may override a global blacklist entry comes from the API (`can_override` on the 422), not from the
  SPA's permission list. `SyncIndicator` hides itself on any answer that is not a sync status. Only the fixed
  `REASON_CATEGORIES` (`src/types/hybrid.ts`) ever go to the hub; the local note stays on the gate.
- The check-in payload field is `vehicle_no` (it was `vehicle_plate` until 2026-09-29, which the API ignored).

## Tests

- `npx vitest run` (jsdom, setup in `src/test/setup.ts`, which polyfills `ResizeObserver` for Radix and
  `cmdk`).
- Prefer role-scoped queries (`getByRole('heading', { name: … })`, `within(table)`) — several screens
  repeat words like "BLACKLIST" in badges and descriptions.
