import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { demoDataset } from "../demo";
import { addDaysKey, compareKeys, isKeyInRange } from "../dates";
import { decodeTrack } from "../geo";
import { billableMiles } from "../legs";
import { periodContaining } from "../periods";
import { catchUpSuggestions } from "../routesLogic";

// The dataset is generated relative to whatever day demo mode is entered, so
// every guarantee below is checked on all seven weekdays. A staging that only
// works on a Tuesday is a staging that will embarrass the demo on a Saturday.
const SUNDAY = "2026-08-09";
const WEEK = [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysKey(SUNDAY, i));

function stopTrip(trips: Trip[]): Trip {
  const found = trips.find((t) => t.legs && t.legs.length > 1);
  if (!found) throw new Error("demoDataset: expected a multi-leg trip");
  return found;
}

describe.each(WEEK)("demoDataset(%s)", (today) => {
  const { trips, routes, settings } = demoDataset(today);

  it("stages enough history to fill every screen", () => {
    expect(trips.length).toBeGreaterThanOrEqual(30);
    expect(routes).toHaveLength(5);
    // Non-alphabetical tile ranking needs genuinely different usage counts.
    expect(new Set(routes.map((r) => r.timesUsed)).size).toBeGreaterThan(2);
    for (const route of routes) {
      expect(route.timesUsed).toBe(trips.filter((t) => t.routeId === route.id).length);
    }
  });

  it("never logs a trip in the future", () => {
    for (const trip of trips) {
      expect(compareKeys(trip.dateKey, today)).toBeLessThanOrEqual(0);
    }
  });

  it("puts the pay period well under way, with a report worth reviewing", () => {
    const schedule = settings.paySchedule;
    expect(schedule?.frequency).toBe("biweekly");
    if (!schedule) throw new Error("demoDataset: expected a pay schedule");

    const period = periodContaining(schedule, today);
    // Today sits inside the period, at neither edge.
    expect(compareKeys(period.startKey, today)).toBeLessThan(0);
    expect(compareKeys(period.endKey, today)).toBeGreaterThan(0);

    const inPeriod = trips.filter((t) => isKeyInRange(t.dateKey, period));
    // Report collapses the trip table above five rows; ten is comfortably past.
    expect(inPeriod.length).toBeGreaterThanOrEqual(10);
  });

  it("bills only the billed legs of the stop journey", () => {
    const trip = stopTrip(trips);
    expect(trip.distanceMiles).toBeCloseTo(billableMiles(trip.legs), 5);
    // The direct-route figure is carried but never billed.
    expect(trip.directMiles).toBeGreaterThan(trip.distanceMiles);
  });

  it("leaves real gaps, so catch-up fires with real suggestions", () => {
    const suggestions = catchUpSuggestions(routes, trips, today);
    expect(suggestions.length).toBeGreaterThan(0);

    for (const { dateKey, route } of suggestions) {
      // Proposed for a day inside the lookback window that holds nothing…
      expect(compareKeys(dateKey, addDaysKey(today, -7))).toBeGreaterThanOrEqual(0);
      expect(compareKeys(dateKey, today)).toBeLessThan(0);
      expect(trips.some((t) => t.dateKey === dateKey)).toBe(false);
      // …and proposed from a route that is genuinely offerable.
      expect(routes.some((r) => r.id === route.id)).toBe(true);
    }
  });

  it("keeps last year's rate on the oldest trips", () => {
    const legacy = trips.filter((t) => t.ratePerMile === 0.7);
    expect(legacy).toHaveLength(3);
    expect(trips.filter((t) => t.ratePerMile === 0.725)).toHaveLength(trips.length - 3);

    // "Oldest" must actually be oldest, or the point about snapshots is lost.
    const newest = trips.filter((t) => t.ratePerMile !== 0.7);
    const oldestFullRate = newest.reduce(
      (min, t) => (compareKeys(t.dateKey, min) < 0 ? t.dateKey : min),
      newest[0].dateKey,
    );
    for (const t of legacy) {
      expect(compareKeys(t.dateKey, oldestFullRate)).toBeLessThanOrEqual(0);
    }
  });

  it("carries the states the demo exists to show", () => {
    expect(settings.ownerName).toBe("Dana Calloway");
    expect(settings.ratePerMile).toBe(0.725);
    expect(settings.reportRecipient?.email).toBe("manager@example.com");
    // Unset on purpose: the one-time route-tap lesson is demoable…
    expect(settings.routeTapEducatedAt).toBeUndefined();
    // …and the backup nudge only speaks above ten trips with no backup.
    expect(settings.lastBackupAt).toBeUndefined();
    expect(trips.length).toBeGreaterThan(10);

    const gps = trips.filter((t) => t.source === "gps");
    expect(gps).toHaveLength(1);
    expect(gps[0].gpsDistanceMiles).toBeGreaterThan(gps[0].distanceMiles);
    expect(decodeTrack(gps[0].polyline ?? "").length).toBeGreaterThan(3);

    expect(trips.filter((t) => t.source === "migrated")).toHaveLength(2);
  });
});

describe("demoDataset", () => {
  it("is pure — the same day always produces the same ledger", () => {
    expect(demoDataset(SUNDAY)).toEqual(demoDataset(SUNDAY));
  });

  it("gives every record a stable, unique id", () => {
    const { trips, routes } = demoDataset(SUNDAY);
    expect(new Set(trips.map((t) => t.id)).size).toBe(trips.length);
    expect(new Set(routes.map((r) => r.id)).size).toBe(routes.length);
  });

  it("spans at least three calendar months, so the month navigator has somewhere to go", () => {
    const { trips } = demoDataset(SUNDAY);
    const months = new Set(trips.map((t) => t.dateKey.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(3);
  });
});
