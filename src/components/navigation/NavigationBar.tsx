'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTrackingStore } from '@/stores/tracking';

const routes = [
  { value: '/', label: 'Home', icon: <HomeIcon /> },
  { value: '/vehicles', label: 'Vehicles', icon: <DirectionsCarIcon /> },
  { value: '/export', label: 'Export', icon: <DownloadIcon /> },
  { value: '/reports', label: 'Reports', icon: <AssessmentIcon /> },
  { value: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

export default function NavigationBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isTracking = useTrackingStore((state) => state.isTracking);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const handleNavigation = (newValue: string) => {
    if (isTracking && newValue !== '/') {
      setPendingNavigation(newValue);
    } else {
      router.push(newValue);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setPendingNavigation(null);
  };

  return (
    <>
      <BottomNavigation
        value={pathname}
        onChange={(_, newValue) => handleNavigation(newValue)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: 1,
          borderColor: 'divider',
          opacity: isTracking ? 0.6 : 1,
          transition: 'opacity 0.3s',
          zIndex: 1000,
          height: 64,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        {routes.map((route) => (
          <BottomNavigationAction
            key={route.value}
            label={route.label}
            value={route.value}
            icon={route.icon}
            sx={{ minWidth: 64 }}
          />
        ))}
      </BottomNavigation>

      <Dialog open={!!pendingNavigation} onClose={handleCancelNavigation}>
        <DialogTitle>Active Trip Warning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have an active trip. Navigating away will not stop tracking. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNavigation}>Cancel</Button>
          <Button onClick={handleConfirmNavigation} variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
