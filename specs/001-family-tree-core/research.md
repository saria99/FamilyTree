# Research: Islamic Family Tree — Core

**Feature**: 001-family-tree-core | **Date**: 2026-10-06

Each item: Decision / Rationale / Alternatives considered.

## R1. Representing polygamous and sequential marriages in a graph

- **Decision**: Model a **Marriage (union) as its own node** between husband and wife. Children hang off the
  union node, not off either parent. In the visual tree, the union is a small connector node; a man with three
  wives has three union nodes beside him, each with its own children below it.
- **Rationale**: Directly encodes "each child belongs to one father + one mother" (FR-010), keeps half-siblings
  visually separated (FR-015, SC-003), and works the same for a woman with sequential husbands. It is also how
  GEDCOM (`FAM` records) models families, so import/export maps 1:1 (FR-019).
- **Alternatives**: `Person.FatherId` + `Person.MotherId` only, marriages inferred → cannot represent childless
  marriages, marriage dates, or ordering of wives; rejected. Generic edge table (`from, to, type`) → loses
  structure, pushes all rules into code, hard to constrain in SQL; rejected.

## R2. Enforcing "one husband at a time" and "max four concurrent wives"

- **Decision**:
  - Store marriage dates as partial dates (value + precision: Day/Month/Year/Unknown). Derive a
    **certain period** = `daterange(start_latest, end_earliest)` (the interval during which the marriage was
    *definitely* in force). It is NULL when dates are too vague to prove anything.
  - **Woman, one husband at a time**: PostgreSQL **exclusion constraint**
    `EXCLUDE USING gist (wife_id WITH =, certain_period WITH &&) WHERE (certain_period IS NOT NULL AND deleted_at IS NULL)`
    (needs `btree_gist`). The domain checks the same thing first for a friendly error; the constraint is the backstop.
  - **Man, max four**: cannot be expressed as an exclusion constraint. Enforced in the domain service inside a
    transaction that first takes `SELECT ... FOR UPDATE` on the husband's `person` row, then counts marriages
    whose certain periods overlap the new one at any instant (sweep over start/end points, max concurrency ≤ 4).
  - If overlap is only *possible* (vague dates), the rule degrades to a warning (FR-009).
- **Rationale**: Constitution Principle II (enforce in server and DB where expressible). Row lock serialises
  concurrent admin edits on the same man.
- **Alternatives**: Trigger counting wives → harder to test and to return structured errors; kept as an
  option if the row lock proves insufficient. Serializable isolation for everything → more retries, no benefit.

## R3. Hard rules vs. confirmable warnings

- **Decision**: Two classes of rule results:
  - **Violations** (always refused, HTTP 422): `MAX_CONCURRENT_WIVES`, `WIFE_HAS_HUSBAND`, `SAME_GENDER_MARRIAGE`,
    `ANCESTOR_CYCLE`, `CHILD_HAS_PARENTS`, `CROSS_TREE_LINK`.
  - **Warnings** (HTTP 409 with list; client re-submits with `acknowledgedWarnings: [code,...]`): `MAHRAM_BLOOD`,
    `MAHRAM_MARRIAGE`, `MAHRAM_MILK`, `FORBIDDEN_COMBINATION` (sisters / woman + aunt), `IDDAH_OVERLAP`,
    `THIRD_DIVORCE`, `POSSIBLE_OVERLAP`, `BIRTH_OUTSIDE_MARRIAGE_PERIOD`, `PARENT_TOO_YOUNG`.
  - Acknowledged warnings are stored in `rule_acknowledgement` (who, when, code, message) and shown as a flag.
- **Rationale**: Clarification session 2026-10-06 and constitution v1.1.0 — historical record, flexible.
- **Alternatives**: Everything as warnings → loses the structural guarantees the user asked for; rejected.

## R4. Mahram detection

- **Decision**: A pure C# `KinshipService` in the Domain layer. For a proposed couple (H, W), the Application
  layer loads the **relevant subgraph** with a recursive CTE: ancestors of H and W (up to 6 generations) plus their
  descendants down to the generation needed (siblings, nieces/nephews), plus current/former spouses and milk-kinship
  links. The service then checks the classical categories (Qur'an 4:22–23):
  ancestors, descendants, siblings (full/half), siblings' descendants, parents' siblings (aunts/uncles at any
  ascending level), spouse's ancestors (mother-in-law, permanent), spouse's descendants (stepdaughter — permanent
  once the marriage with her mother existed; data cannot show consummation, so warn), father's/son's wives,
  and the same categories through milk kinship. Combination rule: two sisters, or a woman and her paternal/maternal
  aunt, in marriages with overlapping (possible) periods, including the ex-wife's iddah.
- **Rationale**: Pure function over an in-memory graph is easy to unit-test exhaustively (Principle III).
  Bounded depth keeps the query small even in a 50k-person tree.
- **Alternatives**: SQL-only recursive checks → hard to read and test; graph database → violates Principle VII.

## R5. Partial and Hijri dates

- **Decision**: `PartialDate { Year?, Month?, Day?, Calendar (Gregorian|Hijri) }` stored as: canonical Gregorian
  `earliest`/`latest` `date` columns + `precision` + `original_calendar` + original text components. Conversion uses
  .NET `UmAlQuraCalendar` (range 1318–1500 AH); outside that range fall back to `HijriCalendar` (tabular).
- **Rationale**: Bounds make every rule computable with ranges; original form is preserved for display (FR-001).
- **Alternatives**: Store strings → no range logic; store only Gregorian → loses what the admin typed.

## R6. Iddah calculation (warning only)

- **Decision**: Divorce: 3 months (approximation of 3 menstrual cycles) — configurable per tree. Death of husband:
  4 months 10 days. Pregnancy at time of ending is not tracked; a child born to that marriage after the end date
  extends iddah to the birth date. Warning only (`IDDAH_OVERLAP`).
- **Rationale**: Clarification Q1. Approximations are acceptable because it never blocks.

## R7. Multi-tree tenancy

- **Decision**: Single database, every domain table has `tree_id`. EF Core global query filter on the current
  tree from the route (`/api/v1/trees/{treeId}/...`), plus an authorization handler checking `tree_membership`
  role (Owner/Admin/Member). Composite FKs `(tree_id, id)` so a marriage/child link cannot cross trees (DB-enforced).
- **Rationale**: FR-025 isolation with minimal complexity (Principle VII).
- **Alternatives**: Schema-per-tree or DB-per-tree → heavy ops overhead; PostgreSQL RLS → adds a second
  policy system; possible later hardening.

## R8. Auth

- **Decision**: ASP.NET Core Identity (users in PostgreSQL) + JWT access tokens (15 min) and rotating refresh
  tokens (30 days, hashed in DB). Web stores the access token in memory and the refresh token in an HttpOnly
  cookie; mobile stores the refresh token in `expo-secure-store`. Invitations: signed single-use token by email.
- **Rationale**: Constitution tech constraints; one mechanism for web and mobile.
- **Alternatives**: Cookie-only auth → awkward for React Native; external IdP → extra dependency for v1.

## R9. Living-person redaction and public trees

- **Decision**: Redaction happens **in the API projection layer**, never in clients. For anonymous viewers of a
  Public tree, a person with `is_living = true` (or no death date and birth within 100 years / unknown birth with
  living descendants unknown → treated as living) is returned as `{ id, displayName: "Living person", redacted: true }`
  with structural links kept so the tree shape stays intact.
- **Rationale**: Principle VI; clients cannot leak what they never receive.

## R10. Visual editor (web)

- **Decision**: React 19 + Vite + TypeScript, `@xyflow/react` (React Flow 12) with custom nodes:
  `PersonNode` (card), `UnionNode` (marriage connector). Layout with **elkjs** (layered algorithm, direction DOWN)
  run in a Web Worker; wives are ordered by marriage start date beside the husband. Interactions:
  type-to-add (command bar, Enter creates), drag person onto person → marriage dialog, drag person onto union node
  → add child, side panel for details. Drop validation calls `POST .../validate/*` dry-run endpoints so the reason
  appears at the drop point before anything is saved (FR-016).
  Undo/redo: client-side command stack; every command has an inverse API call (delete is soft, so restore is possible).
  Server state via TanStack Query; i18n via i18next with `dir` switched on `<html>`; CSS logical properties for RTL.
- **Rationale**: User input; React Flow supports custom nodes, drag-and-drop, and large graphs with viewport culling.
- **Alternatives**: D3 custom → more code; GoJS/yFiles → commercial licence; family-chart libs → cannot model
  multiple concurrent unions cleanly.

## R11. Mobile viewer

- **Decision**: Expo (latest stable SDK at scaffold time) + TypeScript, read-only. Default landing: **ancestor view**
  of the signed-in user's linked person (or a chosen person): vertical list/ladder of the nasab chain with each
  ancestor's wives, expandable into descendants. Tree canvas uses `react-native-svg` + `react-native-gesture-handler`
  / `reanimated` for pan/zoom, consuming the **same layout function** from `packages/shared` (elkjs is pure JS).
  Data via TanStack Query with persisted cache for offline re-open.
- **Rationale**: Clarification "editing on web by admin, viewing on mobile by user"; ancestor view is the purpose.

## R12. Shared contracts between clients

- **Decision**: Backend publishes OpenAPI via `Microsoft.AspNetCore.OpenApi` (.NET 10). `packages/shared` generates
  TS types with `openapi-typescript` and exports a typed `openapi-fetch` client, rule-code → message maps
  (ar/en), Arabic name normalisation, nasab formatting, and the layout function. npm workspaces at the repo root.
- **Rationale**: Principle V (no hand-copied types).

## R13. Arabic/English search

- **Decision**: Store `search_text` per person = normalised concatenation of all name fields
  (remove tashkeel and tatweel; أ/إ/آ/ٱ → ا; ة → ه; ى → ي; ؤ → و; ئ → ي; lowercase Latin; strip "al-"/"ال" variant
  separators). Same normaliser in C# and TS (shared test vectors). Index with `pg_trgm` GIN; query with `%` similarity
  + `ILIKE` prefix. Transliteration between scripts is not automatic: both names are entered by the admin.
- **Rationale**: FR-021 and SC-004 (<1 s) on 5k–50k rows is trivial for trigram indexes.

## R14. Audit history

- **Decision**: EF Core `SaveChangesInterceptor` writes `change_record(tree_id, user_id, at, entity, entity_id,
  action, before jsonb, after jsonb)` in the same transaction.
- **Rationale**: FR-027, single source of truth for "who changed what".

## R15. GEDCOM

- **Decision**: GEDCOM 5.5.1 import/export implemented in Infrastructure (small line-based parser/writer, no
  dependency). `INDI` ↔ Person, `FAM` ↔ Marriage (`HUSB`, `WIFE`, `MARR`, `DIV`, `CHIL`). Islamic extras via
  underscore tags: `_ENDR` (end reason), `_DIVT` (divorce type), `_KAFA` (guardianship), `_MILK` (milk kinship),
  `_ACK` (acknowledged warning). Import runs all rules; violations are reported, warnings auto-acknowledged as
  "imported" so legacy data loads.
- **Rationale**: FR-019, SC-006 round-trip.

## R16. Large-tree performance

- **Decision**: `GET /trees/{id}/graph` returns a compact payload (ids, names, gender, years, living flag,
  union links) — ~150 bytes/person, ~0.75 MB for 5k people before gzip/Brotli. Person-centred endpoints
  (`/ancestors`, `/descendants?depth=`) for mobile. Web collapses branches beyond 4 generations from the focus person.
- **Rationale**: SC-004 (5k people usable in <3 s on mid-range phone).
