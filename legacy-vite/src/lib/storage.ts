const STORAGE_KEY = 'selectedPersonId'

export function getStoredPersonId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredPersonId(personId: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, personId)
  } catch {
    // 저장이 막혀 있어도 앱은 계속 동작해야 한다.
  }
}

export function clearStoredPersonId() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage 접근 실패는 무시한다.
  }
}
