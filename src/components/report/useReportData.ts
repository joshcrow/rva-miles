"use client";

// Data source for the /report screen: the whole (personal-scale) ledger plus
// settings, read once and refreshed when the tab comes back to the foreground
// so a trip logged on Home shows up here without a reload.
//
// `today` is deliberately '' until mounted — the local calendar date is a
// client-only fact, and rendering the server's idea of it would both mismatch
// on hydration and pick the wrong pay period for anyone west of the server.
//
// Coming back to the tab paints the last known ledger synchronously from a
// module-level snapshot and re-reads Dexie behind it, so a revisit doesn't
// flash a skeleton over data we already have.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, Trip } from "@/types";
import { getSettings, listTrips, saveSettings } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { currentDefaultRate } from "@/lib/rates";
import { uiActions } from "@/stores/ui";

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

/**
 * Last successful read, kept at module scope so it outlives the unmount of a
 * tab switch. Written only from effects and handlers, so it is null during SSR
 * and on the first client render of a page load — first visits still show the
 * skeleton and hydration still matches. Error states are never stored.
 */
interface ReportSnapshot {
  trips: Trip[];
  settings: Settings;
}

let cache: ReportSnapshot | null = null;

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
  // A snapshot exists only after a previous mount on this client, so seeding
  // from it — including reading the local date during render — can't run on
  // the server or during hydration.
  const [ready, setReady] = useState(cache !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => (cache ? todayKey() : ""));
  const [trips, setTrips] = useState<Trip[]>(() => cache?.trips ?? []);
  const [settings, setSettings] = useState<Settings>(() => cache?.settings ?? fallbackSettings());
  const alive = useRef(true);

  // Mirrors the loaded data synchronously; every write goes through it so the
  // module cache can never drift from what's on screen.
  const latest = useRef<ReportSnapshot>({ trips, settings });

  // Bumped when this screen writes settings. A read that started before that
  // write carries older truth, so it is dropped instead of reverting the field.
  const editSeq = useRef(0);

  const commit = useCallback((patch: Partial<ReportSnapshot>) => {
    latest.current = { ...latest.current, ...patch };
    cache = latest.current;
  }, []);

  const refresh = useCallback(async () => {
    setToday(todayKey());
    const edits = editSeq.current;
    try {
      const [t, s] = await Promise.all([listTrips(), getSettings()]);
      if (!alive.current || edits !== editSeq.current) return;
      commit({ trips: t, settings: s });
      setTrips(t);
      setSettings(s);
      setLoadError(null);
    } catch (err) {
      if (!alive.current) return;
      const message = "Couldn't read your saved trips.";
      setLoadError(message);
      uiActions.showError(err, "Couldn't read your saved trips.");
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
        editSeq.current += 1;
        commit({ settings: next });
        setSettings(next);
        await saveSettings(next);
      } catch (err) {
        uiActions.showError(err, "Couldn't save that email address.");
        // Recover the truth on disk rather than leaving the field lying.
        void refresh();
      }
    },
    [commit, refresh],
  );

  return { ready, loadError, today, trips, settings, refresh, saveRecipientEmail };
}
