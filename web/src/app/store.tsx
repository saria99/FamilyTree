import { Modal } from '../shared/Modal'
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { CommandResult } from '../data/commands'
import { LocalStore } from '../data/LocalStore'
import { FamilyGraph } from '../domain/graph'
import { describe, violations, warnings, type RuleResult } from '../domain/rules'
import { useLang } from './i18n'

const store = new LocalStore()

interface DialogState {
  results: RuleResult[]
  resolve: (confirmed: boolean) => void
}

interface StoreApi {
  /** Run a command; warnings open a confirm dialog and re-run with the acknowledged codes. */
  run: (label: string, command: (acknowledged: readonly string[]) => CommandResult) => Promise<string | undefined | false>
  undo: () => void
  redo: () => void
  replace: (label: string, data: Parameters<LocalStore['replace']>[1]) => void
}

const ApiContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const ask = useCallback((results: RuleResult[]) => new Promise<boolean>((resolve) => setDialog({ results, resolve })), [])

  const api = useMemo<StoreApi>(
    () => ({
      run: async (label, command) => {
        const first = command([])
        if (first.ok) {
          store.commit(label, first.data)
          return first.createdId
        }
        const blocking = violations(first.outcome)
        if (blocking.length) {
          await ask(blocking)
          return false
        }
        const confirmed = await ask(warnings(first.outcome))
        if (!confirmed) return false
        const second = command(first.outcome.results.map((r) => r.code))
        if (!second.ok) {
          await ask(violations(second.outcome).length ? violations(second.outcome) : second.outcome.results)
          return false
        }
        store.commit(label, second.data)
        return second.createdId
      },
      undo: store.undo,
      redo: store.redo,
      replace: (label, data) => store.replace(label, data),
    }),
    [ask],
  )

  return (
    <ApiContext.Provider value={api}>
      {children}
      {dialog && (
        <RulesDialog
          results={dialog.results}
          onClose={(confirmed) => {
            dialog.resolve(confirmed)
            setDialog(null)
          }}
        />
      )}
    </ApiContext.Provider>
  )
}

function RulesDialog({ results, onClose }: { results: RuleResult[]; onClose: (confirmed: boolean) => void }) {
  const { t, lang } = useLang()
  const refused = results.some((r) => r.severity === 'Violation')
  return (
    <Modal onDismiss={() => onClose(false)}>
      <div className={`modal ${refused ? 'modal-danger' : 'modal-warning'}`} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{refused ? t('rules.refusedTitle') : t('rules.warningTitle')}</h2>
        <ul className="rule-list">
          {results.map((r, i) => (
            <li key={i}>
              <span className={`rule-icon ${r.severity === 'Violation' ? 'is-violation' : 'is-warning'}`} aria-hidden>
                {r.severity === 'Violation' ? '⛔' : '⚠'}
              </span>
              <span>{describe(r, lang)}</span>
              <code className="rule-code">{r.code}</code>
            </li>
          ))}
        </ul>
        {!refused && <p className="muted">{t('rules.warningBody')}</p>}
        <div className="modal-actions">
          {refused ? (
            <button className="btn btn-primary" autoFocus onClick={() => onClose(false)}>{t('actions.close')}</button>
          ) : (
            <>
              <button className="btn" onClick={() => onClose(false)}>{t('actions.cancel')}</button>
              <button className="btn btn-primary" autoFocus onClick={() => onClose(true)}>{t('rules.saveAnyway')}</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function useStoreApi(): StoreApi {
  const api = useContext(ApiContext)
  if (!api) throw new Error('StoreProvider missing')
  return api
}

export function useStoreSnapshot() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

export function useTreeData() {
  return useStoreSnapshot().data
}

export function useGraph(): FamilyGraph {
  const data = useTreeData()
  return useMemo(() => new FamilyGraph(data), [data])
}
