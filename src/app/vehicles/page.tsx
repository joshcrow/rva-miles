'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Stack,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import NfcIcon from '@mui/icons-material/Nfc';
import { useRouter } from 'next/navigation';
import { Vehicle } from '@/types';
import {
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  generateId,
} from '@/lib/storage';
import { useSnackbarStore } from '@/stores/snackbar';
import NfcWriteDialog from '@/components/nfc/NfcWriteDialog';

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nfcVehicle, setNfcVehicle] = useState<Vehicle | null>(null);
  const { showSnackbar } = useSnackbarStore();

  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    year: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setVehicles(getVehicles());
  }, []);

  const resetForm = () => {
    setFormData({ name: '', make: '', model: '', year: '' });
    setFormError('');
    setEditingVehicle(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setFormError('Vehicle name is required');
      return;
    }

    if (editingVehicle) {
      const updated: Vehicle = {
        ...editingVehicle,
        name: formData.name.trim(),
        make: formData.make.trim() || '',
        model: formData.model.trim() || '',
        year: formData.year ? parseInt(formData.year) : 0,
      };
      const updatedList = updateVehicle(updated);
      setVehicles(updatedList);
      showSnackbar({ message: 'Vehicle updated', severity: 'success' });
    } else {
      const newVehicle: Vehicle = {
        id: generateId(),
        name: formData.name.trim(),
        make: formData.make.trim() || '',
        model: formData.model.trim() || '',
        year: formData.year ? parseInt(formData.year) : 0,
        isDefault: vehicles.length === 0,
        createdAt: Date.now(),
      };
      const updatedList = addVehicle(newVehicle);
      setVehicles(updatedList);
      showSnackbar({ message: 'Vehicle added', severity: 'success' });
    }

    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;

    if (vehicles.length === 1) {
      showSnackbar({ message: 'Cannot delete the only vehicle', severity: 'error' });
      return;
    }

    if (vehicle.isDefault) {
      showSnackbar({ message: 'Set another vehicle as default before deleting', severity: 'error' });
      return;
    }

    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      const updatedList = deleteVehicle(deleteConfirmId);
      setVehicles(updatedList);
      showSnackbar({ message: 'Vehicle deleted', severity: 'success' });
      setDeleteConfirmId(null);
    }
  };

  const handleSetDefault = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle && !vehicle.isDefault) {
      const updated = { ...vehicle, isDefault: true };
      const updatedList = updateVehicle(updated);
      setVehicles(updatedList);
      showSnackbar({ message: `${vehicle.name} set as default`, severity: 'success' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton 
          onClick={() => router.push('/settings')} 
          sx={{ ml: -1 }}
          aria-label="Back to settings"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h2">
          Vehicles
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ mb: 3 }}>
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="div">
                  {vehicle.name}
                </Typography>
                {vehicle.isDefault && (
                  <Chip
                    icon={<StarIcon />}
                    label="Default"
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              {(vehicle.make || vehicle.model || vehicle.year) && (
                <Typography variant="body2" color="text.secondary">
                  {[vehicle.year, vehicle.make, vehicle.model]
                    .filter(Boolean)
                    .join(' ')}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ px: 2.5, pb: 2, pt: 0, gap: 1, flexWrap: 'wrap' }}>
              {!vehicle.isDefault && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<StarOutlineIcon />}
                  onClick={() => handleSetDefault(vehicle.id)}
                >
                  Set Default
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<NfcIcon />}
                onClick={() => setNfcVehicle(vehicle)}
              >
                NFC Sticker
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="text"
                startIcon={<EditOutlinedIcon />}
                onClick={() => handleEdit(vehicle)}
                sx={{ minWidth: 'auto', color: 'text.secondary' }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => handleDelete(vehicle.id)}
                color="error"
                sx={{ minWidth: 'auto' }}
              >
                Delete
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      {!showForm ? (
        <Button
          variant="contained"
          fullWidth
          onClick={() => setShowForm(true)}
        >
          Add Vehicle
        </Button>
      ) : (
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Vehicle Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formError}
              helperText={formError}
              required
              fullWidth
            />
            <TextField
              label="Make"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              fullWidth
            />
            <TextField
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              fullWidth
            />
            <TextField
              label="Year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={resetForm} fullWidth>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSubmit} fullWidth>
                {editingVehicle ? 'Save' : 'Add'}
              </Button>
            </Box>
          </Stack>
        </Card>
      )}

      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Vehicle?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this vehicle? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <NfcWriteDialog
        open={!!nfcVehicle}
        onClose={() => setNfcVehicle(null)}
        vehicle={nfcVehicle}
      />
    </Container>
  );
}
