"use client";

// App-wide transient UI state. Today that is exactly one thing: the snackbar.
//
// This store is the app's error channel. Storage writes never fail silently
// (v1's fatal flaw) — every catch surfaces here with severity 'error'.
// It is also the app's confirmation channel: destructive and creative actions
// happen instantly and offer UNDO here instead of a confirmation dialog.

import { create } from "zustand";
import { isUserFacing } from "@/lib/errors";

export { UserFacingError } from "@/lib/errors";

export type SnackSeverity = "success" | "info" | "warning" | "error";

export interface SnackState {
  message: string;
  severity: SnackSeverity;
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-hide in ms; SnackbarHost picks a sensible default when omitted. */
  duration?: number;
  /** Changes on every show so the host re-animates even for identical text. */
  key: number;
}

export interface SnackOptions {
  severity?: SnackSeverity;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export type SnackInput = string | ({ message: string } & SnackOptions);

interface UiStore {
  snack: SnackState | null;
  /** `showSnack('Saved')`, `showSnack('Nope', 'error')`, or object form. */
  showSnack: (
    input: SnackInput,
    severity?: SnackSeverity,
    options?: SnackOptions,
  ) => void;
  /**
   * Loud failure path. Accepts an Error so callers can just pass what they
   * caught — the caught error is logged, never rendered, unless it is a
   * UserFacingError. What the user reads is the `fallback` sentence.
   */
  showError: (input: unknown, fallback?: string) => void;
  /** Instant action + escape hatch. No confirmation dialogs anywhere. */
  showUndo: (message: string, onUndo: () => void) => void;
  clear: () => void;
}

let seq = 0;

const GENERIC_ERROR = "Something went wrong.";

/**
 * The caller's written sentence always beats a raw throw. A developer's
 * message never reaches the snackbar — it goes to the console, where it is
 * still there to debug with.
 */
function errorMessage(input: unknown, fallback?: string): string {
  if (typeof input === "string" && input.trim()) return input;
  if (isUserFacing(input) && input.message) return input.message;
  if (input !== undefined && input !== null) console.error("RVA Miles:", input);
  return fallback?.trim() || GENERIC_ERROR;
}

export const useUiStore = create<UiStore>((set) => ({
  snack: null,

  showSnack: (input, severity, options) => {
    seq += 1;
    const base = typeof input === "string" ? { message: input } : input;
    set({
      snack: {
        message: base.message,
        severity: severity ?? base.severity ?? options?.severity ?? "info",
        actionLabel: options?.actionLabel ?? base.actionLabel,
        onAction: options?.onAction ?? base.onAction,
        duration: options?.duration ?? base.duration,
        key: seq,
      },
    });
  },

  showError: (input, fallback) => {
    seq += 1;
    set({
      snack: {
        message: errorMessage(input, fallback),
        severity: "error",
        duration: 9000,
        key: seq,
      },
    });
  },

  showUndo: (message, onUndo) => {
    seq += 1;
    set({
      snack: {
        message,
        severity: "success",
        actionLabel: "Undo",
        onAction: onUndo,
        duration: 8000,
        key: seq,
      },
    });
  },

  clear: () => set({ snack: null }),
}));

/** Non-reactive access for callbacks / non-component code. */
export const uiActions = {
  showSnack: (input: SnackInput, severity?: SnackSeverity, options?: SnackOptions) =>
    useUiStore.getState().showSnack(input, severity, options),
  showError: (input: unknown, fallback?: string) =>
    useUiStore.getState().showError(input, fallback),
  showUndo: (message: string, onUndo: () => void) =>
    useUiStore.getState().showUndo(message, onUndo),
  clear: () => useUiStore.getState().clear(),
};
