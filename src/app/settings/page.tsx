'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  LinearProgress,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/stores/theme';
import { useSnackbarStore } from '@/stores/snackbar';
import { getSettings, saveSettings, getStorageSizeMB } from '@/lib/storage';
import { clearAllData, addTestData, getTestDataSummary } from '@/lib/testData';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: 'text.secondary',
        fontWeight: 600,
        letterSpacing: '0.1em',
        px: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { preference, setPreference, syncWithSystem } = useThemeStore();
  const { showSnackbar } = useSnackbarStore();
  
  const [settings, setLocalSettings] = useState(getSettings());
  const [irsRate, setIrsRate] = useState(settings.irsRate.toString());
  const [showDollarAmounts, setShowDollarAmounts] = useState(settings.showDollarAmounts);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageSize, setStorageSize] = useState(0);
  const [tripSummary, setTripSummary] = useState({ totalTrips: 0, totalMiles: 0, dateRange: 'No trips' });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => syncWithSystem();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [syncWithSystem]);

  useEffect(() => {
    setStorageSize(getStorageSizeMB());
    setTripSummary(getTestDataSummary());
  }, []);

  // Auto-save IRS rate with debounce
  const saveRateSettings = useCallback((rate: number, showDollars: boolean) => {
    const newSettings = { ...getSettings(), irsRate: rate, showDollarAmounts: showDollars };
    saveSettings(newSettings);
    setLocalSettings(newSettings);
  }, []);

  useEffect(() => {
    const rate = parseFloat(irsRate);
    if (!isNaN(rate) && rate >= 0.01 && rate <= 2.0) {
      const timer = setTimeout(() => {
        saveRateSettings(rate, showDollarAmounts);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [irsRate, showDollarAmounts, saveRateSettings]);

  const handleShowDollarAmountsChange = (checked: boolean) => {
    setShowDollarAmounts(checked);
    const rate = parseFloat(irsRate);
    if (!isNaN(rate) && rate >= 0.01 && rate <= 2.0) {
      saveRateSettings(rate, checked);
    }
  };

  const handleClearTrips = () => {
    clearAllData();
    setStorageSize(getStorageSizeMB());
    setShowClearConfirm(false);
    showSnackbar({ message: 'All trip data cleared', severity: 'success' });
  };

  const handleResetAll = () => {
    localStorage.clear();
    setShowResetConfirm(false);
    window.location.reload();
  };

  const handleBackupData = () => {
    const data = {
      trips: localStorage.getItem('rva-miles-trips'),
      vehicles: localStorage.getItem('rva-miles-vehicles'),
      settings: localStorage.getItem('rva-miles-settings'),
      savedPlaces: localStorage.getItem('rva-miles-saved-places'),
      templates: localStorage.getItem('rva-miles-trip-templates'),
      categories: localStorage.getItem('rva-miles-trip-categories'),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rva-miles-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSnackbar({ message: 'Backup downloaded', severity: 'success' });
  };

  const handleRestoreData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.trips) localStorage.setItem('rva-miles-trips', data.trips);
          if (data.vehicles) localStorage.setItem('rva-miles-vehicles', data.vehicles);
          if (data.settings) localStorage.setItem('rva-miles-settings', data.settings);
          if (data.savedPlaces) localStorage.setItem('rva-miles-saved-places', data.savedPlaces);
          if (data.templates) localStorage.setItem('rva-miles-trip-templates', data.templates);
          if (data.categories) localStorage.setItem('rva-miles-trip-categories', data.categories);
          showSnackbar({ message: 'Data restored successfully', severity: 'success' });
          window.location.reload();
        } catch {
          showSnackbar({ message: 'Failed to restore data. Invalid backup file.', severity: 'error' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const storagePercent = (storageSize / 5) * 100;

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Stack spacing={3}>
        {/* PREFERENCES SECTION */}
        <Box>
          <SectionLabel>Preferences</SectionLabel>
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <Card 
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => router.push('/vehicles')}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DirectionsCarIcon color="primary" />
                  <Box>
                    <Typography variant="body1" fontWeight={500}>Vehicles</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage your vehicles
                    </Typography>
                  </Box>
                </Box>
                <ChevronRightIcon color="action" />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Appearance
                </Typography>
                <ToggleButtonGroup
                  value={preference}
                  exclusive
                  onChange={(_, value) => value && setPreference(value)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="light">Light</ToggleButton>
                  <ToggleButton value="system">System</ToggleButton>
                  <ToggleButton value="dark">Dark</ToggleButton>
                </ToggleButtonGroup>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  IRS Mileage Rate
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Rate ($/mile)"
                    type="number"
                    inputProps={{ step: 0.01, min: 0.01, max: 2.0 }}
                    value={irsRate}
                    onChange={(e) => setIrsRate(e.target.value)}
                    helperText="2024 IRS standard: $0.67/mile"
                    size="small"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showDollarAmounts}
                        onChange={(e) => handleShowDollarAmountsChange(e.target.checked)}
                      />
                    }
                    label="Show dollar amounts"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* DATA SECTION */}
        <Box>
          <SectionLabel>Data</SectionLabel>
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <Card>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Storage Used
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {storageSize.toFixed(2)} MB / 5 MB
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={storagePercent} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                    }} 
                  />
                </Box>
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" color="text.secondary">
                    {tripSummary.totalTrips} trips • {tripSummary.totalMiles} miles
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tripSummary.dateRange}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Button 
                    variant="outlined" 
                    onClick={handleBackupData} 
                    fullWidth
                    startIcon={<CloudDownloadOutlinedIcon />}
                    size="small"
                  >
                    Export
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleRestoreData} 
                    fullWidth
                    startIcon={<CloudUploadOutlinedIcon />}
                    size="small"
                  >
                    Restore
                  </Button>
                </Stack>
                <Button
                  variant="text"
                  size="small"
                  fullWidth
                  onClick={() => {
                    const count = addTestData(4);
                    setTripSummary(getTestDataSummary());
                    setStorageSize(getStorageSizeMB());
                    showSnackbar({ message: `Added ${count} test trips`, severity: 'success' });
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  Generate Test Data (4 weeks)
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* RESET SECTION */}
        <Box>
          <SectionLabel>Reset</SectionLabel>
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Button
                    variant="text"
                    color="warning"
                    onClick={() => setShowClearConfirm(true)}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Clear All Trips
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => setShowResetConfirm(true)}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Reset Everything
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* ABOUT */}
        <Typography variant="caption" color="text.secondary" align="center" sx={{ pt: 1 }}>
          RVA Miles v0.1.0
        </Typography>
      </Stack>

      <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <DialogTitle>Clear All Trips?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all trip data but keep your vehicles and settings. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
          <Button onClick={handleClearTrips} color="warning" variant="contained">
            Clear Trips
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
        <DialogTitle>Reset All Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete ALL data including vehicles, trips, and settings. You will need to set up the app again. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>Cancel</Button>
          <Button onClick={handleResetAll} color="error" variant="contained">
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
