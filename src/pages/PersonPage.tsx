import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DateList } from '../components/DateList'
import { getGroupById } from '../lib/lookup'
import { getDefaultDateForPerson, getPersonContext } from '../lib/schedule'

export function PersonPage() {
  const navigate = useNavigate()
  const { personId = '' } = useParams()
  const context = useMemo(() => getPersonContext(personId), [personId])

  useEffect(() => {
    const defaultDate = getDefaultDateForPerson(personId)
    if (defaultDate) {
      navigate(`/person/${personId}/date/${defaultDate}`, { replace: true })
    }
  }, [navigate, personId])

  if (!context) {
    return (
      <main className="page">
        <section className="surface-card">
          <h1>선택한 사람을 찾지 못했습니다.</h1>
          <button type="button" className="ghost-button" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </section>
      </main>
    )
  }

  const group = getGroupById(context.member.groupId)

  return (
    <main className="page">
      <section className="surface-card detail-card">
        <button
          type="button"
          className="icon-button top-back-button"
          aria-label="뒤로가기"
          onClick={() => navigate(`/?group=${context.member.groupId}`)}
        >
          ←
        </button>

        <h1>{context.member.name}</h1>
        <p className="hero-text">{group?.name ?? context.member.groupId}</p>
        <DateList
          dates={context.dates}
          onSelect={(date) => navigate(`/person/${context.member.id}/date/${date}`)}
        />
      </section>
    </main>
  )
}
