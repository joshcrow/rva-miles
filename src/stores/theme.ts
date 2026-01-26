import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaletteMode } from '@mui/material';

interface ThemeState {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),
    }),
    { name: 'rva-miles-theme' }
  )
);
