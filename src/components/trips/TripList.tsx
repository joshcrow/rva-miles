"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Trip } from "@/types";
import { formatKey } from "@/lib/dates";
import { groupByDay } from "./group";
import { fmtMiles, pluralTrips } from "./format";
import TripRow from "./TripRow";

export interface TripListProps {
  trips: Trip[];
  today: string;
  emptyState: ReactNode;
  onEditTrip: (trip: Trip) => void;
  onQuickActions: (trip: Trip) => void;
  onRepeat: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
}

function dayHeaderLabel(dateKey: string, today: string): string {
  if (dateKey === today) return "Today";
  return `${formatKey(dateKey, "weekday").slice(0, 3)}, ${formatKey(dateKey, "short")}`;
}

export function TripList({
  trips,
  today,
  emptyState,
  onEditTrip,
  onQuickActions,
  onRepeat,
  onDelete,
}: TripListProps) {
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  if (trips.length === 0) return <>{emptyState}</>;

  const groups = groupByDay(trips);

  return (
    <Stack spacing={2.5}>
      {groups.map((group) => (
        <Box key={group.dateKey} component="section">
          <Typography
            variant="overline"
            component="h2"
            color="text.secondary"
            sx={{ display: "block", mb: 1, px: 0.25 }}
          >
            {dayHeaderLabel(group.dateKey, today)} · {pluralTrips(group.totals.count)} ·{" "}
            <Box component="span" className="tnum">
              {fmtMiles(group.totals.miles)} mi
            </Box>
          </Typography>

          {/* The row owns its own radius (it clips the swipe actions behind
              it) — only the hairline is added here. */}
          <Stack
            spacing={0.75}
            sx={{ "& > div": { border: "1px solid", borderColor: "divider" } }}
          >
            {group.trips.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                revealed={openRowId === trip.id}
                onRevealChange={(open) => setOpenRowId(open ? trip.id : null)}
                onTap={() => onEditTrip(trip)}
                onLongPress={() => onQuickActions(trip)}
                onRepeat={() => onRepeat(trip)}
                onDelete={() => onDelete(trip)}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export default TripList;
