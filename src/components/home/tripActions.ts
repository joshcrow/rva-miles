// Pure builders shared by the tile-tap, catch-up, and new-trip paths.
// Nothing here touches the database — HomeScreen owns persistence so every
// write funnels through one optimistic-with-loud-errors code path.

import type { Place, Route, Settings, Trip } from "@/types";
import { newId } from "@/lib/ids";
import { tripFromRoute } from "@/lib/routesLogic";
import { placeKey } from "./format";

export { newId };

/**
 * Query param the trips ledger uses to hand a trip back to the home screen for
 * "Continue from here" (`/?continue=<tripId>`). Home reads it once on mount,
 * opens the new-trip sheet with From prefilled to that trip's destination, and
 * strips the param so a reload doesn't reopen the sheet. Shared as a constant
 * so a typo on either side can't silently turn the action into a no-op.
 */
export const CONTINUE_TRIP_PARAM = "continue";

export function routeMatchKey(from: Place, to: Place): string {
  return `${placeKey(from)}>${placeKey(to)}`;
}

export function findMatchingRoute(routes: Route[], from: Place, to: Place): Route | undefined {
  const key = routeMatchKey(from, to);
  return routes.find((r) => routeMatchKey(r.from, r.to) === key);
}

export function buildTripFromRoute(route: Route, dateKey: string, settings: Settings): Trip {
  const now = Date.now();
  return { ...tripFromRoute(route, dateKey, settings), id: newId(), createdAt: now, updatedAt: now };
}

/** Route counters after a trip was logged from it. */
export function bumpRoute(route: Route, at: number): Route {
  return { ...route, timesUsed: route.timesUsed + 1, lastUsedAt: at, updatedAt: at };
}
