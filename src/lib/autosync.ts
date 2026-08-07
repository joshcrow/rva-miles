"use client";

// When to sync. `sync.ts` owns the cycle itself; this module owns the four
// moments worth running one:
//
//   - after a local change, once the user has stopped making them (20s quiet
//     period, and never later than 2 minutes after the first change in a burst)
//   - shortly after the app opens, so the other phone's day is already here
//   - when the app goes to the background, flushing anything still pending
//   - when the browser says it is back online, or the app comes back to the
//     foreground after a while
//
// Every one of them is fire-and-forget. A cycle killed halfway leaves the
// server holding either the old union or the new one, both of which the next
// cycle converges from — so nothing here needs to guarantee delivery.
//
// The write hook is registered, not imported: db.ts knows only that *someone*
// may want to be told, which keeps the import graph acyclic (autosync → db,
// never the reverse).

import { isDemoMode, setWriteListener } from "@/lib/db";
import { isSyncEnabled, syncNow } from "@/lib/sync";

/** How long the ledger must sit still before a burst of edits is pushed. */
export const QUIET_PERIOD_MS = 20_000;
/** However busy the user is, a change is never held longer than this. */
export const MAX_WAIT_MS = 120_000;
/** Boot sync runs after migration, demo seeding and the first paint settle. */
const BOOT_DELAY_MS = 3_000;
/** Returning to the app re-checks the server, but not on every glance. */
const FOREGROUND_MIN_GAP_MS = 60_000;

// ---------------------------------------------------------------------------
// The scheduler (pure — a clock in, decisions out)
// ---------------------------------------------------------------------------

export interface DebouncedScheduler {
  /** Notes a local change. Returns the time the flush is now due. */
  request: () => number;
  /** When the pending flush is due, or null when nothing is pending. */
  dueAt: () => number | null;
  pending: () => boolean;
  /** True (and clears the pending flush) once the due time has arrived. */
  takeIfDue: () => boolean;
  /** Forgets the pending flush — for a caller that is running one right now. */
  clear: () => void;
}

/**
 * Debounce with a ceiling: each change pushes the flush out by `delayMs`, but
 * the first change in a burst can never be held longer than `maxWaitMs`. Time
 * comes in through `now`, so the whole thing is testable without timers.
 */
export function createDebouncedScheduler(
  delayMs: number,
  maxWaitMs: number,
  now: () => number = Date.now,
): DebouncedScheduler {
  let firstAt: number | null = null;
  let lastAt = 0;

  const due = (): number | null =>
    firstAt === null ? null : Math.min(lastAt + delayMs, firstAt + maxWaitMs);

  return {
    request() {
      const t = now();
      if (firstAt === null) firstAt = t;
      lastAt = t;
      return due() as number;
    },
    dueAt: due,
    pending: () => firstAt !== null,
    takeIfDue() {
      const at = due();
      if (at === null || now() < at) return false;
      firstAt = null;
      return true;
    },
    clear() {
      firstAt = null;
    },
  };
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

let running = false;
let scheduler = createDebouncedScheduler(QUIET_PERIOD_MS, MAX_WAIT_MS);
let timer: ReturnType<typeof setTimeout> | null = null;
let bootTimer: ReturnType<typeof setTimeout> | null = null;
let lastAttemptAt = 0;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function arm(): void {
  const at = scheduler.dueAt();
  if (at === null) return;
  clearTimer();
  timer = setTimeout(fire, Math.max(0, at - Date.now()));
}

function fire(): void {
  timer = null;
  // A change that landed while the timer was running pushed the due time out;
  // re-arm rather than syncing early.
  if (!scheduler.takeIfDue()) {
    arm();
    return;
  }
  void attempt();
}

/**
 * The one place a trigger turns into a cycle. Checks that sync is switched on
 * first, so a phone with no code set never opens a connection.
 */
async function attempt(): Promise<void> {
  lastAttemptAt = Date.now();
  if (!(await isSyncEnabled())) return;
  await syncNow();
}

/** Runs a pending flush right now instead of waiting out its quiet period. */
function flushPending(): void {
  if (!scheduler.pending()) return;
  scheduler.clear();
  clearTimer();
  void attempt();
}

/**
 * Registered with db.ts, called after every write that changes the ledger or
 * settings. Cheap and synchronous: it only moves a timer.
 */
export function notifyLocalWrite(): void {
  if (!running) return;
  scheduler.request();
  arm();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    // The tab may not come back. Send what we have; if the page dies
    // mid-flight, the next open converges anyway.
    flushPending();
    return;
  }
  // Back in the foreground — an installed PWA can sit here for days without a
  // reload, so this is the only regular chance to pick up the other phone.
  if (Date.now() - lastAttemptAt >= FOREGROUND_MIN_GAP_MS) void attempt();
}

function onOnline(): void {
  flushPending();
}

/**
 * Starts the triggers. Idempotent, client-only, and a no-op on a demo ledger.
 * Returns the stop function; AppShell calls this once.
 */
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (running) return stop;
  // A demo ledger is staged data in a separate database. It never syncs, so
  // the triggers are never even installed.
  if (isDemoMode()) return () => {};

  running = true;
  scheduler = createDebouncedScheduler(QUIET_PERIOD_MS, MAX_WAIT_MS);
  setWriteListener(notifyLocalWrite);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("online", onOnline);
  bootTimer = setTimeout(() => {
    bootTimer = null;
    void attempt();
  }, BOOT_DELAY_MS);

  return stop;
}

function stop(): void {
  if (!running) return;
  running = false;
  setWriteListener(null);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("online", onOnline);
  clearTimer();
  if (bootTimer !== null) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  scheduler.clear();
}
