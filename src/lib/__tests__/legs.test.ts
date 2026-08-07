import { describe, expect, it } from "vitest";
import type { Trip, TripLeg } from "@/types";
import { billableMiles, legsSummary, routeText, viaLabel } from "../legs";

function leg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    from: { name: "A" },
    to: { name: "B" },
    distanceMiles: 10,
    billable: true,
    ...overrides,
  };
}

let nextId = 1;
function makeTrip(overrides: Partial<Trip> = {}): Trip {
  const id = `trip-${nextId++}`;
  return {
    id,
    dateKey: "2026-08-03",
    from: { name: "Richmond home" },
    to: { name: "Charlottesville site" },
    distanceMiles: 10,
    ratePerMile: 0.5,
    source: "manual",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("billableMiles", () => {
  it("returns 0 for undefined legs", () => {
    expect(billableMiles(undefined)).toBe(0);
  });

  it("returns 0 for an empty legs array", () => {
    expect(billableMiles([])).toBe(0);
  });

  it("sums only the legs marked billable, skipping personal ones", () => {
    const legs = [
      leg({ distanceMiles: 40, billable: false }), // Richmond -> Crozet, personal
      leg({ distanceMiles: 25, billable: true }), // Crozet -> Charlottesville, billed
    ];
    expect(billableMiles(legs)).toBe(25);
  });

  it("sums every leg when all are billable", () => {
    const legs = [leg({ distanceMiles: 10, billable: true }), leg({ distanceMiles: 15, billable: true })];
    expect(billableMiles(legs)).toBe(25);
  });

  it("returns 0 when no leg is billable", () => {
    const legs = [leg({ distanceMiles: 10, billable: false }), leg({ distanceMiles: 15, billable: false })];
    expect(billableMiles(legs)).toBe(0);
  });
});

describe("viaLabel", () => {
  it("is empty for undefined legs (0 stops)", () => {
    expect(viaLabel(undefined)).toBe("");
  });

  it("is empty for an empty legs array (0 stops)", () => {
    expect(viaLabel([])).toBe("");
  });

  it("is empty for a single leg — no intermediate stop between one origin and one destination", () => {
    const legs = [leg({ from: { name: "Richmond home" }, to: { name: "Charlottesville site" } })];
    expect(viaLabel(legs)).toBe("");
  });

  it("names the one intermediate stop for a 2-leg journey", () => {
    const legs = [
      leg({ from: { name: "Richmond home" }, to: { name: "Crozet" } }),
      leg({ from: { name: "Crozet" }, to: { name: "Charlottesville site" } }),
    ];
    expect(viaLabel(legs)).toBe("Crozet");
  });

  it("comma-joins two intermediate stops for a 3-leg journey", () => {
    const legs = [
      leg({ from: { name: "Richmond home" }, to: { name: "Crozet" } }),
      leg({ from: { name: "Crozet" }, to: { name: "Waynesboro" } }),
      leg({ from: { name: "Waynesboro" }, to: { name: "Charlottesville site" } }),
    ];
    expect(viaLabel(legs)).toBe("Crozet, Waynesboro");
  });

  it("falls back to address, then coordinates, when a stop has no name", () => {
    const legs = [
      leg({ to: { address: "123 Family Ln, Crozet, VA" } }),
      leg({ to: { name: "Charlottesville site" } }),
    ];
    expect(viaLabel(legs)).toBe("123 Family Ln, Crozet, VA");
  });

  it("skips a stop that resolves to an empty label rather than inserting a stray comma", () => {
    const legs = [leg({ to: {} }), leg({ to: { name: "Charlottesville site" } })];
    expect(viaLabel(legs)).toBe("");
  });
});

describe("routeText", () => {
  it("returns the plain to-label for a trip with no legs", () => {
    const trip = makeTrip({ to: { name: "Office" } });
    expect(routeText(trip)).toBe("Office");
  });

  it("returns the plain to-label for a trip with a single leg (no via)", () => {
    const trip = makeTrip({
      to: { name: "Office" },
      legs: [leg({ from: { name: "Home" }, to: { name: "Office" } })],
    });
    expect(routeText(trip)).toBe("Office");
  });

  it('reads "Final Destination (via Stop)" for a 2-leg stop journey', () => {
    const trip = makeTrip({
      to: { name: "Charlottesville site" },
      legs: [
        leg({ from: { name: "Richmond home" }, to: { name: "Crozet" }, billable: false }),
        leg({ from: { name: "Crozet" }, to: { name: "Charlottesville site" }, billable: true }),
      ],
    });
    expect(routeText(trip)).toBe("Charlottesville site (via Crozet)");
  });

  it("joins multiple via stops for a 3-leg journey", () => {
    const trip = makeTrip({
      to: { name: "Charlottesville site" },
      legs: [
        leg({ from: { name: "Richmond home" }, to: { name: "Crozet" } }),
        leg({ from: { name: "Crozet" }, to: { name: "Waynesboro" } }),
        leg({ from: { name: "Waynesboro" }, to: { name: "Charlottesville site" } }),
      ],
    });
    expect(routeText(trip)).toBe("Charlottesville site (via Crozet, Waynesboro)");
  });

  it("uses trip.to (the final destination) rather than the last leg's to, even if they were to disagree", () => {
    const trip = makeTrip({
      to: { name: "Reported Destination" },
      legs: [
        leg({ from: { name: "Home" }, to: { name: "Crozet" } }),
        leg({ from: { name: "Crozet" }, to: { name: "Different Name" } }),
      ],
    });
    expect(routeText(trip)).toBe("Reported Destination (via Crozet)");
  });
});

describe("legsSummary", () => {
  it("is empty for a trip with no legs", () => {
    expect(legsSummary(makeTrip())).toBe("");
  });

  it("is empty for a trip with an empty legs array", () => {
    expect(legsSummary(makeTrip({ legs: [] }))).toBe("");
  });

  it('reads "1 of 1 leg billed" (singular) for a single billed leg', () => {
    const trip = makeTrip({ legs: [leg({ billable: true })] });
    expect(legsSummary(trip)).toBe("1 of 1 leg billed");
  });

  it('reads "2 of 3 legs billed" (plural) when some legs are personal', () => {
    const trip = makeTrip({
      legs: [leg({ billable: true }), leg({ billable: false }), leg({ billable: true })],
    });
    expect(legsSummary(trip)).toBe("2 of 3 legs billed");
  });

  it('reads "0 of 2 legs billed" when nothing in the journey is billable', () => {
    const trip = makeTrip({ legs: [leg({ billable: false }), leg({ billable: false })] });
    expect(legsSummary(trip)).toBe("0 of 2 legs billed");
  });
});
