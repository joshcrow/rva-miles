"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import type { Route } from "@/types";
import { radii } from "@/theme/theme";
import Sheet from "./Sheet";
import { fmtMiles, placeLabel } from "./format";

export interface RouteMenuSheetProps {
  open: boolean;
  route: Route | null;
  onClose: () => void;
  onLogAnotherDay: () => void;
  onEdit: () => void;
}

function MenuRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        textAlign: "left",
        borderRadius: `${radii.card}px`,
        px: 1.75,
        py: 1.5,
        minHeight: 60,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:active": { bgcolor: "action.selected" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: `${radii.control}px`,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.selected",
            color: "primary.main",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" component="span" sx={{ display: "block" }}>
            {label}
          </Typography>
          <Typography variant="caption" component="span" color="text.secondary" sx={{ display: "block" }}>
            {hint}
          </Typography>
        </Box>
        <ChevronRightRoundedIcon sx={{ color: "text.disabled", flexShrink: 0 }} />
      </Stack>
    </ButtonBase>
  );
}

export function RouteMenuSheet({ open, route, onClose, onLogAnotherDay, onEdit }: RouteMenuSheetProps) {
  const miles = route ? (route.defaultRoundTrip ? route.distanceMiles * 2 : route.distanceMiles) : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={route ? placeLabel(route.to) : "Route"}
      subtitle={route ? `From ${placeLabel(route.from)} · ${fmtMiles(miles)} mi` : undefined}
    >
      <Stack spacing={1} sx={{ pb: 1 }}>
        <MenuRow
          icon={<CalendarMonthRoundedIcon fontSize="small" />}
          label="Log for another day"
          hint="Backfill a drive you forgot"
          onClick={onLogAnotherDay}
        />
        <MenuRow
          icon={<EditRoundedIcon fontSize="small" />}
          label="Edit route"
          hint="Name, purpose, distance, round trip"
          onClick={onEdit}
        />
      </Stack>
    </Sheet>
  );
}

export default RouteMenuSheet;
