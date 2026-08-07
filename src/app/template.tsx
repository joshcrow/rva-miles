"use client";

import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { consumeTabSwitch, savedScrollFor } from "@/components/tabNav";

// A template remounts on every route change (a layout does not). Two cases:
// - Tab switch (marked by BottomNav): instant, no animation, scroll restored —
//   native tab grammar.
// - Everything else (drill-ins like /drive, first load, /r): the .route-enter
//   settle animation.
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isTab = useMemo(consumeTabSwitch, []);

  useLayoutEffect(() => {
    if (!isTab) return;
    const y = savedScrollFor(pathname);
    // Two frames out, so the restore lands after Next's own scroll-to-top.
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [isTab, pathname]);

  return <div className={isTab ? "route-shell" : "route-shell route-enter"}>{children}</div>;
}
