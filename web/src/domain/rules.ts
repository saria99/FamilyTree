import type { Marriage, TreeData, VerificationStatus } from '../data/model'
import { FamilyGraph } from './graph'
import { SEVERITY, ruleMessage, type RuleCode, type Severity } from './messages'
import type { Lang } from './text'

// The tree records history as given: no religious or date rules are checked (clarification 2026-10-24).
// Only structural integrity is enforced, so the tree can always be drawn:
//   - a marriage is a husband (man) + a wife (woman)   → SAME_GENDER_MARRIAGE
//   - one preferred parentage per person (others are alternatives) → CHILD_HAS_PARENTS
//   - no duplicate parentage claim                      → DUPLICATE_PARENTAGE_CLAIM
//   - nobody becomes their own ancestor                 → ANCESTOR_CYCLE

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

const result = (code: RuleCode, personIds: string[]): RuleResult => ({ code, severity: SEVERITY[code], personIds, args: {} })

export type MarriageInput = Omit<Marriage, 'id' | 'flags'> & { id?: string }

export function checkMarriage(data: TreeData, input: MarriageInput): RuleOutcome {
  const g = new FamilyGraph(data)
  const husband = g.person(input.husbandId)
  const wife = g.person(input.wifeId)
  if ((husband && husband.gender !== 'M') || (wife && wife.gender !== 'F')) {
    return { results: [result('SAME_GENDER_MARRIAGE', [input.husbandId, input.wifeId].filter(Boolean) as string[])] }
  }
  return { results: [] }
}

export interface ParentageInput {
  childId: string
  marriageId: string
  preferred: boolean
  status: VerificationStatus
}

export function checkParentage(data: TreeData, input: ParentageInput): RuleOutcome {
  const g = new FamilyGraph(data)
  const child = g.person(input.childId)
  const marriage = g.marriages.get(input.marriageId)
  if (!child || !marriage) return { results: [] }

  const claims = g.claimsOf(child.id)
  if (claims.some((c) => c.marriageId === marriage.id)) return { results: [result('DUPLICATE_PARENTAGE_CLAIM', [child.id])] }

  const parentIds = [marriage.husbandId, marriage.wifeId].filter((id): id is string => !!id)
  const cycleWith = parentIds.find((id) => id === child.id || g.ancestors(id, true).has(child.id))
  if (cycleWith) return { results: [result('ANCESTOR_CYCLE', [child.id, cycleWith])] }

  if (input.preferred && claims.some((c) => c.preferred)) return { results: [result('CHILD_HAS_PARENTS', [child.id])] }
  return { results: [] }
}

export function citationCount(data: TreeData, kind: 'marriage' | 'claim' | 'kinship', id: string): number {
  return data.citations.filter((c) => c.target.kind === kind && c.target.id === id).length
}
