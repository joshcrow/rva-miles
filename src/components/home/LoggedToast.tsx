"use client";

// The "logged" confirmation needs two actions (UNDO and Round trip); the
// shared ui-store snackbar carries one. This mirrors SnackbarHost's look and
// position exactly, and yields to it — a real error always wins the slot.

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import { useUiStore } from "@/stores/ui";

export interface LoggedToastState {
  key: number;
  message: string;
  onUndo: () => void;
  /** Omitted when the route already logs a round trip by default. */
  onRoundTrip?: () => void;
}

export function LoggedToast({
  state,
  onClose,
}: {
  state: LoggedToastState | null;
  onClose: () => void;
}) {
  const globalSnack = useUiStore((s) => s.snack);
  // Once a real snackbar (usually an error) has taken the slot, this toast is
  // retired for good — it must never pop back up, stale, when that one hides.
  const [retiredKey, setRetiredKey] = useState<number | null>(null);
  if (globalSnack && state && retiredKey !== state.key) setRetiredKey(state.key);

  const open = Boolean(state) && !globalSnack && retiredKey !== state?.key;

  return (
    <Snackbar
      key={state?.key ?? "none"}
      open={open}
      autoHideDuration={8000}
      onClose={(_e, reason) => {
        if (reason === "clickaway") return;
        onClose();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{
        left: 12,
        right: 12,
        bottom: "calc(var(--nav-height) + var(--safe-bottom) + 16px)",
        maxWidth: 456,
        mx: "auto",
      }}
    >
      <Alert
        variant="filled"
        severity="success"
        elevation={6}
        // elevation={6} already resolves to the `raised` token — no local shadow.
        sx={{ width: "100%", alignItems: "center" }}
        action={
          <>
            {state?.onRoundTrip ? (
              <Button
                size="small"
                color="inherit"
                startIcon={<SyncAltRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 700, minHeight: 36, whiteSpace: "nowrap" }}
                onClick={() => {
                  state.onRoundTrip?.();
                }}
              >
                Round trip
              </Button>
            ) : null}
            <Button
              size="small"
              color="inherit"
              sx={{ fontWeight: 700, minHeight: 36 }}
              onClick={() => {
                state?.onUndo();
                onClose();
              }}
            >
              Undo
            </Button>
            <IconButton size="small" color="inherit" aria-label="Dismiss" onClick={onClose}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        {state?.message ?? ""}
      </Alert>
    </Snackbar>
  );
}

export default LoggedToast;
