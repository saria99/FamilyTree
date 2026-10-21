import type { Person } from '../data/model'

export type Lang = 'ar' | 'en'

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g
const TATWEEL = /ـ/g

/** Search normalisation — must match ArabicNormalizer.cs (test-vectors/normalize.json). */
export function normalizeArabic(text: string): string {
  return text
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/[-_'’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Like normalizeArabic but also removes spaces, so "عبد الله" matches "عبدالله". */
export function searchKey(text: string): string {
  return normalizeArabic(text).replace(/\s/g, '')
}

export function personName(p: Person | undefined, lang: Lang): string {
  if (!p) return lang === 'ar' ? 'غير معروف' : 'Unknown'
  return (lang === 'ar' ? p.ismAr || p.ismEn : p.ismEn || p.ismAr) || '—'
}

/**
 * Nasab chain: "Ali ibn Hamid ibn Salim" / "علي بن حامد بن سالم".
 * `fathers` is the paternal chain, nearest first. Must match NasabFormatter.cs (test-vectors/nasab.json).
 */
export function formatNasab(person: Person, fathers: Person[], lang: Lang): string {
  const parts = [personName(person, lang)]
  let childGender = person.gender
  for (const father of fathers) {
    const link = lang === 'ar' ? (childGender === 'F' ? 'بنت' : 'بن') : childGender === 'F' ? 'bint' : 'ibn'
    parts.push(link, personName(father, lang))
    childGender = 'M'
  }
  return parts.join(' ')
}

export interface LineageSegment {
  name: string
  gender: 'M' | 'F'
}

const SON_WORDS = new Set(['ibn', 'bin', 'b.', 'ben', 'بن', 'ابن'])
const DAUGHTER_WORDS = new Set(['bint', 'bt.', 'بنت'])

/** "Fatimah bint Muhammad ibn Abdullah" → [Fatimah (F), Muhammad (M), Abdullah (M)]. */
export function parseLineage(text: string): LineageSegment[] {
  const tokens = text.replace(TASHKEEL, '').replace(TATWEEL, '').trim().split(/\s+/).filter(Boolean)
  const segments: LineageSegment[] = []
  let current: string[] = []
  let currentGender: 'M' | 'F' = 'M'
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (SON_WORDS.has(lower) || DAUGHTER_WORDS.has(lower)) {
      if (current.length) {
        segments.push({ name: current.join(' '), gender: segments.length === 0 && DAUGHTER_WORDS.has(lower) ? 'F' : currentGender })
        current = []
        currentGender = 'M'
      }
      continue
    }
    current.push(token)
  }
  if (current.length) segments.push({ name: current.join(' '), gender: segments.length === 0 ? currentGender : 'M' })
  return segments
}

export function isLineageText(text: string): boolean {
  return parseLineage(text).length > 1
}

export const isArabicText = (text: string): boolean => /[؀-ۿ]/.test(text)
