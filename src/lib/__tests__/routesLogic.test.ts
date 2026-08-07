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

  it("requires evidence from >=2 distinct dates — multiple same-day trips don't count twice", () => {
    const emptyDay = addDaysKey(TODAY, -7); // same weekday as TODAY, itself empty
    const routeDuplicateDay = makeRoute(); // 2 trips, but logged on the SAME calendar date
    const routeDistinctDays = makeRoute(); // 2 trips on 2 different calendar dates
    const sameDate = addDaysKey(emptyDay, -7);

    const trips = [
      // Same-day double-logging: 2 trips, 1 distinct dateKey. Must NOT qualify.
      makeTrip({ routeId: routeDuplicateDay.id, dateKey: sameDate }),
      makeTrip({ routeId: routeDuplicateDay.id, dateKey: sameDate }),
      // 2 trips across 2 different weeks on the same weekday. Must qualify.
      makeTrip({ routeId: routeDistinctDays.id, dateKey: addDaysKey(emptyDay, -7) }),
      makeTrip({ routeId: routeDistinctDays.id, dateKey: addDaysKey(emptyDay, -14) }),
    ];

    const suggestions = catchUpSuggestions([routeDuplicateDay, routeDistinctDays], trips, TODAY);
    const forEmptyDay = suggestions.filter((s) => s.dateKey === emptyDay);
    expect(forEmptyDay.map((s) => s.route.id)).toEqual([routeDistinctDays.id]);
  });

  it("never proposes a dateKey earlier than the earliest non-deleted trip's dateKey", () => {
    const routeA = makeRoute();
    const firstTripDate = addDaysKey(TODAY, -14); // the user's very first-ever trip
    const secondEvidenceDate = addDaysKey(TODAY, -7); // a 2nd distinct date, same weekday
    const candidateDay = addDaysKey(TODAY, -21); // same weekday again, but predates the first trip
    expect(weekdayOfKey(firstTripDate)).toBe(weekdayOfKey(TODAY));
    expect(weekdayOfKey(secondEvidenceDate)).toBe(weekdayOfKey(TODAY));
    expect(weekdayOfKey(candidateDay)).toBe(weekdayOfKey(TODAY));

    const trips = [
      // 2 distinct-date uses on this weekday — would otherwise be "usual" evidence.
      makeTrip({ routeId: routeA.id, dateKey: firstTripDate }),
      makeTrip({ routeId: routeA.id, dateKey: secondEvidenceDate }),
    ];

    // Use a lookback long enough to reach candidateDay (21 days back).
    const suggestions = catchUpSuggestions([routeA], trips, TODAY, 25);
    expect(suggestions.some((s) => s.dateKey === candidateDay)).toBe(false);
  });

  it("returns no suggestions at all when there are no trips logged yet", () => {
    const routeA = makeRoute();
    expect(catchUpSuggestions([routeA], [], TODAY)).toEqual([]);
  });

  it("regression: a brand-new user with one route and two same-day trips gets no suggestions", () => {
    // Reproduces the reported defect: a first-time user logs the same route
    // twice on their first day. That must not be read as a weekly habit, and
    // the app must not propose any day before that first trip existed.
    const routeA = makeRoute();
    const trips = [
      makeTrip({ routeId: routeA.id, dateKey: TODAY }),
      makeTrip({ routeId: routeA.id, dateKey: TODAY }),
    ];
    const suggestions = catchUpSuggestions([routeA], trips, TODAY);
    expect(suggestions).toEqual([]);
  });

  it("proposes routes used on >=2 distinct dates on the empty day's weekday in the last 60d, ordered by frequency and capped at 2", () => {
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
