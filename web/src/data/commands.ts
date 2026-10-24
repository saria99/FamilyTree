import type { Citation, Marriage, ParentageClaim, Person, Source, TreeData, Verification } from './model'
import { checkMarriage, checkParentage, isBlocked, type MarriageInput, type RuleOutcome } from '../domain/rules'
import { SEVERITY, type RuleCode } from '../domain/messages'
import type { LineageSegment } from '../domain/text'

// Pure commands over TreeData. Each returns the next state or the rule outcome that blocked it.
// In Phase 3+ the same operations map 1:1 to API slices (CreatePerson, CreateMarriage, ...).

export type CommandResult = { ok: true; data: TreeData; createdId?: string } | { ok: false; outcome: RuleOutcome }

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const blocked = (code: RuleCode, personIds: string[] = []): CommandResult => ({
  ok: false,
  outcome: { results: [{ code, severity: SEVERITY[code], personIds, args: {} }] },
})

export interface NewPerson {
  gender: Person['gender']
  ismAr?: string
  ismEn?: string
}

export function addPerson(data: TreeData, input: NewPerson): CommandResult {
  const number = data.tree.nextPersonNumber
  const person: Person = {
    id: newId('p'),
    publicId: `${data.tree.idPrefix}-${String(number).padStart(data.tree.idDigits ?? 6, '0')}`,
    gender: input.gender,
    ismAr: input.ismAr?.trim() || undefined,
    ismEn: input.ismEn?.trim() || undefined,
    isLiving: true,
  }
  return { ok: true, createdId: person.id, data: { ...data, tree: { ...data.tree, nextPersonNumber: number + 1 }, persons: [...data.persons, person] } }
}

export function updatePerson(data: TreeData, person: Person): CommandResult {
  const married = data.marriages.some((m) => m.husbandId === person.id || m.wifeId === person.id)
  const previous = data.persons.find((p) => p.id === person.id)
  if (married && previous && previous.gender !== person.gender) return blocked('SAME_GENDER_MARRIAGE', [person.id])
  const isLiving = person.death?.y ? false : person.isLiving
  return { ok: true, data: { ...data, persons: data.persons.map((p) => (p.id === person.id ? { ...person, isLiving } : p)) } }
}

export function deletePerson(data: TreeData, id: string): CommandResult {
  const linked =
    data.marriages.some((m) => m.husbandId === id || m.wifeId === id) || data.claims.some((c) => c.childId === id) || data.links.some((l) => l.personId === id || l.relatedPersonId === id)
  if (linked) return blocked('PERSON_HAS_LINKS', [id])
  return {
    ok: true,
    data: { ...data, persons: data.persons.filter((p) => p.id !== id), citations: data.citations.filter((c) => !(c.target.kind === 'person' && c.target.id === id)) },
  }
}

export function saveMarriage(data: TreeData, input: MarriageInput, acknowledged: readonly string[]): CommandResult {
  const outcome = checkMarriage(data, input)
  if (isBlocked(outcome, acknowledged)) return { ok: false, outcome }
  const flags = outcome.results.map((r) => r.code)
  if (input.id) {
    return { ok: true, data: { ...data, marriages: data.marriages.map((m) => (m.id === input.id ? ({ ...m, ...input, flags } as Marriage) : m)) } }
  }
  const marriage: Marriage = { ...input, id: newId('m'), flags }
  return { ok: true, createdId: marriage.id, data: { ...data, marriages: [...data.marriages, marriage] } }
}

export function deleteMarriage(data: TreeData, id: string): CommandResult {
  if (data.claims.some((c) => c.marriageId === id)) return blocked('PERSON_HAS_LINKS')
  return {
    ok: true,
    data: { ...data, marriages: data.marriages.filter((m) => m.id !== id), citations: data.citations.filter((c) => !(c.target.kind === 'marriage' && c.target.id === id)) },
  }
}

export interface NewClaim extends Verification {
  childId: string
  marriageId: string
  preferred: boolean
}

export function addClaim(data: TreeData, input: NewClaim, acknowledged: readonly string[]): CommandResult {
  const outcome = checkParentage(data, input)
  if (isBlocked(outcome, acknowledged)) return { ok: false, outcome }
  const claim: ParentageClaim = { ...input, id: newId('c'), flags: outcome.results.map((r) => r.code) }
  let claims = [...data.claims, claim]
  // FR-031: recording an alternative claim marks all of this child's claims Disputed.
  if (!input.preferred) claims = claims.map((c) => (c.childId === input.childId ? { ...c, status: 'Disputed' as const } : c))
  return { ok: true, createdId: claim.id, data: { ...data, claims } }
}

export function preferClaim(data: TreeData, claimId: string): CommandResult {
  const target = data.claims.find((c) => c.id === claimId)
  if (!target) return { ok: true, data }
  // A preferred claim must not create a cycle either (alternatives are already cycle-checked on creation).
  return {
    ok: true,
    data: { ...data, claims: data.claims.map((c) => (c.childId === target.childId ? { ...c, preferred: c.id === claimId } : c)) },
  }
}

export function updateVerification(data: TreeData, kind: 'marriage' | 'claim' | 'kinship', id: string, v: Verification): CommandResult {
  const patch = <T extends { id: string } & Verification>(list: T[]) => list.map((x) => (x.id === id ? { ...x, ...v } : x))
  if (kind === 'marriage') return { ok: true, data: { ...data, marriages: patch(data.marriages) } }
  if (kind === 'claim') return { ok: true, data: { ...data, claims: patch(data.claims) } }
  return { ok: true, data: { ...data, links: patch(data.links) } }
}

export function deleteClaim(data: TreeData, claimId: string): CommandResult {
  // Deleting the preferred claim leaves no preferred claim: the admin must choose (no inference, constitution VIII).
  return {
    ok: true,
    data: { ...data, claims: data.claims.filter((c) => c.id !== claimId), citations: data.citations.filter((c) => !(c.target.kind === 'claim' && c.target.id === claimId)) },
  }
}

export function addSource(data: TreeData, source: Omit<Source, 'id'>): CommandResult {
  const s: Source = { ...source, id: newId('s') }
  return { ok: true, createdId: s.id, data: { ...data, sources: [...data.sources, s] } }
}

export function addCitation(data: TreeData, citation: Omit<Citation, 'id'>): CommandResult {
  const c: Citation = { ...citation, id: newId('ci') }
  return { ok: true, createdId: c.id, data: { ...data, citations: [...data.citations, c] } }
}

export function deleteCitation(data: TreeData, citationId: string): CommandResult {
  const citation = data.citations.find((c) => c.id === citationId)
  if (!citation) return { ok: true, data }
  return { ok: true, data: { ...data, citations: data.citations.filter((c) => c.id !== citationId) } }
}

export interface LineageChoice extends LineageSegment {
  existingId?: string
}

/**
 * Quick entry "A ibn B ibn C": create or reuse each person, then link each to its father through the
 * father's placeholder marriage (unknown mother, reused per father — U1). Links default to Unconfirmed / Low.
 */
export function addLineage(data: TreeData, chain: LineageChoice[], lang: 'ar' | 'en'): CommandResult {
  let next = data
  const ids: string[] = []
  for (const seg of chain) {
    if (seg.existingId) {
      ids.push(seg.existingId)
      continue
    }
    const r = addPerson(next, { gender: seg.gender, [lang === 'ar' ? 'ismAr' : 'ismEn']: seg.name })
    if (!r.ok) return r
    next = r.data
    ids.push(r.createdId!)
  }
  for (let i = 0; i < ids.length - 1; i++) {
    const childId = ids[i]
    const fatherId = ids[i + 1]
    if (next.claims.some((c) => c.childId === childId && c.preferred)) continue
    let placeholder = next.marriages.find((m) => m.husbandId === fatherId && m.wifeId === null)
    if (!placeholder) {
      placeholder = { id: newId('m'), husbandId: fatherId, wifeId: null, endReason: 'Unknown', status: 'Unconfirmed', confidence: 'Low', flags: [] }
      next = { ...next, marriages: [...next.marriages, placeholder] }
    }
    const r = addClaim(next, { childId, marriageId: placeholder.id, preferred: true, status: 'Unconfirmed', confidence: 'Low' }, [])
    if (!r.ok) return r
    next = r.data
  }
  return { ok: true, data: next, createdId: ids[0] }
}

/** The known parent's placeholder marriage (other parent unknown), created if missing — one per parent (U1). */
export function ensurePlaceholder(data: TreeData, parentId: string, gender: Person['gender']): { data: TreeData; marriageId: string } {
  const existing = data.marriages.find((m) => (gender === 'M' ? m.husbandId === parentId && m.wifeId === null : m.wifeId === parentId && m.husbandId === null))
  if (existing) return { data, marriageId: existing.id }
  const placeholder: Marriage = {
    id: newId('m'),
    husbandId: gender === 'M' ? parentId : null,
    wifeId: gender === 'F' ? parentId : null,
    endReason: 'Unknown',
    status: 'Unconfirmed',
    confidence: 'Low',
    flags: [],
  }
  return { data: { ...data, marriages: [...data.marriages, placeholder] }, marriageId: placeholder.id }
}

/** Re-shift: the child's preferred parentage moves to another marriage (cycle / duplicate still refused). */
export function moveClaim(data: TreeData, claimId: string, marriageId: string): CommandResult {
  const claim = data.claims.find((c) => c.id === claimId)
  if (!claim || claim.marriageId === marriageId) return { ok: true, data }
  const without = { ...data, claims: data.claims.filter((c) => c.id !== claimId) }
  const outcome = checkParentage(without, { childId: claim.childId, marriageId, preferred: false, status: claim.status })
  if (isBlocked(outcome, [])) return { ok: false, outcome }
  return { ok: true, createdId: claim.id, data: { ...data, claims: data.claims.map((c) => (c.id === claimId ? { ...c, marriageId } : c)) } }
}

/** Sibling link: the person without parents gets the other's preferred parents. */
export function siblingTarget(data: TreeData, aId: string, bId: string): { childId: string; marriageId: string } | null {
  const preferred = (id: string) => data.claims.find((c) => c.childId === id && c.preferred)
  const a = preferred(aId)
  const b = preferred(bId)
  if (a) return { childId: bId, marriageId: a.marriageId }
  if (b) return { childId: aId, marriageId: b.marriageId }
  return null
}

export const siblingNeedsParent = (): CommandResult => blocked('SIBLING_NEEDS_PARENT')

export function setPosition(data: TreeData, personId: string, position: { x: number; y: number }): CommandResult {
  return { ok: true, data: { ...data, positions: { ...data.positions, [personId]: { x: Math.round(position.x), y: Math.round(position.y) } } } }
}

export function clearPositions(data: TreeData): CommandResult {
  return { ok: true, data: { ...data, positions: undefined } }
}

export type RelativeKind = 'parent' | 'sibling' | 'child'

export interface NewRelative extends NewPerson {
  birth?: Person['birth']
  death?: Person['death']
  /** For a child: one of the anchor's marriages, or undefined for "other parent unknown". */
  marriageId?: string
}

/**
 * "+" on a diamond point: create a person and link them to `anchorId` in one undo step.
 * - parent: fills the empty slot of the anchor's parent marriage, or starts a "other parent unknown" marriage;
 * - sibling: same preferred parents as the anchor;
 * - child: child of the chosen marriage of the anchor (or the anchor's "other parent unknown" marriage).
 */
export function addRelative(data: TreeData, anchorId: string, kind: RelativeKind, input: NewRelative): CommandResult {
  const anchor = data.persons.find((p) => p.id === anchorId)
  if (!anchor) return { ok: true, data }
  const anchorClaim = data.claims.find((c) => c.childId === anchorId && c.preferred)
  if (kind === 'sibling' && !anchorClaim) return blocked('SIBLING_NEEDS_PARENT', [anchorId])

  const created = addPerson(data, input)
  if (!created.ok) return created
  const personId = created.createdId!
  let next: TreeData = {
    ...created.data,
    persons: created.data.persons.map((p) => (p.id === personId ? { ...p, birth: input.birth, death: input.death, isLiving: !input.death?.y } : p)),
  }
  const link = (childId: string, marriageId: string) => addClaim(next, { childId, marriageId, preferred: true, status: 'Unconfirmed', confidence: 'Low' }, [])

  let result: CommandResult
  if (kind === 'sibling') {
    result = link(personId, anchorClaim!.marriageId)
  } else if (kind === 'child') {
    const marriageId = input.marriageId ?? (() => {
      const r = ensurePlaceholder(next, anchorId, anchor.gender)
      next = r.data
      return r.marriageId
    })()
    result = link(personId, marriageId)
  } else {
    const slot = input.gender === 'M' ? 'husbandId' : 'wifeId'
    const current = anchorClaim ? next.marriages.find((m) => m.id === anchorClaim.marriageId) : undefined
    if (current && current[slot] === null) {
      // The anchor's other parent was unknown: the new parent completes the marriage.
      result = { ok: true, data: { ...next, marriages: next.marriages.map((m) => (m.id === current.id ? { ...m, [slot]: personId } : m)) } }
    } else if (current) {
      return blocked('CHILD_HAS_PARENTS', [anchorId])
    } else {
      const r = ensurePlaceholder(next, personId, input.gender)
      next = r.data
      result = link(anchorId, r.marriageId)
    }
  }
  return result.ok ? { ok: true, data: result.data, createdId: personId } : result
}
