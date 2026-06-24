import groupsData from '../data/groups.json'
import membersData from '../data/members.json'
import companiesData from '../data/companies.json'
import schedulesData from '../data/schedules.json'
import type { AppData } from '../types'

// 다줄 라우팅 지시값(예: "중식 후\n호텔 대기 후\n바로\n세일즈포스\n이동")에서
// 실제 목적지를 추출한다. "X 이동" 패턴에서 X를 반환.
export function parsePlace(rawValue: string) {
  const isMultiLine = rawValue.includes('\n')
  const cleaned = rawValue.replace(/\s+/g, ' ').trim()

  if (isMultiLine) {
    const moveMatch = cleaned.match(/(\S+)\s+이동\s*$/)
    if (moveMatch) {
      return { placeName: moveMatch[1], note: null as string | null }
    }
  }

  const busMatch = cleaned.match(/^(.*?)\s*\(([^)]*(?:호차|VAN)[^)]*)\)\s*$/)
  if (busMatch) {
    return { placeName: busMatch[1].trim(), note: busMatch[2].trim() }
  }

  return { placeName: cleaned, note: null as string | null }
}

export async function loadWorkbookData(): Promise<AppData> {
  return {
    groups: groupsData,
    members: membersData,
    companies: companiesData,
    schedules: schedulesData,
  } as AppData
}
