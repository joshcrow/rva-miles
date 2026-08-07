"use client";

// The sync engine: one full push/pull cycle, and the observable state the UI
// reads while it runs. Nothing here decides *when* to sync — that is
// `autosync.ts`, which drives this module from writes, app open, going to the
// background and coming back online.
//
// A cycle is deliberately idempotent and never destructive:
//   1. ask the server for whatever this code already holds
//   2. validate it, then merge it in (union by id, newer `updatedAt` wins)
//   3. push the merged result back, so both phones converge on the same union
//   4. stamp `lastSyncAt`
// Interrupt it anywhere — a killed tab, a dropped connection — and the next
// cycle reaches the same place. That is why every trigger can be
// fire-and-forget.
//
// Two hard guarantees:
//   - A demo ledger never leaves the phone. `isDemoMode()` is checked here, in
//     the engine, not only at the call sites.
//   - Nothing the server sends is written unless it passes `validateSnapshot`.

import type { MergeResult, Snapshot } from "@/types";
import {
  exportSnapshot,
  getSettings,
  importMerge,
  isDemoMode,
  saveSettings,
  validateSnapshot,
  withoutWriteNotifications,
} from "@/lib/db";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncState {
  status: SyncStatus;
  /**
   * The written sentence to show for a failure — this field is read straight
   * into an Alert, so it is user copy, not a diagnostic. Only ever set
   * alongside status "error".
   */
  lastError?: string;
  /** When the last cycle in this session finished. Undefined until one does. */
  lastSyncAt?: number;
}

export type SyncResult =
  | { ok: true; merged: MergeResult }
  /** `reason` is a diagnostic for the caller; user copy lives in `lastError`. */
  | { ok: false; reason: string };

const NOTHING_MERGED: MergeResult = {
  tripsAdded: 0,
  tripsUpdated: 0,
  routesAdded: 0,
  routesUpdated: 0,
  skipped: 0,
};

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

const IDLE: SyncState = Object.freeze({ status: "idle" });

let state: SyncState = IDLE;
const listeners = new Set<() => void>();

/** Snapshot for `useSyncExternalStore`. Stable identity until state changes. */
export function getSyncState(): SyncState {
  return state;
}

/** Server snapshot: sync is a client-only fact, so the server always sees idle. */
export function getServerSyncState(): SyncState {
  return IDLE;
}

export function subscribeSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function setState(next: SyncState): void {
  state = Object.freeze(next);
  // Copied, so a listener that unsubscribes itself can't skip the next one.
  for (const fn of [...listeners]) fn();
}

// ---------------------------------------------------------------------------
// Is sync available at all?
// ---------------------------------------------------------------------------

/**
 * Whether the deployment has a sync store attached. That is a property of the
 * server, not of this page load, so a real answer is remembered for the
 * session. A failed probe is not an answer and is not remembered — the next
 * caller asks again.
 */
let configuredAnswer: boolean | null = null;
let configuredProbe: Promise<boolean> | null = null;

/**
 * The remembered answer, or null if nobody has got one yet. Synchronous, so a
 * screen that has already asked once this session can render the Sync card on
 * its first paint instead of a beat later.
 */
export function knownSyncConfigured(): boolean | null {
  return configuredAnswer;
}

export async function isSyncConfigured(): Promise<boolean> {
  if (configuredAnswer !== null) return configuredAnswer;
  if (!configuredProbe) {
    configuredProbe = (async () => {
      try {
        const res = await fetch("/api/sync?health=1");
        if (!res.ok) return false;
        const data = (await res.json()) as { configured?: boolean };
        configuredAnswer = Boolean(data?.configured);
        return configuredAnswer;
      } catch {
        return false;
      } finally {
        configuredProbe = null;
      }
    })();
  }
  return configuredProbe;
}

/**
 * True when a cycle would actually do something: a real ledger, a sync code
 * the user has set, and a server that can hold the result.
 */
export async function isSyncEnabled(): Promise<boolean> {
  if (isDemoMode()) return false;
  let code: string;
  try {
    code = (await getSettings()).syncCode?.trim() ?? "";
  } catch {
    return false;
  }
  if (!code) return false;
  return isSyncConfigured();
}

// ---------------------------------------------------------------------------
// The cycle
// ---------------------------------------------------------------------------

const UNREACHABLE =
  "Couldn't reach the sync server. Nothing was lost — your trips are safe on this phone.";
const UNREADABLE = "Couldn't read what your other phone sent. Nothing here was changed.";
const GENERIC = "Couldn't sync just now. Nothing was lost — your trips are safe on this phone.";

/** Thrown for a server that answered, but not with something usable. */
class ServerUnreachable extends Error {}

/**
 * A rejected `fetch` is a network failure, not a server failure — the browser
 * never got an answer. `navigator.onLine === false` is the same story told
 * earlier. Either way the honest word is "offline", and the next trigger
 * retries; neither is a red error the user has to act on.
 */
function looksOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Runs a full cycle, or joins the one already running. Safe to call from
 * anywhere, as often as you like: concurrent calls coalesce into a single
 * request pair, and a disabled or demo ledger returns without touching the
 * network or the state.
 */
export function syncNow(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runCycle().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runCycle(): Promise<SyncResult> {
  // Hard guard, in the engine rather than at the call sites: a staged demo
  // ledger must never be pushed to a code the user shares with a real phone.
  if (isDemoMode()) return { ok: false, reason: "demo mode" };

  let code: string;
  try {
    code = (await getSettings()).syncCode?.trim() ?? "";
  } catch {
    return { ok: false, reason: "settings unreadable" };
  }
  if (!code) return { ok: false, reason: "no sync code" };
  if (!(await isSyncConfigured())) return { ok: false, reason: "server not configured" };

  const previousSyncAt = state.lastSyncAt;
  setState({ status: "syncing", lastSyncAt: previousSyncAt });

  const url = `/api/sync?code=${encodeURIComponent(code)}`;

  try {
    const pulled = await fetch(url);

    let merged = NOTHING_MERGED;
    if (pulled.status === 200) {
      // Validate before importMerge (which validates again) so a bad payload
      // is attributable to the server, and so it is impossible for anything
      // unvalidated to reach the ledger.
      const remote: Snapshot = validateSnapshot(await pulled.json());
      merged = await withoutWriteNotifications(() => importMerge(remote));
    } else if (pulled.status !== 404) {
      // 404 is the ordinary first sync: this code has nothing stored yet, so
      // there is nothing to merge and we go straight to pushing.
      throw new ServerUnreachable(`Sync store answered ${pulled.status} on read`);
    }

    const snapshot = await exportSnapshot();
    const pushed = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!pushed.ok) throw new ServerUnreachable(`Sync store answered ${pushed.status} on write`);

    const at = Date.now();
    // Re-read rather than patching the settings we read at the top: a cycle
    // spans two network round trips, and the user may have changed a setting
    // inside that window.
    await withoutWriteNotifications(async () => {
      const fresh = await getSettings();
      await saveSettings({ ...fresh, lastSyncAt: at });
    });

    setState({ status: "idle", lastSyncAt: at });
    return { ok: true, merged };
  } catch (err) {
    if (looksOffline(err)) {
      setState({ status: "offline", lastSyncAt: previousSyncAt });
      return { ok: false, reason: "offline" };
    }
    const sentence =
      err instanceof ServerUnreachable ? UNREACHABLE : isSnapshotRejection(err) ? UNREADABLE : GENERIC;
    setState({ status: "error", lastError: sentence, lastSyncAt: previousSyncAt });
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** validateSnapshot's diagnostics all name themselves; JSON.parse throws SyntaxError. */
function isSnapshotRejection(err: unknown): boolean {
  if (err instanceof SyntaxError) return true;
  return err instanceof Error && err.message.startsWith("importMerge:");
}

/**
 * Drops the cached health answer, any in-flight cycle and the observable
 * state. Exported for tests; nothing in the app calls it.
 */
export function resetSyncEngine(): void {
  configuredAnswer = null;
  configuredProbe = null;
  inFlight = null;
  state = IDLE;
  listeners.clear();
}
