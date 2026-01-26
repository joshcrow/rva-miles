'use client';

import { Box, Typography } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface TrackingStatusIndicatorProps {
  status: 'ON' | 'OFF';
}

export default function TrackingStatusIndicator({ status }: TrackingStatusIndicatorProps) {
  const isActive = status === 'ON';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        px: 3,
        py: 1.5,
        borderRadius: 3,
        bgcolor: isActive ? 'success.light' : 'grey.200',
        border: 2,
        borderColor: isActive ? 'success.main' : 'grey.400',
      }}
    >
      <FiberManualRecordIcon
        sx={{
          color: isActive ? 'success.main' : 'grey.500',
          fontSize: 16,
          animation: isActive ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 },
          },
        }}
      />
      <Typography
        variant="h6"
        component="span"
        sx={{
          fontWeight: 700,
          color: isActive ? 'success.dark' : 'grey.700',
          letterSpacing: 1,
        }}
      >
        TRACKING {status}
      </Typography>
    </Box>
  );
}
