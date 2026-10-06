# Rule Codes Contract

Shared by API, web, and mobile (`packages/shared/src/rules/messages.ts`). The API returns `code`,
`severity`, `personIds`, `relation`, and a bilingual `message`. Clients may override display text from this
table but MUST NOT change severity.

| Code | Severity | HTTP | English | Arabic |
|---|---|---|---|---|
| SAME_GENDER_MARRIAGE | Violation | 422 | A marriage must be between a man and a woman. | يجب أن يكون الزواج بين رجل وامرأة. |
| MAX_CONCURRENT_WIVES | Violation | 422 | A man may not have more than four wives at the same time. | لا يجوز للرجل أن يجمع أكثر من أربع زوجات في وقت واحد. |
| WIFE_HAS_HUSBAND | Violation | 422 | A woman may have only one husband at a time. | لا يجوز للمرأة أن تكون زوجة لأكثر من رجل في وقت واحد. |
| CHILD_HAS_PARENTS | Violation | 422 | This person is already the child of another marriage. | هذا الشخص مسجل بالفعل كابن لزواج آخر. |
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
| THIRD_DIVORCE | Warning | 409 | This couple already had three divorces. | سبق لهذين الزوجين ثلاث طلقات. |
| BIRTH_OUTSIDE_MARRIAGE_PERIOD | Warning | 409 | Birth date is outside the parents' marriage period. | تاريخ الميلاد خارج فترة زواج الوالدين. |
| PARENT_TOO_YOUNG | Warning | 409 | {p} would have been under 12 at this child's birth. | سيكون عمر {p} أقل من ١٢ عامًا عند ولادة هذا الطفل. |

Acknowledgement protocol: client re-sends the same request with `acknowledgedWarnings` containing every warning
code returned. If new warnings appear (data changed meanwhile), the server returns 409 again.
