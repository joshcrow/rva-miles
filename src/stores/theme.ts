import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaletteMode } from '@mui/material';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  mode: PaletteMode;
  setPreference: (pref: ThemePreference) => void;
  syncWithSystem: () => void;
}

const getSystemMode = (): PaletteMode => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      mode: 'light',
      setPreference: (pref) => set({ 
        preference: pref, 
        mode: pref === 'system' ? getSystemMode() : pref 
      }),
      syncWithSystem: () => {
        const { preference } = get();
        if (preference === 'system') {
          set({ mode: getSystemMode() });
        }
      },
    }),
    { 
      name: 'rva-miles-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.preference === 'system') {
          state.mode = getSystemMode();
        }
      },
    }
  )
);
