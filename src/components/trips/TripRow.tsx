"use client";

// A single ledger row. Three ways in, one destination for "more":
//  - tap            -> edit sheet
//  - swipe left      -> reveals Repeat/Delete underneath (snaps open/closed)
//  - long-press      -> same two actions via a bottom sheet (no drag required)
// Only one row can be swipe-open at a time (managed by the parent list via
// `revealed`/`onRevealChange`) so the ledger never ends up with several rows
// left ajar.

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowRightAltRoundedIcon from "@mui/icons-material/ArrowRightAltRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import SatelliteAltRoundedIcon from "@mui/icons-material/SatelliteAltRounded";
import type { Trip } from "@/types";
import { fmtMiles, fmtMoney, placeLabel } from "./format";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;
const REVEAL_WIDTH = 152;
const OPEN_SNAP_RATIO = 0.4;

export interface TripRowProps {
  trip: Trip;
  revealed: boolean;
  onRevealChange: (open: boolean) => void;
  onTap: () => void;
  onLongPress: () => void;
  onRepeat: () => void;
  onDelete: () => void;
}

function SourceChip({ source }: { source: Trip["source"] }) {
  if (source === "gps") {
    return (
      <Chip
        size="small"
        icon={<SatelliteAltRoundedIcon sx={{ fontSize: "14px !important" }} />}
        label="GPS"
        variant="outlined"
        sx={{ height: 20, fontSize: "0.6875rem", "& .MuiChip-label": { px: 0.75 } }}
      />
    );
  }
  if (source === "migrated") {
    return (
      <Chip
        size="small"
        icon={<HistoryRoundedIcon sx={{ fontSize: "14px !important" }} />}
        label="Imported"
        variant="outlined"
        sx={{ height: 20, fontSize: "0.6875rem", "& .MuiChip-label": { px: 0.75 } }}
      />
    );
  }
  return null;
}

export function TripRow({ trip, revealed, onRevealChange, onTap, onLongPress, onRepeat, onDelete }: TripRowProps) {
  const [offset, setOffset] = useState(revealed ? -REVEAL_WIDTH : 0);
  // `dragging.current` drives synchronous gesture logic inside event
  // handlers; `isDragging` mirrors it purely so the transform's CSS
  // transition (read during render) never reads a ref directly.
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const start = useRef<{ x: number; y: number; offset: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pointerId = useRef<number | null>(null);

  // Follow the parent's exclusivity decision when we're not actively
  // dragging — React's documented "adjust state during render" pattern
  // (not an effect) so it can't cascade, and reads only the render-safe
  // `isDragging` state rather than the ref.
  const [revealedSnapshot, setRevealedSnapshot] = useState(revealed);
  if (revealed !== revealedSnapshot) {
    setRevealedSnapshot(revealed);
    if (!isDragging) setOffset(revealed ? -REVEAL_WIDTH : 0);
  }

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const settle = useCallback(
    (finalOffset: number) => {
      const open = finalOffset < -REVEAL_WIDTH * OPEN_SNAP_RATIO;
      setOffset(open ? -REVEAL_WIDTH : 0);
      onRevealChange(open);
    },
    [onRevealChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      longPressFired.current = false;
      pointerId.current = e.pointerId;
      start.current = { x: e.clientX, y: e.clientY, offset: revealed ? -REVEAL_WIDTH : 0 };
      dragging.current = false;
      cancelLongPress();
      longPressTimer.current = window.setTimeout(() => {
        longPressTimer.current = null;
        longPressFired.current = true;
        navigator.vibrate?.(12);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [cancelLongPress, onLongPress, revealed],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;

      if (!dragging.current) {
        if (Math.abs(dx) > MOVE_CANCEL_PX && Math.abs(dx) > Math.abs(dy)) {
          dragging.current = true;
          setIsDragging(true);
          cancelLongPress();
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } else if (Math.abs(dy) > MOVE_CANCEL_PX) {
          // Vertical scroll intent — bail out of the gesture entirely.
          cancelLongPress();
          start.current = null;
          return;
        } else {
          return;
        }
      }

      const next = Math.min(0, Math.max(-REVEAL_WIDTH, s.offset + dx));
      setOffset(next);
    },
    [cancelLongPress],
  );

  const endGesture = useCallback(() => {
    cancelLongPress();
    if (dragging.current) {
      dragging.current = false;
      setIsDragging(false);
      settle(offset);
    }
    start.current = null;
  }, [cancelLongPress, offset, settle]);

  const handleClick = useCallback(() => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (dragging.current) return; // pointerup already handled the drag
    if (revealed) {
      onRevealChange(false);
      return;
    }
    onTap();
  }, [onRevealChange, onTap, revealed]);

  return (
    <Box sx={{ position: "relative", borderRadius: 3, overflow: "hidden" }}>
      <Stack
        direction="row"
        sx={{ position: "absolute", inset: 0, alignItems: "stretch" }}
        aria-hidden={!revealed}
      >
        <Box
          component="button"
          onClick={() => {
            onRepeat();
            onRevealChange(false);
          }}
          aria-label={`Repeat ${placeLabel(trip.to)} trip today`}
          sx={{
            flex: `0 0 ${REVEAL_WIDTH / 2}px`,
            border: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.25,
            bgcolor: "primary.main",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <RepeatRoundedIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "inherit" }}>
            Repeat
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={() => {
            onDelete();
            onRevealChange(false);
          }}
          aria-label={`Delete ${placeLabel(trip.to)} trip`}
          sx={{
            flex: `0 0 ${REVEAL_WIDTH / 2}px`,
            border: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.25,
            bgcolor: "error.main",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <DeleteRoundedIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "inherit" }}>
            Delete
          </Typography>
        </Box>
      </Stack>

      <Box
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTap();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.75,
          py: 1.375,
          bgcolor: "background.paper",
          touchAction: "pan-y",
          userSelect: "none",
          WebkitTouchCallout: "none",
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 200ms cubic-bezier(0.2,0.8,0.2,1)",
          cursor: "pointer",
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 0.25 }}>
            <Stack direction="row" spacing={0.35} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {placeLabel(trip.from)}
              </Typography>
              <ArrowRightAltRoundedIcon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {placeLabel(trip.to)}
              </Typography>
            </Stack>
            <SourceChip source={trip.source} />
          </Stack>
          {trip.purpose ? (
            <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ mt: 0.125 }}>
              {trip.purpose}
            </Typography>
          ) : null}
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
      </Box>
    </Box>
  );
}

export default TripRow;
