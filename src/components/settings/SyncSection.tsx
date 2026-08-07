"use client";

// The sync code, and a live answer to the only question the user actually has
// about sync: is it working right now? The cycle itself lives in
// `src/lib/sync.ts` and runs on its own (`src/lib/autosync.ts`) — "Sync now"
// is kept as a small manual nudge for the moment someone is standing next to
// the other phone and doesn't want to wait.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Alert from "@mui/material/Alert";
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
import type { Settings } from "@/types";
import { UserFacingError } from "@/lib/errors";
import { getServerSyncState, getSyncState, subscribeSync, syncNow } from "@/lib/sync";
import { uiActions } from "@/stores/ui";
import { generateSyncCode, mergeResultText, syncStatusLine } from "./settingsLogic";

export interface SyncSectionProps {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

/** "2 min ago" goes stale on a screen left open; re-read the clock slowly. */
const TICK_MS = 30_000;

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new UserFacingError("Clipboard isn't available here — copy the code by hand.");
}

export function SyncSection({ settings, onPatch, onRefresh }: SyncSectionProps) {
  const [code, setCode] = useState(settings.syncCode ?? "");
  const [manualSyncing, setManualSyncing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const state = useSyncExternalStore(subscribeSync, getSyncState, getServerSyncState);

  useEffect(() => setCode(settings.syncCode ?? ""), [settings.syncCode]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // The engine's own stamp is fresher than the settings this screen was
  // rendered from, and it is the one that ticks while the screen stays open.
  const lastSyncAt = state.lastSyncAt ?? settings.lastSyncAt;

  // A finished cycle can have brought trips in from the other phone, and the
  // counts above this card are read from the ledger — so re-read it.
  useEffect(() => {
    if (state.lastSyncAt) void onRefresh();
  }, [state.lastSyncAt, onRefresh]);

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

  const runManualSync = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setManualSyncing(true);
    try {
      // The field saves on blur, but the button can be tapped first — commit
      // what is on screen so a manual sync always uses the code she can see.
      if (trimmed !== (settings.syncCode ?? "")) await onPatch({ syncCode: trimmed });

      const result = await syncNow();
      if (result.ok) {
        uiActions.showSnack(
          `Synced — ${mergeResultText(result.merged, "nothing new from your other phone")}`,
          "success",
        );
      } else {
        const after = getSyncState();
        if (after.status === "offline") {
          uiActions.showSnack("Offline — will sync when you're back", "warning");
        } else {
          uiActions.showError(undefined, after.lastError ?? "Couldn't sync right now.");
        }
      }
    } finally {
      setManualSyncing(false);
    }
  }, [code, settings.syncCode, onPatch]);

  const hasCode = code.trim().length > 0;
  const busy = state.status === "syncing" || manualSyncing;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Enter the same code on both phones. Each one then keeps itself up to date on its own —
            newer changes win, and nothing is ever deleted.
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

          {!hasCode ? (
            <Typography variant="caption" color="text.secondary">
              Nothing leaves this phone until a code is set.
            </Typography>
          ) : state.status === "error" ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" disabled={busy} onClick={() => void runManualSync()}>
                  Retry
                </Button>
              }
            >
              {state.lastError}
            </Alert>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography
                variant="caption"
                sx={{ color: state.status === "offline" ? "warning.main" : "text.secondary" }}
              >
                {syncStatusLine(state.status, lastSyncAt, now)}
              </Typography>
              <Button
                size="small"
                startIcon={<SyncRoundedIcon />}
                disabled={busy}
                onClick={() => void runManualSync()}
              >
                Sync now
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default SyncSection;
