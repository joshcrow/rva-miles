// Pure helpers for multi-leg stop journeys — e.g. Richmond home → family
// house in Crozet (personal, unbilled) → Charlottesville work site (billed),
// possibly hours apart. Nothing here recomputes `trip.distanceMiles`: that
// field is set once at logging time (sum of billable legs, or the user's
// chosen direct-route figure) and stays the single authoritative number every
// other surface — exports, reports, the shared link — trusts. These helpers
// only derive DISPLAY text and read-only summaries from `legs`.

import type { Place, Trip, TripLeg } from "@/types";

function legPlaceLabel(p: Place | undefined): string {
  if (!p) return "";
  const name = p.name?.trim();
  if (name) return name;
  const address = p.address?.trim();
  if (address) return address;
  if (p.latLng) return `${p.latLng.lat.toFixed(4)}, ${p.latLng.lng.toFixed(4)}`;
  return "";
}

/** Sum of `distanceMiles` across only the legs marked `billable`. 0 for no/empty legs. */
export function billableMiles(legs: TripLeg[] | undefined): number {
  if (!legs || legs.length === 0) return 0;
  return legs.reduce((sum, leg) => (leg.billable ? sum + leg.distanceMiles : sum), 0);
}

/**
 * Comma-separated names of the INTERMEDIATE stops only — every leg boundary
 * except the very first origin and the very final destination. A journey
 * with N legs has N+1 points (origin, N-1 intermediate stops, destination);
 * this returns the middle N-1. Empty for 0 or 1 legs (no via to speak of).
 */
export function viaLabel(legs: TripLeg[] | undefined): string {
  if (!legs || legs.length < 2) return "";
  // Every leg's `to` except the last leg's `to` (the final destination) is
  // an intermediate stop — equivalently, every leg's `from` except the first.
  return legs
    .slice(0, -1)
    .map((leg) => legPlaceLabel(leg.to))
    .filter(Boolean)
    .join(", ");
}

/** "Charlottesville site (via Crozet)" for a multi-stop trip, else the plain to-label. */
export function routeText(trip: Trip): string {
  const to = legPlaceLabel(trip.to);
  const via = viaLabel(trip.legs);
  return via ? `${to} (via ${via})` : to;
}

/** "2 of 3 legs billed" — empty string when the trip has no legs to summarize. */
export function legsSummary(trip: Trip): string {
  const legs = trip.legs;
  if (!legs || legs.length === 0) return "";
  const billedCount = legs.filter((l) => l.billable).length;
  return `${billedCount} of ${legs.length} leg${legs.length === 1 ? "" : "s"} billed`;
}
