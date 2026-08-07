"use client";

// Same silhouette as the loaded screen so nothing jumps when settings land.

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { radii } from "@/theme/theme";

export function SettingsSkeleton() {
  return (
    <Stack spacing={3} sx={{ px: 2.5, pt: 2.5, pb: 4 }} aria-busy="true" aria-label="Loading settings">
      <Box>
        <Skeleton variant="text" width={70} height={16} />
        <Skeleton variant="text" width={140} height={38} />
      </Box>

      {[220, 140, 110, 56, 140].map((h, i) => (
        <Box key={i}>
          <Skeleton variant="text" width={110} height={18} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={h} sx={{ borderRadius: `${radii.card}px` }} />
        </Box>
      ))}
    </Stack>
  );
}

export default SettingsSkeleton;
