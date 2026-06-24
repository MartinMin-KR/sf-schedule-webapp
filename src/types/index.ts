export interface Member {
  id: string
  name: string
  groupId: string
}

export interface Group {
  id: string
  name: string
  size?: number
}

export interface Company {
  id: string
  name: string
  description: string
  address: string
  lat?: number
  lng?: number
}

export interface ScheduleItem {
  personId: string
  date: string
  slotLabel: string
  sequence: number
  companyId: string
  startTime: string
  endTime: string
  note?: string
}

export interface GroupWithCount extends Group {
  memberCount: number
}

export interface ScheduleStatus {
  kind: 'done' | 'live' | 'upcoming'
  label: string
  minutesUntilChange: number | null
}

export interface ScheduleViewItem extends ScheduleItem {
  company: Company
  travelMinutes: number | null
  status: ScheduleStatus
}

export interface AppData {
  groups: Group[]
  members: Member[]
  companies: Company[]
  schedules: ScheduleItem[]
}
