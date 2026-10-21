import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLang } from '../../app/i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  installListeners.forEach((l) => l())
})

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** "Install app" on Android/desktop Chrome; instructions on iOS Safari (no install prompt there). */
export function InstallButton() {
  const { t } = useLang()
  const [, force] = useState(0)
  const [showIos, setShowIos] = useState(false)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    installListeners.add(l)
    return () => {
      installListeners.delete(l)
    }
  }, [])
  if (isStandalone()) return null
  if (deferredPrompt) {
    return (
      <button
        className="btn btn-primary"
        onClick={async () => {
          await deferredPrompt?.prompt()
          deferredPrompt = null
          force((n) => n + 1)
        }}
      >
        {t('settings.install')}
      </button>
    )
  }
  if (!isIos) return null
  return (
    <>
      <button className="btn" onClick={() => setShowIos((s) => !s)}>{t('settings.install')}</button>
      {showIos && <p className="muted small">{t('settings.iosInstall')}</p>}
    </>
  )
}

export function UpdateToast() {
  const { t } = useLang()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="toast" role="status">
      {t('settings.update')}
      <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>{t('settings.updateNow')}</button>
    </div>
  )
}

export function OfflineBanner() {
  const { t } = useLang()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online ? null : <div className="offline-banner" role="status">{t('settings.offline')}</div>
}
