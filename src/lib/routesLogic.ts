// Route "tile" ranking, catch-up detection, and Trip <-> Route conversion.
// Pure functions only — callers (home screen, catch-up banner) own I/O.

import type { Route, Settings, Trip } from "@/types";
import { addDaysKey, compareKeys, weekdayOfKey } from "./dates";

const RANK_WINDOW_DAYS = 60;
const RECENCY_BOOST_WINDOW_DAYS = 7;
const WEEKDAY_MATCH_WEIGHT = 2;
const RECENCY_BOOST_MULTIPLIER = 1.5;
const MIN_WEEKDAY_USES_FOR_CATCHUP = 2;
const MAX_CATCHUP_SUGGESTIONS_PER_DAY = 2;
const DEFAULT_CATCHUP_LOOKBACK_DAYS = 7;

/** Inclusive n-day window ending at (and including) todayKey. */
function isWithinLastNDays(key: string, todayKey: string, n: number): boolean {
  const cutoff = addDaysKey(todayKey, -(n - 1));
  return compareKeys(key, cutoff) >= 0 && compareKeys(key, todayKey) <= 0;
}

/**
 * Ranks route tiles for the home-screen grid. Score = sum over each
 * matching trip in the last 60 days of (2x if that trip fell on today's
 * weekday, else 1x), then the whole score is boosted 1.5x if the route was
 * used at all in the last 7 days. `Array#sort` is stable (ES2019+), so
 * equal-score routes keep their input order — no separate tie-break needed.
 * Callers apply any display cap themselves.
 */
export function rankTiles(routes: Route[], trips: Trip[], todayKey: string): Route[] {
  const todayWeekday = weekdayOfKey(todayKey);

  const scored = routes.map((route) => {
    let score = 0;
    let usedInLast7Days = false;
    for (const trip of trips) {
      if (trip.deletedAt || trip.routeId !== route.id) continue;
      if (!isWithinLastNDays(trip.dateKey, todayKey, RANK_WINDOW_DAYS)) continue;
      score += weekdayOfKey(trip.dateKey) === todayWeekday ? WEEKDAY_MATCH_WEIGHT : 1;
      if (isWithinLastNDays(trip.dateKey, todayKey, RECENCY_BOOST_WINDOW_DAYS)) usedInLast7Days = true;
    }
    if (usedInLast7Days) score *= RECENCY_BOOST_MULTIPLIER;
    return { route, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.route);
}

/**
 * Finds weekdays in the last `lookbackDays` (default 7, today excluded)
 * with zero non-deleted trips logged, and proposes the routes historically
 * usual for that weekday — those used at least twice on that weekday within
 * the last 60 days — capped at 2 suggestions per empty day, most-used first.
 */
export function catchUpSuggestions(
  routes: Route[],
  trips: Trip[],
  todayKey: string,
  lookbackDays: number = DEFAULT_CATCHUP_LOOKBACK_DAYS,
): Array<{ dateKey: string; route: Route }> {
  const activeTrips = trips.filter((t) => !t.deletedAt);
  const routesById = new Map(routes.map((r) => [r.id, r]));
  const results: Array<{ dateKey: string; route: Route }> = [];

  for (let i = 1; i <= lookbackDays; i++) {
    const dateKey = addDaysKey(todayKey, -i);
    const alreadyLogged = activeTrips.some((t) => t.dateKey === dateKey);
    if (alreadyLogged) continue;

    const weekday = weekdayOfKey(dateKey);
    const usesByRouteId = new Map<string, number>();
    for (const trip of activeTrips) {
      if (!trip.routeId) continue;
      if (weekdayOfKey(trip.dateKey) !== weekday) continue;
      if (!isWithinLastNDays(trip.dateKey, todayKey, RANK_WINDOW_DAYS)) continue;
      usesByRouteId.set(trip.routeId, (usesByRouteId.get(trip.routeId) ?? 0) + 1);
    }

    const usual = Array.from(usesByRouteId.entries())
      .filter(([, count]) => count >= MIN_WEEKDAY_USES_FOR_CATCHUP)
      .map(([routeId, count]) => ({ route: routesById.get(routeId), count }))
      .filter((x): x is { route: Route; count: number } => x.route != null && !x.route.archived && !x.route.deletedAt)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_CATCHUP_SUGGESTIONS_PER_DAY);

    for (const { route } of usual) results.push({ dateKey, route });
  }

  return results;
}

/** Promotes a logged trip into a reusable route tile (one-way distance, even if the trip itself was round trip). */
export function routeFromTrip(t: Trip): Omit<Route, "id" | "createdAt" | "updatedAt"> {
  return {
    from: t.from,
    to: t.to,
    distanceMiles: t.roundTrip ? t.distanceMiles / 2 : t.distanceMiles,
    defaultPurpose: t.purpose,
    defaultRoundTrip: t.roundTrip,
    timesUsed: 1,
    lastUsedAt: t.startTime ?? t.createdAt,
  };
}

/** Logs today's (or any) trip from a route tile — the one-tap-repeat path. */
export function tripFromRoute(r: Route, dateKey: string, settings: Settings): Omit<Trip, "id" | "createdAt" | "updatedAt"> {
  return {
    dateKey,
    from: r.from,
    to: r.to,
    distanceMiles: r.defaultRoundTrip ? r.distanceMiles * 2 : r.distanceMiles,
    roundTrip: r.defaultRoundTrip,
    purpose: r.defaultPurpose,
    vehicle: settings.vehicle,
    ratePerMile: settings.ratePerMile,
    routeId: r.id,
    source: "tile",
  };
}
