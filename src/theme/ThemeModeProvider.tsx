import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider } from '@mui/material/styles'

import { buildTheme, type ThemeMode } from '@/theme/theme'

const MODE_KEY = 'crm-theme-mode'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readMode(): ThemeMode {
  const v = localStorage.getItem(MODE_KEY)
  return v === 'dark' ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readMode())

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(MODE_KEY, m)
    setModeState(m)
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light')
  }, [mode, setMode])

  const theme = useMemo(() => buildTheme(mode), [mode])

  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
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
