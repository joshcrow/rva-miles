"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function HomeSkeleton() {
  return (
    <Stack spacing={2.5} sx={{ px: 2.5, pt: 2.5 }} aria-busy="true" aria-label="Loading your trips">
      <Box>
        <Skeleton variant="text" width={78} height={16} />
        <Skeleton variant="text" width={196} height={40} />
        <Skeleton variant="text" width={140} height={20} />
      </Box>

      <Skeleton variant="rounded" height={84} sx={{ borderRadius: "18px" }} />

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={116} sx={{ borderRadius: 4 }} />
        ))}
      </Box>

      <Skeleton variant="rounded" height={54} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={168} sx={{ borderRadius: 4 }} />
    </Stack>
  );
}

export default HomeSkeleton;
