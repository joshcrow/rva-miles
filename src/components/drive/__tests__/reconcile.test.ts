import { describe, expect, it } from "vitest";
import {
  analyzeShape,
  billedMiles,
  shouldOfferChoice,
  shouldPreferRoute,
} from "../reconcile";
import { formatAgo, formatElapsed, formatMiles, formatMoney } from "../driveFormat";

// ~0.69 mi of latitude per 0.01 degrees, close enough for shape fixtures.
const DOWNTOWN = { lat: 37.5407, lng: -77.436 };
const NEARBY = { lat: 37.5417, lng: -77.436 }; // ~0.07 mi north
const CLINIC = { lat: 37.4816, lng: -77.6083 }; // ~10 mi southwest

describe("analyzeShape", () => {
  it("treats a track that returns to its start as a loop", () => {
    const shape = analyzeShape(13.9, DOWNTOWN, NEARBY);
    expect(shape.isLoop).toBe(true);
    expect(shape.canReconcile).toBe(false);
  });

  it("does not call a barely-moved track a loop", () => {
    // Under the minimum distance this is a non-trip, not a round trip.
    expect(analyzeShape(0.2, DOWNTOWN, NEARBY).isLoop).toBe(false);
  });

  it("reconciles a genuine A-to-B drive", () => {
    const shape = analyzeShape(13.9, DOWNTOWN, CLINIC);
    expect(shape.isLoop).toBe(false);
    expect(shape.canReconcile).toBe(true);
    expect(shape.straightLineMiles).toBeGreaterThan(5);
  });

  it("cannot reconcile without both endpoints", () => {
    expect(analyzeShape(13.9, DOWNTOWN, undefined).canReconcile).toBe(false);
    expect(analyzeShape(13.9, undefined, CLINIC).canReconcile).toBe(false);
    expect(analyzeShape(13.9, undefined, undefined).isLoop).toBe(false);
  });
});

describe("shouldPreferRoute", () => {
  it("prefers the road route when GPS drifts more than 10%", () => {
    expect(shouldPreferRoute(13.9, 12.0)).toBe(true);
    expect(shouldPreferRoute(12.0, 13.9)).toBe(true);
  });

  it("keeps GPS when the two are within 10% of each other", () => {
    // The brief's own example: a visible choice, but GPS stays the default.
    expect(shouldPreferRoute(13.9, 12.6)).toBe(false);
    expect(shouldPreferRoute(12.6, 12.6)).toBe(false);
  });

  it("is exclusive at exactly 10%", () => {
    expect(shouldPreferRoute(10, 11)).toBe(false);
    expect(shouldPreferRoute(10, 11.01)).toBe(true);
  });

  it("does not divide by zero on a zero-mile drive", () => {
    expect(shouldPreferRoute(0, 4)).toBe(true);
    expect(shouldPreferRoute(0, 0)).toBe(false);
  });
});

describe("shouldOfferChoice", () => {
  it("offers a choice only when the figures read differently", () => {
    expect(shouldOfferChoice(13.9, 12.6)).toBe(true);
    expect(shouldOfferChoice(13.9, 13.85)).toBe(false);
    expect(shouldOfferChoice(13.9, null)).toBe(false);
  });
});

describe("billedMiles", () => {
  const base = { gpsMiles: 13.9, roadMiles: 12.6, isLoop: false, roundTrip: false } as const;

  it("bills the GPS measurement by default", () => {
    expect(billedMiles({ ...base, source: "gps" })).toBe(13.9);
  });

  it("bills the road route when chosen", () => {
    expect(billedMiles({ ...base, source: "route" })).toBe(12.6);
  });

  it("falls back to GPS when there is no road route", () => {
    expect(billedMiles({ ...base, roadMiles: null, source: "route" })).toBe(13.9);
  });

  it("doubles a one-way track when the return was driven untracked", () => {
    expect(billedMiles({ ...base, source: "route", roundTrip: true })).toBeCloseTo(25.2, 10);
  });

  it("NEVER doubles a loop — the return leg is already in the measurement", () => {
    expect(
      billedMiles({ gpsMiles: 13.9, roadMiles: null, source: "gps", roundTrip: true, isLoop: true }),
    ).toBe(13.9);
  });
});

describe("driveFormat", () => {
  it("formats elapsed time, adding hours only when needed", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(62_000)).toBe("1:02");
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
    expect(formatElapsed(-5000)).toBe("0:00");
  });

  it("never renders a negative or NaN distance", () => {
    expect(formatMiles(13.94)).toBe("13.9");
    expect(formatMiles(13.94, 2)).toBe("13.94");
    expect(formatMiles(-1)).toBe("0.0");
    expect(formatMiles(Number.NaN)).toBe("0.0");
  });

  it("formats money to cents", () => {
    expect(formatMoney(12.6 * 0.7)).toBe("$8.82");
    expect(formatMoney(4)).toBe("$4.00");
    expect(formatMoney(Number.NaN)).toBe("$0.00");
  });

  it("formats fix staleness", () => {
    expect(formatAgo(4200)).toBe("4s");
    expect(formatAgo(65_000)).toBe("1m 05s");
    expect(formatAgo(-10)).toBe("0s");
  });
});
