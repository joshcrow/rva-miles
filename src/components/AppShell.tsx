"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import BottomNav from "./BottomNav";

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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = !isImmersiveRoute(pathname);

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
          pt: "var(--safe-top)",
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
    </>
  );
}

export default AppShell;
