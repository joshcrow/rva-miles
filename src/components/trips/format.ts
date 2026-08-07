// Presentation helpers for the trips ledger. Self-contained (not imported
// from src/components/home) so this screen has no cross-workstream coupling
// to another owner's private module — the number formatting rules mirror the
// same contract (tabular, one/two decimals) but are duplicated on purpose.

import type { Place, Trip } from "@/types";

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function split(n: number, decimals: number): { sign: string; int: string; frac: string } {
  const v = Number.isFinite(n) ? n : 0;
  const [int, frac] = Math.abs(v).toFixed(decimals).split(".");
  return { sign: v < 0 ? "-" : "", int: group(int), frac: frac ?? "" };
}

/** "214.6" — always one decimal, thousands-grouped. */
export function fmtMiles(n: number): string {
  const { sign, int, frac } = split(n, 1);
  return `${sign}${int}.${frac}`;
}

/** "$150.22" — money is always rendered in success green by the caller. */
export function fmtMoney(n: number): string {
  const { sign, int, frac } = split(n, 2);
  return `${sign}$${int}.${frac}`;
}

export interface Totals {
  count: number;
  miles: number;
  money: number;
}

/** Money uses each trip's own captured rate — never a recomputed current rate. */
export function totalsOf(trips: Trip[]): Totals {
  let miles = 0;
  let money = 0;
  for (const t of trips) {
    miles += t.distanceMiles;
    money += t.distanceMiles * t.ratePerMile;
  }
  return { count: trips.length, miles, money };
}

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
