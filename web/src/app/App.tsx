import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { EditorPage } from '../features/editor/EditorPage'
import { SourcesPage } from '../features/evidence/SourcesPage'
import { OfflineBanner, UpdateToast } from '../features/pwa/pwa'
import { SearchPage } from '../features/search/SearchPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/viewer/LineagePage'
import { ProfilePage } from '../features/viewer/Profile'
import { TreePage } from '../features/viewer/TreePage'
import { useLang } from './i18n'
import { ProfileMenu } from './ProfileMenu'
import { canEdit, useRole } from './role'
import { StoreProvider } from './store'
import { useIsPhone } from './useIsPhone'

// HashRouter keeps GitHub Pages hosting and service-worker navigation simple for the prototype.
export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  )
}

function Shell() {
  const { t } = useLang()
  const isPhone = useIsPhone()
  const editor = canEdit(useRole())
  const desktopNav = [
    editor ? (['/editor', t('nav.editor')] as const) : (['/tree', t('nav.tree')] as const),
    ['/lineage', t('nav.lineage')],
    ['/sources', t('nav.sources')],
    ['/search', t('nav.search')],
    ['/settings', t('nav.settings')],
  ]
  const phoneNav = [
    ['/lineage', t('nav.lineage'), '🌿'],
    ['/tree', t('nav.tree'), '🌳'],
    ['/search', t('nav.search'), '🔍'],
    ['/settings', t('nav.settings'), '⚙'],
  ] as const

  return (
    <div className={`shell ${isPhone ? 'is-phone' : 'is-desktop'}`}>
      <div className="prototype-banner" role="note">{t('prototypeBanner')}</div>
      <OfflineBanner />
      {!isPhone && (
        <header className="topbar">
          <span className="brand">{t('appName')}</span>
          <nav>
            {desktopNav.map(([to, label]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
          <ProfileMenu />
        </header>
      )}
      {isPhone && (
        <header className="phone-header">
          <span className="brand">{t('appName')}</span>
          <ProfileMenu />
        </header>
      )}
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to={isPhone ? '/lineage' : editor ? '/editor' : '/tree'} replace />} />
          <Route path="/editor" element={editor ? <EditorPage /> : <Navigate to="/tree" replace />} />
          <Route path="/lineage" element={<LineagePage />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/person/:id" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {isPhone && (
        <nav className="tabbar">
          {phoneNav.map(([to, label, icon]) => (
            <NavLink key={to} to={to}>
              <span aria-hidden>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <UpdateToast />
    </div>
  )
}
