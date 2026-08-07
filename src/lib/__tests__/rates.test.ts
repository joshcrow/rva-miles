import { describe, expect, it } from "vitest";
import { currentDefaultRate, defaultRateFor, IRS_RATES } from "../rates";

describe("IRS_RATES", () => {
  it("contains the known official business rates 2023-2026", () => {
    expect(IRS_RATES[2023]).toBeCloseTo(0.655, 5);
    expect(IRS_RATES[2024]).toBeCloseTo(0.67, 5);
    expect(IRS_RATES[2025]).toBeCloseTo(0.7, 5);
    expect(IRS_RATES[2026]).toBeCloseTo(0.725, 5);
  });
});

describe("defaultRateFor", () => {
  it("returns the exact year's rate for keys within known years", () => {
    expect(defaultRateFor("2023-06-01")).toBeCloseTo(0.655, 5);
    expect(defaultRateFor("2024-06-01")).toBeCloseTo(0.67, 5);
    expect(defaultRateFor("2025-06-01")).toBeCloseTo(0.7, 5);
    expect(defaultRateFor("2026-06-01")).toBeCloseTo(0.725, 5);
  });

  it("clamps to the earliest known year for older dates", () => {
    expect(defaultRateFor("2010-01-01")).toBeCloseTo(IRS_RATES[2023], 5);
  });

  it("clamps to the latest known year for future/unpublished dates", () => {
    expect(defaultRateFor("2030-01-01")).toBeCloseTo(IRS_RATES[2026], 5);
  });

  it("reads only the year portion of the key", () => {
    expect(defaultRateFor("2025-12-31")).toBe(defaultRateFor("2025-01-01"));
  });
});

describe("currentDefaultRate", () => {
  it("matches defaultRateFor for the current year", () => {
    const year = new Date().getFullYear();
    expect(currentDefaultRate()).toBe(defaultRateFor(`${year}-01-01`));
  });
});
