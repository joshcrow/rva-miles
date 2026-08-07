"use client";

// Minimal push/pull sync keyed by a hand-typed code. GET the server's
// snapshot, merge it in locally (never destructive — see mergePlan in
// db.ts), then PUT the merged result back so both devices converge.

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import type { MergeResult, Settings, Snapshot } from "@/types";
import { exportSnapshot, importMerge } from "@/lib/db";
import { UserFacingError } from "@/lib/errors";
import { uiActions } from "@/stores/ui";
import { generateSyncCode, lastSyncedLabel, mergeResultText } from "./settingsLogic";

export interface SyncSectionProps {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new UserFacingError("Clipboard isn't available here — copy the code by hand.");
}

export function SyncSection({ settings, onPatch, onRefresh }: SyncSectionProps) {
  const [code, setCode] = useState(settings.syncCode ?? "");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => setCode(settings.syncCode ?? ""), [settings.syncCode]);

  const commitCode = useCallback(
    (next: string) => {
      const trimmed = next.trim().toUpperCase();
      setCode(trimmed);
      if (trimmed !== (settings.syncCode ?? "")) void onPatch({ syncCode: trimmed || undefined });
    },
    [settings.syncCode, onPatch],
  );

  const generate = useCallback(() => commitCode(generateSyncCode()), [commitCode]);

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await copyToClipboard(code);
      uiActions.showSnack("Sync code copied", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't copy the code.");
    }
  }, [code]);

  const syncNow = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(trimmed)}`);
      let result: MergeResult = { tripsAdded: 0, tripsUpdated: 0, routesAdded: 0, routesUpdated: 0, skipped: 0 };

      if (res.status === 200) {
        const remote = (await res.json()) as Snapshot;
        result = await importMerge(remote);
      } else if (res.status !== 404) {
        throw new UserFacingError("The sync server isn't responding right now.");
      }

      const snapshot = await exportSnapshot();
      const put = await fetch(`/api/sync?code=${encodeURIComponent(trimmed)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!put.ok) throw new UserFacingError("Couldn't save your trips to the sync server.");

      await onPatch({ lastSyncAt: Date.now() });
      await onRefresh();
      uiActions.showSnack(
        `Synced — ${mergeResultText(result, "nothing new from your other phone")}`,
        "success",
      );
    } catch (err) {
      uiActions.showError(err, "Couldn't sync right now.");
    } finally {
      setSyncing(false);
    }
  }, [code, onPatch, onRefresh]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Enter the same code on both phones, then tap Sync on each. Newer changes always win, and
            nothing is ever deleted.
          </Typography>

          <TextField
            label="Sync code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onBlur={(e) => commitCode(e.target.value)}
            fullWidth
            slotProps={{
              htmlInput: { style: { letterSpacing: "0.08em" } },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" aria-label="Generate a sync code" onClick={generate}>
                        <CasinoRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Copy sync code"
                        onClick={() => void copyCode()}
                        disabled={!code}
                      >
                        <ContentCopyRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<SyncRoundedIcon />}
            disabled={!code.trim() || syncing}
            onClick={() => void syncNow()}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </Button>

          <Typography variant="caption" color="text.secondary">
            {lastSyncedLabel(settings.lastSyncAt, Date.now())}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default SyncSection;
