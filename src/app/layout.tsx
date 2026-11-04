import { Navigate, Outlet } from 'react-router-dom'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from '@mui/material'
import ConstructionIcon from '@mui/icons-material/Construction'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'

import { useAppSelector } from '@/app/hooks'
import { supabase } from '@/lib/supabaseClient'
import { PRESET_LABELS, type ThemePreset } from '@/theme/theme'
import { useThemeMode } from '@/theme/ThemeModeProvider'

export function AppLayout() {
  const profile = useAppSelector((s) => s.auth.profile)
  const { mode, preset, toggleMode, setPreset } = useThemeMode()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <ConstructionIcon />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            CRM · Объекты и задачи
          </Typography>
          <Button
            color="inherit"
            component={RouterLink}
            to="/objects"
            sx={{ fontWeight: location.pathname.startsWith('/objects') ? 700 : 400 }}
          >
            Объекты
          </Button>
          {profile?.role === 'executor' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/my-tasks"
              sx={{ fontWeight: location.pathname === '/my-tasks' ? 700 : 400 }}
            >
              Мои задачи
            </Button>
          )}
          <Select
            size="small"
            value={preset}
            onChange={(e) => setPreset(e.target.value as ThemePreset)}
            sx={{
              color: 'inherit',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              minWidth: 120,
            }}
          >
            {(Object.keys(PRESET_LABELS) as ThemePreset[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PRESET_LABELS[p]}
              </MenuItem>
            ))}
          </Select>
          <IconButton color="inherit" onClick={toggleMode} aria-label="Тема">
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {profile?.full_name ?? profile?.email}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} aria-label="Выход">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ py: 3 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </>
  )
}

export function ProtectedRoute() {
  const { session, initialized } = useAppSelector((s) => s.auth)
  const location = useLocation()

  if (!initialized) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Загрузка…</Typography>
      </Box>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { session, initialized } = useAppSelector((s) => s.auth)

  if (!initialized) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Загрузка…</Typography>
      </Box>
    )
  }

  if (session) {
    return <Navigate to="/objects" replace />
  }

  return <Outlet />
}
