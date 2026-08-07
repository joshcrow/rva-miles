// Pure, dependency-free helpers for the Settings screen: date-ago labels,
// byte formatting, merge-preview sentences, sync-code generation, and the
// pay-period live preview. No I/O — every input is passed in, everything
// here is unit-tested.

import type { DateRange, PaySchedule } from "@/types";
import { formatKey } from "@/lib/dates";
import { periodContaining } from "@/lib/periods";

const DAY_MS = 86_400_000;

export function daysAgoLabel(at: number | undefined, now: number): string {
  // Rendered after "Last backup: ", so every branch is a bare value.
  if (!at) return "Never";
  const days = Math.floor((now - at) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function lastSyncedLabel(at: number | undefined, now: number): string {
  if (!at) return "Never synced";
  const days = Math.floor((now - at) / DAY_MS);
  if (days <= 0) return "Synced today";
  if (days === 1) return "Synced 1 day ago";
  return `Synced ${days} days ago`;
}

const BACKUP_STALE_DAYS = 30;
const NEVER_BACKED_UP_TRIP_FLOOR = 10;
const RECENT_SYNC_DAYS = 7;

/**
 * The one-line backup nudge, or null when there's nothing worth saying.
 * Calibrated so a day-one user is never alarmed: it speaks only when real
 * data is genuinely exposed — and says exactly what's at stake, never
 * "overdue" (the user owes the app nothing). A recent sync suppresses it,
 * because "exists only on this phone" would then be false.
 */
export function backupNudge(
  lastBackupAt: number | undefined,
  lastSyncAt: number | undefined,
  tripCount: number,
  now: number,
): string | null {
  if (tripCount === 0) return null;
  if (lastSyncAt && now - lastSyncAt <= RECENT_SYNC_DAYS * DAY_MS) return null;
  if (!lastBackupAt) {
    if (tripCount < NEVER_BACKED_UP_TRIP_FLOOR) return null;
    return `Your ${tripCount} trips exist only on this phone.`;
  }
  if (now - lastBackupAt > BACKUP_STALE_DAYS * DAY_MS) {
    return "Trips logged since then exist only on this phone.";
  }
  return null;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const decimals = unitIndex <= 1 ? 0 : 1;
  return `${value.toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`;
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export interface MergePreviewCounts {
  tripsAdded: number;
  tripsUpdated: number;
  routesAdded: number;
  routesUpdated: number;
}

function addedList(c: MergePreviewCounts): string[] {
  return [
    c.tripsAdded ? pluralize(c.tripsAdded, "trip") : null,
    c.routesAdded ? pluralize(c.routesAdded, "route") : null,
  ].filter((s): s is string => s !== null);
}

function updatedList(c: MergePreviewCounts): string[] {
  return [
    c.tripsUpdated ? pluralize(c.tripsUpdated, "trip") : null,
    c.routesUpdated ? pluralize(c.routesUpdated, "route") : null,
  ].filter((s): s is string => s !== null);
}

/**
 * A forecast, for the confirmation sheet BEFORE anything is written:
 * "Adds 12 trips and 2 routes, updates 3 trips — nothing is deleted."
 * Never reuse this after the fact — the tense is a promise, not a report.
 */
export function mergePreviewText(c: MergePreviewCounts): string {
  const adds = addedList(c);
  const updates = updatedList(c);

  const clauses: string[] = [];
  if (adds.length) clauses.push(`Adds ${joinParts(adds)}`);
  if (updates.length) clauses.push(`updates ${joinParts(updates)}`);

  if (clauses.length === 0) return "No changes — this backup already matches what's on your device.";
  return `${clauses.join(", ")} — nothing is deleted.`;
}

/**
 * The same counts in the past tense, for AFTER the write: "added 12 trips and
 * 2 routes, updated 3 trips". Reads as a clause so the caller supplies the
 * headline — "Import complete — …", "Synced — …" — and names the no-op case
 * in its own terms, because "nothing new" means something different when it
 * came from a file than when it came from another phone.
 */
export function mergeResultText(
  c: MergePreviewCounts,
  whenNothingChanged = "nothing new to add",
): string {
  const adds = addedList(c);
  const updates = updatedList(c);

  const clauses: string[] = [];
  if (adds.length) clauses.push(`added ${joinParts(adds)}`);
  if (updates.length) clauses.push(`updated ${joinParts(updates)}`);

  if (clauses.length === 0) return whenNothingChanged;
  return clauses.join(", ");
}

// Crockford-ish alphabet minus I/L/O (easy to misread) and 0/1 (easy to
// confuse with O/I) — this code gets typed by hand on a second phone.
const SYNC_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateSyncCode(): string {
  const group = () => {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += SYNC_CODE_ALPHABET[Math.floor(Math.random() * SYNC_CODE_ALPHABET.length)];
    }
    return s;
  };
  return `${group()}-${group()}`;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKeyString(v: unknown): v is string {
  return typeof v === "string" && DATE_KEY_RE.test(v);
}

/** null when no schedule is set yet. */
export function periodPreviewLabel(schedule: PaySchedule | undefined, todayKey: string): string | null {
  if (!schedule) return null;
  let range: DateRange;
  try {
    range = periodContaining(schedule, todayKey);
  } catch {
    return null;
  }
  return `${formatKey(range.startKey, "short")} – ${formatKey(range.endKey, "short")}`;
}

/** Parses a rate field's raw text; null when it isn't a usable positive rate. */
export function parseRateInput(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000) / 1000;
}
