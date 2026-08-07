"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";

export interface CatchUpBannerProps {
  count: number;
  onOpen: () => void;
}

export function CatchUpBanner({ count, onOpen }: CatchUpBannerProps) {
  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        width: "100%",
        textAlign: "left",
        borderRadius: 4,
        px: 2,
        py: 1.75,
        border: "1px solid",
        borderColor: "rgba(124,58,237,0.28)",
        backgroundImage: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(217,70,239,0.09))",
        transition: "transform 140ms ease",
        "&:active": { transform: "scale(0.985)" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: "background.paper",
            color: "primary.main",
          }}
        >
          <EventRepeatRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" component="span" sx={{ display: "block", lineHeight: 1.3 }}>
            Missing anything?
          </Typography>
          <Typography variant="caption" component="span" color="text.secondary" sx={{ display: "block" }}>
            {count === 1 ? "1 suggested trip" : `${count} suggested trips`} from last week
          </Typography>
        </Box>
        <ChevronRightRoundedIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
      </Stack>
    </ButtonBase>
  );
}

export default CatchUpBanner;
