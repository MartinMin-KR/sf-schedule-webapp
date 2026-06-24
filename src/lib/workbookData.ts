import groupsData from '../data/groups.json'
import membersData from '../data/members.json'
import companiesData from '../data/companies.json'
import schedulesData from '../data/schedules.json'
import type { AppData } from '../types'

export async function loadWorkbookData(): Promise<AppData> {
  return {
    groups: groupsData,
    members: membersData,
    companies: companiesData,
    schedules: schedulesData,
  } as AppData
}
