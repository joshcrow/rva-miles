"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";

/**
 * The cockpit canvas. Fixed to the viewport (escaping the app's 480px column)
 * and near-black in BOTH color schemes: this screen is read through a
 * windshield's worth of glare and at night, so it never goes light.
 *
 * Deliberately flat — the only brand moment on this screen is the START ring
 * (idle) and nothing at all while recording. The stage used to carry two
 * radial brand washes on top of that.
 */

export const STAGE_BG = "#0B0A10";
export const STAGE_FG = "#EFECF8";
export const STAGE_DIM = "rgba(239,236,248,0.60)";
export const STAGE_FAINT = "rgba(239,236,248,0.38)";
export const STAGE_LINE = "rgba(255,255,255,0.10)";
export const STAGE_FILL = "rgba(255,255,255,0.05)";

export function DriveStage({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        bgcolor: STAGE_BG,
        color: STAGE_FG,
        display: "flex",
        justifyContent: "center",
        // Safety net for short/landscape viewports (phone in a dash mount):
        // the STOP button must never be clipped off the bottom.
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          px: 3,
          pt: "calc(var(--safe-top) + 14px)",
          pb: "calc(var(--safe-bottom) + 18px)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default DriveStage;
