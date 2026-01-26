'use client';

import { Box, Button, Typography } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import TrackingStatusIndicator from './TrackingStatusIndicator';
import MetricDisplay from './MetricDisplay';
import { Trip } from '@/types';

interface DriverModeCockpitProps {
  activeTrip: Trip;
  elapsedTime: number;
  distance: number;
  gpsPointCount: number;
  accuracy?: number;
  vehicleName?: string;
  onStop: () => void;
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function DriverModeCockpit({
  activeTrip,
  elapsedTime,
  distance,
  gpsPointCount,
  accuracy,
  vehicleName,
  onStop,
}: DriverModeCockpitProps) {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <TrackingStatusIndicator status="ON" />

      <Box
        sx={{
          display: 'flex',
          gap: 6,
          mt: 6,
          mb: 4,
        }}
      >
        <MetricDisplay
          label="Distance"
          value={distance.toFixed(1)}
          unit="mi"
          variant="distance"
        />
        <MetricDisplay
          label="Time"
          value={formatElapsedTime(elapsedTime)}
          variant="time"
        />
      </Box>

      {vehicleName && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {vehicleName}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mb: 4 }}>
        {gpsPointCount} GPS points
        {accuracy && ` (±${Math.round(accuracy)}m)`}
      </Typography>

      <Button
        variant="contained"
        color="error"
        size="large"
        startIcon={<StopIcon />}
        onClick={onStop}
        sx={{
          minHeight: 60,
          minWidth: 240,
          fontSize: '1.125rem',
        }}
      >
        Stop Trip
      </Button>
    </Box>
  );
}
