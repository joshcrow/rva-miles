# RVA Miles

A work-mileage tracker for people who drive for a living and have to file for
reimbursement every pay period.

It is built around one person's actual week: drive to the same handful of
places, log them without thinking about it, and on payday send the manager a
report that looks like it came from an accounting department.

## The one-tap philosophy

The user is **driving**. That is the whole design constraint. Anything that
needs attention, precision, or a decision has to wait until the car is parked.

So:

- **Logging a repeat trip is one tap.** The home screen is a grid of route
  tiles ranked by how often you drive them and which day of the week it is.
  Tap one and the trip is logged for today, with an undo snackbar
  (`Logged 14.2 mi — UNDO · Make it round trip`).
- **A new route is about three taps** and then it is a tile forever. Capturing
  a trip and creating the template are the same action — you never type an
  address twice.
- **Nothing is ever confirmed.** There are no confirmation dialogs anywhere in
  the app. Destructive and creative actions happen instantly and offer UNDO.
  Deleting is a soft delete, so undo is real.
- **Everything is deferrable.** Missed some days? The "Missing anything?"
  banner proposes your usual trips for each empty weekday as one-tap rows, with
  the correct dates already applied.
- **GPS is the fallback, not the front door.** Live tracking is there for
  unknown routes. When it runs it is honest: the status is derived from how
  recently a fix was accepted, never hardcoded; fixes are filtered for accuracy
  and drift; the drive survives a reload or a screen lock.
- **Payday is three taps.** Pick the pay period, check the two numbers, share.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

There is no configuration step and no API key to obtain. Geocoding, address
autocomplete and road distances use free, keyless OSS services (Photon, OSRM,
Nominatim), so a fresh clone is immediately usable — and so is a copy handed to
someone else.

Other scripts:

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest, pure-logic suites
npm run build      # production build
node scripts/gen-icons.mjs   # re-cut app icons + favicon from the brand SVG
```

## Deploying

Deploys to [Vercel](https://vercel.com/new) with no configuration — import the
repo and it builds. Any host that runs a Next.js app works too.

**Serve it over HTTPS.** Geolocation, the wake lock that keeps the screen on
during a drive, the service worker, and installing to the home screen are all
gated on a secure context. `localhost` counts; a bare LAN IP does not.

### Optional: cross-device sync

Sync is off unless the server is configured for it, and the Settings screen
hides the whole section when it isn't. To turn it on, set either pair of env
vars (Vercel KV and Upstash Redis are both supported):

| Variable | |
|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |

Then enter the same sync code on both phones and tap Sync on each. The code
itself is never stored — the server keys snapshots by `sha256(code)` — and
merges are union-by-id with newer-wins, so syncing can add and update but never
deletes anything you still have.

Without these variables `/api/sync` answers `{ configured: false }` and nothing
in the UI references it.

## Install it as an app

RVA Miles is a real PWA: a hand-written service worker (`public/sw.js`), a web
manifest, and generated maskable icons. Installed, it launches full-screen with
no browser chrome and boots offline — the ledger lives in IndexedDB, so the
network is never in the path of logging a trip.

- **iOS/Safari** — Share → Add to Home Screen.
- **Android/Chrome** — the install prompt, or ⋮ → Install app.

The app shows a dismissible install coach with the right instructions for the
device it's running on.

## Where your data lives

**On your device.** Trips, routes and settings are stored in IndexedDB (via
Dexie) on the phone or laptop you logged them on. There is no account, no
server-side database, and nothing is uploaded as part of normal use.

That is a deliberate trade, and it comes with three escape hatches:

1. **Backup & merge-import.** Settings → Data writes a full JSON snapshot
   (native share sheet where available, download otherwise). Importing one
   *merges* it: union by record id, newer `updatedAt` wins, never a wholesale
   overwrite. You see a plain-language preview of exactly what will change
   before anything is written, and you're offered an automatic safety backup
   first. Deletions travel as tombstones so an import can't resurrect a trip
   you deleted somewhere else.
2. **Report links carry their own data.** A shared report is a `/r#…` URL with
   the whole report gzipped into the fragment. Browsers never send a fragment
   to a server, so the manager opening that link is not fetching anything from
   us — the page renders straight out of the address bar, and prints or exports
   to XLSX/CSV from there. Some chat apps trim fragments when forwarding; the
   viewer says so plainly when it happens.
3. **Optional sync**, above, if you configure it.

The app asks the browser for persistent storage on first run so the ledger
isn't evicted under disk pressure, and Settings nags when a backup is overdue.

### Money and dates are treated as facts, not calculations

Two things the previous version got wrong, fixed at the schema level:

- **The IRS rate is snapshotted onto every trip when it's logged.** Exports
  never recompute from current settings, so changing the rate cannot rewrite
  history.
- **Every calendar date is a local `YYYY-MM-DD` key**, captured at logging
  time. Nothing parses `new Date('2026-08-07')` (which is UTC) or derives a
  date from `toISOString()`. Pay periods therefore include their final day, and
  a trip logged at 9pm isn't filed under tomorrow.

Storage failures are never swallowed. Every write path surfaces failure to the
user through the snackbar — the previous version's "Trip saved!" toast over a
trip that was silently dropped is the specific bug this rule exists to prevent.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| UI | MUI v7 with CSS variables — light + dark, system-default |
| Type | Inter, self-hosted via `next/font` |
| Storage | IndexedDB via Dexie |
| State | Zustand (transient UI: the snackbar / undo channel) |
| Geo | Photon (autocomplete), OSRM (road distance), Nominatim (reverse) |
| Exports | ExcelJS for XLSX; hand-rolled RFC 4180 CSV |
| Tracking | Geolocation + Screen Wake Lock, accuracy/drift filtered |
| Tests | Vitest over the pure logic — dates, periods, rates, merge, CSV/XLSX escaping, GPS filtering |

The brand is violet → fuchsia (`#7C3AED` → `#D946EF`); money is always green.
Dark mode is a rich near-black (`#0B0A10`), not gray. Design tokens live in
`src/theme/theme.ts` and the app icon is generated from a single SVG in
`scripts/gen-icons.mjs`.

## Layout

```
src/
  app/          routes: / (home) /drive /trips /report /settings /r (shared report)
                api/sync — optional, 503s cleanly when unconfigured
  components/   one folder per screen + the shell (nav, snackbar, install coach)
  lib/          db, dates, periods, rates, exporters, reportlink, geo, geocode,
                tracking, routesLogic — no module here imports from src/app
  stores/       zustand ui store (snackbar + undo)
  theme/        MUI theme
  types/        domain types
```

Pure logic is unit-tested in a sibling `__tests__` folder; screens keep their
persistence in one optimistic-with-loud-errors code path per screen.
