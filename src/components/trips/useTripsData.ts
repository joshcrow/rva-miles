"use client";

// Trips-screen data source. Default view is scoped to one month at a time
// (listTrips with a month DateRange) for performance; search additionally
// loads the full ledger once (cached) and searches across all time, per the
// contract. First-run bootstrap (migrateFromV1IfNeeded/requestPersistence)
// is Home's job, not this screen's — this hook only reads.

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
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [settings, setSettings] = useState<Settings>(() => ({
    ratePerMile: currentDefaultRate(),
    theme: "system",
  }));

  const [monthKey, setMonthKey] = useState("");
  const [monthTrips, setMonthTrips] = useState<Trip[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const [allTrips, setAllTrips] = useState<Trip[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const alive = useRef(true);
  const monthRangeRef = useRef<DateRange | null>(null);
  const monthFetchSeq = useRef(0);
  const allTripsFetchStarted = useRef(false);

  const loadMonth = useCallback(async (key: string) => {
    const range = monthRangeOf(key);
    monthRangeRef.current = range;
    const seq = ++monthFetchSeq.current;
    setMonthLoading(true);
    try {
      const trips = await listTrips(range);
      if (!alive.current || seq !== monthFetchSeq.current) return;
      setMonthTrips(sortTrips(trips));
      setLoadError(null);
    } catch (err) {
      if (!alive.current || seq !== monthFetchSeq.current) return;
      setLoadError(err instanceof Error ? err.message : "Couldn't read your trips.");
      uiActions.showError(err, "Couldn't read your trips.");
    } finally {
      if (alive.current && seq === monthFetchSeq.current) setMonthLoading(false);
    }
  }, []);

  const loadAllTrips = useCallback(async () => {
    setSearchLoading(true);
    try {
      const trips = await listTrips();
      if (!alive.current) return;
      setAllTrips(sortTrips(trips));
    } catch (err) {
      if (!alive.current) return;
      uiActions.showError(err, "Couldn't search your trips.");
    } finally {
      if (alive.current) setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const t = todayKey();
    const mk = monthKeyOf(t);
    setToday(t);
    setMonthKey(mk);

    void (async () => {
      try {
        const s = await getSettings();
        if (alive.current) setSettings(s);
      } catch (err) {
        uiActions.showError(err, "Couldn't read your settings.");
      }
      await loadMonth(mk);
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
      void loadMonth(key);
    },
    [loadMonth],
  );

  const refresh = useCallback(async () => {
    try {
      const s = await getSettings();
      if (alive.current) setSettings(s);
    } catch (err) {
      uiActions.showError(err, "Couldn't read your settings.");
    }
    await loadMonth(monthKey || monthKeyOf(todayKey()));
    if (allTripsFetchStarted.current) await loadAllTrips();
  }, [loadMonth, loadAllTrips, monthKey]);

  const ensureAllTripsLoaded = useCallback(() => {
    if (allTripsFetchStarted.current) return;
    allTripsFetchStarted.current = true;
    void loadAllTrips();
  }, [loadAllTrips]);

  const upsertTrip = useCallback((t: Trip) => {
    setMonthTrips((prev) => {
      const inRange = monthRangeRef.current ? isKeyInRange(t.dateKey, monthRangeRef.current) : false;
      const withoutOld = prev.filter((x) => x.id !== t.id);
      return inRange ? upsertInto(withoutOld, t) : withoutOld;
    });
    setAllTrips((prev) => (prev ? upsertInto(prev, t) : prev));
  }, []);

  const dropTrip = useCallback((id: string) => {
    setMonthTrips((prev) => prev.filter((t) => t.id !== id));
    setAllTrips((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
  }, []);

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
