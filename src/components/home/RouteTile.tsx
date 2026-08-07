"use client";

import { useCallback, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import type { Route } from "@/types";
import { radii } from "@/theme/theme";
import { fmtMiles, placeLabel } from "./format";
import { restingSurface } from "./surfaces";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

/**
 * The "logged!" tap feedback. Deliberately restrained: an 8px ring at low
 * alpha for 450ms. The tile must confirm the tap, not glow — see the glow
 * budget in src/theme/theme.ts. Keep in sync with PULSE_MS in HomeScreen.
 */
const PULSE_RING = "rgba(124,58,237,0.26)";
const PULSE_SPREAD_PX = 8;

export interface RouteTileProps {
  route: Route;
  usesThisMonth: number;
  pulsing: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

export function RouteTile({ route, usesThisMonth, pulsing, onTap, onLongPress }: RouteTileProps) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => cancelTimer, [cancelTimer]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      cancelTimer();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        navigator.vibrate?.(12);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [cancelTimer, onLongPress],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = origin.current;
      if (!start || timer.current === null) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) cancelTimer();
    },
    [cancelTimer],
  );

  const handleClick = useCallback(() => {
    cancelTimer();
    if (fired.current) {
      fired.current = false;
      return;
    }
    onTap();
  }, [cancelTimer, onTap]);

  const miles = route.defaultRoundTrip ? route.distanceMiles * 2 : route.distanceMiles;

  return (
    <ButtonBase
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelTimer}
      onPointerCancel={cancelTimer}
      onPointerLeave={cancelTimer}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      aria-label={`Log ${fmtMiles(miles)} miles to ${placeLabel(route.to)} today. Press and hold for more options.`}
      sx={(t) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        textAlign: "left",
        minHeight: 116,
        p: 1.75,
        borderRadius: `${radii.card}px`,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        ...restingSurface(t),
        WebkitTouchCallout: "none",
        userSelect: "none",
        touchAction: "manipulation",
        transition: "transform 140ms ease, border-color 160ms ease",
        "&:active": { transform: "scale(0.97)", borderColor: "primary.main" },
        "@keyframes tilePulse": {
          "0%": { boxShadow: `0 0 0 0 ${PULSE_RING}` },
          "70%": { boxShadow: `0 0 0 ${PULSE_SPREAD_PX}px rgba(124,58,237,0)` },
          "100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0)" },
        },
        "@keyframes tileBump": {
          "0%": { transform: "scale(1)" },
          "38%": { transform: "scale(1.035)" },
          "100%": { transform: "scale(1)" },
        },
        ...(pulsing
          ? {
              borderColor: "primary.main",
              animation: "tilePulse 450ms ease-out, tileBump 340ms ease-out",
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }
          : null),
      })}
    >
      <Box sx={{ minWidth: 0, width: "100%" }}>
        <Typography
          variant="subtitle1"
          component="span"
          sx={{
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {placeLabel(route.to)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 0.25 }}>
          <Box component="span" sx={{ color: "text.disabled" }}>
            from{" "}
          </Box>
          {placeLabel(route.from)}
        </Typography>
      </Box>

      {/* Wraps rather than shrinks: the mileage is the glanceable number and
          must never be squeezed (or overlapped) by the usage caption — long
          place names and large accessibility text sizes both make this row
          too narrow for one line. */}
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ mt: 1.25, width: "100%", columnGap: 1, rowGap: 0.25 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={0.4} sx={{ flexShrink: 0 }}>
          <Typography
            component="span"
            className="tnum"
            sx={{ fontSize: 29, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {fmtMiles(miles)}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            mi
          </Typography>
          {route.defaultRoundTrip ? (
            <SyncAltRoundedIcon sx={{ fontSize: 13, color: "text.disabled", ml: 0.25 }} />
          ) : null}
        </Stack>

        {usesThisMonth > 0 ? (
          <Typography variant="caption" color="text.disabled" noWrap sx={{ pb: 0.25 }}>
            {usesThisMonth}× this month
          </Typography>
        ) : null}
      </Stack>
    </ButtonBase>
  );
}

export default RouteTile;
