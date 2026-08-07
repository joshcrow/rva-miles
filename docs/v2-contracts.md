# v2 Module Contracts & File Ownership

Every module below is owned by exactly one workstream. Implement exactly these
signatures (see `src/types/index.ts` for types). Pure logic must be unit-tested
with Vitest in a sibling `__tests__` folder. No module may import from `src/app`.

## Core data (owner: W-DATA)

`src/lib/db.ts` — Dexie database + typed API. Every write MUST surface failure
(throw), never swallow.
- `db` (Dexie instance; tables: `trips`, `routes`, `kv`, `activeDrive`)
- `listTrips(range?: DateRange): Promise<Trip[]>` — excludes soft-deleted; sorted dateKey desc, createdAt desc
- `getTrip(id): Promise<Trip | undefined>`
- `putTrip(t: Trip): Promise<void>` / `putTrips(ts: Trip[]): Promise<void>`
- `softDeleteTrip(id): Promise<void>` / `undeleteTrip(id): Promise<void>`
- `purgeDeleted(olderThanMs): Promise<number>`
- `listRoutes(): Promise<Route[]>` (non-archived, non-deleted) / `putRoute` / `archiveRoute(id)`
- `getSettings(): Promise<Settings>` (with defaults) / `saveSettings(s): Promise<void>`
- `getActiveDrive(): Promise<ActiveDrive | undefined>` / `saveActiveDrive` / `clearActiveDrive`
- `exportSnapshot(): Promise<Snapshot>`
- `importMerge(s: Snapshot): Promise<MergeResult>` — union by id, newer `updatedAt` wins per record, NEVER wholesale overwrite; validates shape first (throw descriptive Error on invalid)
- `migrateFromV1IfNeeded(): Promise<number>` — reads v1 localStorage keys (`rva-miles-trips`, `rva-miles-vehicles`, `rva-miles-settings`), maps to v2 Trips (dateKey from startTime in LOCAL time; ratePerMile from v1 settings.irsRate; source:'migrated'), inserts if not already migrated (flag key `rva-miles-migrated-v2`), returns count. Leaves v1 data in place.
- `requestPersistence(): Promise<boolean>` — navigator.storage.persist()

`src/lib/dates.ts` — LOCAL-date helpers (no UTC parsing of 'YYYY-MM-DD' ever):
- `todayKey(): string`, `toDateKey(ms: number): string`, `keyToDate(key): Date` (local noon)
- `addDaysKey(key, n): string`, `compareKeys(a, b): number`, `isKeyInRange(key, r: DateRange): boolean`
- `formatKey(key, style: 'short' | 'long' | 'weekday'): string`, `weekdayOfKey(key): number` (0=Sun)

`src/lib/periods.ts`:
- `periodContaining(s: PaySchedule, key: string): DateRange`
- `previousPeriod(s: PaySchedule, r: DateRange): DateRange`
- `periodPresets(s: PaySchedule | undefined, today: string): PeriodPreset[]` — always includes This month / Last month / Last 30 days / Custom hint; prepends This period / Last period when schedule set

`src/lib/rates.ts`:
- `IRS_RATES: Record<number, number>` (2023–2026; VERIFY 2025/2026 values via web search, cite source in comment)
- `defaultRateFor(key: string): number`

`src/lib/exporters.ts`:
- `buildCsv(trips: Trip[], meta: ReportMeta): string` — RFC 4180 quoting; neutralize leading `= + - @` in text cells (prefix `'`); columns: Date, From, To, Purpose, Miles, Rate, Amount; totals row
- `buildXlsx(trips: Trip[], meta: ReportMeta): Promise<Blob>` — lazy-import exceljs; styled header, real number cells, totals; includes period + owner + vehicle header block
- `buildSummaryText(trips: Trip[], meta: ReportMeta): string` — plaintext table for mail body
- `reportFilename(meta, ext): string`
- `export interface ReportMeta { title: string; range: DateRange; ownerName?: string; vehicle?: string }`

`src/lib/reportlink.ts`:
- `encodeReport(p: ReportPayload): Promise<string>` — gzip via CompressionStream → base64url, prefix `1.`; fallback plain base64url prefix `0.` when unavailable
- `decodeReport(fragment: string): Promise<ReportPayload>`
- `reportUrl(origin: string, p: ReportPayload): Promise<string>` → `${origin}/r#<encoded>`

## Geo & tracking (owner: W-GEO)

`src/lib/geo.ts`:
- `haversineMiles(a: LatLng, b: LatLng): number`
- `acceptFix(prev: GpsPoint | undefined, next: GpsPoint): boolean` — reject accuracy > 35m; reject step < noise floor `2*(prev.accuracy??20 + next.accuracy??20)` meters; reject implied speed > 100 mph
- `simplifyTrack(points: GpsPoint[], tolerance?: number): GpsPoint[]` (simplify-js)
- `encodeTrack(points: GpsPoint[]): string` / `decodeTrack(s: string): LatLng[]` (@googlemaps/polyline-codec)

`src/lib/geocode.ts` — all free OSS services, all failures graceful (return null/[]):
- `autocomplete(q: string, near?: LatLng): Promise<PlaceSuggestion[]>` — Photon (photon.komoot.io), debounced by caller; ≥3 chars
- `routeMiles(from: LatLng, to: LatLng): Promise<{ miles: number; polyline?: string } | null>` — OSRM (router.project-osrm.org)
- `reverseGeocode(p: LatLng): Promise<string | null>` — Nominatim, cached in `kv` by rounded coord, 1 req/s max
- `export interface PlaceSuggestion { name: string; address: string; latLng: LatLng }`

`src/lib/tracking.ts` — the drive engine (client-only):
- `useDriveTracking()` hook returning `{ status: DriveStatus; distanceMiles: number; elapsedMs: number; lastFixAgoMs: number | null; accuracy: number | null; start(vehicle?: string): Promise<void>; stop(): Promise<CompletedDrive | null>; discard(): Promise<void>; resume(d: ActiveDrive): void }`
- Status truth: `recording` only when a fix accepted in last 15s; `signal-lost` after that; NEVER hardcoded
- `start()` rejects (throws, with friendly message) when permission denied — no phantom trips
- Ingestion runs `acceptFix`; accumulator adds per accepted step; persists ActiveDrive (simplified points) every 5 accepted fixes
- Wake lock: acquire on start, re-acquire on `visibilitychange`, release on stop
- `CompletedDrive = { points: GpsPoint[]; distanceMiles: number; startedAt: number; endedAt: number; from?: LatLng; to?: LatLng }`
- `recoverActiveDrive(): Promise<ActiveDrive | undefined>` for the resume prompt

`src/lib/routesLogic.ts`:
- `rankTiles(routes: Route[], trips: Trip[], todayKey: string): Route[]` — frequency (60d) × day-of-week affinity × recency
- `catchUpSuggestions(routes: Route[], trips: Trip[], todayKey: string, lookbackDays?: number): Array<{ dateKey: string; route: Route }>` — weekdays in lookback with zero trips × routes usual for that weekday
- `routeFromTrip(t: Trip): Omit<Route, 'id' | 'createdAt' | 'updatedAt'>`
- `tripFromRoute(r: Route, dateKey: string, settings: Settings): Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>`

## UI foundation (owner: W-SHELL) — theme, layout, nav, PWA
- `src/theme/theme.ts` — MUI CssVars theme (light+dark), brand, component overrides
- `src/components/AppShell.tsx`, `src/components/BottomNav.tsx` (Home / Trips / Report / Settings)
- `src/stores/ui.ts` — zustand: snackbar with undo action support
- `src/app/layout.tsx` — SSR-safe theming (InitColorSchemeScript, no blank paint), metadata, viewport-fit=cover, SW registration
- `public/manifest.json`, real icons `public/icons/*.png`, `public/sw.js` (hand-written: precache shell, network-first navigation, cache-first static)
- `src/components/InstallCoach.tsx` — iOS/Android install guidance, dismissible

## Screens (owners: W-HOME, W-DRIVE, W-TRIPS, W-REPORT, W-SETTINGS)
- `src/app/page.tsx` + `src/components/home/*` — tiles grid, undo snackbar, period chip, catch-up banner, new-trip sheet (autocomplete)
- `src/app/drive/page.tsx` + `src/components/drive/*` — cockpit, stop sheet w/ GPS-vs-route reconcile, resume prompt
- `src/app/trips/page.tsx` + `src/components/trips/*` — grouped history, full edit sheet (incl. date), search
- `src/app/report/page.tsx`, `src/app/r/page.tsx` + `src/components/report/*` — presets, share/mail/files, report viewer + print
- `src/app/settings/page.tsx` — profile/rate/schedule/recipient/backup(merge)/sync/about
- `src/app/api/sync/route.ts` (owner: W-SETTINGS) — optional; GET/PUT snapshot by syncCode using Upstash Redis REST (env `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`); 404s cleanly when unconfigured
