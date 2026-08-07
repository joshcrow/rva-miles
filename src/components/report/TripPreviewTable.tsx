"use client";

// Compact preview of exactly what will be sent, in the exporters' own order.
// A real <table> at 480px would need horizontal scrolling, so this is a
// four-column grid: date, from → to, miles, amount.

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import type { Trip } from "@/types";
import {
  fmtMiles,
  fmtMoney,
  formatKeyShort,
  placeLabelShort,
  roundTo,
  computeTotals,
} from "./reportData";

const COLLAPSED_ROWS = 8;

const GRID = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr) 52px 68px",
  columnGap: 1,
  alignItems: "center",
} as const;

export interface TripPreviewTableProps {
  trips: Trip[];
}

export function TripPreviewTable({ trips }: TripPreviewTableProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, trips.length - COLLAPSED_ROWS);
  const visible = expanded ? trips : trips.slice(0, COLLAPSED_ROWS);
  const totals = computeTotals(trips);

  return (
    <Box
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          ...GRID,
          px: 2,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Date
        </Typography>
        <Typography variant="overline" color="text.secondary">
          Trip
        </Typography>
        <Typography variant="overline" color="text.secondary" sx={{ textAlign: "right" }}>
          mi
        </Typography>
        <Typography variant="overline" color="text.secondary" sx={{ textAlign: "right" }}>
          Amount
        </Typography>
      </Box>

      {visible.map((t, i) => (
        <Box
          key={t.id}
          sx={{
            ...GRID,
            px: 2,
            py: 1.125,
            borderTop: i === 0 ? "none" : "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary" className="tnum" noWrap>
            {formatKeyShort(t.dateKey)}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {placeLabelShort(t.from)}
            </Typography>
            <EastRoundedIcon sx={{ fontSize: 13, color: "text.disabled", flexShrink: 0 }} />
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {placeLabelShort(t.to)}
            </Typography>
          </Stack>

          <Typography variant="body2" className="tnum" sx={{ textAlign: "right" }}>
            {fmtMiles(t.distanceMiles)}
          </Typography>

          <Typography
            variant="body2"
            className="tnum"
            sx={{ textAlign: "right", fontWeight: 700, color: "success.main" }}
          >
            {fmtMoney(roundTo(t.distanceMiles * t.ratePerMile, 2))}
          </Typography>
        </Box>
      ))}

      {hidden > 0 && !expanded ? (
        <Button
          fullWidth
          onClick={() => setExpanded(true)}
          endIcon={<ExpandMoreRoundedIcon />}
          sx={{ borderRadius: 0, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}
        >
          {`Show ${hidden} more`}
        </Button>
      ) : null}

      <Box
        sx={{
          ...GRID,
          px: 2,
          py: 1.25,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Box />
        <Typography variant="subtitle2">Total</Typography>
        <Typography variant="subtitle2" className="tnum" sx={{ textAlign: "right" }}>
          {fmtMiles(totals.miles)}
        </Typography>
        <Typography
          variant="subtitle2"
          className="tnum"
          sx={{ textAlign: "right", color: "success.main", fontWeight: 800 }}
        >
          {fmtMoney(totals.money)}
        </Typography>
      </Box>
    </Box>
  );
}

export default TripPreviewTable;
