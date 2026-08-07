import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { groupByDay } from "../group";

function trip(id: string, dateKey: string, distanceMiles: number, ratePerMile = 0.7): Trip {
  return {
    id,
    dateKey,
    from: {},
    to: {},
    distanceMiles,
    ratePerMile,
    source: "manual",
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("groupByDay", () => {
  it("returns no groups for an empty ledger", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("groups contiguous same-day trips and preserves input order", () => {
    const trips = [
      trip("a", "2026-08-07", 10),
      trip("b", "2026-08-07", 5),
      trip("c", "2026-08-06", 3),
    ];
    const groups = groupByDay(trips);
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-08-07", "2026-08-06"]);
    expect(groups[0].trips.map((t) => t.id)).toEqual(["a", "b"]);
    expect(groups[1].trips.map((t) => t.id)).toEqual(["c"]);
  });

  it("computes per-day totals from that day's trips only", () => {
    const trips = [trip("a", "2026-08-07", 10, 0.7), trip("b", "2026-08-07", 5, 0.7), trip("c", "2026-08-06", 100, 1)];
    const groups = groupByDay(trips);
    expect(groups[0].totals).toEqual({ count: 2, miles: 15, money: 10.5 });
    expect(groups[1].totals).toEqual({ count: 1, miles: 100, money: 100 });
  });

  it("does not merge non-contiguous same-day trips into one group (input must be pre-sorted)", () => {
    const trips = [trip("a", "2026-08-07", 10), trip("b", "2026-08-06", 3), trip("c", "2026-08-07", 5)];
    const groups = groupByDay(trips);
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-08-07", "2026-08-06", "2026-08-07"]);
  });
});
