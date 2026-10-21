import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../app/i18n'
import { useGraph } from '../../app/store'
import { formatNasab, personName, searchKey } from '../../domain/text'

/** FR-021: Arabic/English search, ignoring diacritics, hamza forms and spaces; exact person IDs too. */
export function SearchPage() {
  const { t, lang } = useLang()
  const g = useGraph()
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const key = searchKey(q)
    if (!key) return []
    return [...g.persons.values()].filter((p) =>
      [p.ismAr, p.ismEn, p.laqabAr, p.laqabEn, p.publicId].some((v) => v && searchKey(v).includes(key)),
    )
  }, [q, g])

  return (
    <div className="page">
      <input className="search-input" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} dir="auto" />
      {q && results.length === 0 && <p className="muted">{t('search.none')}</p>}
      <ul className="result-list">
        {results.map((p) => (
          <li key={p.id}>
            <Link to={`/person/${p.id}`}>
              <strong>{personName(p, lang)}</strong> <span className="muted small">{p.publicId}</span>
              <div className="muted small" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{formatNasab(p, g.fathers(p.id).slice(0, 3), lang)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
