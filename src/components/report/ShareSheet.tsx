"use client";

// Fallback (and power-user) send options for browsers that can't share files
// natively. Everything here is one tap: compose the email, take the file, or
// take the link. The recipient address lives in Settings but is editable
// right here, because the moment you need it is the moment you're sending.

import { useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import type { Trip } from "@/types";
import {
  buildCsv,
  buildSummaryText,
  buildXlsx,
  reportFilename,
  type ReportMeta,
} from "@/lib/exporters";
import { downloadBlob, mailtoUrl } from "@/lib/share";
import { uiActions } from "@/stores/ui";
import { radii } from "@/theme/theme";
import { copyText } from "./clipboard";
import { fmtMiles, fmtMoney, mailBody, rangeLabelShort, type ReportTotals } from "./reportData";

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  trips: Trip[];
  meta: ReportMeta;
  totals: ReportTotals;
  subject: string;
  link: string | null;
  linkError: string | null;
  recipientEmail: string;
  onSaveRecipient: (email: string) => void;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
      {children}
    </Typography>
  );
}

export function ShareSheet({
  open,
  onClose,
  trips,
  meta,
  totals,
  subject,
  link,
  linkError,
  recipientEmail,
  onSaveRecipient,
}: ShareSheetProps) {
  const [email, setEmail] = useState(recipientEmail);
  const [busy, setBusy] = useState<"xlsx" | "csv" | "link" | null>(null);

  useEffect(() => {
    if (open) setEmail(recipientEmail);
  }, [open, recipientEmail]);

  const href = mailtoUrl({
    to: email.trim(),
    subject,
    body: mailBody(buildSummaryText(trips, meta), link),
  });

  function commitRecipient() {
    if (email.trim() !== recipientEmail.trim()) onSaveRecipient(email.trim());
  }

  async function handleXlsx() {
    setBusy("xlsx");
    try {
      const blob = await buildXlsx(trips, meta);
      downloadBlob(blob, reportFilename(meta, "xlsx"));
      uiActions.showSnack("Spreadsheet downloaded", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't build the spreadsheet.");
    } finally {
      setBusy(null);
    }
  }

  function handleCsv() {
    setBusy("csv");
    try {
      // Leading BOM so Excel opens UTF-8 place names correctly.
      const blob = new Blob(["\uFEFF", buildCsv(trips, meta)], {
        type: "text/csv;charset=utf-8",
      });
      downloadBlob(blob, reportFilename(meta, "csv"));
      uiActions.showSnack("CSV downloaded", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't build the CSV.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyLink() {
    if (!link) {
      uiActions.showError(
        linkError ?? "The report link isn't ready yet — try again in a moment.",
      );
      return;
    }
    setBusy("link");
    try {
      await copyText(link);
      uiActions.showSnack("Report link copied", "success");
    } catch (err) {
      uiActions.showError(err, "Couldn't copy the link.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            maxHeight: "92dvh",
            width: "100%",
            maxWidth: 480,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 4,
          borderRadius: `${radii.pill}px`,
          bgcolor: "divider",
          mx: "auto",
          mt: 1.25,
          mb: 0.5,
          flexShrink: 0,
        }}
      />

      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1}
        sx={{ px: 2.5, pt: 1, pb: 1.5, flexShrink: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h4">Send this report</Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
            {`${rangeLabelShort(meta.range)} · ${fmtMiles(totals.miles)} mi · ${fmtMoney(
              totals.money,
            )}`}
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      <Box sx={{ px: 2.5, pb: 3, overflowY: "auto", flex: 1 }}>
        <SectionLabel>Email</SectionLabel>
        <TextField
          label="Send to"
          type="email"
          fullWidth
          value={email}
          placeholder="manager@example.com"
          autoComplete="email"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          onBlur={commitRecipient}
          helperText="Remembered for next time"
        />
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<SendRoundedIcon />}
          component="a"
          href={href}
          onClick={commitRecipient}
          sx={{ mt: 1.5 }}
        >
          Email report
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {linkError
            ? "Opens your mail app with the summary. The report link couldn't be built — send the spreadsheet instead."
            : link
              ? "Opens your mail app with the summary and the report link already written."
              : "Preparing the report link…"}
        </Typography>

        <Box sx={{ height: 1, bgcolor: "divider", my: 2.5 }} />

        <SectionLabel>Files</SectionLabel>
        <Stack spacing={1.25}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            startIcon={<GridOnRoundedIcon />}
            onClick={() => void handleXlsx()}
            disabled={busy === "xlsx"}
          >
            {busy === "xlsx" ? "Building…" : "Download Excel (.xlsx)"}
          </Button>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            startIcon={<DescriptionRoundedIcon />}
            onClick={handleCsv}
            disabled={busy === "csv"}
          >
            Download CSV
          </Button>
        </Stack>

        <Box sx={{ height: 1, bgcolor: "divider", my: 2.5 }} />

        <SectionLabel>Link</SectionLabel>
        <Button
          fullWidth
          size="large"
          variant="outlined"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={() => void handleCopyLink()}
          disabled={busy === "link"}
        >
          Copy report link
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          The link contains the report data itself — no account or server needed.
        </Typography>
      </Box>
    </Drawer>
  );
}

export default ShareSheet;
