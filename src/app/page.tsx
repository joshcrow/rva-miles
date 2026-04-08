'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  MenuItem,
  TextField,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import NfcIcon from '@mui/icons-material/Nfc';
import { Trip, Vehicle, GpsPoint } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useNoSleep } from '@/hooks/useNoSleep';
import { usePlatform } from '@/hooks/usePlatform';
import { useNfc } from '@/hooks/useNfc';
import { useTrackingStore } from '@/stores/tracking';
import { useSnackbarStore } from '@/stores/snackbar';
import {
  getVehicles,
  getActiveTrip,
  saveActiveTrip,
  addTrip,
  getTrips,
  updateTrip,
  deleteTrip,
  generateId,
} from '@/lib/storage';
import { calculateTotalDistance } from '@/lib/geo';
import DriverModeCockpit from '@/components/trip/DriverModeCockpit';
import StopTripSheet from '@/components/trip/StopTripSheet';
import TrackingStatusIndicator from '@/components/trip/TrackingStatusIndicator';
import ManualTripForm from '@/components/trip/ManualTripForm';
import TripHistory from '@/components/trip/TripHistory';
import NfcTripPrompt from '@/components/nfc/NfcTripPrompt';

export default function HomePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [showIOSChecklist, setShowIOSChecklist] = useState(false);
  const [showManualTripForm, setShowManualTripForm] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [nfcPromptVehicle, setNfcPromptVehicle] = useState<Vehicle | null>(null);

  const { isIOS, isMobile } = usePlatform();
  const { setTracking } = useTrackingStore();
  const { showSnackbar } = useSnackbarStore();
  const {
    isSupported: nfcSupported,
    isScanning: nfcScanning,
    lastRead: nfcLastRead,
    startScan: startNfcScan,
    clearLastRead: clearNfcLastRead,
  } = useNfc();

  const {
    currentPosition,
    gpsPoints,
    isTracking,
    error: geoError,
    isSupported: geoSupported,
    startTracking,
    stopTracking,
    clearPoints,
  } = useGeolocation({ trackingInterval: 3000 });

  const {
    isSupported: wakeLockSupported,
    isActive: wakeLockActive,
    request: requestWakeLock,
    release: releaseWakeLock,
  } = useWakeLock();

  const {
    isEnabled: noSleepEnabled,
    enable: enableNoSleep,
    disable: disableNoSleep,
  } = useNoSleep();

  const screenKeptAwake = wakeLockActive || noSleepEnabled;

  useEffect(() => {
    const loadedVehicles = getVehicles();
    setVehicles(loadedVehicles);
    const defaultVehicle = loadedVehicles.find((v) => v.isDefault);
    if (defaultVehicle) {
      setSelectedVehicleId(defaultVehicle.id);
    } else if (loadedVehicles.length > 0) {
      setSelectedVehicleId(loadedVehicles[0].id);
    }

    setTrips(getTrips());

    const savedActiveTrip = getActiveTrip();
    if (savedActiveTrip) {
      setActiveTrip(savedActiveTrip);
      setTracking(true);
    }
  }, [setTracking]);

  // Auto-start NFC scanning when not tracking a trip
  useEffect(() => {
    if (nfcSupported && !activeTrip && !nfcScanning) {
      startNfcScan();
    }
  }, [nfcSupported, activeTrip, nfcScanning, startNfcScan]);

  // Handle NFC tag reads - show business/personal prompt
  useEffect(() => {
    if (!nfcLastRead || activeTrip) return;

    const matchedVehicle = vehicles.find((v) => v.id === nfcLastRead.vehicleId);
    if (matchedVehicle) {
      setSelectedVehicleId(matchedVehicle.id);
      setNfcPromptVehicle(matchedVehicle);
    } else {
      showSnackbar({
        message: `Vehicle "${nfcLastRead.vehicleName || 'unknown'}" not found. It may have been deleted.`,
        severity: 'warning',
      });
    }
    clearNfcLastRead();
  }, [nfcLastRead, vehicles, activeTrip, clearNfcLastRead, showSnackbar]);

  useEffect(() => {
    if (!activeTrip) return;
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - activeTrip.startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  useEffect(() => {
    if (activeTrip && isTracking) {
      const updatedTrip: Trip = {
        ...activeTrip,
        gpsPoints: gpsPoints,
        distanceMiles: calculateTotalDistance(gpsPoints),
        endLocation: currentPosition,
        updatedAt: Date.now(),
      };
      saveActiveTrip(updatedTrip);
      setActiveTrip(updatedTrip);
    }
  }, [gpsPoints, currentPosition]);

  const startTripTracking = useCallback(async () => {
    if (wakeLockSupported) {
      await requestWakeLock();
    }
    await enableNoSleep();
    clearPoints();
    startTracking();
    setTracking(true);

    setTimeout(() => {
      const startLocation: GpsPoint = currentPosition || {
        lat: 0,
        lng: 0,
        timestamp: Date.now(),
      };

      const newTrip: Trip = {
        id: generateId(),
        vehicleId: selectedVehicleId,
        startTime: Date.now(),
        endTime: null,
        startLocation,
        endLocation: null,
        gpsPoints: [],
        distanceMiles: 0,
        purpose: '',
        status: 'in-progress',
        isManualEntry: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setActiveTrip(newTrip);
      saveActiveTrip(newTrip);
    }, 1000);
  }, [
    selectedVehicleId,
    wakeLockSupported,
    requestWakeLock,
    enableNoSleep,
    clearPoints,
    startTracking,
    currentPosition,
    setTracking,
  ]);

  const handleStartTrip = useCallback(async () => {
    if (!selectedVehicleId) {
      showSnackbar({ message: 'Please select a vehicle first', severity: 'warning' });
      return;
    }
    if (!geoSupported) {
      showSnackbar({ message: 'Geolocation is not supported on this device', severity: 'error' });
      return;
    }
    if (isIOS && isMobile) {
      setShowIOSChecklist(true);
      return;
    }
    await startTripTracking();
  }, [selectedVehicleId, geoSupported, isIOS, isMobile, startTripTracking, showSnackbar]);

  const handleIOSChecklistConfirm = useCallback(async () => {
    setShowIOSChecklist(false);
    await startTripTracking();
  }, [startTripTracking]);

  const handleStopTrip = useCallback(() => {
    setShowStopSheet(true);
  }, []);

  const handleSaveTrip = useCallback(
    (adjustedDistance: number, purpose: string) => {
      if (!activeTrip) return;

      const finalPoints = stopTracking();
      releaseWakeLock();
      disableNoSleep();
      setTracking(false);

      const completedTrip: Trip = {
        ...activeTrip,
        endTime: Date.now(),
        endLocation: currentPosition || finalPoints[finalPoints.length - 1] || null,
        gpsPoints: finalPoints,
        distanceMiles: adjustedDistance,
        purpose,
        status: 'completed',
        updatedAt: Date.now(),
      };

      const updatedTrips = addTrip(completedTrip);
      setTrips(updatedTrips);
      saveActiveTrip(null);
      setActiveTrip(null);
      setShowStopSheet(false);
      setElapsedTime(0);
      showSnackbar({ message: 'Trip saved!', severity: 'success' });
    },
    [activeTrip, stopTracking, releaseWakeLock, disableNoSleep, currentPosition, setTracking, showSnackbar]
  );

  const handleDiscardTrip = useCallback(() => {
    stopTracking();
    releaseWakeLock();
    disableNoSleep();
    setTracking(false);
    saveActiveTrip(null);
    setActiveTrip(null);
    setShowStopSheet(false);
    setElapsedTime(0);
    showSnackbar({ message: 'Trip discarded', severity: 'info' });
  }, [stopTracking, releaseWakeLock, disableNoSleep, setTracking, showSnackbar]);

  const handleNfcBusiness = useCallback(async () => {
    setNfcPromptVehicle(null);
    if (!geoSupported) {
      showSnackbar({ message: 'Geolocation is not supported on this device', severity: 'error' });
      return;
    }
    if (isIOS && isMobile) {
      setShowIOSChecklist(true);
      return;
    }
    await startTripTracking();
  }, [geoSupported, isIOS, isMobile, startTripTracking, showSnackbar]);

  const handleNfcDismiss = useCallback(() => {
    setNfcPromptVehicle(null);
  }, []);

  const handleSaveManualTrip = useCallback((trip: Trip) => {
    const updatedTrips = addTrip(trip);
    setTrips(updatedTrips);
    showSnackbar({ message: 'Manual trip saved!', severity: 'success' });
  }, [showSnackbar]);

  const handleUpdateTrip = useCallback((trip: Trip) => {
    const updatedTrips = updateTrip(trip);
    setTrips(updatedTrips);
    showSnackbar({ message: 'Trip updated', severity: 'success' });
  }, [showSnackbar]);

  const handleDeleteTrip = useCallback((tripId: string) => {
    const updatedTrips = deleteTrip(tripId);
    setTrips(updatedTrips);
    showSnackbar({ message: 'Trip deleted', severity: 'success' });
  }, [showSnackbar]);

  const currentDistance = calculateTotalDistance(gpsPoints);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  if (activeTrip) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {isIOS && !screenKeptAwake && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500}>
              Keep your screen on
            </Typography>
            <Typography variant="caption">
              iOS may pause tracking if the screen locks. Keep the app visible.
            </Typography>
          </Alert>
        )}

        {geoError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {geoError}
          </Alert>
        )}

        <DriverModeCockpit
          activeTrip={activeTrip}
          elapsedTime={elapsedTime}
          distance={currentDistance}
          gpsPointCount={gpsPoints.length}
          accuracy={currentPosition?.accuracy}
          vehicleName={selectedVehicle?.name}
          onStop={handleStopTrip}
        />

        <StopTripSheet
          open={showStopSheet}
          onClose={() => setShowStopSheet(false)}
          distance={currentDistance}
          onSave={handleSaveTrip}
          onDiscard={handleDiscardTrip}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Drive
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <TrackingStatusIndicator status="OFF" />

          <Typography variant="h4" sx={{ mt: 3, mb: 2.5 }}>
            Start a Trip
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              select
              label="Select Vehicle"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              fullWidth
            >
              {vehicles.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>

            {geoError && (
              <Alert severity="error">{geoError}</Alert>
            )}

            {!geoSupported && (
              <Alert severity="warning">
                Geolocation is not supported. You can still add trips manually.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartTrip}
              disabled={!selectedVehicleId || !geoSupported}
            >
              Start Trip
            </Button>

            {isIOS && isMobile && (
              <Typography variant="caption" color="text.secondary">
                You'll see a quick checklist before starting to ensure accurate tracking.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Button
        variant="text"
        fullWidth
        startIcon={<EditNoteOutlinedIcon />}
        onClick={() => setShowManualTripForm(true)}
        sx={{ mt: 2, color: 'text.secondary' }}
      >
        Add Manual Trip
      </Button>

      {nfcSupported && nfcScanning && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1 }}>
          <NfcIcon sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" color="success.main">
            NFC ready — tap your sticker to start
          </Typography>
        </Box>
      )}

      <ManualTripForm
        open={showManualTripForm}
        onClose={() => setShowManualTripForm(false)}
        vehicles={vehicles}
        defaultVehicleId={selectedVehicleId}
        onSave={handleSaveManualTrip}
      />

      <NfcTripPrompt
        open={!!nfcPromptVehicle}
        onClose={handleNfcDismiss}
        vehicle={nfcPromptVehicle}
        onBusiness={handleNfcBusiness}
      />

      {trips.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Trips
          </Typography>
          <TripHistory
            trips={trips.slice(0, 10)}
            vehicles={vehicles}
            onUpdateTrip={handleUpdateTrip}
            onDeleteTrip={handleDeleteTrip}
          />
        </Box>
      )}

      <Dialog open={showIOSChecklist} onClose={() => setShowIOSChecklist(false)}>
        <DialogTitle>Before You Start</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            iOS limits background GPS tracking. For best results:
          </DialogContentText>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Plug in your phone</li>
            <li>Keep screen visible</li>
            <li>Optional: Set Auto-Lock to Never in Settings</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIOSChecklist(false)}>Cancel</Button>
          <Button onClick={handleIOSChecklistConfirm} variant="contained">
            Start Trip
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
