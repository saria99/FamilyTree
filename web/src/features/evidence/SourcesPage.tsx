import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addSource } from '../../data/commands'
import type { Source, SourceType } from '../../data/model'
import { personName } from '../../domain/text'

const TYPES: SourceType[] = ['Document', 'Book', 'OfficialRecord', 'Gravestone', 'Photo', 'Website', 'OralAccount', 'Other']

/** FR-029: sources, including oral accounts with narrator, date told and recorder. */
export function SourcesPage() {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const empty: Omit<Source, 'id'> = { type: 'Document', title: '' }
  const [draft, setDraft] = useState(empty)
  const set = (patch: Partial<Source>) => setDraft((d) => ({ ...d, ...patch }))

  const describeTarget = (c: (typeof data.citations)[number]) => {
    if (c.target.kind === 'marriage') {
      const m = g.marriages.get(c.target.id)
      return `${t('marriage.title')}: ${personName(g.person(m?.husbandId), lang)} ⚭ ${personName(g.person(m?.wifeId), lang)}`
    }
    if (c.target.kind === 'claim') {
      const claim = data.claims.find((x) => x.id === c.target.id)
      return `${t('person.claims')}: ${personName(g.person(claim?.childId), lang)}`
    }
    if (c.target.kind === 'person') return personName(g.person(c.target.id), lang)
    return t('person.kinship')
  }

  return (
    <div className="page">
      <h1>{t('sources.title')}</h1>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!draft.title.trim()) return
          await run('Add source', () => addSource(data, draft))
          setDraft(empty)
        }}
      >
        <h2>{t('sources.add')}</h2>
        <div className="row">
          <label>
            {t('sources.type')}
            <select value={draft.type} onChange={(e) => set({ type: e.target.value as SourceType })}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>{t(`sources.types.${ty}`)}</option>
              ))}
            </select>
          </label>
          <label className="grow">{t('sources.titleField')}<input required value={draft.title} onChange={(e) => set({ title: e.target.value })} dir="auto" /></label>
        </div>
        {draft.type === 'OralAccount' ? (
          <div className="row">
            <label>{t('sources.narrator')}<input required value={draft.narratorName ?? ''} onChange={(e) => set({ narratorName: e.target.value })} dir="auto" /></label>
            <label>{t('sources.toldOn')}<input required inputMode="numeric" value={draft.toldOn?.y ?? ''} onChange={(e) => set({ toldOn: e.target.value ? { y: Number(e.target.value) } : undefined })} /></label>
            <label>{t('sources.recordedBy')}<input value={draft.recordedBy ?? ''} onChange={(e) => set({ recordedBy: e.target.value })} dir="auto" /></label>
          </div>
        ) : (
          <label>{t('sources.author')}<input value={draft.author ?? ''} onChange={(e) => set({ author: e.target.value })} dir="auto" /></label>
        )}
        <div className="form-actions"><button className="btn btn-primary" type="submit">{t('actions.add')}</button></div>
      </form>

      <ul className="source-list">
        {data.sources.map((s) => {
          const cited = data.citations.filter((c) => c.sourceId === s.id)
          return (
            <li key={s.id} className="card">
              <div className="card-row">
                <strong dir="auto">{s.title}</strong>
                <span className="pill">{t(`sources.types.${s.type}`)}</span>
              </div>
              <div className="muted small">
                {s.type === 'OralAccount' ? `${t('sources.narrator')}: ${s.narratorName ?? '?'} · ${s.toldOn?.y ?? '?'} · ${s.recordedBy ?? ''}` : s.author}
              </div>
              {cited.length > 0 && (
                <details>
                  <summary className="small">{t('sources.citedBy')} ({cited.length})</summary>
                  <ul className="small">
                    {cited.map((c) => (
                      <li key={c.id}>{describeTarget(c)}{c.detail ? ` · ${c.detail}` : ''}</li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
