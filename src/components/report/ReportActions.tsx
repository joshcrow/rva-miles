"use client";

// Two buttons and one sentence. "Share report" is the whole flow on a phone:
// the spreadsheet, the summary and the link handed to the OS share sheet at
// once. Everything else lives one tap deeper.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { brand } from "@/theme/theme";

export interface ReportActionsProps {
  onShare: () => void;
  onMore: () => void;
  sharing: boolean;
}

export function ReportActions({ onShare, onMore, sharing }: ReportActionsProps) {
  return (
    <Box>
      <Stack spacing={1.25}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<IosShareRoundedIcon />}
          onClick={onShare}
          disabled={sharing}
          sx={{
            backgroundImage: brand.gradient,
            color: "#fff",
            boxShadow: 4,
            minHeight: 56,
            fontSize: "1.0625rem",
            "&.Mui-disabled": { backgroundImage: brand.gradient, color: "#fff", opacity: 0.6 },
          }}
        >
          {sharing ? "Preparing…" : "Share report"}
        </Button>

        <Button
          fullWidth
          size="large"
          variant="outlined"
          startIcon={<TuneRoundedIcon />}
          onClick={onMore}
        >
          Email, download or copy link
        </Button>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1.5, textAlign: "center", px: 1 }}
      >
        The link contains the report data itself — no account or server needed.
      </Typography>
    </Box>
  );
}

export default ReportActions;
