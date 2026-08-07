"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ActiveDrive, Settings } from "@/types";
import { clearActiveDrive, getSettings, saveActiveDrive } from "@/lib/db";
import { isUserFacing } from "@/lib/errors";
import { currentDefaultRate } from "@/lib/rates";
import { recoverActiveDrive, useDriveTracking, type CompletedDrive } from "@/lib/tracking";
import { uiActions } from "@/stores/ui";
import DriveCockpit from "@/components/drive/DriveCockpit";
import DriveErrorPanel from "@/components/drive/DriveErrorPanel";
import DriveStage, { STAGE_FAINT } from "@/components/drive/DriveStage";
import ResumeSheet from "@/components/drive/ResumeSheet";
import StartPanel from "@/components/drive/StartPanel";
import StopSheet from "@/components/drive/StopSheet";
import { formatMiles } from "@/components/drive/driveFormat";

/** A discarded drive stays recoverable this long before it's really gone. */
const DISCARD_GRACE_MS = 8000;

function fallbackSettings(): Settings {
  return { ratePerMile: currentDefaultRate(), theme: "system" };
}

export default function DrivePage() {
  const router = useRouter();
  const tracking = useDriveTracking();

  const [booting, setBooting] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recovered, setRecovered] = useState<ActiveDrive | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [completed, setCompleted] = useState<CompletedDrive | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /** True when an ActiveDrive row is still on disk and this screen owns clearing it. */
  const ownsActiveRow = useRef(false);
  const discardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [settingsResult, driveResult] = await Promise.allSettled([
        getSettings(),
        recoverActiveDrive(),
      ]);
      if (cancelled) return;
      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
      } else {
        uiActions.showError(settingsResult.reason, "Couldn't read your settings — using defaults.");
      }
      if (driveResult.status === "fulfilled") {
        if (driveResult.value) {
          ownsActiveRow.current = true;
          setRecovered(driveResult.value);
          setResumeOpen(true);
        }
      } else {
        uiActions.showError(driveResult.reason, "Couldn't check for an unfinished drive.");
      }
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A reload mid-drive costs the unpersisted tail of the track, so make the
  // browser ask first. Only while actually recording — never otherwise.
  useEffect(() => {
    if (!active) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  useEffect(() => {
    return () => {
      // Leaving the screen mid-grace finalizes the discard rather than
      // stranding an orphan ActiveDrive row.
      if (discardTimer.current) {
        clearTimeout(discardTimer.current);
        discardTimer.current = null;
        if (ownsActiveRow.current) {
          ownsActiveRow.current = false;
          void clearActiveDrive().catch((err) =>
            uiActions.showError(err, "Couldn't clear the discarded drive."),
          );
        }
      }
    };
  }, []);

  /** Clears the recovered ActiveDrive row, if this screen is still responsible for one. */
  const finalizeActiveRow = useCallback(async () => {
    if (!ownsActiveRow.current) return;
    await clearActiveDrive();
    ownsActiveRow.current = false;
  }, []);

  function openStopSheet(drive: CompletedDrive) {
    setCompleted(drive);
    setSheetOpen(true);
  }

  async function handleStart() {
    if (starting) return;
    if (recovered) {
      // Starting fresh would overwrite the unfinished drive's row — decide first.
      setResumeOpen(true);
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      await tracking.start(settings?.vehicle);
      ownsActiveRow.current = true;
      setActive(true);
    } catch (err) {
      setStartError(isUserFacing(err) ? err.message : "Couldn't start GPS tracking.");
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    if (stopping) return;
    setStopping(true);
    try {
      const drive = await tracking.stop();
      setActive(false);
      // stop() clears the ActiveDrive row itself.
      ownsActiveRow.current = false;
      if (!drive) {
        uiActions.showSnack(
          "No movement was recorded, so there's nothing to save.",
          "warning",
        );
        return;
      }
      openStopSheet(drive);
    } catch (err) {
      // The row survives a failed clear, so hand the drive back through recovery
      // instead of dropping it.
      setActive(false);
      uiActions.showError(err, "Couldn't finish that drive — it's still here to resume or save.");
      try {
        const stranded = await recoverActiveDrive();
        if (stranded) {
          ownsActiveRow.current = true;
          setRecovered(stranded);
          setResumeOpen(true);
        }
      } catch {
        uiActions.showError("Couldn't recover that drive. Check Trips before you drive on.");
      }
    } finally {
      setStopping(false);
    }
  }

  function handleResume() {
    if (!recovered) return;
    tracking.resume(recovered);
    ownsActiveRow.current = true;
    setRecovered(null);
    setResumeOpen(false);
    setActive(true);
  }

  function handleFinishRecovered() {
    const drive = recovered;
    if (!drive) return;
    const first = drive.points[0];
    const last = drive.points[drive.points.length - 1];
    setRecovered(null);
    setResumeOpen(false);
    openStopSheet({
      points: drive.points,
      distanceMiles: drive.distanceMiles,
      startedAt: drive.startedAt,
      // The drive really ended at its last accepted fix, not now.
      endedAt: drive.lastFixAt ?? Date.now(),
      from: first ? { lat: first.lat, lng: first.lng } : undefined,
      to: last ? { lat: last.lat, lng: last.lng } : undefined,
    });
  }

  async function handleDiscardRecovered() {
    const drive = recovered;
    if (!drive) return;
    setResumeBusy(true);
    try {
      await clearActiveDrive();
      ownsActiveRow.current = false;
      setRecovered(null);
      setResumeOpen(false);
      uiActions.showUndo(`Unfinished drive discarded — ${formatMiles(drive.distanceMiles)} mi`, () => {
        void restoreRecovered(drive);
      });
    } catch (err) {
      uiActions.showError(err, "Couldn't discard that drive — it's still here.");
    } finally {
      setResumeBusy(false);
    }
  }

  async function restoreRecovered(drive: ActiveDrive) {
    try {
      await saveActiveDrive(drive);
      ownsActiveRow.current = true;
      setRecovered(drive);
      setResumeOpen(true);
    } catch (err) {
      uiActions.showError(err, "Couldn't bring that drive back.");
    }
  }

  function handleDiscardDrive() {
    const drive = completed;
    if (!drive) return;
    setSheetOpen(false);
    if (discardTimer.current) clearTimeout(discardTimer.current);
    discardTimer.current = setTimeout(() => {
      discardTimer.current = null;
      setCompleted(null);
      void finalizeActiveRow().catch((err) =>
        uiActions.showError(err, "Couldn't clear the discarded drive."),
      );
    }, DISCARD_GRACE_MS);
    uiActions.showUndo(`Drive discarded — ${formatMiles(drive.distanceMiles)} mi`, () => {
      if (discardTimer.current) {
        clearTimeout(discardTimer.current);
        discardTimer.current = null;
      }
      setSheetOpen(true);
    });
  }

  function handleSaved() {
    setSheetOpen(false);
    setCompleted(null);
    router.replace("/");
  }

  return (
    <DriveStage>
      {booting ? (
        <BootPanel />
      ) : startError ? (
        <DriveErrorPanel
          message={startError}
          onRetry={() => {
            setStartError(null);
            void handleStart();
          }}
        />
      ) : active ? (
        <DriveCockpit
          status={tracking.status}
          distanceMiles={tracking.distanceMiles}
          elapsedMs={tracking.elapsedMs}
          lastFixAgoMs={tracking.lastFixAgoMs}
          accuracy={tracking.accuracy}
          stopping={stopping}
          onStop={() => void handleStop()}
        />
      ) : (
        <StartPanel
          vehicle={settings?.vehicle}
          acquiring={starting}
          unfinishedMiles={recovered ? recovered.distanceMiles : null}
          onStart={() => void handleStart()}
          onReviewUnfinished={() => setResumeOpen(true)}
        />
      )}

      <ResumeSheet
        open={resumeOpen}
        drive={recovered}
        busy={resumeBusy}
        onResume={handleResume}
        onFinish={handleFinishRecovered}
        onDiscard={() => void handleDiscardRecovered()}
        onClose={() => setResumeOpen(false)}
      />

      {completed ? (
        <StopSheet
          key={completed.startedAt}
          open={sheetOpen}
          drive={completed}
          settings={settings ?? fallbackSettings()}
          finalize={finalizeActiveRow}
          onSaved={handleSaved}
          onDiscard={handleDiscardDrive}
        />
      ) : null}
    </DriveStage>
  );
}

/** Same silhouette as the START disc, so nothing jumps when data lands. */
function BootPanel() {
  return (
    <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3.5 }}>
      <Box
        sx={{
          width: "min(244px, 44vh)",
          height: "min(244px, 44vh)",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(255,255,255,0.03)",
          "@keyframes driveBoot": {
            "0%, 100%": { opacity: 0.55 },
            "50%": { opacity: 1 },
          },
          animation: "driveBoot 1.6s ease-in-out infinite",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      />
      <Typography variant="caption" sx={{ color: STAGE_FAINT }}>
        Getting ready…
      </Typography>
    </Stack>
  );
}
