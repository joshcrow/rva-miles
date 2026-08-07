import { describe, expect, it } from "vitest";
import type { Place, Route, Settings } from "@/types";
import { bumpRoute, buildTripFromRoute, findMatchingRoute, newId, routeMatchKey } from "../tripActions";

const settings: Settings = { ratePerMile: 0.725, theme: "system", vehicle: "Civic" };

function route(partial: Partial<Route> = {}): Route {
  return {
    id: "r1",
    from: { name: "Home", latLng: { lat: 37.5407, lng: -77.436 } },
    to: { name: "Clinic", latLng: { lat: 37.4316, lng: -77.5 } },
    distanceMiles: 14.2,
    timesUsed: 3,
    lastUsedAt: 1_000,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("newId", () => {
  it("produces unique non-empty ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id.length).toBeGreaterThan(8);
  });
});

describe("routeMatchKey", () => {
  it("is direction-sensitive", () => {
    const a: Place = { name: "Home", latLng: { lat: 37.5, lng: -77.4 } };
    const b: Place = { name: "Clinic", latLng: { lat: 37.4, lng: -77.5 } };
    expect(routeMatchKey(a, b)).not.toBe(routeMatchKey(b, a));
  });
});

describe("findMatchingRoute", () => {
  it("reuses an existing tile instead of creating a duplicate", () => {
    const routes = [route()];
    const found = findMatchingRoute(
      routes,
      { name: "House", latLng: { lat: 37.54072, lng: -77.43598 } },
      { name: "The Clinic", latLng: { lat: 37.43161, lng: -77.50002 } },
    );
    expect(found?.id).toBe("r1");
  });

  it("returns undefined for a genuinely new pair", () => {
    expect(findMatchingRoute([route()], { name: "Home" }, { name: "Airport" })).toBeUndefined();
  });
});

describe("buildTripFromRoute", () => {
  it("snapshots the rate and vehicle and stamps the given local dateKey", () => {
    const trip = buildTripFromRoute(route(), "2026-08-05", settings);
    expect(trip.dateKey).toBe("2026-08-05");
    expect(trip.ratePerMile).toBe(0.725);
    expect(trip.vehicle).toBe("Civic");
    expect(trip.routeId).toBe("r1");
    expect(trip.source).toBe("tile");
    expect(trip.distanceMiles).toBe(14.2);
    expect(trip.createdAt).toBe(trip.updatedAt);
  });

  it("doubles the distance for a round-trip-by-default tile", () => {
    const trip = buildTripFromRoute(route({ defaultRoundTrip: true }), "2026-08-05", settings);
    expect(trip.distanceMiles).toBeCloseTo(28.4, 10);
    expect(trip.roundTrip).toBe(true);
  });
});

describe("bumpRoute", () => {
  it("increments usage without mutating the original (so undo can restore it)", () => {
    const original = route();
    const next = bumpRoute(original, 5_000);
    expect(next.timesUsed).toBe(4);
    expect(next.lastUsedAt).toBe(5_000);
    expect(next.updatedAt).toBe(5_000);
    expect(original.timesUsed).toBe(3);
    expect(original.lastUsedAt).toBe(1_000);
  });
});
