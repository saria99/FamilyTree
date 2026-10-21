import { useRef, useState } from 'react'
import { setLanguage, useLang } from '../../app/i18n'
import { useStoreApi, useTreeData } from '../../app/store'
import { downloadTree, readTreeFile } from '../../data/jsonFile'
import { createSampleFamily } from '../../data/sampleFamily'
import { createBayrabSeed } from '../../data/seed'
import { InstallButton } from '../pwa/pwa'

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined

export function SettingsPage() {
  const { t, lang } = useLang()
  const data = useTreeData()
  const { replace } = useStoreApi()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="page">
      <h1>{t('nav.settings')}</h1>

      <section className="card">
        <h2>{t('settings.language')}</h2>
        <div className="segmented">
          <button className={lang === 'ar' ? 'is-on' : ''} onClick={() => setLanguage('ar')}>العربية</button>
          <button className={lang === 'en' ? 'is-on' : ''} onClick={() => setLanguage('en')}>English</button>
        </div>
      </section>

      <section className="card">
        <h2>{t('settings.data')}</h2>
        <div className="stack">
          <button className="btn" onClick={() => downloadTree(data)}>{t('settings.download')}</button>
          <button className="btn" onClick={() => fileInput.current?.click()}>{t('settings.open')}</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                replace('Open file', await readTreeFile(file))
                setMessage(t('settings.opened'))
              } catch (err) {
                setMessage(t('settings.openFailed', { error: (err as Error).message }))
              }
            }}
          />
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm(t('settings.resetConfirm'))) replace('Reset to seed', createBayrabSeed())
            }}
          >
            {t('settings.reset')}
          </button>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm(t('settings.resetConfirm'))) replace('Load demo family', createSampleFamily())
            }}
          >
            {t('settings.loadDemo')}
          </button>
          {message && <p className="small" role="status">{message}</p>}
        </div>
      </section>

      <section className="card">
        <h2>{t('settings.install')}</h2>
        <InstallButton />
      </section>

      <section className="card">
        <h2>{t('settings.feedback')}</h2>
        <p className="muted">{t('settings.feedbackBody')}</p>
        {FEEDBACK_URL && (
          <a className="btn" href={FEEDBACK_URL} target="_blank" rel="noreferrer">{t('settings.feedback')}</a>
        )}
      </section>
    </div>
  )
}
