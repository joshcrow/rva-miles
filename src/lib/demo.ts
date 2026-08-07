// Demo mode — a believable ten-week ledger, generated on demand, so every
// data-dependent state (ranked tiles, the catch-up banner, a part-elapsed pay
// period, the review collapse, the backup nudge, per-trip rate snapshots,
// stops and legs, a GPS track) can be evaluated on a real phone.
//
// ISOLATION IS THE POINT. Everything written here lands in the "rva-miles-demo"
// IndexedDB database, which db.ts selects at module init while the demo flag is
// set; the real "rva-miles" ledger is never opened in the same page load, and
// the v1 migration is skipped, so nothing seeded here can reach real trips.
//
// `demoDataset` is pure: same `todayKey` in, same records out. Every timestamp
// is derived from a dateKey rather than from the clock, so the dataset is
// reproducible and unit-testable, and the whole staging stays correct whenever
// demo mode is entered.

import type { GpsPoint, Place, Route, Settings, Trip } from "@/types";
import { addDaysKey, keyToDate, todayKey, weekdayOfKey } from "./dates";
import { db, demoVariant, saveSettings } from "./db";
import { messyDataset } from "./demoMessy";
import { encodeTrack } from "./geo";

// ---------------------------------------------------------------------------
// Shape of the staged week
// ---------------------------------------------------------------------------

/** 2026 IRS business rate — what every recent demo trip snapshotted. */
const RATE = 0.725;
/** 2025 rate, left on the oldest trips so period math visibly mixes rates. */
const LEGACY_RATE = 0.7;
const LEGACY_RATE_TRIPS = 3;

const VEHICLE = "2014 Subaru Outback";

/** Ten weeks of history: always spans at least three calendar months. */
const HISTORY_DAYS = 70;
/** The recent fortnight is busier than the older weeks — work picked up. */
const RECENT_DAYS = 14;
/**
 * Biweekly anchor, in days before today. Today lands inside a period that is
 * well under way, so Home's pay-period chip and Report's "This pay period"
 * both show a real running total rather than a fresh or a closed period.
 */
const PERIOD_ANCHOR_DAYS_BACK = 11;
/** Recent pattern days deliberately left empty, so catch-up has real gaps. */
const CATCH_UP_GAPS = 2;

const OFFICE: Place = { name: "Office", address: "1001 E Broad St, Richmond, VA" };
const HOME: Place = { name: "Home", address: "3210 Grove Ave, Richmond, VA" };

type RouteKey = "clinic" | "mechanicsville" | "shortPump" | "charlottesville" | "depot";

interface RouteSpec {
  key: RouteKey;
  id: string;
  from: Place;
  to: Place;
  distanceMiles: number;
  defaultPurpose: string;
  defaultRoundTrip?: boolean;
  /** Cycled through as trips are generated, so purposes read like real notes. */
  purposes: string[];
}

const ROUTE_SPECS: RouteSpec[] = [
  {
    key: "clinic",
    id: "demo-route-clinic",
    from: OFFICE,
    to: { name: "Chesterfield Clinic", address: "6801 Lucks Ln, Midlothian, VA" },
    distanceMiles: 14.2,
    defaultPurpose: "Client visit",
    purposes: ["Client visit", "Client visit", "Follow-up visit"],
  },
  {
    key: "mechanicsville",
    id: "demo-route-mechanicsville",
    from: OFFICE,
    to: { name: "Mechanicsville Site", address: "7231 Mechanicsville Tpke, Mechanicsville, VA" },
    distanceMiles: 11.6,
    defaultPurpose: "Site inspection",
    purposes: ["Site inspection", "Punch list walkthrough"],
  },
  {
    key: "shortPump",
    id: "demo-route-short-pump",
    from: HOME,
    to: { name: "Short Pump Office", address: "11800 W Broad St, Henrico, VA" },
    distanceMiles: 9.8,
    defaultPurpose: "Regional meeting",
    defaultRoundTrip: true,
    purposes: ["Regional meeting", "Regional meeting", "Team planning"],
  },
  {
    key: "charlottesville",
    id: "demo-route-charlottesville",
    from: OFFICE,
    to: { name: "Charlottesville site", address: "1180 Seminole Trl, Charlottesville, VA" },
    distanceMiles: 71.3,
    defaultPurpose: "Quarterly review",
    purposes: ["Quarterly review"],
  },
  {
    key: "depot",
    id: "demo-route-depot",
    from: OFFICE,
    to: { name: "Scott's Addition depot", address: "3100 W Marshall St, Richmond, VA" },
    distanceMiles: 4.1,
    defaultPurpose: "Supply run",
    purposes: ["Supply run", "Supply run", "Equipment pickup"],
  },
];

const SPEC_BY_KEY = new Map<RouteKey, RouteSpec>(ROUTE_SPECS.map((s) => [s.key, s]));

/** Weekday (0 = Sunday, matching Date#getDay) -> the routes driven that day. */
type WeekTemplate = Partial<Record<number, RouteKey[]>>;

/** The current habit: clinic Tue/Fri, Mechanicsville Wed, Short Pump Mondays. */
const RECENT_WEEK: WeekTemplate = {
  1: ["shortPump", "depot"],
  2: ["clinic", "depot"],
  3: ["mechanicsville", "depot"],
  4: ["depot"],
  5: ["clinic", "depot"],
};

/** Older weeks are thinner and alternate, so weekday history is real but sparse. */
const OLDER_WEEK_A: WeekTemplate = { 1: ["shortPump"], 3: ["mechanicsville"] };
const OLDER_WEEK_B: WeekTemplate = { 2: ["clinic"], 5: ["clinic"] };

/** Departure times, in local hours, for the 1st/2nd/3rd trip of a day. */
const DAY_HOURS = [9, 13, 16];

/** Local instant for a dateKey at a given local hour (keyToDate is local noon). */
function stamp(dateKey: string, hour: number): number {
  return keyToDate(dateKey).getTime() + Math.round((hour - 12) * 3_600_000);
}

function templateFor(offset: number): WeekTemplate {
  if (offset < RECENT_DAYS) return RECENT_WEEK;
  return Math.floor(offset / 7) % 2 === 0 ? OLDER_WEEK_A : OLDER_WEEK_B;
}

// ---------------------------------------------------------------------------
// The one-off trips that prove the unusual surfaces
// ---------------------------------------------------------------------------

const CROZET: Place = { name: "Crozet", address: "1005 Crozet Ave, Crozet, VA" };
const CVILLE_SITE: Place = {
  name: "Charlottesville site",
  address: "1180 Seminole Trl, Charlottesville, VA",
};
const GLEN_ALLEN: Place = {
  name: "Glen Allen client",
  address: "10800 Staples Mill Rd, Glen Allen, VA",
  latLng: { lat: 37.6608, lng: -77.5305 },
};
const OFFICE_FIX: Place = { ...OFFICE, latLng: { lat: 37.5407, lng: -77.436 } };

/** A handful of real Richmond → Glen Allen coordinates, encoded like a track. */
function demoTrack(startedAt: number): GpsPoint[] {
  const legs: Array<[number, number]> = [
    [37.5407, -77.436],
    [37.5581, -77.4712],
    [37.5834, -77.4996],
    [37.6103, -77.5138],
    [37.6382, -77.5241],
    [37.6608, -77.5305],
  ];
  return legs.map(([lat, lng], i) => ({
    lat,
    lng,
    timestamp: startedAt + i * 240_000,
    accuracy: 8,
  }));
}

// ---------------------------------------------------------------------------
// The dataset
// ---------------------------------------------------------------------------

export interface DemoDataset {
  trips: Trip[];
  routes: Route[];
  settings: Settings;
}

function tripId(n: number): string {
  return `demo-trip-${String(n).padStart(3, "0")}`;
}

/**
 * The full staged ledger for a given local date. Pure — no clock, no storage,
 * no randomness — so the demo looks the same on every device that enters it on
 * the same day, and so the composition is unit-testable.
 */
export function demoDataset(today: string): DemoDataset {
  // 1. Lay out the habitual week, oldest day first.
  const byOffset = new Map<number, RouteKey[]>();
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const keys = templateFor(offset)[weekdayOfKey(addDaysKey(today, -offset))];
    if (keys?.length) byOffset.set(offset, keys);
  }

  // 2. Blank the two most recent pattern days (today excluded — catch-up never
  //    proposes today). Those weekdays keep plenty of older history, so the
  //    banner fires with genuine suggestions rather than a staged string.
  const gaps: number[] = [];
  for (let offset = 1; offset < HISTORY_DAYS && gaps.length < CATCH_UP_GAPS; offset++) {
    if (byOffset.has(offset)) gaps.push(offset);
  }
  for (const offset of gaps) byOffset.delete(offset);

  // 3. Materialise the habitual trips.
  const trips: Trip[] = [];
  const purposeSeq = new Map<RouteKey, number>();
  let n = 0;

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const keys = byOffset.get(offset);
    if (!keys) continue;
    const dateKey = addDaysKey(today, -offset);
    keys.forEach((key, i) => {
      const spec = SPEC_BY_KEY.get(key);
      if (!spec) return;
      const seq = purposeSeq.get(key) ?? 0;
      purposeSeq.set(key, seq + 1);
      const at = stamp(dateKey, DAY_HOURS[Math.min(i, DAY_HOURS.length - 1)]);
      n += 1;
      trips.push({
        id: tripId(n),
        dateKey,
        from: spec.from,
        to: spec.to,
        distanceMiles: spec.defaultRoundTrip ? spec.distanceMiles * 2 : spec.distanceMiles,
        ...(spec.defaultRoundTrip ? { roundTrip: true } : {}),
        purpose: spec.purposes[seq % spec.purposes.length],
        vehicle: VEHICLE,
        ratePerMile: RATE,
        routeId: spec.id,
        source: "tile",
        createdAt: at,
        updatedAt: at,
      });
    });
  }

  // 4. The one-offs. Each is nudged off a catch-up gap so a staged trip can
  //    never fill the hole the banner depends on.
  const placeAt = (preferred: number): number => {
    let offset = preferred;
    while (gaps.includes(offset)) offset += 1;
    return offset;
  };

  const gpsKey = addDaysKey(today, -placeAt(3));
  const gpsStart = stamp(gpsKey, 10.5);
  n += 1;
  trips.push({
    id: tripId(n),
    dateKey: gpsKey,
    startTime: gpsStart,
    endTime: gpsStart + 26 * 60_000,
    from: OFFICE_FIX,
    to: GLEN_ALLEN,
    // Billed is the reconciled road distance; the raw GPS trace ran slightly
    // longer, which is exactly the pair the stop sheet reconciles.
    distanceMiles: 12.4,
    gpsDistanceMiles: 12.9,
    purpose: "Site survey",
    vehicle: VEHICLE,
    ratePerMile: RATE,
    polyline: encodeTrack(demoTrack(gpsStart)),
    source: "gps",
    createdAt: gpsStart + 26 * 60_000,
    updatedAt: gpsStart + 26 * 60_000,
  });

  const stopKey = addDaysKey(today, -placeAt(19));
  const stopAt = stamp(stopKey, 8);
  n += 1;
  trips.push({
    id: tripId(n),
    dateKey: stopKey,
    from: HOME,
    to: CVILLE_SITE,
    legs: [
      { from: HOME, to: CROZET, distanceMiles: 71.2, billable: false },
      { from: CROZET, to: CVILLE_SITE, distanceMiles: 12.8, billable: true },
    ],
    // Only the billed leg reaches the money; the direct-route figure is kept
    // alongside it as the alternative she declined.
    distanceMiles: 12.8,
    directMiles: 71.3,
    purpose: "Site visit",
    vehicle: VEHICLE,
    ratePerMile: RATE,
    source: "manual",
    createdAt: stopAt,
    updatedAt: stopAt,
  });

  const cvilleSpec = SPEC_BY_KEY.get("charlottesville");
  if (cvilleSpec) {
    const cvilleKey = addDaysKey(today, -placeAt(41));
    const cvilleAt = stamp(cvilleKey, 7.5);
    n += 1;
    trips.push({
      id: tripId(n),
      dateKey: cvilleKey,
      from: cvilleSpec.from,
      to: cvilleSpec.to,
      distanceMiles: cvilleSpec.distanceMiles,
      purpose: cvilleSpec.defaultPurpose,
      vehicle: VEHICLE,
      ratePerMile: RATE,
      routeId: cvilleSpec.id,
      source: "tile",
      createdAt: cvilleAt,
      updatedAt: cvilleAt,
    });
  }

  // Carried over from v1 by the migration: addresses only, no route tile.
  const migrated: Array<{ preferred: number; to: Place; miles: number; purpose: string }> = [
    { preferred: 59, to: { address: "2201 W Broad St, Richmond, VA" }, miles: 8.3, purpose: "Client visit" },
    { preferred: 66, to: { address: "500 Southlake Blvd, Richmond, VA" }, miles: 22.6, purpose: "Vendor pickup" },
  ];
  for (const m of migrated) {
    const dateKey = addDaysKey(today, -placeAt(m.preferred));
    const at = stamp(dateKey, 11);
    n += 1;
    trips.push({
      id: tripId(n),
      dateKey,
      from: { address: "1001 E Broad St, Richmond, VA" },
      to: m.to,
      distanceMiles: m.miles,
      purpose: m.purpose,
      vehicle: VEHICLE,
      ratePerMile: RATE,
      source: "migrated",
      createdAt: at,
      updatedAt: at,
    });
  }

  // 5. Oldest first, then leave the three oldest on last year's rate — the
  //    proof that a rate change never rewrites what was already logged.
  trips.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < LEGACY_RATE_TRIPS && i < trips.length; i++) {
    trips[i].ratePerMile = LEGACY_RATE;
  }

  return { trips, routes: buildRoutes(trips), settings: demoSettings(today) };
}

/** Route counters are derived from the trips, so tile ranking is honest. */
function buildRoutes(trips: Trip[]): Route[] {
  return ROUTE_SPECS.map((spec) => {
    const mine = trips.filter((t) => t.routeId === spec.id);
    const firstAt = mine.length ? Math.min(...mine.map((t) => t.createdAt)) : 0;
    const lastAt = mine.length ? Math.max(...mine.map((t) => t.createdAt)) : 0;
    const route: Route = {
      id: spec.id,
      from: spec.from,
      to: spec.to,
      distanceMiles: spec.distanceMiles,
      defaultPurpose: spec.defaultPurpose,
      timesUsed: mine.length,
      lastUsedAt: lastAt,
      createdAt: firstAt,
      updatedAt: lastAt,
    };
    if (spec.defaultRoundTrip) route.defaultRoundTrip = true;
    return route;
  });
}

/**
 * No `routeTapEducatedAt` (the one-time route-tap lesson is part of what there
 * is to evaluate) and no `lastBackupAt` (with well over ten trips, that makes
 * the backup nudge speak).
 */
function demoSettings(today: string): Settings {
  return {
    ownerName: "Dana Calloway",
    vehicle: VEHICLE,
    ratePerMile: RATE,
    paySchedule: {
      frequency: "biweekly",
      anchorKey: addDaysKey(today, -PERIOD_ANCHOR_DAYS_BACK),
    },
    reportRecipient: { name: "Marcus", email: "manager@example.com" },
    theme: "system",
  };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Fills the demo database the first time it is opened, with the dataset the
 * running variant asks for. A no-op outside demo mode, and a no-op once that
 * variant's ledger holds anything — so trips logged while evaluating survive a
 * reload instead of being overwritten by a reseed. The two variants are
 * separate databases, so seeding one can never touch the other.
 */
export async function ensureDemoSeed(): Promise<void> {
  const variant = demoVariant();
  if (!variant) return;
  if ((await db.trips.count()) > 0) return;

  const data = variant === "messy" ? messyDataset(todayKey()) : demoDataset(todayKey());
  await db.transaction("rw", db.trips, db.routes, db.kv, async () => {
    await db.trips.bulkPut(data.trips);
    await db.routes.bulkPut(data.routes);
    await saveSettings(data.settings);
  });
}
