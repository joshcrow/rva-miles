import { describe, expect, it } from "vitest";
import { isSameMonth, monthKeyOf, monthLabel, monthRangeOf, shiftMonth } from "../monthNav";

describe("monthKeyOf", () => {
  it("normalizes any day to the 1st of its month", () => {
    expect(monthKeyOf("2026-08-07")).toBe("2026-08-01");
    expect(monthKeyOf("2026-08-31")).toBe("2026-08-01");
    expect(monthKeyOf("2026-08-01")).toBe("2026-08-01");
  });
});

describe("monthRangeOf", () => {
  it("spans the full calendar month inclusive", () => {
    expect(monthRangeOf("2026-08-01")).toEqual({ startKey: "2026-08-01", endKey: "2026-08-31" });
    expect(monthRangeOf("2026-08-19")).toEqual({ startKey: "2026-08-01", endKey: "2026-08-31" });
  });

  it("handles February and leap years", () => {
    expect(monthRangeOf("2026-02-10")).toEqual({ startKey: "2026-02-01", endKey: "2026-02-28" });
    expect(monthRangeOf("2028-02-10")).toEqual({ startKey: "2028-02-01", endKey: "2028-02-29" });
  });
});

describe("shiftMonth", () => {
  it("steps forward and backward across a year boundary", () => {
    expect(shiftMonth("2026-08-15", 1)).toBe("2026-09-01");
    expect(shiftMonth("2026-01-15", -1)).toBe("2025-12-01");
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-01");
  });

  it("is stable across many consecutive steps (no drift)", () => {
    let key = "2026-01-01";
    for (let i = 0; i < 24; i++) key = shiftMonth(key, 1);
    expect(key).toBe("2028-01-01");
  });
});

describe("monthLabel", () => {
  it("formats as 'Month YYYY'", () => {
    expect(monthLabel("2026-08-01")).toBe("August 2026");
    expect(monthLabel("2026-01-17")).toBe("January 2026");
  });
});

describe("isSameMonth", () => {
  it("compares by calendar month regardless of day", () => {
    expect(isSameMonth("2026-08-01", "2026-08-31")).toBe(true);
    expect(isSameMonth("2026-08-31", "2026-09-01")).toBe(false);
  });
});
