"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GpsFixedRounded from "@mui/icons-material/GpsFixedRounded";
import ScreenLockPortraitRounded from "@mui/icons-material/ScreenLockPortraitRounded";
import StopRounded from "@mui/icons-material/StopRounded";
import type { DriveStatus } from "@/types";
import { brand, radii } from "@/theme/theme";
import { STAGE_DIM, STAGE_FAINT, STAGE_FG, STAGE_FILL, STAGE_LINE } from "./DriveStage";
import { formatAgo, formatElapsed, formatMiles } from "./driveFormat";

interface DriveCockpitProps {
  status: DriveStatus;
  distanceMiles: number;
  elapsedMs: number;
  lastFixAgoMs: number | null;
  accuracy: number | null;
  stopping: boolean;
  onStop: () => void;
}

const GREEN = "#3DDC91";
const AMBER = "#FBBF24";
const VIOLET = "#C4A5FB";

const WAKE_HINT_MS = 7000;

/** Status is read straight off the hook — it is never asserted by this view. */
function statusStyle(status: DriveStatus): { label: string; color: string } {
  switch (status) {
    case "recording":
      return { label: "Recording", color: GREEN };
    case "signal-lost":
      return { label: "GPS signal lost", color: AMBER };
    default:
      return { label: "Finding GPS", color: VIOLET };
  }
}

export function DriveCockpit({
  status,
  distanceMiles,
  elapsedMs,
  lastFixAgoMs,
  accuracy,
  stopping,
  onStop,
}: DriveCockpitProps) {
  const [hintExpired, setHintExpired] = useState(false);
  // Only promise what the platform can actually deliver. This view mounts
  // after a tap, never during SSR, so reading navigator here is safe.
  const [supportsWakeLock] = useState(
    () => typeof navigator !== "undefined" && "wakeLock" in navigator,
  );

  useEffect(() => {
    const timer = setTimeout(() => setHintExpired(true), WAKE_HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  const showWakeHint = supportsWakeLock && !hintExpired;
  const { label, color } = statusStyle(status);
  const lost = status === "signal-lost";

  return (
    <>
      <Stack alignItems="center" spacing={1} sx={{ minHeight: 76, pt: 0.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          aria-live="polite"
          sx={{
            px: 1.75,
            py: 0.75,
            borderRadius: `${radii.pill}px`,
            border: `1px solid ${color}59`,
            bgcolor: `${color}1F`,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 9,
              height: 9,
              borderRadius: `${radii.pill}px`,
              bgcolor: color,
              // Kept: this pulse is the liveness signal, not decoration —
              // it stops the moment the fix goes stale.
              "@keyframes drivePing": {
                "0%, 100%": { opacity: 1, transform: "scale(1)" },
                "50%": { opacity: 0.35, transform: "scale(0.82)" },
              },
              animation: lost ? "none" : "drivePing 1.6s ease-in-out infinite",
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
          <Typography
            variant="overline"
            sx={{ color, fontWeight: 800, letterSpacing: "0.12em", lineHeight: 1.2 }}
          >
            {label}
          </Typography>
        </Stack>

        {lost && lastFixAgoMs != null ? (
          <Typography variant="caption" sx={{ color: AMBER, opacity: 0.85 }}>
            Last fix {formatAgo(lastFixAgoMs)} ago · still trying
          </Typography>
        ) : showWakeHint ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: STAGE_FAINT }}>
            <ScreenLockPortraitRounded sx={{ fontSize: 14 }} />
            <Typography variant="caption">Screen will stay awake</Typography>
          </Stack>
        ) : null}
      </Stack>

      <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Typography
          component="div"
          aria-label={`${formatMiles(distanceMiles)} miles`}
          sx={{
            // vh-aware so a landscape dash mount shrinks the readout instead
            // of pushing the STOP button off screen.
            fontSize: "clamp(3.5rem, min(27vw, 22vh), 8rem)",
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: "-0.045em",
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum" 1',
            color: STAGE_FG,
          }}
        >
          {formatMiles(distanceMiles)}
        </Typography>
        <Typography
          variant="overline"
          sx={{ color: STAGE_DIM, letterSpacing: "0.28em", pl: "0.28em", mt: 1 }}
        >
          Miles
        </Typography>
        <Typography
          sx={{
            mt: 2.5,
            fontSize: "1.75rem",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum" 1',
            color: STAGE_DIM,
          }}
        >
          {formatElapsed(elapsedMs)}
        </Typography>
      </Stack>

      <Stack spacing={1.75} alignItems="center">
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: STAGE_FAINT }}>
          <GpsFixedRounded sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {accuracy != null ? `GPS accuracy ±${Math.round(accuracy)} m` : "Waiting for accuracy"}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          sx={{
            color: STAGE_FAINT,
            px: 1.5,
            py: 0.5,
            borderRadius: `${radii.pill}px`,
            bgcolor: STAGE_FILL,
            border: `1px solid ${STAGE_LINE}`,
          }}
        >
          Nothing else to tap — just drive
        </Typography>

        <ButtonBase
          onClick={onStop}
          disabled={stopping}
          aria-label="Stop and save this drive"
          // Solid, not gradient: the recording screen spends its whole brand
          // budget on being legible at a glance. Fixed hex (not palette) so
          // it is identical whichever scheme the app is in — the stage is
          // always near-black.
          sx={{
            width: "100%",
            minHeight: 78,
            borderRadius: `${radii.control}px`,
            gap: 1.25,
            bgcolor: brand.violet,
            color: "#FFFFFF",
            transition: "transform .16s ease, background-color .16s ease",
            "&:active": { transform: "scale(0.985)", bgcolor: "#6D28D9" },
            "&.Mui-disabled": { opacity: 0.6, color: "#FFFFFF" },
          }}
        >
          <StopRounded sx={{ fontSize: 28 }} />
          <Typography
            component="span"
            sx={{ fontSize: "1.375rem", fontWeight: 800, letterSpacing: "0.2em", pl: "0.2em" }}
          >
            {stopping ? "SAVING" : "STOP"}
          </Typography>
        </ButtonBase>
      </Stack>
    </>
  );
}

export default DriveCockpit;
