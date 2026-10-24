// Prototype data model. Mirrors specs/001-family-tree-core/data-model.md closely enough
// that the JSON file can later be imported by the backend (Phase 11, ImportWizard).

export type Gender = 'M' | 'F'
export type VerificationStatus = 'Verified' | 'OralAccount' | 'Disputed' | 'Unconfirmed'
export type Confidence = 'High' | 'Medium' | 'Low'
export type EndReason =
  | 'Ongoing'
  | 'Divorce'
  | 'Khul'
  | 'Annulment'
  | 'DeathOfHusband'
  | 'DeathOfWife'
  | 'Unknown'
export type DivorceKind = 'Revocable' | 'IrrevocableMinor' | 'IrrevocableMajor'
export type SourceType =
  | 'Document'
  | 'Book'
  | 'OfficialRecord'
  | 'Gravestone'
  | 'Photo'
  | 'Website'
  | 'OralAccount'
  | 'Other'
export type KinshipKind = 'Guardianship' | 'MilkMother' | 'MilkFather'

/** Gregorian date with optional month/day. Missing year = unknown. */
export interface PartialDate {
  y?: number
  m?: number
  d?: number
  approx?: boolean
}

export interface Verification {
  status: VerificationStatus
  confidence: Confidence
}

export interface Person {
  id: string
  publicId: string
  gender: Gender
  ismAr?: string
  ismEn?: string
  laqabAr?: string
  laqabEn?: string
  familyAr?: string
  familyEn?: string
  birth?: PartialDate
  death?: PartialDate
  isLiving: boolean
  notes?: string
}

export interface Marriage extends Verification {
  id: string
  husbandId: string | null
  wifeId: string | null
  start?: PartialDate
  end?: PartialDate
  endReason: EndReason
  divorceKind?: DivorceKind
  divorceCount?: number
  notes?: string
  /** Warning codes the admin confirmed when saving. */
  flags: string[]
}

export interface ParentageClaim extends Verification {
  id: string
  childId: string
  marriageId: string
  preferred: boolean
  flags: string[]
}

export interface KinshipLink extends Verification {
  id: string
  kind: KinshipKind
  personId: string
  relatedPersonId: string
}

export interface Source {
  id: string
  type: SourceType
  title: string
  author?: string
  narratorName?: string
  toldOn?: PartialDate
  recordedBy?: string
  notes?: string
}

export type CitationTarget =
  | { kind: 'marriage'; id: string }
  | { kind: 'claim'; id: string }
  | { kind: 'kinship'; id: string }
  | { kind: 'person'; id: string; fact: 'General' | 'Name' | 'Birth' | 'Death' }

export interface Citation {
  id: string
  sourceId: string
  target: CitationTarget
  detail?: string
  quotation?: string
}

export interface Branch {
  id: string
  nameAr?: string
  nameEn?: string
  rootPersonId?: string
  rootMarriageId?: string
  color: string
}

export interface TreeSettings {
  nameAr: string
  nameEn: string
  idPrefix: string
  /** Zero-padding of person numbers: 4 → P-0001, 6 (default) → DEMO-000001. */
  idDigits?: number
  nextPersonNumber: number
  iddahDivorceDays: number
  iddahWidowDays: number
  maxPregnancyDays: number
}

export interface TreeData {
  format: 'bayrab-prototype'
  version: 1
  tree: TreeSettings
  persons: Person[]
  marriages: Marriage[]
  claims: ParentageClaim[]
  links: KinshipLink[]
  sources: Source[]
  citations: Citation[]
  branches: Branch[]
  /** Manually arranged person positions on the canvas (absent = automatic layout). */
  positions?: Record<string, { x: number; y: number }>
}
