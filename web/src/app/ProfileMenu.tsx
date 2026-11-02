import { useEffect, useRef, useState } from 'react'
import { useLang } from './i18n'
import { setRole, useRole, type Role } from './role'

/**
 * Profile icon (FR-049): until sign-in exists, the tester switches between Admin and Member (view only) here.
 * Later the same icon shows the signed-in user and their role.
 */
export function ProfileMenu() {
  const { t } = useLang()
  const role = useRole()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const roles: { value: Role; hint: string }[] = [
    { value: 'admin', hint: t('role.adminHint') },
    { value: 'member', hint: t('role.memberHint') },
  ]

  return (
    <div className="profile-menu" ref={root}>
      <button
        type="button"
        className={`profile-button role-${role}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('role.menu')}: ${t(`role.${role}`)}`}
        title={`${t('role.viewingAs')} ${t(`role.${role}`)}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
        </svg>
        <span className="profile-role">{t(`role.${role}`)}</span>
      </button>
      {open && (
        <div className="profile-popover" role="menu" aria-label={t('role.viewingAs')}>
          <div className="profile-heading">{t('role.viewingAs')}</div>
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              role="menuitemradio"
              aria-checked={role === r.value}
              className={`profile-option ${role === r.value ? 'is-on' : ''}`}
              onClick={() => {
                setRole(r.value)
                setOpen(false)
              }}
            >
              <span className="profile-check" aria-hidden>{role === r.value ? '●' : '○'}</span>
              <span>
                <strong>{t(`role.${r.value}`)}</strong>
                <small>{r.hint}</small>
              </span>
            </button>
          ))}
          <p className="profile-note">{t('role.note')}</p>
        </div>
      )}
    </div>
  )
}
