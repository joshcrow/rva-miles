"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InstallMobileRoundedIcon from "@mui/icons-material/InstallMobileRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import { getSettings, saveSettings } from "@/lib/db";
import { uiActions } from "@/stores/ui";
import { brand, radii } from "@/theme/theme";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome fires beforeinstallprompt once, early — often before this component
// mounts. Capture it at module scope and re-broadcast so late mounts still see it.
const CAPTURED_EVENT = "rva-install-available";
let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(CAPTURED_EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(CAPTURED_EVENT));
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    iosStandalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = /Mac/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
}

// Browser-only facts read through useSyncExternalStore so the server snapshot
// renders nothing and hydration never mismatches.
const noopSubscribe = () => () => {};
const hasPrompt = () => deferredPrompt !== null;

function subscribeInstall(cb: () => void) {
  window.addEventListener(CAPTURED_EVENT, cb);
  return () => window.removeEventListener(CAPTURED_EVENT, cb);
}

function subscribeDisplayMode(cb: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

export interface InstallCoachProps {
  /** Home uses the compact form; Settings uses the full explainer. */
  compact?: boolean;
}

export function InstallCoach({ compact = false }: InstallCoachProps) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    isStandalone,
    () => true,
  );
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
  const canPrompt = useSyncExternalStore(subscribeInstall, hasPrompt, () => false);

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => {
        if (!alive) return;
        setDismissed(Boolean(s.installCoachDismissedAt));
        setReady(true);
      })
      .catch(() => {
        // Reading settings failed: stay quiet rather than nag on every render.
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    try {
      const s = await getSettings();
      await saveSettings({ ...s, installCoachDismissedAt: Date.now() });
    } catch (err) {
      setDismissed(false);
      uiActions.showError(err, "Couldn't save that preference.");
    }
  }, []);

  const install = useCallback(async () => {
    const evt = deferredPrompt;
    if (!evt) return;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      deferredPrompt = null;
      window.dispatchEvent(new Event(CAPTURED_EVENT));
      if (outcome === "accepted") {
        uiActions.showSnack("Installing RVA Miles…", "success");
      }
    } catch (err) {
      uiActions.showError(err, "Couldn't open the install prompt.");
    }
  }, []);

  if (!ready || dismissed || standalone) return null;
  if (!ios && !canPrompt) return null;

  return (
    // A plain card. The one brand moment here is the icon tile below; the
    // gradient wash and gradient hairline this used to carry were two more.
    <Card sx={{ overflow: "hidden", position: "relative" }}>
      <CardContent sx={{ pr: 6, py: compact ? 2 : 2.5 }}>
        <IconButton
          size="small"
          aria-label="Dismiss install tip"
          onClick={() => void dismiss()}
          sx={{ position: "absolute", top: 10, right: 8, color: "text.secondary" }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: `${radii.control}px`,
              display: "grid",
              placeItems: "center",
              background: brand.gradient,
              color: "#fff",
            }}
          >
            <InstallMobileRoundedIcon fontSize="small" />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>
              Keep RVA Miles one tap away
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {ios
                ? "Add it to your Home Screen — it opens full screen and works offline."
                : "Install it — full screen, works offline, no browser bars."}
            </Typography>

            {ios ? (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                <Step
                  n={1}
                  icon={<IosShareRoundedIcon sx={{ fontSize: 18 }} />}
                  text="Tap Share in Safari's toolbar"
                />
                <Step
                  n={2}
                  icon={<AddBoxOutlinedIcon sx={{ fontSize: 18 }} />}
                  text="Choose Add to Home Screen"
                />
              </Stack>
            ) : (
              <Button
                variant="contained"
                onClick={() => void install()}
                sx={{ mt: 1.75 }}
              >
                Install app
              </Button>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  icon,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: `${radii.pill}px`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          bgcolor: "action.selected",
          color: "primary.main",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {n}
      </Box>
      <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
}

export default InstallCoach;
