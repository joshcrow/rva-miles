"use client";

import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ display: "block", px: 0.5, mb: 1 }}>
      {children}
    </Typography>
  );
}

export default SectionLabel;
