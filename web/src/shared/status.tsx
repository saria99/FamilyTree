import type { Confidence, VerificationStatus } from '../data/model'
import { useLang } from '../app/i18n'

// One visual language for statuses (research R22). Mirrored later by StatusPdfStyles.cs.
export const STATUS_STYLE: Record<VerificationStatus, { color: string; dash?: string; icon: string }> = {
  Verified: { color: 'var(--status-verified)', icon: '✓' },
  OralAccount: { color: 'var(--status-oral)', dash: '10 5', icon: '🗣' },
  Disputed: { color: 'var(--status-disputed)', dash: '2 4', icon: '⚡' },
  Unconfirmed: { color: 'var(--status-unconfirmed)', dash: '5 5', icon: '?' },
}

export const CONFIDENCE_WIDTH: Record<Confidence, number> = { High: 2.5, Medium: 1.75, Low: 1.1 }

export function edgeStyle(status: VerificationStatus, confidence: Confidence) {
  const s = STATUS_STYLE[status]
  return { stroke: s.color, strokeWidth: CONFIDENCE_WIDTH[confidence], strokeDasharray: s.dash }
}

export function StatusBadge({ status, confidence, compact }: { status: VerificationStatus; confidence?: Confidence; compact?: boolean }) {
  const { t } = useLang()
  const s = STATUS_STYLE[status]
  const label = t(`verification.statuses.${status}`)
  return (
    <span className={`status-badge status-${status}`} title={confidence ? `${label} · ${t(`verification.confidences.${confidence}`)}` : label}>
      <span aria-hidden>{s.icon}</span>
      {!compact && <span>{label}</span>}
    </span>
  )
}

export function StatusLegend({ className = '' }: { className?: string }) {
  const { t } = useLang()
  return (
    <div className={`legend ${className}`} aria-label={t('verification.legend')}>
      {(Object.keys(STATUS_STYLE) as VerificationStatus[]).map((status) => (
        <div key={status} className="legend-row">
          <svg width="34" height="10" aria-hidden>
            <line x1="1" y1="5" x2="33" y2="5" style={edgeStyle(status, 'High')} />
          </svg>
          <StatusBadge status={status} />
        </div>
      ))}
    </div>
  )
}
