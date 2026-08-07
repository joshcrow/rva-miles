"use client";

// Data source for the /report screen: the whole (personal-scale) ledger plus
// settings, read once and refreshed when the tab comes back to the foreground
// so a trip logged on Home shows up here without a reload.
//
// `today` is deliberately '' until mounted — the local calendar date is a
// client-only fact, and rendering the server's idea of it would both mismatch
// on hydration and pick the wrong pay period for anyone west of the server.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, Trip } from "@/types";
import { getSettings, listTrips, saveSettings } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

export interface ReportDataApi {
  ready: boolean;
  loadError: string | null;
  /** '' until mounted. */
  today: string;
  trips: Trip[];
  settings: Settings;
  refresh: () => Promise<void>;
  /** Persists the report recipient; throws nothing — surfaces failure loudly. */
  saveRecipientEmail: (email: string) => Promise<void>;
}

export function useReportData(): ReportDataApi {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    setToday(todayKey());
    try {
      const [t, s] = await Promise.all([listTrips(), getSettings()]);
      if (!alive.current) return;
      setTrips(t);
      setSettings(s);
      setLoadError(null);
    } catch (err) {
      if (!alive.current) return;
      const message = "Couldn't read your saved trips.";
      setLoadError(message);
      uiActions.showError(err, "Couldn't read your saved trips.");
    }
  }, []);

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
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const saveRecipientEmail = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      try {
        // saveSettings writes the whole object, so merge onto what's actually
        // on disk right now — this screen's copy could be minutes old, and a
        // rate or schedule changed since (another tab, the Settings screen)
        // must not be reverted by saving an email address.
        const current = await getSettings();
        const next: Settings = {
          ...current,
          reportRecipient: { ...current.reportRecipient, email: trimmed || undefined },
        };
        setSettings(next);
        await saveSettings(next);
      } catch (err) {
        uiActions.showError(err, "Couldn't save that email address.");
        // Recover the truth on disk rather than leaving the field lying.
        void refresh();
      }
    },
    [refresh],
  );

  return { ready, loadError, today, trips, settings, refresh, saveRecipientEmail };
}
