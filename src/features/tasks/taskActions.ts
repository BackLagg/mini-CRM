import type { TaskStatus, UserRole } from '@/types/crm'

export type TaskActionId =
  | 'start'
  | 'submit_review'
  | 'accept'
  | 'rework'
  | 'resume'

export interface TaskAction {
  id: TaskActionId
  label: string
  targetStatus: TaskStatus
  requiresComment?: boolean
  variant?: 'contained' | 'outlined'
}

export function getAvailableTaskActions(
  role: UserRole,
  status: TaskStatus,
  isAssignee: boolean,
): TaskAction[] {
  if (role === 'executor' && isAssignee) {
    if (status === 'new') {
      return [
        {
          id: 'start',
          label: 'Взять в работу',
          targetStatus: 'in_progress',
          variant: 'contained',
        },
      ]
    }
    if (status === 'in_progress') {
      return [
        {
          id: 'submit_review',
          label: 'Отправить на проверку',
          targetStatus: 'in_review',
          variant: 'contained',
        },
      ]
    }
    if (status === 'rework') {
      return [
        {
          id: 'resume',
          label: 'Продолжить работу',
          targetStatus: 'in_progress',
          variant: 'contained',
        },
      ]
    }
  }

  if (role === 'planner' && status === 'in_review') {
    return [
      {
        id: 'accept',
        label: 'Принять',
        targetStatus: 'accepted',
        variant: 'contained',
      },
      {
        id: 'rework',
        label: 'На доработку',
        targetStatus: 'rework',
        requiresComment: true,
        variant: 'outlined',
      },
    ]
  }

  return []
}
