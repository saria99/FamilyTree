import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { EndReason, Gender, PartialDate, TreeData, VerificationStatus } from '../data/model'
import { checkMarriage, checkParentage } from './rules'
import { formatNasab, normalizeArabic, parseLineage } from './text'

const vectors = (file: string) => JSON.parse(readFileSync(resolve(__dirname, '../../../test-vectors', file), 'utf8'))

type DateVector = number | [number, number, number] | null
const toDate = (v: DateVector): PartialDate | undefined =>
  v === null ? undefined : Array.isArray(v) ? { y: v[0], m: v[1], d: v[2] } : { y: v }

interface RuleCase {
  name: string
  persons: [string, Gender, number | null][]
  marriages: [string, string, string, DateVector, DateVector, EndReason, VerificationStatus][]
  claims?: [string, string, string, boolean][]
  check: { marriage?: [string, string, DateVector, DateVector, EndReason, VerificationStatus]; parentage?: [string, string, boolean, VerificationStatus] }
  expect: string[]
}

function build(c: RuleCase): TreeData {
  return {
    format: 'bayrab-prototype',
    version: 1,
    tree: { nameAr: '', nameEn: '', idPrefix: 'T', nextPersonNumber: 1, iddahDivorceDays: 90, iddahWidowDays: 130, maxPregnancyDays: 1461 },
    persons: c.persons.map(([id, gender, y]) => ({ id, publicId: id, gender, ismEn: id, birth: y ? { y } : undefined, isLiving: true })),
    marriages: c.marriages.map(([id, h, w, s, e, endReason, status]) => ({
      id, husbandId: h, wifeId: w, start: toDate(s), end: toDate(e), endReason, status, confidence: 'Low', flags: [],
    })),
    claims: (c.claims ?? []).map(([id, childId, marriageId, preferred]) => ({ id, childId, marriageId, preferred, status: 'Unconfirmed', confidence: 'Low', flags: [] })),
    links: [], sources: [], citations: [], branches: [],
  }
}

describe('rule vectors', () => {
  for (const c of vectors('rules.json').cases as RuleCase[]) {
    it(c.name, () => {
      const data = build(c)
      let codes: string[] = []
      if (c.check.marriage) {
        const [h, w, s, e, endReason, status] = c.check.marriage
        codes = checkMarriage(data, { husbandId: h, wifeId: w, start: toDate(s), end: toDate(e), endReason, status, confidence: 'Low' }).results.map((r) => r.code)
      } else if (c.check.parentage) {
        const [childId, marriageId, preferred, status] = c.check.parentage
        codes = checkParentage(data, { childId, marriageId, preferred, status }).results.map((r) => r.code)
      }
      expect([...new Set(codes)].sort()).toEqual([...c.expect].sort())
    })
  }
})

describe('text vectors', () => {
  const t = vectors('text.json')
  it.each(t.normalize as [string, string][])('normalize %s', (input, expected) => {
    expect(normalizeArabic(input)).toBe(expected)
  })
  it.each(t.nasab as { person: [string, string, Gender]; fathers: [string, string][]; ar: string; en: string }[])('nasab $en', (v) => {
    const person = { id: 'x', publicId: 'x', gender: v.person[2], ismAr: v.person[0], ismEn: v.person[1], isLiving: true }
    const fathers = v.fathers.map(([ar, en], i) => ({ id: `f${i}`, publicId: '', gender: 'M' as const, ismAr: ar, ismEn: en, isLiving: false }))
    expect(formatNasab(person, fathers, 'ar')).toBe(v.ar)
    expect(formatNasab(person, fathers, 'en')).toBe(v.en)
  })
  it.each(t.lineage as { text: string; segments: [string, Gender][] }[])('lineage $text', (v) => {
    expect(parseLineage(v.text).map((s) => [s.name, s.gender])).toEqual(v.segments)
  })
})
