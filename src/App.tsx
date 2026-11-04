import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from '@mui/material'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  decrement,
  increment,
  reset,
} from '@/features/counter/counterSlice'

import styles from './App.module.scss'

function App() {
  const dispatch = useAppDispatch()
  const count = useAppSelector((state) => state.counter.value)

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="h1">
            CRM
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" className={styles.main}>
        <Container maxWidth="md">
          <Box className={styles.card}>
            <Typography variant="h5" component="h2" gutterBottom>
              Добро пожаловать
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              React · Vite · Redux Toolkit · SCSS · MUI · TypeScript
            </Typography>
            <Typography variant="body1">
              Счётчик из Redux: <strong>{count}</strong>
            </Typography>
            <Box className={styles.actions}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => dispatch(increment())}
              >
                +1
              </Button>
              <Button
                variant="outlined"
                startIcon={<RemoveIcon />}
                onClick={() => dispatch(decrement())}
              >
                −1
              </Button>
              <Button
                variant="text"
                startIcon={<RestartAltIcon />}
                onClick={() => dispatch(reset())}
              >
                Сброс
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  )
}

export default App
