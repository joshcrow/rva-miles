// LOCAL-calendar-date helpers. A "dateKey" is always 'YYYY-MM-DD' in the
// device's local timezone. Never new Date('YYYY-MM-DD') (parses as UTC
// midnight, shifting the key a day in western timezones) and never
// toISOString() for calendar dates (same bug, other direction).

import type { DateRange } from "@/types";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** LOCAL calendar date key for an epoch-ms instant. */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(Date.now());
}

/**
 * Parses a dateKey to a local Date fixed at noon. Noon (not midnight) keeps
 * later day-arithmetic (setDate) safely clear of DST transition boundaries,
 * which happen at 2am local time.
 */
export function keyToDate(key: string): Date {
  const m = DATE_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid dateKey: "${key}"`);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0, 0);
}

export function addDaysKey(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d.getTime());
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isKeyInRange(key: string, r: DateRange): boolean {
  return compareKeys(key, r.startKey) >= 0 && compareKeys(key, r.endKey) <= 0;
}

/** 0 = Sunday, matching Date#getDay(). */
export function weekdayOfKey(key: string): number {
  return keyToDate(key).getDay();
}

export function formatKey(key: string, style: "short" | "long" | "weekday"): string {
  const d = keyToDate(key);
  switch (style) {
    case "short":
      return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
    case "long":
      return `${MONTH_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    case "weekday":
      return WEEKDAY_LONG[d.getDay()];
  }
}
