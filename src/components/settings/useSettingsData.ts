"use client";

// Data source for /settings: settings plus the counts and storage estimate
// the Data section needs. Every write goes through `patchSettings`, which is
// optimistic (instant UI feedback) but reverts to the truth on disk and
// surfaces a loud error the moment a save actually fails — settings must
// never silently drift from what's persisted.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "@/types";
import { getSettings, listRoutes, listTrips, saveSettings } from "@/lib/db";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

export interface SettingsDataApi {
  ready: boolean;
  loadError: string | null;
  settings: Settings;
  tripCount: number;
  routeCount: number;
  storageUsageBytes: number | null;
  /** null while the health check is in flight. */
  syncConfigured: boolean | null;
  refresh: () => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => Promise<void>;
}

export function useSettingsData(): SettingsDataApi {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [tripCount, setTripCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [storageUsageBytes, setStorageUsageBytes] = useState<number | null>(null);
  const [syncConfigured, setSyncConfigured] = useState<boolean | null>(null);
  const alive = useRef(true);

  // Mirrors `settings` but is updated synchronously, so two patches issued
  // before React re-renders (blur one field, immediately toggle another) both
  // merge onto the newest value instead of the second clobbering the first.
  const latest = useRef<Settings>(settings);

  const applySettings = useCallback((s: Settings) => {
    latest.current = s;
    setSettings(s);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, trips, routes] = await Promise.all([getSettings(), listTrips(), listRoutes()]);
      if (!alive.current) return;
      applySettings(s);
      setTripCount(trips.length);
      setRouteCount(routes.length);
      setLoadError(null);
    } catch (err) {
      if (!alive.current) return;
      const message = "Couldn't read your settings.";
      setLoadError(message);
      uiActions.showError(err, "Couldn't read your settings.");
    }

    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (alive.current) setStorageUsageBytes(typeof est.usage === "number" ? est.usage : null);
      } catch {
        // Storage estimate is a nicety, not a write — fail quiet, show a dash.
        if (alive.current) setStorageUsageBytes(null);
      }
    }
  }, [applySettings]);

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
        if (active) setSyncConfigured(Boolean(data?.configured));
      })
      .catch(() => {
        if (active) setSyncConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const patchSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...latest.current, ...patch };
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
    storageUsageBytes,
    syncConfigured,
    refresh,
    patchSettings,
  };
}
