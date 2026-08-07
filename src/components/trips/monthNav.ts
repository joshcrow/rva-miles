// Pure month-navigation math for the trips ledger's sticky header. A
// "monthKey" is any dateKey standing in for its calendar month (we always
// normalize to the 1st when stepping, but accept any day-of-month in).

import type { DateRange } from "@/types";
import { keyToDate, toDateKey } from "@/lib/dates";

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Local noon on the 1st keeps this clear of DST boundaries, same as dates.ts. */
function firstOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1, 12, 0, 0, 0);
}

export function monthKeyOf(dateKey: string): string {
  const d = keyToDate(dateKey);
  return toDateKey(firstOfMonth(d.getFullYear(), d.getMonth()).getTime());
}

/** Inclusive [1st, last day] range for the month `monthKey` falls in. */
export function monthRangeOf(monthKey: string): DateRange {
  const d = keyToDate(monthKey);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = firstOfMonth(y, m);
  const end = new Date(y, m + 1, 0, 12, 0, 0, 0); // day 0 of next month = last day of this one
  return { startKey: toDateKey(start.getTime()), endKey: toDateKey(end.getTime()) };
}

export function shiftMonth(monthKey: string, delta: number): string {
  const d = keyToDate(monthKey);
  return toDateKey(firstOfMonth(d.getFullYear(), d.getMonth() + delta).getTime());
}

/** "August 2026" */
export function monthLabel(monthKey: string): string {
  const d = keyToDate(monthKey);
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function isSameMonth(a: string, b: string): boolean {
  return monthKeyOf(a) === monthKeyOf(b);
}
