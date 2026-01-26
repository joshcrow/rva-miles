'use client';

import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import { Trip, Vehicle } from '@/types';
import { generateId } from '@/lib/storage';
import { calculateRoute, RouteResult } from '@/lib/googleMaps';

interface ManualTripFormProps {
  open: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  defaultVehicleId: string;
  onSave: (trip: Trip) => void;
}

export default function ManualTripForm({
  open,
  onClose,
  vehicles,
  defaultVehicleId,
  onSave,
}: ManualTripFormProps) {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [distance, setDistance] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    if (open) {
      setVehicleId(defaultVehicleId);
    }
  }, [open, defaultVehicleId]);

  const resetForm = () => {
    setVehicleId(defaultVehicleId);
    setStartAddress('');
    setEndAddress('');
    setDistance('');
    setPurpose('');
    setTripDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    setRouteResult(null);
    setRouteError('');
  };

  const handleCalculateRoute = async () => {
    if (!startAddress.trim() || !endAddress.trim()) {
      setRouteError('Enter both start and end locations to calculate distance');
      return;
    }

    setIsCalculating(true);
    setRouteError('');
    setRouteResult(null);

    try {
      const result = await calculateRoute(startAddress.trim(), endAddress.trim());
      
      if (result) {
        setRouteResult(result);
        setDistance(result.distance.toFixed(1));
        setStartAddress(result.startAddress);
        setEndAddress(result.endAddress);
      } else {
        setRouteError('Could not calculate route. Check addresses or enter distance manually.');
      }
    } catch (error) {
      setRouteError('Error calculating route. Please enter distance manually.');
    } finally {
      setIsCalculating(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!vehicleId) {
      newErrors.vehicleId = 'Please select a vehicle';
    }
    if (!startAddress.trim()) {
      newErrors.startAddress = 'Start location is required';
    }
    if (!endAddress.trim()) {
      newErrors.endAddress = 'End location is required';
    }
    const distanceNum = parseFloat(distance);
    if (!distance || isNaN(distanceNum) || distanceNum <= 0) {
      newErrors.distance = 'Calculate or enter a valid distance';
    }
    if (!tripDate) {
      newErrors.tripDate = 'Trip date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const tripDateTime = new Date(tripDate);
    tripDateTime.setHours(12, 0, 0, 0);

    const trip: Trip = {
      id: generateId(),
      vehicleId,
      startTime: tripDateTime.getTime(),
      endTime: tripDateTime.getTime() + 30 * 60 * 1000,
      startLocation: { lat: 0, lng: 0, timestamp: tripDateTime.getTime() },
      endLocation: { lat: 0, lng: 0, timestamp: tripDateTime.getTime() + 30 * 60 * 1000 },
      gpsPoints: [],
      distanceMiles: parseFloat(distance),
      purpose: purpose.trim(),
      status: 'completed',
      isManualEntry: true,
      startAddress: startAddress.trim(),
      endAddress: endAddress.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      routePolyline: routeResult?.polyline,
      routeBounds: routeResult?.bounds,
      estimatedRoute: !!routeResult,
    };

    onSave(trip);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '90vh',
          pb: 2,
        },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            width: 48,
            height: 5,
            bgcolor: 'action.disabled',
            borderRadius: 1,
            mx: 'auto',
            mb: 2.5,
          }}
        />

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Add Manual Trip
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter addresses and calculate the driving distance
        </Typography>

        <Stack spacing={2.5}>
          <TextField
            select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            error={!!errors.vehicleId}
            helperText={errors.vehicleId}
            fullWidth
          >
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            label="Trip Date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={!!errors.tripDate}
            helperText={errors.tripDate}
            fullWidth
          />

          <TextField
            label="Start Address"
            value={startAddress}
            onChange={(e) => {
              setStartAddress(e.target.value);
              setRouteResult(null);
            }}
            placeholder="e.g., 123 Main St, Richmond, VA"
            error={!!errors.startAddress}
            helperText={errors.startAddress}
            fullWidth
          />

          <TextField
            label="End Address"
            value={endAddress}
            onChange={(e) => {
              setEndAddress(e.target.value);
              setRouteResult(null);
            }}
            placeholder="e.g., 456 Oak Ave, Richmond, VA"
            error={!!errors.endAddress}
            helperText={errors.endAddress}
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={handleCalculateRoute}
            disabled={isCalculating || !startAddress.trim() || !endAddress.trim()}
            startIcon={isCalculating ? <CircularProgress size={18} /> : <RouteOutlinedIcon />}
          >
            {isCalculating ? 'Calculating...' : 'Calculate Distance'}
          </Button>

          {routeError && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {routeError}
            </Alert>
          )}

          {routeResult && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              Route found: {routeResult.distance.toFixed(1)} miles
            </Alert>
          )}

          <TextField
            label="Distance (miles)"
            type="number"
            inputProps={{ step: 0.1, min: 0.1 }}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            error={!!errors.distance}
            helperText={errors.distance || 'Calculated automatically or enter manually'}
            fullWidth
          />

          <TextField
            label="Purpose (optional)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Client meeting, Site visit"
            multiline
            rows={2}
            fullWidth
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSave}
            disabled={isCalculating}
          >
            Save Trip
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={handleClose}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
