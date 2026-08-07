"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function TripsSkeleton() {
  return (
    <Stack spacing={2} sx={{ px: 2.5, pt: 2 }} aria-busy="true" aria-label="Loading your trips">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Skeleton variant="text" width={44} height={32} />
        <Skeleton variant="text" width={160} height={32} />
        <Skeleton variant="text" width={44} height={32} />
      </Stack>
      <Skeleton variant="text" width={140} height={20} sx={{ alignSelf: "center" }} />
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 3 }} />

      {[0, 1].map((g) => (
        <Box key={g}>
          <Skeleton variant="text" width={190} height={22} sx={{ mb: 1 }} />
          <Stack spacing={1}>
            {[0, 1].map((r) => (
              <Skeleton key={r} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export default TripsSkeleton;
