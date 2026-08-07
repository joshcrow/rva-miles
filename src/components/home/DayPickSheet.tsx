"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { addDaysKey, formatKey } from "@/lib/dates";
import Sheet from "./Sheet";

export interface DayPickSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  today: string;
  onPick: (dateKey: string) => void;
}

const QUICK_DAYS = 7;

/** Date choice for logging a trip on a past day. Values are dateKeys throughout
 *  — the native date input speaks 'YYYY-MM-DD', so no Date parsing is needed. */
export function DayPickSheet({ open, onClose, title, subtitle, today, onPick }: DayPickSheetProps) {
  const [custom, setCustom] = useState("");

  // Every exit resets the custom date, so reopening never shows a stale one.
  const close = () => {
    setCustom("");
    onClose();
  };
  const pick = (dateKey: string) => {
    setCustom("");
    onPick(dateKey);
  };

  const days = useMemo(() => {
    if (!today) return [] as Array<{ key: string; label: string }>;
    return Array.from({ length: QUICK_DAYS }, (_, i) => {
      const key = addDaysKey(today, -(i + 1));
      return {
        key,
        label: i === 0 ? "Yesterday" : `${formatKey(key, "weekday").slice(0, 3)}, ${formatKey(key, "short")}`,
      };
    });
  }, [today]);

  return (
    <Sheet open={open} onClose={close} title={title} subtitle={subtitle}>
      <Stack spacing={2.5} sx={{ pb: 1 }}>
        <Box>
          <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Recent days
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip label="Today" onClick={() => pick(today)} variant="outlined" />
            {days.map((d) => (
              <Chip key={d.key} label={d.label} onClick={() => pick(d.key)} variant="outlined" />
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Another date
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              type="date"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { max: today }, inputLabel: { shrink: true } }}
            />
            <Button
              variant="contained"
              disabled={!custom}
              onClick={() => pick(custom)}
              sx={{ flexShrink: 0 }}
            >
              Log trip
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Sheet>
  );
}

export default DayPickSheet;
