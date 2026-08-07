"use client";

// Designed empty state: never a blank card. Says exactly which days were
// searched, and offers the two ways out — widen the range, or go log the
// trips that are missing.

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import type { DateRange } from "@/types";
import { brand, radii } from "@/theme/theme";
import { rangeLabelLong } from "./reportData";

export interface EmptyRangeProps {
  range: DateRange;
  /** Omitted when the widest preset is already selected. */
  onWiden?: () => void;
  widenLabel?: string;
}

export function EmptyRange({ range, onWiden, widenLabel }: EmptyRangeProps) {
  return (
    <Box
      // Plain bordered panel — the tinted brand wash it used to have made
      // three gradients fight on one empty state. The CTA below is the only
      // gradient left.
      sx={{
        textAlign: "center",
        px: 2.5,
        py: 5,
        borderRadius: `${radii.card}px`,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: 68,
          height: 68,
          mx: "auto",
          borderRadius: `${radii.card}px`,
          display: "grid",
          placeItems: "center",
          bgcolor: "action.selected",
          color: "primary.main",
        }}
      >
        <EventBusyRoundedIcon sx={{ fontSize: 32 }} />
      </Box>

      <Typography variant="h3" component="h2" sx={{ mt: 2.5 }}>
        Nothing in this range
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mx: "auto", maxWidth: 300 }}>
        {`No trips are logged in ${rangeLabelLong(range)}. Pick a different period, or add the drives you missed.`}
      </Typography>

      <Stack spacing={1.25} sx={{ mt: 3, mx: "auto", maxWidth: 300 }}>
        {onWiden ? (
          <Button
            size="large"
            variant="contained"
            startIcon={<DateRangeRoundedIcon />}
            onClick={onWiden}
            // The one gradient this state is allowed.
            sx={{ backgroundImage: brand.gradient, color: "#fff" }}
          >
            {widenLabel ?? "Widen the range"}
          </Button>
        ) : null}
        <Button
          size="large"
          variant="outlined"
          component={Link}
          href="/"
          startIcon={<AddRoundedIcon />}
        >
          Log a trip
        </Button>
      </Stack>
    </Box>
  );
}

export default EmptyRange;
