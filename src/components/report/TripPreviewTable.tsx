"use client";

// The evidence, one tap below the send button.
//
// This used to sit between the summary and the CTA, so a fifteen-trip period
// pushed "Share report" off the fold — the screen buried its own verb under a
// wall of rows. Now it is a single "Review 13 trips" disclosure at the bottom:
// the number and the send button are always above it, whatever the period
// holds. A short period opens expanded, because five rows are a glance rather
// than a wall.
//
// Expanded, it is still exactly what will be sent, in the exporters' own
// order — the report is reviewed here or nowhere. A real <table> at 480px
// would need horizontal scrolling, so this is a four-column grid: date,
// from → to, miles, amount.

import { useId, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { Trip } from "@/types";
import { viaLabel } from "@/lib/legs";
import { tripAmount } from "@/lib/money";
import { radii } from "@/theme/theme";
import {
  computeTotals,
  fmtMiles,
  fmtMoney,
  formatKeyShort,
  placeLabelShort,
  reviewLabel,
} from "./reportData";

/** At or below this many rows the list is a glance, so it opens on its own. */
export const AUTO_EXPAND_MAX = 5;

const GRID = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr) 52px 68px",
  columnGap: 1,
  alignItems: "center",
} as const;

/** Miles spelled out: this is read aloud, not printed. */
function editLabel(t: Trip): string {
  return `Edit ${formatKeyShort(t.dateKey)} trip to ${placeLabelShort(t.to)}, ${fmtMiles(
    t.distanceMiles,
  )} miles`;
}

export interface TripPreviewTableProps {
  trips: Trip[];
  /**
   * Tapping a row opens the edit sheet. Omit and the rows stay inert — the
   * expanded table is a review surface first, editing is the deliberate
   * second step.
   */
  onEditTrip?: (trip: Trip) => void;
}

export function TripPreviewTable({ trips, onEditTrip }: TripPreviewTableProps) {
  // Seeded once per mount. The caller keys this component by pay period, so
  // switching periods re-decides whether the list opens on its own; toggling
  // it by hand within one period sticks.
  const [expanded, setExpanded] = useState(trips.length <= AUTO_EXPAND_MAX);
  const contentId = useId();
  const totals = computeTotals(trips);

  return (
    <Box
      sx={{
        borderRadius: `${radii.card}px`,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <ButtonBase
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={contentId}
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.5,
          minHeight: 52,
          textAlign: "left",
          // Deliberately square: a full-bleed row inside a clipped container.
          borderRadius: 0,
        }}
      >
        <Typography variant="subtitle2">{reviewLabel(trips.length)}</Typography>
        <ExpandMoreRoundedIcon
          sx={{
            color: "text.secondary",
            flexShrink: 0,
            transition: "transform 160ms ease",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        />
      </ButtonBase>

      <Collapse in={expanded}>
        <Box id={contentId} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          {onEditTrip ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: 2, pt: 1.25 }}
            >
              Tap a trip to edit it before you send.
            </Typography>
          ) : null}

          <Box
            sx={{
              ...GRID,
              px: 2,
              py: 1,
              mt: onEditTrip ? 0.75 : 0,
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
              Miles
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ textAlign: "right" }}>
              Amount
            </Typography>
          </Box>

          {trips.map((t, i) => {
            const cells = (
              <>
                <Typography variant="caption" color="text.secondary" className="tnum" noWrap>
                  {formatKeyShort(t.dateKey)}
                </Typography>

                {/* Wraps to two lines rather than truncating both endpoints —
                    the names are the review surface, "O… → Chesterf…" is
                    unreviewable. */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    minWidth: 0,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {placeLabelShort(t.from)}
                  <Box component="span" sx={{ color: "text.disabled" }}>
                    {" → "}
                  </Box>
                  {placeLabelShort(t.to)}
                  {/* The preview must say exactly what the export says, and
                      the exporters print routeText — "… (via Crozet)". */}
                  {viaLabel(t.legs) ? (
                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                      {` (via ${viaLabel(t.legs)})`}
                    </Box>
                  ) : null}
                </Typography>

                <Typography variant="body2" className="tnum" sx={{ textAlign: "right" }}>
                  {fmtMiles(t.distanceMiles)}
                </Typography>

                <Typography
                  variant="body2"
                  className="tnum"
                  sx={{ textAlign: "right", fontWeight: 700, color: "success.main" }}
                >
                  {fmtMoney(tripAmount(t))}
                </Typography>
              </>
            );

            const rowSx = {
              ...GRID,
              width: "100%",
              px: 2,
              py: 1.125,
              textAlign: "left",
              borderTop: i === 0 ? "none" : "1px solid",
              borderColor: "divider",
            } as const;

            return onEditTrip ? (
              <ButtonBase
                key={t.id}
                onClick={() => onEditTrip(t)}
                aria-label={editLabel(t)}
                sx={{ ...rowSx, borderRadius: 0 }}
              >
                {cells}
              </ButtonBase>
            ) : (
              <Box key={t.id} sx={rowSx}>
                {cells}
              </Box>
            );
          })}

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
            <Typography variant="subtitle2">Totals</Typography>
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
      </Collapse>
    </Box>
  );
}

export default TripPreviewTable;
