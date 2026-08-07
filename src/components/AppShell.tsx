"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import BottomNav from "./BottomNav";
import { DEMO_FLAG_KEY, isDemoMode } from "@/lib/db";
import { radii } from "@/theme/theme";

/**
 * Routes that own the whole screen: the driving cockpit (glanceable, zero
 * chrome, nothing tappable by accident at 60mph) and the shared report viewer
 * (opened by a manager who has no app to navigate).
 */
export function isImmersiveRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/drive" ||
    pathname.startsWith("/drive/") ||
    pathname === "/r" ||
    pathname.startsWith("/r/")
  );
}

// ---------------------------------------------------------------------------
// Demo mode entry / exit
// ---------------------------------------------------------------------------
// Entry is by URL only — `?demo=1`. There is no button anywhere, because the
// only person who should ever see the demo ledger is the one who was handed
// the link. Both directions reload, because db.ts picks its database name once
// per page load; the reload is what makes the isolation absolute.

/** Height reserved above the app's own content for the floating badge. */
const BADGE_CLEARANCE_PX = 48;

function stripDemoParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("demo");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function enterDemoFromUrl(): void {
  if (new URLSearchParams(window.location.search).get("demo") !== "1") return;

  const already = isDemoMode();
  stripDemoParam();
  // Already in demo mode: the URL is cleaned and we simply carry on, so
  // re-opening the link can never bounce the page in a reload loop.
  if (already) return;

  window.localStorage.setItem(DEMO_FLAG_KEY, "1");
  window.location.reload();
}

function exitDemo(): void {
  window.localStorage.removeItem(DEMO_FLAG_KEY);
  window.location.reload();
}

/**
 * The flag is a client-only fact that cannot change without a reload, so
 * there is nothing to subscribe to — this reads it the way the rest of the app
 * reads client-only facts: '' / false on the server, the truth after
 * hydration, with no effect writing state.
 */
function subscribeDemoFlag(): () => void {
  return () => {};
}

function demoFlagServerSnapshot(): boolean {
  return false;
}

/**
 * Fixed, top-centre, above everything. The wrapper takes no pointer events so
 * it never steals a tap from the screen underneath — only the pill itself is
 * touchable.
 */
function DemoBadge() {
  return (
    <Box
      sx={{
        position: "fixed",
        top: "calc(var(--safe-top) + 8px)",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: (t) => t.zIndex.snackbar + 1,
        "@media print": { display: "none" },
      }}
    >
      <Box
        sx={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          pl: 1.75,
          pr: 0.75,
          py: 0.25,
          borderRadius: `${radii.pill}px`,
          bgcolor: "warning.main",
          color: "warning.contrastText",
          boxShadow: 8,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Demo data
        </Typography>
        <Button
          size="small"
          onClick={exitDemo}
          sx={{
            color: "inherit",
            minHeight: 30,
            px: 1.25,
            fontSize: "0.75rem",
            "&:hover": { bgcolor: "rgba(0,0,0,0.12)" },
          }}
        >
          Exit
        </Button>
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = !isImmersiveRoute(pathname);

  const demo = useSyncExternalStore(subscribeDemoFlag, isDemoMode, demoFlagServerSnapshot);

  // `?demo=1` acts on the URL and on storage, not on React state: it either
  // cleans the query and carries on, or sets the flag and reloads.
  useEffect(() => {
    enterDemoFromUrl();
  }, []);

  return (
    <>
      <Box
        component="main"
        sx={{
          width: "100%",
          maxWidth: 480,
          mx: "auto",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          // In demo mode the content starts below the badge, so a screen
          // header is never printed underneath it.
          pt: demo ? `calc(var(--safe-top) + ${BADGE_CLEARANCE_PX}px)` : "var(--safe-top)",
          pl: "var(--safe-left)",
          pr: "var(--safe-right)",
          pb: showNav
            ? "calc(var(--nav-height) + var(--safe-bottom) + 12px)"
            : "var(--safe-bottom)",
          "@media print": {
            maxWidth: "none",
            minHeight: 0,
            padding: 0,
          },
        }}
      >
        {children}
      </Box>
      {showNav ? <BottomNav /> : null}
      {demo ? <DemoBadge /> : null}
    </>
  );
}

export default AppShell;
