// The single definition of how miles and money are rounded and rendered.
//
// Every surface that shows a total — the home period chip, the trips month
// header, the report screen, the shared /r link, the CSV, the XLSX and the
// email body — goes through this module. They used to each do their own
// arithmetic and drifted by a cent: a 14.2 mi trip at the 2026 rate is
// 10.295, which `toFixed(2)` renders as "$10.29" but a correctly rounded sum
// reports as "$10.30". Accounts payable reconciles these by hand, so a
// one-cent disagreement between the app and the report it sent is a support
// ticket, not a rounding detail.
//
// The discipline is: round each trip, then sum the rounded values — so the
// printed total always equals the sum of the printed rows.
//
// Formatting is done by hand (never toLocaleString) so the server and the
// client render byte-identical strings.

import type { Trip } from "@/types";

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function split(n: number, decimals: number): { sign: string; int: string; frac: string } {
  const v = Number.isFinite(n) ? n : 0;
  // Round through roundTo first: toFixed alone reads 10.295 as 10.2949…
  const [int, frac] = Math.abs(roundTo(v, decimals)).toFixed(decimals).split(".");
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

/** The billed amount for one trip, at the rate captured on the day it was logged. */
export function tripAmount(t: Trip): number {
  return roundTo(t.distanceMiles * t.ratePerMile, 2);
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
    miles = roundTo(miles + roundTo(t.distanceMiles, 1), 1);
    money = roundTo(money + tripAmount(t), 2);
  }
  return { count: trips.length, miles, money };
}
