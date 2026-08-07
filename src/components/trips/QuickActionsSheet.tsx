"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import type { Trip } from "@/types";
import { CONTINUE_TRIP_PARAM } from "@/components/home/tripActions";
import { radii } from "@/theme/theme";
import Sheet from "./Sheet";
import { fmtMiles, placeLabel } from "./format";

export interface QuickActionsSheetProps {
  open: boolean;
  trip: Trip | null;
  onClose: () => void;
  onRepeat: () => void;
  onDelete: () => void;
}

function ActionRow({
  icon,
  label,
  hint,
  danger,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  /** Renders the row as a link instead of a button (used to hand off to Home). */
  href?: string;
  onClick?: () => void;
}) {
  const linkProps = href ? ({ component: Link, href } as const) : {};

  return (
    <ButtonBase
      {...linkProps}
      onClick={onClick}
      sx={{
        width: "100%",
        textAlign: "left",
        borderRadius: `${radii.card}px`,
        px: 1.75,
        py: 1.5,
        minHeight: 60,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:active": { bgcolor: "action.selected" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: `${radii.control}px`,
            display: "grid",
            placeItems: "center",
            bgcolor: danger ? "rgba(220,38,38,0.12)" : "action.selected",
            color: danger ? "error.main" : "primary.main",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            component="span"
            sx={{ display: "block", color: danger ? "error.main" : "text.primary" }}
          >
            {label}
          </Typography>
          <Typography variant="caption" component="span" color="text.secondary" sx={{ display: "block" }}>
            {hint}
          </Typography>
        </Box>
      </Stack>
    </ButtonBase>
  );
}

export function QuickActionsSheet({ open, trip, onClose, onRepeat, onDelete }: QuickActionsSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={trip ? placeLabel(trip.to) : "Trip"}
      subtitle={trip ? `From ${placeLabel(trip.from)} · ${fmtMiles(trip.distanceMiles)} mi` : undefined}
    >
      <Stack spacing={1} sx={{ pb: 1 }}>
        <ActionRow
          icon={<RepeatRoundedIcon fontSize="small" />}
          label="Repeat today"
          hint="Log this same trip with today's date"
          onClick={onRepeat}
        />
        {/* Hands the trip to Home, which opens the new-trip sheet with From
            prefilled to this destination and the same date — the answer to
            "drove to Crozet now, carrying on to the work site later". */}
        {trip ? (
          <ActionRow
            icon={<AltRouteRoundedIcon fontSize="small" />}
            label={`Continue from ${placeLabel(trip.to)}`}
            hint="Start a new trip where this one ended"
            href={`/?${CONTINUE_TRIP_PARAM}=${encodeURIComponent(trip.id)}`}
          />
        ) : null}
        <ActionRow
          icon={<DeleteRoundedIcon fontSize="small" />}
          label="Delete"
          hint="Removes it now — you'll get an undo"
          danger
          onClick={onDelete}
        />
      </Stack>
    </Sheet>
  );
}

export default QuickActionsSheet;
