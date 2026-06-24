import { estimateTravelMinutes } from './maps'
import {
  getAvailableDatesForPerson,
  getCompanyById,
  getMemberById,
  getSchedulesByPersonAndDate,
} from './lookup'
import { getScheduleStatus } from './progress'
import type { AppData, ScheduleViewItem } from '../types'

function getTodayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function getPersonContext(data: AppData, personId: string) {
  const member = getMemberById(data, personId)
  if (!member) {
    return null
  }

  return {
    member,
    dates: getAvailableDatesForPerson(data, member.id),
  }
}

export function getDefaultDateForPerson(data: AppData, personId: string) {
  const context = getPersonContext(data, personId)
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

export function getScheduleView(data: AppData, personId: string, date: string) {
  const context = getPersonContext(data, personId)
  if (!context) {
    return null
  }

  const rawItems = getSchedulesByPersonAndDate(data, context.member.id, date)

  const items = rawItems.reduce<ScheduleViewItem[]>((result, item, index) => {
    const company = getCompanyById(data, item.companyId)
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
