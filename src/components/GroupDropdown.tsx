import type { GroupWithCount } from '../types'

interface GroupDropdownProps {
  groups: GroupWithCount[]
  selectedGroupId: string
  onChange: (groupId: string) => void
}

export function GroupDropdown({
  groups,
  selectedGroupId,
  onChange,
}: GroupDropdownProps) {
  return (
    <label className="group-dropdown">
      <span className="label-title">조 선택</span>
      <select
        value={selectedGroupId}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">조를 선택하세요</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} · {group.memberCount}명
          </option>
        ))}
      </select>
    </label>
  )
}
