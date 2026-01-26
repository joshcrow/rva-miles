import { create } from 'zustand';

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  duration: number;
  showSnackbar: (params: {
    message: string;
    severity?: SnackbarSeverity;
    duration?: number;
  }) => void;
  hideSnackbar: () => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  duration: 4000,
  showSnackbar: ({ message, severity = 'info', duration = 4000 }) =>
    set({
      open: true,
      message,
      severity,
      duration,
    }),
  hideSnackbar: () => set({ open: false }),
}));
