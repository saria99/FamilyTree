import { Link } from 'react-router-dom'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { deleteClaim, preferClaim, updateVerification } from '../../data/commands'
import { citationCount } from '../../domain/rules'
import { personName } from '../../domain/text'
import { VerificationFields } from '../../shared/fields'
import { StatusBadge } from '../../shared/status'
import { Citations } from './Citations'
import { MarriageEditor, PersonForm } from './forms'

export type Selection = { kind: 'person'; id: string } | { kind: 'marriage'; id: string } | { kind: 'claim'; id: string } | null

export function SidePanel({ selection, onSelect }: { selection: Selection; onSelect: (s: Selection) => void }) {
  const { t, lang } = useLang()
  const g = useGraph()

  if (!selection) {
    return (
      <aside className="side-panel">
        <p className="muted">{t('editor.hint')}</p>
      </aside>
    )
  }

  if (selection.kind === 'person') {
    const person = g.person(selection.id)
    if (!person) return null
    return (
      <aside className="side-panel">
        <header className="panel-header">
          <h3>{personName(person, lang)}</h3>
          <Link className="btn-link" to={`/person/${person.id}`}>{t('actions.profile')}</Link>
        </header>
        <PersonForm key={person.id + JSON.stringify(person)} person={person} onDeleted={() => onSelect(null)} />
        <h4>{t('person.marriages')}</h4>
        <ul className="link-list">
          {g.marriagesOf(person.id).map((m) => {
            const spouse = g.person(person.gender === 'M' ? m.wifeId : m.husbandId)
            return (
              <li key={m.id}>
                <button className="btn-link" onClick={() => onSelect({ kind: 'marriage', id: m.id })}>
                  {spouse ? personName(spouse, lang) : t('marriage.unknownSpouse')} {m.start?.y ? `(${m.start.y})` : ''}
                </button>{' '}
                <StatusBadge status={m.status} compact />
              </li>
            )
          })}
        </ul>
      </aside>
    )
  }

  if (selection.kind === 'marriage') {
    const marriage = g.marriages.get(selection.id)
    if (!marriage) return null
    return (
      <aside className="side-panel">
        <header className="panel-header"><h3>{t('marriage.title')}</h3></header>
        <MarriageEditor key={marriage.id + JSON.stringify(marriage)} marriage={marriage} onDeleted={() => onSelect(null)} />
      </aside>
    )
  }

  return <ClaimPanel claimId={selection.id} onSelect={onSelect} />
}

function ClaimPanel({ claimId, onSelect }: { claimId: string; onSelect: (s: Selection) => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const claim = data.claims.find((c) => c.id === claimId)
  if (!claim) return null
  const marriage = g.marriages.get(claim.marriageId)
  const child = g.person(claim.childId)
  return (
    <aside className="side-panel">
      <header className="panel-header">
        <h3>{t('person.claims')}</h3>
        <span className={`pill ${claim.preferred ? 'pill-strong' : ''}`}>{claim.preferred ? t('person.preferred') : t('person.alternative')}</span>
      </header>
      <p>
        <strong>{personName(child, lang)}</strong> ← {personName(g.person(marriage?.husbandId), lang)} ⚭ {personName(g.person(marriage?.wifeId), lang)}
      </p>
      <VerificationFields
        status={claim.status}
        confidence={claim.confidence}
        citationCount={citationCount(data, 'claim', claim.id)}
        onChange={(status, confidence) => run('Change status', () => updateVerification(data, 'claim', claim.id, { status, confidence }))}
      />
      <div className="form-actions">
        {!claim.preferred && (
          <button className="btn btn-primary" onClick={() => run('Make preferred', () => preferClaim(data, claim.id))}>{t('actions.makePreferred')}</button>
        )}
        <button
          className="btn danger"
          onClick={async () => {
            const ok = await run('Delete claim', () => deleteClaim(data, claim.id))
            if (ok !== false) onSelect(null)
          }}
        >
          {t('actions.delete')}
        </button>
      </div>
      <Citations target={{ kind: 'claim', id: claim.id }} />
    </aside>
  )
}
