import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { filterTrips, matchesQuery } from "../search";

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "t1",
    dateKey: "2026-08-07",
    from: { name: "Home", address: "1 Main St, Richmond, VA" },
    to: { name: "Chesterfield Clinic", address: "200 Health Way" },
    distanceMiles: 14.2,
    ratePerMile: 0.725,
    purpose: "Patient visit",
    source: "manual",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("matchesQuery", () => {
  it("is vacuously true for an empty query", () => {
    expect(matchesQuery(trip(), "")).toBe(true);
    expect(matchesQuery(trip(), "   ")).toBe(true);
  });

  it("matches destination, origin, and purpose case-insensitively", () => {
    expect(matchesQuery(trip(), "chesterfield")).toBe(true);
    expect(matchesQuery(trip(), "HOME")).toBe(true);
    expect(matchesQuery(trip(), "patient")).toBe(true);
  });

  it("matches address text even when it's not the display name", () => {
    expect(matchesQuery(trip(), "health way")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery(trip(), "airport")).toBe(false);
  });

  it("handles a trip with no purpose without throwing", () => {
    expect(matchesQuery(trip({ purpose: undefined }), "clinic")).toBe(true);
  });
});

describe("filterTrips", () => {
  it("returns the input unfiltered for a blank query", () => {
    const trips = [trip({ id: "a" }), trip({ id: "b" })];
    expect(filterTrips(trips, "")).toBe(trips);
  });

  it("filters down to matches", () => {
    const trips = [trip({ id: "a", to: { name: "Airport" } }), trip({ id: "b" })];
    expect(filterTrips(trips, "clinic").map((t) => t.id)).toEqual(["b"]);
  });
});
