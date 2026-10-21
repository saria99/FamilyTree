import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLang } from '../../app/i18n'
import { useGraph, useTreeData } from '../../app/store'
import type { Person } from '../../data/model'
import { formatDate, formatHijri } from '../../domain/partialDate'
import { formatNasab, personName } from '../../domain/text'
import { StatusBadge } from '../../shared/status'
import { Citations } from '../editor/Citations'
import { useMe } from './me'

export function PersonLink({ person }: { person: Person | undefined }) {
  const { lang, t } = useLang()
  if (!person) return <span className="muted">{t('marriage.unknownSpouse')}</span>
  return <Link to={`/person/${person.id}`}>{personName(person, lang)}</Link>
}

/** Person profile (FR-038): ids, names, facts, nasab, maternal line, claims, marriages with children per marriage. */
export function ProfilePage() {
  const { id = '' } = useParams()
  const { t, lang } = useLang()
  const g = useGraph()
  const data = useTreeData()
  const navigate = useNavigate()
  const [meId, setMe] = useMe()
  const person = g.person(id)
  if (!person) return <div className="page"><p className="muted">—</p></div>

  const fathers = g.fathers(person.id)
  const mothers = g.mothers(person.id)
  const claims = g.claimsOf(person.id)
  const branches = data.branches.filter((b) => g.branchMembers(b).has(person.id))
  const fact = (label: string, date = person.birth) =>
    date?.y ? (
      <div>
        <dt>{label}</dt>
        <dd>
          {formatDate(date, lang)} <span className="muted small">· {formatHijri(date, lang)}</span>
        </dd>
      </div>
    ) : null

  return (
    <div className="page profile">
      <button className="btn-link back" onClick={() => navigate(-1)}>{lang === 'ar' ? '→' : '←'}</button>
      <header className="profile-header">
        <div className={`avatar gender-${person.gender}`} aria-hidden>{personName(person, lang).slice(0, 1)}</div>
        <div>
          <h1>{personName(person, lang)} {person.laqabAr || person.laqabEn ? <small className="muted">({lang === 'ar' ? person.laqabAr ?? person.laqabEn : person.laqabEn ?? person.laqabAr})</small> : null}</h1>
          {person.ismAr && person.ismEn && <div className="muted" dir="auto">{lang === 'ar' ? person.ismEn : person.ismAr}</div>}
          <div className="pill">{person.publicId}</div>
          {branches.map((b) => (
            <span key={b.id} className="pill" style={{ borderColor: b.color, color: b.color }}>{(lang === 'ar' ? b.nameAr || b.nameEn : b.nameEn || b.nameAr) ?? ''}</span>
          ))}
        </div>
        <button className={`btn ${meId === person.id ? 'btn-primary' : ''}`} onClick={() => setMe(person.id)}>
          {meId === person.id ? t('person.isMe') : t('person.setAsMe')}
        </button>
      </header>

      <dl className="facts">
        {fact(t('person.birth'), person.birth)}
        {fact(t('person.death'), person.death)}
      </dl>
      {person.notes && <p dir="auto">{person.notes}</p>}
      <Citations target={{ kind: 'person', id: person.id, fact: 'General' }} readOnly />

      <section>
        <h2>{t('person.nasab')}</h2>
        <p className="nasab" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{formatNasab(person, fathers, lang)}</p>
        {mothers.length > 0 && (
          <>
            <h3>{t('person.maternal')}</h3>
            <ol className="maternal">
              {mothers.map((m) => (
                <li key={m.id}><PersonLink person={m} /> <span className="muted small">{formatNasab(m, g.fathers(m.id).slice(0, 2), lang)}</span></li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section>
        <h2>{t('person.claims')}</h2>
        {claims.length === 0 && <p className="muted">{t('person.unknownParents')}</p>}
        {claims.map((c) => {
          const m = g.marriages.get(c.marriageId)
          return (
            <div key={c.id} className={`card claim ${c.preferred ? 'is-preferred' : ''}`}>
              <div className="card-row">
                <span className={`pill ${c.preferred ? 'pill-strong' : ''}`}>{c.preferred ? t('person.preferred') : t('person.alternative')}</span>
                <StatusBadge status={c.status} confidence={c.confidence} />
              </div>
              <p><PersonLink person={g.person(m?.husbandId)} /> ⚭ <PersonLink person={g.person(m?.wifeId)} /></p>
              <Citations target={{ kind: 'claim', id: c.id }} readOnly />
            </div>
          )
        })}
      </section>

      <section>
        <h2>{t('person.marriages')}</h2>
        {g.marriagesOf(person.id).length === 0 && <p className="muted">{t('person.noMarriages')}</p>}
        {g.marriagesOf(person.id).map((m) => {
          const spouse = g.person(person.gender === 'M' ? m.wifeId : m.husbandId)
          const children = g.childrenOf(m.id)
          const alternatives = g.alternativeClaimsOn(m.id)
          return (
            <div key={m.id} className="card">
              <div className="card-row">
                <strong><PersonLink person={spouse} /></strong>
                <StatusBadge status={m.status} confidence={m.confidence} />
              </div>
              <div className="muted small">
                {formatDate(m.start, lang) || '?'} – {m.endReason === 'Ongoing' ? t('marriage.reasons.Ongoing') : `${formatDate(m.end, lang) || '?'} · ${t(`marriage.reasons.${m.endReason}`)}`}
              </div>
              <h4>{t('person.childrenWith', { name: spouse ? personName(spouse, lang) : t('marriage.unknownSpouse') })}</h4>
              {children.length === 0 && alternatives.length === 0 ? (
                <p className="muted small">{t('person.noChildren')}</p>
              ) : (
                <ul className="children">
                  {children.map((c) => (
                    <li key={c.id}><PersonLink person={c} /> {c.birth?.y ? <span className="muted small">({c.birth.y})</span> : null}</li>
                  ))}
                  {alternatives.map((a) => (
                    <li key={a.id} className="is-alternative"><PersonLink person={g.person(a.childId)} /> <StatusBadge status={a.status} compact /> <span className="muted small">{t('person.alternative')}</span></li>
                  ))}
                </ul>
              )}
              <Citations target={{ kind: 'marriage', id: m.id }} readOnly />
            </div>
          )
        })}
      </section>

      {data.links.some((l) => l.personId === person.id || l.relatedPersonId === person.id) && (
        <section>
          <h2>{t('person.kinship')}</h2>
          <ul>
            {data.links
              .filter((l) => l.personId === person.id || l.relatedPersonId === person.id)
              .map((l) => {
                const label = t(l.kind === 'Guardianship' ? 'person.guardian' : l.kind === 'MilkMother' ? 'person.milkMother' : 'person.milkFather')
                return (
                  <li key={l.id}>
                    {label}: <PersonLink person={g.person(l.relatedPersonId)} /> → <PersonLink person={g.person(l.personId)} /> <StatusBadge status={l.status} compact />
                  </li>
                )
              })}
          </ul>
        </section>
      )}
    </div>
  )
}
