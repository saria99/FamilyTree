import { Modal } from '../../shared/Modal'
import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addLineage, addPerson, type LineageChoice } from '../../data/commands'
import type { Gender } from '../../data/model'
import { isArabicText, isLineageText, parseLineage, personName, searchKey } from '../../domain/text'

/** Type-to-add (FR-014) and quick lineage entry "A ibn B ibn C" (FR-018). */
export function CommandBar({ onCreated }: { onCreated: (personId: string) => void }) {
  const { t } = useLang()
  const data = useTreeData()
  const { run } = useStoreApi()
  const [text, setText] = useState('')
  const [gender, setGender] = useState<Gender>('M')
  const [chain, setChain] = useState<LineageChoice[] | null>(null)

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    if (isLineageText(value)) {
      setChain(parseLineage(value).map((s, i) => ({ ...s, gender: i === 0 ? s.gender : 'M' })))
      return
    }
    const id = await run('Add person', () => addPerson(data, { gender, [isArabicText(value) ? 'ismAr' : 'ismEn']: value }))
    if (id) {
      setText('')
      onCreated(id)
    }
  }

  return (
    <>
      <form
        className="command-bar"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('commandBar.placeholder')} aria-label={t('commandBar.placeholder')} dir="auto" />
        <div className="segmented" role="radiogroup" aria-label={t('person.gender')}>
          {(['M', 'F'] as const).map((g) => (
            <button type="button" key={g} role="radio" aria-checked={gender === g} className={gender === g ? 'is-on' : ''} onClick={() => setGender(g)}>
              {t(`gender.${g}`)}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary">{t('actions.add')}</button>
      </form>
      {chain && (
        <LineageDialog
          chain={chain}
          onClose={async (choices) => {
            setChain(null)
            if (!choices) return
            const id = await run('Add lineage', () => addLineage(data, choices, isArabicText(text) ? 'ar' : 'en'))
            if (id) {
              setText('')
              onCreated(id)
            }
          }}
        />
      )}
    </>
  )
}

function LineageDialog({ chain, onClose }: { chain: LineageChoice[]; onClose: (choices: LineageChoice[] | null) => void }) {
  const { t, lang } = useLang()
  const g = useGraph()
  const candidates = (name: string, gender: Gender) =>
    [...g.persons.values()].filter((p) => p.gender === gender && [p.ismAr, p.ismEn].some((n) => n && searchKey(n) === searchKey(name)))
  const [choices, setChoices] = useState<LineageChoice[]>(() =>
    chain.map((s) => {
      const matches = candidates(s.name, s.gender)
      return matches.length === 1 ? { ...s, existingId: matches[0].id } : s
    }),
  )

  return (
    <Modal onDismiss={() => onClose(null)}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{t('commandBar.chainTitle')}</h2>
        <ol className="chain">
          {choices.map((c, i) => {
            const matches = candidates(c.name, c.gender)
            return (
              <li key={i}>
                <strong dir="auto">{c.name}</strong>
                <span className="muted"> ({t(`gender.${c.gender}`)})</span>
                <select
                  value={c.existingId ?? ''}
                  onChange={(e) => setChoices((all) => all.map((x, j) => (j === i ? { ...x, existingId: e.target.value || undefined } : x)))}
                >
                  <option value="">{t('commandBar.newPerson')}</option>
                  {matches.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personName(p, lang)} · {p.publicId} {p.birth?.y ? `(${p.birth.y})` : ''}
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ol>
        <p className="muted small">{t('commandBar.chainNote')}</p>
        <div className="modal-actions">
          <button className="btn" onClick={() => onClose(null)}>{t('actions.cancel')}</button>
          <button className="btn btn-primary" autoFocus onClick={() => onClose(choices)}>{t('actions.add')}</button>
        </div>
      </div>
    </Modal>
  )
}
