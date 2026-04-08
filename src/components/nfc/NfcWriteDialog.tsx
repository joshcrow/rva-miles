'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import NfcIcon from '@mui/icons-material/Nfc';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Vehicle } from '@/types';
import { useNfc, NfcPayload } from '@/hooks/useNfc';

interface NfcWriteDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

type WriteState = 'ready' | 'waiting' | 'success' | 'error';

export default function NfcWriteDialog({ open, onClose, vehicle }: NfcWriteDialogProps) {
  const { isSupported, write } = useNfc();
  const [state, setState] = useState<WriteState>('ready');
  const [error, setError] = useState('');

  const handleWrite = useCallback(async () => {
    if (!vehicle) return;

    setState('waiting');
    setError('');

    const payload: NfcPayload = {
      app: 'rva-miles',
      type: 'vehicle',
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
    };

    try {
      await write(payload);
      setState('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write to NFC tag';
      if (message.includes('abort')) {
        setError('Timed out. Make sure the sticker is close to your phone.');
      } else {
        setError(message);
      }
      setState('error');
    }
  }, [vehicle, write]);

  const handleClose = () => {
    setState('ready');
    setError('');
    onClose();
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>NFC Not Available</DialogTitle>
        <DialogContent>
          <DialogContentText>
            NFC is only supported in Chrome on Android. Make sure you&apos;re using Chrome
            and that NFC is enabled in your phone settings.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>OK</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Program NFC Sticker
      </DialogTitle>
      <DialogContent>
        {state === 'ready' && (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Write <strong>{vehicle?.name}</strong> to an NFC sticker. Once programmed,
              tap the sticker to quickly start tracking a trip with this vehicle.
            </DialogContentText>
            <DialogContentText variant="body2" color="text.secondary">
              Place the sticker on your phone mount so it&apos;s scanned whenever you mount your phone.
            </DialogContentText>
          </>
        )}

        {state === 'waiting' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <NfcIcon sx={{ fontSize: 40, color: 'primary.main', display: 'block', mx: 'auto', mb: 1 }} />
            <Typography variant="body1" fontWeight={500}>
              Hold the sticker to the back of your phone
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Keep it still until writing completes...
            </Typography>
          </Box>
        )}

        {state === 'success' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
            <Typography variant="body1" fontWeight={500}>
              Sticker programmed!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tap this sticker anytime to start tracking with {vehicle?.name}.
            </Typography>
          </Box>
        )}

        {state === 'error' && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {state === 'ready' && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleWrite} variant="contained" startIcon={<NfcIcon />}>
              Write to Sticker
            </Button>
          </>
        )}
        {state === 'waiting' && (
          <Button onClick={handleClose}>Cancel</Button>
        )}
        {state === 'success' && (
          <Button onClick={handleClose} variant="contained">Done</Button>
        )}
        {state === 'error' && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleWrite} variant="contained">
              Try Again
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
