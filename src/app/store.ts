import { configureStore } from '@reduxjs/toolkit'

import { supabaseApi } from '@/features/api/supabaseApi'
import authReducer from '@/features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [supabaseApi.reducerPath]: supabaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
