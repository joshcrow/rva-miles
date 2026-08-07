"use client";

import type { ElementType, ReactNode } from "react";
import Typography from "@mui/material/Typography";

export interface SectionLabelProps {
  children: ReactNode;
  /**
   * Element to render. Settings passes "h2" so its three group titles are real
   * headings under the "Settings" h1 — the grouping is the navigation, so it
   * has to exist in the accessibility tree too. Typography supplies the
   * overline styling either way.
   */
  component?: ElementType;
}

export function SectionLabel({ children, component = "span" }: SectionLabelProps) {
  return (
    <Typography
      variant="overline"
      component={component}
      color="text.secondary"
      sx={{ display: "block", px: 0.5, mb: 1 }}
    >
      {children}
    </Typography>
  );
}

export default SectionLabel;
