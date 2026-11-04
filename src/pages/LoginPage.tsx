import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material'

import { supabase } from '@/lib/supabaseClient'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/objects'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Вход
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Мини-CRM строительной компании
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Пароль"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
