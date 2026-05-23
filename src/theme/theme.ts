import { createTheme, alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    gold: Palette['primary'];
  }
  interface PaletteOptions {
    gold?: PaletteOptions['primary'];
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C9A84C',
      light: '#E2C97E',
      dark: '#A07830',
      contrastText: '#0A0E1A',
    },
    secondary: {
      main: '#4361EE',
      light: '#6B80F5',
      dark: '#2D44C5',
    },
    background: {
      default: '#080C18',
      paper: '#0F1629',
    },
    gold: {
      main: '#C9A84C',
      light: '#E2C97E',
      dark: '#A07830',
      contrastText: '#0A0E1A',
    },
    error: { main: '#EF4444' },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    info: { main: '#3B82F6' },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
    divider: alpha('#C9A84C', 0.12),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #080C18 0%, #0D1528 50%, #080C18 100%)',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#C9A84C30 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#C9A84C40', borderRadius: 3 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(15,22,41,0.9) 0%, rgba(12,18,35,0.95) 100%)',
          border: '1px solid rgba(201,168,76,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, padding: '10px 24px' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #C9A84C 0%, #E2C97E 50%, #C9A84C 100%)',
          backgroundSize: '200% 100%',
          color: '#0A0E1A',
          fontWeight: 700,
          '&:hover': { backgroundPosition: '100% 0', boxShadow: '0 8px 24px rgba(201,168,76,0.4)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, height: 8, backgroundColor: 'rgba(201,168,76,0.15)' },
        bar: { background: 'linear-gradient(90deg, #C9A84C, #E2C97E)', borderRadius: 999 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': { borderColor: 'rgba(201,168,76,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(201,168,76,0.4)' },
            '&.Mui-focused fieldset': { borderColor: '#C9A84C' },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { background: '#1A2340', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, fontSize: 12 },
      },
    },
  },
});
