// Shared surface styling for the home screen.
//
// The design system has exactly two shadows (see src/theme/theme.ts): `rest`
// for resting cards in LIGHT mode, `raised` for things that float. Dark mode
// separates resting surfaces with borders and background contrast instead, so
// a resting surface must drop its shadow entirely there. MuiCard does this for
// itself in the theme; home's hand-built surfaces (the route tiles, the pay
// period chip, the Recent list) are ButtonBase/Box and need it applied here.

import type { Theme } from "@mui/material/styles";
import { elevation } from "@/theme/theme";

/** Spread into an `sx` callback: `sx={(t) => ({ ...restingSurface(t) })}`. */
export function restingSurface(t: Theme) {
  return {
    boxShadow: elevation.rest,
    ...t.applyStyles("dark", { boxShadow: "none" }),
  };
}
