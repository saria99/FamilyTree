# Data Model: Islamic Family Tree — Core

**Feature**: 001-family-tree-core | **Database**: PostgreSQL 17 | **Extensions**: `btree_gist`, `pg_trgm`, `citext`

All ids are `uuid` (v7, generated in .NET). All tree-owned tables carry `tree_id` and use composite
foreign keys `(tree_id, id)` so no link can cross trees. Soft delete via `deleted_at`. Optimistic
concurrency via PostgreSQL `xmin` mapped as EF row version.

## Value object: PartialDate

Stored as a set of columns with a prefix (e.g. `birth_`):

| Column | Type | Notes |
|---|---|---|
| `{p}_earliest` | date NULL | Earliest Gregorian day the fact could be |
| `{p}_latest` | date NULL | Latest Gregorian day |
| `{p}_precision` | smallint | 0 Unknown, 1 Year, 2 Month, 3 Day |
| `{p}_calendar` | smallint | 0 Gregorian, 1 Hijri (as entered) |
| `{p}_y`, `{p}_m`, `{p}_d` | int NULL | Components as entered (in the entered calendar) |
| `{p}_approx` | bool | "circa" flag, widens bounds by ±5 years when precision is Year |

## Entities

### family_tree
| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| name_ar, name_en | text | at least one required |
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

### person
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | UNIQUE (tree_id, id) |
| gender | smallint | 1 Male, 2 Female — required, immutable once in a marriage |
| ism_ar, ism_en | text | at least one required |
| laqab_ar/en, kunya_ar/en, nisba_ar/en | text NULL | |
| family_name_ar/en | text NULL | tribe / family (e.g. "Al-Hashimi") |
| birth_* | PartialDate | |
| birth_place, death_place | text NULL | |
| death_* | PartialDate | |
| is_living | bool | default true; set false when a death date is recorded |
| parent_marriage_id | uuid NULL | FK (tree_id, parent_marriage_id) → marriage. **At most one** biological parent marriage (FR-010) |
| photo_url | text NULL | |
| notes | text NULL | |
| search_text | text | normalised; GIN `gin_trgm_ops` index |
| deleted_at | timestamptz NULL | |

### marriage (union)
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | UNIQUE (tree_id, id) |
| husband_id | uuid NULL | FK person, must be Male. NULL = unknown husband placeholder |
| wife_id | uuid NULL | FK person, must be Female. NULL = unknown wife placeholder |
| start_* | PartialDate | nikah date |
| end_* | PartialDate | |
| end_reason | smallint | 0 Ongoing, 1 Divorce (talaq), 2 Khul', 3 Annulment (faskh), 4 Death of husband, 5 Death of wife, 6 Unknown |
| divorce_kind | smallint NULL | 1 Revocable (raj'i), 2 Irrevocable minor (ba'in sughra), 3 Irrevocable major (ba'in kubra) |
| divorce_count | smallint NULL | 1–3, number of talaq pronounced in this marriage record |
| sequence_for_husband | int | display order (by start date, editable) |
| certain_period | daterange GENERATED | `daterange(start_latest, COALESCE(end_earliest, 'infinity'))` when start known, else NULL; NULL if empty |
| notes | text NULL | |
| deleted_at | timestamptz NULL | |

Constraints:
- `CHECK (husband_id IS DISTINCT FROM wife_id)`; at least one spouse not NULL.
- `EXCLUDE USING gist (tree_id WITH =, wife_id WITH =, certain_period WITH &&) WHERE (wife_id IS NOT NULL AND certain_period IS NOT NULL AND deleted_at IS NULL)` — one husband at a time.
- Max-four-wives enforced in domain under `SELECT ... FOR UPDATE` on the husband row (see research R2).
- Gender correctness checked in domain (cross-table, not a CHECK).

Children of a marriage = `person WHERE parent_marriage_id = marriage.id`, ordered by birth date then `birth_order`.

### kinship_link (non-lineage)
| Field | Type | Rules |
|---|---|---|
| id, tree_id | uuid | |
| kind | smallint | 1 Guardianship (kafala), 2 Milk mother (rada'a), 3 Milk father (husband of milk mother, "laban al-fahl") |
| person_id | uuid | the child / nursling |
| related_person_id | uuid | guardian / milk mother / milk father |
| start_*, end_* | PartialDate | optional |
| notes | text NULL | |

Milk links feed `MAHRAM_MILK` checks; guardianship never does and never changes lineage.

### rule_acknowledgement
`id, tree_id, entity_type ('marriage'|'person'|'kinship_link'), entity_id, code, message_ar, message_en,
acknowledged_by, acknowledged_at, source ('editor'|'import')`. Drives the warning flag in the editor.

### change_record (audit)
`id bigserial, tree_id, user_id, at timestamptz, entity_type, entity_id, action ('create'|'update'|'delete'|'restore'),
before jsonb, after jsonb, correlation_id uuid` (one id per user action, used by undo grouping). Index `(tree_id, at desc)`.

## Relationships

```text
family_tree 1─* tree_membership *─1 app_user
family_tree 1─* person
family_tree 1─* marriage
person(M) 1─* marriage.husband_id     (≤4 overlapping)
person(F) 1─* marriage.wife_id        (0 overlapping)
marriage 1─* person.parent_marriage_id (children)
person 1─* kinship_link (both ends)
```

## Validation rules (domain, code → class)

| Code | Class | Rule |
|---|---|---|
| SAME_GENDER_MARRIAGE | Violation | husband Male, wife Female |
| MAX_CONCURRENT_WIVES | Violation | ≤4 certain-overlapping marriages for a husband at any instant |
| WIFE_HAS_HUSBAND | Violation | no certain overlap of a woman's marriages |
| POSSIBLE_OVERLAP | Warning | overlap only possible due to vague dates (either rule above) |
| CHILD_HAS_PARENTS | Violation | person already has a different parent_marriage_id |
| ANCESTOR_CYCLE | Violation | new link makes a person their own ancestor (recursive CTE check) |
| CROSS_TREE_LINK | Violation | DB composite FK |
| MAHRAM_BLOOD / MAHRAM_MARRIAGE / MAHRAM_MILK | Warning | see research R4 |
| FORBIDDEN_COMBINATION | Warning | sisters, or woman + her aunt, married to the same man at possibly overlapping times (incl. iddah) |
| IDDAH_OVERLAP | Warning | wife's new marriage starts before previous end + iddah |
| THIRD_DIVORCE | Warning | same couple remarries after cumulative divorce_count ≥3 without her intervening marriage |
| BIRTH_OUTSIDE_MARRIAGE_PERIOD | Warning | child birth < start or > end + max_pregnancy_days |
| PARENT_TOO_YOUNG | Warning | parent < 12 years old at child's birth (bounds-based) |
| DEATH_BEFORE_BIRTH | Violation | death bounds entirely before birth bounds |

## State transitions

Marriage: `Ongoing → Ended(reason)`; `Ended → Ongoing` only by editing (correction), audited.
Person: `Living → Deceased` (setting death date sets `is_living=false`); `Active → Deleted (soft) → Restored`.
Delete person is refused (422 `PERSON_HAS_LINKS`) while they are a spouse in a marriage or have children,
unless `?cascade=detach` is passed after the editor's confirmation (links set to placeholder/NULL).
