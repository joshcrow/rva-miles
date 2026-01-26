'use client';

import { Snackbar, Alert, AlertColor } from '@mui/material';
import { useSnackbarStore } from '@/stores/snackbar';

export default function GlobalSnackbar() {
  const { open, message, severity, duration, hideSnackbar } = useSnackbarStore();

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 8 }}
    >
      <Alert
        onClose={hideSnackbar}
        severity={severity as AlertColor}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
