import type { ScheduleStatus } from '../types'

const TIME_ZONE = 'America/Los_Angeles'

function partsToUtcMs(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute)
}

function getNowParts(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

export function getScheduleStatus(
  date: string,
  startTime: string,
  endTime: string,
): ScheduleStatus {
  const now = getNowParts(TIME_ZONE)
  const nowMs = partsToUtcMs(now.date, now.time)
  const startMs = partsToUtcMs(date, startTime)
  const endMs = partsToUtcMs(date, endTime)

  if (nowMs > endMs) {
    return {
      kind: 'done',
      label: '완료',
      minutesUntilChange: null,
    }
  }

  if (nowMs >= startMs && nowMs <= endMs) {
    return {
      kind: 'live',
      label: '진행 중',
      minutesUntilChange: Math.max(0, Math.round((endMs - nowMs) / 60000)),
    }
  }

  return {
    kind: 'upcoming',
    label: '예정',
    minutesUntilChange: Math.max(0, Math.round((startMs - nowMs) / 60000)),
  }
}

export function getCurrentSummary(
  items: Array<{ companyName: string; status: ScheduleStatus }>,
) {
  const liveItem = items.find((item) => item.status.kind === 'live')
  if (liveItem) {
    const minutes = liveItem.status.minutesUntilChange
    return `현재 진행 중: ${liveItem.companyName}${minutes !== null ? ` · 종료까지 ${minutes}분` : ''}`
  }

  const upcomingItem = items.find((item) => item.status.kind === 'upcoming')
  if (upcomingItem) {
    const minutes = upcomingItem.status.minutesUntilChange
    return `다음 일정: ${upcomingItem.companyName}${minutes !== null ? ` · ${minutes}분 뒤 시작` : ''}`
  }

  return '오늘 일정이 모두 끝났습니다.'
}
