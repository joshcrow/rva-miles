// Presentation helpers for the home screen. Number formatting is done by hand
// (not toLocaleString) so server and client render byte-identical strings.

import type { DateRange, Place } from "@/types";
import { formatKey } from "@/lib/dates";

// Miles/money arithmetic and formatting live in one place so this screen's
// period total can never disagree with the report the user sends.
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

/** Secondary line: the address, but never a duplicate of the primary label. */
export function placeDetail(p?: Place): string {
  if (!p) return "";
  const address = p.address?.trim();
  if (!address) return "";
  return address === placeLabel(p) ? "" : address;
}

/** Stable identity for "is this the same origin/destination?" grouping. */
export function placeKey(p?: Place): string {
  if (!p) return "?";
  if (p.latLng) return `@${p.latLng.lat.toFixed(3)},${p.latLng.lng.toFixed(3)}`;
  return `#${(p.name ?? p.address ?? "").trim().toLowerCase()}`;
}

/** "Jul 27 – Aug 9" (en dash, no year — the chip is always near-term). */
export function rangeLabel(r: DateRange): string {
  const start = formatKey(r.startKey, "short");
  const end = formatKey(r.endKey, "short");
  return start === end ? start : `${start} – ${end}`;
}

export function pluralTrips(n: number): string {
  return n === 1 ? "1 trip" : `${n} trips`;
}
