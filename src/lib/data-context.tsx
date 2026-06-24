import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadWorkbookData } from './workbookData'
import type { AppData } from '../types'

interface AppDataContextValue {
  data: AppData | null
  isLoading: boolean
  error: string | null
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    loadWorkbookData()
      .then((nextData) => {
        if (!active) {
          return
        }

        setData(nextData)
        setError(null)
      })
      .catch((caughtError: unknown) => {
        if (!active) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : '엑셀 파일을 읽지 못했습니다.')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <AppDataContext.Provider value={{ data, isLoading, error }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider')
  }

  return context
}
