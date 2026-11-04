import CssBaseline from '@mui/material/CssBaseline'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import { AppRouter } from '@/app/router'
import { store } from '@/app/store'
import { ThemeModeProvider } from '@/theme/ThemeModeProvider'

import '@/styles/global.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <CssBaseline />
        <AppRouter />
      </ThemeModeProvider>
    </Provider>
  </StrictMode>,
)
