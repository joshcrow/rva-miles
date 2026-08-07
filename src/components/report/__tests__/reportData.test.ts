import { describe, expect, it } from "vitest";
import type { Settings, Trip } from "@/types";
import { buildCsv, buildSummaryText } from "@/lib/exporters";
import { decodeReport, encodeReport } from "@/lib/reportlink";
import {
  buildMeta,
  buildPayload,
  buildTsv,
  computeTotals,
  displayRows,
  filterTripsInRange,
  fmtMiles,
  fmtMoney,
  formatKeyFull,
  formatKeyShort,
  normalizeRange,
  payloadToMeta,
  payloadToTrips,
  rangeLabelLong,
  rangeLabelShort,
  reportSubject,
  sanitizePayload,
  uniformRate,
} from "../reportData";

function trip(over: Partial<Trip> = {}): Trip {
  return {
    id: over.id ?? "t1",
    dateKey: "2025-08-04",
    from: { name: "Home" },
    to: { name: "Clinic" },
    distanceMiles: 10,
    ratePerMile: 0.7,
    source: "tile",
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

const SETTINGS: Settings = {
  ratePerMile: 0.7,
  theme: "system",
  ownerName: "Dana Smith",
  vehicle: "Subaru Outback",
};

describe("filterTripsInRange", () => {
  const trips = [
    trip({ id: "a", dateKey: "2025-07-31" }),
    trip({ id: "b", dateKey: "2025-08-01" }),
    trip({ id: "c", dateKey: "2025-08-09" }),
    trip({ id: "d", dateKey: "2025-08-15" }),
    trip({ id: "e", dateKey: "2025-08-16" }),
  ];

  it("includes BOTH boundary days (v1 dropped the final day of every period)", () => {
    const got = filterTripsInRange(trips, { startKey: "2025-08-01", endKey: "2025-08-15" });
    expect(got.map((t) => t.id)).toEqual(["b", "c", "d"]);
  });

  it("matches a single-day range", () => {
    const got = filterTripsInRange(trips, { startKey: "2025-08-09", endKey: "2025-08-09" });
    expect(got.map((t) => t.id)).toEqual(["c"]);
  });

  it("excludes soft-deleted trips", () => {
    const got = filterTripsInRange(
      [...trips, trip({ id: "gone", dateKey: "2025-08-05", deletedAt: 999 })],
      { startKey: "2025-08-01", endKey: "2025-08-15" },
    );
    expect(got.map((t) => t.id)).not.toContain("gone");
  });

  it("returns rows chronologically, ties broken by createdAt", () => {
    const got = filterTripsInRange(
      [
        trip({ id: "late", dateKey: "2025-08-04", createdAt: 20 }),
        trip({ id: "early", dateKey: "2025-08-04", createdAt: 10 }),
        trip({ id: "first", dateKey: "2025-08-02", createdAt: 99 }),
      ],
      { startKey: "2025-08-01", endKey: "2025-08-31" },
    );
    expect(got.map((t) => t.id)).toEqual(["first", "early", "late"]);
  });

  it("does not mutate the input array", () => {
    const input = [...trips];
    filterTripsInRange(input, { startKey: "2025-08-01", endKey: "2025-08-15" });
    expect(input.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("normalizeRange", () => {
  it("leaves an ordered range alone", () => {
    expect(normalizeRange({ startKey: "2025-08-01", endKey: "2025-08-15" })).toEqual({
      startKey: "2025-08-01",
      endKey: "2025-08-15",
    });
  });

  it("swaps a backwards range", () => {
    expect(normalizeRange({ startKey: "2025-08-15", endKey: "2025-08-01" })).toEqual({
      startKey: "2025-08-01",
      endKey: "2025-08-15",
    });
  });
});

describe("computeTotals", () => {
  it("reconciles to the CSV totals row exactly", () => {
    // Values chosen so naive raw-summing and row-rounded summing disagree.
    const trips = [
      trip({ id: "1", distanceMiles: 1.44, ratePerMile: 0.7 }),
      trip({ id: "2", distanceMiles: 1.44, ratePerMile: 0.7 }),
      trip({ id: "3", distanceMiles: 1.44, ratePerMile: 0.7 }),
      trip({ id: "4", distanceMiles: 10.05, ratePerMile: 0.725 }),
    ];
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-31" }, SETTINGS);
    const totals = computeTotals(trips);

    const lines = buildCsv(trips, meta).trim().split("\r\n");
    const totalsRow = lines[lines.length - 1].split(",");

    expect(fmtMiles(totals.miles)).toBe(totalsRow[4]);
    expect(fmtMoney(totals.money)).toBe(`$${totalsRow[6]}`);
  });

  it("reconciles to the plaintext summary totals", () => {
    const trips = [
      trip({ id: "1", distanceMiles: 12.34, ratePerMile: 0.7 }),
      trip({ id: "2", distanceMiles: 8.06, ratePerMile: 0.7 }),
    ];
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-31" }, SETTINGS);
    const totals = computeTotals(trips);
    const summary = buildSummaryText(trips, meta);
    expect(summary).toContain(`${fmtMiles(totals.miles)} miles`);
    expect(summary).toContain(fmtMoney(totals.money));
  });

  it("is zero for an empty report", () => {
    expect(computeTotals([])).toEqual({ count: 0, miles: 0, money: 0 });
  });
});

describe("uniformRate", () => {
  it("returns the shared rate", () => {
    expect(uniformRate([trip({ ratePerMile: 0.7 }), trip({ ratePerMile: 0.7 })])).toBe(0.7);
  });

  it("returns null when rates differ (a period spanning a rate change)", () => {
    expect(uniformRate([trip({ ratePerMile: 0.7 }), trip({ ratePerMile: 0.725 })])).toBeNull();
  });

  it("returns null for no trips", () => {
    expect(uniformRate([])).toBeNull();
  });
});

describe("formatting", () => {
  it("formats keys without ever parsing them as dates", () => {
    expect(formatKeyShort("2025-01-01")).toBe("Jan 1");
    expect(formatKeyFull("2025-12-31")).toBe("Dec 31, 2025");
  });

  it("collapses ranges sensibly", () => {
    expect(rangeLabelLong({ startKey: "2025-08-01", endKey: "2025-08-15" })).toBe("Aug 1–15, 2025");
    expect(rangeLabelLong({ startKey: "2025-08-28", endKey: "2025-09-10" })).toBe(
      "Aug 28 – Sep 10, 2025",
    );
    expect(rangeLabelLong({ startKey: "2024-12-20", endKey: "2025-01-02" })).toBe(
      "Dec 20, 2024 – Jan 2, 2025",
    );
    expect(rangeLabelLong({ startKey: "2025-08-04", endKey: "2025-08-04" })).toBe("Aug 4, 2025");
    expect(rangeLabelShort({ startKey: "2025-08-01", endKey: "2025-08-15" })).toBe("Aug 1–15");
  });

  it("groups thousands and keeps fixed decimals", () => {
    expect(fmtMiles(1234.56)).toBe("1,234.6");
    expect(fmtMoney(0)).toBe("$0.00");
    expect(fmtMoney(1234.5)).toBe("$1,234.50");
  });
});

describe("reportSubject", () => {
  it("carries range, miles and money", () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
    const trips = [trip({ distanceMiles: 214.6, ratePerMile: 0.7 })];
    expect(reportSubject(meta, computeTotals(trips))).toBe(
      "Mileage — Aug 1–15, 2025 — 214.6 mi — $150.22",
    );
  });
});

describe("report link payload", () => {
  const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
  const trips = [
    trip({ id: "1", dateKey: "2025-08-02", distanceMiles: 12.3456789, ratePerMile: 0.7 }),
    trip({
      id: "2",
      dateKey: "2025-08-11",
      distanceMiles: 4.2,
      ratePerMile: 0.7,
      purpose: "Client visit",
      from: { address: "100 Main St, Richmond, VA" },
      to: { name: "Chesterfield Clinic" },
    }),
  ];

  it("round-trips through the viewer with identical totals", () => {
    const payload = buildPayload(trips, meta, 1_754_000_000_000);
    const viewerTrips = payloadToTrips(payload);
    expect(computeTotals(viewerTrips)).toEqual(computeTotals(trips));
  });

  it("carries owner, vehicle and range", () => {
    const payload = buildPayload(trips, meta, 1);
    expect(payload.ownerName).toBe("Dana Smith");
    expect(payload.vehicle).toBe("Subaru Outback");
    expect(payload.range).toEqual({ startKey: "2025-08-01", endKey: "2025-08-15" });
    expect(payloadToMeta(payload)).toEqual(meta);
  });

  it("labels places by name, falling back to address", () => {
    const payload = buildPayload(trips, meta, 1);
    expect(payload.trips[1].from).toBe("100 Main St, Richmond, VA");
    expect(payload.trips[1].to).toBe("Chesterfield Clinic");
    expect(payload.trips[1].purpose).toBe("Client visit");
  });

  it("omits owner and vehicle when settings are blank", () => {
    const bare = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, {
      ratePerMile: 0.7,
      theme: "system",
      ownerName: "   ",
    });
    expect(bare.ownerName).toBeUndefined();
    expect(bare.vehicle).toBeUndefined();
  });
});

describe("multi-leg trips — via is folded into the payload/display `to` string", () => {
  // ReportPayload has no `legs` field (schema stays v:1), so the personal
  // stop must be baked into the flat `to` string once, at buildPayload time.
  const stopTrip = trip({
    id: "stop",
    dateKey: "2025-08-05",
    from: { name: "Richmond home" },
    to: { name: "Charlottesville site" },
    distanceMiles: 25,
    ratePerMile: 0.7,
    legs: [
      { from: { name: "Richmond home" }, to: { name: "Crozet" }, distanceMiles: 40, billable: false },
      { from: { name: "Crozet" }, to: { name: "Charlottesville site" }, distanceMiles: 25, billable: true },
    ],
  });

  it("buildPayload folds the via stop into the flat to string", () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
    const payload = buildPayload([stopTrip], meta, 1);
    expect(payload.trips[0].to).toBe("Charlottesville site (via Crozet)");
  });

  it("a round-tripped viewer trip (synthesized from the flat payload) displays the same via text with no further changes", () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
    const payload = buildPayload([stopTrip], meta, 1);
    const viewerTrips = payloadToTrips(payload);
    expect(displayRows(viewerTrips)[0].to).toBe("Charlottesville site (via Crozet)");
  });

  it("displayRows on the original (legs-carrying) trip also shows the via text", () => {
    expect(displayRows([stopTrip])[0].to).toBe("Charlottesville site (via Crozet)");
  });

  it("a legless trip is completely unaffected — to is still the plain destination", () => {
    const plain = trip({ to: { name: "Office" } });
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
    expect(buildPayload([plain], meta, 1).trips[0].to).toBe("Office");
    expect(displayRows([plain])[0].to).toBe("Office");
  });
});

describe("sanitizePayload", () => {
  it("coerces hostile / corrupt rows instead of crashing", () => {
    const dirty = {
      v: 1,
      title: 42,
      range: { startKey: "nope", endKey: "2025-08-15" },
      generatedAt: "soon",
      trips: [
        { dateKey: "2025-13-99x", from: null, to: undefined, miles: "12", rate: -3 },
        { dateKey: "2025-08-02", from: "A", to: "B", miles: 5, rate: 0.7, purpose: "" },
      ],
    } as unknown as Parameters<typeof sanitizePayload>[0];

    const clean = sanitizePayload(dirty);
    expect(clean.title).toBe("Mileage Report");
    expect(clean.range).toEqual({ startKey: "", endKey: "2025-08-15" });
    expect(clean.generatedAt).toBe(0);
    expect(clean.trips[0]).toEqual({
      dateKey: "",
      from: "",
      to: "",
      miles: 0,
      rate: 0,
      purpose: undefined,
    });
    expect(clean.trips[1].miles).toBe(5);
  });
});

describe("end-to-end: what the sender sees is what the recipient sees", () => {
  it("survives encode → decode → viewer with identical rows and totals", async () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-15" }, SETTINGS);
    const trips = [
      trip({ id: "1", dateKey: "2025-08-01", distanceMiles: 14.237, ratePerMile: 0.7 }),
      trip({
        id: "2",
        dateKey: "2025-08-07",
        distanceMiles: 3.05,
        ratePerMile: 0.7,
        purpose: "Home visit, Southside",
        from: { name: "Office", address: "1 Broad St, Richmond, VA" },
        to: { address: "= not a formula, 22 Elm Ave" },
      }),
      // Last day of the range: the row v1 always dropped.
      trip({ id: "3", dateKey: "2025-08-15", distanceMiles: 28.9, ratePerMile: 0.725 }),
    ];

    const senderRows = displayRows(trips);
    const senderTotals = computeTotals(trips);

    const encoded = await encodeReport(buildPayload(trips, meta, 1_754_000_000_000));
    const received = sanitizePayload(await decodeReport(encoded));
    const viewerTrips = payloadToTrips(received);

    expect(displayRows(viewerTrips)).toEqual(senderRows);
    expect(computeTotals(viewerTrips)).toEqual(senderTotals);
    expect(payloadToMeta(received)).toEqual(meta);
    expect(received.trips).toHaveLength(3);
    expect(received.trips[2].dateKey).toBe("2025-08-15");
    expect(buildCsv(viewerTrips, payloadToMeta(received))).toBe(buildCsv(trips, meta));
  });
});

describe("buildTsv", () => {
  it("emits a header, one line per trip and a totals line", () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-31" }, SETTINGS);
    const trips = [
      trip({ id: "1", dateKey: "2025-08-02", distanceMiles: 10, ratePerMile: 0.7 }),
      trip({ id: "2", dateKey: "2025-08-03", distanceMiles: 5, ratePerMile: 0.7 }),
    ];
    const lines = buildTsv(trips, meta).split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0].split("\t")).toEqual([
      "Date", "From", "To", "Purpose", "Miles", "Rate", "Amount",
    ]);
    expect(lines[1].split("\t")[0]).toBe("Aug 2, 2025");
    expect(lines[3].split("\t")).toEqual(["", "", "", "Totals", "15.0", "", "$10.50"]);
  });

  it("agrees with the rendered table rows", () => {
    const meta = buildMeta({ startKey: "2025-08-01", endKey: "2025-08-31" }, SETTINGS);
    const trips = [trip({ distanceMiles: 12.34, ratePerMile: 0.7 })];
    const [row] = displayRows(trips);
    const tsvRow = buildTsv(trips, meta).split("\n")[1].split("\t");
    expect(tsvRow[4]).toBe(row.miles);
    expect(tsvRow[6]).toBe(row.amount);
  });
});
