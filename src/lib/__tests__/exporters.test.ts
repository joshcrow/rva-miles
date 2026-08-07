import { describe, expect, it } from "vitest";
import type { Trip, TripLeg } from "@/types";
import { buildCsv, buildSummaryText, buildXlsx, reportFilename, type ReportMeta } from "../exporters";

let nextId = 1;
function makeTrip(overrides: Partial<Trip> = {}): Trip {
  const id = `trip-${nextId++}`;
  return {
    id,
    dateKey: "2026-08-03",
    from: { name: "Home" },
    to: { name: "Office" },
    distanceMiles: 10,
    ratePerMile: 0.5,
    source: "manual",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const meta: ReportMeta = {
  title: "Pay Period Report",
  range: { startKey: "2026-08-01", endKey: "2026-08-15" },
  ownerName: "Dana Smith",
  vehicle: "Honda CR-V",
};

describe("buildCsv", () => {
  it("emits the exact contract columns and CRLF line endings", () => {
    const csv = buildCsv([], meta);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Date,From,To,Purpose,Miles,Rate,Amount");
    expect(csv.includes("\n") ).toBe(true); // CRLF contains \n too; sanity that we didn't emit bare \r
  });

  it("quotes fields containing commas, doubles embedded quotes, and preserves embedded newlines inside quotes", () => {
    const trip = makeTrip({
      from: { name: "123 Main St, Apt 4" },
      to: { name: 'The "Big" Warehouse' },
      purpose: "Line1\nLine2",
    });
    const csv = buildCsv([trip], meta);
    const lines = csv.split("\r\n");
    // Row for our trip is the second line (after header).
    const row = lines[1];
    expect(row).toContain('"123 Main St, Apt 4"');
    expect(row).toContain('"The ""Big"" Warehouse"');
    expect(row).toContain('"Line1\nLine2"');
  });

  it.each([
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"],
    ["+1+1", "'+1+1"],
    ["-1+1", "'-1+1"],
    ["@SUM(1)", "'@SUM(1)"],
  ])("neutralizes formula-injection prefix %s", (raw, expected) => {
    const trip = makeTrip({ purpose: raw });
    const csv = buildCsv([trip], meta);
    const row = csv.split("\r\n")[1];
    // Purpose is the 4th column; neutralized text has no special chars needing quotes, so it's bare.
    const cells = row.split(",");
    expect(cells[3]).toBe(expected);
  });

  it("does not mangle ordinary text that happens to contain a hyphen mid-string", () => {
    const trip = makeTrip({ purpose: "Client visit - follow up" });
    const csv = buildCsv([trip], meta);
    const row = csv.split("\r\n")[1];
    expect(row).toContain("Client visit - follow up");
    expect(row).not.toContain("'Client");
  });

  it("computes per-row and totals math correctly with clean values", () => {
    const trips = [
      makeTrip({ distanceMiles: 10.2, ratePerMile: 0.5 }),
      makeTrip({ distanceMiles: 5.1, ratePerMile: 0.5 }),
    ];
    const csv = buildCsv(trips, meta);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines[1]).toBe("2026-08-03,Home,Office,,10.2,0.50,5.10");
    expect(lines[2]).toBe("2026-08-03,Home,Office,,5.1,0.50,2.55");
    expect(lines[3]).toBe(",,,Totals,15.3,,7.65");
  });

  it("rounds miles to 1 decimal and money to 2 decimals, totals reconciling with displayed rows", () => {
    const trips = [makeTrip({ distanceMiles: 12.34, ratePerMile: 0.655 })];
    const csv = buildCsv(trips, meta);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines[1]).toBe("2026-08-03,Home,Office,,12.3,0.655,8.08");
    expect(lines[2]).toBe(",,,Totals,12.3,,8.08");
  });

  // Published IRS rates carry half cents (2026 is 72.5c). Rounding the rate
  // column to cents would print "$0.72" beside an amount computed at 0.725 —
  // a report that visibly fails to reconcile is a report that gets sent back.
  it("keeps a half-cent rate intact rather than rounding it to cents", () => {
    const trips = [makeTrip({ distanceMiles: 100, ratePerMile: 0.725 })];
    const lines = buildCsv(trips, meta).split("\r\n").filter(Boolean);
    expect(lines[1]).toBe("2026-08-03,Home,Office,,100.0,0.725,72.50");

    const summary = buildSummaryText(trips, meta);
    expect(summary).toContain("$0.725");
    expect(summary).not.toContain("$0.72 ");
  });

  it("still prints a whole-cent rate with two decimals", () => {
    const trips = [makeTrip({ distanceMiles: 10, ratePerMile: 0.7 })];
    const lines = buildCsv(trips, meta).split("\r\n").filter(Boolean);
    expect(lines[1]).toBe("2026-08-03,Home,Office,,10.0,0.70,7.00");
  });

  it("sorts rows chronologically by dateKey regardless of input order", () => {
    const trips = [
      makeTrip({ dateKey: "2026-08-10", purpose: "second" }),
      makeTrip({ dateKey: "2026-08-01", purpose: "first" }),
    ];
    const csv = buildCsv(trips, meta);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines[1]).toContain("first");
    expect(lines[2]).toContain("second");
  });

  it("handles an empty trip list with a zeroed totals row", () => {
    const csv = buildCsv([], meta);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(",,,Totals,0.0,,0.00");
  });
});

describe("buildSummaryText", () => {
  it("includes title, period, owner, vehicle, and an aligned table with matching-width rows", () => {
    const trips = [
      makeTrip({ dateKey: "2026-08-01", distanceMiles: 10, ratePerMile: 0.5, purpose: "Site visit" }),
      makeTrip({ dateKey: "2026-08-05", distanceMiles: 3.25, ratePerMile: 0.5, purpose: "Supply run" }),
    ];
    const text = buildSummaryText(trips, meta);
    expect(text).toContain("Pay Period Report");
    expect(text).toContain("Owner: Dana Smith");
    expect(text).toContain("Vehicle: Honda CR-V");
    expect(text).toContain("Period: Aug 1, 2026 - Aug 15, 2026");

    const lines = text.split("\n");
    const headerIdx = lines.findIndex((l) => l.startsWith("Date"));
    expect(headerIdx).toBeGreaterThan(-1);
    const headerLine = lines[headerIdx];
    const separatorLine = lines[headerIdx + 1];
    expect(separatorLine.replace(/[^-\s]/g, "")).toBe(separatorLine); // dashes/spaces only
    // Every subsequent table line lines up to the same total width as the header.
    const dataLine = lines[headerIdx + 2];
    const totalsLine = lines[headerIdx + 5];
    expect(dataLine.length).toBe(headerLine.length);
    expect(totalsLine.length).toBe(headerLine.length);
    expect(totalsLine).toContain("Totals");

    expect(text).toMatch(/2 trips • 13\.3 miles • \$6\.63 total/);
  });

  it("omits owner/vehicle lines when not provided and still renders a valid table", () => {
    const bareMeta: ReportMeta = { title: "Untitled", range: { startKey: "2026-08-01", endKey: "2026-08-01" } };
    const text = buildSummaryText([], bareMeta);
    expect(text).not.toContain("Owner:");
    expect(text).not.toContain("Vehicle:");
    expect(text).toMatch(/0 trips • 0\.0 miles • \$0\.00 total/);
  });
});

describe("buildXlsx", () => {
  it("produces a styled workbook with real numeric cells, brand header fill, and a bold reconciling totals row", async () => {
    const trips = [
      makeTrip({ dateKey: "2026-08-02", distanceMiles: 10.2, ratePerMile: 0.5, purpose: "Client visit" }),
      makeTrip({ dateKey: "2026-08-04", distanceMiles: 5.1, ratePerMile: 0.5, purpose: "Delivery" }),
    ];
    const blob = await buildXlsx(trips, meta);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const ExcelJS = (await import("exceljs")).default;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    // exceljs ships its own ambient `Buffer` shim (conflicts with @types/node's generic Buffer) — known upstream typings gap.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Mileage Report");
    expect(sheet).toBeTruthy();
    if (!sheet) return;

    // Row 1: title, branded + bold.
    const titleCell = sheet.getRow(1).getCell(1);
    expect(titleCell.value).toBe("Pay Period Report");
    expect(titleCell.font?.bold).toBe(true);

    // Row 7: table header, brand fill + white bold text (title/period/owner/vehicle/generated = rows 1-5, blank = 6).
    const headerRow = sheet.getRow(7);
    expect(headerRow.getCell(1).value).toBe("Date");
    expect(headerRow.getCell(5).value).toBe("Miles");
    const fill = headerRow.getCell(1).fill as { fgColor?: { argb?: string } };
    expect(fill?.fgColor?.argb).toBe("FF7C3AED");
    expect(headerRow.getCell(1).font?.bold).toBe(true);
    expect(headerRow.getCell(1).font?.color?.argb).toBe("FFFFFFFF");

    // Rows 8-9: data, real numbers with number formats.
    const row1 = sheet.getRow(8);
    expect(row1.getCell(5).value).toBe(10.2);
    expect(row1.getCell(5).numFmt).toBe("0.0");
    expect(row1.getCell(7).value).toBe(5.1);
    expect(row1.getCell(7).numFmt).toBe('"$"#,##0.00');

    // The rate is a real number too, kept at full precision so the sheet's
    // own arithmetic reproduces the amount.
    expect(row1.getCell(6).value).toBe(0.5);
    expect(row1.getCell(6).numFmt).toBe('"$"#,##0.00#');

    // Row 10: totals, bold, reconciling with the displayed rows.
    const totalsRow = sheet.getRow(10);
    expect(totalsRow.getCell(4).value).toBe("Totals");
    expect(totalsRow.getCell(5).value).toBe(15.3);
    expect(totalsRow.getCell(7).value).toBe(7.65);
    expect(totalsRow.getCell(4).font?.bold).toBe(true);
    expect(totalsRow.getCell(7).font?.bold).toBe(true);

    // Column widths were sized (not left at default/undefined).
    expect(sheet.getColumn(2).width).toBeGreaterThan(0);
  });

  it("writes a half-cent rate into the sheet without rounding it to cents", async () => {
    const trips = [makeTrip({ distanceMiles: 100, ratePerMile: 0.725 })];
    const blob = await buildXlsx(trips, meta);
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await blob.arrayBuffer());
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Mileage Report");
    if (!sheet) throw new Error("missing sheet");
    const row = sheet.getRow(8);
    // miles * rate must reproduce the amount inside Excel itself.
    expect(row.getCell(6).value).toBe(0.725);
    expect(row.getCell(7).value).toBe(72.5);
    expect((row.getCell(5).value as number) * (row.getCell(6).value as number)).toBe(72.5);
  });

  it("still produces a valid workbook for an empty trip list", async () => {
    const blob = await buildXlsx([], meta);
    const ExcelJS = (await import("exceljs")).default;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    // exceljs ships its own ambient `Buffer` shim (conflicts with @types/node's generic Buffer) — known upstream typings gap.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Mileage Report");
    expect(sheet).toBeTruthy();
    if (!sheet) return;
    // No data rows: header block (5) + blank (1) + table header (1) = totals lands on row 8.
    const totalsRow = sheet.getRow(8);
    expect(totalsRow.getCell(4).value).toBe("Totals");
    expect(totalsRow.getCell(5).value).toBe(0);
    expect(totalsRow.getCell(7).value).toBe(0);
  });
});

describe("multi-leg trips (To column reads the route, not just the endpoint)", () => {
  function leg(overrides: Partial<TripLeg> = {}): TripLeg {
    return {
      from: { name: "A" },
      to: { name: "B" },
      distanceMiles: 10,
      billable: true,
      ...overrides,
    };
  }

  // Richmond home -> Crozet (personal, unbilled) -> Charlottesville work
  // site (billed). distanceMiles is the authoritative billed total, already
  // equal to the sum of billable legs — exporters never recompute it.
  const stopTrip = makeTrip({
    from: { name: "Richmond home" },
    to: { name: "Charlottesville site" },
    distanceMiles: 25,
    ratePerMile: 0.5,
    legs: [
      leg({ from: { name: "Richmond home" }, to: { name: "Crozet" }, distanceMiles: 40, billable: false }),
      leg({ from: { name: "Crozet" }, to: { name: "Charlottesville site" }, distanceMiles: 25, billable: true }),
    ],
  });

  it("buildCsv: To column folds the via stop in, miles/amount stay the billed total", () => {
    const lines = buildCsv([stopTrip], meta).split("\r\n").filter(Boolean);
    expect(lines[1]).toBe("2026-08-03,Richmond home,Charlottesville site (via Crozet),,25.0,0.50,12.50");
  });

  it("buildCsv: a trip with a single leg (no via) prints the plain destination", () => {
    const trip = makeTrip({
      to: { name: "Office" },
      legs: [leg({ from: { name: "Home" }, to: { name: "Office" }, billable: true })],
    });
    const lines = buildCsv([trip], meta).split("\r\n").filter(Boolean);
    expect(lines[1]).toContain(",Office,");
    expect(lines[1]).not.toContain("via");
  });

  it("buildCsv: a 3-leg journey joins every intermediate stop", () => {
    const trip = makeTrip({
      from: { name: "Richmond home" },
      to: { name: "Charlottesville site" },
      legs: [
        leg({ from: { name: "Richmond home" }, to: { name: "Crozet" }, billable: false }),
        leg({ from: { name: "Crozet" }, to: { name: "Waynesboro" }, billable: false }),
        leg({ from: { name: "Waynesboro" }, to: { name: "Charlottesville site" }, billable: true }),
      ],
    });
    const lines = buildCsv([trip], meta).split("\r\n").filter(Boolean);
    expect(lines[1]).toContain("Charlottesville site (via Crozet, Waynesboro)");
  });

  it("buildSummaryText: the aligned table shows the via-annotated destination", () => {
    const text = buildSummaryText([stopTrip], meta);
    expect(text).toContain("Charlottesville site (via Crozet)");
  });

  it("buildXlsx: the To cell contains the via-annotated destination, and Miles/Amount are unaffected", async () => {
    const blob = await buildXlsx([stopTrip], meta);
    const ExcelJS = (await import("exceljs")).default;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Mileage Report");
    if (!sheet) throw new Error("missing sheet");
    const row = sheet.getRow(8); // header block (5) + blank (1) + table header (1) + first data row
    expect(row.getCell(3).value).toBe("Charlottesville site (via Crozet)");
    expect(row.getCell(5).value).toBe(25); // Miles: the authoritative billed total, not a leg sum recomputed here
    expect(row.getCell(7).value).toBe(12.5); // Amount: 25 * 0.5
  });
});

describe("reportFilename", () => {
  it("builds rva-miles-<startKey>_<endKey>.<ext>", () => {
    expect(reportFilename(meta, "csv")).toBe("rva-miles-2026-08-01_2026-08-15.csv");
    expect(reportFilename(meta, "xlsx")).toBe("rva-miles-2026-08-01_2026-08-15.xlsx");
  });

  it("strips a leading dot from the extension if the caller passed one", () => {
    expect(reportFilename(meta, ".csv")).toBe("rva-miles-2026-08-01_2026-08-15.csv");
  });
});
