"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import { brand, radii } from "@/theme/theme";

export type EmptyTripsVariant = "none" | "month" | "search";

export interface EmptyTripsStateProps {
  variant: EmptyTripsVariant;
  /** For 'month': the label of the currently-empty month, e.g. "August 2026". */
  monthLabel?: string;
  /** For 'search': clears the query so the ledger reappears. */
  onClearSearch?: () => void;
}

export function EmptyTripsState({ variant, monthLabel, onClearSearch }: EmptyTripsStateProps) {
  if (variant === "none") {
    return (
      <Box
        // Plain bordered panel + tinted icon tile; the CTA below is this
        // state's single gradient.
        sx={{
          textAlign: "center",
          px: 2,
          py: 5,
          borderRadius: `${radii.card}px`,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            borderRadius: `${radii.card}px`,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.selected",
            color: "primary.main",
          }}
        >
          <ListAltRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography variant="h4" component="h2" sx={{ mt: 2.25 }}>
          No trips yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mx: "auto", maxWidth: 280 }}>
          Log your first drive from Home and it will show up here.
        </Typography>
        <Button
          size="large"
          variant="contained"
          component={Link}
          href="/"
          sx={{ mt: 2.5, background: brand.gradient, color: "#fff" }}
        >
          Go to Home
        </Button>
      </Box>
    );
  }

  if (variant === "search") {
    return (
      <Box sx={{ textAlign: "center", px: 2, py: 5 }}>
        <SearchOffRoundedIcon sx={{ fontSize: 30, color: "text.disabled" }} />
        <Typography variant="subtitle1" sx={{ mt: 1.25 }}>
          No trips match
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Try a different search, or clear it to see the ledger.
        </Typography>
        {onClearSearch ? (
          <Button size="small" onClick={onClearSearch} sx={{ mt: 1.5 }}>
            Clear search
          </Button>
        ) : null}
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center", px: 2, py: 5 }}>
      <EventBusyRoundedIcon sx={{ fontSize: 30, color: "text.disabled" }} />
      <Typography variant="subtitle1" sx={{ mt: 1.25 }}>
        Nothing logged in {monthLabel}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Browse another month, or search across all your trips.
      </Typography>
    </Box>
  );
}

export default EmptyTripsState;
