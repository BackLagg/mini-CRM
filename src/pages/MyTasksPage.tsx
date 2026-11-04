import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'

import { useAppSelector } from '@/app/hooks'
import { StatusChip } from '@/components/StatusChip'
import { EmptyState, PageHeader } from '@/components/ui'
import { useGetMyTasksQuery } from '@/features/api/supabaseApi'

export function MyTasksPage() {
  const profile = useAppSelector((s) => s.auth.profile)
  const { data: tasks, isLoading, error } = useGetMyTasksQuery()

  if (profile?.role === 'planner') {
    return <Alert severity="info">Раздел для исполнителей. Перейдите к объектам.</Alert>
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Не удалось загрузить задачи</Alert>
  }

  const rows = tasks ?? []

  return (
    <>
      <PageHeader title="Мои задачи" subtitle="Задачи, назначенные на вас" />

      {rows.length === 0 ? (
        <EmptyState title="Назначенных задач пока нет" />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Задача</TableCell>
                <TableCell>Объект</TableCell>
                <TableCell>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/tasks/${task.id}`}>
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>{task.site?.title ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={task.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  )
}
