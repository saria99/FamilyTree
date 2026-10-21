import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../app/i18n'
import { useStoreApi, useStoreSnapshot } from '../../app/store'
import { useIsPhone } from '../../app/useIsPhone'
import { CommandBar } from './CommandBar'
import { FamilyCanvas } from './FamilyCanvas'
import { SidePanel, type Selection } from './SidePanel'
import { BranchPicker } from '../viewer/BranchPicker'
import { useMe } from '../viewer/me'

export function EditorPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const isPhone = useIsPhone()
  const { undo, redo } = useStoreApi()
  const { canUndo, canRedo, undoLabel, redoLabel } = useStoreSnapshot()
  const [selection, setSelection] = useState<Selection>(null)
  const [focusId, setFocusId] = useState<string>()
  const [branchId, setBranchId] = useState('')
  const [meId] = useMe()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  if (isPhone) return <div className="page"><p className="muted">{t('editor.phoneOnly')}</p></div>

  return (
    <div className="editor">
      <div className="toolbar">
        <CommandBar
          onCreated={(id) => {
            setSelection({ kind: 'person', id })
            setFocusId(id)
          }}
        />
        <div className="toolbar-group">
          <button className="btn" disabled={!canUndo} onClick={undo} title={undoLabel}>↶ {t('actions.undo')}</button>
          <button className="btn" disabled={!canRedo} onClick={redo} title={redoLabel}>↷ {t('actions.redo')}</button>
          <BranchPicker value={branchId} onChange={setBranchId} />
        </div>
      </div>
      <div className="editor-body">
        <FamilyCanvas
          editable
          selection={selection}
          onSelect={setSelection}
          onOpenProfile={(id) => navigate(`/person/${id}`)}
          branchId={branchId || undefined}
          focusId={focusId}
          meId={meId ?? undefined}
        />
        <SidePanel selection={selection} onSelect={setSelection} />
      </div>
    </div>
  )
}
