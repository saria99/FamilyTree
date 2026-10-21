import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../app/i18n'
import { useGraph } from '../../app/store'
import type { Person } from '../../data/model'
import type { FamilyGraph } from '../../domain/graph'
import { formatNasab, personName, type Lang } from '../../domain/text'
import { StatusBadge } from '../../shared/status'
import { PersonLink } from './Profile'
import { useMe } from './me'

/** Phone landing (FR-023): the ancestor ladder of "me", with each ancestor's wives and children per marriage. */
export function LineagePage() {
  const { t, lang } = useLang()
  const g = useGraph()
  const [meId, setMe] = useMe()
  const [line, setLine] = useState<'paternal' | 'maternal'>('paternal')
  const youngest = [...g.persons.values()].sort((a, b) => (b.birth?.y ?? 0) - (a.birth?.y ?? 0))[0]
  const me = g.person(meId) ?? youngest

  if (!me) return <div className="page" />
  const chain = line === 'paternal' ? g.fathers(me.id) : g.mothers(me.id)

  return (
    <div className="page lineage">
      <h1>{t('lineage.title')}</h1>
      <label className="small">
        {t('lineage.pick')}
        <select value={me.id} onChange={(e) => setMe(e.target.value)}>
          {[...g.persons.values()]
            .sort((a, b) => personName(a, lang).localeCompare(personName(b, lang), lang))
            .map((p) => (
              <option key={p.id} value={p.id}>{personName(p, lang)} · {p.publicId}</option>
            ))}
        </select>
      </label>
      <p className="nasab big" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{formatNasab(me, g.fathers(me.id), lang)}</p>
      <div className="segmented wide" role="tablist">
        <button role="tab" aria-selected={line === 'paternal'} className={line === 'paternal' ? 'is-on' : ''} onClick={() => setLine('paternal')}>{t('person.nasab')}</button>
        <button role="tab" aria-selected={line === 'maternal'} className={line === 'maternal' ? 'is-on' : ''} onClick={() => setLine('maternal')}>{t('person.maternal')}</button>
      </div>
      <ol className="ladder">
        <LadderStep g={g} person={me} lang={lang} isMe />
        {chain.map((p) => (
          <LadderStep key={p.id} g={g} person={p} lang={lang} />
        ))}
      </ol>
    </div>
  )
}

function LadderStep({ g, person, lang, isMe = false }: { g: FamilyGraph; person: Person; lang: Lang; isMe?: boolean }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const claim = g.preferredClaim(person.id)
  const marriages = g.marriagesOf(person.id)
  return (
    <li className={`ladder-step ${isMe ? 'is-me' : ''}`}>
      {claim && (
        <div className="ladder-link" aria-hidden>
          <StatusBadge status={claim.status} confidence={claim.confidence} compact />
        </div>
      )}
      <div className="card">
        <div className="card-row">
          <Link to={`/person/${person.id}`} className="ladder-name">{personName(person, lang)}</Link>
          <span className="muted small" dir="ltr">{person.birth?.y ?? '?'}{person.death?.y ? `–${person.death.y}` : ''}</span>
        </div>
        {marriages.length > 0 && (
          <button className="btn-link small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {person.gender === 'M' ? t('lineage.wives') : t('person.marriages')} ({marriages.length}) {open ? '▴' : '▾'}
          </button>
        )}
        {open && (
          <ul className="ladder-marriages">
            {marriages.map((m) => {
              const spouse = g.person(person.gender === 'M' ? m.wifeId : m.husbandId)
              return (
                <li key={m.id}>
                  <PersonLink person={spouse} /> <StatusBadge status={m.status} compact />
                  <span className="muted small" dir="ltr"> {m.start?.y ?? '?'}{m.end?.y ? `–${m.end.y}` : ''}</span>
                  <div className="small">
                    {g.childrenOf(m.id).map((c, i) => (
                      <span key={c.id}>{i > 0 ? '، ' : ''}<PersonLink person={c} /></span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </li>
  )
}
