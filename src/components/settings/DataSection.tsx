"use client";

// Storage summary + backup/import. Backup prefers the native share sheet
// (so "Back up now" can drop the file straight into Files/Drive/AirDrop) and
// falls back to a plain download. Import always shows a preview — computed
// with the same pure mergePlan() the real import uses — before anything is
// written, and offers an automatic safety-net backup first.

import { useCallback, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SdStorageRoundedIcon from "@mui/icons-material/SdStorageRounded";
import type { MergeResult, Settings, Snapshot } from "@/types";
import { db, exportSnapshot, importMerge, mergePlan, validateSnapshot } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { canShareFiles, downloadBlob, shareFiles } from "@/lib/share";
import { uiActions } from "@/stores/ui";
import ImportPreviewSheet from "./ImportPreviewSheet";
import { daysAgoLabel, formatBytes, isBackupStale, mergePreviewText } from "./settingsLogic";

export interface DataSectionProps {
  settings: Settings;
  tripCount: number;
  routeCount: number;
  storageUsageBytes: number | null;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface PendingImport {
  snapshot: Snapshot;
  previewText: string;
}

function backupFilename(): string {
  return `rva-miles-backup-${todayKey()}.json`;
}

async function writeBackup(): Promise<void> {
  const snapshot = await exportSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = backupFilename();
  let shared = false;
  if (typeof File !== "undefined") {
    const file = new File([blob], filename, { type: "application/json" });
    if (canShareFiles([file])) shared = await shareFiles([file], { title: "RVA Miles backup" });
  }
  if (!shared) downloadBlob(blob, filename);
}

export function DataSection({
  settings,
  tripCount,
  routeCount,
  storageUsageBytes,
  onPatch,
  onRefresh,
}: DataSectionProps) {
  const [backingUp, setBackingUp] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const now = Date.now();

  const stale = isBackupStale(settings.lastBackupAt, tripCount > 0, now);

  const handleBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      await writeBackup();
      await onPatch({ lastBackupAt: Date.now() });
      uiActions.showSnack("Backup saved", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't create a backup.");
    } finally {
      setBackingUp(false);
    }
  }, [onPatch]);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const handleFile = useCallback(async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      uiActions.showError("That file isn't valid JSON — pick a backup exported from RVA Miles.");
      return;
    }

    // Validate with exactly the rules importMerge enforces, so a file that
    // would be refused is refused here — never after the user has agreed to
    // a preview that can't be honoured.
    let snapshot: Snapshot;
    try {
      snapshot = validateSnapshot(parsed);
    } catch (err) {
      uiActions.showError(err, "That doesn't look like an RVA Miles backup file.");
      return;
    }

    let previewText: string;
    try {
      const [existingTrips, existingRoutes] = await Promise.all([db.trips.toArray(), db.routes.toArray()]);
      const tripPlan = mergePlan(existingTrips, snapshot.trips);
      const routePlan = mergePlan(existingRoutes, snapshot.routes);
      previewText = mergePreviewText({
        tripsAdded: tripPlan.added,
        tripsUpdated: tripPlan.updated,
        routesAdded: routePlan.added,
        routesUpdated: routePlan.updated,
      });
    } catch (err) {
      uiActions.showError(err, "Couldn't read your current trips to compare against.");
      return;
    }

    setPending({ snapshot, previewText });
  }, []);

  const confirmImport = useCallback(
    async (backupFirst: boolean) => {
      if (!pending) return;
      setImporting(true);
      try {
        if (backupFirst) {
          await writeBackup();
          await onPatch({ lastBackupAt: Date.now() });
        }
        const result: MergeResult = await importMerge(pending.snapshot);
        setPending(null);
        await onRefresh();
        uiActions.showSnack(`Import complete — ${mergePreviewText(result)}`, "success");
      } catch (err) {
        uiActions.showError(err, "Couldn't import that backup.");
      } finally {
        setImporting(false);
      }
    },
    [pending, onPatch, onRefresh],
  );

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2.5}>
            <Stat icon={<ListAltRoundedIcon />} value={String(tripCount)} label={tripCount === 1 ? "trip" : "trips"} />
            <Stat
              icon={<RouteRoundedIcon />}
              value={String(routeCount)}
              label={routeCount === 1 ? "route" : "routes"}
            />
            <Stat
              icon={<SdStorageRoundedIcon />}
              value={storageUsageBytes === null ? "—" : formatBytes(storageUsageBytes)}
              label="on device"
            />
          </Stack>

          <Box sx={{ height: 1, bgcolor: "divider" }} />

          <Stack direction="row" spacing={1.25}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CloudDownloadRoundedIcon />}
              onClick={() => void handleBackup()}
              disabled={backingUp}
            >
              {backingUp ? "Saving…" : "Back up now"}
            </Button>
            <Button fullWidth variant="outlined" startIcon={<CloudUploadRoundedIcon />} onClick={openFilePicker}>
              Import backup
            </Button>
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Last backup: {daysAgoLabel(settings.lastBackupAt, now)}
            </Typography>
            {stale ? <Chip size="small" color="warning" label="Overdue" /> : null}
          </Stack>
        </Stack>
      </CardContent>

      <ImportPreviewSheet
        open={pending !== null}
        previewText={pending?.previewText ?? ""}
        importing={importing}
        onCancel={() => setPending(null)}
        onConfirm={(backupFirst) => void confirmImport(backupFirst)}
      />
    </Card>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ color: "primary.main", display: "flex", "& svg": { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="subtitle1" className="tnum" noWrap>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </Stack>
  );
}

export default DataSection;
