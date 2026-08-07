"use client";

// The payoff. A 1.5px gradient hairline is this screen's ONE brand moment,
// carrying the two numbers she is about to send: miles (big) and money
// (success green, always). Everything else is context that has to be right on
// a report handed to accounts payable — period, owner, vehicle — so a missing
// owner/vehicle is called out rather than silently omitted.

import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import type { DateRange } from "@/types";
import { brand, elevation, radii } from "@/theme/theme";
import {
  fmtMiles,
  fmtMoney,
  fmtRate,
  pluralTrips,
  rangeLabelLong,
  type ReportTotals,
} from "./reportData";

export interface SummaryCardProps {
  range: DateRange;
  totals: ReportTotals;
  ownerName?: string;
  vehicle?: string;
  rate: number | null;
}

function MetaItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={0.625} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", color: "text.disabled", "& svg": { fontSize: 15 } }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" noWrap>
        {text}
      </Typography>
    </Stack>
  );
}

export function SummaryCard({ range, totals, ownerName, vehicle, rate }: SummaryCardProps) {
  const missing: string[] = [];
  if (!ownerName) missing.push("your name");
  if (!vehicle) missing.push("a vehicle");

  const edge = 1.5;

  return (
    <Box
      sx={(t) => ({
        borderRadius: `${radii.card}px`,
        p: `${edge}px`,
        backgroundImage: brand.gradient,
        boxShadow: elevation.rest,
        ...t.applyStyles("dark", { boxShadow: "none" }),
      })}
    >
      <Box
        sx={{
          // Concentric with the edge above, or the corners look pinched.
          borderRadius: `${radii.card - edge}px`,
          bgcolor: "background.paper",
          px: 2.5,
          py: 2.25,
        }}
      >
        <Typography variant="overline" component="p" sx={{ color: "primary.main" }}>
          {rangeLabelLong(range)}
        </Typography>

        <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.25 }}>
          <Typography variant="h1" component="p" className="tnum" sx={{ fontSize: "3rem" }}>
            {fmtMiles(totals.miles)}
          </Typography>
          <Typography variant="h5" component="span" color="text.secondary">
            mi
          </Typography>
        </Stack>

        <Typography
          variant="h2"
          component="p"
          className="tnum"
          sx={{ color: "success.main", fontWeight: 800, mt: 0.25, fontSize: "2.125rem" }}
        >
          {fmtMoney(totals.money)}
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          rowGap={0.75}
          columnGap={1.75}
          sx={{
            mt: 1.75,
            pt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <MetaItem
            icon={<ReceiptLongRoundedIcon />}
            text={
              rate === null
                ? pluralTrips(totals.count)
                : `${pluralTrips(totals.count)} · ${fmtRate(rate)}/mi`
            }
          />
          {ownerName ? <MetaItem icon={<PersonRoundedIcon />} text={ownerName} /> : null}
          {vehicle ? <MetaItem icon={<DirectionsCarFilledRoundedIcon />} text={vehicle} /> : null}
        </Stack>

        {missing.length > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>
            Add {missing.join(" and ")} in{" "}
            <Box component={Link} href="/settings" sx={{ color: "primary.main", fontWeight: 700 }}>
              Settings
            </Box>{" "}
            so {missing.length === 1 ? "it appears" : "they appear"} on the report.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

export default SummaryCard;
