import type { Branch, Citation, Gender, Marriage, ParentageClaim, Person, Source, SourceType, TreeData, VerificationStatus } from '../model'

// Converts genealogy records in the Bayrab research format (one object per person with fatherId / motherId /
// spouseIds / status / sourceIds) into TreeData. Only relationships written in the records are created —
// nothing is inferred (constitution VIII).

export interface PersonRecord {
  personId: string
  primaryName: string
  arabicName?: string
  gender?: Gender
  fatherId: string | null
  motherId: string | null
  spouseIds: string[]
  branch?: string
  status?: string
  sourceIds?: string[]
  notes?: string
}

export interface SourceRecord {
  sourceId: string
  type?: SourceType
  title: string
  notes?: string
}

export interface RecordsFile {
  tree: { nameEn: string; nameAr?: string; idPrefix: string; idDigits?: number }
  sources?: SourceRecord[]
  branches?: { name: string; nameAr?: string; rootPersonId?: string; color?: string }[]
  persons: PersonRecord[]
}

const STATUS: Record<string, VerificationStatus> = {
  verified: 'Verified',
  reported: 'OralAccount',
  oral: 'OralAccount',
  disputed: 'Disputed',
  unconfirmed: 'Unconfirmed',
}

export function statusOf(value: string | undefined): VerificationStatus {
  return STATUS[(value ?? '').toLowerCase()] ?? 'Unconfirmed'
}

export function recordsToTree(file: RecordsFile): TreeData {
  const problems: string[] = []
  const byId = new Map(file.persons.map((r) => [r.personId, r]))

  // Gender: explicit, or from being someone's father/mother. A person whose gender is still unknown is an error.
  const gender = new Map<string, Gender>()
  for (const r of file.persons) if (r.gender) gender.set(r.personId, r.gender)
  for (const r of file.persons) {
    if (r.fatherId) gender.set(r.fatherId, 'M')
    if (r.motherId) gender.set(r.motherId, 'F')
  }

  const persons: Person[] = file.persons.map((r) => {
    const g = gender.get(r.personId)
    if (!g) problems.push(`${r.personId}: gender is unknown (add "gender": "M" or "F")`)
    return {
      id: r.personId,
      publicId: r.personId,
      gender: g ?? 'M',
      ismEn: r.primaryName,
      ismAr: r.arabicName || undefined,
      isLiving: false,
      notes: r.notes,
    }
  })

  const marriages: Marriage[] = []
  const claims: ParentageClaim[] = []
  const citations: Citation[] = []
  const marriageKey = (h: string | null, w: string | null) => `${h ?? '?'}+${w ?? '?'}`
  const marriageIds = new Map<string, string>()
  const ensureMarriage = (h: string | null, w: string | null, status: VerificationStatus, sourceIds: string[]) => {
    const key = marriageKey(h, w)
    let id = marriageIds.get(key)
    if (!id) {
      id = `m:${key}`
      marriageIds.set(key, id)
      marriages.push({ id, husbandId: h, wifeId: w, endReason: 'Unknown', status, confidence: 'Low', flags: [] })
      sourceIds.forEach((s, i) => citations.push({ id: `ci:${id}:${i}`, sourceId: s, target: { kind: 'marriage', id: id! } }))
    }
    return id
  }

  for (const r of file.persons) {
    const status = statusOf(r.status)
    const sources = r.sourceIds ?? []
    for (const ref of [r.fatherId, r.motherId, ...r.spouseIds]) {
      if (ref && !byId.has(ref)) problems.push(`${r.personId}: refers to unknown person ${ref}`)
    }
    // Parents → one marriage (placeholder spouse when only one parent is known), preferred claim.
    if (r.fatherId || r.motherId) {
      const marriageId = ensureMarriage(r.fatherId, r.motherId, status, sources)
      const claimId = `c:${r.personId}`
      claims.push({ id: claimId, childId: r.personId, marriageId, preferred: true, status, confidence: 'Low', flags: [] })
      sources.forEach((s, i) => citations.push({ id: `ci:${claimId}:${i}`, sourceId: s, target: { kind: 'claim', id: claimId } }))
    }
    // Spouses → marriages (each pair once, whichever record lists it).
    for (const spouseId of r.spouseIds) {
      const [h, w] = gender.get(r.personId) === 'F' ? [spouseId, r.personId] : [r.personId, spouseId]
      ensureMarriage(h, w, status, sources)
    }
    // The person's own sources are cited on the person.
    sources.forEach((s, i) => citations.push({ id: `ci:${r.personId}:${i}`, sourceId: s, target: { kind: 'person', id: r.personId, fact: 'General' } }))
  }

  const sources: Source[] = (file.sources ?? []).map((s) => ({ id: s.sourceId, type: s.type ?? 'Other', title: s.title, notes: s.notes }))
  for (const c of citations) {
    if (!sources.some((s) => s.id === c.sourceId)) {
      sources.push({ id: c.sourceId, type: 'Other', title: c.sourceId, notes: 'Details of this source were not provided yet.' })
    }
  }

  const branches: Branch[] = (file.branches ?? []).map((b, i) => ({ id: `b${i + 1}`, nameEn: b.name, nameAr: b.nameAr, rootPersonId: b.rootPersonId, color: b.color ?? '#1f5c50' }))

  if (problems.length) throw new Error(problems.join('\n'))

  const digits = file.tree.idDigits ?? 6
  const highest = Math.max(0, ...file.persons.map((r) => Number(r.personId.split('-').pop()) || 0))
  return {
    format: 'bayrab-prototype',
    version: 1,
    tree: {
      nameEn: file.tree.nameEn,
      nameAr: file.tree.nameAr ?? '',
      idPrefix: file.tree.idPrefix,
      idDigits: digits,
      nextPersonNumber: highest + 1,
      iddahDivorceDays: 90,
      iddahWidowDays: 130,
      maxPregnancyDays: 1461,
    },
    persons,
    marriages,
    claims,
    links: [],
    sources,
    citations,
    branches,
  }
}
