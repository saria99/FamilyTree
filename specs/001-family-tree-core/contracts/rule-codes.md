# Rule Codes Contract

**Revised**: 2026-10-17 (added claims, verification, iddah-of-fifth-wife, child-before-parent, source codes).

Shared by API, web, and mobile (`packages/shared/src/rules/messages.ts`). The API returns `code`,
`severity`, `personIds`, `relation`, and a bilingual `message`. Clients may override display text from this
table but MUST NOT change severity.

| Code | Severity | HTTP | English | Arabic |
|---|---|---|---|---|
| SAME_GENDER_MARRIAGE | Violation | 422 | A marriage must be between a man and a woman. | يجب أن يكون الزواج بين رجل وامرأة. |
| MAX_CONCURRENT_WIVES | Violation | 422 | A man may not have more than four wives at the same time. | لا يجوز للرجل أن يجمع أكثر من أربع زوجات في وقت واحد. |
| WIFE_HAS_HUSBAND | Violation | 422 | A woman may have only one husband at a time. | لا يجوز للمرأة أن تكون زوجة لأكثر من رجل في وقت واحد. |
| CHILD_HAS_PARENTS | Violation | 422 | This person already has preferred parents. Add this as an alternative claim instead. | لهذا الشخص والدان معتمدان بالفعل. أضف هذا كادعاء بديل. |
| DUPLICATE_PARENTAGE_CLAIM | Violation | 422 | This parentage claim is already recorded. | هذا الادعاء بالنسب مسجل بالفعل. |
| CHILD_BORN_BEFORE_PARENT | Violation | 422 | {c} would be born before their parent {p}. | سيكون {c} مولودًا قبل والده/والدته {p}. |
| VERIFIED_REQUIRES_SOURCE | Violation | 422 | A relationship can only be Verified when at least one source is cited. | لا يمكن توثيق العلاقة إلا بعد ذكر مصدر واحد على الأقل. |
| ANCESTOR_CYCLE | Violation | 422 | A person cannot be their own ancestor. | لا يمكن أن يكون الشخص جدًا لنفسه. |
| DEATH_BEFORE_BIRTH | Violation | 422 | Death date is before birth date. | تاريخ الوفاة قبل تاريخ الميلاد. |
| CROSS_TREE_LINK | Violation | 422 | People from different trees cannot be linked. | لا يمكن ربط أشخاص من شجرات مختلفة. |
| PERSON_HAS_LINKS | Violation | 422 | This person has marriages or children. Detach them first. | لهذا الشخص زيجات أو أبناء. افصلهم أولًا. |
| POSSIBLE_OVERLAP | Warning | 409 | Dates are uncertain; these marriages may overlap. | التواريخ غير مؤكدة وقد تتداخل هذه الزيجات. |
| MAHRAM_BLOOD | Warning | 409 | {a} and {b} are mahram by blood ({relation}). | {a} و{b} محارم بالنسب ({relation}). |
| MAHRAM_MARRIAGE | Warning | 409 | {a} and {b} are mahram by marriage ({relation}). | {a} و{b} محارم بالمصاهرة ({relation}). |
| MAHRAM_MILK | Warning | 409 | {a} and {b} are mahram by nursing ({relation}). | {a} و{b} محارم بالرضاعة ({relation}). |
| FORBIDDEN_COMBINATION | Warning | 409 | {h} would be married to {a} and her {relation} at the same time. | سيجمع {h} بين {a} و{relation} في وقت واحد. |
| IDDAH_OVERLAP | Warning | 409 | This marriage starts during {w}'s waiting period (iddah). | يبدأ هذا الزواج أثناء عدة {w}. |
| FIFTH_WIFE_DURING_IDDAH | Warning | 409 | {h} would have a fifth wife while {w} is still in her iddah from his divorce. | سيكون لـ{h} زوجة خامسة و{w} ما زالت في عدتها من طلاقه. |
| DISPUTED_EXCEEDS_LIMIT | Warning | 409 | This disputed marriage would exceed the marriage limit if it were confirmed. | هذا الزواج المتنازع عليه سيتجاوز الحد المسموح لو ثبت. |
| SOURCE_IN_USE | Warning | 409 | {n} verified relationships rely only on this source and will become Unconfirmed. | {n} علاقات موثقة تعتمد على هذا المصدر وحده وستصبح غير مؤكدة. |
| THIRD_DIVORCE | Warning | 409 | This couple already had three divorces. | سبق لهذين الزوجين ثلاث طلقات. |
| BIRTH_OUTSIDE_MARRIAGE_PERIOD | Warning | 409 | Birth date is outside the parents' marriage period. | تاريخ الميلاد خارج فترة زواج الوالدين. |
| PARENT_TOO_YOUNG | Warning | 409 | {p} would have been under 12 at this child's birth. | سيكون عمر {p} أقل من ١٢ عامًا عند ولادة هذا الطفل. |

Acknowledgement protocol: client re-sends the same request with `acknowledgedWarnings` containing every warning
code returned. If new warnings appear (data changed meanwhile), the server returns 409 again.
