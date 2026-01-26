'use client';

import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';

interface StopTripSheetProps {
  open: boolean;
  onClose: () => void;
  distance: number;
  onSave: (adjustedDistance: number, purpose: string) => void;
  onDiscard: () => void;
}

export default function StopTripSheet({
  open,
  onClose,
  distance,
  onSave,
  onDiscard,
}: StopTripSheetProps) {
  const [adjustedDistance, setAdjustedDistance] = useState(distance.toFixed(2));
  const [purpose, setPurpose] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleSave = () => {
    const finalDistance = parseFloat(adjustedDistance) || distance;
    onSave(finalDistance, purpose.trim());
    setPurpose('');
    setAdjustedDistance(distance.toFixed(2));
  };

  const handleDiscardClick = () => {
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onDiscard();
    setPurpose('');
    setAdjustedDistance(distance.toFixed(2));
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
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
            Trip Summary
          </Typography>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                GPS Distance
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {distance.toFixed(1)} mi
              </Typography>
            </Box>

            <TextField
              label="Adjust Distance (miles)"
              type="number"
              inputProps={{ step: 0.1, min: 0 }}
              value={adjustedDistance}
              onChange={(e) => setAdjustedDistance(e.target.value)}
              helperText="Adjust if GPS was inaccurate"
              fullWidth
            />

            <TextField
              label="Trip Purpose (optional)"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Client meeting, Site visit"
              multiline
              rows={2}
              fullWidth
            />

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleSave}
            >
              Save Trip
            </Button>

            <Button
              variant="text"
              color="error"
              fullWidth
              onClick={handleDiscardClick}
            >
              Discard Trip
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Dialog
        open={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
      >
        <DialogTitle>Discard Trip?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to discard this trip? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiscardConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmDiscard} color="error" variant="contained">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
