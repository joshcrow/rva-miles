'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Collapse,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import { Trip, Vehicle } from '@/types';
import { reverseGeocodeWithCache } from '@/lib/googleMaps';

interface TripHistoryProps {
  trips: Trip[];
  vehicles: Vehicle[];
  onUpdateTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface TripCardProps {
  trip: Trip;
  vehicle: Vehicle | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

function TripCard({ trip, vehicle, onEdit, onDelete }: TripCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [startAddrDisplay, setStartAddrDisplay] = useState<string | null>(null);
  const [endAddrDisplay, setEndAddrDisplay] = useState<string | null>(null);

  useEffect(() => {
    // Only reverse geocode when expanded and no address is stored
    if (expanded) {
      if (!trip.startAddress && trip.startLocation && trip.startLocation.lat !== 0) {
        reverseGeocodeWithCache(trip.startLocation.lat, trip.startLocation.lng)
          .then(addr => setStartAddrDisplay(addr ? `Near ${addr}` : null));
      }
      if (!trip.endAddress && trip.endLocation && trip.endLocation.lat !== 0) {
        reverseGeocodeWithCache(trip.endLocation.lat, trip.endLocation.lng)
          .then(addr => setEndAddrDisplay(addr ? `Near ${addr}` : null));
      }
    }
  }, [expanded, trip]);

  const getStartDisplay = () => {
    if (trip.startAddress) return trip.startAddress;
    if (startAddrDisplay) return startAddrDisplay;
    if (trip.startLocation && trip.startLocation.lat !== 0) {
      return `${trip.startLocation.lat.toFixed(4)}, ${trip.startLocation.lng.toFixed(4)}`;
    }
    return 'Unknown';
  };

  const getEndDisplay = () => {
    if (trip.endAddress) return trip.endAddress;
    if (endAddrDisplay) return endAddrDisplay;
    if (trip.endLocation && trip.endLocation.lat !== 0) {
      return `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}`;
    }
    return 'Unknown';
  };

  return (
    <Card>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" fontWeight={600}>
                {trip.distanceMiles.toFixed(1)} mi
              </Typography>
              {trip.isManualEntry && (
                <Chip label="Manual" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatDate(trip.startTime)}
              {trip.endTime && ` • ${formatTime(trip.startTime)}`}
            </Typography>
            {trip.purpose && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {trip.purpose}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={onEdit} sx={{ color: 'text.secondary' }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ mt: 1, color: 'text.secondary', p: 0, minWidth: 'auto' }}
        >
          {expanded ? 'Less' : 'Details'}
        </Button>

        <Collapse in={expanded}>
          <Stack spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {vehicle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsCarOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {vehicle.name}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">From</Typography>
              <Typography variant="body2">
                {getStartDisplay()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">To</Typography>
              <Typography variant="body2">
                {getEndDisplay()}
              </Typography>
            </Box>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function TripHistory({
  trips,
  vehicles,
  onUpdateTrip,
  onDeleteTrip,
}: TripHistoryProps) {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editDistance, setEditDistance] = useState('');

  const handleEditClick = (trip: Trip) => {
    setEditingTrip(trip);
    setEditPurpose(trip.purpose || '');
    setEditDistance(trip.distanceMiles.toFixed(1));
  };

  const handleSaveEdit = () => {
    if (!editingTrip) return;

    const distanceNum = parseFloat(editDistance);
    if (isNaN(distanceNum) || distanceNum <= 0) return;

    const updatedTrip: Trip = {
      ...editingTrip,
      purpose: editPurpose.trim(),
      distanceMiles: distanceNum,
      updatedAt: Date.now(),
    };

    onUpdateTrip(updatedTrip);
    setEditingTrip(null);
  };

  const handleConfirmDelete = () => {
    if (deletingTripId) {
      onDeleteTrip(deletingTripId);
      setDeletingTripId(null);
    }
  };

  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);

  // Sort trips by date, most recent first
  const sortedTrips = [...trips].sort((a, b) => b.startTime - a.startTime);

  if (trips.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No trips recorded yet</Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        {sortedTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            vehicle={getVehicle(trip.vehicleId)}
            onEdit={() => handleEditClick(trip)}
            onDelete={() => setDeletingTripId(trip.id)}
          />
        ))}
      </Stack>

      {/* Edit Dialog */}
      <Dialog open={!!editingTrip} onClose={() => setEditingTrip(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Trip</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Distance (miles)"
              type="number"
              inputProps={{ step: 0.1, min: 0.1 }}
              value={editDistance}
              onChange={(e) => setEditDistance(e.target.value)}
              fullWidth
            />
            <TextField
              label="Purpose"
              value={editPurpose}
              onChange={(e) => setEditPurpose(e.target.value)}
              placeholder="e.g., Client meeting"
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTrip(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTripId} onClose={() => setDeletingTripId(null)}>
        <DialogTitle>Delete Trip?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this trip? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingTripId(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
