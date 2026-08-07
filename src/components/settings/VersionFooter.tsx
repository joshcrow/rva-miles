"use client";

// The last thing on the screen and the least important — a bare version
// stamp, unlabeled and uncarded, the way a page footer sits below its
// content rather than inside it. Everything this used to say twice (where
// the ledger lives, what a report link is) now lives exactly once, in "Your
// data" and in ReportActions/ShareSheet respectively.

import Typography from "@mui/material/Typography";

export function VersionFooter() {
  return (
    <Typography
      component="footer"
      variant="caption"
      color="text.disabled"
      sx={{ display: "block", textAlign: "center" }}
    >
      RVA Miles 2.0.0
    </Typography>
  );
}

export default VersionFooter;
