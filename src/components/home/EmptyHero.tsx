"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import { brand, radii } from "@/theme/theme";
import { restingSurface } from "./surfaces";

export function EmptyHero({ onNewTrip }: { onNewTrip: () => void }) {
  return (
    <Box
      sx={(t) => ({
        textAlign: "center",
        px: 2,
        py: 5,
        borderRadius: `${radii.card}px`,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        ...restingSurface(t),
      })}
    >
      {/* Tinted, not gradient-filled: this screen spends its single brand
          moment on the New trip CTA below. */}
      <Box
        sx={{
          width: 72,
          height: 72,
          mx: "auto",
          borderRadius: `${radii.card}px`,
          display: "grid",
          placeItems: "center",
          bgcolor: "action.selected",
          color: "primary.main",
        }}
      >
        <RouteRoundedIcon sx={{ fontSize: 34 }} />
      </Box>

      <Typography variant="h3" component="h2" sx={{ mt: 2.5 }}>
        Log your first trip
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mx: "auto", maxWidth: 300 }}>
        Enter it once and it becomes a tile — every drive after that is a single tap.
      </Typography>

      <Stack spacing={1.25} sx={{ mt: 3, mx: "auto", maxWidth: 300 }}>
        <Button
          size="large"
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={onNewTrip}
          sx={{ background: brand.gradient, color: "#fff" }}
        >
          New trip
        </Button>
        <Button
          size="large"
          variant="outlined"
          component={Link}
          href="/drive"
          startIcon={<NavigationRoundedIcon />}
        >
          Track a drive
        </Button>
      </Stack>
    </Box>
  );
}

export default EmptyHero;
