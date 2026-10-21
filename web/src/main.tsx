import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/i18n'
import './index.css'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
