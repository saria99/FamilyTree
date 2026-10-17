# Research: Bayrab Genealogy — Core Platform

**Feature**: 001-family-tree-core | **Date**: 2026-10-06 | **Revised**: 2026-10-17 (Bayrab elaboration R17–R27,
analysis fixes C1, C2, D1, I1, U1, U2, G1–G5)

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
    `EXCLUDE USING gist (tree_id WITH =, wife_id WITH =, certain_period WITH &&) WHERE (certain_period IS NOT NULL AND deleted_at IS NULL AND verification_status <> 'Disputed')`
    (needs `btree_gist`). The domain checks the same thing first for a friendly error; the constraint is the backstop.
  - **Man, max four**: cannot be expressed as an exclusion constraint. Enforced in the domain service inside a
    transaction that first takes `SELECT ... FOR UPDATE` on the husband's `person` row, then counts marriages
    whose certain periods overlap the new one at any instant (sweep over start/end points, max concurrency ≤ 4).
  - If overlap is only *possible* (vague dates), the rule degrades to a warning (FR-009).
  - **Disputed marriages** are excluded from both hard limits (constitution v1.2.0, Principle I); a disputed
    marriage that would break a limit yields the warning `DISPUTED_EXCEEDS_LIMIT` instead.
  - **Fifth wife during iddah** (FR-044): when counting concurrency for a husband, each marriage that ended by his
    divorce is extended by the tree's divorce-iddah days. Overlap that exists only because of that extension yields
    the warning `FIFTH_WIFE_DURING_IDDAH`, not a violation.
- **Rationale**: Constitution Principle II (enforce in server and DB where expressible). Row lock serialises
  concurrent admin edits on the same man.
- **Alternatives**: Trigger counting wives → harder to test and to return structured errors; kept as an
  option if the row lock proves insufficient. Serializable isolation for everything → more retries, no benefit.

## R3. Hard rules vs. confirmable warnings

- **Decision**: Two classes of rule results:
  - **Violations** (always refused, HTTP 422): `MAX_CONCURRENT_WIVES`, `WIFE_HAS_HUSBAND`, `SAME_GENDER_MARRIAGE`,
    `ANCESTOR_CYCLE`, `CHILD_HAS_PARENTS` (already has a *preferred* parentage), `DUPLICATE_PARENTAGE_CLAIM`,
    `CHILD_BORN_BEFORE_PARENT`, `DEATH_BEFORE_BIRTH`, `VERIFIED_REQUIRES_SOURCE`, `PERSON_HAS_LINKS`, `CROSS_TREE_LINK`.
  - **Warnings** (HTTP 409 with list; client re-submits with `acknowledgedWarnings: [code,...]`): `MAHRAM_BLOOD`,
    `MAHRAM_MARRIAGE`, `MAHRAM_MILK`, `FORBIDDEN_COMBINATION` (sisters / woman + aunt), `IDDAH_OVERLAP`,
    `FIFTH_WIFE_DURING_IDDAH`, `DISPUTED_EXCEEDS_LIMIT`, `THIRD_DIVORCE`, `POSSIBLE_OVERLAP`,
    `BIRTH_OUTSIDE_MARRIAGE_PERIOD`, `PARENT_TOO_YOUNG`, `SOURCE_IN_USE`.
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
  Public tree, a person is treated as living when `is_living = true`, or when there is no death date and the birth is
  unknown or less than 100 years ago. Such a person is returned as `{ id, displayName: "Living person", redacted: true }`
  with structural links kept so the tree shape stays intact. The same `Redactor` runs on PDFs, exports, search,
  citations and attachment downloads.
- **Ordering (analysis fix C1)**: the `Redactor` and its tests are part of the foundation. Until it exists, the
  authorization policy refuses all anonymous access, so no build can ever expose living people.
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
  `_ACK` (acknowledged warning), `_VSTAT`/`_CONF` (status, confidence), `_PREF` (preferred parentage), `_BYRID`
  (person identifier). Sources map to `SOUR` records and citations to `SOUR` sub-structures with `PAGE`/`TEXT`.
  Alternative parentage claims are written as additional `FAMC` links carrying `_PREF N`.
- **Import (analysis fix U2)**: same pipeline as spreadsheets (R25): parse → staged preview → commit. Records that
  break a structural rule are rejected and listed; the people they mention are still imported; warnings are
  acknowledged with source `import`.
- **Rationale**: FR-019, SC-006 round-trip.

## R16. Large-tree performance

- **Decision**: `GET /trees/{id}/graph` returns a compact payload (ids, names, gender, years, living flag,
  union links) — ~150 bytes/person, ~0.75 MB for 5k people before gzip/Brotli. Person-centred endpoints
  (`/ancestors`, `/descendants?depth=`) for mobile. Web collapses branches beyond 4 generations from the focus person.
- **Rationale**: SC-004 (5k people usable in <3 s on mid-range phone).

## R17. Parentage claims (competing claims, one preferred)

- **Decision**: Replace `person.parent_marriage_id` with a `parentage_claim` table
  (`child_id`, `marriage_id`, `is_preferred`, verification status, confidence). A partial unique index
  `(tree_id, child_id) WHERE is_preferred AND deleted_at IS NULL` guarantees at most one preferred parentage
  (FR-010), and a unique index on `(child_id, marriage_id)` blocks duplicate claims. All lineage queries (nasab,
  ancestors, descendants, branches, cycle checks) follow preferred claims; the cycle check also walks alternative
  claims, since a cycle is impossible either way. Adding an alternative claim sets every claim of that child to
  Disputed unless the admin chooses otherwise (FR-031).
- **Rationale**: Clarification 2026-10-17. Keeps lineage queries a single indexed join while storing every account.
- **Alternatives**: Keep `parent_marriage_id` plus a side table of alternatives → two sources of truth; rejected.
  A generic assertion/evidence model (GEDCOM-X style) → far more complex than needed; rejected (Principle VII).

## R18. Verification status, confidence and "Verified needs a source"

- **Decision**: `verification_status` (Verified, OralAccount, Disputed, Unconfirmed) and `confidence` (High, Medium,
  Low) columns on `marriage`, `parentage_claim` and `kinship_link`; default Unconfirmed / Low. The domain refuses
  `VERIFIED_REQUIRES_SOURCE`. A `DEFERRABLE INITIALLY DEFERRED` constraint trigger is the database backstop: at
  commit, every Verified row must have at least one citation. Deleting a source cited by Verified relationships
  returns `SOURCE_IN_USE`; on acknowledgement, relationships left without a citation drop to Unconfirmed in the same
  transaction, and each change is audited.
- **Rationale**: Constitution VIII (non-negotiable) plus Principle II (DB backstop where expressible).
- **Alternatives**: Domain-only check → bulk imports or future code paths could bypass it; rejected.

## R19. Sources, citations, attachments and photos

- **Decision**:
  - `source`: type (Document, Book, OfficialRecord, Gravestone, Photo, Website, OralAccount, Other), title,
    author, date (PartialDate), repository, reference/URL, notes. For oral accounts: `narrator_person_id` or
    `narrator_name`, `told_on`, `recorded_by`.
  - `citation`: source plus **exactly one** target via nullable FKs `marriage_id | parentage_claim_id |
    kinship_link_id | person_id` (with `fact` = Name/Birth/Death/General for person targets), CHECK that exactly one
    is set; `detail` (page/folio) and `quotation`.
  - `stored_file`: attachments **and person photos** (fixes G1) behind an `IFileStore` interface. v1 implementation
    stores files on a local disk volume (`/data/files/{treeId}/{fileId}`). Downloads go through an authorized API
    endpoint that applies the `Redactor`, never a public URL. Limit: 25 MB per file (configurable); allowed types:
    image/*, application/pdf, audio/*.
- **Rationale**: Real FKs keep integrity (no polymorphic string ids); disk is the simplest store (Principle VII).
- **Alternatives**: S3/MinIO now → extra service to run; the interface makes it a later drop-in. Storing files
  in PostgreSQL `bytea` → bloats backups; rejected.

## R20. Permanent person identifiers

- **Decision**: `family_tree.id_prefix` (e.g. `BYR`, set at tree creation, immutable) and
  `family_tree.next_person_number`. On person creation the tree row is locked (`SELECT … FOR UPDATE`) and the counter
  incremented in the same transaction; `person.public_id = prefix + '-' + lpad(n, 6, '0')`, unique per tree, never
  reused (soft delete keeps the row). Search matches the identifier exactly; imports match on it first.
- **Rationale**: FR-035 and Principle IX. Gap-free, readable, stable.
- **Alternatives**: A PostgreSQL sequence per tree → sequences don't scale to many trees; UUID only → not human-friendly.

## R21. Maternal line and branches

- **Decision**:
  - **Maternal line**: recursive CTE following the preferred claim → `marriage.wife_id`, returned as a list in which
    each mother carries her own nasab.
  - **Branch**: `branch(name_ar, name_en, root_person_id | root_marriage_id, include_spouses)`; CHECK exactly one
    root. Membership is **computed** (recursive CTE over preferred claims), not stored, so it can never go stale. A
    person can belong to several branches (through the father and the mother). For filter-heavy views the API
    returns membership as a bitmask per person in the graph payload.
- **Rationale**: FR-036/FR-037. At 50k people, a descendant CTE over indexed claims runs in milliseconds.
- **Alternatives**: Stored membership table → must be rebuilt on every lineage edit; rejected.

## R22. Status visual language (shared)

- **Decision**: One style table in `packages/shared/src/status/styles.ts`, mirrored in C# for PDFs: Verified = solid,
  Oral account = long dash, Disputed = red dotted, Unconfirmed = grey thin dashed. The confidence level sets the line
  weight (High 2.5, Medium 1.75, Low 1). Each status also has a badge icon, so meaning never depends on colour
  alone. Alternative parentage claims are drawn as an extra edge from the alternative union, always Disputed-styled
  (fixes G3: the canvas, mobile tree and PDFs all render kinship links and alternative claims). A legend component
  is shown in every view.
- **Rationale**: FR-033, SC-008, and accessibility (colour plus pattern plus icon).

## R23. PDF generation

- **Decision**: **QuestPDF** (C#, Community licence, which is free under USD 1M annual revenue; fits a family
  project) on the server. Charts are laid out by a C# `ChartLayout` (Reingold–Tilford tidy tree extended with union
  nodes: a husband, his unions ordered by sequence, and children under each union) and drawn on QuestPDF's canvas.
  Arabic is shaped by QuestPDF's HarfBuzz text engine with an embedded Arabic font (Noto Naskh Arabic) and
  `ContentFromRightToLeft()`. Chart types: ancestor (pedigree), descendant, branch wall chart (custom page size up to
  A0, or tiled A3), and person report (family group sheet with citations).
- **Jobs**: generation runs as an `export_job` (R24) and the client polls; a 500-person branch is expected to take
  well under 30 s (SC-009, with a performance test).
- **Rationale**: Principle V (outputs generated by the API with the same rules and redaction); no headless browser.
- **Alternatives**: Puppeteer/Playwright HTML→PDF → heavy runtime and a second layout engine; client-side PDF → would
  bypass server redaction; rejected.

## R24. Background jobs

- **Decision**: An `export_job` table (kind: Pdf/Excel/Csv/Gedcom, params jsonb, status, file id, error, expires_at)
  processed by a hosted `BackgroundService` that reads a `Channel<Guid>`. On startup, jobs still pending are
  re-queued. Result files are kept in `IFileStore` for 24 h.
- **Rationale**: The simplest durable queue with no extra infrastructure (Principle VII).
- **Alternatives**: Hangfire or Quartz → extra dependency, not needed at this scale.

## R25. Excel/CSV import and export

- **Decision**: **ClosedXML** (MIT) for .xlsx; **CsvHelper** for CSV (zip of one CSV per sheet). The template has the
  sheets `People`, `Marriages`, `Parentage`, `Kinship`, `Sources`, `Citations`, with a `ref` column used for
  cross-references inside the file and a `person_id` (`BYR-…`) column for existing records.
  - **Import**: upload → parse into `import_batch` (rows staged as jsonb with a per-row outcome:
    New/Update/Unchanged/Rejected, plus rule results) → preview UI → commit. The commit replays the rows through the
    same Application commands as manual edits inside **one transaction** with **one correlation id** (one history
    operation, FR-042). Rejected rows are skipped; warnings are acknowledged with source `import`.
  - Rows without an id are matched by normalised name + father's id when that is unique; otherwise the preview
    offers "new or merge".
  - **Export**: same sheets, filtered by branch when one is given; the export → import round trip is tested (SC-010).
- **Rationale**: FR-041–FR-043 and Principle IX (preview first, same rules).
- **Alternatives**: EPPlus → commercial licence; NPOI → heavier API.

## R26. Password reset (analysis fix G2)

- **Decision**: ASP.NET Core Identity `GeneratePasswordResetTokenAsync`; endpoints `/auth/forgot-password` (always
  returns 202, to prevent account enumeration) and `/auth/reset-password`; the link opens the web app; tokens are
  single-use and expire in 1 hour; rate-limited.

## R27. Unknown-parent placeholder reuse (analysis fix U1)

- **Decision**: When a child's mother (or father) is unknown, the system reuses the known parent's existing
  placeholder marriage (spouse NULL), creating one only if none exists. The admin can split a placeholder group
  (move children to a new placeholder) or replace the placeholder spouse with a real person, which converts the
  placeholder into a normal marriage subject to all rules.
