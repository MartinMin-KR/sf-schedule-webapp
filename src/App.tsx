import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { HomePage } from './pages/HomePage'
import { PersonPage } from './pages/PersonPage'
import { SchedulePage } from './pages/SchedulePage'

function App() {
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
