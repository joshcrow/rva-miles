# RVA Miles

A work-mileage tracker for people who drive for a living and file for
reimbursement every pay period.

It is built around one person's actual week: drive to the same handful of
places, log them without thinking about it, and on payday send the manager a
report that looks like it came from an accounting department.

## The one-tap philosophy

The user is **driving**. That is the whole design constraint — anything that
needs attention waits until the car is parked.

- **A repeat trip is one tap.** Home is a grid of routes ranked by frequency
  and day of week. Tap one and the trip is logged for today, with undo.
- **A new route is about three taps**, then one tap after that. Logging a trip
  and creating its route are the same action — you never type an address twice.
- **Stops and legs.** A trip can run Home → family in Crozet → the
  Charlottesville site, with each leg billed or not billed. The report says
  "Charlottesville site (via Crozet)" and only billed miles reach the money.
  When a journey resumes hours later, "Continue from here" starts the next
  entry at the last destination.
- **No confirmation dialogs.** Actions happen instantly and offer undo.
  Deletes are soft, so undo is real.
- **Missed days are proposed, not typed.** The catch-up banner offers your
  usual trips for each empty weekday, dates already applied.
- **GPS is the fallback, not the front door.** Live tracking exists for unknown
  routes, and it is honest: status derives from fix recency, fixes are filtered
  for accuracy and drift, and a drive survives a reload or screen lock.
- **Payday is three taps.** Pick the pay period, check the two numbers, share.

## Quick start

```bash
npm install
npm run dev
```

No configuration, no API keys. Autocomplete, road distances and reverse
geocoding use free, keyless services (Photon, OSRM, Nominatim), so a fresh
clone works immediately — and so does a copy handed to someone else.

```bash
npm run lint / typecheck / test / build
node scripts/gen-icons.mjs   # re-cut icons + favicon from the brand SVG
```

### Demo mode

Open the app at `/?demo=1` and it reloads onto a
**separate `rva-miles-demo` IndexedDB database**, seeded with ten weeks
of staged trips so every data-dependent state — ranked tiles, the catch-up
banner, a part-elapsed pay period, mixed per-trip rates, a stop journey, a GPS
track — can be looked at on a real phone. A "Demo data" pill sits at the top of
every screen; Exit clears the flag and reloads. The real ledger is never opened
while demo mode is on, and the v1 import is skipped there, so nothing seeded
can reach your own trips. Entry is by URL only — there is no button in the app.

## Deploying

Import the repo into [Vercel](https://vercel.com/new) and it builds; any
Next.js host works. **Serve it over HTTPS** — geolocation, wake lock, the
service worker and home-screen install all require a secure context
(`localhost` counts, a bare LAN IP does not).

### Optional: cross-device sync

Sync stays hidden until the server is configured. Set either pair:

| Variables | Backing |
|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |

Enter the same sync code on both phones and tap Sync on each. The server
stores snapshots keyed by `sha256(code)`; merges are union-by-id with
newer-wins, so sync adds and updates but never deletes anything you still
have.

## Install it as an app

A real PWA: hand-written service worker, manifest, generated maskable icons.
Installed, it launches full-screen and boots offline — the ledger lives in
IndexedDB, so the network is never in the path of logging a trip. iOS: Share →
Add to Home Screen. Android: the install prompt. An in-app coach shows the
right steps per device.

## Where your data lives

**On your device.** Trips, routes and settings are IndexedDB records on the
phone that logged them. No account, no server database, nothing uploaded in
normal use. Three escape hatches:

1. **Backup & merge-import.** Settings → Data writes a full JSON backup.
   Importing merges — union by id, newer wins, never a wholesale overwrite —
   with a plain-language preview and an offered safety backup first. Deletions
   travel as tombstones, so an import can't resurrect a trip deleted elsewhere.
2. **Report links carry their own data.** A shared report is a `/r#…` URL with
   the report gzipped into the fragment, which browsers never send to any
   server. The page renders from the address bar and downloads XLSX/CSV from
   there.
3. **Sync**, above, if configured.

The app requests persistent storage on first run and Settings warns when a
backup is overdue.

### Money and dates are facts, not calculations

- **The rate is snapshotted onto every trip at logging.** Exports never
  recompute from settings; changing the rate cannot rewrite history.
- **Every date is a local `YYYY-MM-DD` key** captured at logging. Nothing UTC-
  parses a calendar date, so pay periods include their final day and a 9pm trip
  isn't filed under tomorrow.
- **Storage failures are loud.** Every write path surfaces failure in the UI;
  a success toast over a dropped write is the specific v1 bug this rule exists
  to prevent.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| UI | MUI v7 with CSS variables — light + dark, system default |
| Type | Inter, self-hosted via `next/font` |
| Storage | IndexedDB via Dexie |
| Geo | Photon (autocomplete), OSRM (road distance), Nominatim (reverse) |
| Reports | ExcelJS XLSX, RFC 4180 CSV, self-contained `/r` links |
| Tracking | Geolocation + Screen Wake Lock, accuracy/drift filtered |
| Tests | Vitest over the money-touching logic |

Design tokens (radii, elevation, the violet → fuchsia brand) live in
`src/theme/theme.ts`; the writing rules live in `docs/content-style.md`; the
product rationale lives in `docs/v2-plan.md`.

## Layout

```
src/
  app/          / (home) /drive /trips /report /settings /r (shared report)
                api/sync — optional, answers unconfigured cleanly
  components/   one folder per screen + the shell
  lib/          db, dates, periods, rates, money, legs, exporters, reportlink,
                geo, geocode, tracking, routesLogic — never imports from app/
  stores/       snackbar + undo channel
  theme/        tokens + MUI theme
  types/        domain types
```

Pure logic is unit-tested in sibling `__tests__` folders; screens keep
persistence in one optimistic-with-loud-errors path per screen.
