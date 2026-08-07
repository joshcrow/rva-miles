"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

const ITEMS = [
  { label: "Home", href: "/", Icon: HomeRoundedIcon },
  { label: "Trips", href: "/trips", Icon: ListAltRoundedIcon },
  { label: "Report", href: "/report", Icon: SummarizeRoundedIcon },
  { label: "Settings", href: "/settings", Icon: SettingsRoundedIcon },
] as const;

function activeHref(pathname: string): string {
  const match = ITEMS.find(
    (i) => i.href !== "/" && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
  );
  return match?.href ?? "/";
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <Box
      component="nav"
      sx={(t) => ({
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        zIndex: t.zIndex.appBar,
        pb: "var(--safe-bottom)",
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        // Frosted only where supported; the solid bgcolor above is the fallback.
        // applyStyles (not palette.mode) is the CSS-variables-correct way to
        // branch on scheme — palette.mode is frozen at the default scheme here.
        "@supports (backdrop-filter: blur(12px))": {
          backdropFilter: "blur(16px) saturate(180%)",
          backgroundColor: "rgba(255,255,255,0.92)",
          ...t.applyStyles("dark", {
            backgroundColor: "rgba(23,21,31,0.9)",
          }),
        },
        "@media print": { display: "none" },
      })}
    >
      <BottomNavigation value={activeHref(pathname)} showLabels>
        {ITEMS.map(({ label, href, Icon }) => (
          <BottomNavigationAction
            key={href}
            value={href}
            label={label}
            component={Link}
            href={href}
            prefetch={false}
            aria-label={label}
            icon={<Icon sx={{ fontSize: 26 }} />}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}

export default BottomNav;
