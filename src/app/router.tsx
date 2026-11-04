import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { useAppDispatch } from '@/app/hooks'
import {
  AppLayout,
  GuestRoute,
  ProtectedRoute,
} from '@/app/layout'
import {
  clearAuth,
  setInitialized,
  setProfile,
  setSession,
} from '@/features/auth/authSlice'
import { LoginPage } from '@/pages/LoginPage'
import { MyTasksPage } from '@/pages/MyTasksPage'
import { SiteDetailPage } from '@/pages/SiteDetailPage'
import { SitesListPage } from '@/pages/SitesListPage'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/types/crm'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as Profile
}

export function AppRouter() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      dispatch(setSession(data.session))
      if (data.session?.user) {
        const profile = await fetchProfile(data.session.user.id)
        dispatch(setProfile(profile))
      }
      dispatch(setInitialized(true))
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      dispatch(setSession(session))
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        dispatch(setProfile(profile))
      } else {
        dispatch(clearAuth())
      }
      dispatch(setInitialized(true))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/objects" replace />} />
            <Route path="/objects" element={<SitesListPage />} />
            <Route path="/objects/:siteId" element={<SiteDetailPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/objects" replace />} />
      </Routes>
    </BrowserRouter>
  )
}