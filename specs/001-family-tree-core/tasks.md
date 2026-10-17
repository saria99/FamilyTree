---
description: "Task list for 001-family-tree-core"
---

# Tasks: Islamic Family Tree — Core

> ⚠ **Outdated (2026-10-17)**: the spec was elaborated with the Bayrab Genealogy scope (sources & verification status, competing claims, branches, person IDs, PDF, Excel/CSV) and the constitution moved to v1.2.0. Regenerate with `/speckit-plan` then `/speckit-tasks` before implementing.

**Input**: Design documents from `specs/001-family-tree-core/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Included. Constitution Principle III requires test-first for every domain rule (allowed case + rejected case)
and API integration tests against real PostgreSQL (Testcontainers). Write each test task before its implementation and
confirm it fails first.

**Organization**: Grouped by user story (spec.md). US1–US3 are P1, US4 is P2, US5 is P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 … US5 from spec.md
- Paths are relative to the repo root `C:\Madinah\FamilyTree`

## Path Conventions

- Backend: `backend/src/FamilyTree.{Domain,Application,Infrastructure,Api}/`, tests in `backend/tests/`
- Shared TS: `packages/shared/src/`
- Web admin editor: `web/src/`
- Mobile viewer: `mobile/` (expo-router `app/`, components in `mobile/src/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, toolchains, database container

- [ ] T001 Create root files: `.gitignore` (dotnet, node, expo, .env), `.editorconfig` (C# + TS, LF), `README.md` linking to specs/001-family-tree-core/quickstart.md
- [ ] T002 Create `docker-compose.yml` with service `db` (postgres:17, db/user/password `familytree`, port 5432, named volume, healthcheck `pg_isready`)
- [ ] T003 Create .NET solution `backend/FamilyTree.sln` with projects `backend/src/FamilyTree.Domain` (classlib), `backend/src/FamilyTree.Application` (classlib), `backend/src/FamilyTree.Infrastructure` (classlib), `backend/src/FamilyTree.Api` (webapi, minimal APIs), `backend/tests/FamilyTree.Domain.Tests` (xunit), `backend/tests/FamilyTree.Api.IntegrationTests` (xunit); project references Domain ← Application ← Infrastructure ← Api, tests reference their targets
- [ ] T004 Add `backend/Directory.Build.props` (net10.0, nullable enable, implicit usings, TreatWarningsAsErrors, LangVersion latest) and `backend/Directory.Packages.props` (central package versions: Npgsql.EntityFrameworkCore.PostgreSQL 10.x, Microsoft.EntityFrameworkCore.Design 10.x, Microsoft.AspNetCore.Identity.EntityFrameworkCore 10.x, Microsoft.AspNetCore.Authentication.JwtBearer 10.x, Microsoft.AspNetCore.OpenApi 10.x, xunit, Shouldly, Testcontainers.PostgreSql, Microsoft.AspNetCore.Mvc.Testing)
- [ ] T005 Add `backend/.config/dotnet-tools.json` with `dotnet-ef` local tool
- [ ] T006 Create root `package.json` with npm workspaces `["packages/*", "web", "mobile"]` and scripts `dev:web`, `dev:mobile`, `test`, `lint`, `gen:api`
- [ ] T007 [P] Scaffold `packages/shared` (TypeScript library: `package.json` name `@familytree/shared`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`)
- [ ] T008 [P] Scaffold `web` with Vite React TS template; add deps `@xyflow/react elkjs @tanstack/react-query react-router-dom i18next react-i18next react-hook-form zod @hookform/resolvers openapi-fetch` and dev deps `vitest @testing-library/react @testing-library/user-event jsdom`; depend on `@familytree/shared`
- [ ] T009 [P] Scaffold `mobile` with `npx create-expo-app` (TypeScript, expo-router); add `react-native-svg react-native-gesture-handler react-native-reanimated expo-secure-store @tanstack/react-query @tanstack/query-async-storage-persister @react-native-async-storage/async-storage i18next react-i18next expo-localization`; configure `metro.config.js` for the npm workspace (watchFolders = repo root)
- [ ] T010 [P] Configure ESLint + Prettier shared config at root (`eslint.config.js`, `.prettierrc`) applied to web, mobile, packages/shared
- [ ] T011 [P] Add GitHub Actions workflow `.github/workflows/ci.yml`: job `backend` (setup-dotnet 10, `dotnet test backend`), job `js` (setup-node 24, `npm ci`, `npm run lint`, `npm test`)

**Checkpoint**: `docker compose up -d db`, `dotnet build backend`, `npm install`, `npm run dev -w web` all succeed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain primitives, database, auth, trees + roles, audit, shared API client. Blocks all stories.

### Domain primitives (tests first)

- [ ] T012 [P] Write tests for `PartialDate` bounds (Day/Month/Year/Unknown precision, approximate ±5y, Hijri input converted with UmAlQura and tabular fallback outside 1318–1500 AH, invalid month/day rejected) in `backend/tests/FamilyTree.Domain.Tests/Dates/PartialDateTests.cs`
- [ ] T013 [P] Write tests for `ArabicNormalizer` (strip tashkeel/tatweel, أإآٱ→ا, ة→ه, ى→ي, ؤ→و, ئ→ي, Latin lowercase, collapse spaces) using vectors from `packages/shared/test-vectors/normalize.json` (create file) in `backend/tests/FamilyTree.Domain.Tests/Text/ArabicNormalizerTests.cs`
- [ ] T014 [P] Implement `PartialDate` record (Year/Month/Day/Calendar/Approximate, computed Earliest/Latest/Precision, `Certainly Before/After`, `PossiblyOverlaps`) and `HijriConverter` in `backend/src/FamilyTree.Domain/Dates/PartialDate.cs` and `backend/src/FamilyTree.Domain/Dates/HijriConverter.cs`
- [ ] T015 [P] Implement `ArabicNormalizer.Normalize(string)` in `backend/src/FamilyTree.Domain/Text/ArabicNormalizer.cs`
- [ ] T016 [P] Implement rule primitives `RuleCode` (all codes in contracts/rule-codes.md), `RuleSeverity`, `RuleResult(code, severity, personIds, relation, args)`, `RuleOutcome` (violations + warnings, `ThrowIfBlocked(acknowledged)`), `RuleException` in `backend/src/FamilyTree.Domain/Rules/`
- [ ] T017 [P] Implement `RuleMessages` (ar/en templates from contracts/rule-codes.md with `{a}`,`{b}`,`{relation}` placeholders) in `backend/src/FamilyTree.Domain/Rules/RuleMessages.cs`

### Entities & persistence

- [ ] T018 Implement entities `FamilyTree` (visibility, iddah settings, max pregnancy days, root person), `TreeMembership` (role, linked person), `Person` (names ar/en, laqab, kunya, nisba, family name, gender, birth/death PartialDate + places, IsLiving, ParentMarriageId, notes, SearchText, DeletedAt), `Marriage` (husband/wife, start/end PartialDate, EndReason, DivorceKind, DivorceCount, SequenceForHusband, DeletedAt), `KinshipLink`, `RuleAcknowledgement`, `ChangeRecord` in `backend/src/FamilyTree.Domain/{Trees,People,Marriages,Kinship,Rules,Audit}/`
- [ ] T019 Implement `AppDbContext` (Identity user `AppUser` with DisplayName, all entity sets, global query filters for `DeletedAt == null`) in `backend/src/FamilyTree.Infrastructure/Persistence/AppDbContext.cs`
- [ ] T020 Implement EF configurations: snake_case naming, PartialDate as owned/complex type columns `{p}_earliest/{p}_latest/{p}_precision/{p}_calendar/{p}_y/{p}_m/{p}_d/{p}_approx`, composite alternate key `(tree_id, id)` on person/marriage, composite FKs `(tree_id, parent_marriage_id)`, `(tree_id, husband_id)`, `(tree_id, wife_id)`, xmin row version, enum → smallint in `backend/src/FamilyTree.Infrastructure/Persistence/Configurations/*.cs`
- [ ] T021 Create initial migration `Init` and hand-edit it to: create extensions `btree_gist`, `pg_trgm`, `citext`; add generated column `marriage.certain_period daterange` (= `daterange(start_latest, COALESCE(end_earliest,'infinity'))` when `start_latest IS NOT NULL AND (end_earliest IS NULL OR start_latest < end_earliest)`); add exclusion constraint `ex_marriage_wife_one_husband` per data-model.md; add GIN trigram index on `person.search_text`; CHECK husband_id <> wife_id and not both NULL — in `backend/src/FamilyTree.Infrastructure/Persistence/Migrations/`
- [ ] T022 Implement `AuditInterceptor` (SaveChangesInterceptor writing `ChangeRecord` with before/after JSON, user id from `ICurrentUser`, `CorrelationId` from request header `X-Correlation-Id` or new) in `backend/src/FamilyTree.Infrastructure/Persistence/AuditInterceptor.cs`
- [ ] T023 [P] Implement `SearchTextInterceptor` (recompute `Person.SearchText` from all name fields via ArabicNormalizer on save) in `backend/src/FamilyTree.Infrastructure/Persistence/SearchTextInterceptor.cs`

### Auth, trees, roles

- [ ] T024 Implement Application abstractions `IAppDbContext`, `ICurrentUser`, `IClock`, `IEmailSender`, `ITreeAccess` in `backend/src/FamilyTree.Application/Abstractions/`
- [ ] T025 Implement Identity + JWT: `TokenService` (15-min access JWT, rotating 30-day refresh tokens hashed in `refresh_token` table), endpoints `/auth/register`, `/auth/login`, `/auth/refresh` (cookie for web, body for mobile), `/auth/logout`, `/me` in `backend/src/FamilyTree.Infrastructure/Auth/TokenService.cs` and `backend/src/FamilyTree.Api/Endpoints/AuthEndpoints.cs`
- [ ] T026 Implement tree authorization: route-bound `treeId`, `TreeRoleRequirement(min role)` handler reading `tree_membership`, policies `TreeViewer` (Member+, or anonymous when tree Public), `TreeEditor` (Admin+), `TreeOwner` in `backend/src/FamilyTree.Api/Auth/TreeAuthorization.cs`
- [ ] T027 Implement tree endpoints `GET/POST /trees`, `GET/PUT/DELETE /trees/{treeId}` (creator becomes Owner) with handlers in `backend/src/FamilyTree.Application/Trees/` and `backend/src/FamilyTree.Api/Endpoints/TreeEndpoints.cs`
- [ ] T028 Implement ProblemDetails mapping: `RuleException` → 422 (violations) or 409 (unacknowledged warnings) with `results[]`; Npgsql `23P01` on `ex_marriage_wife_one_husband` → 422 `WIFE_HAS_HUSBAND`; `DbUpdateConcurrencyException` → 412 in `backend/src/FamilyTree.Api/Errors/ProblemMapping.cs`
- [ ] T029 Wire `Program.cs`: DbContext (connection string `ConnectionStrings:Db`), interceptors, Identity, JWT, authorization, CORS for web dev origin, OpenAPI at `/openapi/v1.json`, endpoint group `/api/v1`, Brotli/Gzip response compression, `seed-demo` command arg in `backend/src/FamilyTree.Api/Program.cs`
- [ ] T030 Create integration test fixture: `PostgresFixture` (Testcontainers postgres:17, apply migrations), `ApiFactory : WebApplicationFactory<Program>`, helpers `RegisterAndLoginAsync`, `CreateTreeAsync`, `AsAdmin/AsMember/Anonymous` clients in `backend/tests/FamilyTree.Api.IntegrationTests/Infrastructure/`
- [ ] T031 Integration tests: register/login/refresh rotation, tree create → Owner, Member cannot PUT tree, other user gets 404 for foreign tree in `backend/tests/FamilyTree.Api.IntegrationTests/AuthAndTreesTests.cs`

### Shared client & app shells

- [ ] T032 [P] Implement `packages/shared`: script `gen:api` (openapi-typescript from `http://localhost:5080/openapi/v1.json` → `src/api/schema.d.ts`), `src/api/client.ts` (openapi-fetch client factory with token provider + 401 → refresh retry), `src/rules/messages.ts` (codes from contracts/rule-codes.md), `src/text/normalizeArabic.ts` with tests reading `test-vectors/normalize.json`
- [ ] T033 [P] Implement web shell: `web/src/app/{main.tsx,router.tsx,AuthProvider.tsx,queryClient.ts,i18n.ts}` with login/register pages, tree list + create tree page, `<html dir>` switching ar/en, `web/src/locales/{ar,en}.json`
- [ ] T034 [P] Implement mobile shell: `mobile/app/_layout.tsx` (QueryClient with persisted cache, i18n with RTL via `I18nManager`), `mobile/app/(auth)/login.tsx`, secure token storage `mobile/src/auth/tokenStore.ts`, tree picker `mobile/app/trees.tsx`

**Checkpoint**: A user can register on web and mobile, create/select a tree; integration tests green.

---

## Phase 3: User Story 1 — Admin records people and Islamic marriages (Priority: P1) 🎯 MVP

**Goal**: Create people and marriages with the 4-wives / one-husband rules, iddah and mahram warnings.

**Independent Test**: Via web People page: man with 3–4 concurrent wives saved; 5th refused; woman divorced then remarried saved; overlapping husband refused; mahram pair → warning → confirm → saved with flag.

### Tests for User Story 1 (write first, must fail)

- [ ] T035 [P] [US1] Unit tests `MarriagePolicy` concurrency: 4 overlapping wives allowed; 5th → `MAX_CONCURRENT_WIVES`; 5th after one divorce allowed; sweep catches non-pairwise overlap (A 2000–2010, B 2005–2015 …); vague dates → `POSSIBLE_OVERLAP` warning not violation in `backend/tests/FamilyTree.Domain.Tests/Marriages/ConcurrentWivesTests.cs`
- [ ] T036 [P] [US1] Unit tests woman rules: second husband after divorce allowed; overlapping → `WIFE_HAS_HUSBAND`; within iddah (divorce 90 d / widow 130 d, tree-configurable) → `IDDAH_OVERLAP` warning; same-gender → `SAME_GENDER_MARRIAGE` in `backend/tests/FamilyTree.Domain.Tests/Marriages/WifeRulesTests.cs`
- [ ] T037 [P] [US1] Unit tests `THIRD_DIVORCE` warning (cumulative divorce_count ≥3 between same couple, no intervening marriage of the wife; cleared when she had an intervening marriage) in `backend/tests/FamilyTree.Domain.Tests/Marriages/ThirdDivorceTests.cs`
- [ ] T038 [P] [US1] Unit tests `KinshipService` blood/marriage mahram: mother, daughter, sister (full/half), aunt (paternal/maternal, any level), niece, grand-niece, father's wife, son's wife, wife's mother, wife's daughter → correct code + relation name; first cousin → no warning; incomplete data → no warning in `backend/tests/FamilyTree.Domain.Tests/Kinship/MahramTests.cs`
- [ ] T039 [P] [US1] Unit tests `FORBIDDEN_COMBINATION`: two sisters concurrently → warning; woman + her paternal/maternal aunt → warning; sister after first wife's death → none; sister during ex-wife's iddah → warning in `backend/tests/FamilyTree.Domain.Tests/Kinship/CombinationTests.cs`
- [ ] T040 [P] [US1] Integration tests person CRUD + marriage endpoints: 422 / 409 / acknowledge-then-201 flows, `rule_acknowledgement` rows stored, flags returned, concurrent create of 5th wife from two clients → exactly one succeeds, DB exclusion constraint returns 422 when domain is bypassed in `backend/tests/FamilyTree.Api.IntegrationTests/MarriagesTests.cs`

### Implementation for User Story 1

- [ ] T041 [US1] Implement `MarriagePolicy` (gender check, max-concurrency sweep over certain periods, woman overlap check, possible-overlap warnings, iddah warning using tree settings, third-divorce warning) in `backend/src/FamilyTree.Domain/Marriages/MarriagePolicy.cs`
- [ ] T042 [US1] Implement `KinshipGraph` (in-memory nodes/parent links/marriages/milk links) and `KinshipService.FindMahram(h, w)` + `FindForbiddenCombinations(h, w, period)` returning relation names (ar/en) in `backend/src/FamilyTree.Domain/Kinship/KinshipGraph.cs` and `KinshipService.cs`
- [ ] T043 [US1] Implement subgraph loader: recursive CTE loading ancestors (depth 6) of both people, their descendants to needed depth, all marriages of those people, kinship links → `KinshipGraph` in `backend/src/FamilyTree.Infrastructure/Queries/KinshipSubgraphQuery.cs`
- [ ] T044 [US1] Implement person commands `CreatePerson`, `UpdatePerson` (DEATH_BEFORE_BIRTH; setting death sets IsLiving=false; gender immutable once married), `DeletePerson` (PERSON_HAS_LINKS unless cascade=detach), `RestorePerson` in `backend/src/FamilyTree.Application/People/`
- [ ] T045 [US1] Implement marriage commands `CreateMarriage`, `UpdateMarriage` (transaction, `SELECT … FOR UPDATE` on husband and wife rows, run MarriagePolicy + KinshipService, compare warnings with `acknowledgedWarnings`, store `RuleAcknowledgement`s, recompute `SequenceForHusband` by start date), `DeleteMarriage`, `RestoreMarriage` in `backend/src/FamilyTree.Application/Marriages/`
- [ ] T046 [US1] Implement dry-run `ValidateMarriage` query returning `RuleResults` without saving in `backend/src/FamilyTree.Application/Marriages/ValidateMarriage.cs`
- [ ] T047 [US1] Map endpoints `POST/GET/PUT/DELETE /trees/{treeId}/persons[/{personId}]`, `/restore`, `POST/PUT/DELETE /trees/{treeId}/marriages[/{marriageId}]`, `/restore`, `POST /validate/marriage` with If-Match handling in `backend/src/FamilyTree.Api/Endpoints/PersonEndpoints.cs` and `MarriageEndpoints.cs`
- [ ] T048 [US1] Regenerate shared API types (`npm run gen:api -w packages/shared`) and commit `packages/shared/src/api/schema.d.ts`
- [ ] T049 [P] [US1] Implement `PartialDateInput` (calendar toggle Hijri/Gregorian, year/month/day, approximate) in `web/src/components/PartialDateInput.tsx`
- [ ] T050 [P] [US1] Implement `PersonForm` (react-hook-form + zod, Arabic/English name fields, gender, birth/death, living) in `web/src/features/people/PersonForm.tsx`
- [ ] T051 [P] [US1] Implement `MarriageForm` (husband/wife pickers filtered by gender, start/end, end reason, divorce kind/count) in `web/src/features/marriages/MarriageForm.tsx`
- [ ] T052 [US1] Implement `WarningDialog` (lists 409 results with ar/en messages and people, Confirm re-submits with `acknowledgedWarnings`) and `useRuleAwareMutation` hook (422 → inline error, 409 → dialog) in `web/src/features/rules/WarningDialog.tsx` and `web/src/features/rules/useRuleAwareMutation.ts`
- [ ] T053 [US1] Implement People page: searchable table, create/edit person, person's marriages list ordered by start date with add/edit marriage, warning flag badges in `web/src/features/people/PeoplePage.tsx`
- [ ] T054 [P] [US1] Web tests: 5th-wife refusal message shown, warning confirm flow re-submits with codes in `web/tests/marriages.test.tsx`

**Checkpoint**: US1 independent test passes; `dotnet test` green.

---

## Phase 4: User Story 2 — Children attached to a specific marriage (Priority: P1)

**Goal**: Children belong to one union; nasab computed; kafala and milk kinship recorded (milk counted in mahram).

**Independent Test**: Man with two wives, two children per marriage, grandchild under one child's marriage; children appear in two groups; second parent set refused; kafala shows as separate link.

### Tests for User Story 2

- [ ] T055 [P] [US2] Unit tests parentage: set parent marriage OK; different existing parent → `CHILD_HAS_PARENTS`; cycle (child is ancestor of a spouse) → `ANCESTOR_CYCLE`; birth before marriage start / after end + max pregnancy → `BIRTH_OUTSIDE_MARRIAGE_PERIOD`; parent under 12 → `PARENT_TOO_YOUNG` in `backend/tests/FamilyTree.Domain.Tests/People/ParentageTests.cs`
- [ ] T056 [P] [US2] Unit tests `NasabFormatter`: "محمد بن عبدالله بن عبدالمطلب", "Fatimah bint Muhammad ibn Abdullah", stops at unknown father, uses ism + optional laqab in `backend/tests/FamilyTree.Domain.Tests/Text/NasabFormatterTests.cs`
- [ ] T057 [P] [US2] Unit tests milk kinship mahram: milk mother, milk sister, milk father's daughter → `MAHRAM_MILK`; guardianship → none in `backend/tests/FamilyTree.Domain.Tests/Kinship/MilkKinshipTests.cs`
- [ ] T058 [P] [US2] Integration tests: PUT parent-marriage flows, placeholder parent (marriage with NULL wife), person detail groups children by marriage, kinship link create/delete, cycle refused via CTE in `backend/tests/FamilyTree.Api.IntegrationTests/ChildrenTests.cs`

### Implementation for User Story 2

- [ ] T059 [US2] Implement `ParentagePolicy` (one parent marriage, date warnings) in `backend/src/FamilyTree.Domain/People/ParentagePolicy.cs` and `NasabFormatter` in `backend/src/FamilyTree.Domain/Text/NasabFormatter.cs`
- [ ] T060 [US2] Implement ancestor-cycle check query (recursive CTE: is `personId` an ancestor of marriage's husband or wife) in `backend/src/FamilyTree.Infrastructure/Queries/AncestryQueries.cs`
- [ ] T061 [US2] Extend `KinshipGraph`/`KinshipService` with milk links (milk mother, milk father) for `MAHRAM_MILK` in `backend/src/FamilyTree.Domain/Kinship/KinshipService.cs`
- [ ] T062 [US2] Implement commands `SetParentMarriage` (with placeholder: create marriage with NULL spouse when only one parent known), `ValidateParentMarriage`, `CreateKinshipLink`, `DeleteKinshipLink` in `backend/src/FamilyTree.Application/People/SetParentMarriage.cs` and `backend/src/FamilyTree.Application/Kinship/`
- [ ] T063 [US2] Implement `GetPersonDetail` query (nasab list, parents, marriages ordered with spouse + children, kinship links, flags) in `backend/src/FamilyTree.Application/People/GetPersonDetail.cs`
- [ ] T064 [US2] Map endpoints `PUT /persons/{id}/parent-marriage`, `POST /validate/parent-marriage`, `POST/DELETE /kinship-links`, `GET /persons/{id}` detail in `backend/src/FamilyTree.Api/Endpoints/`
- [ ] T065 [P] [US2] Implement `formatNasab` in `packages/shared/src/text/formatNasab.ts` with tests sharing vectors `packages/shared/test-vectors/nasab.json` (also consumed by T056)
- [ ] T066 [US2] Implement web Person detail page: nasab chain, parents, "Children with {spouse}" groups per marriage, add-child button per marriage, kinship links section (kafala dashed, milk) in `web/src/features/people/PersonDetailPage.tsx`

**Checkpoint**: US1 + US2 work via forms; children grouping correct.

---

## Phase 5: User Story 3 — Visual tree builder (Priority: P1)

**Goal**: React Flow canvas: type-to-add, drag to marry, drag onto union to add child, side panel, auto-layout, undo/redo, quick lineage entry, GEDCOM.

**Independent Test**: Empty tree → build 3 generations (grandfather, 2 wives, 5 children, 2 grandchildren) only on the canvas; reload shows identical result; invalid drop shows reason at drop point; Undo reverts.

### Tests for User Story 3

- [ ] T067 [P] [US3] Tests for shared layout: union nodes beside husband ordered by sequence, children under their union, woman with 2 sequential husbands ordered by start date, RTL mirrors x in `packages/shared/src/layout/layout.test.ts`
- [ ] T068 [P] [US3] Unit tests lineage parser: "Ahmad ibn Ali ibn Hasan", "فاطمة بنت محمد بن عبدالله", variants bin/ibn/b./ابن/بن/بنت, extra spaces/tashkeel in `backend/tests/FamilyTree.Domain.Tests/Text/LineageParserTests.cs`
- [ ] T069 [P] [US3] Web tests for command stack: do/undo/redo of create person, create marriage, set parent, delete (→ restore) using mocked API in `web/tests/commandStack.test.ts`
- [ ] T070 [P] [US3] Integration tests GEDCOM round-trip (export → import into empty tree gives same counts and links; violations reported; warnings auto-acknowledged with source=import) in `backend/tests/FamilyTree.Api.IntegrationTests/GedcomTests.cs`

### Implementation for User Story 3

- [ ] T071 [US3] Implement `GET /trees/{treeId}/graph` compact `TreeGraph` query (persons, marriages, links, flags) in `backend/src/FamilyTree.Application/Trees/GetTreeGraph.cs` and endpoint in `backend/src/FamilyTree.Api/Endpoints/GraphEndpoints.cs`
- [ ] T072 [US3] Implement `LineageParser` in `backend/src/FamilyTree.Domain/Text/LineageParser.cs`, and `ParseLineage` (segments + search candidates) / `CommitLineage` (create or reuse persons, link each to father via placeholder marriage when mother unknown, run rules) in `backend/src/FamilyTree.Application/Lineage/`; endpoints `/lineage/parse`, `/lineage/commit`
- [ ] T073 [US3] Implement layout: `TreeGraph` → ELK graph (person nodes, union nodes with spouse ports, layered DOWN, spouse ordering constraints) → positioned nodes/edges, `dir` option for RTL in `packages/shared/src/layout/layout.ts`
- [ ] T074 [US3] Implement layout Web Worker wrapper (elkjs bundled) in `web/src/features/editor/layout.worker.ts` and hook `useTreeLayout` in `web/src/features/editor/useTreeLayout.ts`
- [ ] T075 [P] [US3] Implement `PersonNode` (name ar/en per locale, years, gender colour, flag badge, droppable handle) in `web/src/features/editor/nodes/PersonNode.tsx`
- [ ] T076 [P] [US3] Implement `UnionNode` (small ring, marriage years, end-reason style: solid ongoing, dashed divorced, grey death; droppable for children) in `web/src/features/editor/nodes/UnionNode.tsx`
- [ ] T077 [US3] Implement command stack (`Command { label, do, undo }`, history with Ctrl+Z / Ctrl+Y, correlation id per command sent as `X-Correlation-Id`) in `web/src/features/editor/commands/commandStack.ts` and command factories in `web/src/features/editor/commands/commands.ts`
- [ ] T078 [US3] Implement `Canvas` (React Flow with node types, pan/zoom, minimap, collapse/expand per person beyond 4 generations from focus, drag-over hit-testing of person/union targets, debounced `/validate/*` with green/amber/red target highlight, drop → MarriageDialog / WarningDialog / inline reason tooltip at drop point) in `web/src/features/editor/Canvas.tsx`
- [ ] T079 [US3] Implement `MarriageDialog` (pre-filled spouses, start date required or "unknown", end fields) reusing `MarriageForm` in `web/src/features/editor/MarriageDialog.tsx`
- [ ] T080 [US3] Implement `CommandBar`: type name + Enter → choose gender → create person at viewport centre; text containing ibn/bint/بن/بنت → lineage parse → candidate picker → commit, in `web/src/features/editor/CommandBar.tsx`
- [ ] T081 [US3] Implement `SidePanel` (selected person → PersonForm + parent/marriage summary; selected union → MarriageForm; delete with confirm → command) in `web/src/features/editor/SidePanel.tsx`
- [ ] T082 [US3] Implement editor page composing Canvas + CommandBar + SidePanel + undo/redo toolbar, admin-only route `/trees/:treeId/edit` in `web/src/features/editor/EditorPage.tsx`
- [ ] T083 [US3] Implement duplicate detection + merge: `POST /persons/{id}/merge` (move marriages/children/links, refuse if rules break) in `backend/src/FamilyTree.Application/People/MergePersons.cs`; suggestion when creating a person with same normalized name + same father in `web/src/features/editor/MergeSuggestion.tsx`
- [ ] T084 [US3] Implement GEDCOM 5.5.1 reader/writer with `_ENDR`, `_DIVT`, `_KAFA`, `_MILK`, `_ACK` tags in `backend/src/FamilyTree.Infrastructure/Gedcom/{GedcomReader.cs,GedcomWriter.cs}`, use cases in `backend/src/FamilyTree.Application/Gedcom/`, endpoints `GET/POST /trees/{treeId}/gedcom`
- [ ] T085 [US3] Add GEDCOM import/export buttons and import report dialog in `web/src/features/gedcom/GedcomPanel.tsx`

**Checkpoint**: Quickstart steps 1–10 pass in the web editor.

---

## Phase 6: User Story 4 — Members browse on web and mobile (Priority: P2)

**Goal**: Read-only viewing; ancestor view is the landing; search ar/en; RTL.

**Independent Test**: On the phone, member searches a grandchild, opens card, navigates up to great-grandfather, across to a half-uncle from another wife; Arabic mode is RTL.

### Tests for User Story 4

- [ ] T086 [P] [US4] Integration tests: `/ancestors` returns paternal chain + mothers + ancestors' other marriages; `/descendants?depth`; `/search` matches "عبدالله"/"عبد الله"/"abdullah" and diacritic variants; Member gets 403 on POST person in `backend/tests/FamilyTree.Api.IntegrationTests/ViewingTests.cs`
- [ ] T087 [P] [US4] Mobile component tests: `AncestorLadder` renders chain in order, shows wives per ancestor, RTL layout in `mobile/tests/AncestorLadder.test.tsx`

### Implementation for User Story 4

- [ ] T088 [US4] Implement queries `GetAncestors(personId, depth)`, `GetDescendants(personId, depth)` (recursive CTE → `TreeGraph`) and `SearchPersons(q)` (normalize q, trigram similarity + prefix, return `PersonSummary` with nasab) in `backend/src/FamilyTree.Application/{Trees,Search}/`; endpoints in `backend/src/FamilyTree.Api/Endpoints/GraphEndpoints.cs`
- [ ] T089 [US4] Implement web read-only viewer (Canvas in view mode, search box, person detail drawer) at route `/trees/:treeId` for Members in `web/src/features/viewer/ViewerPage.tsx`
- [ ] T090 [P] [US4] Implement mobile API hooks (`useTree`, `useAncestors`, `useDescendants`, `usePerson`, `useSearch`) with persisted cache in `mobile/src/api/hooks.ts`
- [ ] T091 [P] [US4] Implement `AncestorLadder` (vertical nasab chain from person to earliest ancestor; each ancestor card lists wives with years and expandable children per marriage) in `mobile/src/components/AncestorLadder.tsx`
- [ ] T092 [US4] Implement landing tab `mobile/app/(tabs)/lineage.tsx`: ancestor view of membership `linkedPersonId` (or tree root, or a picked person), "Set as me" prompt
- [ ] T093 [P] [US4] Implement `PersonCard` and `MarriageGroup` in `mobile/src/components/{PersonCard.tsx,MarriageGroup.tsx}` and person screen `mobile/app/person/[id].tsx` (nasab, parents, marriages with children grouped, navigate up/down/across)
- [ ] T094 [US4] Implement mobile tree canvas using shared layout + `react-native-svg` + gesture-handler/reanimated pan/zoom, lazily expanding descendants in `mobile/src/components/TreeCanvas.tsx` and tab `mobile/app/(tabs)/tree.tsx`
- [ ] T095 [P] [US4] Implement search tab with debounced query and results showing nasab in `mobile/app/(tabs)/search.tsx`
- [ ] T096 [P] [US4] Implement settings tab (language ar/en with RTL restart, sign out, switch tree) in `mobile/app/(tabs)/settings.tsx` and `mobile/src/locales/{ar,en}.json`

**Checkpoint**: Quickstart section 6 passes on a real phone via Expo Go.

---

## Phase 7: User Story 5 — Access control, audit and sharing (Priority: P3)

**Goal**: Invitations, role management, history view, Public trees with living redaction.

**Independent Test**: Invite member → can view not edit; edit appears in history with before/after; signed-out view of Public tree shows "Living person".

### Tests for User Story 5

- [ ] T097 [P] [US5] Integration tests: invitation create/accept (expired/used token refused), role change, removal, last Owner cannot leave in `backend/tests/FamilyTree.Api.IntegrationTests/MembershipTests.cs`
- [ ] T098 [P] [US5] Integration tests: anonymous on Private tree → 404; anonymous on Public tree → living persons redacted in `/graph`, `/persons/{id}`, `/search`, `/ancestors` (no names/dates leaked), deceased visible in `backend/tests/FamilyTree.Api.IntegrationTests/RedactionTests.cs`
- [ ] T099 [P] [US5] Integration test: history lists create/update/delete with before/after and user, filter by entityId, paging by `before` in `backend/tests/FamilyTree.Api.IntegrationTests/HistoryTests.cs`

### Implementation for User Story 5

- [ ] T100 [US5] Implement invitations (`CreateInvitation` with hashed single-use token + email via `IEmailSender`, `AcceptInvitation`) and SMTP/dev-console email sender in `backend/src/FamilyTree.Application/Trees/Invitations/` and `backend/src/FamilyTree.Infrastructure/Email/`
- [ ] T101 [US5] Implement member endpoints `GET /members`, `PATCH/DELETE /members/{userId}` (owner-only, ≥1 Owner invariant) in `backend/src/FamilyTree.Api/Endpoints/MemberEndpoints.cs`
- [ ] T102 [US5] Implement `Redactor` applied in every read projection when caller is anonymous (living → `{id, "Living person", redacted:true}` keeping structural ids; living heuristic per research R9) in `backend/src/FamilyTree.Application/Privacy/Redactor.cs`
- [ ] T103 [US5] Implement `GetHistory` query + endpoint `GET /trees/{treeId}/history` in `backend/src/FamilyTree.Application/History/GetHistory.cs`
- [ ] T104 [P] [US5] Implement web Members page (invite form, role select, remove, link member to person) in `web/src/features/members/MembersPage.tsx`
- [ ] T105 [P] [US5] Implement web History page (timeline, before/after diff, filter by person) in `web/src/features/history/HistoryPage.tsx`
- [ ] T106 [P] [US5] Implement tree settings page (names, visibility Private/Public with share link, iddah days, max pregnancy days, root person) in `web/src/features/trees/TreeSettingsPage.tsx`
- [ ] T107 [US5] Implement public (signed-out) viewer route `/p/:treeId` on web and deep link `familytree://tree/:treeId` on mobile using anonymous client in `web/src/features/viewer/PublicViewerPage.tsx` and `mobile/app/public/[treeId].tsx`

**Checkpoint**: Quickstart step 11 passes; redaction tests green.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T108 [P] Seed demo data command (3–4 generations, polygamous + sequential marriages, kafala, milk kinship, Arabic + English names) in `backend/src/FamilyTree.Infrastructure/Seed/DemoSeeder.cs`
- [ ] T109 [P] Performance test: generate 5,000-person tree; assert `/graph` < 500 ms server and payload < 1 MB compressed; `/search` < 200 ms in `backend/tests/FamilyTree.Api.IntegrationTests/PerformanceTests.cs`
- [ ] T110 [P] RTL/LTR audit: replace physical CSS with logical properties, mirror canvas controls, verify every web page in ar and en in `web/src/**`
- [ ] T111 [P] Accessibility pass: keyboard alternatives for drag-and-drop on the canvas (select person → "Marry…" / "Add as child of…" menu), focus order, aria labels in `web/src/features/editor/`
- [ ] T112 [P] Security hardening: rate-limit `/auth/*`, password policy, refresh-token reuse detection revokes family, security headers, secrets via user-secrets/env in `backend/src/FamilyTree.Api/Program.cs`
- [ ] T113 [P] Add `backend/src/FamilyTree.Api/Dockerfile` and `api` service in `docker-compose.yml`; production build config for web (`web/vite.config.ts`) and EAS build profile `mobile/eas.json`
- [ ] T114 Run the full `specs/001-family-tree-core/quickstart.md` script end-to-end and fix any gaps
- [ ] T115 Update `README.md` with architecture overview, run commands, and screenshots

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)**: after Phase 2. No story dependencies. **MVP.**
- **US2 (Phase 4)**: after Phase 2; uses Person/Marriage endpoints from US1 (T044–T047) and extends `KinshipService` (T042).
- **US3 (Phase 5)**: after US1 + US2 (canvas drives their commands; reuses PersonForm, MarriageForm, WarningDialog).
- **US4 (Phase 6)**: after Phase 2 + T063 (person detail) + T073 (shared layout). Backend part (T086, T088) can start after US2.
- **US5 (Phase 7)**: after Phase 2; T102 must touch every read query, so do it after US4's queries exist.
- **Polish (Phase 8)**: after desired stories.

### Within Each Story

- Tests first (must fail) → domain → application → infrastructure queries → endpoints → regenerate shared types → UI.

### Parallel Opportunities

- Setup: T007, T008, T009, T010, T011.
- Foundational: T012/T013 tests together; T014–T017 together; T032, T033, T034 together after T029.
- US1: T035–T040 together; T049–T051 together.
- US2: T055–T058 together; T065 alongside backend work.
- US3: T067–T070 together; T075, T076 together.
- US4: mobile T090, T091, T093, T095, T096 in parallel after T088.
- US5: T097–T099 together; T104–T106 together.

---

## Parallel Example: User Story 1

```text
# Tests (write first, together):
T035 ConcurrentWivesTests.cs   T036 WifeRulesTests.cs   T037 ThirdDivorceTests.cs
T038 MahramTests.cs            T039 CombinationTests.cs T040 MarriagesTests.cs (integration)

# Web forms (together, after T048):
T049 PartialDateInput.tsx      T050 PersonForm.tsx      T051 MarriageForm.tsx
```

## Parallel Example: User Story 4

```text
# After T088 (backend queries):
T090 mobile/src/api/hooks.ts   T091 AncestorLadder.tsx  T093 PersonCard/MarriageGroup + person/[id].tsx
T095 search tab                T096 settings tab
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1): marriages with all rules, usable from the web People page.
3. **STOP and VALIDATE** with the US1 independent test.

### Incremental Delivery

1. + US2 → children per marriage, nasab → demo three generations via forms.
2. + US3 → visual canvas editor (the main admin experience).
3. + US4 → mobile viewer with ancestor landing (the main member experience).
4. + US5 → invitations, history, public sharing → ready to invite the family.

### Notes

- Commit after each task or logical group; keep `dotnet test` and `npm test` green at each checkpoint.
- Any change to rule codes must update `contracts/rule-codes.md`, `RuleMessages.cs`, and `packages/shared/src/rules/messages.ts` together.
