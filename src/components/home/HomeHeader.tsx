"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatKey } from "@/lib/dates";
import { fmtMiles, pluralTrips, type Totals } from "./format";

export interface HomeHeaderProps {
  today: string;
  todayTotals: Totals;
}

export function HomeHeader({ today, todayTotals }: HomeHeaderProps) {
  return (
    <Box component="header" sx={{ pt: 2.5, pb: 0.5 }}>
      {/* Plain brand colour, not a gradient wordmark: home already spends its
          one brand-gradient moment on the pay-period chip below. */}
      <Typography variant="overline" component="p" sx={{ color: "primary.main" }}>
        RVA Miles
      </Typography>

      <Typography variant="h3" component="h1" sx={{ mt: 0.25 }}>
        {`${formatKey(today, "weekday")}, ${formatKey(today, "short")}`}
      </Typography>

      <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ mt: 0.5 }}>
        {todayTotals.count === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing logged yet today
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              {pluralTrips(todayTotals.count)} today
            </Typography>
            <Typography variant="body2" color="text.disabled">
              ·
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }} className="tnum">
              {fmtMiles(todayTotals.miles)} mi
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default HomeHeader;
