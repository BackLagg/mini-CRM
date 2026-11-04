import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Удалить',
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Box component="h3" sx={{ m: 0, typography: 'h6' }}>
        {title}
      </Box>
      {description && (
        <Box sx={{ color: 'text.secondary', mt: 1 }}>{description}</Box>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Box component="h1" sx={{ m: 0, typography: 'h5' }}>
          {title}
        </Box>
        {subtitle && (
          <Box sx={{ color: 'text.secondary', mt: 0.5 }}>{subtitle}</Box>
        )}
      </Box>
      {actions}
    </Box>
  )
}
