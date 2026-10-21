import { useLang } from '../../app/i18n'
import { useTreeData } from '../../app/store'

export function BranchPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t, lang } = useLang()
  const data = useTreeData()
  return (
    <label className="inline">
      <span className="small">{t('editor.filterBranch')}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('editor.allBranches')}</option>
        {data.branches.map((b) => (
          <option key={b.id} value={b.id}>{lang === 'ar' ? b.nameAr ?? b.nameEn : b.nameEn ?? b.nameAr}</option>
        ))}
      </select>
    </label>
  )
}
