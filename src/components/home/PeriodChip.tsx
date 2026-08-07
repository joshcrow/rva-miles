"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import type { DateRange } from "@/types";
import { brand, radii } from "@/theme/theme";
import { fmtMiles, fmtMoney, rangeLabel, type Totals } from "./format";
import { restingSurface } from "./surfaces";

export interface PeriodChipProps {
  range: DateRange;
  totals: Totals;
  /** True when the user has a pay schedule; otherwise this is the month view. */
  hasSchedule: boolean;
}

/** Width of the gradient hairline; the inner radius is derived so the two
 *  corners stay concentric if the card token ever moves. */
const EDGE = 1.5;

export function PeriodChip({ range, totals, hasSchedule }: PeriodChipProps) {
  const label = hasSchedule ? "This pay period" : "This month";

  return (
    <ButtonBase
      component={Link}
      href="/report"
      aria-label={`${label}, ${rangeLabel(range)}. ${fmtMiles(totals.miles)} miles, ${fmtMoney(
        totals.money,
      )}. Open report.`}
      sx={(t) => ({
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: `${radii.card}px`,
        // Home's single brand-gradient moment: a 1.5px hairline border.
        p: `${EDGE}px`,
        backgroundImage: brand.gradient,
        ...restingSurface(t),
        transition: "transform 140ms ease",
        "&:active": { transform: "scale(0.985)" },
      })}
    >
      <Box
        sx={{
          borderRadius: `${radii.card - EDGE}px`,
          bgcolor: "background.paper",
          px: 2,
          py: 1.75,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="overline" component="span" sx={{ color: "primary.main", flexShrink: 0 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
            {rangeLabel(range)}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <Typography variant="caption" component="span" sx={{ fontWeight: 700, color: "primary.main" }}>
              Report
            </Typography>
            <ArrowForwardRoundedIcon sx={{ fontSize: 15, color: "primary.main" }} />
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={1.25} sx={{ mt: 0.5 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography variant="h3" component="span" className="tnum">
              {fmtMiles(totals.miles)}
            </Typography>
            <Typography variant="subtitle2" component="span" color="text.secondary">
              mi
            </Typography>
          </Stack>
          <Typography variant="caption" component="span" color="text.disabled">
            ·
          </Typography>
          <Typography
            variant="h5"
            component="span"
            className="tnum"
            sx={{ color: "success.main", fontWeight: 800 }}
          >
            {fmtMoney(totals.money)}
          </Typography>
        </Stack>
      </Box>
    </ButtonBase>
  );
}

export default PeriodChip;
