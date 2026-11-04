import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

import { supabase } from '@/lib/supabaseClient'
import type {
  Profile,
  Site,
  Task,
  TaskFieldHistoryRow,
  TaskStatus,
  TaskStatusHistoryRow,
  TaskWithRelations,
} from '@/types/crm'

function mapTaskError(error: { message: string }) {
  return { error: { message: error.message } }
}

export const supabaseApi = createApi({
  reducerPath: 'supabaseApi',
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes: ['Sites', 'Site', 'Tasks', 'Task', 'Profiles'],
  endpoints: (builder) => ({
    getProfiles: builder.query<Profile[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name')
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: ['Profiles'],
    }),
    getExecutors: builder.query<Profile[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'executor')
          .order('full_name')
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: ['Profiles'],
    }),
    getSites: builder.query<
      (Site & { tasks?: { count: number }[] })[],
      void
    >({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('sites')
          .select('*, tasks(count)')
          .order('title')
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: ['Sites'],
    }),
    getSite: builder.query<Site, string>({
      queryFn: async (id) => {
        const { data, error } = await supabase
          .from('sites')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (error) return mapTaskError(error)
        if (!data) return { error: { message: 'Not found' } }
        return { data }
      },
      providesTags: (_r, _e, id) => [{ type: 'Site', id }],
    }),
    upsertSite: builder.mutation<
      Site,
      { id?: string; title: string; address: string }
    >({
      queryFn: async (body) => {
        if (body.id) {
          const { data, error } = await supabase
            .from('sites')
            .update({ title: body.title, address: body.address })
            .eq('id', body.id)
            .select()
            .single()
          if (error) return mapTaskError(error)
          return { data }
        }
        const { data, error } = await supabase
          .from('sites')
          .insert({ title: body.title, address: body.address })
          .select()
          .single()
        if (error) return mapTaskError(error)
        return { data }
      },
      invalidatesTags: ['Sites'],
    }),
    deleteSite: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase.from('sites').delete().eq('id', id)
        if (error) return mapTaskError(error)
        return { data: undefined }
      },
      invalidatesTags: ['Sites', 'Tasks'],
    }),
    getTasksBySite: builder.query<Task[], string>({
      queryFn: async (siteId) => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('site_id', siteId)
          .order('created_at', { ascending: false })
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: (_r, _e, siteId) => [{ type: 'Tasks', id: siteId }],
    }),
    getMyTasks: builder.query<TaskWithRelations[], void>({
      queryFn: async () => {
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError || !userData.user) {
          return { error: { message: 'Not authenticated' } }
        }
        const { data, error } = await supabase
          .from('tasks')
          .select('*, site:sites(*)')
          .eq('assignee_id', userData.user.id)
          .order('updated_at', { ascending: false })
        if (error) return mapTaskError(error)
        return { data: (data ?? []) as TaskWithRelations[] }
      },
      providesTags: ['Tasks'],
    }),
    getTask: builder.query<TaskWithRelations, string>({
      queryFn: async (id) => {
        const { data, error } = await supabase
          .from('tasks')
          .select(
            '*, site:sites(*), assignee:profiles!tasks_assignee_id_fkey(*), author:profiles!tasks_author_id_fkey(*)',
          )
          .eq('id', id)
          .maybeSingle()
        if (error) return mapTaskError(error)
        if (!data) return { error: { message: 'Not found' } }
        return { data: data as TaskWithRelations }
      },
      providesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    upsertTask: builder.mutation<
      Task,
      {
        id?: string
        title: string
        description: string
        site_id: string
        assignee_id: string
        author_id?: string
      }
    >({
      queryFn: async (body) => {
        if (body.id) {
          const { data, error } = await supabase
            .from('tasks')
            .update({
              title: body.title,
              description: body.description,
              site_id: body.site_id,
              assignee_id: body.assignee_id,
            })
            .eq('id', body.id)
            .select()
            .single()
          if (error) return mapTaskError(error)
          return { data }
        }
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError || !userData.user) {
          return { error: { message: 'Not authenticated' } }
        }
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title: body.title,
            description: body.description,
            site_id: body.site_id,
            assignee_id: body.assignee_id,
            author_id: body.author_id ?? userData.user.id,
          })
          .select()
          .single()
        if (error) return mapTaskError(error)
        return { data }
      },
      invalidatesTags: ['Tasks', 'Task'],
    }),
    deleteTask: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        if (error) return mapTaskError(error)
        return { data: undefined }
      },
      invalidatesTags: ['Tasks', 'Task'],
    }),
    transitionTask: builder.mutation<
      Task,
      { taskId: string; newStatus: TaskStatus; comment?: string }
    >({
      queryFn: async ({ taskId, newStatus, comment }) => {
        const { data, error } = await supabase.rpc('transition_task', {
          p_task_id: taskId,
          p_new_status: newStatus,
          p_comment: comment ?? null,
        })
        if (error) return mapTaskError(error)
        return { data: data as Task }
      },
      invalidatesTags: ['Tasks', 'Task'],
    }),
    getTaskStatusHistory: builder.query<TaskStatusHistoryRow[], string>({
      queryFn: async (taskId) => {
        const { data, error } = await supabase
          .from('task_status_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true })
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: (_r, _e, taskId) => [{ type: 'Task', id: taskId }],
    }),
    getTaskFieldHistory: builder.query<TaskFieldHistoryRow[], string>({
      queryFn: async (taskId) => {
        const { data, error } = await supabase
          .from('task_field_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true })
        if (error) return mapTaskError(error)
        return { data: data ?? [] }
      },
      providesTags: (_r, _e, taskId) => [{ type: 'Task', id: taskId }],
    }),
  }),
})

export const {
  useGetProfilesQuery,
  useGetExecutorsQuery,
  useGetSitesQuery,
  useGetSiteQuery,
  useUpsertSiteMutation,
  useDeleteSiteMutation,
  useGetTasksBySiteQuery,
  useGetMyTasksQuery,
  useGetTaskQuery,
  useUpsertTaskMutation,
  useDeleteTaskMutation,
  useTransitionTaskMutation,
  useGetTaskStatusHistoryQuery,
  useGetTaskFieldHistoryQuery,
} = supabaseApi
