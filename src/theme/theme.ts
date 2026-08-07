"use client";

// RVA Miles design system. Single source of truth for color, type, radius,
// shadow and component shape. MUI CssVars (colorSchemeSelector 'data') so the
// mode can be switched manually AND resolved before first paint by
// InitColorSchemeScript.
//
// Shape rules the whole app obeys:
//   - every corner is one of the four `radii` tokens, written as a px string
//   - every shadow is one of the two `elevation` tokens
//   - at most one brand-gradient moment per screen
// Component overrides below carry the tokens, so screens should almost never
// need a local radius: if an sx sets `borderRadius` to restate a token the
// component already has, delete it.

import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

export const brand = {
  violet: "#7C3AED",
  fuchsia: "#D946EF",
  gradient: "linear-gradient(135deg,#7C3AED,#D946EF)",
} as const;

/**
 * The four corner radii the whole app is allowed to use, in px.
 *
 * Always spell them as px strings in `sx` (`` borderRadius: `${radii.card}px` ``).
 * A bare number in `sx` is a *multiplier* of `theme.shape.borderRadius`, which
 * is how v2 drifted to 24/36/48px corners that nobody chose.
 *
 *  - `card`    cards, tiles, table containers, banners, sheets-within-pages
 *  - `control` buttons, inputs, small icon tiles, structured chips
 *  - `sheet`   the top corners of a bottom sheet
 *  - `pill`    status pills, badges, dots, circular discs
 */
export const radii = {
  card: 20,
  control: 12,
  sheet: 24,
  pill: 999,
} as const;

/**
 * Two shadows, not a ramp. Light mode: `rest` for resting surfaces, `raised`
 * for things that float above the page (sheets, menus, snackbars). Dark mode
 * separates surfaces with borders and background contrast instead — resting
 * surfaces get no shadow at all, overlays keep `raised`.
 */
export const elevation = {
  /** Light-mode resting cards. */
  rest: "0 1px 2px rgba(16,10,30,0.06), 0 4px 14px rgba(16,10,30,0.05)",
  /** Sheets, menus, dialogs, snackbars — both schemes. */
  raised: "0 8px 28px rgba(16,10,30,0.14)",
} as const;

const FONT_STACK = [
  "var(--font-inter)",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(", ");

/**
 * MUI wants 25 shadow steps; the design system has two. Every `elevation`
 * prop and every `theme.shadows[n]` therefore lands on one of the tokens —
 * low steps rest, anything MUI considers "floating" (menus 8, drawers 16,
 * dialogs 24) raises. There is no third shadow to drift into.
 */
function tokenShadows(): Shadows {
  const out: string[] = ["none"];
  for (let i = 1; i < 25; i += 1) {
    out.push(i <= 2 ? elevation.rest : elevation.raised);
  }
  return out as unknown as Shadows;
}

const theme = createTheme({
  // Must match InitColorSchemeScript's `attribute` (layout.tsx) so the scheme
  // resolved before first paint is the one the stylesheet keys off.
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: brand.violet,
          light: "#9B6BF5",
          dark: "#5B21B6",
          contrastText: "#FFFFFF",
        },
        secondary: {
          main: brand.fuchsia,
          light: "#E879F9",
          dark: "#A21CAF",
          contrastText: "#FFFFFF",
        },
        // Money is always rendered in success green.
        success: {
          main: "#15A34A",
          light: "#22C55E",
          dark: "#0F7A38",
          contrastText: "#FFFFFF",
        },
        error: { main: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
        warning: { main: "#D97706", light: "#F59E0B", dark: "#B45309" },
        info: { main: "#2563EB", light: "#3B82F6", dark: "#1D4ED8" },
        background: { default: "#F6F5FB", paper: "#FFFFFF" },
        text: {
          primary: "#171422",
          secondary: "#5C5673",
          disabled: "#9A94AC",
        },
        divider: "rgba(23,20,34,0.10)",
        action: {
          hover: "rgba(124,58,237,0.06)",
          selected: "rgba(124,58,237,0.10)",
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: "#9B6BF5",
          light: "#B794FA",
          dark: "#6D28D9",
          contrastText: "#0B0A10",
        },
        secondary: {
          main: "#E879F9",
          light: "#F0ABFC",
          dark: "#C026D3",
          contrastText: "#0B0A10",
        },
        success: {
          main: "#3DDC91",
          light: "#6EE7B7",
          dark: "#15A34A",
          contrastText: "#07130D",
        },
        error: { main: "#F87171", light: "#FCA5A5", dark: "#DC2626" },
        warning: { main: "#FBBF24", light: "#FCD34D", dark: "#D97706" },
        info: { main: "#60A5FA", light: "#93C5FD", dark: "#2563EB" },
        background: { default: "#0B0A10", paper: "#17151F" },
        text: {
          primary: "#EFECF8",
          secondary: "#A49EB8",
          disabled: "#6B6580",
        },
        divider: "rgba(255,255,255,0.10)",
        action: {
          hover: "rgba(155,107,245,0.10)",
          selected: "rgba(155,107,245,0.16)",
        },
      },
    },
  },
  // Bare `sx={{ borderRadius: n }}` multiplies this. Anchoring it to the
  // control token means an accidental bare `1` is at least on-system.
  shape: { borderRadius: radii.control },
  shadows: tokenShadows(),
  typography: {
    fontFamily: FONT_STACK,
    h1: {
      fontSize: "2.5rem",
      fontWeight: 800,
      lineHeight: 1.06,
      letterSpacing: "-0.032em",
      fontVariantNumeric: "tabular-nums",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: "-0.028em",
      fontVariantNumeric: "tabular-nums",
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.18,
      letterSpacing: "-0.022em",
      fontVariantNumeric: "tabular-nums",
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.016em",
    },
    h5: { fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.012em" },
    h6: { fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "-0.008em" },
    subtitle1: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: "1rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    caption: { fontSize: "0.75rem", lineHeight: 1.4 },
    overline: {
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      lineHeight: 1.5,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitTapHighlightColor: "transparent",
          WebkitFontSmoothing: "antialiased",
          overscrollBehaviorY: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        // Kill MUI's dark-mode elevation tint so surfaces stay a flat, rich
        // near-black rather than drifting gray.
        root: { backgroundImage: "none" },
        rounded: { borderRadius: radii.card },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radii.card,
          border: "1px solid",
          borderColor: (t.vars ?? t).palette.divider,
          backgroundImage: "none",
          boxShadow: elevation.rest,
          // Dark mode separates surfaces with the border above plus the
          // paper/default contrast — a shadow on near-black is just noise.
          ...t.applyStyles("dark", { boxShadow: "none" }),
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 20, "&:last-child": { paddingBottom: 20 } },
      },
    },
    MuiCardActions: { styleOverrides: { root: { padding: "0 16px 16px" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: radii.control, fontWeight: 600, textTransform: "none" },
        sizeSmall: { minHeight: 38, paddingInline: 14 },
        sizeMedium: { minHeight: 48, paddingInline: 18, fontSize: "0.9375rem" },
        sizeLarge: { minHeight: 54, paddingInline: 24, fontSize: "1rem" },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: radii.control },
        sizeMedium: { width: 44, height: 44 },
        sizeLarge: { width: 52, height: 52 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.control,
          minHeight: 44,
          fontWeight: 600,
          textTransform: "none",
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: radii.control } },
    },
    MuiTextField: { defaultProps: { variant: "outlined" } },
    MuiInputBase: {
      styleOverrides: {
        // 16px minimum stops iOS Safari zooming the viewport on focus — we
        // deliberately do NOT disable user scaling, so this must hold.
        input: { fontSize: "1rem" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: radii.control },
        input: { paddingTop: 14, paddingBottom: 14 },
        notchedOutline: { borderWidth: 1.5 },
      },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: radii.control } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { height: 64, backgroundColor: "transparent" } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          minWidth: 0,
          gap: 3,
          paddingTop: 8,
          paddingBottom: 6,
          color: (t.vars ?? t).palette.text.secondary,
          "&.Mui-selected": { color: (t.vars ?? t).palette.primary.main },
        }),
        label: {
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.01em",
          "&.Mui-selected": { fontSize: "0.6875rem" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radii.pill, fontWeight: 600 },
        sizeMedium: { height: 34, fontSize: "0.8125rem" },
        sizeSmall: { height: 26 },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: radii.control, minHeight: 48 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radii.card, margin: 16, boxShadow: elevation.raised },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorBottom: {
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundImage: "none",
          boxShadow: elevation.raised,
          // Bottom sheets must clear the home indicator.
          paddingBottom: "var(--safe-bottom, 0px)",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { marginTop: 6, borderRadius: radii.card, boxShadow: elevation.raised },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radii.card, alignItems: "center", fontWeight: 500 },
        action: { paddingTop: 0, alignItems: "center" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 46 },
      },
    },
    MuiTabs: { styleOverrides: { root: { minHeight: 46 } } },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: radii.pill, height: 6 } },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { borderRadius: radii.control } },
    },
    MuiSwitch: { defaultProps: { color: "primary" } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: radii.control, fontSize: "0.75rem" },
      },
    },
    MuiFab: { styleOverrides: { root: { borderRadius: radii.card } } },
    MuiLink: { defaultProps: { underline: "hover" } },
  },
});

export default theme;
