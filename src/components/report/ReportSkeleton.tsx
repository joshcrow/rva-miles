"use client";

// Same silhouette as the loaded screen so nothing jumps when the ledger lands.

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function ReportSkeleton() {
  return (
    <Stack spacing={2.5} sx={{ px: 2.5, pt: 2.5 }} aria-busy="true" aria-label="Loading your report">
      <Box>
        <Skeleton variant="text" width={70} height={16} />
        <Skeleton variant="text" width={150} height={38} />
      </Box>

      <Stack direction="row" spacing={1}>
        {[92, 84, 96].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={34} sx={{ borderRadius: 999 }} />
        ))}
      </Stack>

      <Skeleton variant="rounded" height={196} sx={{ borderRadius: "20px" }} />
      <Skeleton variant="rounded" height={232} sx={{ borderRadius: 4 }} />

      <Stack spacing={1.25}>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={54} sx={{ borderRadius: 3 }} />
      </Stack>
    </Stack>
  );
}

export default ReportSkeleton;
