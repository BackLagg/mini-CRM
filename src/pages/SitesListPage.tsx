import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Alert,
  Box,
  Fab,
  IconButton,
  Link,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material'

import { useAppSelector } from '@/app/hooks'
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/ui'
import {
  useDeleteSiteMutation,
  useGetSitesQuery,
  useUpsertSiteMutation,
} from '@/features/api/supabaseApi'

type SiteRow = {
  id: string
  title: string
  address: string
  tasks?: { count: number }[]
}

export function SitesListPage() {
  const profile = useAppSelector((s) => s.auth.profile)
  const isPlanner = profile?.role === 'planner'
  const { data: sites, isLoading, error } = useGetSitesQuery()
  const [upsertSite] = useUpsertSiteMutation()
  const [deleteSite] = useDeleteSiteMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [snack, setSnack] = useState<string | null>(null)

  const openCreate = () => {
    setEditId(undefined)
    setTitle('')
    setAddress('')
    setDialogOpen(true)
  }

  const openEdit = (site: SiteRow) => {
    setEditId(site.id)
    setTitle(site.title)
    setAddress(site.address)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      await upsertSite({ id: editId, title, address }).unwrap()
      setDialogOpen(false)
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteSite(deleteId).unwrap()
      setDeleteId(null)
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Ошибка удаления')
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Не удалось загрузить объекты</Alert>
  }

  const rows = (sites ?? []) as SiteRow[]

  return (
    <>
      <PageHeader
        title="Объекты"
        subtitle={
          isPlanner
            ? 'Все стройки компании'
            : 'Объекты, где у вас есть задачи'
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Объектов пока нет"
          description={
            isPlanner ? 'Создайте первый объект кнопкой «+»' : undefined
          }
        />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell align="right">Задач</TableCell>
                {isPlanner && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((site) => (
                <TableRow key={site.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/objects/${site.id}`}>
                      {site.title}
                    </Link>
                  </TableCell>
                  <TableCell>{site.address}</TableCell>
                  <TableCell align="right">
                    {site.tasks?.[0]?.count ?? '—'}
                  </TableCell>
                  {isPlanner && (
                    <TableCell align="right">
                      <IconButton aria-label="edit" onClick={() => openEdit(site)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="delete"
                        onClick={() => setDeleteId(site.id)}
                      >
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

      {isPlanner && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={openCreate}
          aria-label="Добавить объект"
        >
          <AddIcon />
        </Fab>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Редактировать объект' : 'Новый объект'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Название"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Адрес"
            required
            fullWidth
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={!title || !address}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить объект?"
        message="Все задачи на объекте также будут удалены."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </>
  )
}
