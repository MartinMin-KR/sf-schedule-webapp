import type { ScheduleViewItem } from '../types'

interface ScheduleTimelineProps {
  items: ScheduleViewItem[]
}

function statusClassName(kind: ScheduleViewItem['status']['kind']) {
  if (kind === 'live') {
    return 'timeline-card is-live'
  }

  if (kind === 'done') {
    return 'timeline-card is-done'
  }

  return 'timeline-card'
}

function formatSlotLabel(slotLabel: string) {
  if (slotLabel.startsWith('점심')) {
    return '점심 식사'
  }

  if (slotLabel.startsWith('저녁')) {
    return '저녁 식사'
  }

  return slotLabel
}

function getBusLabel(note?: string) {
  if (!note) {
    return null
  }

  return note.replace('배정 차량: ', '')
}

export function ScheduleTimeline({ items }: ScheduleTimelineProps) {
  if (items.length === 0) {
    return <p className="empty-box">선택한 날짜에는 일정이 없습니다.</p>
  }

  return (
    <section className="timeline-wrap">
      <div className="timeline">
        {items.map((item) => (
          <article
            key={`${item.date}-${item.companyId}-${item.startTime}`}
            className={statusClassName(item.status.kind)}
          >
            <div className="timeline-top">
              <div className="timeline-labels">
                <p className="time-range">{formatSlotLabel(item.slotLabel)}</p>
                {getBusLabel(item.note) ? (
                  <span className="bus-badge">{getBusLabel(item.note)}</span>
                ) : null}
              </div>
            </div>
            <h3>{item.company.name}</h3>
          </article>
        ))}
      </div>
    </section>
  )
}
