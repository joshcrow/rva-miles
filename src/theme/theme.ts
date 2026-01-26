import { createTheme, Theme, PaletteMode } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    tracking: {
      active: string;
      stopped: string;
    };
  }
  interface PaletteOptions {
    tracking?: {
      active: string;
      stopped: string;
    };
  }
}

export function createAppTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#8B5CF6',
        light: '#A78BFA',
        dark: '#7C3AED',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#6B7280',
        light: '#9CA3AF',
        dark: '#4B5563',
      },
      error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#DC2626',
      },
      success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
      },
      warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
      },
      info: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
      },
      tracking: {
        active: '#10B981',
        stopped: '#EF4444',
      },
      background: {
        default: mode === 'light' ? '#FAFAF9' : '#18181B',
        paper: mode === 'light' ? '#FFFFFF' : '#27272A',
      },
      text: {
        primary: mode === 'light' ? '#18181B' : '#FAFAF9',
        secondary: mode === 'light' ? '#52525B' : '#A1A1AA',
      },
      divider: mode === 'light' ? '#E4E4E7' : '#3F3F46',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '0.875rem',
        fontWeight: 600,
      },
      body1: {
        fontSize: '1rem',
      },
      body2: {
        fontSize: '0.875rem',
      },
      button: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            minHeight: 48,
            fontWeight: 600,
            borderRadius: 12,
          },
          sizeLarge: {
            minHeight: 60,
            fontSize: '1.125rem',
          },
          sizeSmall: {
            minHeight: 36,
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 12,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: '16px 16px 0 0',
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 64,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 64,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
          },
        },
      },
    },
  });
}

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
