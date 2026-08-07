// Report builders: CSV (RFC 4180 + formula-injection safe), XLSX (ExcelJS,
// lazy-loaded), and a plaintext summary for email bodies. All three share one
// rounding/row pass (computeReportRows) so miles/money never drift between
// formats. Dates are formatted from the 'YYYY-MM-DD' dateKey by string split
// only — never `new Date(dateKey)` — to stay immune to the UTC-parse bug.

import type { DateRange, Place, Trip } from "@/types";
import { routeText } from "./legs";
import { formatRateDigits } from "./rates";

export interface ReportMeta {
  title: string;
  range: DateRange;
  ownerName?: string;
  vehicle?: string;
}

const COLUMN_HEADERS = ["Date", "From", "To", "Purpose", "Miles", "Rate", "Amount"] as const;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Pure string parse of a 'YYYY-MM-DD' key — never constructs a Date from it. */
function formatDateKeyDisplay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${MONTHS_SHORT[(m ?? 1) - 1]} ${d}, ${y}`;
}

/** For an actual instant (epoch ms), not a calendar key — safe to use Date here. */
function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function placeLabel(p: Place | undefined): string {
  if (!p) return "";
  const name = p.name?.trim();
  if (name) return name;
  const address = p.address?.trim();
  if (address) return address;
  if (p.latLng) return `${p.latLng.lat.toFixed(4)}, ${p.latLng.lng.toFixed(4)}`;
  return "";
}

interface ReportRow {
  dateKey: string;
  from: string;
  to: string;
  purpose: string;
  miles: number; // rounded to 1dp
  rate: number; // rounded to 3dp — IRS rates can carry a half cent (72.5c)
  amount: number; // rounded to 2dp
}

interface ReportTotals {
  miles: number; // rounded to 1dp, sum of displayed row.miles
  amount: number; // rounded to 2dp, sum of displayed row.amount
  count: number;
}

/**
 * Rounds at the row level and totals from those rounded rows, so the printed
 * totals row always equals the sum of the printed rows (accounts-payable
 * expectation), rather than a more "exact" but non-reconciling total.
 */
function computeReportRows(trips: Trip[]): { rows: ReportRow[]; totals: ReportTotals } {
  const sorted = [...trips].sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
    return a.createdAt - b.createdAt;
  });

  const rows: ReportRow[] = sorted.map((t) => ({
    dateKey: t.dateKey,
    from: placeLabel(t.from),
    // Multi-leg trips read as "Charlottesville site (via Crozet)" — the
    // intermediate personal stop is visible without adding a column.
    to: routeText(t),
    purpose: t.purpose ?? "",
    miles: roundTo(t.distanceMiles, 1),
    rate: roundTo(t.ratePerMile, 3),
    amount: roundTo(t.distanceMiles * t.ratePerMile, 2),
  }));

  const totals = rows.reduce<ReportTotals>(
    (acc, r) => ({
      miles: roundTo(acc.miles + r.miles, 1),
      amount: roundTo(acc.amount + r.amount, 2),
      count: acc.count + 1,
    }),
    { miles: 0, amount: 0, count: 0 }
  );

  return { rows, totals };
}

// --- CSV -------------------------------------------------------------------

/** Prefixes text starting with =, +, - or @ with ' so spreadsheet apps never evaluate it as a formula. */
function neutralizeFormula(s: string): string {
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function quoteCsvField(s: string): string {
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function csvCell(raw: string): string {
  return quoteCsvField(neutralizeFormula(raw));
}

function csvLine(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

export function buildCsv(trips: Trip[], meta: ReportMeta): string {
  void meta; // CSV stays pure tabular data — no metadata preamble — see buildXlsx/buildSummaryText for the header block
  const { rows, totals } = computeReportRows(trips);

  const lines: string[] = [csvLine([...COLUMN_HEADERS])];

  for (const r of rows) {
    lines.push(
      csvLine([
        r.dateKey,
        r.from,
        r.to,
        r.purpose,
        r.miles.toFixed(1),
        formatRateDigits(r.rate),
        r.amount.toFixed(2),
      ])
    );
  }

  lines.push(
    csvLine(["", "", "", "Totals", totals.miles.toFixed(1), "", totals.amount.toFixed(2)])
  );

  return lines.join("\r\n") + "\r\n";
}

// --- XLSX --------------------------------------------------------------

const BRAND_ARGB = "FF7C3AED";
const WHITE_ARGB = "FFFFFFFF";
const MUTED_ARGB = "FF6B7280";
const MILES_FMT = "0.0";
const MONEY_FMT = '"$"#,##0.00';
// Optional third digit: "$0.70" stays two-decimal, a half-cent rate shows as
// "$0.725" instead of being silently rounded away in the sheet.
const RATE_FMT = '"$"#,##0.00#';

export async function buildXlsx(trips: Trip[], meta: ReportMeta): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const { rows, totals } = computeReportRows(trips);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RVA Miles";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Mileage Report");

  const COLS = COLUMN_HEADERS.length;
  let r = 1;

  const titleCell = sheet.getRow(r).getCell(1);
  titleCell.value = meta.title;
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND_ARGB } };
  sheet.mergeCells(r, 1, r, COLS);
  r++;

  const addSubtitleRow = (text: string) => {
    const cell = sheet.getRow(r).getCell(1);
    cell.value = text;
    cell.font = { size: 10, color: { argb: MUTED_ARGB } };
    sheet.mergeCells(r, 1, r, COLS);
    r++;
  };

  addSubtitleRow(
    `Period: ${formatDateKeyDisplay(meta.range.startKey)} – ${formatDateKeyDisplay(meta.range.endKey)}`
  );
  if (meta.ownerName) addSubtitleRow(`Owner: ${meta.ownerName}`);
  if (meta.vehicle) addSubtitleRow(`Vehicle: ${meta.vehicle}`);
  addSubtitleRow(`Generated: ${formatTimestamp(Date.now())}`);

  r++; // spacer row

  const headerRowIdx = r;
  const headerRow = sheet.getRow(headerRowIdx);
  COLUMN_HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: WHITE_ARGB } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_ARGB } };
    cell.alignment = { vertical: "middle", horizontal: i >= 4 ? "right" : "left" };
  });
  r++;

  for (const row of rows) {
    const dataRow = sheet.getRow(r);
    dataRow.getCell(1).value = formatDateKeyDisplay(row.dateKey);
    dataRow.getCell(2).value = row.from;
    dataRow.getCell(3).value = row.to;
    dataRow.getCell(4).value = row.purpose;
    const milesCell = dataRow.getCell(5);
    milesCell.value = row.miles;
    milesCell.numFmt = MILES_FMT;
    const rateCell = dataRow.getCell(6);
    rateCell.value = row.rate;
    rateCell.numFmt = RATE_FMT;
    const amountCell = dataRow.getCell(7);
    amountCell.value = row.amount;
    amountCell.numFmt = MONEY_FMT;
    r++;
  }

  const totalsRowIdx = r;
  const totalsRow = sheet.getRow(totalsRowIdx);
  totalsRow.getCell(4).value = "Totals";
  const totalsMilesCell = totalsRow.getCell(5);
  totalsMilesCell.value = totals.miles;
  totalsMilesCell.numFmt = MILES_FMT;
  const totalsAmountCell = totalsRow.getCell(7);
  totalsAmountCell.value = totals.amount;
  totalsAmountCell.numFmt = MONEY_FMT;
  for (let c = 1; c <= COLS; c++) {
    totalsRow.getCell(c).font = { bold: true };
  }
  r++;

  // Column widths sized to content, scanning only the table (header block is merged/full-width).
  for (let c = 1; c <= COLS; c++) {
    let maxLen = COLUMN_HEADERS[c - 1].length;
    for (let rowIdx = headerRowIdx; rowIdx < r; rowIdx++) {
      const cell = sheet.getRow(rowIdx).getCell(c);
      let text: string;
      if (typeof cell.value === "number" && cell.numFmt) {
        if (cell.numFmt === MILES_FMT) text = cell.value.toFixed(1);
        else if (cell.numFmt === RATE_FMT) text = `$${formatRateDigits(cell.value)}`;
        else text = `$${cell.value.toFixed(2)}`;
      } else {
        text = String(cell.value ?? "");
      }
      maxLen = Math.max(maxLen, text.length);
    }
    sheet.getColumn(c).width = Math.min(Math.max(maxLen + 2, 8), 40);
  }

  sheet.views = [{ state: "frozen", ySplit: headerRowIdx }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// --- Plaintext summary (email body) ----------------------------------------

export function buildSummaryText(trips: Trip[], meta: ReportMeta): string {
  const { rows, totals } = computeReportRows(trips);

  const align: Array<"left" | "right"> = ["left", "left", "left", "left", "right", "right", "right"];
  const headers = [...COLUMN_HEADERS];

  const bodyRows = rows.map((r) => [
    formatDateKeyDisplay(r.dateKey),
    r.from,
    r.to,
    r.purpose,
    r.miles.toFixed(1),
    `$${formatRateDigits(r.rate)}`,
    `$${r.amount.toFixed(2)}`,
  ]);

  const totalsRowCells = ["", "", "", "Totals", totals.miles.toFixed(1), "", `$${totals.amount.toFixed(2)}`];

  const widths = headers.map((h, i) =>
    Math.max(h.length, totalsRowCells[i].length, ...bodyRows.map((row) => row[i].length))
  );

  const formatRow = (cells: string[]) =>
    cells.map((c, i) => (align[i] === "right" ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join("  ");

  const separator = widths.map((w) => "-".repeat(w)).join("  ");

  const lines: string[] = [];
  lines.push(meta.title);
  lines.push(`Period: ${formatDateKeyDisplay(meta.range.startKey)} - ${formatDateKeyDisplay(meta.range.endKey)}`);
  if (meta.ownerName) lines.push(`Owner: ${meta.ownerName}`);
  if (meta.vehicle) lines.push(`Vehicle: ${meta.vehicle}`);
  lines.push(`Generated: ${formatTimestamp(Date.now())}`);
  lines.push("");
  lines.push(formatRow(headers));
  lines.push(separator);
  for (const row of bodyRows) lines.push(formatRow(row));
  lines.push(separator);
  lines.push(formatRow(totalsRowCells));
  lines.push("");
  lines.push(
    `${totals.count} trip${totals.count === 1 ? "" : "s"} • ${totals.miles.toFixed(1)} miles • $${totals.amount.toFixed(2)} total`
  );

  return lines.join("\n");
}

// --- Filenames ---------------------------------------------------------

export function reportFilename(meta: ReportMeta, ext: string): string {
  const cleanExt = ext.replace(/^\.+/, "");
  return `rva-miles-${meta.range.startKey}_${meta.range.endKey}.${cleanExt}`;
}
