import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DateList } from '../components/DateList'
import { ScheduleTimeline } from '../components/ScheduleTimeline'
import { getScheduleView } from '../lib/schedule'

export function SchedulePage() {
  const navigate = useNavigate()
  const { personId = '', date = '' } = useParams()
  const [, setTick] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const view = getScheduleView(personId, date)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (!view) {
    return (
      <main className="page">
        <section className="surface-card">
          <h1>일정을 불러오지 못했습니다.</h1>
          <button type="button" className="ghost-button" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </section>
      </main>
    )
  }

  const availableDates = view.dates
  const currentDateIndex = availableDates.findIndex((item) => item === date)

  function moveDate(direction: 'prev' | 'next') {
    const nextIndex =
      direction === 'prev' ? currentDateIndex - 1 : currentDateIndex + 1
    const nextDate = availableDates[nextIndex]
    if (!nextDate) {
      return
    }

    navigate(`/person/${personId}/date/${nextDate}`)
  }

  return (
    <main className="page">
      <section
        className="surface-card detail-card"
        onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX === null) {
            return
          }

          const deltaX = event.changedTouches[0].clientX - touchStartX
          if (deltaX > 60) {
            moveDate('prev')
          } else if (deltaX < -60) {
            moveDate('next')
          }
          setTouchStartX(null)
        }}
      >
        <button
          type="button"
          className="icon-button top-back-button"
          aria-label="뒤로가기"
          onClick={() => navigate(`/?group=${view.member.groupId}`)}
        >
          ←
        </button>

        <h1>{view.member.name}</h1>

        <DateList
          dates={availableDates}
          selectedDate={date}
          onSelect={(nextDate) => navigate(`/person/${personId}/date/${nextDate}`)}
        />

        <ScheduleTimeline items={view.items} />
      </section>
    </main>
  )
}
