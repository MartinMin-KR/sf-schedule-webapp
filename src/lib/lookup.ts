import type { AppData, Group, GroupWithCount, ScheduleItem } from '../types'

function getGroupOrderValue(group: Group) {
  const matchedNumber = group.name.match(/\d+/) ?? group.id.match(/\d+/)
  return matchedNumber ? Number(matchedNumber[0]) : Number.MAX_SAFE_INTEGER
}

export function getGroupsWithCounts(data: AppData) {
  return data.groups
    .map((group) => ({
      ...group,
      memberCount: data.members.filter((member) => member.groupId === group.id).length,
    }))
    .sort((left, right) => getGroupOrderValue(left) - getGroupOrderValue(right)) as GroupWithCount[]
}

export function getGroupById(data: AppData, groupId: string) {
  return data.groups.find((group) => group.id === groupId) ?? null
}

export function getMemberById(data: AppData, memberId: string) {
  return data.members.find((member) => member.id === memberId) ?? null
}

export function getMembersByGroupId(data: AppData, groupId: string) {
  return data.members.filter((member) => member.groupId === groupId)
}

export function getCompanyById(data: AppData, companyId: string) {
  return data.companies.find((company) => company.id === companyId) ?? null
}

export function getSchedulesByPersonAndDate(data: AppData, personId: string, date: string) {
  return data.schedules
    .filter((item) => item.personId === personId && item.date === date)
    .sort((left, right) => {
      if (left.startTime === right.startTime) {
        return left.sequence - right.sequence
      }

      return left.startTime.localeCompare(right.startTime)
    }) as ScheduleItem[]
}

export function getAvailableDatesForPerson(data: AppData, personId: string) {
  return Array.from(
    new Set(
      data.schedules
        .filter((item) => item.personId === personId)
        .map((item) => item.date),
    ),
  ).sort()
}
