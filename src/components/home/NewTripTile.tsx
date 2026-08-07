"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { radii } from "@/theme/theme";

export function NewTripTile({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Log a new trip"
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 116,
        p: 1.75,
        borderRadius: `${radii.card}px`,
        border: "1.5px dashed",
        borderColor: "rgba(124,58,237,0.42)",
        color: "primary.main",
        transition: "transform 140ms ease, background-color 160ms ease",
        "&:active": { transform: "scale(0.97)", bgcolor: "action.selected" },
      }}
    >
      <Stack spacing={0.75} alignItems="center">
        <AddRoundedIcon sx={{ fontSize: 26 }} />
        <Typography variant="subtitle2" component="span" sx={{ color: "primary.main" }}>
          New trip
        </Typography>
      </Stack>
    </ButtonBase>
  );
}

export default NewTripTile;
