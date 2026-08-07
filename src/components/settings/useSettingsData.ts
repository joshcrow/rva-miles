"use client";

// Data source for /settings: settings plus the counts and storage estimate
// the Data section needs. Every write goes through `patchSettings`, which is
// optimistic (instant UI feedback) but reverts to the truth on disk and
// surfaces a loud error the moment a save actually fails — settings must
// never silently drift from what's persisted.
//
// Revisiting the tab paints the last known values synchronously from a
// module-level snapshot and re-reads Dexie behind it, so a tab switch never
// flashes a skeleton over data we already have.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "@/types";
import { getSettings, listRoutes, listTrips, saveSettings } from "@/lib/db";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

/**
 * Last successful read, at module scope so it outlives the unmount of a tab
 * switch. Only effects and handlers write it, so it stays null through SSR and
 * the first client render of a page load — first visits still show the
 * skeleton and hydration still matches. Error states are never stored.
 */
interface SettingsSnapshot {
  settings: Settings;
  tripCount: number;
  routeCount: number;
  totalMiles: number;
}

let cache: SettingsSnapshot | null = null;

/**
 * Whether the deployment has sync configured is a property of the server, not
 * of this mount, so the answer is remembered too — otherwise the Sync section
 * pops into the page a beat after every revisit. A failed probe isn't an
 * answer and isn't remembered.
 */
let syncCache: boolean | null = null;

export interface SettingsDataApi {
  ready: boolean;
  loadError: string | null;
  settings: Settings;
  tripCount: number;
  routeCount: number;
  /** Sum of billed miles across the whole ledger */
  totalMiles: number;
  /** null while the health check is in flight. */
  syncConfigured: boolean | null;
  refresh: () => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => Promise<void>;
}

export function useSettingsData(): SettingsDataApi {
  // A cached snapshot means this tab has been shown before: paint it now and
  // revalidate underneath instead of showing a skeleton for a local read.
  const [ready, setReady] = useState(cache !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => cache?.settings ?? fallbackSettings());
  const [tripCount, setTripCount] = useState(() => cache?.tripCount ?? 0);
  const [routeCount, setRouteCount] = useState(() => cache?.routeCount ?? 0);
  const [totalMiles, setTotalMiles] = useState(() => cache?.totalMiles ?? 0);
  const [syncConfigured, setSyncConfigured] = useState<boolean | null>(() => syncCache);
  const alive = useRef(true);

  // Mirrors the loaded values but is updated synchronously, so two patches
  // issued before React re-renders (blur one field, immediately toggle
  // another) both merge onto the newest value instead of the second clobbering
  // the first. Every write goes through it, so the module cache can never
  // drift from what's on screen.
  const latest = useRef<SettingsSnapshot>({ settings, tripCount, routeCount, totalMiles });

  // Bumped by every optimistic patch. A read that started before the patch
  // carries older truth, so it is dropped rather than reverting the control
  // the user just moved.
  const editSeq = useRef(0);

  const commit = useCallback((patch: Partial<SettingsSnapshot>) => {
    latest.current = { ...latest.current, ...patch };
    cache = latest.current;
  }, []);

  const applySettings = useCallback(
    (s: Settings) => {
      commit({ settings: s });
      setSettings(s);
    },
    [commit],
  );

  const refresh = useCallback(async () => {
    const edits = editSeq.current;
    try {
      const [s, trips, routes] = await Promise.all([getSettings(), listTrips(), listRoutes()]);
      if (!alive.current || edits !== editSeq.current) return;
      const miles = trips.reduce((sum, t) => sum + t.distanceMiles, 0);
      commit({ settings: s, tripCount: trips.length, routeCount: routes.length, totalMiles: miles });
      setSettings(s);
      setTripCount(trips.length);
      setRouteCount(routes.length);
      setTotalMiles(miles);
      setLoadError(null);
    } catch (err) {
      if (!alive.current) return;
      const message = "Couldn't read your settings.";
      setLoadError(message);
      uiActions.showError(err, "Couldn't read your settings.");
    }
  }, [commit]);

  useEffect(() => {
    alive.current = true;
    void (async () => {
      await refresh();
      if (alive.current) setReady(true);
    })();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    fetch("/api/sync?health=1")
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data: { configured?: boolean }) => {
        const configured = Boolean(data?.configured);
        syncCache = configured;
        if (active) setSyncConfigured(configured);
      })
      .catch(() => {
        // Not an answer, so it isn't remembered — the next mount asks again.
        if (active) setSyncConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const patchSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...latest.current.settings, ...patch };
      editSeq.current += 1;
      applySettings(next);
      try {
        await saveSettings(next);
      } catch (err) {
        uiActions.showError(err, "Couldn't save that setting.");
        await refresh();
      }
    },
    [applySettings, refresh],
  );

  return {
    ready,
    loadError,
    settings,
    tripCount,
    routeCount,
    totalMiles,
    syncConfigured,
    refresh,
    patchSettings,
  };
}
