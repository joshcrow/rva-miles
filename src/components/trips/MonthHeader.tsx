"use client";

// Sticky compact header: month navigator + visible-month totals + search.
// Search spans the whole ledger (not just the visible month) once active —
// the month nav/totals above it stay put so "the visible month" always
// means the same thing regardless of what's currently on screen below.

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { radii } from "@/theme/theme";
import { fmtMiles, fmtMoney, pluralTrips, type Totals } from "./format";
import { isSameMonth, monthLabel } from "./monthNav";

export interface MonthHeaderProps {
  monthKey: string;
  monthTotals: Totals;
  monthLoading: boolean;
  today: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function MonthHeader({
  monthKey,
  monthTotals,
  monthLoading,
  today,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  searchQuery,
  onSearchChange,
}: MonthHeaderProps) {
  const label = monthKey ? monthLabel(monthKey) : "";
  const onCurrent = Boolean(monthKey && today && isSameMonth(monthKey, today));
  const searching = searchQuery.trim().length > 0;

  return (
    <Box
      component="header"
      sx={(t) => ({
        position: "sticky",
        top: "var(--safe-top)",
        zIndex: t.zIndex.appBar - 1,
        px: 2.5,
        pt: 2,
        pb: 1.5,
        bgcolor: "background.default",
        borderBottom: "1px solid",
        borderColor: "divider",
        "@supports (backdrop-filter: blur(12px))": {
          backdropFilter: "blur(16px) saturate(180%)",
          backgroundColor: "rgba(246,245,251,0.86)",
          ...t.applyStyles("dark", { backgroundColor: "rgba(11,10,16,0.82)" }),
        },
      })}
    >
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
        <IconButton aria-label="Previous month" onClick={onPrevMonth} size="small">
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ minWidth: 168, textAlign: "center" }}>
          {label || " "}
        </Typography>
        <IconButton aria-label="Next month" onClick={onNextMonth} size="small">
          <ChevronRightRoundedIcon />
        </IconButton>
      </Stack>

      {!onCurrent ? (
        <Typography
          component="button"
          onClick={onJumpToday}
          variant="caption"
          sx={{
            display: "block",
            mx: "auto",
            mt: -0.25,
            border: 0,
            background: "none",
            color: "primary.main",
            fontWeight: 700,
            cursor: "pointer",
            p: 0.5,
          }}
        >
          Jump to this month
        </Typography>
      ) : null}

      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="center"
        spacing={0.75}
        sx={{ mt: 0.75, opacity: monthLoading ? 0.5 : 1, transition: "opacity 120ms ease" }}
      >
        <Typography variant="body2" color="text.secondary">
          {pluralTrips(monthTotals.count)}
        </Typography>
        {monthTotals.count > 0 ? (
          <>
            <Typography variant="body2" color="text.disabled">
              ·
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }} className="tnum">
              {fmtMiles(monthTotals.miles)} mi
            </Typography>
            <Typography variant="body2" color="text.disabled">
              ·
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }} className="tnum">
              {fmtMoney(monthTotals.money)}
            </Typography>
          </>
        ) : null}
      </Stack>

      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          alignItems: "center",
          // An input, so it matches every TextField in the app.
          borderRadius: `${radii.control}px`,
          border: "1px solid",
          borderColor: searching ? "primary.main" : "divider",
          bgcolor: "background.paper",
          px: 1.5,
          height: 46,
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 20, color: "text.disabled", flexShrink: 0 }} />
        <InputBase
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search from, to, or purpose"
          fullWidth
          inputProps={{ "aria-label": "Search trips" }}
          sx={{ ml: 1, fontSize: "0.9375rem" }}
        />
        {searching ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => onSearchChange("")}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null}
      </Box>

      {searching ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75, textAlign: "center" }}>
          Searching all trips, every month
        </Typography>
      ) : null}
    </Box>
  );
}

export default MonthHeader;
