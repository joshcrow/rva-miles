"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import type { Trip } from "@/types";
import { formatKey } from "@/lib/dates";
import { viaLabel } from "@/lib/legs";
import { radii } from "@/theme/theme";
import { fmtMiles, fmtMoney, placeLabel, tripAmount } from "./format";
import { restingSurface } from "./surfaces";

export interface RecentTripsProps {
  trips: Trip[];
  today: string;
  /** Opens the new-trip sheet with From prefilled to this trip's destination. */
  onContinue: (trip: Trip) => void;
}

export function RecentTrips({ trips, today, onContinue }: RecentTripsProps) {
  if (trips.length === 0) return null;

  return (
    <Box component="section">
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="overline" component="h2" color="text.secondary">
          Recent
        </Typography>
        <Typography
          component={Link}
          href="/trips"
          variant="caption"
          sx={{ fontWeight: 700, color: "primary.main", textDecoration: "none" }}
        >
          All trips →
        </Typography>
      </Stack>

      <Stack
        sx={(t) => ({
          borderRadius: `${radii.card}px`,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
          ...restingSurface(t),
        })}
      >
        {trips.map((trip, i) => {
          const destination = placeLabel(trip.to);
          const via = viaLabel(trip.legs);

          return (
            <Stack
              key={trip.id}
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                px: 1.75,
                py: 1.5,
                borderTop: i === 0 ? "none" : "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  width: 42,
                  flexShrink: 0,
                  textAlign: "center",
                  color: trip.dateKey === today ? "primary.main" : "text.secondary",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }} component="p">
                  {trip.dateKey === today ? "Today" : formatKey(trip.dateKey, "short")}
                </Typography>
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="baseline"
                  sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 0 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {destination}
                  </Typography>
                  {/* A stop journey reads as one trip "via" its middle stops —
                      the ledger, the report and the export all say the same. */}
                  {via ? (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                      via {via}
                    </Typography>
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <ArrowRightAltRoundedIcon sx={{ fontSize: 13, color: "text.disabled", flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {trip.purpose || placeLabel(trip.from)}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} className="tnum">
                  {fmtMiles(trip.distanceMiles)} mi
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "success.main", fontWeight: 600 }}
                  className="tnum"
                  component="p"
                >
                  {fmtMoney(tripAmount(trip))}
                </Typography>
              </Box>

              {/* The answer to "I drove to Crozet, and I'll go on to the work
                  site later" — a second entry that starts where this one ended. */}
              <IconButton
                aria-label={`Continue from ${destination}`}
                title={`Continue from ${destination}`}
                onClick={() => onContinue(trip)}
                sx={{ width: 38, height: 38, flexShrink: 0, mr: -0.75, color: "text.secondary" }}
              >
                <AltRouteRoundedIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

export default RecentTrips;
