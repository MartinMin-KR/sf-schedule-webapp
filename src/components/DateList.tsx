interface DateListProps {
  dates: string[]
  selectedDate?: string
  onSelect: (date: string) => void
}

function formatDateLabel(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

export function DateList({ dates, selectedDate, onSelect }: DateListProps) {
  if (dates.length === 0) {
    return <p className="empty-box">이 사람에게 연결된 일정 날짜가 없습니다.</p>
  }

  return (
    <div className="date-list">
      {dates.map((date) => (
        <button
          key={date}
          type="button"
          className={selectedDate === date ? 'date-chip active' : 'date-chip'}
          onClick={() => onSelect(date)}
        >
          {formatDateLabel(date)}
        </button>
      ))}
    </div>
  )
}
