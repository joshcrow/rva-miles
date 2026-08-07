"use client";

// Name, vehicle, and mileage rate. The rate is a *snapshot* — changing it
// here only affects trips logged from now on (each Trip carries its own
// ratePerMile), so past reports never silently reprice themselves.

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import type { Settings } from "@/types";
import { defaultRateFor } from "@/lib/rates";
import { parseRateInput } from "./settingsLogic";
import { useSyncedField } from "./useSyncedField";

export interface ProfileSectionProps {
  settings: Settings;
  today: string;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
}

export function ProfileSection({ settings, today, onPatch }: ProfileSectionProps) {
  const [ownerName, setOwnerName] = useSyncedField(settings.ownerName ?? "");
  const [vehicle, setVehicle] = useSyncedField(settings.vehicle ?? "");
  const [rateText, setRateText] = useSyncedField(String(settings.ratePerMile));

  const irsRate = defaultRateFor(today);
  const parsedRate = parseRateInput(rateText);
  const rateInvalid = rateText.trim().length > 0 && parsedRate === null;

  function commitOwnerName() {
    const trimmed = ownerName.trim();
    if (trimmed !== (settings.ownerName ?? "")) void onPatch({ ownerName: trimmed || undefined });
  }

  function commitVehicle() {
    const trimmed = vehicle.trim();
    if (trimmed !== (settings.vehicle ?? "")) void onPatch({ vehicle: trimmed || undefined });
  }

  function commitRate() {
    if (parsedRate === null) {
      setRateText(String(settings.ratePerMile));
      return;
    }
    if (parsedRate !== settings.ratePerMile) void onPatch({ ratePerMile: parsedRate });
  }

  function useIrsRate() {
    setRateText(String(irsRate));
    if (irsRate !== settings.ratePerMile) void onPatch({ ratePerMile: irsRate });
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Your name"
            placeholder="Dana Smith"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            onBlur={commitOwnerName}
            fullWidth
            helperText="Shown on reports"
          />

          <TextField
            label="Vehicle"
            placeholder="2014 Subaru Outback"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            onBlur={commitVehicle}
            fullWidth
          />

          <Stack spacing={1}>
            <TextField
              label="Mileage rate"
              value={rateText}
              onChange={(e) => setRateText(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={commitRate}
              error={rateInvalid}
              fullWidth
              slotProps={{
                htmlInput: { inputMode: "decimal" },
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/mi</InputAdornment>,
                },
              }}
              helperText={
                rateInvalid
                  ? "Enter a rate greater than 0"
                  : `IRS ${today.slice(0, 4)} business rate: $${irsRate.toFixed(2)}`
              }
            />
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                label="Use current IRS rate"
                onClick={useIrsRate}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                Rate changes only affect new trips
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ProfileSection;
