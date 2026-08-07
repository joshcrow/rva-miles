// Dexie (IndexedDB) database + typed data-access API. This is the only
// module that touches storage directly for trips/routes/settings/active
// drive. Every write here either succeeds or throws — nothing is ever
// swallowed; callers surface caught errors to the user (ui store snackbar).

import Dexie, { type Table } from "dexie";
import type {
  ActiveDrive,
  DateRange,
  MergeResult,
  Place,
  Route,
  Settings,
  Snapshot,
  Trip,
  TripLeg,
} from "@/types";
import { compareKeys, toDateKey } from "./dates";
import { currentDefaultRate } from "./rates";

interface KvRow {
  key: string;
  value: unknown;
}

class RvaMilesDb extends Dexie {
  trips!: Table<Trip, string>;
  routes!: Table<Route, string>;
  kv!: Table<KvRow, string>;
  activeDrive!: Table<ActiveDrive, string>;

  constructor() {
    super("rva-miles");
    this.version(1).stores({
      trips: "id, dateKey, updatedAt, deletedAt",
      routes: "id, lastUsedAt",
      kv: "key",
      activeDrive: "id",
    });
  }
}

export const db = new RvaMilesDb();

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function listTrips(range?: DateRange): Promise<Trip[]> {
  const all = range
    ? await db.trips.where("dateKey").between(range.startKey, range.endKey, true, true).toArray()
    : await db.trips.toArray();
  return all
    .filter((t) => !t.deletedAt)
    .sort((a, b) => compareKeys(b.dateKey, a.dateKey) || b.createdAt - a.createdAt);
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  return db.trips.get(id);
}

export async function putTrip(t: Trip): Promise<void> {
  await db.trips.put(t);
}

export async function putTrips(ts: Trip[]): Promise<void> {
  await db.trips.bulkPut(ts);
}

async function mutateTrip(id: string, mutator: (t: Trip) => Trip): Promise<void> {
  await db.transaction("rw", db.trips, async () => {
    const existing = await db.trips.get(id);
    if (!existing) throw new Error(`Trip not found: ${id}`);
    await db.trips.put(mutator(existing));
  });
}

export async function softDeleteTrip(id: string): Promise<void> {
  const now = Date.now();
  await mutateTrip(id, (t) => ({ ...t, deletedAt: now, updatedAt: now }));
}

export async function undeleteTrip(id: string): Promise<void> {
  const now = Date.now();
  await mutateTrip(id, (t) => {
    // Omit the key entirely (rather than set undefined) so the `deletedAt`
    // index correctly excludes this record again.
    const next: Trip = { ...t, updatedAt: now };
    delete next.deletedAt;
    return next;
  });
}

/** Permanently removes trips soft-deleted more than `olderThanMs` ago. Returns count removed. */
export async function purgeDeleted(olderThanMs: number): Promise<number> {
  const cutoff = Date.now() - olderThanMs;
  const stale = await db.trips.where("deletedAt").below(cutoff).toArray();
  if (stale.length === 0) return 0;
  await db.trips.bulkDelete(stale.map((t) => t.id));
  return stale.length;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function listRoutes(): Promise<Route[]> {
  const all = await db.routes.toArray();
  return all.filter((r) => !r.archived && !r.deletedAt).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export async function putRoute(r: Route): Promise<void> {
  await db.routes.put(r);
}

export async function archiveRoute(id: string): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.routes, async () => {
    const existing = await db.routes.get(id);
    if (!existing) throw new Error(`Route not found: ${id}`);
    await db.routes.put({ ...existing, archived: true, updatedAt: now });
  });
}

// ---------------------------------------------------------------------------
// Settings (singleton, stored in kv)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "settings";

function defaultSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get(SETTINGS_KEY);
  const defaults = defaultSettings();
  if (!row || !row.value) return defaults;
  return { ...defaults, ...(row.value as Settings) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await db.kv.put({ key: SETTINGS_KEY, value: s });
}

// ---------------------------------------------------------------------------
// Active drive (singleton: at most one row at a time)
// ---------------------------------------------------------------------------

export async function getActiveDrive(): Promise<ActiveDrive | undefined> {
  return db.activeDrive.toCollection().first();
}

export async function saveActiveDrive(d: ActiveDrive): Promise<void> {
  await db.transaction("rw", db.activeDrive, async () => {
    await db.activeDrive.clear();
    await db.activeDrive.put(d);
  });
}

export async function clearActiveDrive(): Promise<void> {
  await db.activeDrive.clear();
}

// ---------------------------------------------------------------------------
// Snapshot export / merge-import
// ---------------------------------------------------------------------------

/**
 * Full backup snapshot, including soft-deleted (tombstoned) rows — omitting
 * them here would let a merge-import on another device resurrect a trip the
 * user deleted here. `listTrips`/exports filter deletions; this does not.
 */
export async function exportSnapshot(): Promise<Snapshot> {
  const [trips, routes, settings] = await Promise.all([
    db.trips.toArray(),
    db.routes.toArray(),
    getSettings(),
  ]);
  return { schema: 2, exportedAt: Date.now(), trips, routes, settings };
}

interface MergeableRecord {
  id: string;
  updatedAt: number;
}

interface MergePlan<T> {
  toPut: T[];
  added: number;
  updated: number;
  skipped: number;
}

/**
 * Pure merge-decision function (no I/O) so it's unit-testable without a
 * real IndexedDB. Union by id; an incoming record replaces an existing one
 * only if strictly newer by `updatedAt`. Never a wholesale overwrite.
 */
export function mergePlan<T extends MergeableRecord>(existing: T[], incoming: T[]): MergePlan<T> {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const toPut: T[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const rec of incoming) {
    const current = byId.get(rec.id);
    if (!current) {
      toPut.push(rec);
      added++;
    } else if (rec.updatedAt > current.updatedAt) {
      toPut.push(rec);
      updated++;
    } else {
      skipped++;
    }
  }
  return { toPut, added, updated, skipped };
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function isPlaceLike(v: unknown): v is Place {
  return !!v && typeof v === "object";
}

/**
 * `legs` is optional (backward compatible with every snapshot written before
 * multi-leg trips existed); when present each entry must carry real
 * endpoints, a finite non-negative distance, and an explicit billable flag —
 * a malformed leg fails the whole import rather than silently corrupting
 * `billableMiles`/`routeText` downstream.
 */
function assertValidLeg(leg: unknown, tripId: string, index: number): asserts leg is TripLeg {
  if (!leg || typeof leg !== "object") {
    throw new Error(`importMerge: trip "${tripId}" legs[${index}] is not an object`);
  }
  const rec = leg as Record<string, unknown>;
  if (!isPlaceLike(rec.from)) {
    throw new Error(`importMerge: trip "${tripId}" legs[${index}] is missing "from"`);
  }
  if (!isPlaceLike(rec.to)) {
    throw new Error(`importMerge: trip "${tripId}" legs[${index}] is missing "to"`);
  }
  if (!isFiniteNonNegative(rec.distanceMiles)) {
    throw new Error(`importMerge: trip "${tripId}" legs[${index}] has invalid distanceMiles`);
  }
  if (typeof rec.billable !== "boolean") {
    throw new Error(`importMerge: trip "${tripId}" legs[${index}] has invalid "billable"`);
  }
}

function assertValidTrip(t: unknown, index: number): asserts t is Trip {
  if (!t || typeof t !== "object") {
    throw new Error(`importMerge: trips[${index}] is not an object`);
  }
  const rec = t as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) {
    throw new Error(`importMerge: trips[${index}] has an invalid id`);
  }
  if (typeof rec.dateKey !== "string" || !DATE_KEY_RE.test(rec.dateKey)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid dateKey "${String(rec.dateKey)}"`);
  }
  if (!isFiniteNonNegative(rec.distanceMiles)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid distanceMiles`);
  }
  if (!isFiniteNonNegative(rec.ratePerMile)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid ratePerMile`);
  }
  if (typeof rec.updatedAt !== "number" || !Number.isFinite(rec.updatedAt)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid updatedAt`);
  }
  if (typeof rec.createdAt !== "number" || !Number.isFinite(rec.createdAt)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid createdAt`);
  }
  if (!rec.from || typeof rec.from !== "object") {
    throw new Error(`importMerge: trip "${rec.id}" is missing "from"`);
  }
  if (!rec.to || typeof rec.to !== "object") {
    throw new Error(`importMerge: trip "${rec.id}" is missing "to"`);
  }
  if (rec.legs !== undefined) {
    if (!Array.isArray(rec.legs)) {
      throw new Error(`importMerge: trip "${rec.id}" has invalid "legs" (not an array)`);
    }
    rec.legs.forEach((leg, legIndex) => assertValidLeg(leg, rec.id as string, legIndex));
  }
  if (rec.directMiles !== undefined && !isFiniteNonNegative(rec.directMiles)) {
    throw new Error(`importMerge: trip "${rec.id}" has invalid "directMiles"`);
  }
}

function assertValidRoute(r: unknown, index: number): asserts r is Route {
  if (!r || typeof r !== "object") {
    throw new Error(`importMerge: routes[${index}] is not an object`);
  }
  const rec = r as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) {
    throw new Error(`importMerge: routes[${index}] has an invalid id`);
  }
  if (!isFiniteNonNegative(rec.distanceMiles)) {
    throw new Error(`importMerge: route "${rec.id}" has invalid distanceMiles`);
  }
  if (typeof rec.updatedAt !== "number" || !Number.isFinite(rec.updatedAt)) {
    throw new Error(`importMerge: route "${rec.id}" has invalid updatedAt`);
  }
  if (typeof rec.lastUsedAt !== "number" || !Number.isFinite(rec.lastUsedAt)) {
    throw new Error(`importMerge: route "${rec.id}" has invalid lastUsedAt`);
  }
}

/**
 * Throws a descriptive Error on anything `importMerge` would refuse. Exported
 * so the import *preview* can reject a bad file up front, instead of promising
 * a merge that the write then declines.
 */
export function validateSnapshot(s: unknown): Snapshot {
  if (!s || typeof s !== "object") throw new Error("importMerge: snapshot is not an object");
  const rec = s as Record<string, unknown>;
  if (rec.schema !== 2) {
    throw new Error(`importMerge: unsupported snapshot schema "${String(rec.schema)}" (expected 2)`);
  }
  if (!Array.isArray(rec.trips)) throw new Error("importMerge: snapshot.trips is not an array");
  if (!Array.isArray(rec.routes)) throw new Error("importMerge: snapshot.routes is not an array");
  rec.trips.forEach(assertValidTrip);
  rec.routes.forEach(assertValidRoute);
  return s as Snapshot;
}

/**
 * Union-by-id merge of a snapshot into the live database. Newer `updatedAt`
 * wins per record; anything not newer is left alone. Settings are
 * intentionally NOT touched here — a singleton object has no per-field
 * merge semantics, and silently overwriting it would violate "never a
 * wholesale overwrite".
 */
export async function importMerge(s: Snapshot): Promise<MergeResult> {
  const snapshot = validateSnapshot(s);
  const [existingTrips, existingRoutes] = await Promise.all([db.trips.toArray(), db.routes.toArray()]);
  const tripPlan = mergePlan(existingTrips, snapshot.trips);
  const routePlan = mergePlan(existingRoutes, snapshot.routes);
  await db.transaction("rw", db.trips, db.routes, async () => {
    if (tripPlan.toPut.length) await db.trips.bulkPut(tripPlan.toPut);
    if (routePlan.toPut.length) await db.routes.bulkPut(routePlan.toPut);
  });
  return {
    tripsAdded: tripPlan.added,
    tripsUpdated: tripPlan.updated,
    routesAdded: routePlan.added,
    routesUpdated: routePlan.updated,
    skipped: tripPlan.skipped + routePlan.skipped,
  };
}

// ---------------------------------------------------------------------------
// v1 → v2 migration (client-only: reads v1's localStorage)
// ---------------------------------------------------------------------------

const V1_TRIPS_KEY = "rva-miles-trips";
const V1_VEHICLES_KEY = "rva-miles-vehicles";
const V1_SETTINGS_KEY = "rva-miles-settings";
const MIGRATION_FLAG_KEY = "rva-miles-migrated-v2";
const V1_DEFAULT_RATE = 0.67;

interface V1GpsPoint {
  lat: number;
  lng: number;
  timestamp?: number;
  accuracy?: number;
}

interface V1Trip {
  id: string;
  vehicleId?: string;
  startTime: number;
  endTime: number | null;
  startLocation?: V1GpsPoint | null;
  endLocation?: V1GpsPoint | null;
  distanceMiles: number;
  purpose?: string;
  routePolyline?: string;
  startAddress?: string;
  endAddress?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface V1Vehicle {
  id: string;
  name: string;
}

interface V1Settings {
  irsRate?: number;
}

function readV1Json<T>(key: string): T | undefined {
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `migrateFromV1IfNeeded: could not parse localStorage["${key}"]: ${(err as Error).message}`,
    );
  }
}

function isZeroLatLng(p: V1GpsPoint | null | undefined): boolean {
  return !p || (p.lat === 0 && p.lng === 0);
}

function v1PlaceFrom(p: V1GpsPoint | null | undefined, address?: string): Place {
  const place: Place = {};
  if (address) place.address = address;
  if (p && !isZeroLatLng(p)) place.latLng = { lat: p.lat, lng: p.lng };
  return place;
}

/**
 * One-time import of v1's localStorage ledger into the v2 Dexie store.
 * Idempotent via a flag row in `kv`; safe to call on every app boot.
 * Leaves the v1 localStorage data in place (no destructive cleanup).
 */
export async function migrateFromV1IfNeeded(): Promise<number> {
  if (typeof window === "undefined") return 0;

  const already = await db.kv.get(MIGRATION_FLAG_KEY);
  if (already) return 0;

  const v1Trips = readV1Json<V1Trip[]>(V1_TRIPS_KEY) ?? [];
  const now = Date.now();

  if (v1Trips.length === 0) {
    await db.kv.put({ key: MIGRATION_FLAG_KEY, value: { migratedAt: now, count: 0 } });
    return 0;
  }

  const v1Vehicles = readV1Json<V1Vehicle[]>(V1_VEHICLES_KEY) ?? [];
  const v1Settings = readV1Json<V1Settings>(V1_SETTINGS_KEY) ?? {};
  const rate = isFiniteNonNegative(v1Settings.irsRate) ? v1Settings.irsRate : V1_DEFAULT_RATE;
  const vehicleName = (id?: string) => v1Vehicles.find((v) => v.id === id)?.name;

  const migrated: Trip[] = v1Trips
    // A record with no usable startTime can't be given a dateKey; skip
    // rather than fail the whole migration over pre-existing v1 corruption.
    .filter((t) => typeof t.startTime === "number" && Number.isFinite(t.startTime) && typeof t.id === "string")
    .map((t) => {
      const trip: Trip = {
        id: t.id,
        dateKey: toDateKey(t.startTime),
        startTime: t.startTime,
        endTime: t.endTime ?? undefined,
        from: v1PlaceFrom(t.startLocation, t.startAddress),
        to: v1PlaceFrom(t.endLocation, t.endAddress),
        distanceMiles: isFiniteNonNegative(t.distanceMiles) ? t.distanceMiles : 0,
        purpose: t.purpose || undefined,
        vehicle: vehicleName(t.vehicleId),
        ratePerMile: rate,
        polyline: t.routePolyline,
        source: "migrated",
        createdAt: t.createdAt ?? t.startTime,
        updatedAt: t.updatedAt ?? t.createdAt ?? t.startTime,
      };
      return trip;
    });

  await db.transaction("rw", db.trips, db.kv, async () => {
    await db.trips.bulkPut(migrated);
    await db.kv.put({ key: MIGRATION_FLAG_KEY, value: { migratedAt: now, count: migrated.length } });
  });

  return migrated.length;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Requests persistent (non-evictable) storage. Never throws; false = not granted/unsupported. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
