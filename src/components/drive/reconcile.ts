// Pure decision logic for the stop sheet's GPS-vs-road-route reconciliation.
// This decides what number gets billed, so it lives outside the component and
// is unit tested.

import type { LatLng } from "@/types";
import { haversineMiles } from "@/lib/geo";

/** Start and end this close together means the track already includes the return leg. */
export const LOOP_RADIUS_MILES = 0.25;
/** A loop needs some actual driving behind it — otherwise it's just a non-trip. */
export const LOOP_MIN_MILES = 0.5;
/** Below this the two figures are the same number to a driver; show one. */
export const RECONCILE_EPSILON_MILES = 0.1;
/** A road route this far off the GPS measurement wins by default. */
export const RECONCILE_PREFER_ROUTE_RATIO = 0.1;

export type DistanceSource = "gps" | "route";

export interface DriveShape {
  straightLineMiles: number;
  /** Ended where it started: routing A→A would return ~0 and under-bill. */
  isLoop: boolean;
  /** Safe to ask OSRM for a road distance between the endpoints. */
  canReconcile: boolean;
}

export function analyzeShape(gpsMiles: number, from?: LatLng, to?: LatLng): DriveShape {
  if (!from || !to) {
    return { straightLineMiles: 0, isLoop: false, canReconcile: false };
  }
  const straightLineMiles = haversineMiles(from, to);
  return {
    straightLineMiles,
    isLoop: straightLineMiles < LOOP_RADIUS_MILES && gpsMiles > LOOP_MIN_MILES,
    canReconcile: straightLineMiles >= LOOP_RADIUS_MILES,
  };
}

/** The road route is the default only when it disagrees with GPS by more than 10%. */
export function shouldPreferRoute(gpsMiles: number, roadMiles: number): boolean {
  const drift = Math.abs(roadMiles - gpsMiles) / Math.max(gpsMiles, 0.01);
  return drift > RECONCILE_PREFER_ROUTE_RATIO;
}

/** Two figures are only worth a choice when they actually read differently. */
export function shouldOfferChoice(gpsMiles: number, roadMiles: number | null): boolean {
  if (roadMiles == null) return false;
  return Math.abs(roadMiles - gpsMiles) >= RECONCILE_EPSILON_MILES;
}

/**
 * The billed figure. A loop's measurement already contains the return leg, so
 * the round-trip flag must NOT double it — doing so would bill the drive home
 * twice. On a one-way track the flag means "I drove back untracked", which
 * does double.
 */
export function billedMiles(args: {
  gpsMiles: number;
  roadMiles: number | null;
  source: DistanceSource;
  roundTrip: boolean;
  isLoop: boolean;
}): number {
  const { gpsMiles, roadMiles, source, roundTrip, isLoop } = args;
  const base = source === "route" && roadMiles != null ? roadMiles : gpsMiles;
  return !isLoop && roundTrip ? base * 2 : base;
}
