"use client";

// Full trip edit sheet — every field on the Trip is editable here. Distance
// is its own independent piece of state, reseeded only on the closed->open
// transition; no other field's onChange ever touches it (v1's bug: editing
// purpose silently rewrote distance).

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import type { Settings, Trip } from "@/types";
import { addDaysKey, formatKey } from "@/lib/dates";
import { formatRate } from "@/lib/rates";
import Sheet from "./Sheet";
import { applyTripEdit, formFromTrip, type TripEditForm } from "./tripEdits";

export interface EditTripSheetProps {
  open: boolean;
  trip: Trip | null;
  today: string;
  settings: Settings;
  onClose: () => void;
  /** Resolves true when the change was persisted. */
  onSave: (next: Trip) => Promise<boolean>;
  onDelete: (trip: Trip) => void;
}

function fmtRate(n: number): string {
  return `${formatRate(n)}/mi`;
}

export function EditTripSheet({ open, trip, today, settings, onClose, onSave, onDelete }: EditTripSheetProps) {
  const [form, setForm] = useState<TripEditForm | null>(() => (trip ? formFromTrip(trip) : null));
  const [saving, setSaving] = useState(false);
  // Reseed only on the closed->open transition (React's documented "adjust
  // state during render" pattern — not an effect, so it can't cascade) so a
  // trip object updated underneath us after a save never clobbers
  // in-progress edits, and distance/purpose fields never get silently
  // rewritten by an unrelated re-render.
  const [openSnapshot, setOpenSnapshot] = useState(open);
  if (open !== openSnapshot) {
    setOpenSnapshot(open);
    if (open && trip) {
      setForm(formFromTrip(trip));
      setSaving(false);
    }
  }

  if (!trip || !form) return null;

  const parsedDistance = Number.parseFloat(form.distance);
  const distanceValid = Number.isFinite(parsedDistance) && parsedDistance > 0;
  const parsedRate = Number.parseFloat(form.rate);
  const rateValid = Number.isFinite(parsedRate) && parsedRate >= 0;
  const canSave = distanceValid && rateValid && form.toName.trim().length > 0 && Boolean(form.dateKey) && !saving;

  const set = <K extends keyof TripEditForm>(key: K, value: TripEditForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const yesterday = today ? addDaysKey(today, -1) : "";

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const next = applyTripEdit(trip, form, Date.now());
    const ok = await onSave(next);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit trip"
      subtitle={formatKey(trip.dateKey, "long")}
      footer={
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!canSave}
          onClick={() => void save()}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <Stack spacing={2.25} sx={{ pb: 1 }}>
        <Box>
          <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Date
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label="Today"
              onClick={() => set("dateKey", today)}
              color={form.dateKey === today ? "primary" : "default"}
              variant={form.dateKey === today ? "filled" : "outlined"}
            />
            <Chip
              label="Yesterday"
              onClick={() => set("dateKey", yesterday)}
              color={form.dateKey === yesterday ? "primary" : "default"}
              variant={form.dateKey === yesterday ? "filled" : "outlined"}
            />
            <TextField
              type="date"
              value={form.dateKey}
              onChange={(e) => set("dateKey", e.target.value || today)}
              size="small"
              sx={{ flex: 1, minWidth: 132 }}
              slotProps={{ htmlInput: { max: today, "aria-label": "Trip date" } }}
            />
          </Stack>
        </Box>

        <TextField
          label="From"
          value={form.fromName}
          onChange={(e) => set("fromName", e.target.value)}
          fullWidth
        />
        <TextField label="To" value={form.toName} onChange={(e) => set("toName", e.target.value)} fullWidth />
        <TextField
          label="Purpose (optional)"
          placeholder="Client visit"
          value={form.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          fullWidth
        />

        <TextField
          label="Miles"
          value={form.distance}
          onChange={(e) => set("distance", e.target.value.replace(/[^0-9.]/g, ""))}
          error={form.distance.length > 0 && !distanceValid}
          helperText={form.distance.length > 0 && !distanceValid ? "Enter a distance greater than 0" : " "}
          fullWidth
          slotProps={{
            htmlInput: { inputMode: "decimal" },
            input: { endAdornment: <InputAdornment position="end">mi</InputAdornment> },
          }}
        />

        <TextField
          label="Rate"
          value={form.rate}
          onChange={(e) => set("rate", e.target.value.replace(/[^0-9.]/g, ""))}
          error={form.rate.length > 0 && !rateValid}
          helperText={
            form.rate.length > 0 && !rateValid
              ? "Enter a rate of 0 or more"
              : `Current default: ${fmtRate(settings.ratePerMile)}`
          }
          fullWidth
          slotProps={{
            htmlInput: { inputMode: "decimal" },
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">/mi</InputAdornment>,
            },
          }}
        />
        {rateValid && parsedRate !== settings.ratePerMile ? (
          <Button
            size="small"
            onClick={() => set("rate", String(settings.ratePerMile))}
            sx={{ alignSelf: "flex-start", mt: -1.5 }}
          >
            Use default rate
          </Button>
        ) : null}

        <TextField
          label="Vehicle (optional)"
          placeholder={settings.vehicle || "e.g. Civic"}
          value={form.vehicle}
          onChange={(e) => set("vehicle", e.target.value)}
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch checked={form.roundTrip} onChange={(e) => set("roundTrip", e.target.checked)} />
          }
          label={
            <Stack>
              <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                Round trip
              </Typography>
              <Typography variant="caption" component="span" color="text.secondary">
                Just a label here — edit Miles above if the distance should change
              </Typography>
            </Stack>
          }
          sx={{ ml: 0, mr: 0, justifyContent: "space-between", flexDirection: "row-reverse" }}
        />

        <Button
          color="error"
          startIcon={<DeleteRoundedIcon />}
          onClick={() => onDelete(trip)}
          sx={{ alignSelf: "flex-start" }}
        >
          Delete trip
        </Button>
      </Stack>
    </Sheet>
  );
}

export default EditTripSheet;
