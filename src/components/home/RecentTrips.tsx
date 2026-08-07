"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import type { Trip } from "@/types";
import { formatKey } from "@/lib/dates";
import { fmtMiles, fmtMoney, placeLabel } from "./format";

export function RecentTrips({ trips, today }: { trips: Trip[]; today: string }) {
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
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        {trips.map((trip, i) => (
          <Stack
            key={trip.id}
            direction="row"
            spacing={1.5}
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
                width: 46,
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
              <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {placeLabel(trip.to)}
                </Typography>
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
                {fmtMoney(trip.distanceMiles * trip.ratePerMile)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default RecentTrips;
