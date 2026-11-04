import { Chip, type ChipProps } from '@mui/material'

import { STATUS_CHIP_COLORS } from '@/theme/theme'
import { TASK_STATUS_LABELS, type TaskStatus } from '@/types/crm'

interface StatusChipProps extends Omit<ChipProps, 'label'> {
  status: TaskStatus
}

export function StatusChip({ status, size = 'small', ...rest }: StatusChipProps) {
  return (
    <Chip
      label={TASK_STATUS_LABELS[status]}
      color={STATUS_CHIP_COLORS[status]}
      size={size}
      {...rest}
    />
  )
}
