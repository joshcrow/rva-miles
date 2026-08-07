import { describe, expect, it } from "vitest";
import type { Trip } from "@/types";
import { applyTripEdit, buildRepeatTrip, formFromTrip, newId } from "../tripEdits";

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "t1",
    dateKey: "2026-08-01",
    from: { name: "Home", address: "1 Main St" },
    to: { name: "Clinic", address: "2 Health Way" },
    distanceMiles: 14.2,
    ratePerMile: 0.67,
    purpose: "Old purpose",
    vehicle: "Civic",
    routeId: "r1",
    source: "migrated",
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe("newId", () => {
  it("produces unique non-empty ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
  });
});

describe("buildRepeatTrip", () => {
  it("clones endpoints/purpose/distance but re-prices at the CURRENT rate, not the original's", () => {
    const original = trip({ ratePerMile: 0.67 });
    const clone = buildRepeatTrip(original, "2026-08-07", 0.725, 5000);
    expect(clone.id).not.toBe(original.id);
    expect(clone.dateKey).toBe("2026-08-07");
    expect(clone.ratePerMile).toBe(0.725);
    expect(clone.distanceMiles).toBe(original.distanceMiles);
    expect(clone.from).toEqual(original.from);
    expect(clone.to).toEqual(original.to);
    expect(clone.purpose).toBe("Old purpose");
    expect(clone.routeId).toBe("r1");
    expect(clone.source).toBe("manual");
    expect(clone.createdAt).toBe(5000);
    expect(clone.updatedAt).toBe(5000);
  });

  it("never mutates the original trip", () => {
    const original = trip();
    const snapshot = JSON.stringify(original);
    buildRepeatTrip(original, "2026-08-07", 0.725, 5000);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe("formFromTrip / applyTripEdit round-trip", () => {
  it("preserves untouched fields when the form is saved unchanged", () => {
    const original = trip();
    const form = formFromTrip(original);
    const saved = applyTripEdit(original, form, 9999);
    expect(saved.dateKey).toBe(original.dateKey);
    expect(saved.from.name).toBe("Home");
    expect(saved.to.name).toBe("Clinic");
    expect(saved.purpose).toBe("Old purpose");
    expect(saved.distanceMiles).toBeCloseTo(14.2, 5);
    expect(saved.ratePerMile).toBeCloseTo(0.67, 5);
    expect(saved.vehicle).toBe("Civic");
    expect(saved.id).toBe(original.id);
    expect(saved.source).toBe("migrated");
    expect(saved.updatedAt).toBe(9999);
  });

  it("keeps distance raw and untouched when only purpose changes (v1 regression guard)", () => {
    const original = trip({ distanceMiles: 14.23456 });
    const form = formFromTrip(original);
    form.purpose = "New purpose";
    const saved = applyTripEdit(original, form, 1);
    // formFromTrip rounds to one display decimal — that's the field's value
    // the whole time the sheet is open; editing an unrelated field must not
    // re-derive it from anything else.
    expect(saved.distanceMiles).toBeCloseTo(14.2, 5);
    expect(saved.purpose).toBe("New purpose");
  });

  it("falls back to the original numeric value on unparsable input rather than zeroing it", () => {
    const original = trip({ distanceMiles: 14.2, ratePerMile: 0.67 });
    const form = formFromTrip(original);
    form.distance = "";
    form.rate = "abc";
    const saved = applyTripEdit(original, form, 1);
    expect(saved.distanceMiles).toBe(14.2);
    expect(saved.ratePerMile).toBe(0.67);
  });

  it("preserves address/latLng when only the display name is edited", () => {
    const original = trip({ from: { name: "Home", address: "1 Main St", latLng: { lat: 1, lng: 2 } } });
    const form = formFromTrip(original);
    form.fromName = "House";
    const saved = applyTripEdit(original, form, 1);
    expect(saved.from).toEqual({ name: "House", address: "1 Main St", latLng: { lat: 1, lng: 2 } });
  });

  it("clears roundTrip/purpose/vehicle to undefined rather than empty strings", () => {
    const original = trip({ roundTrip: true });
    const form = formFromTrip(original);
    form.roundTrip = false;
    form.purpose = "  ";
    form.vehicle = "";
    const saved = applyTripEdit(original, form, 1);
    expect(saved.roundTrip).toBeUndefined();
    expect(saved.purpose).toBeUndefined();
    expect(saved.vehicle).toBeUndefined();
  });
});
