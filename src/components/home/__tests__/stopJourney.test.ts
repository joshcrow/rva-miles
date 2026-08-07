import { describe, expect, it } from "vitest";
import type { Place } from "@/types";
import {
  billedFromSegs,
  buildLegs,
  everyLegMeasured,
  legMiles,
  pairKey,
  pointLabel,
  rebuildSegs,
  routable,
  segMilesOf,
  type Pt,
  type Seg,
} from "../stopJourney";

const home: Place = { name: "Home", latLng: { lat: 37.5407, lng: -77.436 } };
const crozet: Place = { name: "Crozet", latLng: { lat: 38.0687, lng: -78.7017 } };
const cville: Place = { name: "Charlottesville site", latLng: { lat: 38.0293, lng: -78.4767 } };
const pinless: Place = { name: "The old barn" };

function seg(partial: Partial<Seg> & { key: string }): Seg {
  return { distance: "", status: "idle", billable: true, ...partial };
}

/** The segment list for a fresh set of points, as the sheet builds it. */
function segsFor(points: Pt[]): Seg[] {
  return rebuildSegs([], points);
}

describe("pairKey", () => {
  it("is direction-sensitive", () => {
    expect(pairKey(home, crozet)).not.toBe(pairKey(crozet, home));
  });

  it("treats an unfilled point as its own distinct identity", () => {
    expect(pairKey(home, null)).not.toBe(pairKey(home, crozet));
    expect(pairKey(home, null)).toBe(pairKey(home, null));
  });

  it("matches two pins at the same place regardless of the name typed", () => {
    const renamed: Place = { name: "Family house", latLng: { lat: 38.06871, lng: -78.70172 } };
    expect(pairKey(home, renamed)).toBe(pairKey(home, crozet));
  });
});

describe("routable", () => {
  it("needs a map pin at both ends", () => {
    expect(routable(home, crozet)).toBe(true);
    expect(routable(home, pinless)).toBe(false);
    expect(routable(home, null)).toBe(false);
  });
});

describe("rebuildSegs", () => {
  it("builds one segment per consecutive pair", () => {
    expect(segsFor([home, crozet, cville])).toHaveLength(2);
    expect(segsFor([home, cville])).toHaveLength(1);
  });

  it("queues a routable pair for measurement and leaves a pin-less one manual", () => {
    expect(segsFor([home, crozet])[0].status).toBe("queued");
    expect(segsFor([home, pinless])[0].status).toBe("idle");
    expect(segsFor([home, null])[0].status).toBe("idle");
  });

  it("keeps the numbers of a segment whose endpoints did not change", () => {
    const prev = [seg({ key: pairKey(home, crozet), distance: "71.2", status: "resolved" })];
    const next = rebuildSegs(prev, [home, crozet]);
    expect(next[0]).toBe(prev[0]);
  });

  // The money rule: a distance measured for one pair of places must never be
  // billed as the distance for a different pair.
  it("clears a measured distance when an endpoint changes", () => {
    const prev = [seg({ key: pairKey(home, crozet), distance: "71.2", status: "resolved" })];
    const next = rebuildSegs(prev, [home, cville]);
    expect(next[0].distance).toBe("");
    expect(next[0].status).toBe("queued");
  });

  it("clears a hand-typed distance too when the endpoints change", () => {
    const prev = [seg({ key: pairKey(home, pinless), distance: "40", status: "idle" })];
    const next = rebuildSegs(prev, [home, { name: "Somewhere else" }]);
    expect(next[0].distance).toBe("");
  });

  it("resets the first leg when a stop is inserted before the destination", () => {
    const before = [seg({ key: pairKey(home, cville), distance: "71.3", status: "resolved" })];
    const after = rebuildSegs(before, [home, null, cville]);
    expect(after).toHaveLength(2);
    // Home → (empty stop) can't still be 71.3 — that was Home → the work site.
    expect(after[0].distance).toBe("");
    expect(after[1].distance).toBe("");
  });

  it("resets the merged leg when a stop is removed", () => {
    const before = [
      seg({ key: pairKey(home, crozet), distance: "71.2", status: "resolved" }),
      seg({ key: pairKey(crozet, cville), distance: "22.4", status: "resolved" }),
    ];
    const after = rebuildSegs(before, [home, cville]);
    expect(after).toHaveLength(1);
    expect(after[0].distance).toBe("");
    expect(after[0].key).toBe(pairKey(home, cville));
  });

  it("carries the billable switch over by position but never the distance", () => {
    const before = [
      seg({ key: pairKey(home, crozet), distance: "71.2", billable: false }),
      seg({ key: pairKey(crozet, cville), distance: "22.4", billable: true }),
    ];
    const after = rebuildSegs(before, [home, { name: "Barboursville", latLng: { lat: 38.2, lng: -78.3 } }, cville]);
    expect(after[0].billable).toBe(false);
    expect(after[1].billable).toBe(true);
    expect(after.map((s) => s.distance)).toEqual(["", ""]);
  });

  it("defaults a brand-new leg to billable", () => {
    expect(segsFor([home, crozet, cville]).every((s) => s.billable)).toBe(true);
  });
});

describe("segMilesOf / legMiles", () => {
  it("reads each leg's typed distance", () => {
    const segs = [seg({ key: "a", distance: "71.2" }), seg({ key: "b", distance: "22.4" })];
    expect(segMilesOf(segs)).toEqual([71.2, 22.4]);
  });

  it("records a blank or unusable field as zero rather than NaN", () => {
    expect(legMiles(seg({ key: "a", distance: "" }))).toBe(0);
    expect(legMiles(seg({ key: "a", distance: "." }))).toBe(0);
    expect(legMiles(seg({ key: "a", distance: "22.4" }))).toBe(22.4);
  });
});

describe("everyLegMeasured", () => {
  it("requires a positive distance on a leg that will be billed", () => {
    expect(everyLegMeasured([seg({ key: "a", distance: "71.2" }), seg({ key: "b" })])).toBe(false);
    expect(everyLegMeasured([seg({ key: "a", distance: "0" })])).toBe(false);
    expect(everyLegMeasured([])).toBe(false);
    expect(everyLegMeasured([seg({ key: "a", distance: "71.2" })])).toBe(true);
  });

  // Routing can be down and the family house may have no map pin; that must
  // not block logging the billable work leg.
  it("lets a personal leg be left blank", () => {
    const segs = [
      seg({ key: "a", distance: "", billable: false }),
      seg({ key: "b", distance: "22.4", billable: true }),
    ];
    expect(everyLegMeasured(segs)).toBe(true);
  });

  it("still rejects nonsense typed into a personal leg", () => {
    const segs = [
      seg({ key: "a", distance: "-", billable: false }),
      seg({ key: "b", distance: "22.4", billable: true }),
    ];
    expect(everyLegMeasured(segs)).toBe(false);
  });
});

describe("billedFromSegs", () => {
  it("sums only the legs switched on", () => {
    const segs = [
      seg({ key: "a", distance: "71.2", billable: false }),
      seg({ key: "b", distance: "22.4", billable: true }),
    ];
    expect(billedFromSegs(segs)).toBe(22.4);
  });

  it("sums every leg when they are all billable", () => {
    const segs = [
      seg({ key: "a", distance: "71.2" }),
      seg({ key: "b", distance: "22.4" }),
      seg({ key: "c", distance: "1.1" }),
    ];
    expect(billedFromSegs(segs)).toBe(94.7);
  });

  it("rounds the sum once, to the tenth the app shows", () => {
    const segs = [seg({ key: "a", distance: "0.15" }), seg({ key: "b", distance: "0.15" })];
    expect(billedFromSegs(segs)).toBe(0.3);
  });

  it("is zero when every leg is personal", () => {
    const segs = [
      seg({ key: "a", distance: "71.2", billable: false }),
      seg({ key: "b", distance: "22.4", billable: false }),
    ];
    expect(billedFromSegs(segs)).toBe(0);
  });

  it("ignores unmeasured legs rather than producing NaN", () => {
    const segs = [seg({ key: "a", distance: "71.2" }), seg({ key: "b", distance: "" })];
    expect(billedFromSegs(segs)).toBe(71.2);
  });
});

describe("buildLegs", () => {
  const points: Pt[] = [home, crozet, cville];
  const segs = [
    seg({ key: pairKey(home, crozet), distance: "71.2", billable: false }),
    seg({ key: pairKey(crozet, cville), distance: "22.4", billable: true }),
  ];

  it("produces ordered legs whose endpoints chain end-to-end", () => {
    const legs = buildLegs(points, segs);
    expect(legs).not.toBeNull();
    expect(legs).toEqual([
      { from: home, to: crozet, distanceMiles: 71.2, billable: false },
      { from: crozet, to: cville, distanceMiles: 22.4, billable: true },
    ]);
    expect(legs?.[0].to).toBe(legs?.[1].from);
  });

  it("keeps the journey endpoints reachable from the legs", () => {
    const legs = buildLegs(points, segs) ?? [];
    expect(legs[0].from).toBe(home);
    expect(legs[legs.length - 1].to).toBe(cville);
  });

  it("refuses a journey with an unfilled stop", () => {
    expect(buildLegs([home, null, cville], segs)).toBeNull();
  });

  it("refuses a journey with an unmeasured BILLABLE leg", () => {
    const partial = [segs[0], seg({ key: pairKey(crozet, cville), distance: "" })];
    expect(buildLegs(points, partial)).toBeNull();
  });

  it("records a blank personal leg as zero miles rather than refusing", () => {
    const blankPersonal = [
      seg({ key: pairKey(home, crozet), distance: "", billable: false }),
      segs[1],
    ];
    expect(buildLegs(points, blankPersonal)).toEqual([
      { from: home, to: crozet, distanceMiles: 0, billable: false },
      { from: crozet, to: cville, distanceMiles: 22.4, billable: true },
    ]);
  });

  it("refuses a plain two-point trip — that is not a stop journey", () => {
    expect(buildLegs([home, cville], [seg({ key: pairKey(home, cville), distance: "71.3" })])).toBeNull();
  });

  it("refuses a segment list that does not match the points", () => {
    expect(buildLegs(points, [segs[0]])).toBeNull();
  });

  it("sums to the same billed total the sheet shows", () => {
    const legs = buildLegs(points, segs) ?? [];
    const billed = legs.reduce((sum, l) => (l.billable ? sum + l.distanceMiles : sum), 0);
    expect(billed).toBe(billedFromSegs(segs));
  });
});

describe("pointLabel", () => {
  it("names a filled point", () => {
    expect(pointLabel(crozet, 1, 3)).toBe("Crozet");
  });

  it("describes an empty point by its role in the journey", () => {
    expect(pointLabel(null, 0, 3)).toBe("Start");
    expect(pointLabel(null, 1, 3)).toBe("Stop 1");
    expect(pointLabel(null, 2, 3)).toBe("Destination");
  });
});
