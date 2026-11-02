import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addRelative, type RelativeKind } from '../../data/commands'
import type { Gender, PartialDate } from '../../data/model'
import { personName } from '../../domain/text'
import { Modal } from '../../shared/Modal'

/** "Other parent" choice for a new child: a new wife/husband of the anchor, created together with the child. */
const NEW_SPOUSE = '__new'

/**
 * The "+" on a diamond point opens this: the essentials for a new parent, sibling, spouse or child. Everything else
 * (laqab, exact dates, notes, status, sources) can be filled in later in the side panel.
 */
export function AddRelativeDialog({ anchorId, kind, onClose }: { anchorId: string; kind: RelativeKind; onClose: (createdId?: string) => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const anchor = g.person(anchorId)!
  const anchorIsMan = anchor.gender === 'M'
  const marriages = g.marriagesOf(anchorId).filter((m) => m.husbandId && m.wifeId)
  const spouseGender: Gender = anchorIsMan ? 'F' : 'M'
  const [gender, setGender] = useState<Gender>(kind === 'spouse' ? spouseGender : kind === 'parent' && g.father(anchorId) ? 'F' : 'M')
  const [ismAr, setIsmAr] = useState('')
  const [ismEn, setIsmEn] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [deathYear, setDeathYear] = useState('')
  const [marriageId, setMarriageId] = useState(marriages[0]?.id ?? NEW_SPOUSE)
  const [spouseAr, setSpouseAr] = useState('')
  const [spouseEn, setSpouseEn] = useState('')

  const roles: Record<Exclude<RelativeKind, 'spouse'>, Record<Gender, string>> = {
    parent: { M: t('addRelative.father'), F: t('addRelative.mother') },
    sibling: { M: t('addRelative.brother'), F: t('addRelative.sister') },
    child: { M: t('addRelative.son'), F: t('addRelative.daughter') },
  }
  const year = (v: string): PartialDate | undefined => (v.trim() ? { y: Number(v) } : undefined)
  const name = personName(anchor, lang)
  const title = kind === 'spouse' ? t(anchorIsMan ? 'addRelative.titleWife' : 'addRelative.titleHusband', { name }) : t(`addRelative.title.${kind}`, { name })
  const newSpouse = kind === 'child' && marriageId === NEW_SPOUSE
  const missing = (!ismAr.trim() && !ismEn.trim()) || (newSpouse && !spouseAr.trim() && !spouseEn.trim())

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
          if (missing) return
          const id = await run(title, () =>
            addRelative(data, anchorId, kind, {
              gender,
              ismAr,
              ismEn,
              birth: year(birthYear),
              death: year(deathYear),
              marriageId: kind === 'child' && marriageId && !newSpouse ? marriageId : undefined,
              otherParent: newSpouse ? { ismAr: spouseAr, ismEn: spouseEn } : undefined,
            }),
          )
          if (id !== false) onClose(id)
        }}
      >
        <h2>{title}</h2>
        {kind !== 'spouse' && (
          <div className="segmented wide" role="radiogroup" aria-label={t('person.gender')}>
            {(['M', 'F'] as const).map((gv) => (
              <button type="button" key={gv} role="radio" aria-checked={gender === gv} className={gender === gv ? 'is-on' : ''} onClick={() => setGender(gv)}>
                {roles[kind][gv]}
              </button>
            ))}
          </div>
        )}
        <label>{t('person.ismAr')}<input dir="rtl" value={ismAr} onChange={(e) => setIsmAr(e.target.value)} autoFocus={lang === 'ar'} /></label>
        <label>{t('person.ismEn')}<input dir="ltr" value={ismEn} onChange={(e) => setIsmEn(e.target.value)} autoFocus={lang === 'en'} /></label>
        <div className="row">
          <label>{t('addRelative.birthYear')}<input inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} /></label>
          <label>{t('addRelative.deathYear')}<input inputMode="numeric" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} /></label>
        </div>
        {kind === 'child' && (
          <label>
            {anchorIsMan ? t('addRelative.mother') : t('addRelative.father')}
            <select value={marriageId} onChange={(e) => setMarriageId(e.target.value)}>
              {marriages.map((m) => (
                <option key={m.id} value={m.id}>
                  {personName(g.person(anchorIsMan ? m.wifeId : m.husbandId), lang)}
                  {m.start?.y ? ` (${m.start.y})` : ''}
                </option>
              ))}
              <option value={NEW_SPOUSE}>{t(anchorIsMan ? 'addRelative.newWife' : 'addRelative.newHusband')}</option>
              <option value="">{t('editor.otherParentUnknown')}</option>
            </select>
          </label>
        )}
        {newSpouse && (
          <div className="row">
            <label>{t(anchorIsMan ? 'addRelative.wifeAr' : 'addRelative.husbandAr')}<input dir="rtl" value={spouseAr} onChange={(e) => setSpouseAr(e.target.value)} /></label>
            <label>{t(anchorIsMan ? 'addRelative.wifeEn' : 'addRelative.husbandEn')}<input dir="ltr" value={spouseEn} onChange={(e) => setSpouseEn(e.target.value)} /></label>
          </div>
        )}
        <p className="muted small">{t('addRelative.later')}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => onClose()}>{t('actions.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={missing}>{t('actions.add')}</button>
        </div>
      </form>
    </Modal>
  )
}
