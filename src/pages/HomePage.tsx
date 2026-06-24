import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GroupDropdown } from '../components/GroupDropdown'
import { MemberList } from '../components/MemberList'
import { getGroupsWithCounts, getMemberById, getMembersByGroupId } from '../lib/lookup'
import { getDefaultDateForPerson } from '../lib/schedule'
import { getStoredPersonId, setStoredPersonId } from '../lib/storage'

export function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedGroupId, setSelectedGroupId] = useState(searchParams.get('group') ?? '')
  const groups = useMemo(() => getGroupsWithCounts(), [])
  const members = selectedGroupId ? getMembersByGroupId(selectedGroupId) : []

  useEffect(() => {
    const groupFromUrl = searchParams.get('group') ?? ''
    if (groupFromUrl !== selectedGroupId) {
      setSelectedGroupId(groupFromUrl)
    }
  }, [searchParams, selectedGroupId])

  useEffect(() => {
    const savedPersonId = getStoredPersonId()
    if (!savedPersonId) {
      return
    }

    const member = getMemberById(savedPersonId)
    if (!member) {
      return
    }

    const defaultDate = getDefaultDateForPerson(savedPersonId)
    if (defaultDate) {
      navigate(`/person/${savedPersonId}/date/${defaultDate}`, { replace: true })
      return
    }

    navigate(`/person/${savedPersonId}`, { replace: true })
  }, [navigate])

  function handleGroupChange(groupId: string) {
    setSelectedGroupId(groupId)
    if (groupId) {
      setSearchParams({ group: groupId })
      return
    }

    setSearchParams({})
  }

  return (
    <main className="page page-home">
      <section className="surface-card chooser-card">
        <div className="section-head">
          <h2>조 선택</h2>
        </div>
        <GroupDropdown
          groups={groups}
          selectedGroupId={selectedGroupId}
          onChange={handleGroupChange}
        />
        {selectedGroupId ? (
          <div className="member-wrap">
            <MemberList
              members={members}
              onSelect={(memberId) => {
                setStoredPersonId(memberId)
                const defaultDate = getDefaultDateForPerson(memberId)
                if (defaultDate) {
                  navigate(`/person/${memberId}/date/${defaultDate}`)
                  return
                }

                navigate(`/person/${memberId}`)
              }}
            />
          </div>
        ) : (
          <p className="empty-box">조를 고르세요.</p>
        )}
      </section>
    </main>
  )
}
