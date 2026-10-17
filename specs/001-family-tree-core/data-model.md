# Data Model: Bayrab Genealogy — Core Platform

**Feature**: 001-family-tree-core | **Database**: PostgreSQL 17 | **Extensions**: `btree_gist`, `pg_trgm`, `citext`
**Revised**: 2026-10-17 — parentage claims, verification, sources/citations, files, person identifiers, branches,
jobs, import batches.

All ids are `uuid` (v7, generated in .NET). All tree-owned tables carry `tree_id` and use composite
foreign keys `(tree_id, id)` so no link can cross trees. Soft delete via `deleted_at`. Optimistic
concurrency via PostgreSQL `xmin` mapped as EF row version.

## Value objects

### PartialDate

Stored as a set of columns with a prefix (e.g. `birth_`):

| Column | Type | Notes |
|---|---|---|
| `{p}_earliest` | date NULL | Earliest Gregorian day the fact could be |
| `{p}_latest` | date NULL | Latest Gregorian day |
| `{p}_precision` | smallint | 0 Unknown, 1 Year, 2 Month, 3 Day |
| `{p}_calendar` | smallint | 0 Gregorian, 1 Hijri (as entered) |
| `{p}_y`, `{p}_m`, `{p}_d` | int NULL | Components as entered (in the entered calendar) |
| `{p}_approx` | bool | "circa" flag, widens bounds by ±5 years when precision is Year |

### Verification (on every relationship table)

| Column | Type | Notes |
|---|---|---|
| `verification_status` | smallint | 0 Unconfirmed (default), 1 OralAccount, 2 Disputed, 3 Verified |
| `confidence` | smallint | 0 Low (default), 1 Medium, 2 High |

Verified requires ≥1 citation: domain rule `VERIFIED_REQUIRES_SOURCE` plus the deferred constraint trigger
`trg_verified_has_citation` on `marriage`, `parentage_claim`, `kinship_link` (checked at commit).

## Entities

### family_tree
| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| name_ar, name_en | text | at least one required |
| id_prefix | text | 2–6 uppercase letters, e.g. `BYR`; immutable after creation |
| next_person_number | int | default 1; incremented under row lock (R20) |
| visibility | smallint | 0 Private (default), 1 Public |
| iddah_divorce_days | int | default 90 |
| iddah_widow_days | int | default 130 |
| max_pregnancy_days | int | default 1461 (≈4 years), warning only |
| root_person_id | uuid NULL | default focus person |
| created_at, created_by | | |

### tree_membership
| Field | Type | Rules |
|---|---|---|
| tree_id, user_id | PK | |
| role | smallint | 0 Owner, 1 Admin, 2 Member. Exactly ≥1 Owner per tree |
| linked_person_id | uuid NULL | "this is me" — mobile landing ancestor view |

### invitation
`id, tree_id, email citext, role, token_hash, expires_at, accepted_at, invited_by`.

### app_user (ASP.NET Core Identity tables, `AspNetUsers` etc.) + refresh_token
`refresh_token(id, user_id, token_hash, expires_at, revoked_at, replaced_by_id, device)`.
Password reset uses Identity's token provider (no extra table).

### person
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | UNIQUE (tree_id, id) |
| public_id | text | e.g. `BYR-000123`; UNIQUE (tree_id, public_id); never reused (R20) |
| gender | smallint | 1 Male, 2 Female — required, immutable once in a marriage |
| ism_ar, ism_en | text | at least one required |
| laqab_ar/en, kunya_ar/en, nisba_ar/en | text NULL | |
| family_name_ar/en | text NULL | tribe / family (e.g. "Bayrab") |
| birth_* | PartialDate | |
| birth_place, death_place | text NULL | |
| death_* | PartialDate | |
| is_living | bool | default true; set false when a death date is recorded |
| photo_file_id | uuid NULL | FK stored_file (G1) |
| notes | text NULL | |
| search_text | text | normalised names + public_id; GIN `gin_trgm_ops` index |
| deleted_at | timestamptz NULL | |

> `parent_marriage_id` is **removed**; parentage lives in `parentage_claim`.

### marriage (union)
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | UNIQUE (tree_id, id) |
| husband_id | uuid NULL | FK person, must be Male. NULL = unknown husband placeholder |
| wife_id | uuid NULL | FK person, must be Female. NULL = unknown wife placeholder |
| is_placeholder | bool GENERATED | `husband_id IS NULL OR wife_id IS NULL` |
| start_* | PartialDate | nikah date |
| end_* | PartialDate | |
| end_reason | smallint | 0 Ongoing, 1 Divorce (talaq), 2 Khul', 3 Annulment (faskh), 4 Death of husband, 5 Death of wife, 6 Unknown |
| divorce_kind | smallint NULL | 1 Revocable (raj'i), 2 Irrevocable minor (ba'in sughra), 3 Irrevocable major (ba'in kubra) |
| divorce_count | smallint NULL | 1–3, number of talaq pronounced in this marriage record |
| sequence_for_husband | int | display order (by start date, editable) |
| certain_period | daterange GENERATED | `daterange(start_latest, COALESCE(end_earliest, 'infinity'))` when start known and non-empty, else NULL |
| verification_status, confidence | Verification | |
| notes | text NULL | |
| deleted_at | timestamptz NULL | |

Constraints:
- `CHECK (husband_id IS DISTINCT FROM wife_id)`; at least one spouse not NULL.
- `EXCLUDE USING gist (tree_id WITH =, wife_id WITH =, certain_period WITH &&) WHERE (wife_id IS NOT NULL AND certain_period IS NOT NULL AND deleted_at IS NULL AND verification_status <> 2)` — one husband at a time; Disputed excluded (constitution I).
- Max-four-wives enforced in domain under `SELECT ... FOR UPDATE` on the husband row (R2), Disputed excluded, iddah extension → warning only.
- At most one placeholder marriage per known parent: partial unique indexes `(tree_id, husband_id) WHERE wife_id IS NULL AND deleted_at IS NULL` and `(tree_id, wife_id) WHERE husband_id IS NULL AND deleted_at IS NULL` (U1, R27).
- Gender correctness checked in domain (cross-table, not a CHECK).

### parentage_claim
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| child_id | uuid | FK person |
| marriage_id | uuid | FK marriage (the claimed father + mother) |
| is_preferred | bool | exactly one preferred per child when any claim exists |
| birth_order | int NULL | ordering among siblings of the same marriage |
| verification_status, confidence | Verification | |
| notes | text NULL | |
| deleted_at | timestamptz NULL | |

Constraints / indexes:
- Partial UNIQUE `(tree_id, child_id) WHERE is_preferred AND deleted_at IS NULL` — one preferred parentage (FR-010).
- UNIQUE `(tree_id, child_id, marriage_id) WHERE deleted_at IS NULL` — `DUPLICATE_PARENTAGE_CLAIM`.
- Index `(tree_id, marriage_id) WHERE is_preferred` — children of a union; used by all lineage CTEs.
- Domain: when a child has claims, exactly one is preferred (switching preferred is one command that flips two rows).

Children of a marriage (for display) = preferred claims on it, ordered by birth then `birth_order`. Alternative
claims are returned separately and drawn as Disputed edges.

### kinship_link (non-lineage)
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| kind | smallint | 1 Guardianship (kafala), 2 Milk mother (rada'a), 3 Milk father (husband of milk mother, "laban al-fahl") |
| person_id | uuid | the child / nursling |
| related_person_id | uuid | guardian / milk mother / milk father |
| start_*, end_* | PartialDate | optional |
| verification_status, confidence | Verification | |
| notes | text NULL | |
| deleted_at | timestamptz NULL | |

Milk links feed `MAHRAM_MILK` checks; guardianship never does and never changes lineage.

### source
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| type | smallint | 0 Document, 1 Book, 2 OfficialRecord, 3 Gravestone, 4 Photo, 5 Website, 6 OralAccount, 7 Other |
| title | text | required |
| author | text NULL | author / issuing body |
| date_* | PartialDate | date of the source |
| repository | text NULL | archive, library, family holder |
| reference | text NULL | call number, URL |
| narrator_person_id | uuid NULL | OralAccount: narrator in the tree |
| narrator_name | text NULL | OralAccount: narrator not in the tree |
| told_on_* | PartialDate | OralAccount: when told |
| recorded_by | text NULL | OralAccount: who recorded it |
| notes | text NULL | |
| deleted_at | timestamptz NULL | |

CHECK: `type <> 6 OR (narrator_person_id IS NOT NULL OR narrator_name IS NOT NULL)`; domain also requires `told_on`.

### source_file
`source_id, file_id` (PK both) — attachments of a source, ordered by `position`.

### citation
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| source_id | uuid | FK source |
| marriage_id | uuid NULL | target |
| parentage_claim_id | uuid NULL | target |
| kinship_link_id | uuid NULL | target |
| person_id | uuid NULL | target (with `fact`) |
| fact | smallint NULL | person targets: 0 General, 1 Name, 2 Birth, 3 Death |
| detail | text NULL | page / folio / timestamp in recording |
| quotation | text NULL | |
| deleted_at | timestamptz NULL | |

CHECK `num_nonnulls(marriage_id, parentage_claim_id, kinship_link_id, person_id) = 1`; CHECK `fact IS NOT NULL` iff `person_id IS NOT NULL`.

### stored_file
`id, tree_id, kind (Attachment|Photo|ExportResult|ImportUpload), file_name, content_type, size_bytes, sha256,
storage_path, uploaded_by, uploaded_at, expires_at NULL, deleted_at`. Bytes live in `IFileStore` (local disk v1).
Max 25 MB; types image/*, application/pdf, audio/*, .xlsx, .csv, .ged, .zip (exports/imports).

### branch
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| name_ar, name_en | text | at least one |
| description | text NULL | |
| root_person_id | uuid NULL | descendants of this person (all marriages) |
| root_marriage_id | uuid NULL | descendants of this marriage only (e.g. "through Aminah") |
| include_spouses | bool | default true — spouses of descendants shown |
| color | text NULL | display accent |

CHECK `num_nonnulls(root_person_id, root_marriage_id) = 1`. Membership computed via recursive CTE (R21).

### export_job
`id, tree_id, requested_by, kind (Pdf|Excel|Csv|Gedcom), params jsonb (chart type, root, branch, language, paper,
include_sources), status (Queued|Running|Done|Failed), result_file_id, error, created_at, finished_at, expires_at`.
Anonymous requests on Public trees allowed for Pdf only; params record `redacted=true`.

### import_batch
`id, tree_id, uploaded_by, format (Xlsx|Csv|Gedcom), upload_file_id, status (Parsed|Committed|Discarded|Failed),
rows jsonb (sheet, row number, parsed values, outcome New|Update|Unchanged|Rejected, matched person id, rule results),
summary jsonb (counts), correlation_id, created_at, committed_at`.

### rule_acknowledgement
`id, tree_id, entity_type ('marriage'|'parentage_claim'|'person'|'kinship_link'|'source'), entity_id, code,
message_ar, message_en, acknowledged_by, acknowledged_at, source ('editor'|'import')`. Drives the warning flag.

### change_record (audit)
`id bigserial, tree_id, user_id, at timestamptz, entity_type, entity_id, action ('create'|'update'|'delete'|'restore'),
before jsonb, after jsonb, correlation_id uuid` (one id per user action or per committed import). Index `(tree_id, at desc)`.

## Relationships

```text
family_tree 1─* tree_membership *─1 app_user
family_tree 1─* person | marriage | parentage_claim | kinship_link | source | citation | branch | stored_file
person(M) 1─* marriage.husband_id          (≤4 overlapping, Disputed excluded)
person(F) 1─* marriage.wife_id             (0 overlapping, Disputed excluded)
marriage 1─* parentage_claim *─1 person    (child; exactly 1 preferred per child)
person 1─* kinship_link (both ends)
source 1─* citation ─1 (marriage | parentage_claim | kinship_link | person+fact)
source *─* stored_file (attachments); person ─1 stored_file (photo)
branch ─1 (person | marriage) root; members computed
```

## Validation rules (domain, code → class)

| Code | Class | Rule |
|---|---|---|
| SAME_GENDER_MARRIAGE | Violation | husband Male, wife Female |
| MAX_CONCURRENT_WIVES | Violation | ≤4 certain-overlapping non-Disputed marriages for a husband at any instant |
| WIFE_HAS_HUSBAND | Violation | no certain overlap of a woman's non-Disputed marriages |
| POSSIBLE_OVERLAP | Warning | overlap only possible due to vague dates (either rule above) |
| FIFTH_WIFE_DURING_IDDAH | Warning | 5th concurrency exists only when divorced wives' iddah is counted (D1, FR-044) |
| DISPUTED_EXCEEDS_LIMIT | Warning | a Disputed marriage would break the 4-wife or 1-husband limit |
| CHILD_HAS_PARENTS | Violation | setting a second *preferred* parentage (offer: add as alternative) |
| DUPLICATE_PARENTAGE_CLAIM | Violation | same child + same marriage claimed twice |
| ANCESTOR_CYCLE | Violation | any claim (preferred or alternative) makes a person their own ancestor |
| CHILD_BORN_BEFORE_PARENT | Violation | child's birth bounds entirely before a parent's birth bounds (I1, FR-045) |
| DEATH_BEFORE_BIRTH | Violation | death bounds entirely before birth bounds |
| VERIFIED_REQUIRES_SOURCE | Violation | status Verified with zero citations |
| PERSON_HAS_LINKS | Violation | delete person with marriages/claims unless `cascade=detach` |
| CROSS_TREE_LINK | Violation | DB composite FK |
| MAHRAM_BLOOD / MAHRAM_MARRIAGE / MAHRAM_MILK | Warning | see research R4 (preferred lineage) |
| FORBIDDEN_COMBINATION | Warning | sisters, or woman + her aunt, married to the same man at possibly overlapping times (incl. iddah) |
| IDDAH_OVERLAP | Warning | wife's new marriage starts before previous end + iddah |
| THIRD_DIVORCE | Warning | same couple remarries after cumulative divorce_count ≥3 without her intervening marriage |
| BIRTH_OUTSIDE_MARRIAGE_PERIOD | Warning | child birth < start or > end + max_pregnancy_days |
| PARENT_TOO_YOUNG | Warning | parent < 12 years old at child's birth (bounds-based, possible only) |
| SOURCE_IN_USE | Warning | deleting a source cited by Verified relationships (they drop to Unconfirmed if uncited) |

## State transitions

- Marriage: `Ongoing → Ended(reason)`; `Ended → Ongoing` only by editing (correction), audited.
- Verification: any status ↔ any status by admin; → Verified only with ≥1 citation; never changed automatically except
  the documented downgrade when the last citing source is deleted (SOURCE_IN_USE acknowledged).
- Parentage claims: `none → preferred`; adding a second claim → both Disputed (unless admin overrides);
  `alternative ↔ preferred` swap in one command; deleting the preferred claim promotes nothing automatically —
  the admin must choose (constitution VIII: no inference).
- Person: `Living → Deceased` (setting death date sets `is_living=false`); `Active → Deleted (soft) → Restored`.
  Delete is refused (422 `PERSON_HAS_LINKS`) while they are a spouse or have claims, unless `?cascade=detach`
  is passed after the editor's confirmation.
- Placeholder marriage: `placeholder → normal` when the unknown spouse is set (all marriage rules run).
- export_job: `Queued → Running → Done | Failed`; result expires after 24 h.
- import_batch: `Parsed → Committed | Discarded`; `Failed` on unreadable files.
