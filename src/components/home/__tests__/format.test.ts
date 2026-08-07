import { describe, expect, it } from "vitest";
import type { Place, Trip } from "@/types";
import { fmtMiles, fmtMoney, placeDetail, placeKey, placeLabel, pluralTrips, rangeLabel, totalsOf } from "../format";

function trip(distanceMiles: number, ratePerMile: number): Trip {
  return {
    id: `t${distanceMiles}-${ratePerMile}`,
    dateKey: "2026-08-07",
    from: {},
    to: {},
    distanceMiles,
    ratePerMile,
    source: "tile",
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("fmtMiles", () => {
  it("always shows one decimal", () => {
    expect(fmtMiles(14)).toBe("14.0");
    expect(fmtMiles(14.24)).toBe("14.2");
    expect(fmtMiles(14.25)).toBe("14.3");
  });

  it("groups thousands", () => {
    expect(fmtMiles(1234.56)).toBe("1,234.6");
    expect(fmtMiles(1234567.8)).toBe("1,234,567.8");
  });

  it("degrades non-finite input to zero rather than rendering NaN", () => {
    expect(fmtMiles(Number.NaN)).toBe("0.0");
    expect(fmtMiles(Number.POSITIVE_INFINITY)).toBe("0.0");
  });
});

describe("fmtMoney", () => {
  it("renders cents and grouping", () => {
    expect(fmtMoney(150.2223)).toBe("$150.22");
    expect(fmtMoney(0)).toBe("$0.00");
    expect(fmtMoney(12345.6)).toBe("$12,345.60");
  });

  it("puts the sign outside the currency symbol", () => {
    expect(fmtMoney(-4.5)).toBe("-$4.50");
  });
});

describe("totalsOf", () => {
  it("uses each trip's own captured rate, never a shared one", () => {
    const t = totalsOf([trip(10, 0.67), trip(10, 0.7)]);
    expect(t.count).toBe(2);
    expect(t.miles).toBeCloseTo(20, 10);
    expect(t.money).toBeCloseTo(13.7, 10);
  });

  it("is zero for an empty ledger", () => {
    expect(totalsOf([])).toEqual({ count: 0, miles: 0, money: 0 });
  });
});

describe("place helpers", () => {
  const named: Place = { name: "Chesterfield Clinic", address: "1 Main St, Richmond, VA" };
  const addressOnly: Place = { address: "1 Main St, Richmond, VA" };
  const coordsOnly: Place = { latLng: { lat: 37.5407, lng: -77.436 } };

  it("prefers a name, then the first address segment", () => {
    expect(placeLabel(named)).toBe("Chesterfield Clinic");
    expect(placeLabel(addressOnly)).toBe("1 Main St");
    expect(placeLabel(coordsOnly)).toBe("37.541, -77.436");
    expect(placeLabel(undefined)).toBe("Unknown");
  });

  it("never repeats the primary label as the detail line", () => {
    expect(placeDetail(named)).toBe("1 Main St, Richmond, VA");
    expect(placeDetail({ name: "X", address: "X" })).toBe("");
    expect(placeDetail(coordsOnly)).toBe("");
  });

  it("matches the same spot by rounded coordinate regardless of name", () => {
    const a: Place = { name: "Office", latLng: { lat: 37.54071, lng: -77.43601 } };
    const b: Place = { name: "The Office", latLng: { lat: 37.54069, lng: -77.43604 } };
    expect(placeKey(a)).toBe(placeKey(b));
  });

  it("falls back to a case-insensitive name key with no coordinates", () => {
    expect(placeKey({ name: "Home" })).toBe(placeKey({ name: "  home " }));
    expect(placeKey({ name: "Home" })).not.toBe(placeKey({ name: "Clinic" }));
  });
});

describe("labels", () => {
  it("collapses a single-day range", () => {
    expect(rangeLabel({ startKey: "2026-08-07", endKey: "2026-08-07" })).toBe("Aug 7");
    expect(rangeLabel({ startKey: "2026-07-27", endKey: "2026-08-09" })).toBe("Jul 27 – Aug 9");
  });

  it("pluralizes trips", () => {
    expect(pluralTrips(1)).toBe("1 trip");
    expect(pluralTrips(0)).toBe("0 trips");
    expect(pluralTrips(4)).toBe("4 trips");
  });
});
