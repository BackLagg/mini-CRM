import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab'
import { Typography } from '@mui/material'

import {
  FIELD_LABELS,
  TASK_STATUS_LABELS,
  type TimelineEvent,
} from '@/types/crm'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TaskTimelineProps {
  events: TimelineEvent[]
}

export function TaskTimeline({ events }: TaskTimelineProps) {
  if (events.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        История пока пуста.
      </Typography>
    )
  }

  return (
    <Timeline position="right">
      {events.map((ev) => (
        <TimelineItem key={ev.id}>
          <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3, py: 1.5 }}>
            {formatDate(ev.created_at)}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={ev.kind === 'status' ? 'primary' : 'grey'} />
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent sx={{ py: 1.5 }}>
            {ev.kind === 'status' ? (
              <>
                <Typography variant="subtitle2">
                  {ev.from_status
                    ? `${TASK_STATUS_LABELS[ev.from_status]} → ${TASK_STATUS_LABELS[ev.to_status!]}`
                    : `Создана: ${TASK_STATUS_LABELS[ev.to_status!]}`}
                </Typography>
                {ev.comment && (
                  <Typography variant="body2" color="text.secondary">
                    Комментарий: {ev.comment}
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Typography variant="subtitle2">
                  Изменено поле «{FIELD_LABELS[ev.field_name!] ?? ev.field_name}»
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ev.old_value || '—'} → {ev.new_value || '—'}
                </Typography>
              </>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  )
}
