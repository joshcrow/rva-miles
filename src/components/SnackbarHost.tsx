"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useUiStore } from "@/stores/ui";
import { isImmersiveRoute } from "./AppShell";

const DEFAULT_DURATION: Record<string, number> = {
  success: 5000,
  info: 4500,
  warning: 7000,
  error: 9000,
};

export function SnackbarHost() {
  const snack = useUiStore((s) => s.snack);
  const clear = useUiStore((s) => s.clear);
  const pathname = usePathname();
  const touchStartY = useRef<number | null>(null);

  const aboveNav = !isImmersiveRoute(pathname);
  const duration =
    snack?.duration ??
    (snack?.actionLabel ? 8000 : DEFAULT_DURATION[snack?.severity ?? "info"]);

  return (
    <Snackbar
      key={snack?.key ?? "none"}
      open={Boolean(snack)}
      autoHideDuration={duration}
      onClose={() => clear()}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{
        left: 12,
        right: 12,
        bottom: aboveNav
          ? "calc(var(--nav-height) + var(--safe-bottom) + 16px)"
          : "calc(var(--safe-bottom) + 20px)",
        maxWidth: 456,
        mx: "auto",
        "@media print": { display: "none" },
      }}
    >
      <Alert
        variant="filled"
        severity={snack?.severity ?? "info"}
        elevation={6}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(e) => {
          const start = touchStartY.current;
          const y = e.touches[0]?.clientY;
          if (start != null && y != null && y - start > 44) {
            touchStartY.current = null;
            clear();
          }
        }}
        // Radius and the raised shadow both come from the theme (elevation=6
        // resolves to elevation.raised) — nothing to restate here.
        sx={{ width: "100%", alignItems: "center" }}
        action={
          <>
            {snack?.actionLabel ? (
              <Button
                size="small"
                color="inherit"
                sx={{ fontWeight: 700, mr: 0.5, minHeight: 36 }}
                onClick={() => {
                  snack.onAction?.();
                  clear();
                }}
              >
                {snack.actionLabel}
              </Button>
            ) : null}
            <IconButton
              size="small"
              color="inherit"
              aria-label="Dismiss"
              onClick={() => clear()}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        {snack?.message ?? ""}
      </Alert>
    </Snackbar>
  );
}

export default SnackbarHost;
