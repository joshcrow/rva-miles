"use client";

// Two goal-based groups in the order the work happens: get the report right,
// then keep the ledger safe. Grouping by goal rather than by object means a
// card only has to be found once — you come here to fix a report, not to
// visit "Profile". Below them, Appearance and InstallCoach carry no group of
// their own — "App" never earned its keep as a goal — and a bare version
// stamp closes the screen. Every field still auto-saves (blur for free text,
// immediately for selects and toggles); nothing here needs a Save button, and
// nothing here needs a confirmation dialog.

import { useMemo } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InstallCoach from "@/components/InstallCoach";
import { todayKey } from "@/lib/dates";
import AppearanceSection from "./AppearanceSection";
import DataSection from "./DataSection";
import PayScheduleSection from "./PayScheduleSection";
import ProfileSection from "./ProfileSection";
import RecipientSection from "./RecipientSection";
import SectionLabel from "./SectionLabel";
import SettingsSkeleton from "./SettingsSkeleton";
import SyncSection from "./SyncSection";
import { useSettingsData } from "./useSettingsData";
import VersionFooter from "./VersionFooter";

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
    <Stack spacing={3.5} sx={{ px: 2.5, pt: 2.5, pb: 4 }}>
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

      {/* Everything that has to be right before a report goes out. */}
      <Group title="Your report">
        <ProfileSection settings={data.settings} today={today} onPatch={data.patchSettings} />
        <PayScheduleSection settings={data.settings} today={today} onPatch={data.patchSettings} />
        <RecipientSection settings={data.settings} onPatch={data.patchSettings} />
      </Group>

      {/* Where the ledger lives, and the two ways to move it. The storage fact
          leads the group because it is the reason backup and sync exist. Sync
          only ever appears as a card inside here — this caption stays silent
          on it, so an unconfigured build never names a thing it can't show. */}
      <Group title="Your data" caption="Your trips are stored on this device, not on a server.">
        <DataSection
          settings={data.settings}
          tripCount={data.tripCount}
          routeCount={data.routeCount}
          totalMiles={data.totalMiles}
          onPatch={data.patchSettings}
          onRefresh={data.refresh}
        />
        {data.syncConfigured ? (
          <SyncSection settings={data.settings} onPatch={data.patchSettings} onRefresh={data.refresh} />
        ) : null}
      </Group>

      {/* No group label: "App" never named a goal, just a leftover object.
          InstallCoach renders nothing once installed or dismissed, so it goes
          last — anywhere earlier would leave a gap between neighbors when it
          disappears. */}
      <Stack spacing={1.5}>
        <AppearanceSection settings={data.settings} onPatch={data.patchSettings} />
        <InstallCoach />
      </Stack>

      <VersionFooter />
    </Stack>
  );
}

interface GroupProps {
  title: string;
  /** Optional fact that frames the whole group. Never a restatement of a control inside it. */
  caption?: string;
  children: ReactNode;
}

function Group({ title, caption, children }: GroupProps) {
  return (
    <Box>
      <SectionLabel component="h2">{title}</SectionLabel>
      {caption ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, mb: 1.5 }}>
          {caption}
        </Typography>
      ) : null}
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

export default SettingsScreen;
