import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider } from '@mui/material/styles'

import {
  buildTheme,
  type ThemeMode,
  type ThemePreset,
} from '@/theme/theme'

const MODE_KEY = 'crm-theme-mode'
const PRESET_KEY = 'crm-theme-preset'

interface ThemeContextValue {
  mode: ThemeMode
  preset: ThemePreset
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  setPreset: (preset: ThemePreset) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readMode(): ThemeMode {
  const v = localStorage.getItem(MODE_KEY)
  return v === 'dark' ? 'dark' : 'light'
}

function readPreset(): ThemePreset {
  const v = localStorage.getItem(PRESET_KEY)
  if (v === 'construction' || v === 'classic' || v === 'slate') return v
  return 'construction'
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readMode())
  const [preset, setPresetState] = useState<ThemePreset>(() => readPreset())

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(MODE_KEY, m)
    setModeState(m)
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light')
  }, [mode, setMode])

  const setPreset = useCallback((p: ThemePreset) => {
    localStorage.setItem(PRESET_KEY, p)
    setPresetState(p)
  }, [])

  const theme = useMemo(() => buildTheme(mode, preset), [mode, preset])

  const value = useMemo(
    () => ({ mode, preset, setMode, toggleMode, setPreset }),
    [mode, preset, setMode, toggleMode, setPreset],
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode outside provider')
  return ctx
}
