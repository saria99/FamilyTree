// Rule messages — keep in sync with specs/001-family-tree-core/contracts/rule-codes.md.

export type RuleCode =
  | 'SAME_GENDER_MARRIAGE'
  | 'MAX_CONCURRENT_WIVES'
  | 'WIFE_HAS_HUSBAND'
  | 'CHILD_HAS_PARENTS'
  | 'DUPLICATE_PARENTAGE_CLAIM'
  | 'CHILD_BORN_BEFORE_PARENT'
  | 'VERIFIED_REQUIRES_SOURCE'
  | 'ANCESTOR_CYCLE'
  | 'DEATH_BEFORE_BIRTH'
  | 'PERSON_HAS_LINKS'
  | 'POSSIBLE_OVERLAP'
  | 'MAHRAM_BLOOD'
  | 'FORBIDDEN_COMBINATION'
  | 'IDDAH_OVERLAP'
  | 'FIFTH_WIFE_DURING_IDDAH'
  | 'DISPUTED_EXCEEDS_LIMIT'
  | 'THIRD_DIVORCE'
  | 'BIRTH_OUTSIDE_MARRIAGE_PERIOD'
  | 'PARENT_TOO_YOUNG'

export type Severity = 'Violation' | 'Warning'

export const SEVERITY: Record<RuleCode, Severity> = {
  SAME_GENDER_MARRIAGE: 'Violation',
  MAX_CONCURRENT_WIVES: 'Violation',
  WIFE_HAS_HUSBAND: 'Violation',
  CHILD_HAS_PARENTS: 'Violation',
  DUPLICATE_PARENTAGE_CLAIM: 'Violation',
  CHILD_BORN_BEFORE_PARENT: 'Violation',
  VERIFIED_REQUIRES_SOURCE: 'Violation',
  ANCESTOR_CYCLE: 'Violation',
  DEATH_BEFORE_BIRTH: 'Violation',
  PERSON_HAS_LINKS: 'Violation',
  POSSIBLE_OVERLAP: 'Warning',
  MAHRAM_BLOOD: 'Warning',
  FORBIDDEN_COMBINATION: 'Warning',
  IDDAH_OVERLAP: 'Warning',
  FIFTH_WIFE_DURING_IDDAH: 'Warning',
  DISPUTED_EXCEEDS_LIMIT: 'Warning',
  THIRD_DIVORCE: 'Warning',
  BIRTH_OUTSIDE_MARRIAGE_PERIOD: 'Warning',
  PARENT_TOO_YOUNG: 'Warning',
}

type Template = { en: string; ar: string }

const MESSAGES: Record<RuleCode, Template> = {
  SAME_GENDER_MARRIAGE: { en: 'A marriage must be between a man and a woman.', ar: 'يجب أن يكون الزواج بين رجل وامرأة.' },
  MAX_CONCURRENT_WIVES: { en: 'A man may not have more than four wives at the same time.', ar: 'لا يجوز للرجل أن يجمع أكثر من أربع زوجات في وقت واحد.' },
  WIFE_HAS_HUSBAND: { en: 'A woman may have only one husband at a time.', ar: 'لا يجوز للمرأة أن تكون زوجة لأكثر من رجل في وقت واحد.' },
  CHILD_HAS_PARENTS: { en: 'This person already has preferred parents. Add this as an alternative claim instead.', ar: 'لهذا الشخص والدان معتمدان بالفعل. أضف هذا كادعاء بديل.' },
  DUPLICATE_PARENTAGE_CLAIM: { en: 'This parentage claim is already recorded.', ar: 'هذا الادعاء بالنسب مسجل بالفعل.' },
  CHILD_BORN_BEFORE_PARENT: { en: '{c} would be born before their parent {p}.', ar: 'سيكون {c} مولودًا قبل والده/والدته {p}.' },
  VERIFIED_REQUIRES_SOURCE: { en: 'A relationship can only be Verified when at least one source is cited.', ar: 'لا يمكن توثيق العلاقة إلا بعد ذكر مصدر واحد على الأقل.' },
  ANCESTOR_CYCLE: { en: 'A person cannot be their own ancestor.', ar: 'لا يمكن أن يكون الشخص جدًا لنفسه.' },
  DEATH_BEFORE_BIRTH: { en: 'Death date is before birth date.', ar: 'تاريخ الوفاة قبل تاريخ الميلاد.' },
  PERSON_HAS_LINKS: { en: 'This person has marriages or children. Detach them first.', ar: 'لهذا الشخص زيجات أو أبناء. افصلهم أولًا.' },
  POSSIBLE_OVERLAP: { en: 'Dates are uncertain; these marriages may overlap.', ar: 'التواريخ غير مؤكدة وقد تتداخل هذه الزيجات.' },
  MAHRAM_BLOOD: { en: '{a} and {b} are mahram by blood ({relation}).', ar: '{a} و{b} محارم بالنسب ({relation}).' },
  FORBIDDEN_COMBINATION: { en: '{h} would be married to {a} and her {relation} at the same time.', ar: 'سيجمع {h} بين {a} و{relation} في وقت واحد.' },
  IDDAH_OVERLAP: { en: "This marriage starts during {w}'s waiting period (iddah).", ar: 'يبدأ هذا الزواج أثناء عدة {w}.' },
  FIFTH_WIFE_DURING_IDDAH: { en: '{h} would have a fifth wife while {w} is still in her iddah from his divorce.', ar: 'سيكون لـ{h} زوجة خامسة و{w} ما زالت في عدتها من طلاقه.' },
  DISPUTED_EXCEEDS_LIMIT: { en: 'This disputed marriage would exceed the marriage limit if it were confirmed.', ar: 'هذا الزواج المتنازع عليه سيتجاوز الحد المسموح لو ثبت.' },
  THIRD_DIVORCE: { en: 'This couple already had three divorces.', ar: 'سبق لهذين الزوجين ثلاث طلقات.' },
  BIRTH_OUTSIDE_MARRIAGE_PERIOD: { en: "Birth date is outside the parents' marriage period.", ar: 'تاريخ الميلاد خارج فترة زواج الوالدين.' },
  PARENT_TOO_YOUNG: { en: "{p} would have been under 12 at this child's birth.", ar: 'سيكون عمر {p} أقل من ١٢ عامًا عند ولادة هذا الطفل.' },
}

export function ruleMessage(code: RuleCode, args: Record<string, string>, lang: 'ar' | 'en'): string {
  return MESSAGES[code][lang].replace(/\{(\w+)\}/g, (_, key: string) => args[key] ?? '')
}
