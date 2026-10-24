// Integrity messages — keep in sync with specs/001-family-tree-core/contracts/rule-codes.md.
// No religious or date rules: the tree records history as given.

export type RuleCode = 'SAME_GENDER_MARRIAGE' | 'CHILD_HAS_PARENTS' | 'DUPLICATE_PARENTAGE_CLAIM' | 'ANCESTOR_CYCLE' | 'PERSON_HAS_LINKS' | 'SIBLING_NEEDS_PARENT'

export type Severity = 'Violation' | 'Warning'

export const SEVERITY: Record<RuleCode, Severity> = {
  SAME_GENDER_MARRIAGE: 'Violation',
  CHILD_HAS_PARENTS: 'Violation',
  DUPLICATE_PARENTAGE_CLAIM: 'Violation',
  ANCESTOR_CYCLE: 'Violation',
  PERSON_HAS_LINKS: 'Violation',
  SIBLING_NEEDS_PARENT: 'Violation',
}

type Template = { en: string; ar: string }

const MESSAGES: Record<RuleCode, Template> = {
  SAME_GENDER_MARRIAGE: { en: 'A marriage is recorded as a husband and a wife. Check the gender of these two people.', ar: 'يُسجَّل الزواج بين زوج وزوجة. تحقق من جنس هذين الشخصين.' },
  CHILD_HAS_PARENTS: { en: 'This person already has preferred parents. Add this as an alternative claim instead.', ar: 'لهذا الشخص والدان معتمدان بالفعل. أضف هذا كادعاء بديل.' },
  DUPLICATE_PARENTAGE_CLAIM: { en: 'This person is already recorded as a child of these parents.', ar: 'هذا الشخص مسجل بالفعل كابن لهذين الوالدين.' },
  ANCESTOR_CYCLE: { en: 'A person cannot be their own ancestor.', ar: 'لا يمكن أن يكون الشخص جدًا لنفسه.' },
  PERSON_HAS_LINKS: { en: 'This person has marriages or children. Remove those links first.', ar: 'لهذا الشخص زيجات أو أبناء. أزل هذه الروابط أولًا.' },
  SIBLING_NEEDS_PARENT: { en: 'Siblings are recorded through shared parents. Add a parent to one of them first.', ar: 'يُسجَّل الإخوة عبر الوالدين المشتركين. أضف أحد الوالدين لأحدهما أولًا.' },
}

export function ruleMessage(code: RuleCode, args: Record<string, string>, lang: 'ar' | 'en'): string {
  return MESSAGES[code][lang].replace(/\{(\w+)\}/g, (_, key: string) => args[key] ?? '')
}
