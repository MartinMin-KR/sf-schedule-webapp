import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAppData } from './lib/data-context'
import { HomePage } from './pages/HomePage'
import { PersonPage } from './pages/PersonPage'
import { SchedulePage } from './pages/SchedulePage'

function App() {
  const { data, isLoading, error } = useAppData()

  if (isLoading) {
    return (
      <main className="page">
        <section className="surface-card">
          <h1>일정 불러오는 중</h1>
        </section>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="page">
        <section className="surface-card">
          <h1>엑셀 파일을 읽지 못했습니다.</h1>
          <p className="section-note">{error ?? '데이터가 비어 있습니다.'}</p>
        </section>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/person/:personId" element={<PersonPage />} />
      <Route path="/person/:personId/date/:date" element={<SchedulePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
