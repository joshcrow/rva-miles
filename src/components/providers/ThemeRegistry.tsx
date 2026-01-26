'use client';

import { useMemo, useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useThemeStore } from '@/stores/theme';
import { createAppTheme } from '@/theme/theme';
import AppShell from '@/components/layout/AppShell';

interface ThemeRegistryProps {
  children: React.ReactNode;
}

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const { mode } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}
