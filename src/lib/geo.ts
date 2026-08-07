// Pure GPS geometry: distance, fix acceptance/noise filtering, track
// simplification, and polyline encoding. No I/O, no browser APIs — every
// export here is a plain function, safe to unit test without jsdom.

import simplify from "simplify-js";
import { decode, encode } from "@googlemaps/polyline-codec";
import type { GpsPoint, LatLng } from "@/types";

const EARTH_RADIUS_MILES = 3958.7613;
const MILES_TO_METERS = 1609.344;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in miles (spherical-earth haversine). */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(Math.min(1, h)));
}

const MAX_ACCURACY_M = 35;
const MAX_SPEED_MPH = 100;
const DEFAULT_ACCURACY_M = 20;

/**
 * Gates a raw GPS fix before it's allowed to move the odometer. Three
 * independent rejection reasons (v1 had none of these, hence stationary
 * jitter inflating billed miles):
 *  - the fix itself is too imprecise to trust
 *  - the implied movement is smaller than the combined accuracy "noise
 *    floor" of the two fixes, i.e. indistinguishable from standing still
 *  - the implied speed is faster than a car can plausibly go (a jump most
 *    likely caused by a bad fix, not real travel)
 */
export function acceptFix(prev: GpsPoint | undefined, next: GpsPoint): boolean {
  if ((next.accuracy ?? 0) > MAX_ACCURACY_M) return false;
  if (!prev) return true;

  const stepMeters = haversineMiles(prev, next) * MILES_TO_METERS;
  const noiseFloorMeters = 2 * ((prev.accuracy ?? DEFAULT_ACCURACY_M) + (next.accuracy ?? DEFAULT_ACCURACY_M));
  if (stepMeters < noiseFloorMeters) return false;

  const dtHours = (next.timestamp - prev.timestamp) / 3_600_000;
  if (dtHours <= 0) return false; // non-monotonic/duplicate timestamp — can't judge speed, treat as noise
  const impliedMph = stepMeters / MILES_TO_METERS / dtHours;
  if (impliedMph > MAX_SPEED_MPH) return false;

  return true;
}

const DEFAULT_SIMPLIFY_TOLERANCE = 0.0001;

interface SimplifyPoint {
  x: number;
  y: number;
  i: number;
}

/**
 * Douglas-Peucker simplification (via simplify-js) for compact storage of a
 * drive's track. simplify-js operates in plain x/y space, so points are
 * mapped x=lng, y=lat; the `i` tag round-trips back to original GpsPoints
 * (with their timestamp/accuracy) by index rather than by object identity.
 */
export function simplifyTrack(points: GpsPoint[], tolerance = DEFAULT_SIMPLIFY_TOLERANCE): GpsPoint[] {
  if (points.length <= 2) return points;
  const mapped: SimplifyPoint[] = points.map((p, i) => ({ x: p.lng, y: p.lat, i }));
  const kept = simplify(mapped, tolerance, true) as SimplifyPoint[];
  const keepIndices = new Set(kept.map((p) => p.i));
  return points.filter((_, i) => keepIndices.has(i));
}

/** Encodes a track as a Google-polyline-algorithm string (precision 5). */
export function encodeTrack(points: GpsPoint[]): string {
  return encode(points.map((p) => [p.lat, p.lng]));
}

/** Decodes a Google-polyline-algorithm string back to plain lat/lng pairs. */
export function decodeTrack(s: string): LatLng[] {
  return decode(s).map(([lat, lng]) => ({ lat, lng }));
}
