"use client";

// The actual light/dark switch lives in MUI's own CssVars mode (persisted by
// InitColorSchemeScript / useColorScheme). `settings.theme` is mirrored here
// purely so the choice is recorded alongside the rest of Settings — nothing
// else in the app reads it.

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useColorScheme } from "@mui/material/styles";
import type { Settings } from "@/types";

export interface AppearanceSectionProps {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
}

type Mode = "system" | "light" | "dark";

const OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceSection({ settings, onPatch }: AppearanceSectionProps) {
  const { mode, setMode } = useColorScheme();

  function choose(next: Mode) {
    setMode(next);
    if (next !== settings.theme) void onPatch({ theme: next });
  }

  return (
    <Card>
      <CardContent>
        <ToggleButtonGroup
          value={mode ?? "system"}
          exclusive
          fullWidth
          onChange={(_, v: Mode | null) => v && choose(v)}
          aria-label="Appearance"
        >
          {OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} aria-label={opt.label}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </CardContent>
    </Card>
  );
}

export default AppearanceSection;
