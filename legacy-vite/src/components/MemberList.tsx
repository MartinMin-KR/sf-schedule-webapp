import type { Member } from '../types'

interface MemberListProps {
  members: Member[]
  onSelect: (memberId: string) => void
}

export function MemberList({ members, onSelect }: MemberListProps) {
  if (members.length === 0) {
    return <p className="empty-box">이 조에는 아직 표시할 인원이 없습니다.</p>
  }

  return (
    <div className="member-grid">
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          className="member-card"
          onClick={() => onSelect(member.id)}
        >
          <span className="member-name">{member.name}</span>
        </button>
      ))}
    </div>
  )
}
