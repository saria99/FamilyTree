import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addRelative, type RelativeKind } from '../../data/commands'
import type { Gender, PartialDate } from '../../data/model'
import { personName } from '../../domain/text'
import { Modal } from '../../shared/Modal'

/**
 * The "+" on a diamond point opens this: the essentials for a new parent, sibling or child. Everything else
 * (laqab, exact dates, notes, status, sources) can be filled in later in the side panel.
 */
export function AddRelativeDialog({ anchorId, kind, onClose }: { anchorId: string; kind: RelativeKind; onClose: (createdId?: string) => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const anchor = g.person(anchorId)!
  const marriages = g.marriagesOf(anchorId).filter((m) => m.husbandId && m.wifeId)
  const [gender, setGender] = useState<Gender>(kind === 'parent' && g.father(anchorId) ? 'F' : 'M')
  const [ismAr, setIsmAr] = useState('')
  const [ismEn, setIsmEn] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [deathYear, setDeathYear] = useState('')
  const [marriageId, setMarriageId] = useState(marriages[0]?.id ?? '')

  const roles: Record<RelativeKind, Record<Gender, string>> = {
    parent: { M: t('addRelative.father'), F: t('addRelative.mother') },
    sibling: { M: t('addRelative.brother'), F: t('addRelative.sister') },
    child: { M: t('addRelative.son'), F: t('addRelative.daughter') },
  }
  const year = (v: string): PartialDate | undefined => (v.trim() ? { y: Number(v) } : undefined)
  const title = t(`addRelative.title.${kind}`, { name: personName(anchor, lang) })

  return (
    <Modal onDismiss={() => onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ismAr.trim() && !ismEn.trim()) return
          const id = await run(title, () =>
            addRelative(data, anchorId, kind, {
              gender,
              ismAr,
              ismEn,
              birth: year(birthYear),
              death: year(deathYear),
              marriageId: kind === 'child' && marriageId ? marriageId : undefined,
            }),
          )
          if (id !== false) onClose(id)
        }}
      >
        <h2>{title}</h2>
        <div className="segmented wide" role="radiogroup" aria-label={t('person.gender')}>
          {(['M', 'F'] as const).map((gv) => (
            <button type="button" key={gv} role="radio" aria-checked={gender === gv} className={gender === gv ? 'is-on' : ''} onClick={() => setGender(gv)}>
              {roles[kind][gv]}
            </button>
          ))}
        </div>
        <label>{t('person.ismAr')}<input dir="rtl" value={ismAr} onChange={(e) => setIsmAr(e.target.value)} autoFocus={lang === 'ar'} /></label>
        <label>{t('person.ismEn')}<input dir="ltr" value={ismEn} onChange={(e) => setIsmEn(e.target.value)} autoFocus={lang === 'en'} /></label>
        <div className="row">
          <label>{t('addRelative.birthYear')}<input inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} /></label>
          <label>{t('addRelative.deathYear')}<input inputMode="numeric" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} /></label>
        </div>
        {kind === 'child' && marriages.length > 0 && (
          <label>
            {t('editor.pickMarriageTitle')}
            <select value={marriageId} onChange={(e) => setMarriageId(e.target.value)}>
              {marriages.map((m) => (
                <option key={m.id} value={m.id}>
                  {t('editor.withSpouse', { name: personName(g.person(anchor.gender === 'M' ? m.wifeId : m.husbandId), lang) })}
                  {m.start?.y ? ` (${m.start.y})` : ''}
                </option>
              ))}
              <option value="">{t('editor.otherParentUnknown')}</option>
            </select>
          </label>
        )}
        <p className="muted small">{t('addRelative.later')}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => onClose()}>{t('actions.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!ismAr.trim() && !ismEn.trim()}>{t('actions.add')}</button>
        </div>
      </form>
    </Modal>
  )
}
