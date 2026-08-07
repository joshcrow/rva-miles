"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import type { Route } from "@/types";
import Sheet from "./Sheet";
import { placeLabel } from "./format";

export interface EditRouteSheetProps {
  open: boolean;
  route: Route | null;
  onClose: () => void;
  /** Resolves true when the change was persisted. */
  onSave: (next: Route) => Promise<boolean>;
  onArchive: (route: Route) => void;
}

interface FormState {
  toName: string;
  fromName: string;
  purpose: string;
  distance: string;
}

function formFor(route: Route | null): FormState {
  return {
    toName: route ? placeLabel(route.to) : "",
    fromName: route ? placeLabel(route.from) : "",
    purpose: route?.defaultPurpose ?? "",
    distance: route ? route.distanceMiles.toFixed(1) : "",
  };
}

export function EditRouteSheet({ open, route, onClose, onSave, onArchive }: EditRouteSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFor(route));
  const [roundTrip, setRoundTrip] = useState(Boolean(route?.defaultRoundTrip));
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Re-seed on the closed -> open transition only, so a route object updated
  // underneath us (after a save) never clobbers in-progress edits. Adjusting
  // state during render is React's recommended alternative to a sync effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(formFor(route));
      setRoundTrip(Boolean(route?.defaultRoundTrip));
      setSaving(false);
    }
  }

  const parsed = Number.parseFloat(form.distance);
  const distanceValid = Number.isFinite(parsed) && parsed > 0;
  const canSave = Boolean(route) && distanceValid && form.toName.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave || !route) return;
    setSaving(true);
    const next: Route = {
      ...route,
      from: { ...route.from, name: form.fromName.trim() || undefined },
      to: { ...route.to, name: form.toName.trim() },
      distanceMiles: parsed,
      defaultPurpose: form.purpose.trim() || undefined,
      defaultRoundTrip: roundTrip,
      updatedAt: Date.now(),
    };
    const ok = await onSave(next);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit route"
      subtitle="Applies to future logs — trips already logged keep their numbers"
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!canSave} onClick={() => void save()}>
          {saving ? "Saving…" : "Save route"}
        </Button>
      }
    >
      <Stack spacing={2} sx={{ pb: 1 }}>
        <TextField
          label="Destination name"
          value={form.toName}
          onChange={(e) => setForm((f) => ({ ...f, toName: e.target.value }))}
          fullWidth
        />
        <TextField
          label="Starting point name"
          value={form.fromName}
          onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
          fullWidth
        />
        <TextField
          label="Default purpose"
          placeholder="Client visit"
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          fullWidth
        />
        <TextField
          label="One-way distance"
          value={form.distance}
          onChange={(e) =>
            setForm((f) => ({ ...f, distance: e.target.value.replace(/[^0-9.]/g, "") }))
          }
          error={form.distance.length > 0 && !distanceValid}
          helperText={
            form.distance.length > 0 && !distanceValid ? "Enter a distance greater than 0" : " "
          }
          fullWidth
          slotProps={{
            htmlInput: { inputMode: "decimal" },
            input: { endAdornment: <InputAdornment position="end">mi</InputAdornment> },
          }}
        />

        <FormControlLabel
          control={<Switch checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />}
          label={
            <Stack>
              <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                Round trip by default
              </Typography>
              <Typography variant="caption" component="span" color="text.secondary">
                {distanceValid
                  ? `One tap logs ${(parsed * 2).toFixed(1)} mi`
                  : "One tap logs double the distance"}
              </Typography>
            </Stack>
          }
          sx={{ ml: 0, mr: 0, justifyContent: "space-between", flexDirection: "row-reverse" }}
        />

        <Button
          color="error"
          startIcon={<Inventory2RoundedIcon />}
          disabled={!route}
          onClick={() => route && onArchive(route)}
          sx={{ alignSelf: "flex-start" }}
        >
          Archive this tile
        </Button>
      </Stack>
    </Sheet>
  );
}

export default EditRouteSheet;
