"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LocationOffRounded from "@mui/icons-material/LocationOffRounded";
import { brand } from "@/theme/theme";
import { STAGE_DIM, STAGE_FAINT, STAGE_FG, STAGE_FILL, STAGE_LINE } from "./DriveStage";

interface DriveErrorPanelProps {
  message: string;
  onRetry: () => void;
}

const IOS_STEPS = [
  "Settings › Privacy & Security › Location Services — on",
  "Scroll to your browser › Location › While Using the App",
  "Come back here and tap Try again",
];

const OTHER_STEPS = [
  "Open your browser's site settings for this page",
  "Set Location to Allow",
  "Come back here and tap Try again",
];

export function DriveErrorPanel({ message, onRetry }: DriveErrorPanelProps) {
  // Mounts only after a failed START tap — never rendered on the server, so
  // there is no hydration mismatch to guard against here.
  const [isIos] = useState(
    () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent),
  );

  const steps = isIos ? IOS_STEPS : OTHER_STEPS;

  return (
    <Stack sx={{ flex: 1, justifyContent: "center" }} spacing={3}>
      <Stack alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.30)",
          }}
        >
          <LocationOffRounded sx={{ fontSize: 40, color: "#F87171" }} />
        </Box>
        <Typography variant="h3" sx={{ color: STAGE_FG, textAlign: "center" }}>
          GPS didn&apos;t start
        </Typography>
        <Typography variant="body1" sx={{ color: STAGE_DIM, textAlign: "center", maxWidth: 340 }}>
          {message}
        </Typography>
        <Typography variant="caption" sx={{ color: STAGE_FAINT, textAlign: "center" }}>
          No trip was created.
        </Typography>
      </Stack>

      <Stack
        spacing={1.25}
        sx={{ p: 2.5, borderRadius: "16px", bgcolor: STAGE_FILL, border: `1px solid ${STAGE_LINE}` }}
      >
        <Typography variant="overline" sx={{ color: STAGE_FAINT }}>
          {isIos ? "Turn location back on (iOS)" : "Turn location back on"}
        </Typography>
        {steps.map((step, i) => (
          <Stack key={step} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                mt: "1px",
                minWidth: 20,
                height: 20,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(196,165,251,0.16)",
                color: "#C4A5FB",
                fontSize: "0.6875rem",
                fontWeight: 800,
              }}
            >
              {i + 1}
            </Box>
            <Typography variant="body2" sx={{ color: STAGE_DIM, lineHeight: 1.5 }}>
              {step}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Stack spacing={1.5}>
        <Button
          size="large"
          onClick={onRetry}
          sx={{
            minHeight: 56,
            background: brand.gradient,
            color: "#FFFFFF",
            fontSize: "1rem",
            fontWeight: 700,
            boxShadow: "0 12px 32px rgba(124,58,237,0.40)",
          }}
        >
          Try again
        </Button>
        <Button
          component={Link}
          href="/"
          size="large"
          sx={{ minHeight: 52, color: STAGE_DIM, "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}
        >
          Log this trip by hand instead
        </Button>
      </Stack>
    </Stack>
  );
}

export default DriveErrorPanel;
