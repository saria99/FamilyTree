import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FamilyCanvas } from '../editor/FamilyCanvas'
import { BranchPicker } from './BranchPicker'
import { useMe } from './me'

/** View-only tree for phones (and members): pinch/pan, tap a person to open the profile. */
export function TreePage() {
  const navigate = useNavigate()
  const [branchId, setBranchId] = useState('')
  const [meId] = useMe()
  return (
    <div className="tree-page">
      <div className="tree-toolbar"><BranchPicker value={branchId} onChange={setBranchId} /></div>
      <FamilyCanvas
        editable={false}
        branchId={branchId || undefined}
        focusId={meId ?? undefined}
        meId={meId ?? undefined}
        onSelect={(s) => s?.kind === 'person' && navigate(`/person/${s.id}`)}
      />
    </div>
  )
}
