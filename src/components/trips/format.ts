// Presentation helpers for the trips ledger.

import type { Place } from "@/types";

// Miles/money arithmetic and formatting live in one place so a month total
// here can never disagree with the same trips totalled on Home or in a report.
export { fmtMiles, fmtMoney, tripAmount, totalsOf, type Totals } from "@/lib/money";

export function placeLabel(p?: Place): string {
  if (!p) return "Unknown";
  const name = p.name?.trim();
  if (name) return name;
  const address = p.address?.trim();
  if (address) return address.split(",")[0].trim() || address;
  if (p.latLng) return `${p.latLng.lat.toFixed(3)}, ${p.latLng.lng.toFixed(3)}`;
  return "Unknown";
}

export function pluralTrips(n: number): string {
  return n === 1 ? "1 trip" : `${n} trips`;
}
