import type { Confidence, PartialDate, VerificationStatus } from '../data/model'
import { useLang } from '../app/i18n'

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

export function PartialDateInput({ label, value, onChange }: { label: string; value?: PartialDate; onChange: (v: PartialDate | undefined) => void }) {
  const { t } = useLang()
  const set = (patch: Partial<PartialDate>) => {
    const next = { ...value, ...patch }
    onChange(next.y ? next : undefined)
  }
  return (
    <fieldset className="date-input">
      <legend>{label}</legend>
      <input aria-label={t('date.year')} placeholder={t('date.year')} inputMode="numeric" className="w-year" value={value?.y ?? ''} onChange={(e) => set({ y: num(e.target.value) })} />
      <input aria-label={t('date.month')} placeholder={t('date.month')} inputMode="numeric" className="w-small" value={value?.m ?? ''} onChange={(e) => set({ m: num(e.target.value) })} />
      <input aria-label={t('date.day')} placeholder={t('date.day')} inputMode="numeric" className="w-small" value={value?.d ?? ''} onChange={(e) => set({ d: num(e.target.value) })} />
      <label className="inline">
        <input type="checkbox" checked={!!value?.approx} onChange={(e) => set({ approx: e.target.checked })} /> {t('date.approx')}
      </label>
    </fieldset>
  )
}

export function VerificationFields({
  status,
  confidence,
  citationCount,
  onChange,
}: {
  status: VerificationStatus
  confidence: Confidence
  citationCount: number
  onChange: (status: VerificationStatus, confidence: Confidence) => void
}) {
  const { t } = useLang()
  return (
    <div className="row">
      <label>
        {t('verification.status')}
        <select value={status} onChange={(e) => onChange(e.target.value as VerificationStatus, confidence)}>
          {(['Unconfirmed', 'OralAccount', 'Disputed', 'Verified'] as const).map((s) => (
            <option key={s} value={s} disabled={s === 'Verified' && citationCount === 0} title={s === 'Verified' && citationCount === 0 ? t('verification.needsSource') : undefined}>
              {t(`verification.statuses.${s}`)}
              {s === 'Verified' && citationCount === 0 ? ` — ${t('verification.needsSource')}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('verification.confidence')}
        <select value={confidence} onChange={(e) => onChange(status, e.target.value as Confidence)}>
          {(['High', 'Medium', 'Low'] as const).map((c) => (
            <option key={c} value={c}>{t(`verification.confidences.${c}`)}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
