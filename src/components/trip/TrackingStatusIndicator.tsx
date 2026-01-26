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
        borderRadius: 2,
        bgcolor: isActive 
          ? (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
          : 'action.disabledBackground',
        border: 2,
        borderColor: isActive ? 'success.main' : 'divider',
      }}
    >
      <FiberManualRecordIcon
        sx={{
          color: isActive ? 'success.main' : 'text.disabled',
          fontSize: 14,
          animation: isActive ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 },
          },
        }}
      />
      <Typography
        variant="body1"
        component="span"
        sx={{
          fontWeight: 700,
          color: isActive ? 'success.main' : 'text.secondary',
          letterSpacing: '0.05em',
          fontSize: '0.875rem',
        }}
      >
        TRACKING {status}
      </Typography>
    </Box>
  );
}
