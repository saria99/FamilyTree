import { Modal } from '../../shared/Modal'
import { useState } from 'react'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { deleteMarriage, deletePerson, saveMarriage, updatePerson } from '../../data/commands'
import type { DivorceKind, EndReason, Marriage, Person } from '../../data/model'
import { citationCount, type MarriageInput } from '../../domain/rules'
import { personName } from '../../domain/text'
import { PartialDateInput, VerificationFields } from '../../shared/fields'
import { Citations } from './Citations'

const END_REASONS: EndReason[] = ['Ongoing', 'Divorce', 'Khul', 'Annulment', 'DeathOfHusband', 'DeathOfWife', 'Unknown']
const DIVORCE_KINDS: DivorceKind[] = ['Revocable', 'IrrevocableMinor', 'IrrevocableMajor']

export function PersonForm({ person, onDeleted }: { person: Person; onDeleted?: () => void }) {
  const { t } = useLang()
  const data = useTreeData()
  const { run } = useStoreApi()
  const [draft, setDraft] = useState(person)
  const set = (patch: Partial<Person>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        void run('Edit person', () => updatePerson(data, draft))
      }}
    >
      <div className="muted small">{t('person.id')}: {person.publicId}</div>
      <label>{t('person.ismAr')}<input dir="rtl" value={draft.ismAr ?? ''} onChange={(e) => set({ ismAr: e.target.value || undefined })} /></label>
      <label>{t('person.ismEn')}<input dir="ltr" value={draft.ismEn ?? ''} onChange={(e) => set({ ismEn: e.target.value || undefined })} /></label>
      <div className="row">
        <label>{t('person.laqabAr')}<input dir="rtl" value={draft.laqabAr ?? ''} onChange={(e) => set({ laqabAr: e.target.value || undefined })} /></label>
        <label>{t('person.laqabEn')}<input dir="ltr" value={draft.laqabEn ?? ''} onChange={(e) => set({ laqabEn: e.target.value || undefined })} /></label>
      </div>
      <label>
        {t('person.gender')}
        <select value={draft.gender} onChange={(e) => set({ gender: e.target.value as Person['gender'] })}>
          <option value="M">{t('gender.M')}</option>
          <option value="F">{t('gender.F')}</option>
        </select>
      </label>
      <PartialDateInput label={t('person.birth')} value={draft.birth} onChange={(birth) => set({ birth })} />
      <PartialDateInput label={t('person.death')} value={draft.death} onChange={(death) => set({ death, isLiving: death ? false : draft.isLiving })} />
      <label className="inline">
        <input type="checkbox" checked={draft.isLiving} onChange={(e) => set({ isLiving: e.target.checked })} /> {t('person.living')}
      </label>
      <label>{t('person.notes')}<textarea rows={2} value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} /></label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{t('actions.save')}</button>
        <button
          type="button"
          className="btn danger"
          onClick={async () => {
            const ok = await run('Delete person', () => deletePerson(data, person.id))
            if (ok !== false) onDeleted?.()
          }}
        >
          {t('actions.delete')}
        </button>
      </div>
    </form>
  )
}

export function MarriageFields({ value, onChange }: { value: MarriageInput; onChange: (v: MarriageInput) => void }) {
  const { t } = useLang()
  const data = useTreeData()
  const set = (patch: Partial<MarriageInput>) => onChange({ ...value, ...patch })
  return (
    <>
      <PartialDateInput label={t('marriage.start')} value={value.start} onChange={(start) => set({ start })} />
      <label>
        {t('marriage.endReason')}
        <select value={value.endReason} onChange={(e) => set({ endReason: e.target.value as EndReason })}>
          {END_REASONS.map((r) => (
            <option key={r} value={r}>{t(`marriage.reasons.${r}`)}</option>
          ))}
        </select>
      </label>
      {value.endReason !== 'Ongoing' && <PartialDateInput label={t('marriage.end')} value={value.end} onChange={(end) => set({ end })} />}
      {value.endReason === 'Divorce' && (
        <label>
          {t('marriage.divorceKind')}
          <select value={value.divorceKind ?? ''} onChange={(e) => set({ divorceKind: (e.target.value || undefined) as DivorceKind | undefined })}>
            <option value="">—</option>
            {DIVORCE_KINDS.map((k) => (
              <option key={k} value={k}>{t(`marriage.divorceKinds.${k}`)}</option>
            ))}
          </select>
        </label>
      )}
      <VerificationFields
        status={value.status}
        confidence={value.confidence}
        citationCount={value.id ? citationCount(data, 'marriage', value.id) : 0}
        onChange={(status, confidence) => set({ status, confidence })}
      />
    </>
  )
}

export function MarriageEditor({ marriage, onDeleted }: { marriage: Marriage; onDeleted?: () => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const [draft, setDraft] = useState<MarriageInput>(marriage)
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        void run('Edit marriage', (ack) => saveMarriage(data, draft, ack))
      }}
    >
      <div className="couple">
        <span>{marriage.husbandId ? personName(g.person(marriage.husbandId), lang) : t('marriage.unknownSpouse')}</span>
        <span aria-hidden>⚭</span>
        <span>{marriage.wifeId ? personName(g.person(marriage.wifeId), lang) : t('marriage.unknownSpouse')}</span>
      </div>
      <MarriageFields value={draft} onChange={setDraft} />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{t('actions.save')}</button>
        <button
          type="button"
          className="btn danger"
          onClick={async () => {
            const ok = await run('Delete marriage', () => deleteMarriage(data, marriage.id))
            if (ok !== false) onDeleted?.()
          }}
        >
          {t('actions.delete')}
        </button>
      </div>
      <Citations target={{ kind: 'marriage', id: marriage.id }} />
    </form>
  )
}

export function MarriageDialog({ husbandId, wifeId, onClose }: { husbandId: string; wifeId: string; onClose: (createdId?: string) => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const [draft, setDraft] = useState<MarriageInput>({ husbandId, wifeId, endReason: 'Ongoing', status: 'Unconfirmed', confidence: 'Low' })
  return (
    <Modal onDismiss={() => onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          const id = await run('Add marriage', (ack) => saveMarriage(data, draft, ack))
          if (id !== false) onClose(id)
        }}
      >
        <h2>{t('marriage.title')}</h2>
        <div className="couple">
          <span>{personName(g.person(husbandId), lang)}</span>
          <span aria-hidden>⚭</span>
          <span>{personName(g.person(wifeId), lang)}</span>
        </div>
        <MarriageFields value={draft} onChange={setDraft} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => onClose()}>{t('actions.cancel')}</button>
          <button type="submit" className="btn btn-primary" autoFocus>{t('actions.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

export function ConfirmDialog({ title, body, confirmLabel, onClose }: { title: string; body: string; confirmLabel: string; onClose: (ok: boolean) => void }) {
  const { t } = useLang()
  return (
    <Modal onDismiss={() => onClose(false)}>
      <div className="modal modal-warning" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button className="btn" onClick={() => onClose(false)}>{t('actions.cancel')}</button>
          <button className="btn btn-primary" autoFocus onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
