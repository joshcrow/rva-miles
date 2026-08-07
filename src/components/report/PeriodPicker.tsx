"use client";

// Preset chips + a custom range. The two custom fields are native date inputs,
// whose value IS a 'YYYY-MM-DD' local dateKey — the string goes straight into
// the range with no Date ever constructed, so the "end date dropped" bug class
// has nowhere to live.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { DateRange, PeriodPreset } from "@/types";
import { radii } from "@/theme/theme";
import { CUSTOM_PRESET_LABEL, isDateKey, rangeLabelShort } from "./reportData";

export interface PeriodPickerProps {
  presets: PeriodPreset[];
  activeLabel: string;
  onSelect: (label: string) => void;
  customRange: DateRange;
  onCustomChange: (r: DateRange) => void;
}

export function PeriodPicker({
  presets,
  activeLabel,
  onSelect,
  customRange,
  onCustomChange,
}: PeriodPickerProps) {
  const isCustom = activeLabel === CUSTOM_PRESET_LABEL;
  const inverted = customRange.startKey > customRange.endKey;

  return (
    <Box>
      <Box
        role="group"
        aria-label="Report period"
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          // Bleed to the screen edges so the last chip doesn't look clipped.
          mx: -2.5,
          px: 2.5,
          pb: 0.5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {presets.map((p) => {
          const selected = p.label === activeLabel;
          return (
            <Chip
              key={p.label}
              label={p.label}
              onClick={() => onSelect(p.label)}
              aria-pressed={selected}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              sx={{
                flexShrink: 0,
                px: 0.5,
                fontWeight: 600,
                // Filled-vs-outlined already carries selection; a shadow on
                // one chip in a scrolling row just looked lumpy.
                ...(selected ? null : { borderColor: "divider", color: "text.secondary" }),
              }}
            />
          );
        })}
      </Box>

      {isCustom ? (
        <Stack
          spacing={1.25}
          sx={{
            mt: 1.75,
            p: 2,
            borderRadius: `${radii.card}px`,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Stack direction="row" spacing={1.25}>
            <TextField
              label="From"
              type="date"
              size="small"
              fullWidth
              value={customRange.startKey}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                const v = e.target.value;
                if (isDateKey(v)) onCustomChange({ ...customRange, startKey: v });
              }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              fullWidth
              value={customRange.endKey}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                const v = e.target.value;
                if (isDateKey(v)) onCustomChange({ ...customRange, endKey: v });
              }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {inverted
              ? `Reading that as ${rangeLabelShort({
                  startKey: customRange.endKey,
                  endKey: customRange.startKey,
                })} — both days included.`
              : "Both days are included."}
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}

export default PeriodPicker;
