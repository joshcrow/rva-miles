"use client";

// Trips-screen data source. Default view is scoped to one month at a time
// (listTrips with a month DateRange) for performance; search additionally
// loads the full ledger once (cached) and searches across all time, per the
// contract. First-run bootstrap (migrateFromV1IfNeeded/requestPersistence)
// is Home's job, not this screen's — this hook only reads.
//
// Revisiting the tab paints the last known month synchronously from a
// module-level snapshot and re-reads Dexie behind it (stale-while-revalidate),
// so a tab switch never flashes a skeleton over data we already have.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange, Settings, Trip } from "@/types";
import { getSettings, listTrips } from "@/lib/db";
import { compareKeys, isKeyInRange, todayKey } from "@/lib/dates";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";
import { monthKeyOf, monthRangeOf } from "./monthNav";

function sortTrips(ts: Trip[]): Trip[] {
  return [...ts].sort((a, b) => compareKeys(b.dateKey, a.dateKey) || b.createdAt - a.createdAt);
}

function upsertInto(list: Trip[], t: Trip): Trip[] {
  return sortTrips([...list.filter((x) => x.id !== t.id), t]);
}

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

/**
 * Last successful read, at module scope so it outlives the unmount of a tab
 * switch. `month` carries its own key because the ledger is read a month at a
 * time; it goes null while the displayed list belongs to a different month
 * than the one being loaded, so a half-navigated view is never remembered.
 * Only effects and handlers write this, so it stays null through SSR and the
 * first client render of a page load — first visits still show the skeleton
 * and hydration still matches. Error states are never stored.
 */
interface TripsSnapshot {
  settings: Settings;
  month: { key: string; trips: Trip[] } | null;
  allTrips: Trip[] | null;
}

let cache: TripsSnapshot | null = null;

interface TripsSeed extends TripsSnapshot {
  today: string;
  month: { key: string; trips: Trip[] };
}

/**
 * A mount always snaps back to the current month, so a snapshot left on some
 * other month — or taken before midnight rolled the month over — can't be
 * painted. Those mounts fall back to the skeleton, exactly like a first visit.
 */
function initialSeed(): TripsSeed | null {
  const snap = cache;
  if (!snap?.month) return null;
  const today = todayKey();
  if (snap.month.key !== monthKeyOf(today)) return null;
  return { ...snap, month: snap.month, today };
}

export interface TripsDataApi {
  ready: boolean;
  loadError: string | null;
  today: string;
  settings: Settings;

  monthKey: string;
  monthTrips: Trip[];
  monthLoading: boolean;
  goToMonth: (key: string) => void;

  /** null until search has been used at least once this session. */
  allTrips: Trip[] | null;
  searchLoading: boolean;
  ensureAllTripsLoaded: () => void;

  refresh: () => Promise<void>;
  upsertTrip: (t: Trip) => void;
  dropTrip: (id: string) => void;
}

export function useTripsData(): TripsDataApi {
  // Computed once, before any state exists. Non-null only on a revisit, which
  // is always a client render, so reading the local date here is safe.
  const [seed] = useState(initialSeed);

  const [ready, setReady] = useState(seed !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => seed?.today ?? "");
  const [settings, setSettings] = useState<Settings>(() => seed?.settings ?? fallbackSettings());

  const [monthKey, setMonthKey] = useState(() => seed?.month.key ?? "");
  const [monthTrips, setMonthTrips] = useState<Trip[]>(() => seed?.month.trips ?? []);
  const [monthLoading, setMonthLoading] = useState(false);

  const [allTrips, setAllTrips] = useState<Trip[] | null>(() => seed?.allTrips ?? null);
  const [searchLoading, setSearchLoading] = useState(false);

  const alive = useRef(true);
  const monthRangeRef = useRef<DateRange | null>(null);
  const monthFetchSeq = useRef(0);
  const allTripsFetchStarted = useRef(false);

  // Mirrors the loaded data synchronously; every write goes through it so the
  // module cache can never drift from what's on screen.
  const latest = useRef<TripsSnapshot>({
    settings,
    month: seed?.month ?? null,
    allTrips,
  });

  // Bumped by every local edit. A Dexie read that started before an edit
  // carries older truth than the optimistic list, so it is dropped rather than
  // allowed to resurrect the row the user just changed.
  const editSeq = useRef(0);

  const commit = useCallback((patch: Partial<TripsSnapshot>) => {
    latest.current = { ...latest.current, ...patch };
    cache = latest.current;
  }, []);

  const loadMonth = useCallback(
    /** `silent` skips the loading flag for a revalidate that has data on screen already. */
    async (key: string, silent = false) => {
      const range = monthRangeOf(key);
      monthRangeRef.current = range;
      const seq = ++monthFetchSeq.current;
      const edits = editSeq.current;
      if (!silent) setMonthLoading(true);
      try {
        const trips = await listTrips(range);
        if (!alive.current || seq !== monthFetchSeq.current) return;
        // A row edited while this read was in flight is newer than what came
        // back. Keep the optimistic list — but only when it already belongs to
        // this month; with nothing loaded for `key` yet, even a stale read
        // beats leaving the month blank.
        const beatenByEdit = edits !== editSeq.current && latest.current.month?.key === key;
        if (!beatenByEdit) {
          const sorted = sortTrips(trips);
          commit({ month: { key, trips: sorted } });
          setMonthTrips(sorted);
        }
        setLoadError(null);
      } catch (err) {
        if (!alive.current || seq !== monthFetchSeq.current) return;
        setLoadError("Couldn't read your trips.");
        uiActions.showError(err, "Couldn't read your trips.");
      } finally {
        if (alive.current && seq === monthFetchSeq.current) setMonthLoading(false);
      }
    },
    [commit],
  );

  const loadAllTrips = useCallback(async () => {
    const edits = editSeq.current;
    setSearchLoading(true);
    try {
      const trips = await listTrips();
      if (!alive.current) return;
      // Same rule as the month read: an edit that landed mid-flight is newer,
      // but only worth keeping if there's already a list to keep.
      if (edits !== editSeq.current && latest.current.allTrips) return;
      const sorted = sortTrips(trips);
      commit({ allTrips: sorted });
      setAllTrips(sorted);
    } catch (err) {
      if (!alive.current) return;
      uiActions.showError(err, "Couldn't search your trips.");
    } finally {
      if (alive.current) setSearchLoading(false);
    }
  }, [commit]);

  useEffect(() => {
    alive.current = true;
    const t = todayKey();
    const mk = monthKeyOf(t);
    setToday(t);
    setMonthKey(mk);
    // Painting from the snapshot means the month totals are already on screen;
    // dimming them for the revalidate would be the flicker we're removing.
    const silent = seed !== null;

    void (async () => {
      try {
        const s = await getSettings();
        if (alive.current) {
          commit({ settings: s });
          setSettings(s);
        }
      } catch (err) {
        uiActions.showError(err, "Couldn't read your settings.");
      }
      await loadMonth(mk, silent);
      if (alive.current) setReady(true);
    })();

    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time bootstrap
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const t = todayKey();
      setToday(t);
      void loadMonth(monthKey || monthKeyOf(t));
      if (allTripsFetchStarted.current) void loadAllTrips();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [monthKey, loadMonth, loadAllTrips]);

  const goToMonth = useCallback(
    (key: string) => {
      setMonthKey(key);
      // The list on screen belongs to the month we're leaving, so there is
      // nothing coherent to remember until the new month's read lands.
      if (latest.current.month?.key !== key) commit({ month: null });
      void loadMonth(key);
    },
    [commit, loadMonth],
  );

  const refresh = useCallback(async () => {
    try {
      const s = await getSettings();
      if (alive.current) {
        commit({ settings: s });
        setSettings(s);
      }
    } catch (err) {
      uiActions.showError(err, "Couldn't read your settings.");
    }
    await loadMonth(monthKey || monthKeyOf(todayKey()));
    if (allTripsFetchStarted.current) await loadAllTrips();
  }, [commit, loadMonth, loadAllTrips, monthKey]);

  const ensureAllTripsLoaded = useCallback(() => {
    if (allTripsFetchStarted.current) return;
    allTripsFetchStarted.current = true;
    void loadAllTrips();
  }, [loadAllTrips]);

  const upsertTrip = useCallback(
    (t: Trip) => {
      editSeq.current += 1;
      const inRange = monthRangeRef.current ? isKeyInRange(t.dateKey, monthRangeRef.current) : false;
      const nextMonth = (prev: Trip[]) => {
        const withoutOld = prev.filter((x) => x.id !== t.id);
        return inRange ? upsertInto(withoutOld, t) : withoutOld;
      };
      const loaded = latest.current.month;
      if (loaded) {
        const trips = nextMonth(loaded.trips);
        commit({ month: { key: loaded.key, trips } });
        setMonthTrips(trips);
      } else {
        setMonthTrips(nextMonth);
      }
      const all = latest.current.allTrips;
      if (all) {
        const next = upsertInto(all, t);
        commit({ allTrips: next });
        setAllTrips(next);
      }
    },
    [commit],
  );

  const dropTrip = useCallback(
    (id: string) => {
      editSeq.current += 1;
      const without = (prev: Trip[]) => prev.filter((t) => t.id !== id);
      const loaded = latest.current.month;
      if (loaded) {
        const trips = without(loaded.trips);
        commit({ month: { key: loaded.key, trips } });
        setMonthTrips(trips);
      } else {
        setMonthTrips(without);
      }
      const all = latest.current.allTrips;
      if (all) {
        const next = without(all);
        commit({ allTrips: next });
        setAllTrips(next);
      }
    },
    [commit],
  );

  return {
    ready,
    loadError,
    today,
    settings,
    monthKey,
    monthTrips,
    monthLoading,
    goToMonth,
    allTrips,
    searchLoading,
    ensureAllTripsLoaded,
    refresh,
    upsertTrip,
    dropTrip,
  };
}
