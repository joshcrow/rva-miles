'use client';

import { useState, useEffect } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useThemeStore } from '@/stores/theme';
import { useSnackbarStore } from '@/stores/snackbar';
import { getSettings, saveSettings, getStorageSizeMB } from '@/lib/storage';
import { clearAllData } from '@/lib/testData';

export default function SettingsPage() {
  const { mode, toggleMode } = useThemeStore();
  const { showSnackbar } = useSnackbarStore();
  const [settings, setLocalSettings] = useState(getSettings());
  const [irsRate, setIrsRate] = useState(settings.irsRate.toString());
  const [showDollarAmounts, setShowDollarAmounts] = useState(settings.showDollarAmounts);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageSize, setStorageSize] = useState(0);

  useEffect(() => {
    setStorageSize(getStorageSizeMB());
  }, []);

  const handleSaveIrsRate = () => {
    const rate = parseFloat(irsRate);
    if (isNaN(rate) || rate < 0.01 || rate > 2.0) {
      showSnackbar({ message: 'Rate must be between $0.01 and $2.00 per mile', severity: 'error' });
      return;
    }
    const newSettings = { ...settings, irsRate: rate, showDollarAmounts };
    saveSettings(newSettings);
    setLocalSettings(newSettings);
    showSnackbar({ message: 'Settings saved', severity: 'success' });
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

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleMode}
                />
              }
              label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              IRS Mileage Rate
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Rate ($/mile)"
                type="number"
                inputProps={{ step: 0.01, min: 0.01, max: 2.0 }}
                value={irsRate}
                onChange={(e) => setIrsRate(e.target.value)}
                helperText="Current IRS standard rate is $0.67/mile (2024)"
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showDollarAmounts}
                    onChange={(e) => setShowDollarAmounts(e.target.checked)}
                  />
                }
                label="Show dollar amounts"
              />
              <Button variant="contained" onClick={handleSaveIrsRate}>
                Save Rate Settings
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Data Management</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Storage Used
                </Typography>
                <Typography variant="h6">
                  {storageSize.toFixed(2)} MB / 5 MB
                </Typography>
              </Box>
              <Divider />
              <Button variant="outlined" onClick={handleBackupData} fullWidth>
                Export Backup
              </Button>
              <Button variant="outlined" onClick={handleRestoreData} fullWidth>
                Restore from Backup
              </Button>
              <Divider />
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setShowClearConfirm(true)}
                fullWidth
              >
                Clear All Trips
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowResetConfirm(true)}
                fullWidth
              >
                Reset All Data
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" align="center">
              RVA Miles v0.1.0
              <br />
              Built with Material UI
            </Typography>
          </CardContent>
        </Card>
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
