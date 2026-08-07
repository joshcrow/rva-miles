import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { fmtMiles, fmtMoney, roundTo, totalsOf, tripAmount } from "../money";
import { buildCsv, type ReportMeta } from "../exporters";
import { computeTotals } from "@/components/report/reportData";
import { totalsOf as homeTotals } from "@/components/home/format";
import { totalsOf as tripsTotals } from "@/components/trips/format";

function trip(distanceMiles: number, ratePerMile: number, i = 0): Trip {
  return {
    id: `t${i}`,
    dateKey: "2026-08-03",
    from: { name: "Home" },
    to: { name: "Clinic" },
    distanceMiles,
    ratePerMile,
    source: "tile",
    createdAt: 1000 + i,
    updatedAt: 1000 + i,
  };
}

describe("fmtMoney", () => {
  it("rounds a true half cent up instead of down", () => {
    // 14.2 * 0.725 === 10.294999999999998 in IEEE754. Naive toFixed(2) gives
    // "$10.29" while the report's rounded sum reports "$10.30".
    expect(fmtMoney(14.2 * 0.725)).toBe("$10.30");
    expect(fmtMoney(10.295)).toBe("$10.30");
  });

  it("formats ordinary amounts with grouping and two decimals", () => {
    expect(fmtMoney(1234.5)).toBe("$1,234.50");
    expect(fmtMoney(0)).toBe("$0.00");
    expect(fmtMoney(-3.5)).toBe("-$3.50");
  });

  it("renders non-finite input as zero rather than NaN", () => {
    expect(fmtMoney(Number.NaN)).toBe("$0.00");
  });
});

describe("fmtMiles", () => {
  it("uses one decimal and groups thousands", () => {
    expect(fmtMiles(214.64)).toBe("214.6");
    expect(fmtMiles(1234.55)).toBe("1,234.6");
  });
});

describe("tripAmount", () => {
  it("is the trip's own captured rate, rounded to cents", () => {
    expect(tripAmount(trip(14.2, 0.725))).toBe(10.3);
    expect(tripAmount(trip(100, 0.725))).toBe(72.5);
  });
});

describe("totalsOf", () => {
  it("sums the rounded per-trip amounts, so the total equals the printed rows", () => {
    const trips = [trip(14.2, 0.725, 1), trip(22.6, 0.725, 2), trip(14.2, 0.725, 3)];
    const totals = totalsOf(trips);
    expect(totals.count).toBe(3);
    expect(totals.miles).toBe(51);
    // 10.30 + 16.39 + 10.30 — not round(raw sum), which would be 36.98.
    expect(totals.money).toBe(36.99);
    expect(fmtMoney(totals.money)).toBe("$36.99");
  });
});

// The bug this guards: Home showed "$70.91" for the same pay period the
// Report screen and the emailed CSV both called "$70.92".
describe("every surface agrees on the same trips", () => {
  const trips = [
    trip(14.2, 0.725, 1),
    trip(22.6, 0.725, 2),
    trip(14.2, 0.725, 3),
    trip(18.4, 0.725, 4),
    trip(28.4, 0.725, 5),
  ];
  const meta: ReportMeta = {
    title: "Mileage",
    range: { startKey: "2026-08-01", endKey: "2026-08-15" },
  };

  it("home, trips, report and the CSV totals row are identical", () => {
    const home = homeTotals(trips);
    const ledger = tripsTotals(trips);
    const report = computeTotals(trips);

    expect(home).toEqual(ledger);
    expect(home.miles).toBe(report.miles);
    expect(home.money).toBe(report.money);

    const totalsLine = buildCsv(trips, meta).split("\r\n").filter(Boolean).at(-1);
    expect(totalsLine).toBe(
      `,,,Totals,${report.miles.toFixed(1)},,${report.money.toFixed(2)}`,
    );
  });
});

describe("roundTo", () => {
  it("corrects the float representation that makes 1.005 round down", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(10.295, 2)).toBe(10.3);
    expect(roundTo(12.34, 1)).toBe(12.3);
  });
});
