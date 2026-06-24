import { estimateTravelMinutes } from './maps'
import {
  getAvailableDatesForPerson,
  getCompanyById,
  getMemberById,
  getSchedulesByPersonAndDate,
} from './lookup'
import { getScheduleStatus } from './progress'
import type { ScheduleViewItem } from '../types'

function getTodayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function getPersonContext(personId: string) {
  const member = getMemberById(personId)
  if (!member) {
    return null
  }

  return {
    member,
    dates: getAvailableDatesForPerson(member.id),
  }
}

export function getDefaultDateForPerson(personId: string) {
  const context = getPersonContext(personId)
  if (!context || context.dates.length === 0) {
    return null
  }

  const today = getTodayInLosAngeles()
  const exactToday = context.dates.find((item) => item === today)
  if (exactToday) {
    return exactToday
  }

  const upcoming = context.dates.find((item) => item > today)
  if (upcoming) {
    return upcoming
  }

  return context.dates[0]
}

export function getScheduleView(personId: string, date: string) {
  const context = getPersonContext(personId)
  if (!context) {
    return null
  }

  const rawItems = getSchedulesByPersonAndDate(context.member.id, date)

  const items = rawItems.reduce<ScheduleViewItem[]>((result, item, index) => {
    const company = getCompanyById(item.companyId)
    if (!company) {
      return result
    }

    const previous = index > 0 ? result[index - 1] : null
    const travelMinutes =
      previous ? estimateTravelMinutes(previous.company, company) : null

    result.push({
      ...item,
      company,
      travelMinutes,
      status: getScheduleStatus(item.date, item.startTime, item.endTime),
    })

    return result
  }, [])

  return {
    member: context.member,
    dates: context.dates,
    items,
  }
}
