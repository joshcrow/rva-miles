# RVA Miles v2 — Evolution Plan

Synthesis of an 8-agent adversarial review (code correctness, architecture, UX,
product utility, PWA/mobile, fresh-vision flows, verification, completeness
critic) conducted 2026-08-07. All critical correctness claims were
independently confirmed against source.

## Who this is for

One primary user who drives for work and files mileage for reimbursement each
pay period. She's savvy; the design constraint is that she's **driving** —
glanceable status, zero interaction while moving, everything deferrable to
after the drive. The product owner (a UX designer) shares reports and may share
the app itself with others like her, so zero-config setup matters.

## Why v1 failed its job (confirmed findings)

**Trust/accuracy** — the app could cost real money or data silently:
- Reload mid-trip zeroed the trip while a hardcoded "TRACKING ON" badge lied.
- Every GPS trip recorded start location (0,0); GPS-denied trips still created
  live-looking 0-mile entries.
- No GPS accuracy/drift filtering (filter existed as dead code) — stationary
  jitter inflated billed miles.
- localStorage quota errors swallowed → "Trip saved!" toast, trip gone on
  reload. Restore overwrote the ledger with no validation or snapshot.
- Systemic UTC-vs-local date bugs: export dropped the entire final day of every
  period; manual trips saved a day early.
- IRS rate applied at export time, not captured per trip — changing the rate
  rewrote history. "Generate Test Data" shipped in production Settings.

**Product** — the reimbursement loop leaked at every seam: export was a bare
file download (~25 interactions across 3 apps to email a report), no pay-period
awareness, no share/sync/backup path, Reports was an unreachable stub, manual
entry required typing two full addresses per trip with no memory.

**Platform** — not actually a PWA: manifest icons 404, no service worker
(next-pwa is webpack-only; Next 16 builds with Turbopack), no install guidance,
wake lock never re-acquired after first screen lock, localStorage subject to
Safari 7-day ITP eviction.

**Codebase** — ~83% AI-scaffolding files by count; ~670+ lines of dead code;
status docs claimed "PRODUCTION READY" for components that don't exist on disk.

## v2 North Star

**Logging a work drive takes one tap; getting the pay-period report into the
manager's inbox takes three.** The app remembers routes so you never type an
address twice, and the ledger survives anything — reframed from "GPS tracker"
to "trip logger with memory". GPS live-tracking stays, honest and fixed, as
the fallback for unknown routes — not the front door.

## Architecture decisions

| Concern | v2 choice | Rationale |
|---|---|---|
| Framework | Next.js 16 + React 19 + MUI v7 (kept) | Stack isn't the problem; keeps Vercel deploy |
| Storage | **IndexedDB (Dexie)**, schema-versioned, auto-migration from v1 localStorage | No 5MB cliff, no silent quota loss, queryable; `navigator.storage.persist()` |
| Trip record | Compact: endpoints + distance + purpose + per-trip rate snapshot + local `dateKey` (+ optional simplified polyline) | Kills quota + timezone + rate-drift bug classes at the schema level |
| Geocoding/routing | **Photon** (autocomplete) + **OSRM** (route distance) + **Nominatim** (reverse) — free OSS, no API key | Removes Google key requirement/exposure entirely; zero-config for sharing |
| PWA | Hand-written service worker (~60 lines, Turbopack-proof) + real generated icons + iOS install coach | Actually installable, offline app shell |
| Sharing | Report-as-a-link (`/r#gzip-base64`, data never touches a server) + `navigator.share({files})` + `mailto:` composition + XLSX (ExcelJS)/CSV | Manager gets a link that opens anywhere; no blob-download dead end |
| Sync (optional) | Minimal `/api/sync` push/pull merged by trip UUID, backed by Redis/KV **behind env vars** — hidden when unconfigured | User has Vercel; deploy-ready without being required |
| Deleted | `_bmad/`, `.windsurf/`, stale docs, test-data injector, categories, vehicles CRUD page, PDF-with-maps, next-pwa, nosleep.js, jspdf, xlsx, Google Maps SDK, dead hooks/components | Every dependency must earn its bundle weight |

## Core flows (the spec)

1. **One-tap repeat** — home screen is a grid of route tiles ranked by
   frequency × day-of-week; tap = trip logged today with undo snackbar
   ("Logged 14.2 mi — UNDO · Make it round trip"). No confirmation dialogs
   anywhere; undo everywhere.
2. **New route in ~3 taps** — origin defaults/chips + destination autocomplete
   + distance auto-resolved (round-trip toggle) → becomes a tile forever.
   Capture and template-creation are the same action.
3. **Catch-up** — "Missing anything?" banner → weekday strip proposing your
   usual trips per day as one-tap rows, correct dates applied automatically.
4. **Payday send** — pay-period chip → review sheet → Share/mail: composed
   message with summary + report link + attached XLSX. Period presets
   everywhere; recipient remembered.
5. **Honest GPS drive** — one tap to start with real GPS-lock feedback;
   glanceable cockpit (status truth derived from fix recency); accuracy-gated
   distance; survives reload/screen-lock (resume prompt, watch restart, wake
   lock re-acquire on visibility); stop sheet reconciles GPS vs road-route
   distance.
6. **New phone / second phone** — merge-by-UUID import (never clobber), auto
   pre-restore snapshot, backup nudges; optional cloud sync when configured.

## Quality bar

- Vitest coverage for every money-touching lib (dates, periods, distance
  filter, merge, CSV/XLSX escaping incl. formula-injection neutralization).
- Playwright smoke of the real flows on a phone viewport; GitHub Actions CI
  (lint + typecheck + test + build).
- One committed color story across app/manifest/exports; polished MUI theme,
  dark + light, real empty/loading/error states; no blank first paint.
- Reports carry period, generation date, vehicle, and owner name — 
  professional enough to hand to accounts payable.
