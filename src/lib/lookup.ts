import companiesData from '../data/companies.json'
import groupsData from '../data/groups.json'
import membersData from '../data/members.json'
import schedulesData from '../data/schedules.json'
import type { Company, Group, GroupWithCount, Member, ScheduleItem } from '../types'

export const groups = groupsData as Group[]
export const members = membersData as Member[]
export const companies = companiesData as Company[]
export const schedules = schedulesData as ScheduleItem[]

function getGroupOrderValue(group: Group) {
  const matchedNumber = group.name.match(/\d+/) ?? group.id.match(/\d+/)
  return matchedNumber ? Number(matchedNumber[0]) : Number.MAX_SAFE_INTEGER
}

export function getGroupsWithCounts() {
  return groups
    .map((group) => ({
      ...group,
      memberCount: members.filter((member) => member.groupId === group.id).length,
    }))
    .sort((left, right) => getGroupOrderValue(left) - getGroupOrderValue(right)) as GroupWithCount[]
}

export function getGroupById(groupId: string) {
  return groups.find((group) => group.id === groupId) ?? null
}

export function getMemberById(memberId: string) {
  return members.find((member) => member.id === memberId) ?? null
}

export function getMembersByGroupId(groupId: string) {
  return members.filter((member) => member.groupId === groupId)
}

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId) ?? null
}

export function getSchedulesByGroupAndDate(groupId: string, date: string) {
  return schedules
    .filter((item) => {
      const member = getMemberById(item.personId)
      return member?.groupId === groupId && item.date === date
    })
    .sort((left, right) => {
      if (left.startTime === right.startTime) {
        return left.sequence - right.sequence
      }

      return left.startTime.localeCompare(right.startTime)
    })
}

export function getSchedulesByPersonAndDate(personId: string, date: string) {
  return schedules
    .filter((item) => item.personId === personId && item.date === date)
    .sort((left, right) => {
      if (left.startTime === right.startTime) {
        return left.sequence - right.sequence
      }

      return left.startTime.localeCompare(right.startTime)
    })
}

export function getAvailableDatesForPerson(personId: string) {
  return Array.from(
    new Set(
      schedules
        .filter((item) => item.personId === personId)
        .map((item) => item.date),
    ),
  ).sort()
}
