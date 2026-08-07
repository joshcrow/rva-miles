"use client";

// Shared bottom-sheet chrome for every home-screen sheet: grab handle, title
// row, scrollable body, optional sticky footer.

import { useEffect, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { radii } from "@/theme/theme";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky footer, e.g. the primary submit button. */
  footer?: ReactNode;
}

/**
 * A sheet opened by a long-press is still under the user's finger when the
 * synthetic click lands, which would otherwise dismiss it via the backdrop.
 * Backdrop/escape dismissals are ignored for a moment after opening; the
 * close button always works.
 */
const DISMISS_GUARD_MS = 400;

export function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  const openedAt = useRef(0);

  useEffect(() => {
    if (open) openedAt.current = Date.now();
  }, [open]);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={(_event, reason) => {
        if (reason && Date.now() - openedAt.current < DISMISS_GUARD_MS) return;
        onClose();
      }}
      slotProps={{
        paper: {
          sx: {
            maxHeight: "90dvh",
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
          <Typography variant="h4" sx={{ lineHeight: 1.25 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      <Box sx={{ px: 2.5, pb: footer ? 1.5 : 3, overflowY: "auto", flex: 1 }}>{children}</Box>

      {footer ? (
        <Box
          sx={{
            px: 2.5,
            pt: 1.5,
            pb: 2.5,
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Drawer>
  );
}

export default Sheet;
