import { describe, expect, it } from "vitest";
import {
  currentDefaultRate,
  defaultRateFor,
  formatRate,
  formatRateDigits,
  IRS_RATES,
} from "../rates";

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

describe("formatRateDigits", () => {
  it("keeps the half cent that plain money formatting would drop", () => {
    // (0.725).toFixed(2) is "0.72" — the exact bug this exists to prevent.
    expect(formatRateDigits(0.725)).toBe("0.725");
    expect(formatRateDigits(0.655)).toBe("0.655");
  });

  it("prints whole-cent rates with exactly two decimals", () => {
    expect(formatRateDigits(0.7)).toBe("0.70");
    expect(formatRateDigits(0.67)).toBe("0.67");
    expect(formatRateDigits(1)).toBe("1.00");
  });

  it("does not strip a second trailing zero", () => {
    expect(formatRateDigits(10.5)).toBe("10.50");
    expect(formatRateDigits(0)).toBe("0.00");
  });

  it("survives non-finite input rather than rendering NaN", () => {
    expect(formatRateDigits(Number.NaN)).toBe("0.00");
    expect(formatRateDigits(Number.POSITIVE_INFINITY)).toBe("0.00");
  });

  it("renders every published IRS rate exactly", () => {
    expect(formatRate(IRS_RATES[2023])).toBe("$0.655");
    expect(formatRate(IRS_RATES[2024])).toBe("$0.67");
    expect(formatRate(IRS_RATES[2025])).toBe("$0.70");
    expect(formatRate(IRS_RATES[2026])).toBe("$0.725");
  });
});
