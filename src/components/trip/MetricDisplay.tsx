'use client';

import { Box, Typography } from '@mui/material';

interface MetricDisplayProps {
  label: string;
  value: string;
  unit?: string;
  variant?: 'time' | 'distance';
}

export default function MetricDisplay({ label, value, unit, variant = 'distance' }: MetricDisplayProps) {
  const minWidth = variant === 'time' ? 120 : 140;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          minWidth,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: '3rem',
            fontWeight: 700,
            lineHeight: 1,
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            component="span"
            variant="h5"
            color="text.secondary"
            sx={{ ml: 0.5 }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
