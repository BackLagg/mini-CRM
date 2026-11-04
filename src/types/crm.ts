export type UserRole = 'planner' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'in_review'
  | 'accepted'
  | 'rework'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  title: string
  address: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  site_id: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface TaskStatusHistoryRow {
  id: string
  task_id: string
  actor_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  comment: string | null
  created_at: string
}

export interface TaskFieldHistoryRow {
  id: string
  task_id: string
  actor_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface TaskWithRelations extends Task {
  site?: Site | null
  assignee?: Profile | null
  author?: Profile | null
}

export interface TimelineEvent {
  id: string
  kind: 'status' | 'field'
  created_at: string
  actor_id: string
  actor_name?: string
  from_status?: TaskStatus | null
  to_status?: TaskStatus
  comment?: string | null
  field_name?: string
  old_value?: string | null
  new_value?: string | null
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export const FIELD_LABELS: Record<string, string> = {
  title: 'Название',
  description: 'Описание',
  assignee_id: 'Исполнитель',
  site_id: 'Объект',
}
