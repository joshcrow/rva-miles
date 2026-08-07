"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import BottomNav from "./BottomNav";
import { startAutoSync } from "@/lib/autosync";
import { DEMO_FLAG_KEY, DEMO_FLAG_VALUES, demoVariant, type DemoVariant } from "@/lib/db";
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
// Entry is by URL only — `?demo=1` for the clean ledger, `?demo=messy` for the
// worst-case one. There is no button anywhere, because the only person who
// should ever see a demo ledger is the one who was handed the link. Every
// change of variant reloads, because db.ts picks its database name once per
// page load; the reload is what makes the isolation absolute.

/** Height reserved above the app's own content for the floating badge. */
const BADGE_CLEARANCE_PX = 48;

const BADGE_LABELS: Record<DemoVariant, string> = {
  clean: "Demo data",
  messy: "Demo — messy data",
};

/** `?demo=…` values that name a variant. Anything else is ignored outright. */
function variantFromParam(raw: string | null): DemoVariant | null {
  if (raw === "1") return "clean";
  if (raw === "messy") return "messy";
  return null;
}

function stripDemoParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("demo");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function enterDemoFromUrl(): void {
  const wanted = variantFromParam(new URLSearchParams(window.location.search).get("demo"));
  if (!wanted) return;

  const current = demoVariant();
  stripDemoParam();
  // Already running the variant the link asks for: the URL is cleaned and we
  // simply carry on, so re-opening the link can never bounce the page in a
  // reload loop. Coming from the *other* variant falls through and switches.
  if (current === wanted) return;

  window.localStorage.setItem(DEMO_FLAG_KEY, DEMO_FLAG_VALUES[wanted]);
  window.location.reload();
}

function exitDemo(): void {
  window.localStorage.removeItem(DEMO_FLAG_KEY);
  window.location.reload();
}

/**
 * The flag is a client-only fact that cannot change without a reload, so
 * there is nothing to subscribe to — this reads it the way the rest of the app
 * reads client-only facts: null on the server, the truth after hydration,
 * with no effect writing state.
 */
function subscribeDemoFlag(): () => void {
  return () => {};
}

function demoVariantServerSnapshot(): DemoVariant | null {
  return null;
}

/**
 * Fixed, top-centre, above everything. The wrapper takes no pointer events so
 * it never steals a tap from the screen underneath — only the pill itself is
 * touchable.
 */
function DemoBadge({ variant }: { variant: DemoVariant }) {
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
        <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          {BADGE_LABELS[variant]}
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

  const demo = useSyncExternalStore(subscribeDemoFlag, demoVariant, demoVariantServerSnapshot);

  // `?demo=…` acts on the URL and on storage, not on React state: it either
  // cleans the query and carries on, or sets the flag and reloads.
  useEffect(() => {
    enterDemoFromUrl();
  }, []);

  // Sync runs on its own from here on: after edits settle, on open, on the way
  // to the background, and when the connection comes back. It costs nothing
  // until the user sets a sync code, and it declines outright on a demo
  // ledger — which is why this can sit in the shell rather than on a screen.
  // Declared after the demo effect so a `?demo=…` link has already set the
  // flag by the time this reads it.
  useEffect(() => startAutoSync(), []);

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
      {demo ? <DemoBadge variant={demo} /> : null}
    </>
  );
}

export default AppShell;
