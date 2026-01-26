import { createTheme, Theme, PaletteMode } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    tracking: {
      active: string;
      stopped: string;
    };
    neutral: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    tracking?: {
      active: string;
      stopped: string;
    };
    neutral?: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  }
}

// Design tokens
const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  cardHover: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
  elevated: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
} as const;

export function createAppTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#7C3AED' : '#8B5CF6',
        light: isDark ? '#A78BFA' : '#A78BFA',
        dark: isDark ? '#6D28D9' : '#7C3AED',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#9CA3AF' : '#6B7280',
        light: isDark ? '#D1D5DB' : '#9CA3AF',
        dark: isDark ? '#6B7280' : '#4B5563',
      },
      error: {
        main: isDark ? '#F87171' : '#EF4444',
        light: isDark ? '#FCA5A5' : '#F87171',
        dark: isDark ? '#EF4444' : '#DC2626',
      },
      success: {
        main: isDark ? '#34D399' : '#10B981',
        light: isDark ? '#6EE7B7' : '#34D399',
        dark: isDark ? '#10B981' : '#059669',
      },
      warning: {
        main: isDark ? '#FBBF24' : '#F59E0B',
        light: isDark ? '#FCD34D' : '#FBBF24',
        dark: isDark ? '#F59E0B' : '#D97706',
      },
      info: {
        main: isDark ? '#60A5FA' : '#3B82F6',
        light: isDark ? '#93C5FD' : '#60A5FA',
        dark: isDark ? '#3B82F6' : '#2563EB',
      },
      tracking: {
        active: isDark ? '#34D399' : '#10B981',
        stopped: isDark ? '#F87171' : '#EF4444',
      },
      neutral: {
        main: isDark ? '#3F3F46' : '#E4E4E7',
        light: isDark ? '#52525B' : '#F4F4F5',
        dark: isDark ? '#27272A' : '#D4D4D8',
        contrastText: isDark ? '#FAFAF9' : '#18181B',
      },
      background: {
        default: isDark ? '#18181B' : '#FAFAF9',
        paper: isDark ? '#27272A' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#FAFAF9' : '#18181B',
        secondary: isDark ? '#A1A1AA' : '#52525B',
      },
      divider: isDark ? '#3F3F46' : '#E4E4E7',
      action: {
        hover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        selected: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        disabled: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)',
        disabledBackground: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      },
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
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.125rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '0.9375rem',
        fontWeight: 600,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.4,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
    },
    shape: {
      borderRadius: radius.md,
    },
    shadows: [
      'none',
      shadows.card,
      shadows.card,
      shadows.cardHover,
      shadows.cardHover,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
      shadows.elevated,
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            minHeight: 48,
            fontWeight: 600,
            borderRadius: radius.md,
            transition: 'all 0.2s ease',
          },
          sizeLarge: {
            minHeight: 56,
            fontSize: '1rem',
            borderRadius: radius.lg,
            padding: '12px 24px',
          },
          sizeSmall: {
            minHeight: 36,
            borderRadius: radius.sm,
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: radius.sm,
            transition: 'all 0.2s ease',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radius.lg,
            boxShadow: shadows.card,
            transition: 'box-shadow 0.2s ease',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': {
              paddingBottom: 20,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: radius.lg,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radius.xl,
            boxShadow: shadows.elevated,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: `${radius.xl}px ${radius.xl}px 0 0`,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
          },
          standardWarning: {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
          },
          standardError: {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radius.sm,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: radius.sm,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
          },
          grouped: {
            '&:not(:first-of-type)': {
              borderRadius: radius.sm,
              marginLeft: 4,
            },
            '&:first-of-type': {
              borderRadius: radius.sm,
            },
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
            transition: 'color 0.2s ease',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            boxShadow: shadows.elevated,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: radius.lg,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
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
