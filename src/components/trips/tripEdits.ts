// Pure trip-mutation builders for the ledger screen. Nothing here touches
// storage — TripsScreen owns persistence so every write funnels through one
// optimistic-with-loud-errors code path (same shape as home/tripActions.ts).

import type { Trip } from "@/types";
import { newId } from "@/lib/ids";

export { newId };

/**
 * "Repeat today": a fresh trip cloned from `original` onto today's dateKey,
 * re-priced at the CURRENT default rate (never the original's stale rate —
 * that's the whole point of a per-trip rate snapshot). Distance, purpose,
 * endpoints, vehicle and round-trip flag carry over verbatim.
 */
export function buildRepeatTrip(original: Trip, todayKey: string, ratePerMile: number, now: number): Trip {
  return {
    id: newId(),
    dateKey: todayKey,
    from: original.from,
    to: original.to,
    distanceMiles: original.distanceMiles,
    roundTrip: original.roundTrip,
    purpose: original.purpose,
    vehicle: original.vehicle,
    ratePerMile,
    routeId: original.routeId,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export interface TripEditForm {
  dateKey: string;
  fromName: string;
  toName: string;
  purpose: string;
  /** Raw text as typed — never silently reformatted by unrelated field edits. */
  distance: string;
  rate: string;
  roundTrip: boolean;
  vehicle: string;
}

export function formFromTrip(t: Trip): TripEditForm {
  return {
    dateKey: t.dateKey,
    fromName: t.from.name ?? "",
    toName: t.to.name ?? "",
    purpose: t.purpose ?? "",
    distance: t.distanceMiles.toFixed(1),
    rate: String(t.ratePerMile),
    roundTrip: Boolean(t.roundTrip),
    vehicle: t.vehicle ?? "",
  };
}

function safeParse(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Builds the saved Trip from the edit form. Numeric fields fall back to the
 * original's value on unparsable input rather than coercing to zero/NaN —
 * the UI gates the Save button on validity, this is defense in depth only.
 */
export function applyTripEdit(original: Trip, form: TripEditForm, now: number): Trip {
  return {
    ...original,
    dateKey: form.dateKey || original.dateKey,
    from: { ...original.from, name: form.fromName.trim() || undefined },
    to: { ...original.to, name: form.toName.trim() || undefined },
    purpose: form.purpose.trim() || undefined,
    distanceMiles: safeParse(form.distance, original.distanceMiles),
    ratePerMile: safeParse(form.rate, original.ratePerMile),
    roundTrip: form.roundTrip || undefined,
    vehicle: form.vehicle.trim() || undefined,
    updatedAt: now,
  };
}
