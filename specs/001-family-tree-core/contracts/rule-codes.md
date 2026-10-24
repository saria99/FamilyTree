# Integrity Codes Contract

**Revised**: 2026-10-24 — religious-rule and date checks removed (research R31). Only integrity codes remain.

Shared by the API (`Domain/Rules/RuleMessages.cs`) and the React PWA (`web/src/domain/messages.ts`). The API returns
`code`, `severity`, `personIds`, and a bilingual `message`. Clients may override display text but MUST NOT change severity.

| Code | Severity | HTTP | English | Arabic |
|---|---|---|---|---|
| SAME_GENDER_MARRIAGE | Violation | 422 | A marriage is recorded as a husband and a wife. Check the gender of these two people. | يُسجَّل الزواج بين زوج وزوجة. تحقق من جنس هذين الشخصين. |
| CHILD_HAS_PARENTS | Violation | 422 | This person already has preferred parents. Add this as an alternative claim instead. | لهذا الشخص والدان معتمدان بالفعل. أضف هذا كادعاء بديل. |
| DUPLICATE_PARENTAGE_CLAIM | Violation | 422 | This person is already recorded as a child of these parents. | هذا الشخص مسجل بالفعل كابن لهذين الوالدين. |
| ANCESTOR_CYCLE | Violation | 422 | A person cannot be their own ancestor. | لا يمكن أن يكون الشخص جدًا لنفسه. |
| PERSON_HAS_LINKS | Violation | 422 | This person has marriages or children. Remove those links first. | لهذا الشخص زيجات أو أبناء. أزل هذه الروابط أولًا. |
| CROSS_TREE_LINK | Violation | 422 | People from different trees cannot be linked. | لا يمكن ربط أشخاص من شجرات مختلفة. |

No warning codes are currently defined; the 409 acknowledgement protocol is kept in the API for future use.
