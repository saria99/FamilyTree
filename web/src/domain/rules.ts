import type { Marriage, Person, TreeData, VerificationStatus } from '../data/model'
import { FamilyGraph } from './graph'
import { SEVERITY, ruleMessage, type RuleCode, type Severity } from './messages'
import { bounds, daysFromYears, NEG_INF, POS_INF, type Day } from './partialDate'
import { personName, type Lang } from './text'

// Browser port of the structural rules and the date/iddah/blood-mahram warnings for the prototype.
// The backend (Domain/ kernel) becomes the authority in Phase 3; these stay as instant pre-checks.

export interface RuleResult {
  code: RuleCode
  severity: Severity
  personIds: string[]
  args: Record<string, string>
}

export interface RuleOutcome {
  results: RuleResult[]
}

export const violations = (o: RuleOutcome) => o.results.filter((r) => r.severity === 'Violation')
export const warnings = (o: RuleOutcome) => o.results.filter((r) => r.severity === 'Warning')

export function describe(result: RuleResult, lang: Lang): string {
  return ruleMessage(result.code, result.args, lang)
}

/** Unacknowledged warnings, or any violation, block saving. */
export function isBlocked(outcome: RuleOutcome, acknowledged: readonly string[]): boolean {
  return outcome.results.some((r) => r.severity === 'Violation' || !acknowledged.includes(r.code))
}

const result = (code: RuleCode, personIds: string[], args: Record<string, string> = {}): RuleResult => ({
  code,
  severity: SEVERITY[code],
  personIds,
  args,
})

interface Interval {
  start: Day
  end: Day
}

/** Interval during which the marriage was certainly in force (null if dates can't prove anything). */
function certainInterval(m: Pick<Marriage, 'start' | 'end' | 'endReason'>): Interval | null {
  const s = bounds(m.start)
  if (!s) return null
  let end: Day
  if (m.endReason === 'Ongoing') end = POS_INF
  else {
    const e = bounds(m.end)
    if (!e) return null
    end = e.earliest
  }
  return s.latest < end ? { start: s.latest, end } : null
}

/** Interval during which the marriage could possibly have been in force. */
function possibleInterval(m: Pick<Marriage, 'start' | 'end' | 'endReason'>): Interval {
  const s = bounds(m.start)
  const e = m.endReason === 'Ongoing' ? null : bounds(m.end)
  return { start: s ? s.earliest : NEG_INF, end: m.endReason === 'Ongoing' ? POS_INF : e ? e.latest : POS_INF }
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

/** Max number of intervals active at the same instant while `focus` is active (focus included). */
function maxConcurrent(focus: Interval, others: Interval[]): number {
  const relevant = others.filter((o) => overlaps(o, focus))
  const points = [focus.start, ...relevant.map((o) => Math.max(o.start, focus.start))]
  let max = 1
  for (const t of points) {
    const active = 1 + relevant.filter((o) => o.start <= t && t < o.end).length
    max = Math.max(max, active)
  }
  return max
}

export type MarriageInput = Omit<Marriage, 'id' | 'flags'> & { id?: string }

export function checkMarriage(data: TreeData, input: MarriageInput, lang: Lang = 'en'): RuleOutcome {
  const g = new FamilyGraph(data)
  const results: RuleResult[] = []
  const husband = g.person(input.husbandId)
  const wife = g.person(input.wifeId)
  const name = (p: Person | undefined) => personName(p, lang)

  if ((husband && husband.gender !== 'M') || (wife && wife.gender !== 'F')) {
    results.push(result('SAME_GENDER_MARRIAGE', [input.husbandId, input.wifeId].filter(Boolean) as string[]))
    return { results }
  }

  if (input.status === 'Verified' && (!input.id || citationCount(data, 'marriage', input.id) === 0)) {
    results.push(result('VERIFIED_REQUIRES_SOURCE', []))
  }

  const isDisputed = input.status === 'Disputed'
  const candidateCertain = certainInterval(input)
  const candidatePossible = possibleInterval(input)
  const others = (personId: string) =>
    g.marriagesOf(personId).filter((m) => m.id !== input.id && m.status !== 'Disputed' && m.husbandId && m.wifeId)

  // Husband: at most four wives at once.
  if (husband) {
    const existing = others(husband.id)
    const certainOthers = existing.map(certainInterval).filter((i): i is Interval => !!i)
    if (candidateCertain && maxConcurrent(candidateCertain, certainOthers) > 4) {
      results.push(result(isDisputed ? 'DISPUTED_EXCEEDS_LIMIT' : 'MAX_CONCURRENT_WIVES', [husband.id]))
    } else if (maxConcurrent(candidatePossible, existing.map(possibleInterval)) > 4) {
      results.push(result('POSSIBLE_OVERLAP', [husband.id]))
    } else if (candidateCertain) {
      // A divorced wife still in iddah counts toward the four (majority view) → warning.
      const extended: { interval: Interval; wifeId: string }[] = existing
        .map((m) => {
          const i = certainInterval(m)
          if (!i) return null
          const divorced = m.endReason === 'Divorce' || m.endReason === 'Khul'
          return { interval: divorced ? { start: i.start, end: i.end + data.tree.iddahDivorceDays } : i, wifeId: m.wifeId! }
        })
        .filter((x): x is { interval: Interval; wifeId: string } => !!x)
      if (maxConcurrent(candidateCertain, extended.map((e) => e.interval)) > 4) {
        const inIddah = existing.find((m) => {
          const i = certainInterval(m)
          return i && (m.endReason === 'Divorce' || m.endReason === 'Khul') && i.end <= candidateCertain.start && candidateCertain.start < i.end + data.tree.iddahDivorceDays
        })
        results.push(result('FIFTH_WIFE_DURING_IDDAH', [husband.id], { h: name(husband), w: name(g.person(inIddah?.wifeId)) }))
      }
    }
  }

  // Wife: one husband at a time; iddah after the previous marriage.
  if (wife) {
    for (const m of others(wife.id)) {
      const certain = certainInterval(m)
      if (candidateCertain && certain && overlaps(candidateCertain, certain)) {
        results.push(result(isDisputed ? 'DISPUTED_EXCEEDS_LIMIT' : 'WIFE_HAS_HUSBAND', [wife.id, m.husbandId!]))
        continue
      }
      if (overlaps(candidatePossible, possibleInterval(m))) {
        results.push(result('POSSIBLE_OVERLAP', [wife.id]))
        continue
      }
      const prevEnd = bounds(m.end)
      const start = bounds(input.start)
      if (prevEnd && start && m.endReason !== 'Ongoing') {
        const iddah =
          m.endReason === 'DeathOfHusband' ? data.tree.iddahWidowDays : m.endReason === 'Divorce' || m.endReason === 'Khul' || m.endReason === 'Annulment' ? data.tree.iddahDivorceDays : 0
        if (iddah && start.earliest >= prevEnd.earliest && start.earliest < prevEnd.latest + iddah) {
          results.push(result('IDDAH_OVERLAP', [wife.id], { w: name(wife) }))
        }
      }
    }
  }

  // Third divorce between the same couple.
  if (husband && wife) {
    const between = g.marriagesOf(husband.id).filter((m) => m.wifeId === wife.id && m.id !== input.id)
    const divorces = between.reduce((sum, m) => sum + (m.endReason === 'Divorce' ? (m.divorceCount ?? 1) : 0), 0)
    if (divorces >= 3) results.push(result('THIRD_DIVORCE', [husband.id, wife.id]))
  }

  // Blood mahram (preferred lineage) and combining sisters.
  if (husband && wife) {
    const relation = bloodRelation(g, husband.id, wife.id, lang)
    if (relation) results.push(result('MAHRAM_BLOOD', [husband.id, wife.id], { a: name(husband), b: name(wife), relation }))
    const wifeParents = g.parentMarriage(wife.id)
    if (wifeParents) {
      for (const m of others(husband.id)) {
        const other = g.person(m.wifeId)
        if (!other || other.id === wife.id) continue
        if (g.parentMarriage(other.id)?.id === wifeParents.id && overlaps(candidatePossible, possibleInterval(m))) {
          results.push(
            result('FORBIDDEN_COMBINATION', [husband.id, other.id, wife.id], {
              h: name(husband),
              a: name(other),
              relation: lang === 'ar' ? `أختها ${name(wife)}` : `sister ${name(wife)}`,
            }),
          )
        }
      }
    }
  }

  return { results: dedupe(results) }
}

function bloodRelation(g: FamilyGraph, manId: string, womanId: string, lang: Lang): string | null {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en)
  if (g.ancestors(manId).has(womanId)) return t('his ancestor', 'من أصوله')
  if (g.descendants(manId).has(womanId)) return t('his descendant', 'من فروعه')
  const parents = g.parents(manId)
  for (const p of parents) {
    if (g.descendants(p.id).has(womanId)) {
      const sibling = g.parents(womanId).some((wp) => parents.some((mp) => mp.id === wp.id))
      return sibling ? t('sister', 'أخته') : t('niece', 'ابنة أخيه أو أخته')
    }
  }
  for (const ancestorId of g.ancestors(manId)) {
    if (parents.some((p) => p.id === ancestorId)) continue
    for (const m of g.marriagesOf(ancestorId)) {
      if (g.childrenOf(m.id).some((c) => c.id === womanId)) return t('aunt', 'عمته أو خالته')
    }
  }
  return null
}

export interface ParentageInput {
  childId: string
  marriageId: string
  preferred: boolean
  status: VerificationStatus
}

export function checkParentage(data: TreeData, input: ParentageInput, lang: Lang = 'en'): RuleOutcome {
  const g = new FamilyGraph(data)
  const results: RuleResult[] = []
  const child = g.person(input.childId)
  const marriage = g.marriages.get(input.marriageId)
  if (!child || !marriage) return { results }

  const claims = g.claimsOf(child.id)
  if (claims.some((c) => c.marriageId === marriage.id)) {
    results.push(result('DUPLICATE_PARENTAGE_CLAIM', [child.id]))
    return { results }
  }
  if (input.preferred && claims.some((c) => c.preferred)) results.push(result('CHILD_HAS_PARENTS', [child.id]))

  const parentIds = [marriage.husbandId, marriage.wifeId].filter((id): id is string => !!id)
  const cycleWith = parentIds.find((id) => id === child.id || g.ancestors(id, true).has(child.id))
  if (cycleWith) return { results: [result('ANCESTOR_CYCLE', [child.id, cycleWith])] }

  for (const parentId of parentIds) {
    const parent = g.person(parentId)!
    const cb = bounds(child.birth)
    const pb = bounds(parent.birth)
    if (cb && pb) {
      const args = { c: personName(child, lang), p: personName(parent, lang) }
      if (cb.latest < pb.earliest) results.push(result('CHILD_BORN_BEFORE_PARENT', [child.id, parent.id], args))
      else if (cb.earliest < pb.latest + daysFromYears(12)) results.push(result('PARENT_TOO_YOUNG', [parent.id], args))
    }
  }

  const cb = bounds(child.birth)
  const start = bounds(marriage.start)
  const end = marriage.endReason === 'Ongoing' ? null : bounds(marriage.end)
  if (cb && ((start && cb.latest < start.earliest) || (end && cb.earliest > end.latest + data.tree.maxPregnancyDays))) {
    results.push(result('BIRTH_OUTSIDE_MARRIAGE_PERIOD', [child.id]))
  }

  if (input.status === 'Verified') results.push(result('VERIFIED_REQUIRES_SOURCE', []))
  return { results: dedupe(results) }
}

export function checkPerson(person: Pick<Person, 'birth' | 'death'>): RuleOutcome {
  const b = bounds(person.birth)
  const d = bounds(person.death)
  return { results: b && d && d.latest < b.earliest ? [result('DEATH_BEFORE_BIRTH', [])] : [] }
}

export function citationCount(data: TreeData, kind: 'marriage' | 'claim' | 'kinship', id: string): number {
  return data.citations.filter((c) => c.target.kind === kind && c.target.id === id).length
}

function dedupe(results: RuleResult[]): RuleResult[] {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = r.code + r.personIds.join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
