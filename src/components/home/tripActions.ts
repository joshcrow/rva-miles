// Pure builders shared by the tile-tap, catch-up, and new-trip paths.
// Nothing here touches the database — HomeScreen owns persistence so every
// write funnels through one optimistic-with-loud-errors code path.

import type { Place, Route, Settings, Trip } from "@/types";
import { newId } from "@/lib/ids";
import { tripFromRoute } from "@/lib/routesLogic";
import { placeKey } from "./format";

export { newId };

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
