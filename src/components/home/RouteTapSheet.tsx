"use client";

// The one-time lesson for this screen's core mechanic: a route is a button,
// and tapping it logs a trip. Shown before the very first route tap ever and
// never again (settings.routeTapEducatedAt) — after that a tap logs instantly,
// which is the point of the screen. A tap that logs with no warning the first
// time is indistinguishable from a bug, so the lesson is paid for once.

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import type { Route } from "@/types";
import { radii } from "@/theme/theme";
import Sheet from "./Sheet";
import { fmtMiles, placeLabel } from "./format";

export interface RouteTapSheetProps {
  open: boolean;
  route: Route | null;
  /** Dismissed without answering — the lesson is shown again on the next tap. */
  onClose: () => void;
  /** Primary: remember the lesson, then log the trip that was tapped for. */
  onLog: () => void;
  /** Secondary: remember the lesson, log nothing. */
  onCancel: () => void;
}

function Fact({ icon, label, hint }: { icon: ReactNode; label: string; hint: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: `${radii.control}px`,
          display: "grid",
          placeItems: "center",
          bgcolor: "action.selected",
          color: "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" component="p">
          {label}
        </Typography>
        <Typography variant="caption" component="p" color="text.secondary">
          {hint}
        </Typography>
      </Box>
    </Stack>
  );
}

export function RouteTapSheet({ open, route, onClose, onLog, onCancel }: RouteTapSheetProps) {
  // Same figure the tile shows and the trip will carry.
  const miles = route ? (route.defaultRoundTrip ? route.distanceMiles * 2 : route.distanceMiles) : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="One tap logs a trip for today"
      subtitle={route ? `${placeLabel(route.to)} · ${fmtMiles(miles)} mi` : undefined}
      footer={
        <Stack spacing={0.75}>
          <Button fullWidth size="large" variant="contained" onClick={onLog}>
            {`Log ${fmtMiles(miles)} mi`}
          </Button>
          <Button fullWidth variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </Stack>
      }
    >
      <Stack spacing={1.75} sx={{ pb: 1 }}>
        <Fact
          icon={<UndoRoundedIcon fontSize="small" />}
          label="Undo"
          hint="Offered right after, every time"
        />
        <Fact
          icon={<TouchAppRoundedIcon fontSize="small" />}
          label="Press and hold"
          hint="Log for another day, or edit the route"
        />
      </Stack>
    </Sheet>
  );
}

export default RouteTapSheet;
