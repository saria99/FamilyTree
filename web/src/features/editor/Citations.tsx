import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useStoreApi, useTreeData } from '../../app/store'
import { addCitation, deleteCitation } from '../../data/commands'
import type { CitationTarget } from '../../data/model'

/** Lists the sources cited on a relationship (or person fact) and lets the admin cite another. */
export function Citations({ target, readOnly = false }: { target: CitationTarget; readOnly?: boolean }) {
  const { t } = useLang()
  const data = useTreeData()
  const { run } = useStoreApi()
  const [sourceId, setSourceId] = useState('')
  const [detail, setDetail] = useState('')
  const cited = data.citations.filter((c) => c.target.kind === target.kind && c.target.id === target.id)

  return (
    <div className="citations">
      <h4>{t('person.sources')}</h4>
      {cited.length === 0 && <p className="muted small">—</p>}
      <ul>
        {cited.map((c) => {
          const source = data.sources.find((s) => s.id === c.sourceId)
          return (
            <li key={c.id}>
              <span className="source-type">{t(`sources.types.${source?.type ?? 'Other'}`)}</span> {source?.title}
              {c.detail && <span className="muted"> · {c.detail}</span>}
              {c.quotation && <blockquote>“{c.quotation}”</blockquote>}
              {!readOnly && (
                <button className="btn-link danger" onClick={() => run('Remove citation', () => deleteCitation(data, c.id))}>
                  {t('actions.delete')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {!readOnly && data.sources.length > 0 && (
        <div className="row">
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} aria-label={t('sources.pick')}>
            <option value="">{t('sources.pick')}</option>
            {data.sources.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <input placeholder={t('sources.detail')} value={detail} onChange={(e) => setDetail(e.target.value)} className="w-small-text" />
          <button
            className="btn"
            disabled={!sourceId}
            onClick={async () => {
              await run('Cite source', () => addCitation(data, { sourceId, target, detail: detail || undefined }))
              setSourceId('')
              setDetail('')
            }}
          >
            {t('actions.cite')}
          </button>
        </div>
      )}
    </div>
  )
}
