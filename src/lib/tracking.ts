"use client";

// The live-drive engine. Client-only: geolocation, wake lock, and
// visibilitychange are all browser APIs. This is where v1's fatal bugs
// lived — reload zeroing an in-progress trip while a hardcoded badge lied
// about status, GPS-denied drives still creating live-looking 0-mile
// entries, no accuracy/drift filtering — so the invariants below are load
// bearing, not style:
//  - status is ALWAYS derived from fix recency, never set to "recording" by
//    fiat
//  - start() only resolves once a real fix has been obtained; any
//    permission/availability failure throws before any drive exists
//  - the distance accumulator only ever gets +='d by an accepted step —
//    it is never recomputed by re-summing the whole track
//  - progress is persisted well before the drive ends, so a reload or
//    screen lock mid-drive has something to recover

import { useEffect, useRef, useState } from "react";
import type { ActiveDrive, DriveStatus, GpsPoint, LatLng } from "@/types";
import { acceptFix, haversineMiles, simplifyTrack } from "./geo";
import { clearActiveDrive, getActiveDrive, saveActiveDrive } from "./db";
import { newId } from "./ids";
import { UserFacingError } from "./errors";
import { uiActions } from "@/stores/ui";

export interface CompletedDrive {
  points: GpsPoint[];
  distanceMiles: number;
  startedAt: number;
  endedAt: number;
  from?: LatLng;
  to?: LatLng;
}

/** A fix is only trusted as "currently recording" while this fresh. */
const RECORDING_WINDOW_MS = 15_000;
/** Points are simplified before persisting once the track grows past this. */
const SIMPLIFY_THRESHOLD = 200;
/** Cadence for the background ActiveDrive persist while a drive is live. */
const PERSIST_EVERY_N_FIXES = 5;
const TICK_MS = 1000;

interface DriveEngine {
  id: string;
  vehicle?: string;
  startedAt: number;
  /** Accepted points, full resolution — simplified only at persist time. */
  points: GpsPoint[];
  distanceMiles: number;
  lastFixAt: number | null;
  acceptedSincePersist: number;
  watchId: number | null;
  wakeLock: WakeLockSentinel | null;
}

function getCurrentPositionAsync(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Written for the driver, so it is marked as copy and shown verbatim. */
function friendlyGeoError(err: unknown): UserFacingError {
  const code = err && typeof err === "object" && "code" in err ? (err as GeolocationPositionError).code : undefined;
  switch (code) {
    case 1: // PERMISSION_DENIED
      return new UserFacingError("Location access is off. Turn on location for this browser to start a drive.");
    case 2: // POSITION_UNAVAILABLE
      return new UserFacingError("Couldn't get a GPS fix. Try again somewhere with a clearer view of the sky.");
    case 3: // TIMEOUT
      return new UserFacingError("GPS took too long to respond. Try again in a moment.");
    default:
      return new UserFacingError("Couldn't start GPS tracking.");
  }
}

function toGpsPoint(pos: GeolocationPosition): GpsPoint {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    timestamp: pos.timestamp,
    accuracy: pos.coords.accuracy,
  };
}

/**
 * Reads any drive left active from a previous session (killed tab, reload,
 * crash). Callers use this to offer a resume prompt; it never auto-resumes.
 */
export async function recoverActiveDrive(): Promise<ActiveDrive | undefined> {
  if (typeof window === "undefined") return undefined;
  return getActiveDrive();
}

interface DriveTrackingApi {
  status: DriveStatus;
  distanceMiles: number;
  elapsedMs: number;
  lastFixAgoMs: number | null;
  accuracy: number | null;
  start(vehicle?: string): Promise<void>;
  stop(): Promise<CompletedDrive | null>;
  discard(): Promise<void>;
  resume(d: ActiveDrive): void;
}

export function useDriveTracking(): DriveTrackingApi {
  const [status, setStatus] = useState<DriveStatus>("idle");
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastFixAgoMs, setLastFixAgoMs] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const engineRef = useRef<DriveEngine | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Background ActiveDrive persists (every 5 fixes, on visibilitychange
  // hidden) have no synchronous caller to throw back to — they fire from
  // inside a geolocation callback or a visibilitychange handler, not a
  // button press. Per the "never a silent catch" rule, a failure here still
  // has to reach the user, so it goes straight to the ui store's error
  // snackbar rather than waiting for some later awaited call to surface it.
  // (start()/stop()/discard() are user-invoked and simply throw, matching
  // db.ts's own "callers surface caught errors" pattern.)
  function reportPersistFailure(err: unknown) {
    try {
      uiActions.showError(err, "Drive progress couldn't be saved.");
    } catch (storeErr) {
      // Belt-and-suspenders: if the store is ever unavailable, don't let
      // the failure vanish silently.
      console.error("Drive progress couldn't be saved.", err, storeErr);
    }
  }

  function recomputeDerived(engine: DriveEngine) {
    const now = Date.now();
    setElapsedMs(now - engine.startedAt);
    if (engine.lastFixAt == null) {
      setLastFixAgoMs(null);
      setStatus("acquiring");
      return;
    }
    const ago = now - engine.lastFixAt;
    setLastFixAgoMs(ago);
    setStatus(ago <= RECORDING_WINDOW_MS ? "recording" : "signal-lost");
  }

  async function persistActiveDrive(engine: DriveEngine) {
    const pointsToSave = engine.points.length > SIMPLIFY_THRESHOLD ? simplifyTrack(engine.points) : engine.points;
    const activeDrive: ActiveDrive = {
      id: engine.id,
      startedAt: engine.startedAt,
      vehicle: engine.vehicle,
      points: pointsToSave,
      distanceMiles: engine.distanceMiles,
      lastFixAt: engine.lastFixAt ?? undefined,
    };
    try {
      await saveActiveDrive(activeDrive);
    } catch (err) {
      reportPersistFailure(err);
    }
  }

  function ingestPosition(engine: DriveEngine, pos: GeolocationPosition) {
    if (engineRef.current !== engine) return; // stale callback from a watch that's since been torn down
    const point = toGpsPoint(pos);
    setAccuracy(point.accuracy ?? null);

    const prevAccepted = engine.points[engine.points.length - 1];
    if (!acceptFix(prevAccepted, point)) return;

    if (prevAccepted) engine.distanceMiles += haversineMiles(prevAccepted, point);
    engine.points.push(point);
    engine.lastFixAt = point.timestamp;
    setDistanceMiles(engine.distanceMiles);
    recomputeDerived(engine);

    engine.acceptedSincePersist += 1;
    if (engine.acceptedSincePersist >= PERSIST_EVERY_N_FIXES) {
      engine.acceptedSincePersist = 0;
      void persistActiveDrive(engine);
    }
  }

  function startWatch(engine: DriveEngine) {
    engine.watchId = navigator.geolocation.watchPosition(
      (pos) => ingestPosition(engine, pos),
      () => {
        // A watch error doesn't tear down the drive — status naturally
        // degrades to "signal-lost" via the recency ticker once fixes stop
        // arriving, and watchPosition keeps retrying on its own.
      },
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
  }

  function startTicking() {
    if (tickRef.current != null) return;
    tickRef.current = setInterval(() => {
      const engine = engineRef.current;
      if (engine) recomputeDerived(engine);
    }, TICK_MS);
  }

  function stopTicking() {
    if (tickRef.current != null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function acquireWakeLock(engine: DriveEngine) {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      if (engineRef.current !== engine) {
        // Engine was torn down while the request was in flight.
        void sentinel.release();
        return;
      }
      engine.wakeLock = sentinel;
      sentinel.addEventListener("release", () => {
        if (engineRef.current === engine) engine.wakeLock = null;
      });
    } catch {
      // Non-fatal — the screen may dim, but tracking itself is unaffected.
    }
  }

  async function releaseWakeLock(engine: DriveEngine | null) {
    if (!engine?.wakeLock) return;
    try {
      await engine.wakeLock.release();
    } catch {
      // already released or unsupported — nothing to do
    }
    engine.wakeLock = null;
  }

  function clearWatch(engine: DriveEngine | null) {
    if (engine?.watchId != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(engine.watchId);
      engine.watchId = null;
    }
  }

  function resetDisplayState() {
    setStatus("idle");
    setDistanceMiles(0);
    setElapsedMs(0);
    setLastFixAgoMs(null);
    setAccuracy(null);
  }

  async function start(vehicle?: string): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new UserFacingError("This device doesn't support GPS location.");
    }
    resetDisplayState();
    setStatus("acquiring");

    let firstPosition: GeolocationPosition;
    try {
      firstPosition = await getCurrentPositionAsync({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
    } catch (err) {
      setStatus("idle");
      throw friendlyGeoError(err);
    }

    const engine: DriveEngine = {
      id: newId(),
      vehicle,
      startedAt: Date.now(),
      points: [],
      distanceMiles: 0,
      lastFixAt: null,
      acceptedSincePersist: 0,
      watchId: null,
      wakeLock: null,
    };
    engineRef.current = engine;

    ingestPosition(engine, firstPosition);
    startWatch(engine);
    startTicking();
    void acquireWakeLock(engine);
    // Persist immediately on start (in addition to the every-5-fix/hidden
    // cadence) so a reload in the first few seconds of a drive still has an
    // ActiveDrive row to recover.
    void persistActiveDrive(engine);
  }

  async function stop(): Promise<CompletedDrive | null> {
    const engine = engineRef.current;
    clearWatch(engine);
    stopTicking();
    await releaseWakeLock(engine);
    engineRef.current = null;

    if (!engine || engine.points.length === 0) {
      resetDisplayState();
      return null;
    }

    const first = engine.points[0];
    const last = engine.points[engine.points.length - 1];
    const completed: CompletedDrive = {
      points: engine.points,
      distanceMiles: engine.distanceMiles,
      startedAt: engine.startedAt,
      endedAt: Date.now(),
      from: { lat: first.lat, lng: first.lng },
      to: { lat: last.lat, lng: last.lng },
    };
    resetDisplayState();
    await clearActiveDrive(); // throws on failure — caller (Stop button handler) surfaces it
    return completed;
  }

  async function discard(): Promise<void> {
    const engine = engineRef.current;
    clearWatch(engine);
    stopTicking();
    await releaseWakeLock(engine);
    engineRef.current = null;
    resetDisplayState();
    await clearActiveDrive(); // throws on failure — caller (Discard button handler) surfaces it
  }

  function resume(d: ActiveDrive): void {
    const engine: DriveEngine = {
      id: d.id,
      vehicle: d.vehicle,
      startedAt: d.startedAt,
      points: [...d.points],
      distanceMiles: d.distanceMiles,
      lastFixAt: d.lastFixAt ?? null,
      acceptedSincePersist: 0,
      watchId: null,
      wakeLock: null,
    };
    engineRef.current = engine;
    setDistanceMiles(engine.distanceMiles);
    recomputeDerived(engine);
    startWatch(engine);
    startTicking();
    void acquireWakeLock(engine);
  }

  // visibilitychange: persist immediately when the tab/screen hides (a
  // screen-lock mid-drive must not lose more than the last few seconds), and
  // re-acquire the wake lock on return if the OS released it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibilityChange() {
      const engine = engineRef.current;
      if (!engine) return;
      if (document.hidden) {
        void persistActiveDrive(engine);
      } else if (!engine.wakeLock) {
        void acquireWakeLock(engine);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unmount: stop watching/ticking and release the wake lock so nothing
  // leaks, but make one last best-effort persist first — the component
  // going away (e.g. navigating off the drive screen) shouldn't cost more
  // than the last few unpersisted fixes.
  useEffect(() => {
    return () => {
      const engine = engineRef.current;
      clearWatch(engine);
      stopTicking();
      if (engine) {
        void persistActiveDrive(engine);
        void releaseWakeLock(engine);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, distanceMiles, elapsedMs, lastFixAgoMs, accuracy, start, stop, discard, resume };
}
