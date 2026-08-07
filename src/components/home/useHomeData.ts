"use client";

// Home-screen data source. Reads the whole (personal-scale) ledger once, then
// keeps it in sync through optimistic local mutators — every write path in
// HomeScreen updates state first, persists, and calls refresh() only to
// recover truth after a failure. Failures are never silent.
//
// Revisiting the tab paints the last known ledger synchronously from a
// module-level snapshot and re-reads Dexie behind it (stale-while-revalidate),
// so switching tabs never flashes a skeleton over data we already have.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Route, Settings, Trip } from "@/types";
import {
  getSettings,
  listRoutes,
  listTrips,
  migrateFromV1IfNeeded,
  purgeDeleted,
  requestPersistence,
} from "@/lib/db";
import { compareKeys, todayKey } from "@/lib/dates";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";

function sortTrips(ts: Trip[]): Trip[] {
  return [...ts].sort((a, b) => compareKeys(b.dateKey, a.dateKey) || b.createdAt - a.createdAt);
}

function sortRoutes(rs: Route[]): Route[] {
  return [...rs].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

/**
 * Deleted trips are kept as tombstones so an undo can restore them and so a
 * merge-import on another device can't resurrect them. They only need to
 * outlive the slowest realistic sync, not forever — without this sweep every
 * backup file and sync payload grows monotonically with deletions.
 */
const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// First-run work runs at most once per page load, even across remounts
// (React StrictMode mounts effects twice in development).
let bootstrap: Promise<number> | null = null;

function bootstrapOnce(): Promise<number> {
  if (!bootstrap) {
    bootstrap = (async () => {
      const migrated = await migrateFromV1IfNeeded();
      // Best-effort and never throws; a denied request just means the browser
      // may evict storage under pressure.
      void requestPersistence();
      // Housekeeping only — a failure here costs nothing the user can see, so
      // it must never take down the boot path that loads the ledger.
      void purgeDeleted(TOMBSTONE_RETENTION_MS).catch(() => {});
      return migrated;
    })();
  }
  return bootstrap;
}

/**
 * Last successful read of the ledger, at module scope so it survives the
 * unmount/remount of a tab switch. Only effects and event handlers ever write
 * it, so it stays null through SSR and through the first client render of a
 * page load — a first visit still renders the skeleton, and hydration still
 * matches. Error states are never stored here.
 */
interface HomeSnapshot {
  trips: Trip[];
  routes: Route[];
  settings: Settings;
}

let cache: HomeSnapshot | null = null;

// The local calendar date is a client-only fact: rendering it on the server
// would key off the server's timezone and mismatch on hydration. Reading it
// through useSyncExternalStore gives '' on the server and re-reads whenever
// the app comes back to the foreground (so a session left open overnight
// rolls over).
function subscribeToday(onChange: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

export interface HomeDataApi {
  ready: boolean;
  loadError: string | null;
  /** '' until mounted — the local date is a client-only fact. */
  today: string;
  trips: Trip[];
  routes: Route[];
  settings: Settings;
  /** >0 exactly once, when a v1 ledger was imported on this load. */
  migratedCount: number;
  refresh: () => Promise<void>;
  upsertTrip: (t: Trip) => void;
  dropTrip: (id: string) => void;
  upsertRoute: (r: Route) => void;
  dropRoute: (id: string) => void;
}

export function useHomeData(): HomeDataApi {
  // A cached snapshot means this tab has been shown before: paint it now and
  // revalidate underneath, rather than making the user watch a skeleton for a
  // read that takes a millisecond.
  const [ready, setReady] = useState(cache !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const today = useSyncExternalStore(
    subscribeToday,
    todayKey,
    () => "",
  );
  const [trips, setTrips] = useState<Trip[]>(() => cache?.trips ?? []);
  const [routes, setRoutes] = useState<Route[]>(() => cache?.routes ?? []);
  const [settings, setSettings] = useState<Settings>(() => cache?.settings ?? {
    ratePerMile: currentDefaultRate(),
    theme: "system",
  });
  const [migratedCount, setMigratedCount] = useState(0);
  const alive = useRef(true);

  // Mirrors the three data slices synchronously, so two mutators fired in one
  // event (drop a trip, restore its route) compose instead of the second
  // overwriting the first, and so the module cache always matches state.
  const latest = useRef<HomeSnapshot>({ trips, routes, settings });

  // Bumped by every local mutation. A Dexie read that started before a
  // mutation carries older truth than the optimistic state, so it is dropped
  // rather than allowed to resurrect what the user just changed.
  const editSeq = useRef(0);

  const publish = useCallback((next: HomeSnapshot) => {
    latest.current = next;
    cache = next;
    setTrips(next.trips);
    setRoutes(next.routes);
    setSettings(next.settings);
  }, []);

  const mutate = useCallback(
    (patch: Partial<HomeSnapshot>) => {
      editSeq.current += 1;
      publish({ ...latest.current, ...patch });
    },
    [publish],
  );

  const refresh = useCallback(async () => {
    const edits = editSeq.current;
    try {
      const [t, r, s] = await Promise.all([listTrips(), listRoutes(), getSettings()]);
      if (!alive.current || edits !== editSeq.current) return;
      publish({ trips: sortTrips(t), routes: sortRoutes(r), settings: s });
      setLoadError(null);
    } catch (err) {
      if (!alive.current) return;
      // The written sentence, never a Dexie diagnostic — this renders in an Alert.
      setLoadError("Couldn't read your saved trips.");
      uiActions.showError(err, "Couldn't read your saved trips.");
    }
  }, [publish]);

  useEffect(() => {
    alive.current = true;

    void (async () => {
      try {
        const n = await bootstrapOnce();
        if (alive.current && n > 0) setMigratedCount(n);
      } catch (err) {
        uiActions.showError(
          err,
          "Couldn't bring your trips over from the previous version. Nothing on this device was changed.",
        );
      }
      await refresh();
      if (alive.current) setReady(true);
    })();

    return () => {
      alive.current = false;
    };
  }, [refresh]);

  // Coming back from /drive, /trips, or a backgrounded tab: re-read the ledger
  // so anything logged elsewhere shows up.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const upsertTrip = useCallback(
    (t: Trip) => {
      mutate({ trips: sortTrips([...latest.current.trips.filter((x) => x.id !== t.id), t]) });
    },
    [mutate],
  );

  const dropTrip = useCallback(
    (id: string) => {
      mutate({ trips: latest.current.trips.filter((t) => t.id !== id) });
    },
    [mutate],
  );

  const upsertRoute = useCallback(
    (r: Route) => {
      mutate({ routes: sortRoutes([...latest.current.routes.filter((x) => x.id !== r.id), r]) });
    },
    [mutate],
  );

  const dropRoute = useCallback(
    (id: string) => {
      mutate({ routes: latest.current.routes.filter((r) => r.id !== id) });
    },
    [mutate],
  );

  return {
    ready,
    loadError,
    today,
    trips,
    routes,
    settings,
    migratedCount,
    refresh,
    upsertTrip,
    dropTrip,
    upsertRoute,
    dropRoute,
  };
}
