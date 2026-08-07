// Groups an already-sorted trip list (dateKey desc, createdAt desc — the
// order db.listTrips returns) into per-day sections for the ledger.

import type { Trip } from "@/types";
import { totalsOf, type Totals } from "./format";

export interface DayGroup {
  dateKey: string;
  trips: Trip[];
  totals: Totals;
}

/** Assumes `trips` is already sorted so same-day trips are contiguous. */
export function groupByDay(trips: Trip[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: Trip[] | null = null;
  let currentKey: string | null = null;

  for (const t of trips) {
    if (t.dateKey !== currentKey) {
      current = [];
      currentKey = t.dateKey;
      groups.push({ dateKey: t.dateKey, trips: current, totals: totalsOf([]) });
    }
    current!.push(t);
  }

  // totals computed after grouping so mid-loop mutation doesn't re-walk the array
  return groups.map((g) => ({ ...g, totals: totalsOf(g.trips) }));
}
