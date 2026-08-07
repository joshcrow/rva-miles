// Pure report math + formatting, shared by the /report screen and the
// standalone /r viewer (which runs with zero database access).
//
// Rounding here MIRRORS src/lib/exporters.ts exactly — round each row, then
// sum the rounded rows — so the total on screen, in the email body, in the
// CSV, in the XLSX and in the shared link is always the same number. Accounts
// payable reconciles these by hand; a one-cent drift between two of them is a
// support ticket.
//
// Number formatting is done by hand (never toLocaleString) so server and
// client render byte-identical strings.

import type { DateRange, Place, ReportPayload, Settings, Trip } from "@/types";
import { isKeyInRange } from "@/lib/dates";
import type { ReportMeta } from "@/lib/exporters";
import { routeText } from "@/lib/legs";
import { formatRate } from "@/lib/rates";
import { fmtMiles, fmtMoney, roundTo, tripAmount } from "@/lib/money";

export const CUSTOM_PRESET_LABEL = "Custom";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export { roundTo, fmtMiles, fmtMoney };

// --- date keys (string parsing only — never new Date('YYYY-MM-DD')) --------

function keyParts(key: string): { y: number; m: number; d: number } | null {
  const m = DATE_KEY_RE.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function isDateKey(key: unknown): key is string {
  return typeof key === "string" && DATE_KEY_RE.test(key);
}

/** "Aug 3" */
export function formatKeyShort(key: string): string {
  const p = keyParts(key);
  if (!p) return key;
  return `${MONTHS_SHORT[p.m - 1] ?? "?"} ${p.d}`;
}

/** "Aug 3, 2025" — matches the exporters' cell format exactly. */
export function formatKeyFull(key: string): string {
  const p = keyParts(key);
  if (!p) return key;
  return `${MONTHS_SHORT[p.m - 1] ?? "?"} ${p.d}, ${p.y}`;
}

/** For an instant (epoch ms), not a calendar key — a Date is correct here. */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Aug 1 – 15, 2025" / "Aug 28 – Sep 10, 2025" / "Dec 20, 2024 – Jan 2, 2025" */
export function rangeLabelLong(r: DateRange): string {
  const a = keyParts(r.startKey);
  const b = keyParts(r.endKey);
  if (!a || !b) return `${r.startKey} – ${r.endKey}`;
  if (r.startKey === r.endKey) return formatKeyFull(r.startKey);
  if (a.y === b.y && a.m === b.m) {
    return `${MONTHS_SHORT[a.m - 1]} ${a.d}–${b.d}, ${a.y}`;
  }
  if (a.y === b.y) {
    return `${MONTHS_SHORT[a.m - 1]} ${a.d} – ${MONTHS_SHORT[b.m - 1]} ${b.d}, ${a.y}`;
  }
  return `${formatKeyFull(r.startKey)} – ${formatKeyFull(r.endKey)}`;
}

/** "Aug 1 – 15" — no year, for chips and tight headers. */
export function rangeLabelShort(r: DateRange): string {
  const a = keyParts(r.startKey);
  const b = keyParts(r.endKey);
  if (!a || !b) return `${r.startKey} – ${r.endKey}`;
  if (r.startKey === r.endKey) return formatKeyShort(r.startKey);
  if (a.m === b.m && a.y === b.y) return `${MONTHS_SHORT[a.m - 1]} ${a.d}–${b.d}`;
  return `${formatKeyShort(r.startKey)} – ${formatKeyShort(r.endKey)}`;
}

/**
 * A custom range typed backwards is a range, not an error — the two date
 * fields are independent and she may fill the later one first.
 */
export function normalizeRange(r: DateRange): DateRange {
  return r.startKey <= r.endKey ? r : { startKey: r.endKey, endKey: r.startKey };
}

// --- numbers ---------------------------------------------------------------
// fmtMiles / fmtMoney / roundTo are re-exported from @/lib/money above.

/**
 * "$0.70" / "$0.725" — the per-mile rate. Keeps a third decimal when the rate
 * carries a half cent (the 2026 IRS rate is 72.5c), because a rate rounded to
 * cents stops reconciling against the amount it produced.
 */
export function fmtRate(n: number): string {
  return formatRate(n);
}

export function pluralTrips(n: number): string {
  return n === 1 ? "1 trip" : `${n} trips`;
}

// --- places ----------------------------------------------------------------

export function placeLabel(p: Place | undefined): string {
  if (!p) return "";
  const name = p.name?.trim();
  if (name) return name;
  const address = p.address?.trim();
  if (address) return address;
  if (p.latLng) return `${p.latLng.lat.toFixed(4)}, ${p.latLng.lng.toFixed(4)}`;
  return "";
}

/** Tight label for the on-screen preview: first address segment only. */
export function placeLabelShort(p: Place | undefined): string {
  const full = placeLabel(p);
  if (!full) return "Unknown";
  const first = full.split(",")[0].trim();
  return first || full;
}

// --- selection -------------------------------------------------------------

/**
 * Range filtering is done on the LOCAL `dateKey` string and nothing else —
 * both ends inclusive. v1 dropped the final day of every period by comparing
 * UTC-parsed Dates; there is no Date in this path at all.
 */
export function filterTripsInRange(trips: Trip[], range: DateRange): Trip[] {
  return sortForReport(trips.filter((t) => !t.deletedAt && isKeyInRange(t.dateKey, range)));
}

/** Chronological, matching the order every exporter prints. */
export function sortForReport(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

// --- totals ----------------------------------------------------------------

export interface ReportTotals {
  count: number;
  miles: number;
  money: number;
}

/**
 * Row-level rounding, then a running rounded sum — byte-identical to the
 * totals row that buildCsv / buildXlsx / buildSummaryText print.
 */
export function computeTotals(trips: Trip[]): ReportTotals {
  let miles = 0;
  let money = 0;
  for (const t of trips) {
    miles = roundTo(miles + roundTo(t.distanceMiles, 1), 1);
    money = roundTo(money + tripAmount(t), 2);
  }
  return { count: trips.length, miles, money };
}

/** The single rate every trip in the report used, or null when they differ. */
export function uniformRate(trips: Trip[]): number | null {
  if (trips.length === 0) return null;
  const first = roundTo(trips[0].ratePerMile, 4);
  for (const t of trips) {
    if (roundTo(t.ratePerMile, 4) !== first) return null;
  }
  return first;
}

// --- meta / payload --------------------------------------------------------

export const REPORT_TITLE = "Mileage Report";

export function buildMeta(range: DateRange, settings: Settings): ReportMeta {
  return {
    title: REPORT_TITLE,
    range,
    ownerName: settings.ownerName?.trim() || undefined,
    vehicle: settings.vehicle?.trim() || undefined,
  };
}

/**
 * Miles/rate go into the link at full-ish precision (3dp / 4dp) rather than
 * display precision, so the viewer's totals reconcile to the cent with the
 * sender's. gzip makes the extra digits free.
 *
 * ReportPayload stays schema v:1 — it has no `legs` field — so a multi-leg
 * trip's via stop is folded into the flat `to` string HERE, once, at build
 * time ("Charlottesville site (via Crozet)"). Everything downstream that
 * reads a payload (the /r viewer's table, its CSV/XLSX/TSV exports, its
 * share text) already just prints `to` as-is, so they inherit the via text
 * for free with no changes needed on their end.
 */
export function buildPayload(trips: Trip[], meta: ReportMeta, generatedAt: number): ReportPayload {
  return {
    v: 1,
    title: meta.title,
    ownerName: meta.ownerName,
    vehicle: meta.vehicle,
    range: meta.range,
    generatedAt,
    trips: sortForReport(trips).map((t) => ({
      dateKey: t.dateKey,
      from: placeLabel(t.from),
      to: routeText(t),
      miles: roundTo(t.distanceMiles, 3),
      rate: roundTo(t.ratePerMile, 4),
      purpose: t.purpose?.trim() || undefined,
    })),
  };
}

function coerceText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function coerceNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * A report link is untrusted input (anyone can hand-edit the fragment) and
 * decodeReport only checks the envelope. Coerce every field before it reaches
 * the viewer so a malformed row renders as blank rather than crashing the page.
 */
export function sanitizePayload(p: ReportPayload): ReportPayload {
  const rows = Array.isArray(p.trips) ? p.trips : [];
  const range: DateRange = {
    startKey: isDateKey(p.range?.startKey) ? p.range.startKey : "",
    endKey: isDateKey(p.range?.endKey) ? p.range.endKey : "",
  };
  return {
    v: 1,
    title: coerceText(p.title) || REPORT_TITLE,
    ownerName: coerceText(p.ownerName) || undefined,
    vehicle: coerceText(p.vehicle) || undefined,
    range,
    generatedAt: typeof p.generatedAt === "number" && Number.isFinite(p.generatedAt) ? p.generatedAt : 0,
    trips: rows.map((t) => ({
      dateKey: isDateKey(t?.dateKey) ? t.dateKey : "",
      from: coerceText(t?.from),
      to: coerceText(t?.to),
      miles: coerceNumber(t?.miles),
      rate: coerceNumber(t?.rate),
      purpose: coerceText(t?.purpose) || undefined,
    })),
  };
}

/**
 * Synthetic Trips so the viewer can reuse the exact same exporters the sender
 * used. `createdAt: i` preserves the sender's row order through the
 * exporters' stable sort.
 */
export function payloadToTrips(p: ReportPayload): Trip[] {
  return p.trips.map((t, i) => ({
    id: `report-${i}`,
    dateKey: t.dateKey,
    from: { name: t.from },
    to: { name: t.to },
    distanceMiles: t.miles,
    ratePerMile: t.rate,
    purpose: t.purpose,
    source: "import" as const,
    createdAt: i,
    updatedAt: i,
  }));
}

export function payloadToMeta(p: ReportPayload): ReportMeta {
  return {
    title: p.title,
    range: p.range,
    ownerName: p.ownerName,
    vehicle: p.vehicle,
  };
}

// --- display rows (viewer table + TSV clipboard) ---------------------------

export interface DisplayRow {
  dateKey: string;
  date: string;
  /** Year-free variant for narrow phone columns; the period header has the year */
  dateShort: string;
  from: string;
  to: string;
  purpose: string;
  miles: string;
  rate: string;
  amount: string;
}

export const REPORT_COLUMNS = [
  "Date", "From", "To", "Purpose", "Miles", "Rate", "Amount",
] as const;

export function displayRows(trips: Trip[]): DisplayRow[] {
  return sortForReport(trips).map((t) => ({
    dateKey: t.dateKey,
    date: formatKeyFull(t.dateKey),
    dateShort: formatKeyShort(t.dateKey),
    from: placeLabel(t.from),
    // Identical to placeLabel(t.to) for a legless trip; folds in "(via …)"
    // when the trip carries multi-leg data (mirrors buildPayload/exporters).
    to: routeText(t),
    purpose: t.purpose ?? "",
    miles: fmtMiles(t.distanceMiles),
    rate: fmtRate(t.ratePerMile),
    amount: fmtMoney(tripAmount(t)),
  }));
}

/** Tab-separated — pastes straight into Sheets/Excel as real columns. */
export function buildTsv(trips: Trip[], meta: ReportMeta): string {
  const rows = displayRows(trips);
  const totals = computeTotals(trips);
  const lines: string[] = [];
  lines.push([...REPORT_COLUMNS].join("\t"));
  for (const r of rows) {
    lines.push([r.date, r.from, r.to, r.purpose, r.miles, r.rate, r.amount].join("\t"));
  }
  lines.push(["", "", "", "Totals", fmtMiles(totals.miles), "", fmtMoney(totals.money)].join("\t"));
  void meta;
  return lines.join("\n");
}

// --- message composition ---------------------------------------------------

/** 'Mileage — Aug 1 – 15, 2025 — 214.6 mi — $150.22' */
export function reportSubject(meta: ReportMeta, totals: ReportTotals): string {
  return `Mileage — ${rangeLabelLong(meta.range)} — ${fmtMiles(totals.miles)} mi — ${fmtMoney(
    totals.money,
  )}`;
}

/** One-line-per-fact body for share sheets, where a wide table would wrap badly. */
export function shareText(meta: ReportMeta, totals: ReportTotals, link: string | null): string {
  const lines = [
    reportSubject(meta, totals),
    "",
    `${pluralTrips(totals.count)} · ${fmtMiles(totals.miles)} miles · ${fmtMoney(totals.money)}`,
  ];
  if (meta.ownerName) lines.push(`Owner: ${meta.ownerName}`);
  if (meta.vehicle) lines.push(`Vehicle: ${meta.vehicle}`);
  if (link) {
    lines.push("");
    lines.push(`Open the full report: ${link}`);
  }
  return lines.join("\n");
}

/** Mail body: the full plaintext table, then the link. */
export function mailBody(summary: string, link: string | null): string {
  if (!link) return summary;
  return `${summary}\n\nOpen the full report (opens in any browser, nothing to install):\n${link}`;
}
