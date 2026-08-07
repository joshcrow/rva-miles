"use client";

// Grouped, calm settings — not v1's junk drawer. Every field auto-saves
// (blur for free text, immediately for selects/toggles); nothing here needs
// a Save button, and nothing here needs a confirmation dialog.

import { useMemo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InstallCoach from "@/components/InstallCoach";
import { todayKey } from "@/lib/dates";
import AboutSection from "./AboutSection";
import AppearanceSection from "./AppearanceSection";
import DataSection from "./DataSection";
import PayScheduleSection from "./PayScheduleSection";
import ProfileSection from "./ProfileSection";
import RecipientSection from "./RecipientSection";
import SectionLabel from "./SectionLabel";
import SettingsSkeleton from "./SettingsSkeleton";
import SyncSection from "./SyncSection";
import { useSettingsData } from "./useSettingsData";

export function SettingsScreen() {
  const data = useSettingsData();
  const today = useMemo(() => todayKey(), []);

  if (!data.ready) {
    if (data.loadError) {
      return (
        <Stack sx={{ px: 2.5, pt: 6, alignItems: "center", textAlign: "center" }} spacing={2}>
          <WarningAmberRoundedIcon sx={{ fontSize: 44, color: "error.main" }} />
          <Box>
            <Typography variant="h4">Couldn&apos;t open settings</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {data.loadError}
            </Typography>
          </Box>
          <Button size="large" variant="contained" startIcon={<RefreshRoundedIcon />} onClick={() => void data.refresh()}>
            Try again
          </Button>
        </Stack>
      );
    }
    return <SettingsSkeleton />;
  }

  return (
    <Stack spacing={3} sx={{ px: 2.5, pt: 2.5, pb: 4 }}>
      <Box component="header">
        <Typography variant="overline" component="p" sx={{ color: "primary.main" }}>
          RVA Miles
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mt: 0.25 }}>
          Settings
        </Typography>
      </Box>

      {data.loadError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void data.refresh()}>
              Retry
            </Button>
          }
        >
          {data.loadError}
        </Alert>
      ) : null}

      <Box>
        <SectionLabel>Profile</SectionLabel>
        <ProfileSection settings={data.settings} today={today} onPatch={data.patchSettings} />
      </Box>

      <Box>
        <SectionLabel>Pay schedule</SectionLabel>
        <PayScheduleSection settings={data.settings} today={today} onPatch={data.patchSettings} />
      </Box>

      <Box>
        <SectionLabel>Report recipient</SectionLabel>
        <RecipientSection settings={data.settings} onPatch={data.patchSettings} />
      </Box>

      <Box>
        <SectionLabel>Appearance</SectionLabel>
        <AppearanceSection settings={data.settings} onPatch={data.patchSettings} />
      </Box>

      <Box>
        <SectionLabel>Data</SectionLabel>
        <DataSection
          settings={data.settings}
          tripCount={data.tripCount}
          routeCount={data.routeCount}
          storageUsageBytes={data.storageUsageBytes}
          onPatch={data.patchSettings}
          onRefresh={data.refresh}
        />
      </Box>

      {data.syncConfigured ? (
        <Box>
          <SectionLabel>Sync between devices</SectionLabel>
          <SyncSection settings={data.settings} onPatch={data.patchSettings} onRefresh={data.refresh} />
        </Box>
      ) : null}

      <InstallCoach />

      <Box>
        <SectionLabel>About</SectionLabel>
        <AboutSection />
      </Box>
    </Stack>
  );
}

export default SettingsScreen;
