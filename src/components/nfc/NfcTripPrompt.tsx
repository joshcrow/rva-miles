'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
  Stack,
  Box,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { Vehicle } from '@/types';

interface NfcTripPromptProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onBusiness: () => void;
}

export default function NfcTripPrompt({ open, onClose, vehicle, onBusiness }: NfcTripPromptProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3 } },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        Starting a drive
      </DialogTitle>
      <DialogContent>
        {vehicle && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            {vehicle.name}
          </Typography>
        )}

        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<WorkOutlineIcon />}
            onClick={onBusiness}
            sx={{ py: 1.5 }}
          >
            Business — Track It
          </Button>

          <Button
            variant="text"
            size="large"
            fullWidth
            onClick={onClose}
            sx={{ color: 'text.secondary' }}
          >
            Personal — Skip
          </Button>
        </Stack>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Dismissing this prompt assumes personal
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
