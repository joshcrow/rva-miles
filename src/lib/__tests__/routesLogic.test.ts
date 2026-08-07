import { describe, expect, it } from "vitest";
import type { Route, Settings, Trip } from "@/types";
import { addDaysKey, weekdayOfKey } from "../dates";
import { catchUpSuggestions, rankTiles, routeFromTrip, tripFromRoute } from "../routesLogic";

const TODAY = "2026-08-07"; // a Friday (weekdayOfKey === 5)

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: id("route"),
    from: { name: "Home" },
    to: { name: "Office" },
    distanceMiles: 10,
    timesUsed: 1,
    lastUsedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: id("trip"),
    dateKey: TODAY,
    from: { name: "Home" },
    to: { name: "Office" },
    distanceMiles: 10,
    ratePerMile: 0.7,
    source: "tile",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("rankTiles", () => {
  it("weights a trip 2x when it falls on today's weekday, within the 60d window", () => {
    const routeA = makeRoute();
    const routeB = makeRoute();
    // 14 days ago is also a Friday (14 is a multiple of 7) — weekday match.
    const trips = [
      makeTrip({ routeId: routeA.id, dateKey: addDaysKey(TODAY, -14) }),
      // 10 days ago: verify it's not Friday, then use it as a mismatch case.
      makeTrip({ routeId: routeB.id, dateKey: addDaysKey(TODAY, -10) }),
    ];
    expect(weekdayOfKey(addDaysKey(TODAY, -14))).toBe(weekdayOfKey(TODAY));
    expect(weekdayOfKey(addDaysKey(TODAY, -10))).not.toBe(weekdayOfKey(TODAY));

    const ranked = rankTiles([routeB, routeA], trips, TODAY);
    expect(ranked.map((r) => r.id)).toEqual([routeA.id, routeB.id]);
  });

  it("applies a 1.5x recency boost to a route used within the last 7 days", () => {
    const routeRecent = makeRoute();
    const routeStale = makeRoute();
    // Both trips land on a non-today weekday (so weekday weighting is equal, 1x each) —
    // isolates the recency boost as the only differentiator.
    const recentDay = addDaysKey(TODAY, -3);
    const staleDay = addDaysKey(TODAY, -30);
    expect(weekdayOfKey(recentDay)).not.toBe(weekdayOfKey(TODAY));
    expect(weekdayOfKey(staleDay)).not.toBe(weekdayOfKey(TODAY));

    const trips = [
      makeTrip({ routeId: routeRecent.id, dateKey: recentDay }),
      makeTrip({ routeId: routeStale.id, dateKey: staleDay }),
    ];

    const ranked = rankTiles([routeStale, routeRecent], trips, TODAY);
    expect(ranked.map((r) => r.id)).toEqual([routeRecent.id, routeStale.id]);
  });

  it("is a stable sort — equal-score routes keep their input order", () => {
    const routeX = makeRoute();
    const routeY = makeRoute();
    // No trips at all for either => both score 0.
    const ranked1 = rankTiles([routeX, routeY], [], TODAY);
    expect(ranked1.map((r) => r.id)).toEqual([routeX.id, routeY.id]);

    const ranked2 = rankTiles([routeY, routeX], [], TODAY);
    expect(ranked2.map((r) => r.id)).toEqual([routeY.id, routeX.id]);
  });

  it("excludes soft-deleted trips and trips outside the 60-day window", () => {
    const routeIgnored = makeRoute();
    const routeCounted = makeRoute();
    const trips = [
      // Outside the 60-day window.
      makeTrip({ routeId: routeIgnored.id, dateKey: addDaysKey(TODAY, -90) }),
      // Soft-deleted, otherwise valid.
      makeTrip({ routeId: routeIgnored.id, dateKey: addDaysKey(TODAY, -1), deletedAt: Date.now() }),
      // Valid, in-window, non-deleted.
      makeTrip({ routeId: routeCounted.id, dateKey: addDaysKey(TODAY, -1) }),
    ];
    const ranked = rankTiles([routeIgnored, routeCounted], trips, TODAY);
    expect(ranked.map((r) => r.id)).toEqual([routeCounted.id, routeIgnored.id]);
  });
});

describe("catchUpSuggestions", () => {
  it("never proposes today, and skips any day that already has a logged trip", () => {
    const routine = makeRoute();
    const yesterday = addDaysKey(TODAY, -1);
    // 3 uses on yesterday's weekday within 60d would normally qualify —
    // but yesterday already has a trip logged, so it must be skipped.
    const trips = [
      makeTrip({ dateKey: yesterday }), // any trip at all on that day disqualifies it
      makeTrip({ routeId: routine.id, dateKey: addDaysKey(yesterday, -7) }),
      makeTrip({ routeId: routine.id, dateKey: addDaysKey(yesterday, -14) }),
    ];
    const suggestions = catchUpSuggestions([routine], trips, TODAY);
    expect(suggestions.some((s) => s.dateKey === TODAY)).toBe(false);
    expect(suggestions.some((s) => s.dateKey === yesterday)).toBe(false);
  });

  it("proposes routes used >=2 times on the empty day's weekday in the last 60d, ordered by frequency and capped at 2", () => {
    const emptyDay = addDaysKey(TODAY, -7); // same weekday as today, itself has zero trips
    const routeTop = makeRoute();
    const routeMid = makeRoute();
    const routeLow = makeRoute(); // only 2 uses — should be dropped by the cap
    const routeUnqualified = makeRoute(); // only 1 use — below the >=2 threshold

    const trips: Trip[] = [];
    // routeTop: 4 historical uses on this weekday.
    for (let i = 1; i <= 4; i++) trips.push(makeTrip({ routeId: routeTop.id, dateKey: addDaysKey(emptyDay, -7 * i) }));
    // routeMid: 3 uses.
    for (let i = 1; i <= 3; i++) trips.push(makeTrip({ routeId: routeMid.id, dateKey: addDaysKey(emptyDay, -7 * i) }));
    // routeLow: 2 uses (qualifies, but capped out by top 2).
    for (let i = 1; i <= 2; i++) trips.push(makeTrip({ routeId: routeLow.id, dateKey: addDaysKey(emptyDay, -7 * i) }));
    // routeUnqualified: 1 use.
    trips.push(makeTrip({ routeId: routeUnqualified.id, dateKey: addDaysKey(emptyDay, -7) }));

    const suggestions = catchUpSuggestions(
      [routeTop, routeMid, routeLow, routeUnqualified],
      trips,
      TODAY,
    );
    const forEmptyDay = suggestions.filter((s) => s.dateKey === emptyDay);
    expect(forEmptyDay.map((s) => s.route.id)).toEqual([routeTop.id, routeMid.id]);
  });

  it("ignores historical uses older than the 60-day window", () => {
    const emptyDay = addDaysKey(TODAY, -2);
    const weekday = weekdayOfKey(emptyDay);
    const routeAncient = makeRoute();
    const trips: Trip[] = [];
    // 3 uses on the right weekday, but all well outside 60 days — should not qualify.
    for (let i = 1; i <= 3; i++) {
      const dateKey = addDaysKey(emptyDay, -(70 + i * 7));
      expect(weekdayOfKey(dateKey)).toBe(weekday);
      trips.push(makeTrip({ routeId: routeAncient.id, dateKey }));
    }
    const suggestions = catchUpSuggestions([routeAncient], trips, TODAY);
    expect(suggestions.some((s) => s.dateKey === emptyDay)).toBe(false);
  });

  it("respects a custom lookbackDays, and filters archived/deleted routes out of otherwise-qualifying suggestions", () => {
    const day1 = addDaysKey(TODAY, -1);
    const day8 = addDaysKey(TODAY, -8); // 8 % 7 === 1, so same weekday as day1 — but outside a lookback of 7
    const routeArchived = makeRoute({ archived: true });
    const routeDeleted = makeRoute({ deletedAt: Date.now() });
    const routeLive = makeRoute();
    // All three routes get 2 historical uses on day1's weekday within 60d
    // (some land exactly on day8's date — irrelevant, it's evaluated as
    // history here, not as a candidate day).
    const trips = [
      makeTrip({ routeId: routeArchived.id, dateKey: addDaysKey(day1, -7) }),
      makeTrip({ routeId: routeArchived.id, dateKey: addDaysKey(day1, -14) }),
      makeTrip({ routeId: routeDeleted.id, dateKey: addDaysKey(day1, -7) }),
      makeTrip({ routeId: routeDeleted.id, dateKey: addDaysKey(day1, -14) }),
      makeTrip({ routeId: routeLive.id, dateKey: addDaysKey(day1, -14) }),
      makeTrip({ routeId: routeLive.id, dateKey: addDaysKey(day1, -21) }),
    ];
    const suggestions = catchUpSuggestions([routeArchived, routeDeleted, routeLive], trips, TODAY, 7);
    const forDay1 = suggestions.filter((s) => s.dateKey === day1);
    // routeArchived/routeDeleted qualify by usage count alone but must be filtered out.
    expect(forDay1.map((s) => s.route.id)).toEqual([routeLive.id]);
    // day8 itself is outside the 7-day lookback, so it's never a candidate day.
    expect(suggestions.some((s) => s.dateKey === day8)).toBe(false);
  });
});

describe("routeFromTrip", () => {
  it("halves the distance when the source trip was a round trip", () => {
    const trip = makeTrip({ distanceMiles: 20, roundTrip: true, purpose: "Client visit" });
    const route = routeFromTrip(trip);
    expect(route.distanceMiles).toBe(10);
    expect(route.defaultRoundTrip).toBe(true);
    expect(route.defaultPurpose).toBe("Client visit");
    expect(route.timesUsed).toBe(1);
  });

  it("keeps distance as-is for a one-way trip", () => {
    const trip = makeTrip({ distanceMiles: 12, roundTrip: false });
    const route = routeFromTrip(trip);
    expect(route.distanceMiles).toBe(12);
  });
});

describe("tripFromRoute", () => {
  const settings: Settings = { ratePerMile: 0.72, vehicle: "Honda Civic", theme: "system" };

  it("doubles the distance for a default-round-trip route and snapshots rate/vehicle from settings", () => {
    const route = makeRoute({ distanceMiles: 8, defaultRoundTrip: true, defaultPurpose: "Site visit" });
    const trip = tripFromRoute(route, TODAY, settings);
    expect(trip.distanceMiles).toBe(16);
    expect(trip.ratePerMile).toBe(0.72);
    expect(trip.vehicle).toBe("Honda Civic");
    expect(trip.purpose).toBe("Site visit");
    expect(trip.source).toBe("tile");
    expect(trip.routeId).toBe(route.id);
    expect(trip.dateKey).toBe(TODAY);
  });

  it("does not double the distance for a one-way route", () => {
    const route = makeRoute({ distanceMiles: 8, defaultRoundTrip: false });
    const trip = tripFromRoute(route, TODAY, settings);
    expect(trip.distanceMiles).toBe(8);
  });
});
