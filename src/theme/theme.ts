"use client";

// RVA Miles design system. Single source of truth for color, type, radius and
// component shape. MUI CssVars (colorSchemeSelector 'data') so the mode can be
// switched manually AND resolved before first paint by InitColorSchemeScript.

import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

export const brand = {
  violet: "#7C3AED",
  fuchsia: "#D946EF",
  gradient: "linear-gradient(135deg,#7C3AED,#D946EF)",
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

/** Soft, layered elevation ramp — two stacked low-alpha shadows per step. */
function softShadows(): Shadows {
  const out: string[] = ["none"];
  for (let i = 1; i < 25; i += 1) {
    const y1 = Math.round(i * 0.9) + 1;
    const b1 = Math.round(i * 1.9) + 4;
    const y2 = Math.max(1, Math.round(i * 0.35));
    const b2 = Math.round(i * 0.9) + 2;
    const a1 = (0.05 + i * 0.0035).toFixed(3);
    const a2 = (0.04 + i * 0.002).toFixed(3);
    out.push(
      `0px ${y1}px ${b1}px rgba(15,10,35,${a1}), 0px ${y2}px ${b2}px rgba(15,10,35,${a2})`,
    );
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
  shape: { borderRadius: 12 },
  shadows: softShadows(),
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
        rounded: { borderRadius: 16 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 16,
          border: "1px solid",
          borderColor: (t.vars ?? t).palette.divider,
          backgroundImage: "none",
          boxShadow: t.shadows[2],
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
        root: { borderRadius: 12, fontWeight: 600, textTransform: "none" },
        sizeSmall: { minHeight: 38, paddingInline: 14, borderRadius: 10 },
        sizeMedium: { minHeight: 48, paddingInline: 18, fontSize: "0.9375rem" },
        sizeLarge: { minHeight: 54, paddingInline: 24, fontSize: "1rem" },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
        sizeMedium: { width: 44, height: 44 },
        sizeLarge: { width: 52, height: 52 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 44,
          fontWeight: 600,
          textTransform: "none",
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: 12 } },
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
        root: { borderRadius: 12 },
        input: { paddingTop: 14, paddingBottom: 14 },
        notchedOutline: { borderWidth: 1.5 },
      },
    },
    MuiFilledInput: {
      styleOverrides: { root: { borderRadius: 12 } },
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
        root: { borderRadius: 999, fontWeight: 600 },
        sizeMedium: { height: 34, fontSize: "0.8125rem" },
        sizeSmall: { height: 26 },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 12, minHeight: 48 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20, margin: 16 } },
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorBottom: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundImage: "none",
          // Bottom sheets must clear the home indicator.
          paddingBottom: "var(--safe-bottom, 0px)",
        },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { marginTop: 6 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14, alignItems: "center", fontWeight: 500 },
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
      styleOverrides: { root: { borderRadius: 999, height: 6 } },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiSwitch: { defaultProps: { color: "primary" } },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 10, fontSize: "0.75rem" } },
    },
    MuiFab: { styleOverrides: { root: { borderRadius: 18 } } },
    MuiLink: { defaultProps: { underline: "hover" } },
  },
});

export default theme;
