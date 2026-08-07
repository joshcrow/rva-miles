// The messy demo is a fixture whose whole job is to be ugly, so these tests
// pin down two things at once: that every staged record is still LEGAL (a
// backup file holding this dataset would import cleanly), and that each
// individual piece of mess it promises is actually present. A fixture that
// quietly loses its 60-trip month or its future-dated trip is a fixture that
// stops earning its place.
//
// As with the clean demo, everything is checked on all seven weekdays — the
// dataset is generated relative to whatever day demo mode is entered on.

import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { addDaysKey, compareKeys, isKeyInRange } from "../dates";
import { validateSnapshot } from "../db";
import { messyDataset } from "../demoMessy";
import { buildCsv } from "../exporters";
import { decodeTrack } from "../geo";
import { billableMiles } from "../legs";
import { totalsOf } from "../money";
import { periodContaining } from "../periods";
import { catchUpSuggestions } from "../routesLogic";

const SUNDAY = "2026-08-09";
const WEEK = [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysKey(SUNDAY, i));

const SOFT_DELETED_TRIPS = 6;
const ROUTE_COUNT = 15;
const ARCHIVED_ROUTES = 2;
/** Home shows seven tiles before the "Show all" control appears. */
const TILE_CAP = 7;

const FORMULA_PURPOSE = "=SUM(A1:A9) miles per the payroll sheet";
const QUOTED_PURPOSE = 'Met w/ "Big Mike", signed contract';
const EMOJI_PURPOSE = "Café visit ☕";
const ONE_WORD_PURPOSE = "meeting";

function active(trips: Trip[]): Trip[] {
  return trips.filter((t) => !t.deletedAt);
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

describe.each(WEEK)("messyDataset(%s)", (today) => {
  const { trips, routes, settings } = messyDataset(today);
  const live = active(trips);
  const schedule = settings.paySchedule;
  if (!schedule) throw new Error("messyDataset: expected a pay schedule");
  const period = periodContaining(schedule, today);
  const inPeriod = live.filter((t) => isKeyInRange(t.dateKey, period));

  it("is ugly but legal — the whole snapshot imports", () => {
    expect(() =>
      validateSnapshot({ schema: 2, exportedAt: 0, trips, routes, settings }),
    ).not.toThrow();
  });

  it("stages roughly 150 trips, six of them soft-deleted", () => {
    expect(trips.length).toBeGreaterThanOrEqual(140);
    expect(trips.length).toBeLessThanOrEqual(170);
    expect(trips.filter((t) => t.deletedAt).length).toBe(SOFT_DELETED_TRIPS);
    for (const t of trips.filter((x) => x.deletedAt)) {
      // Deleted recently, whatever the trip's own date: an older tombstone
      // would be swept by purgeDeleted on the next boot and the fixture would
      // silently lose the deletions it exists to exercise.
      expect(t.deletedAt).toBeGreaterThan(0);
      expect(compareKeys(t.dateKey, addDaysKey(today, 1))).toBeLessThan(0);
    }
  });

  it("keeps the deleted trips out of every number", () => {
    // The 999.9 mi typo is a canary: if it ever reaches a total, something
    // stopped filtering tombstones.
    const canary = trips.find((t) => t.distanceMiles === 999.9);
    expect(canary?.deletedAt).toBeGreaterThan(0);
    expect(live.some((t) => t.distanceMiles === 999.9)).toBe(false);
    expect(totalsOf(inPeriod).miles).toBeLessThan(999.9 * 2);
    for (const { route } of catchUpSuggestions(routes, trips, today)) {
      expect(route.archived).toBeFalsy();
    }
  });

  it("spans nineteen months, including a December/January boundary", () => {
    const months = new Set(live.map((t) => t.dateKey.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(19);

    const boundary = [...months].some((m) => {
      const [y, mm] = m.split("-");
      return mm === "12" && months.has(`${Number(y) + 1}-01`);
    });
    expect(boundary).toBe(true);
  });

  it("has one month heavy enough to break the list", () => {
    const byMonth = countBy(live, (t) => t.dateKey.slice(0, 7));
    expect(Math.max(...byMonth.values())).toBe(60);
  });

  it("holds exactly one future-dated trip, outside every period being reported on", () => {
    const future = live.filter((t) => compareKeys(t.dateKey, today) > 0);
    expect(future).toHaveLength(1);
    expect(compareKeys(future[0].dateKey, addDaysKey(today, 10))).toBeGreaterThanOrEqual(0);
    // Past the end of the current pay period, so it belongs to no period the
    // report offers — but its month still exists in the trips list.
    expect(isKeyInRange(future[0].dateKey, period)).toBe(false);
    expect(live.some((t) => t.dateKey.slice(0, 7) === future[0].dateKey.slice(0, 7))).toBe(true);
  });

  it("logs the same route four times on one day", () => {
    const byDayAndRoute = countBy(
      live.filter((t) => t.routeId),
      (t) => `${t.dateKey}|${t.routeId}`,
    );
    expect(Math.max(...byDayAndRoute.values())).toBeGreaterThanOrEqual(4);
  });

  it("fires the catch-up banner with plenty of suggestions", () => {
    const suggestions = catchUpSuggestions(routes, trips, today);
    // Three empty days inside the lookback, two habitual routes on each.
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    for (const { dateKey, route } of suggestions) {
      expect(compareKeys(dateKey, addDaysKey(today, -7))).toBeGreaterThanOrEqual(0);
      expect(compareKeys(dateKey, today)).toBeLessThan(0);
      expect(live.some((t) => t.dateKey === dateKey)).toBe(false);
      expect(routes.some((r) => r.id === route.id)).toBe(true);
    }
  });

  it("mixes four rates inside one pay period and clears $1,000", () => {
    expect(inPeriod.length).toBeGreaterThanOrEqual(10);
    const rates = new Set(inPeriod.map((t) => t.ratePerMile));
    for (const rate of [0.655, 0.67, 0.7, 0.725]) expect(rates.has(rate)).toBe(true);
    // Four figures, so every money surface has to group thousands.
    expect(totalsOf(inPeriod).money).toBeGreaterThan(1000);
  });

  it("overflows the tile grid, archived routes included", () => {
    expect(routes).toHaveLength(ROUTE_COUNT);
    const archived = routes.filter((r) => r.archived);
    expect(archived).toHaveLength(ARCHIVED_ROUTES);
    expect(routes.length - archived.length).toBeGreaterThan(TILE_CAP);

    // A name with nowhere to wrap, and a round-trip default that doubles to 428.
    expect(routes.some((r) => (r.to.name?.length ?? 0) >= 130)).toBe(true);
    expect(
      routes.some((r) => r.defaultRoundTrip === true && r.distanceMiles === 214.0),
    ).toBe(true);

    // Counters are derived from the live trips, so tile ranking stays honest.
    for (const route of routes) {
      expect(route.timesUsed).toBe(live.filter((t) => t.routeId === route.id).length);
      expect(route.timesUsed).toBeGreaterThan(0);
    }
  });

  it("points one trip at an archived route and one at a route that is gone", () => {
    const routeIds = new Set(routes.map((r) => r.id));
    const archivedIds = new Set(routes.filter((r) => r.archived).map((r) => r.id));

    const dangling = live.filter((t) => t.routeId && !routeIds.has(t.routeId));
    expect(dangling.length).toBeGreaterThanOrEqual(1);

    const onArchived = inPeriod.filter((t) => t.routeId && archivedIds.has(t.routeId));
    expect(onArchived.length).toBeGreaterThanOrEqual(1);
  });

  it("carries every kind of text abuse", () => {
    const purposes = live.map((t) => t.purpose ?? "");
    expect(purposes).toContain(FORMULA_PURPOSE);
    expect(purposes).toContain(QUOTED_PURPOSE);
    expect(purposes).toContain(EMOJI_PURPOSE);
    expect(purposes).toContain(ONE_WORD_PURPOSE);
    expect(purposes.some((p) => p.length >= 400)).toBe(true);
    // A trip with no purpose at all, on a day that has three others.
    expect(live.some((t) => t.purpose === undefined)).toBe(true);

    const places = live.flatMap((t) => [t.from, t.to]);
    expect(places.some((p) => (p.name?.length ?? 0) >= 100)).toBe(true);
    // A pin with no name and no address — every label falls back to coordinates.
    expect(places.some((p) => !p.name && !p.address && p.latLng)).toBe(true);
  });

  it("carries the numeric edges", () => {
    const miles = live.map((t) => t.distanceMiles);
    expect(miles).toContain(0.1);
    expect(miles).toContain(478.4);

    const gps = live.filter((t) => t.source === "gps");
    expect(gps).toHaveLength(1);
    expect(gps[0].gpsDistanceMiles).toBe(18.9);
    expect(gps[0].distanceMiles).toBe(12.6);
    expect(decodeTrack(gps[0].polyline ?? "").length).toBeGreaterThan(3);
  });

  it("stages the structural edges of a multi-leg journey", () => {
    const multi = live.filter((t) => t.legs && t.legs.length > 1);
    expect(multi.length).toBeGreaterThanOrEqual(3);

    // Whatever the shape, the billed total always equals the billed legs.
    for (const trip of multi) {
      expect(trip.distanceMiles).toBeCloseTo(billableMiles(trip.legs), 5);
    }

    // Three legs, i.e. a genuine three-stop journey.
    expect(multi.some((t) => (t.legs?.length ?? 0) === 3)).toBe(true);
    // A whole day of driving that bills a tenth of a mile…
    expect(multi.some((t) => t.distanceMiles === 0.1)).toBe(true);
    // …and one where nothing at all was billed. validateSnapshot accepts a
    // distance of 0, so this is legal data, not corruption.
    const unbilled = multi.filter((t) => t.distanceMiles === 0);
    expect(unbilled).toHaveLength(1);
    expect(unbilled[0].legs?.every((l) => !l.billable)).toBe(true);
  });

  it("carries the settings the degraded states depend on", () => {
    expect(settings.ownerName).toBe("Alexandria-Katherine Vandermeulen-Rothschild");
    expect(settings.vehicle).toContain('170" WB');
    expect(settings.ratePerMile).toBe(0.725);
    expect(schedule.frequency).toBe("semimonthly");
    expect(settings.reportRecipient?.email).toBe("ap+mileage@example.com");
    // The route-tap lesson is answered: this fixture is about degradation.
    expect(settings.routeTapEducatedAt).toBeGreaterThan(0);
    // Never backed up, last synced three months ago — the nudge speaks.
    expect(settings.lastBackupAt).toBeUndefined();
    expect(settings.lastSyncAt).toBeGreaterThan(0);
    expect(settings.lastSyncAt).toBeLessThan(Date.parse(`${today}T00:00:00Z`));
  });
});

describe("messyDataset", () => {
  it("is pure — the same day always produces the same ledger", () => {
    expect(messyDataset(SUNDAY)).toEqual(messyDataset(SUNDAY));
  });

  it("gives every record a stable, unique id", () => {
    const { trips, routes } = messyDataset(SUNDAY);
    expect(new Set(trips.map((t) => t.id)).size).toBe(trips.length);
    expect(new Set(routes.map((r) => r.id)).size).toBe(routes.length);
  });

  it("hands the CSV writer a purpose that Excel would otherwise evaluate", () => {
    const { trips, settings } = messyDataset(SUNDAY);
    const schedule = settings.paySchedule;
    if (!schedule) throw new Error("messyDataset: expected a pay schedule");
    const range = periodContaining(schedule, SUNDAY);
    const rows = active(trips).filter((t) => isKeyInRange(t.dateKey, range));

    const csv = buildCsv(rows, { title: "Mileage Report", range, ownerName: settings.ownerName });

    // Neutralised with a leading apostrophe, and never emitted raw.
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).not.toContain(",=SUM(A1:A9)");
    // The quote/comma purpose survives RFC 4180 quoting intact…
    expect(csv).toContain('"Met w/ ""Big Mike"", signed contract"');
    // …and the emoji reaches the file unmangled.
    expect(csv).toContain(EMOJI_PURPOSE);
  });
});
