import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
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
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'

import { useAppSelector } from '@/app/hooks'
import { getRtkErrorMessage } from '@/lib/rtkError'
import { StatusChip } from '@/components/StatusChip'
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/ui'
import {
  useDeleteTaskMutation,
  useGetExecutorsQuery,
  useGetSiteQuery,
  useGetTasksBySiteQuery,
  useUpsertTaskMutation,
} from '@/features/api/supabaseApi'
import type { Task } from '@/types/crm'

export function SiteDetailPage() {
  const { siteId = '' } = useParams()
  const profile = useAppSelector((s) => s.auth.profile)
  const isPlanner = profile?.role === 'planner'

  const { data: site, isLoading: siteLoading, error: siteError } =
    useGetSiteQuery(siteId, { skip: !siteId })
  const { data: tasks, isLoading: tasksLoading } = useGetTasksBySiteQuery(
    siteId,
    { skip: !siteId },
  )
  const { data: executors } = useGetExecutorsQuery(undefined, {
    skip: !isPlanner,
  })

  const [upsertTask] = useUpsertTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [snack, setSnack] = useState<string | null>(null)

  const openCreate = () => {
    setEditTask(null)
    setTitle('')
    setDescription('')
    setAssigneeId(executors?.[0]?.id ?? '')
    setDialogOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setTitle(task.title)
    setDescription(task.description)
    setAssigneeId(task.assignee_id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      await upsertTask({
        id: editTask?.id,
        title,
        description,
        site_id: siteId,
        assignee_id: assigneeId,
      }).unwrap()
      setDialogOpen(false)
    } catch (e) {
      setSnack(getRtkErrorMessage(e, 'Ошибка сохранения'))
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteTask(deleteId).unwrap()
      setDeleteId(null)
    } catch {
      setSnack('Ошибка удаления')
    }
  }

  if (siteLoading || tasksLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (siteError || !site) {
    return <Alert severity="error">Объект не найден или нет доступа</Alert>
  }

  return (
    <>
      <Button
        component={RouterLink}
        to="/objects"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        К списку объектов
      </Button>

      <PageHeader
        title={site.title}
        subtitle={site.address}
        actions={
          isPlanner ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Новая задача
            </Button>
          ) : undefined
        }
      />

      {(tasks ?? []).length === 0 ? (
        <EmptyState title="На объекте пока нет задач" />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Задача</TableCell>
                <TableCell>Статус</TableCell>
                {isPlanner && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {(tasks ?? []).map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/tasks/${task.id}`}>
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={task.status} />
                  </TableCell>
                  {isPlanner && (
                    <TableCell align="right">
                      <IconButton onClick={() => openEdit(task)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => setDeleteId(task.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Название"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControl fullWidth required>
            <InputLabel>Исполнитель</InputLabel>
            <Select
              label="Исполнитель"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              {(executors ?? []).map((ex) => (
                <MenuItem key={ex.id} value={ex.id}>
                  {ex.full_name ?? ex.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!title || !assigneeId}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить задачу?"
        message="Это действие необратимо."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} message={snack} />
    </>
  )
}
