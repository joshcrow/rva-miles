"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DirectionsCarRounded from "@mui/icons-material/DirectionsCarRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import ScreenLockPortraitRounded from "@mui/icons-material/ScreenLockPortraitRounded";
import { brand, radii } from "@/theme/theme";
import { STAGE_BG, STAGE_DIM, STAGE_FAINT, STAGE_FG, STAGE_FILL, STAGE_LINE } from "./DriveStage";
import { formatMiles } from "./driveFormat";

interface StartPanelProps {
  vehicle?: string;
  /** True between the START tap and the first real fix — start() is still in flight. */
  acquiring: boolean;
  /** A drive left over from a previous session that hasn't been resolved yet. */
  unfinishedMiles: number | null;
  onStart: () => void;
  onReviewUnfinished: () => void;
}

/** Shrinks on short viewports so the note below always stays on screen. */
const DISC_SIZE = "min(244px, 44vh)";

export function StartPanel({
  vehicle,
  acquiring,
  unfinishedMiles,
  onStart,
  onReviewUnfinished,
}: StartPanelProps) {
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 44 }}>
        <IconButton
          component={Link}
          href="/"
          aria-label="Back to home"
          sx={{ color: STAGE_DIM, ml: -1 }}
        >
          <ArrowBackRounded />
        </IconButton>
        <Typography variant="overline" sx={{ color: STAGE_FAINT }}>
          Live drive
        </Typography>
        <Box sx={{ width: 44 }} />
      </Stack>

      {unfinishedMiles != null ? (
        <ButtonBase
          onClick={onReviewUnfinished}
          sx={{
            mt: 1.5,
            px: 2,
            py: 1.25,
            width: "100%",
            borderRadius: `${radii.card}px`,
            justifyContent: "flex-start",
            gap: 1.25,
            textAlign: "left",
            color: "#FBBF24",
            bgcolor: "rgba(251,191,36,0.10)",
            border: "1px solid rgba(251,191,36,0.32)",
          }}
        >
          <HistoryRounded fontSize="small" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              Unfinished drive — {formatMiles(unfinishedMiles)} mi
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(251,191,36,0.80)" }}>
              Tap to resume, save, or discard it
            </Typography>
          </Box>
        </ButtonBase>
      ) : null}

      <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3.5 }}>
        <Box sx={{ position: "relative", display: "grid", placeItems: "center" }}>
          {/* The app's one sanctioned glow: a gradient ring with a single
              restrained bloom under it. No breathing halo, no inner wash —
              the ring reads as a physical button, not a light source. */}
          <ButtonBase
            onClick={onStart}
            disabled={acquiring}
            aria-label={acquiring ? "Finding GPS" : "Start tracking this drive"}
            sx={{
              position: "relative",
              width: DISC_SIZE,
              height: DISC_SIZE,
              p: "5px",
              borderRadius: `${radii.pill}px`,
              background: brand.gradient,
              boxShadow: "0 10px 28px rgba(124,58,237,0.22)",
              transition: "transform .16s ease",
              "&:active": { transform: "scale(0.97)" },
              "&.Mui-disabled": { opacity: 1 },
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: `${radii.pill}px`,
                bgcolor: STAGE_BG,
                display: "grid",
                placeItems: "center",
              }}
            >
              {acquiring ? (
                <Stack alignItems="center" spacing={1.5}>
                  <CircularProgress size={30} thickness={4} sx={{ color: "#E879F9" }} />
                  {/* The spinner above already says "working" — the text
                      does not need to pulse as well. */}
                  <Typography
                    sx={{ fontSize: "1.0625rem", fontWeight: 700, color: STAGE_FG }}
                  >
                    Finding GPS…
                  </Typography>
                </Stack>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    fontSize: "2.375rem",
                    fontWeight: 800,
                    letterSpacing: "0.16em",
                    pl: "0.16em",
                    color: STAGE_FG,
                  }}
                >
                  START
                </Typography>
              )}
            </Box>
          </ButtonBase>
        </Box>

        <Stack alignItems="center" spacing={0.5}>
          {vehicle ? (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: STAGE_DIM }}>
              <DirectionsCarRounded sx={{ fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {vehicle}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: STAGE_FAINT }}>
              No vehicle set ·{" "}
              <Box
                component={Link}
                href="/settings"
                sx={{ color: "#C4A5FB", textDecoration: "none", fontWeight: 600 }}
              >
                add one
              </Box>
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: STAGE_FAINT }}>
            {acquiring ? "Waiting for a trustworthy first fix" : "One tap. Miles counted from here."}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          p: 2,
          borderRadius: `${radii.card}px`,
          bgcolor: STAGE_FILL,
          border: `1px solid ${STAGE_LINE}`,
          alignItems: "flex-start",
        }}
      >
        <ScreenLockPortraitRounded sx={{ fontSize: 20, color: STAGE_FAINT, mt: "1px" }} />
        <Typography variant="caption" sx={{ color: STAGE_DIM, lineHeight: 1.5 }}>
          Keep this screen on while driving — iOS pauses GPS in the background.
        </Typography>
      </Stack>
    </>
  );
}

export default StartPanel;
