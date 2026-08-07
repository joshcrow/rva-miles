// validateSnapshot is a pure function over plain objects (no IndexedDB
// involved), so — like mergePlan in db.merge.test.ts — it's tested directly
// rather than through a mocked Dexie. Coverage here focuses on the
// backward-compatible `legs`/`directMiles` fields added for multi-leg trips.
import { describe, expect, it } from "vitest";
import type { Route, Snapshot, Trip, TripLeg } from "@/types";
import { validateSnapshot } from "../db";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    dateKey: "2026-08-03",
    from: { name: "Richmond home" },
    to: { name: "Charlottesville site" },
    distanceMiles: 25,
    ratePerMile: 0.5,
    source: "manual",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    from: { name: "Home" },
    to: { name: "Office" },
    distanceMiles: 10,
    timesUsed: 1,
    lastUsedAt: 1000,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    from: { name: "Richmond home" },
    to: { name: "Crozet" },
    distanceMiles: 40,
    billable: false,
    ...overrides,
  };
}

function snapshotOf(trips: Trip[], routes: Route[] = []): Snapshot {
  return { schema: 2, exportedAt: 2000, trips, routes };
}

describe("validateSnapshot — backward compatibility with legless snapshots", () => {
  it("accepts a trip with no legs field at all (every snapshot written before multi-leg trips)", () => {
    const trip = makeTrip();
    expect(trip.legs).toBeUndefined();
    expect(() => validateSnapshot(snapshotOf([trip], [makeRoute()]))).not.toThrow();
  });

  it("accepts an empty snapshot", () => {
    expect(() => validateSnapshot(snapshotOf([], []))).not.toThrow();
  });
});

describe("validateSnapshot — trips WITH legs", () => {
  it("accepts a trip with a well-formed multi-leg journey", () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ from: { name: "Richmond home" }, to: { name: "Crozet" }, distanceMiles: 40, billable: false }),
        makeLeg({ from: { name: "Crozet" }, to: { name: "Charlottesville site" }, distanceMiles: 25, billable: true }),
      ],
    });
    const snapshot = validateSnapshot(snapshotOf([trip]));
    expect(snapshot.trips[0].legs).toHaveLength(2);
  });

  it("accepts an empty legs array (present but no stops)", () => {
    const trip = makeTrip({ legs: [] });
    expect(() => validateSnapshot(snapshotOf([trip]))).not.toThrow();
  });

  it("accepts an optional directMiles alongside legs", () => {
    const trip = makeTrip({
      directMiles: 60,
      legs: [makeLeg({ billable: true })],
    });
    expect(() => validateSnapshot(snapshotOf([trip]))).not.toThrow();
  });

  it("rejects legs that is present but not an array", () => {
    const trip = { ...makeTrip(), legs: "not-an-array" } as unknown as Trip;
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/legs/);
  });

  it("rejects a leg missing \"from\"", () => {
    const trip = makeTrip({ legs: [{ to: { name: "Crozet" }, distanceMiles: 10, billable: true } as unknown as TripLeg] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/from/);
  });

  it("rejects a leg missing \"to\"", () => {
    const trip = makeTrip({ legs: [{ from: { name: "Richmond home" }, distanceMiles: 10, billable: true } as unknown as TripLeg] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/to/);
  });

  it("rejects a leg with a negative distanceMiles", () => {
    const trip = makeTrip({ legs: [makeLeg({ distanceMiles: -5 })] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/distanceMiles/);
  });

  it("rejects a leg with a non-finite distanceMiles", () => {
    const trip = makeTrip({ legs: [makeLeg({ distanceMiles: Number.POSITIVE_INFINITY })] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/distanceMiles/);
  });

  it("rejects a leg whose billable flag is not a boolean", () => {
    const trip = makeTrip({ legs: [{ ...makeLeg(), billable: "yes" } as unknown as TripLeg] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/billable/);
  });

  it("rejects a negative directMiles", () => {
    const trip = makeTrip({ directMiles: -1 });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/directMiles/);
  });

  it("names the offending trip id and leg index in the error message", () => {
    const trip = makeTrip({ id: "trip-xyz", legs: [makeLeg({ billable: true }), { ...makeLeg(), billable: "no" } as unknown as TripLeg] });
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/trip-xyz/);
    expect(() => validateSnapshot(snapshotOf([trip]))).toThrow(/legs\[1\]/);
  });
});
