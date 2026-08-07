// Demo mode, messy variant — the same ledger the clean demo stages, after
// nineteen months of a real person being in a hurry.
//
// This fixture exists to be criticised. Every record here is VALID (it passes
// `validateSnapshot` wholesale, so it could have arrived through a backup
// import) and every record is also the kind of thing that makes a screen look
// bad: a place name that is a paragraph, a purpose with a spreadsheet formula
// in it, a trip dated next week, a month with sixty rows, four identical trips
// on one day, a journey where nothing was billed. Ugly, not corrupt.
//
// ISOLATION IS THE POINT, exactly as in the clean demo. Everything staged here
// lands in the "rva-miles-demo-messy" IndexedDB database, which db.ts selects
// at module init while the demo flag reads "messy"; neither the real
// "rva-miles" ledger nor the clean demo's is opened in the same page load.
//
// `messyDataset` is pure: same `todayKey` in, same records out. Every
// timestamp is derived from a dateKey rather than from the clock, and every
// staged day is placed by its offset from today rather than by calendar
// weekday, so the composition — including how many catch-up suggestions fire —
// is identical whichever day of the week the demo is entered on.

import type { GpsPoint, PaySchedule, Place, Route, Settings, Trip, TripLeg } from "@/types";
import { addDaysKey, compareKeys, keyToDate, toDateKey } from "./dates";
import type { DemoDataset } from "./demo";
import { encodeTrack } from "./geo";
import { periodContaining } from "./periods";
import { defaultRateFor } from "./rates";

// ---------------------------------------------------------------------------
// Shape of the mess
// ---------------------------------------------------------------------------

/** 2026 IRS business rate. */
const RATE = 0.725;

/** Long enough to overflow every field that shows a vehicle, and it has a `"` in it. */
const VEHICLE = '2019 Mercedes-Benz Sprinter 2500 High Roof 170" WB';

/** Nineteen months of history: ~20 calendar months, always across a Dec/Jan boundary. */
const HISTORY_MONTHS = 18;
/** The habitual four weeks, laid out by offset from today rather than by weekday. */
const RECENT_DAYS = 28;
/**
 * Recent days deliberately left completely empty. All three sit inside
 * catch-up's seven-day lookback and all three carry two habitual routes, so
 * the banner always fires with six suggestions — on every weekday.
 */
const GAP_OFFSETS = [2, 4, 6];
/** The one month that makes the trips list scroll forever. */
const BURST_TRIPS = 60;
/** Two months back, so the burst month can never collide with a catch-up gap. */
const BURST_MONTHS_BACK = 2;
/** A date-picker accident, at least this far ahead — and always past the current period's end. */
const FUTURE_DAYS_AHEAD = 10;
/** Long enough ago that the backup nudge still speaks. */
const LAST_SYNC_DAYS_AGO = 90;

const OFFICE: Place = { name: "Office", address: "1001 E Broad St, Richmond, VA" };
const HOME: Place = { name: "Home", address: "3210 Grove Ave, Richmond, VA" };
const OFFICE_FIX: Place = { ...OFFICE, latLng: { lat: 37.5407, lng: -77.436 } };

/** 107 characters, with an em dash in the middle of it. */
const VCU_PAVILION: Place = {
  name: "Virginia Commonwealth University Health System Ambulatory Care Center Pavilion — North 11th Street Entrance",
  address: "417 N 11th St, Richmond, VA",
};

/** 130 characters, and the route tile has nothing shorter to fall back to. */
const UTILITIES_ANNEX: Place = {
  name: "Henrico County Department of Public Utilities — Water Reclamation Facility Annex B, Contractor Check-In Trailer (Gate 4/Rear Dock)",
  address: "8600 Dixon Powers Dr, Henrico, VA",
};

/**
 * A pin and nothing else — the reverse geocode never came back, so every
 * surface has to fall back to printing coordinates.
 */
const NO_LABEL: Place = { latLng: { lat: 37.4831, lng: -77.5219 } };

type RouteKey =
  | "clinic"
  | "depot"
  | "shortPump"
  | "mechanicsville"
  | "vcu"
  | "utilities"
  | "nolabel"
  | "greensboro"
  | "airport"
  | "warehouse"
  | "petersburg"
  | "ashland"
  | "midlothian"
  | "oldOffice"
  | "goochland";

interface RouteSpec {
  key: RouteKey;
  from: Place;
  to: Place;
  distanceMiles: number;
  defaultPurpose?: string;
  defaultRoundTrip?: boolean;
  archived?: boolean;
  /** Cycled through as trips are generated, so purposes repeat the way real ones do. */
  purposes: string[];
}

/**
 * Fifteen routes — comfortably past Home's seven-tile cap, so the grid always
 * shows the "Show all" path — of which two are archived.
 */
const ROUTE_SPECS: RouteSpec[] = [
  {
    key: "clinic",
    from: OFFICE,
    to: { name: "Chesterfield Clinic", address: "6801 Lucks Ln, Midlothian, VA" },
    distanceMiles: 14.2,
    defaultPurpose: "Client visit",
    purposes: ["Client visit", "client visit", "Follow-up", "Client visit"],
  },
  {
    key: "depot",
    from: OFFICE,
    to: { name: "Scott's Addition depot", address: "3100 W Marshall St, Richmond, VA" },
    distanceMiles: 4.1,
    defaultPurpose: "Supply run",
    purposes: ["Supply run", "Supply run", "Parts"],
  },
  {
    key: "shortPump",
    from: HOME,
    to: { name: "Short Pump Office", address: "11800 W Broad St, Henrico, VA" },
    distanceMiles: 9.8,
    defaultPurpose: "Regional meeting",
    purposes: ["Regional meeting", "meeting", "Regional meeting"],
  },
  {
    key: "mechanicsville",
    from: OFFICE,
    to: { name: "Mechanicsville Site", address: "7231 Mechanicsville Tpke, Mechanicsville, VA" },
    distanceMiles: 11.6,
    defaultPurpose: "Site inspection",
    purposes: ["Site inspection", "Punch list"],
  },
  {
    key: "vcu",
    from: OFFICE,
    to: VCU_PAVILION,
    distanceMiles: 3.4,
    defaultPurpose: "Records pickup",
    purposes: ["Records pickup", "Records pickup", "Dropped paperwork"],
  },
  {
    key: "utilities",
    from: OFFICE,
    to: UTILITIES_ANNEX,
    distanceMiles: 16.7,
    defaultPurpose: "Permit walkthrough",
    purposes: ["Permit walkthrough", "Inspection"],
  },
  {
    key: "nolabel",
    from: OFFICE,
    to: NO_LABEL,
    distanceMiles: 8.2,
    purposes: ["Site visit", "Site visit", ""],
  },
  {
    key: "greensboro",
    from: OFFICE,
    to: { name: "Greensboro branch", address: "1200 W Gate City Blvd, Greensboro, NC" },
    distanceMiles: 214.0,
    defaultPurpose: "Quarterly review",
    defaultRoundTrip: true,
    purposes: ["Quarterly review", "Quarterly review"],
  },
  {
    key: "airport",
    from: OFFICE,
    to: { name: "RIC airport", address: "1 Richard E Byrd Ter, Richmond, VA" },
    distanceMiles: 12.9,
    defaultPurpose: "Airport run",
    purposes: ["Airport run", "Picked up the regional director"],
  },
  {
    key: "warehouse",
    from: HOME,
    to: { name: "Sandston warehouse", address: "5400 Eubank Rd, Sandston, VA" },
    distanceMiles: 17.3,
    defaultPurpose: "Stock pull",
    purposes: ["Stock pull", "Stock pull", "Returns"],
  },
  {
    key: "petersburg",
    from: OFFICE,
    to: { name: "Petersburg yard", address: "1500 S Crater Rd, Petersburg, VA" },
    distanceMiles: 24.8,
    defaultPurpose: "Yard check",
    purposes: ["Yard check", "Yard check"],
  },
  {
    key: "ashland",
    from: OFFICE,
    to: { name: "Ashland office", address: "108 N Railroad Ave, Ashland, VA" },
    distanceMiles: 18.1,
    defaultPurpose: "Client visit",
    purposes: ["Client visit"],
  },
  {
    key: "midlothian",
    from: OFFICE,
    to: { name: "Midlothian showroom", address: "13700 Midlothian Tpke, Midlothian, VA" },
    distanceMiles: 13.5,
    defaultPurpose: "Showroom",
    purposes: ["Showroom", "Showroom walkthrough"],
  },
  {
    key: "oldOffice",
    from: OFFICE,
    to: { name: "Old office (Boulevard)", address: "2201 W Broad St, Richmond, VA" },
    distanceMiles: 6.8,
    defaultPurpose: "Office run",
    archived: true,
    purposes: ["Office run", "Office run"],
  },
  {
    key: "goochland",
    from: OFFICE,
    to: { name: "Goochland site", address: "2938 River Rd W, Goochland, VA" },
    distanceMiles: 31.4,
    defaultPurpose: "Site inspection",
    archived: true,
    purposes: ["Site inspection"],
  },
];

const SPEC_BY_KEY = new Map<RouteKey, RouteSpec>(ROUTE_SPECS.map((s) => [s.key, s]));

function routeId(key: RouteKey): string {
  return `demo-messy-route-${key}`;
}

/** A route that was deleted outright on another device; the trip that used it stayed. */
const MISSING_ROUTE_ID = "demo-messy-route-deleted-2025";

/**
 * The habitual four weeks, indexed by `offset % 7`. Every residue class holds
 * four dates inside the window, so a gap day still leaves three — comfortably
 * over catch-up's "used on at least two distinct dates" bar. The three gap
 * residues each carry two routes, which is what makes the banner fire with
 * six suggestions rather than two.
 */
const RECENT_PATTERN: RouteKey[][] = [
  ["depot"], // offset 0 (today), 7, 14, 21
  ["clinic", "depot"], // 1, 8, 15, 22
  ["clinic", "shortPump"], // 2 (gap), 9, 16, 23
  ["mechanicsville"], // 3, 10, 17, 24
  ["depot", "warehouse"], // 4 (gap), 11, 18, 25
  ["airport"], // 5, 12, 19, 26
  ["clinic", "midlothian"], // 6 (gap), 13, 20, 27
];

/** Cycled through the burst month. Sixty trips over twelve keys: five each. */
const BURST_CYCLE: RouteKey[] = [
  "clinic",
  "depot",
  "nolabel",
  "vcu",
  "clinic",
  "utilities",
  "airport",
  "depot",
  "midlothian",
  "warehouse",
  "clinic",
  "petersburg",
];

/** Cycled through the thin months, so every route has some history behind it. */
const DEEP_CYCLE: RouteKey[] = [
  "ashland",
  "petersburg",
  "goochland",
  "oldOffice",
  "greensboro",
  "clinic",
  "warehouse",
  "shortPump",
  "mechanicsville",
  "airport",
  "vcu",
  "utilities",
  "nolabel",
  "midlothian",
  "depot",
];

// ---------------------------------------------------------------------------
// Text abuse, kept together so it is obvious what is being staged
// ---------------------------------------------------------------------------

/** Leading `=` — the CSV and XLSX writers must neutralise it, or Excel evaluates it. */
const PURPOSE_FORMULA = "=SUM(A1:A9) miles per the payroll sheet";
/** A comma and a pair of double quotes: RFC 4180 quoting, twice over. */
const PURPOSE_QUOTES = 'Met w/ "Big Mike", signed contract';
/** Emoji, in a field that reaches mailto, the clipboard, CSV and a spreadsheet. */
const PURPOSE_EMOJI = "Café visit ☕";
/** ~400 characters of dictated run-on, in a single-line field. */
const PURPOSE_RUN_ON =
  "Left the office late because the parking deck gate was stuck again and then drove out to the Roanoke site to walk the punch list with the general contractor and the electrical sub who both wanted the same thing explained twice, then swung back through Lynchburg to drop the signed change order at the branch because they still will not take a scan, and finally came home the long way to avoid the crash on 460.";
/** One word, lowercase — the other end of the same problem. */
const PURPOSE_ONE_WORD = "meeting";

// ---------------------------------------------------------------------------
// Date helpers (local calendar only — see dates.ts)
// ---------------------------------------------------------------------------

/** Local instant for a dateKey at a given local hour (keyToDate is local noon). */
function stamp(dateKey: string, hour: number): number {
  return keyToDate(dateKey).getTime() + Math.round((hour - 12) * 3_600_000);
}

/** The 1st of the month `monthsBack` before the month `key` falls in. */
function monthStartKey(key: string, monthsBack: number): string {
  const d = keyToDate(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() - monthsBack, 1, 12, 0, 0, 0).getTime());
}

function daysInMonthOf(monthStart: string): number {
  const d = keyToDate(monthStart);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Day `day` of the month that `monthStart` opens. */
function dayOfMonthKey(monthStart: string, day: number): string {
  const d = keyToDate(monthStart);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), day, 12, 0, 0, 0).getTime());
}

/** Departure hour for the nth trip of a day: 8am, 11am, 2pm, then 4pm onward. */
function hourFor(index: number): number {
  return 8 + Math.min(index, 3) * 3 - (index >= 3 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// The dataset
// ---------------------------------------------------------------------------

function tripId(n: number): string {
  return `demo-messy-trip-${String(n).padStart(3, "0")}`;
}

interface OneOff {
  from: Place;
  to: Place;
  miles: number;
  rate?: number;
  purpose?: string;
  source?: Trip["source"];
  routeKey?: RouteKey;
  routeIdOverride?: string;
  roundTrip?: boolean;
  gpsMiles?: number;
  legs?: TripLeg[];
  directMiles?: number;
  hour?: number;
  /** Attaches a start/end time and an encoded track, the way a live drive does. */
  tracked?: boolean;
}

/** How long the one tracked drive ran, in minutes. */
const TRACKED_MINUTES = 41;

/** A handful of real Richmond coordinates, encoded the way a tracked drive stores them. */
function messyTrack(startedAt: number): GpsPoint[] {
  const points: Array<[number, number]> = [
    [37.5407, -77.436],
    [37.5288, -77.4501],
    [37.5121, -77.4718],
    [37.4966, -77.4903],
    [37.4831, -77.5219],
  ];
  return points.map(([lat, lng], i) => ({
    lat,
    lng,
    timestamp: startedAt + i * 300_000,
    accuracy: 21,
  }));
}

/**
 * The full staged worst case for a given local date. Pure — no clock, no
 * storage, no randomness — so the fixture is reproducible and unit-testable,
 * and so a critique of one screen can be reproduced exactly on another device.
 */
export function messyDataset(today: string): DemoDataset {
  const schedule = messySchedule(today);
  const period = periodContaining(schedule, today);
  const gapKeys = new Set(GAP_OFFSETS.map((o) => addDaysKey(today, -o)));

  const trips: Trip[] = [];
  const purposeSeq = new Map<RouteKey, number>();
  let n = 0;

  /** Logs one trip from a route spec, cycling that route's purposes. */
  const pushFromRoute = (key: RouteKey, dateKey: string, hour: number, deleted = false): void => {
    const spec = SPEC_BY_KEY.get(key);
    if (!spec) return;
    const seq = purposeSeq.get(key) ?? 0;
    purposeSeq.set(key, seq + 1);
    const at = stamp(dateKey, hour);
    const purpose = spec.purposes[seq % spec.purposes.length];
    n += 1;
    const trip: Trip = {
      id: tripId(n),
      dateKey,
      from: spec.from,
      to: spec.to,
      distanceMiles: spec.defaultRoundTrip ? spec.distanceMiles * 2 : spec.distanceMiles,
      ...(spec.defaultRoundTrip ? { roundTrip: true } : {}),
      ...(purpose ? { purpose } : {}),
      vehicle: VEHICLE,
      ratePerMile: defaultRateFor(dateKey),
      routeId: routeId(key),
      source: "tile",
      createdAt: at,
      updatedAt: at,
      // Deleted "this morning", whatever the trip's own date: young enough to
      // survive the 90-day tombstone sweep, so the fixture keeps its count.
      ...(deleted ? { deletedAt: stamp(today, 9) } : {}),
    };
    trips.push(trip);
  };

  /** Logs one hand-built trip. Everything unusual comes through here. */
  const pushOneOff = (dateKey: string, o: OneOff, index: number, deleted = false): void => {
    const at = stamp(dateKey, o.hour ?? hourFor(index % 4));
    const key = o.routeKey ? routeId(o.routeKey) : o.routeIdOverride;
    n += 1;
    const trip: Trip = {
      id: tripId(n),
      dateKey,
      ...(o.tracked
        ? {
            startTime: at,
            endTime: at + TRACKED_MINUTES * 60_000,
            polyline: encodeTrack(messyTrack(at)),
          }
        : {}),
      from: o.from,
      to: o.to,
      distanceMiles: o.miles,
      ...(o.legs ? { legs: o.legs } : {}),
      ...(o.directMiles !== undefined ? { directMiles: o.directMiles } : {}),
      ...(o.gpsMiles !== undefined ? { gpsDistanceMiles: o.gpsMiles } : {}),
      ...(o.roundTrip ? { roundTrip: true } : {}),
      ...(o.purpose ? { purpose: o.purpose } : {}),
      vehicle: VEHICLE,
      ratePerMile: o.rate ?? RATE,
      ...(key ? { routeId: key } : {}),
      source: o.source ?? "manual",
      createdAt: at,
      updatedAt: at,
      ...(deleted ? { deletedAt: stamp(today, 9) } : {}),
    };
    trips.push(trip);
  };

  // 1. The habitual four weeks, laid out by offset so the shape of the recent
  //    ledger — and therefore the catch-up banner — never depends on which
  //    weekday the demo was opened.
  for (let offset = RECENT_DAYS - 1; offset >= 0; offset--) {
    if (GAP_OFFSETS.includes(offset)) continue;
    const dateKey = addDaysKey(today, -offset);
    RECENT_PATTERN[offset % 7].forEach((key, i) => pushFromRoute(key, dateKey, hourFor(i)));
  }

  // 2. The month that broke the list: sixty trips, two or three a day, all in
  //    one calendar month two months back (far enough that it can never land
  //    on a catch-up gap).
  const burstStart = monthStartKey(today, BURST_MONTHS_BACK);
  const burstLength = daysInMonthOf(burstStart);
  for (let i = 0; i < BURST_TRIPS; i++) {
    const dateKey = dayOfMonthKey(burstStart, (i % burstLength) + 1);
    pushFromRoute(BURST_CYCLE[i % BURST_CYCLE.length], dateKey, hourFor(Math.floor(i / burstLength)));
  }

  // 3. The thin months. Everything from last month back to nineteen months ago
  //    gets two trips, so the month navigator can walk the whole span — across
  //    at least one December/January boundary — without hitting an empty month.
  let deep = 0;
  for (let m = 1; m <= HISTORY_MONTHS; m++) {
    if (m === BURST_MONTHS_BACK) continue;
    const monthStart = monthStartKey(today, m);
    for (const day of [6, 19]) {
      pushFromRoute(DEEP_CYCLE[deep % DEEP_CYCLE.length], dayOfMonthKey(monthStart, day), hourFor(deep % 2));
      deep += 1;
    }
  }

  // 4. Everything unusual, dated into the CURRENT pay period so one report
  //    carries the whole mess. Gap days are excluded; today always qualifies,
  //    so a period that started this morning still gets all of it.
  const periodDays: string[] = [];
  for (let k = period.startKey; compareKeys(k, today) <= 0; k = addDaysKey(k, 1)) {
    if (!gapKeys.has(k)) periodDays.push(k);
  }
  const dayFor = (i: number): string => periodDays[i % periodDays.length];

  const oneOffs: OneOff[] = [
    // Text the exporters have to survive.
    {
      from: OFFICE,
      to: { name: "Payroll office", address: "600 E Main St, Richmond, VA" },
      miles: 9.4,
      rate: 0.655,
      purpose: PURPOSE_FORMULA,
    },
    {
      from: OFFICE,
      to: { name: "Ironworks yard", address: "2101 Maury St, Richmond, VA" },
      miles: 22.3,
      rate: 0.67,
      purpose: PURPOSE_QUOTES,
    },
    {
      from: HOME,
      to: { name: "Lamplighter Roasting", address: "116 S Addison St, Richmond, VA" },
      miles: 3.4,
      rate: 0.7,
      purpose: PURPOSE_EMOJI,
    },
    {
      from: OFFICE,
      to: { name: "Roanoke site", address: "1 Market Sq SE, Roanoke, VA" },
      miles: 302.5,
      purpose: PURPOSE_RUN_ON,
    },
    {
      from: OFFICE,
      to: { name: "City Hall", address: "900 E Broad St, Richmond, VA" },
      miles: 2.7,
      purpose: PURPOSE_ONE_WORD,
    },
    // Numeric edges.
    {
      from: OFFICE,
      to: { name: "Parking deck", address: "800 E Marshall St, Richmond, VA" },
      miles: 0.1,
      purpose: "Moved the van",
    },
    {
      from: HOME,
      to: { name: "Charleston job site", address: "4000 Leeds Ave, Charleston, SC" },
      miles: 478.4,
      purpose: "Emergency callout",
    },
    {
      from: OFFICE_FIX,
      to: NO_LABEL,
      // Billed is what she reconciled down to; the raw trace wandered.
      miles: 12.6,
      gpsMiles: 18.9,
      purpose: "Drove around looking for the entrance",
      source: "gps",
      tracked: true,
      hour: 10.5,
    },
    {
      from: OFFICE,
      to: SPEC_BY_KEY.get("greensboro")?.to ?? OFFICE,
      miles: 428.0,
      roundTrip: true,
      purpose: "Quarterly review",
      source: "tile",
      routeKey: "greensboro",
    },
    // Structural oddities.
    {
      from: HOME,
      to: { name: "Arlington client", address: "1100 Wilson Blvd, Arlington, VA" },
      // Three stops, four points: only the two work hops are billed.
      legs: [
        { from: HOME, to: { name: "Fredericksburg office", address: "601 Caroline St, Fredericksburg, VA" }, distanceMiles: 58.4, billable: true },
        { from: { name: "Fredericksburg office", address: "601 Caroline St, Fredericksburg, VA" }, to: { name: "Sister's place", address: "300 King St, Alexandria, VA" }, distanceMiles: 52.1, billable: false },
        { from: { name: "Sister's place", address: "300 King St, Alexandria, VA" }, to: { name: "Arlington client", address: "1100 Wilson Blvd, Arlington, VA" }, distanceMiles: 9.2, billable: true },
      ],
      miles: 67.6,
      directMiles: 108.9,
      purpose: "Stopped at my sister's on the way",
    },
    {
      from: OFFICE,
      to: HOME,
      // Everything personal but one hop across a car park: a 0.1 mi day.
      legs: [
        { from: OFFICE, to: { name: "School pickup" }, distanceMiles: 6.2, billable: false },
        { from: { name: "School pickup" }, to: { name: "Grocery" }, distanceMiles: 2.4, billable: false },
        { from: { name: "Grocery" }, to: { name: "Client drop" }, distanceMiles: 0.1, billable: true },
        { from: { name: "Client drop" }, to: HOME, distanceMiles: 7.7, billable: false },
      ],
      miles: 0.1,
      directMiles: 15.9,
      purpose: "School run, dropped the samples off on the way",
    },
    {
      from: HOME,
      to: HOME,
      // Nothing billed at all. `validateSnapshot` accepts distanceMiles 0
      // (finite and non-negative), so this is the legal end of the range —
      // a trip that costs nothing and still occupies a row everywhere.
      legs: [
        { from: HOME, to: { name: "Virginia Beach", address: "2800 Shore Dr, Virginia Beach, VA" }, distanceMiles: 118.0, billable: false },
        { from: { name: "Virginia Beach", address: "2800 Shore Dr, Virginia Beach, VA" }, to: HOME, distanceMiles: 118.0, billable: false },
      ],
      miles: 0,
      purpose: "Weekend, logged by mistake",
    },
    {
      from: OFFICE,
      to: SPEC_BY_KEY.get("oldOffice")?.to ?? OFFICE,
      miles: 6.8,
      purpose: "Picked up the last boxes",
      source: "tile",
      // The tile was archived months ago; the trip still points at it.
      routeKey: "oldOffice",
    },
    {
      from: OFFICE,
      to: { name: "Wilmington yard", address: "1 Cardinal Dr Ext, Wilmington, NC" },
      miles: 214.0,
      purpose: "Yard audit",
      source: "tile",
      // The route this came from no longer exists in the routes table.
      routeIdOverride: MISSING_ROUTE_ID,
    },
  ];

  oneOffs.forEach((o, i) => pushOneOff(dayFor(i), o, i));

  // The same tile tapped four times on one day — twice by accident, and one of
  // the four never got a purpose typed into it.
  const dupPurposes = ["Client visit", "Client visit", undefined, "Client visit"];
  const dupHours = [8, 9, 9.5, 15];
  dupPurposes.forEach((purpose, i) => {
    pushOneOff(
      today,
      {
        from: SPEC_BY_KEY.get("clinic")?.from ?? OFFICE,
        to: SPEC_BY_KEY.get("clinic")?.to ?? OFFICE,
        miles: 14.2,
        purpose,
        source: "tile",
        routeKey: "clinic",
        hour: dupHours[i],
      },
      i,
    );
  });

  // 5. The date-picker accident: at least ten days out and always past the end
  //    of the current pay period, so it belongs to no period being reported on
  //    while still sitting in its own month in the trips list.
  let futureKey = addDaysKey(today, FUTURE_DAYS_AHEAD);
  while (compareKeys(futureKey, period.endKey) <= 0) futureKey = addDaysKey(futureKey, 1);
  pushOneOff(futureKey, {
    from: OFFICE,
    to: { name: "Kickoff meeting", address: "1717 E Cary St, Richmond, VA" },
    miles: 31.5,
    purpose: "Kickoff — picked the wrong month in the date picker",
    hour: 9,
  }, 0);

  // 6. Six soft-deleted trips, spread across the ledger — two in the current
  //    period, two in the burst month, two deep in the thin months. Every
  //    surface filters these; the 999.9 mi one is a canary, so if it ever
  //    shows up in a total, something stopped filtering.
  pushOneOff(dayFor(1), {
    from: OFFICE,
    to: { name: "Typo — meant 99.9", address: "1001 E Broad St, Richmond, VA" },
    miles: 999.9,
    purpose: "Deleted: fat-fingered distance",
    hour: 17,
  }, 0, true);
  pushOneOff(dayFor(3), {
    from: SPEC_BY_KEY.get("clinic")?.from ?? OFFICE,
    to: SPEC_BY_KEY.get("clinic")?.to ?? OFFICE,
    miles: 14.2,
    purpose: "Deleted: logged twice",
    source: "tile",
    routeKey: "clinic",
    hour: 18,
  }, 0, true);
  pushFromRoute("depot", dayOfMonthKey(burstStart, 4), 19, true);
  pushFromRoute("petersburg", dayOfMonthKey(burstStart, 17), 19, true);
  pushFromRoute("ashland", dayOfMonthKey(monthStartKey(today, 5), 12), 19, true);
  pushFromRoute("goochland", dayOfMonthKey(monthStartKey(today, 9), 22), 19, true);

  // Oldest first, matching the order every list renders in reverse.
  trips.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));

  return { trips, routes: buildRoutes(trips), settings: messySettings(today, schedule) };
}

/**
 * Route counters derived from the trips that still count: soft-deleted trips
 * are excluded, because tile ranking ignores them too and a counter that
 * disagreed with the ranking would be its own bug report.
 */
function buildRoutes(trips: Trip[]): Route[] {
  return ROUTE_SPECS.map((spec) => {
    const id = routeId(spec.key);
    const mine = trips.filter((t) => t.routeId === id && !t.deletedAt);
    const firstAt = mine.length ? Math.min(...mine.map((t) => t.createdAt)) : 0;
    const lastAt = mine.length ? Math.max(...mine.map((t) => t.createdAt)) : 0;
    const route: Route = {
      id,
      from: spec.from,
      to: spec.to,
      distanceMiles: spec.distanceMiles,
      timesUsed: mine.length,
      lastUsedAt: lastAt,
      createdAt: firstAt,
      updatedAt: lastAt,
    };
    if (spec.defaultPurpose) route.defaultPurpose = spec.defaultPurpose;
    if (spec.defaultRoundTrip) route.defaultRoundTrip = true;
    if (spec.archived) route.archived = true;
    return route;
  });
}

/** Semimonthly, so the current period is a calendar half-month that today sits inside. */
function messySchedule(today: string): PaySchedule {
  return {
    frequency: "semimonthly",
    // Semimonthly follows the calendar and ignores the anchor; it is set to
    // the current period's own start so the stored value never reads as a lie.
    anchorKey: periodContaining({ frequency: "semimonthly", anchorKey: today }, today).startKey,
  };
}

/**
 * A name too long for a header, a vehicle with a `"` in it, a plus-addressed
 * recipient, and no `lastBackupAt` at all — with 150-odd trips, that is what
 * makes the backup nudge speak. `routeTapEducatedAt` IS set: this fixture is
 * about degradation, not about onboarding, so the one-time route-tap lesson
 * stays out of the way.
 */
function messySettings(today: string, paySchedule: PaySchedule): Settings {
  return {
    ownerName: "Alexandria-Katherine Vandermeulen-Rothschild",
    vehicle: VEHICLE,
    ratePerMile: RATE,
    paySchedule,
    reportRecipient: { name: "Accounts payable", email: "ap+mileage@example.com" },
    theme: "system",
    routeTapEducatedAt: stamp(monthStartKey(today, HISTORY_MONTHS), 9),
    lastSyncAt: stamp(addDaysKey(today, -LAST_SYNC_DAYS_AGO), 9),
  };
}
