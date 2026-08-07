// Pay-period math, all in LOCAL dateKeys. Weekly/biweekly cycle off an
// anchor date; semimonthly/monthly follow the calendar regardless of anchor.

import type { DateRange, PaySchedule, PeriodPreset } from "@/types";
import { addDaysKey, keyToDate, toDateKey } from "./dates";

const MS_PER_DAY = 86_400_000;

function daysBetweenKeys(a: string, b: string): number {
  // Both sides are local-noon Date instants, so DST's ~1hr wobble never
  // approaches the 0.5-day rounding boundary.
  return Math.round((keyToDate(b).getTime() - keyToDate(a).getTime()) / MS_PER_DAY);
}

function cyclePeriod(anchorKey: string, key: string, lengthDays: number): DateRange {
  const cycleIndex = Math.floor(daysBetweenKeys(anchorKey, key) / lengthDays);
  const startKey = addDaysKey(anchorKey, cycleIndex * lengthDays);
  return { startKey, endKey: addDaysKey(startKey, lengthDays - 1) };
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function dateKeyAt(year: number, month0: number, day: number): string {
  return toDateKey(new Date(year, month0, day, 12, 0, 0, 0).getTime());
}

function semimonthlyPeriod(key: string): DateRange {
  const d = keyToDate(key);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (d.getDate() <= 15) {
    return { startKey: dateKeyAt(y, m, 1), endKey: dateKeyAt(y, m, 15) };
  }
  return { startKey: dateKeyAt(y, m, 16), endKey: dateKeyAt(y, m, lastDayOfMonth(y, m)) };
}

function monthlyPeriod(key: string): DateRange {
  const d = keyToDate(key);
  const y = d.getFullYear();
  const m = d.getMonth();
  return { startKey: dateKeyAt(y, m, 1), endKey: dateKeyAt(y, m, lastDayOfMonth(y, m)) };
}

export function periodContaining(s: PaySchedule, key: string): DateRange {
  switch (s.frequency) {
    case "weekly":
      return cyclePeriod(s.anchorKey, key, 7);
    case "biweekly":
      return cyclePeriod(s.anchorKey, key, 14);
    case "semimonthly":
      return semimonthlyPeriod(key);
    case "monthly":
      return monthlyPeriod(key);
  }
}

export function previousPeriod(s: PaySchedule, r: DateRange): DateRange {
  return periodContaining(s, addDaysKey(r.startKey, -1));
}

export function periodPresets(s: PaySchedule | undefined, today: string): PeriodPreset[] {
  const presets: PeriodPreset[] = [];
  if (s) {
    const current = periodContaining(s, today);
    // "pay" is what distinguishes these from "This month" beside them, and
    // from the Home chip one tap away that already says "This pay period".
    presets.push({ label: "This pay period", range: current });
    presets.push({ label: "Last pay period", range: previousPeriod(s, current) });
  }
  const thisMonth = monthlyPeriod(today);
  presets.push({ label: "This month", range: thisMonth });
  presets.push({ label: "Last month", range: monthlyPeriod(addDaysKey(thisMonth.startKey, -1)) });
  presets.push({ label: "Last 30 days", range: { startKey: addDaysKey(today, -29), endKey: today } });
  // "Custom" is a hint entry: the UI opens a manual range picker on select
  // rather than applying this same-day placeholder range.
  presets.push({ label: "Custom", range: { startKey: today, endKey: today } });
  return presets;
}
