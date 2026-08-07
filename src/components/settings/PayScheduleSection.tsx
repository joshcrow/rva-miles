"use client";

// Frequency + anchor date. Semimonthly/monthly follow the calendar and
// ignore the anchor (see src/lib/periods.ts); weekly/biweekly cycle off it,
// so that's the only case the anchor field is shown for.
//
// The frequency select is labelled "Pay schedule" because this card no longer
// sits under a header of that name — it lives inside the "Reporting" group,
// where a bare "Frequency" would have no referent.

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import type { PayFrequency, Settings } from "@/types";
import { isDateKeyString, periodPreviewLabel } from "./settingsLogic";
import { useSyncedField } from "./useSyncedField";

export interface PayScheduleSectionProps {
  settings: Settings;
  today: string;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
}

type FrequencyChoice = PayFrequency | "none";

const FREQUENCY_OPTIONS: Array<{ value: FrequencyChoice; label: string }> = [
  { value: "none", label: "Not tracked" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

const NEEDS_ANCHOR: ReadonlySet<FrequencyChoice> = new Set(["weekly", "biweekly"]);

export function PayScheduleSection({ settings, today, onPatch }: PayScheduleSectionProps) {
  const frequency: FrequencyChoice = settings.paySchedule?.frequency ?? "none";
  const [anchor, setAnchor] = useSyncedField(settings.paySchedule?.anchorKey ?? today);

  function commitFrequency(next: FrequencyChoice) {
    if (next === "none") {
      void onPatch({ paySchedule: undefined });
      return;
    }
    const anchorKey = settings.paySchedule?.anchorKey ?? today;
    setAnchor(anchorKey);
    void onPatch({ paySchedule: { frequency: next, anchorKey } });
  }

  function commitAnchor(next: string) {
    if (!isDateKeyString(next)) return;
    setAnchor(next);
    if (frequency === "none") return;
    void onPatch({ paySchedule: { frequency, anchorKey: next } });
  }

  const preview = periodPreviewLabel(settings.paySchedule, today);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <TextField
            select
            label="Pay schedule"
            value={frequency}
            onChange={(e) => commitFrequency(e.target.value as FrequencyChoice)}
            fullWidth
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {NEEDS_ANCHOR.has(frequency) ? (
            <TextField
              label="First day of any pay period"
              type="date"
              value={anchor}
              onChange={(e) => commitAnchor(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          ) : null}

          {preview ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
              <EventRepeatRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography variant="body2" className="tnum">
                Current period: <strong>{preview}</strong>
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Set a schedule to see the current period here and on the Report tab.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default PayScheduleSection;
