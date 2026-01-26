'use client';

import { Box } from '@mui/material';
import NavigationBar from '@/components/navigation/NavigationBar';
import GlobalSnackbar from '@/components/feedback/GlobalSnackbar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: 10,
      }}
    >
      {children}
      <NavigationBar />
      <GlobalSnackbar />
    </Box>
  );
}
