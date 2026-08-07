"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import type { ActiveDrive } from "@/types";
import { radii } from "@/theme/theme";
import { formatClock, formatMiles } from "./driveFormat";

interface ResumeSheetProps {
  open: boolean;
  drive: ActiveDrive | null;
  busy: boolean;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

/**
 * A drive found still open on mount. v1 silently zeroed these; the only
 * acceptable behaviour is to hand the decision to the driver — and to never
 * offer "save" for a drive that recorded no movement (no phantom trips).
 */
export function ResumeSheet({
  open,
  drive,
  busy,
  onResume,
  onFinish,
  onDiscard,
  onClose,
}: ResumeSheetProps) {
  const miles = drive?.distanceMiles ?? 0;
  const hasMovement = Boolean(drive && drive.points.length > 1 && miles > 0);

  return (
    <Drawer anchor="bottom" open={open && drive != null} onClose={onClose}>
      <Box sx={{ px: 3, pt: 1.5, pb: 3 }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 4,
            borderRadius: `${radii.pill}px`,
            bgcolor: "divider",
            mx: "auto",
            mb: 2.5,
          }}
        />

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: `${radii.control}px`,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.selected",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <HistoryRounded />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4">Trip in progress</Typography>
            <Typography variant="body2" color="text.secondary">
              {drive ? `from ${formatClock(drive.startedAt)}` : ""}
              {hasMovement ? ` — ${formatMiles(miles)} mi so far` : " — no movement recorded yet"}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.25}>
          <Button
            size="large"
            variant="contained"
            onClick={onResume}
            disabled={busy}
            sx={{ minHeight: 56, fontSize: "1rem", fontWeight: 700 }}
          >
            Resume tracking
          </Button>

          {hasMovement ? (
            <Button size="large" variant="outlined" onClick={onFinish} disabled={busy} sx={{ minHeight: 54 }}>
              Finish &amp; save {formatMiles(miles)} mi
            </Button>
          ) : null}

          <Button
            size="large"
            color="inherit"
            onClick={onDiscard}
            disabled={busy}
            sx={{ minHeight: 50, color: "text.secondary" }}
          >
            Discard it
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 2 }}
        >
          {drive?.lastFixAt
            ? `Saved as you drove — last fix ${formatClock(drive.lastFixAt)}. Discarding can be undone.`
            : "Saved as you drove. Discarding can be undone."}
        </Typography>
      </Box>
    </Drawer>
  );
}

export default ResumeSheet;
