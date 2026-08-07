"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import { brand } from "@/theme/theme";

export function EmptyHero({ onNewTrip }: { onNewTrip: () => void }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        px: 2,
        py: 5,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        backgroundImage: "linear-gradient(160deg, rgba(124,58,237,0.09), rgba(217,70,239,0.06))",
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          mx: "auto",
          borderRadius: "22px",
          display: "grid",
          placeItems: "center",
          background: brand.gradient,
          color: "#fff",
          boxShadow: 6,
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
