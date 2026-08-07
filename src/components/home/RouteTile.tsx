"use client";

import { useCallback, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import type { Route } from "@/types";
import { fmtMiles, placeLabel } from "./format";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

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
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        textAlign: "left",
        minHeight: 116,
        p: 1.75,
        borderRadius: 4,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 2,
        WebkitTouchCallout: "none",
        userSelect: "none",
        touchAction: "manipulation",
        transition: "transform 140ms ease, border-color 160ms ease",
        "&:active": { transform: "scale(0.97)", borderColor: "primary.main" },
        "@keyframes tilePulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(124,58,237,0.42)" },
          "70%": { boxShadow: "0 0 0 14px rgba(124,58,237,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0)" },
        },
        "@keyframes tileBump": {
          "0%": { transform: "scale(1)" },
          "38%": { transform: "scale(1.045)" },
          "100%": { transform: "scale(1)" },
        },
        ...(pulsing
          ? {
              borderColor: "primary.main",
              animation: "tilePulse 700ms ease-out, tileBump 340ms ease-out",
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }
          : null),
      }}
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
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ mt: 0.25, minWidth: 0 }}>
          <ArrowRightAltRoundedIcon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" noWrap>
            {placeLabel(route.from)}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 1.25, width: "100%" }}>
        <Stack direction="row" alignItems="baseline" spacing={0.4} sx={{ minWidth: 0 }}>
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
          <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, pb: 0.25 }}>
            {usesThisMonth}× this month
          </Typography>
        ) : null}
      </Stack>
    </ButtonBase>
  );
}

export default RouteTile;
