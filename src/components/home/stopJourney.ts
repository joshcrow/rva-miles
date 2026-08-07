// Pure segment math for the multi-leg "stop journey" in NewTripSheet — e.g.
// Richmond home → family house in Crozet (personal, unbilled) → Charlottesville
// work site (billed). Nothing here touches the network or the database; the
// sheet owns both.
//
// The rule that matters for money: a distance measured for one pair of places
// must NEVER survive onto a different pair. `rebuildSegs` is the only thing
// that decides which numbers carry over when she edits an endpoint, adds a
// stop, or removes one, and it resets everything it isn't certain about.

import type { Place, TripLeg } from "@/types";
import { roundTo } from "@/lib/money";
import { placeKey, placeLabel } from "./format";

/** A journey point that may not be filled in yet. */
export type Pt = Place | null;

export type SegStatus =
  /** No road route possible (a free-text place) — she types the miles. */
  | "idle"
  /** Endpoints just became routable; the sheet's effect will fetch. */
  | "queued"
  | "resolving"
  | "resolved"
  /** Routing service unreachable — falls back to manual entry, never blocks. */
  | "unavailable";

export interface Seg {
  /** Identity of the endpoint pair these numbers belong to. */
  key: string;
  /** Raw text as typed/resolved — never reformatted by an unrelated edit. */
  distance: string;
  status: SegStatus;
  billable: boolean;
}

/** Direction-sensitive identity for one leg's endpoints. */
export function pairKey(a: Pt, b: Pt): string {
  return `${placeKey(a ?? undefined)}>${placeKey(b ?? undefined)}`;
}

/** True when both ends carry a map pin, so a road route can be requested. */
export function routable(a: Pt, b: Pt): boolean {
  return Boolean(a?.latLng && b?.latLng);
}

/**
 * One segment per consecutive point pair. A segment whose endpoints are
 * unchanged keeps its numbers; every other one is reset to empty. Only the
 * billable switch carries over by position, because that is a stated intent
 * ("the middle hop is personal") rather than a measurement.
 */
export function rebuildSegs(prev: Seg[], points: Pt[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const key = pairKey(a, b);
    const old = prev[i];
    if (old && old.key === key) {
      out.push(old);
      continue;
    }
    out.push({
      key,
      distance: "",
      status: routable(a, b) ? "queued" : "idle",
      billable: old?.billable ?? true,
    });
  }
  return out;
}

/** Each segment's typed distance as a number; NaN where it isn't a number yet. */
export function segMilesOf(segs: Seg[]): number[] {
  return segs.map((s) => Number.parseFloat(s.distance));
}

/** A leg's miles for the record: 0 for a blank or unusable field, never NaN. */
export function legMiles(seg: Seg): number {
  const n = Number.parseFloat(seg.distance);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * The gate on logging: every leg that will be BILLED needs a real, positive
 * distance. A leg switched to personal may be left blank — it contributes
 * nothing to the reimbursement, and refusing to log a work drive over a
 * number that doesn't affect the money (routing down, no map pin on the
 * family house) would be the wrong trade. The plain one-leg trip is always
 * billable, so it still requires its distance exactly as before.
 */
export function everyLegMeasured(segs: Seg[]): boolean {
  if (segs.length === 0) return false;
  return segs.every((s) => {
    const n = Number.parseFloat(s.distance);
    if (s.billable) return Number.isFinite(n) && n > 0;
    return s.distance.trim() === "" || (Number.isFinite(n) && n >= 0);
  });
}

/**
 * The billed total: the sum of the legs whose switch is on, rounded once to
 * the tenth the app displays. Unmeasured legs contribute nothing rather than
 * poisoning the sum with NaN.
 */
export function billedFromSegs(segs: Seg[]): number {
  const miles = segMilesOf(segs);
  const sum = segs.reduce(
    (acc, s, i) => (s.billable && Number.isFinite(miles[i]) ? acc + miles[i] : acc),
    0,
  );
  return roundTo(sum, 1);
}

/**
 * The ordered leg records written onto the Trip. Returns null unless every
 * point is filled and every leg measured — a half-built journey is never
 * persisted.
 */
export function buildLegs(points: Pt[], segs: Seg[]): TripLeg[] | null {
  if (points.length < 3) return null; // fewer than two legs is not a stop journey
  if (segs.length !== points.length - 1) return null;
  if (!everyLegMeasured(segs)) return null;
  const filled = points.filter((p): p is Place => Boolean(p));
  if (filled.length !== points.length) return null;

  return segs.map((s, i) => ({
    from: filled[i],
    to: filled[i + 1],
    distanceMiles: legMiles(s),
    billable: s.billable,
  }));
}

/** "Crozet" / "Stop 1" / "Destination" — a leg label that reads before it's filled. */
export function pointLabel(p: Pt, index: number, total: number): string {
  if (p) return placeLabel(p);
  if (index === 0) return "Start";
  if (index === total - 1) return "Destination";
  return `Stop ${index}`;
}
