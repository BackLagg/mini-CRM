import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Session } from '@supabase/supabase-js'

import type { Profile } from '@/types/crm'

export interface AuthState {
  session: Session | null
  profile: Profile | null
  initialized: boolean
}

const initialState: AuthState = {
  session: null,
  profile: null,
  initialized: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload
    },
    setProfile(state, action: PayloadAction<Profile | null>) {
      state.profile = action.payload
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload
    },
    clearAuth(state) {
      state.session = null
      state.profile = null
    },
  },
})

export const { setSession, setProfile, setInitialized, clearAuth } =
  authSlice.actions
export default authSlice.reducer
