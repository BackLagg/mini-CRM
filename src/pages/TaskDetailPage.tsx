import { useMemo, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { useAppSelector } from '@/app/hooks'
import { StatusChip } from '@/components/StatusChip'
import { TaskTimeline } from '@/components/TaskTimeline'
import { PageHeader } from '@/components/ui'
import {
  useGetTaskFieldHistoryQuery,
  useGetTaskQuery,
  useGetTaskStatusHistoryQuery,
  useGetExecutorsQuery,
  useGetProfilesQuery,
  useGetSitesQuery,
  useTransitionTaskMutation,
} from '@/features/api/supabaseApi'
import { getAvailableTaskActions } from '@/features/tasks/taskActions'
import { formatFieldHistoryValue } from '@/lib/formatFieldHistory'
import { getRtkErrorMessage } from '@/lib/rtkError'
import type { Profile, Site } from '@/types/crm'
import { TASK_STATUS_LABELS, type TimelineEvent } from '@/types/crm'

export function TaskDetailPage() {
  const { taskId = '' } = useParams()
  const profile = useAppSelector((s) => s.auth.profile)
  const userId = profile?.id

  const { data: task, isLoading, error, refetch } = useGetTaskQuery(taskId, {
    skip: !taskId,
  })
  const { data: statusHistory } = useGetTaskStatusHistoryQuery(taskId, {
    skip: !taskId,
  })
  const { data: fieldHistory } = useGetTaskFieldHistoryQuery(taskId, {
    skip: !taskId,
  })
  const isPlanner = profile?.role === 'planner'
  const { data: allProfiles } = useGetProfilesQuery(undefined, {
    skip: !isPlanner,
  })
  const { data: executors } = useGetExecutorsQuery()
  const { data: sites } = useGetSitesQuery(undefined, { skip: !isPlanner })

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>()
    for (const p of [...(allProfiles ?? []), ...(executors ?? [])]) {
      map.set(p.id, p)
    }
    if (task?.assignee) map.set(task.assignee.id, task.assignee)
    if (task?.author) map.set(task.author.id, task.author)
    return map
  }, [allProfiles, executors, task])

  const siteById = useMemo(() => {
    const map = new Map<string, Site>()
    for (const s of sites ?? []) map.set(s.id, s)
    if (task?.site) map.set(task.site.id, task.site)
    return map
  }, [sites, task])

  const fieldHistoryCtx = useMemo(
    () => ({ profiles: profileById, sites: siteById }),
    [profileById, siteById],
  )

  const [transitionTask, { isLoading: transitioning }] =
    useTransitionTaskMutation()

  const [reworkOpen, setReworkOpen] = useState(false)
  const [reworkComment, setReworkComment] = useState('')
  const [pendingStatus, setPendingStatus] = useState<
    import('@/types/crm').TaskStatus | null
  >(null)
  const [snack, setSnack] = useState<string | null>(null)

  const timeline = useMemo((): TimelineEvent[] => {
    const statusEvents: TimelineEvent[] = (statusHistory ?? []).map((h) => ({
      id: h.id,
      kind: 'status',
      created_at: h.created_at,
      actor_id: h.actor_id,
      from_status: h.from_status,
      to_status: h.to_status,
      comment: h.comment,
    }))
    const fieldEvents: TimelineEvent[] = (fieldHistory ?? []).map((h) => ({
      id: h.id,
      kind: 'field',
      created_at: h.created_at,
      actor_id: h.actor_id,
      field_name: h.field_name,
      old_value: formatFieldHistoryValue(h.field_name, h.old_value, fieldHistoryCtx),
      new_value: formatFieldHistoryValue(h.field_name, h.new_value, fieldHistoryCtx),
    }))
    return [...statusEvents, ...fieldEvents].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [statusHistory, fieldHistory, fieldHistoryCtx])

  const actions =
    task && profile
      ? getAvailableTaskActions(
          profile.role,
          task.status,
          task.assignee_id === userId,
        )
      : []

  const runTransition = async (
    newStatus: import('@/types/crm').TaskStatus,
    comment?: string,
  ) => {
    try {
      await transitionTask({ taskId, newStatus, comment }).unwrap()
      await refetch()
    } catch (e) {
      setSnack(getRtkErrorMessage(e, 'Переход недоступен'))
    }
  }

  const handleAction = (action: (typeof actions)[0]) => {
    if (action.requiresComment) {
      setPendingStatus(action.targetStatus)
      setReworkComment('')
      setReworkOpen(true)
      return
    }
    void runTransition(action.targetStatus)
  }

  const confirmRework = async () => {
    if (!pendingStatus) return
    await runTransition(pendingStatus, reworkComment)
    setReworkOpen(false)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !task) {
    return <Alert severity="error">Задача не найдена или нет доступа</Alert>
  }

  return (
    <>
      <Button
        component={RouterLink}
        to={`/objects/${task.site_id}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        К объекту
      </Button>

      <PageHeader
        title={task.title}
        subtitle={task.site?.title}
        actions={<StatusChip status={task.status} />}
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
          {task.description || '—'}
        </Typography>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Статус: {TASK_STATUS_LABELS[task.status]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Исполнитель:{' '}
            {task.assignee?.full_name ?? task.assignee?.email ?? task.assignee_id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Автор: {task.author?.full_name ?? task.author?.email ?? task.author_id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Создана: {new Date(task.created_at).toLocaleString('ru-RU')}
          </Typography>
        </Stack>
      </Paper>

      {actions.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Доступные действия
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant ?? 'contained'}
                disabled={transitioning}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          История
        </Typography>
        <TaskTimeline events={timeline} />
      </Paper>

      <Dialog open={reworkOpen} onClose={() => setReworkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Комментарий для доработки</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Комментарий"
            required
            value={reworkComment}
            onChange={(e) => setReworkComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReworkOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!reworkComment.trim() || transitioning}
            onClick={confirmRework}
          >
            Отправить на доработку
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={6000} onClose={() => setSnack(null)} message={snack} />
    </>
  )
}
