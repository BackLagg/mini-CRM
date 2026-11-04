import { createTheme, type ThemeOptions } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

const paletteByMode: Record<
  ThemeMode,
  ThemeOptions['palette']
> = {
  light: {
    mode: 'light',
    primary: { main: '#ef6c00' },
    secondary: { main: '#546e7a' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  dark: {
    mode: 'dark',
    primary: { main: '#ffb74d' },
    secondary: { main: '#90a4ae' },
    background: { default: '#1a1a1a', paper: '#2a2a2a' },
  },
}

export function buildTheme(mode: ThemeMode) {
  return createTheme({
    palette: paletteByMode[mode],
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0 },
      },
    },
  })
}

export const STATUS_CHIP_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
> = {
  new: 'info',
  in_progress: 'primary',
  in_review: 'warning',
  accepted: 'success',
  rework: 'error',
}
