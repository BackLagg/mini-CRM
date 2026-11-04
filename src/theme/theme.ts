import { createTheme, type ThemeOptions } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'
export type ThemePreset = 'construction' | 'classic' | 'slate'

const presetPalettes: Record<
  ThemePreset,
  { light: ThemeOptions['palette']; dark: ThemeOptions['palette'] }
> = {
  construction: {
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
  },
  classic: {
    light: {
      mode: 'light',
      primary: { main: '#1565c0' },
      secondary: { main: '#00838f' },
      background: { default: '#f0f4f8', paper: '#ffffff' },
    },
    dark: {
      mode: 'dark',
      primary: { main: '#64b5f6' },
      secondary: { main: '#4dd0e1' },
      background: { default: '#0d1117', paper: '#161b22' },
    },
  },
  slate: {
    light: {
      mode: 'light',
      primary: { main: '#455a64' },
      secondary: { main: '#00897b' },
      background: { default: '#eceff1', paper: '#ffffff' },
    },
    dark: {
      mode: 'dark',
      primary: { main: '#78909c' },
      secondary: { main: '#26a69a' },
      background: { default: '#121212', paper: '#1e1e1e' },
    },
  },
}

export const PRESET_LABELS: Record<ThemePreset, string> = {
  construction: 'Стройка',
  classic: 'Классика',
  slate: 'Slate',
}

export function buildTheme(mode: ThemeMode, preset: ThemePreset) {
  const palette = presetPalettes[preset][mode]
  return createTheme({
    palette,
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
