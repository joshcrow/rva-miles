"use client";

// The safety net between "picked a file" and "actually merged into the
// ledger": say exactly what will change, in plain counts, and offer an
// automatic pre-import backup before anything touches the database.

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { brand } from "@/theme/theme";

export interface ImportPreviewSheetProps {
  open: boolean;
  previewText: string;
  importing: boolean;
  onCancel: () => void;
  onConfirm: (backupFirst: boolean) => void;
}

export function ImportPreviewSheet({
  open,
  previewText,
  importing,
  onCancel,
  onConfirm,
}: ImportPreviewSheetProps) {
  const [backupFirst, setBackupFirst] = useState(true);

  // Reset the checkbox on the closed -> open transition only (React's
  // "adjust state during render" pattern), so it can't fight in-progress
  // interaction the way a setState-in-effect would.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setBackupFirst(true);
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={importing ? undefined : onCancel}
      slotProps={{
        paper: { sx: { maxWidth: 480, mx: "auto", width: "100%" } },
      }}
    >
      <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: "divider", mx: "auto", mt: 1.25, mb: 0.5 }} />

      <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            background: brand.gradient,
            color: "#fff",
          }}
        >
          <UploadFileRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h4">Import this backup?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {previewText}
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onCancel} disabled={importing} sx={{ mt: -0.5, mr: -1 }}>
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      <Stack spacing={2} sx={{ px: 2.5, pb: 3 }}>
        <FormControlLabel
          control={<Checkbox checked={backupFirst} onChange={(e) => setBackupFirst(e.target.checked)} />}
          label="Back up current data first (recommended)"
        />
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={importing}
          onClick={() => onConfirm(backupFirst)}
          sx={{ backgroundImage: brand.gradient, color: "#fff" }}
        >
          {importing ? "Importing…" : "Import"}
        </Button>
        <Button fullWidth variant="text" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
      </Stack>
    </Drawer>
  );
}

export default ImportPreviewSheet;
