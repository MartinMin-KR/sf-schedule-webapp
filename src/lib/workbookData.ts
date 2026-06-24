import { read, utils } from 'xlsx'
import type { AppData, Company, Group, Member, ScheduleItem } from '../types'

const GITHUB_WORKBOOK_URL =
  'https://raw.githubusercontent.com/MartinMin-KR/sf-schedule-webapp/main/public/silicon-valley-bus-schedule.xlsx'
const LOCAL_WORKBOOK_URL = '/silicon-valley-bus-schedule.xlsx'
const YEAR = 2026
const MEMBER_SHEET_PATTERN = /^전체명단/i

type RowValue = string | number | null | undefined

function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSlug(base: string, used: Set<string>) {
  let candidate = base
  let index = 2
  while (used.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }
  used.add(candidate)
  return candidate
}

function parsePlace(rawValue: string) {
  const cleaned = rawValue.replace(/\s+/g, ' ').trim().replace(/^공창\b/, '공항')
  const matched = cleaned.match(/^(.*?)\s*\((.*?)\)\s*$/)
  if (!matched) {
    return { placeName: cleaned, note: null as string | null }
  }

  return {
    placeName: matched[1].trim(),
    note: matched[2].trim(),
  }
}

function resolveSlot(rawHeader: string, occurrence: number) {
  const dateMatch = rawHeader.match(/(\d+)\.(\d+)/)
  const month = dateMatch ? Number(dateMatch[1]) : 6
  const day = dateMatch ? Number(dateMatch[2]) : 24
  const date = `${YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  if (rawHeader.includes('버스 교체')) {
    return { date, slotLabel: '버스 교체', startTime: '13:10', endTime: '13:30' }
  }
  if (rawHeader.includes('오전')) {
    return { date, slotLabel: '오전 방문', startTime: '09:00', endTime: '11:20' }
  }
  if (rawHeader.includes('점심') || rawHeader.includes('중식')) {
    return { date, slotLabel: '점심 일정', startTime: '12:00', endTime: '13:20' }
  }
  if (rawHeader.includes('오후')) {
    return { date, slotLabel: '오후 방문', startTime: '14:00', endTime: '16:40' }
  }
  if (rawHeader.includes('석식')) {
    return {
      date,
      slotLabel: occurrence === 1 ? '저녁 일정' : '저녁 일정 2',
      startTime: occurrence === 1 ? '18:00' : '19:20',
      endTime: occurrence === 1 ? '19:10' : '20:20',
    }
  }
  if (day === 28) {
    return { date, slotLabel: '귀국 이동', startTime: '08:00', endTime: '10:00' }
  }

  return { date, slotLabel: '특별 일정', startTime: '18:00', endTime: '19:30' }
}

export async function loadWorkbookData(): Promise<AppData> {
  const timestamp = Date.now()
  const githubResponse = await fetch(`${GITHUB_WORKBOOK_URL}?t=${timestamp}`, {
    cache: 'no-store',
  }).catch(() => null)

  const buffer =
    githubResponse && githubResponse.ok
      ? await githubResponse.arrayBuffer()
      : await (await fetch(`${LOCAL_WORKBOOK_URL}?t=${timestamp}`, { cache: 'no-store' })).arrayBuffer()

  const workbook = read(buffer)
  const preferredSheetName =
    workbook.SheetNames.find((sheetName) => MEMBER_SHEET_PATTERN.test(sheetName)) ??
    workbook.SheetNames[0]
  const worksheet = workbook.Sheets[preferredSheetName]
  const rows = utils.sheet_to_json<RowValue[]>(worksheet, { header: 1, raw: false })

  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)

  const groups: Group[] = []
  const members: Member[] = []
  const companies: Company[] = []
  const schedules: ScheduleItem[] = []

  const groupSizes = new Map<string, number>()
  const groupSeen = new Set<string>()
  const memberSlugs = new Set<string>()
  const companySlugs = new Set<string>()
  const companyIds = new Map<string, string>()
  const headerOccurrences = new Map<string, number>()

  const parsedHeaders = headers.slice(4).map((header, index) => {
    const rawHeader = String(header ?? '')
    const occurrence = (headerOccurrences.get(rawHeader) ?? 0) + 1
    headerOccurrences.set(rawHeader, occurrence)

    return {
      columnIndex: index + 4,
      ...resolveSlot(rawHeader, occurrence),
    }
  })

  dataRows.forEach((row) => {
    const groupNumber = String(row[2] ?? '').trim()
    const name = String(row[3] ?? '').trim()
    const orderNumber = Number(row[1] ?? 0)
    if (!groupNumber || !name) {
      return
    }

    const groupId = `group-${groupNumber}`
    const groupName = `${groupNumber}조`
    if (!groupSeen.has(groupId)) {
      groups.push({ id: groupId, name: groupName })
      groupSeen.add(groupId)
    }
    groupSizes.set(groupId, (groupSizes.get(groupId) ?? 0) + 1)

    const memberBase = slugify(name) || `member-${String(orderNumber).padStart(3, '0')}`
    const memberId = uniqueSlug(memberBase, memberSlugs)
    members.push({
      id: memberId,
      name,
      groupId,
    })

    parsedHeaders.forEach(({ columnIndex, date, slotLabel, startTime, endTime }, headerIndex) => {
      const rawValue = row[columnIndex]
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return
      }

      const { placeName, note } = parsePlace(String(rawValue))
      if (!companyIds.has(placeName)) {
        const companyBase = slugify(placeName) || `company-${String(companyIds.size + 1).padStart(2, '0')}`
        const companyId = uniqueSlug(companyBase, companySlugs)
        companyIds.set(placeName, companyId)
        companies.push({
          id: companyId,
          name: placeName,
          description: '',
          address: '',
        })
      }

      schedules.push({
        personId: memberId,
        date,
        slotLabel,
        sequence: headerIndex + 1,
        companyId: companyIds.get(placeName)!,
        startTime,
        endTime,
        note: note ? `배정 차량: ${note}` : undefined,
      })
    })
  })

  const groupsWithSize = groups.map((group) => ({
    ...group,
    size: groupSizes.get(group.id) ?? 0,
  }))

  return {
    groups: groupsWithSize,
    members,
    companies,
    schedules,
  }
}
