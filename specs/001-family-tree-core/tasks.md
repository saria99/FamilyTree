---
description: "Task list for 001-family-tree-core (Bayrab Genealogy)"
---

# Tasks: Bayrab Genealogy — Core Platform

**Input**: Design documents from `specs/001-family-tree-core/` (regenerated 2026-10-17)
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Included. Constitution III requires test-first for every rule (allowed + rejected case) and an integration
test for **every** API endpoint against real PostgreSQL (Testcontainers). Write each test task first and see it fail.

**Analysis fixes folded in**: C1 (redaction before any anonymous access → T040–T043), C2 (tests for every rule and
endpoint), D1 (`FIFTH_WIFE_DURING_IDDAH`), I1 (`CHILD_BORN_BEFORE_PARENT`), U1 (shared placeholder), U2 (GEDCOM uses
import preview), G1 (photos), G2 (password reset), G3 (claims and kinship edges drawn everywhere), G4 (mobile performance
check), G5 (mobile RTL audit).

**Organization**: By user story. P1: US1, US2, US6, US3 · P2: US4, US7 · P3: US5, US8, US9.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 … US9 from spec.md
- Paths are relative to the repo root `C:\Madinah\FamilyTree`

## Path Conventions

- Backend: `backend/src/FamilyTree.{Domain,Application,Infrastructure,Api}/`, tests in `backend/tests/`
- Shared TS: `packages/shared/src/` · Web: `web/src/` · Mobile: `mobile/` (expo-router `app/`, components `mobile/src/`)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create root files: `.gitignore` (dotnet, node, expo, `.env`, `backend/.data/`), `.editorconfig` (C# + TS, LF), `.gitattributes` (`* text=auto eol=lf`)
- [ ] T002 Create `docker-compose.yml` with service `db` (postgres:17, db/user/password `familytree`, port 5432, named volume, healthcheck `pg_isready`)
- [ ] T003 Create .NET solution `backend/FamilyTree.sln` with projects `backend/src/FamilyTree.Domain` (classlib), `backend/src/FamilyTree.Application` (classlib), `backend/src/FamilyTree.Infrastructure` (classlib), `backend/src/FamilyTree.Api` (webapi, minimal APIs), `backend/tests/FamilyTree.Domain.Tests` (xunit), `backend/tests/FamilyTree.Api.IntegrationTests` (xunit); references Domain ← Application ← Infrastructure ← Api
- [ ] T004 Add `backend/Directory.Build.props` (net10.0, nullable, implicit usings, TreatWarningsAsErrors) and `backend/Directory.Packages.props` (central versions: Npgsql.EntityFrameworkCore.PostgreSQL 10.x, Microsoft.EntityFrameworkCore.Design 10.x, Microsoft.AspNetCore.Identity.EntityFrameworkCore 10.x, Microsoft.AspNetCore.Authentication.JwtBearer 10.x, Microsoft.AspNetCore.OpenApi 10.x, QuestPDF, ClosedXML, CsvHelper, xunit, Shouldly, Testcontainers.PostgreSql, Microsoft.AspNetCore.Mvc.Testing, UglyToad.PdfPig (tests))
- [ ] T005 Add `backend/.config/dotnet-tools.json` with the `dotnet-ef` local tool
- [ ] T006 Create root `package.json` with npm workspaces `["packages/*", "web", "mobile"]` and scripts `dev:web`, `dev:mobile`, `test`, `lint`, `gen:api`
- [ ] T007 [P] Scaffold `packages/shared` (`package.json` name `@familytree/shared`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `test-vectors/`)
- [ ] T008 [P] Scaffold `web` (Vite React TS); deps `@xyflow/react elkjs @tanstack/react-query react-router-dom i18next react-i18next react-hook-form zod @hookform/resolvers openapi-fetch`; dev deps `vitest @testing-library/react @testing-library/user-event jsdom`; depend on `@familytree/shared`
- [ ] T009 [P] Scaffold `mobile` with `npx create-expo-app` (TypeScript, expo-router); add `react-native-svg react-native-gesture-handler react-native-reanimated expo-secure-store expo-file-system expo-sharing @tanstack/react-query @tanstack/query-async-storage-persister @react-native-async-storage/async-storage i18next react-i18next expo-localization`; set `metro.config.js` watchFolders to the repo root
- [ ] T010 [P] Configure ESLint + Prettier at the root (`eslint.config.js`, `.prettierrc`) for web, mobile, packages/shared
- [ ] T011 [P] Add `.github/workflows/ci.yml`: job `backend` (setup-dotnet 10, `dotnet test backend`; Docker available for Testcontainers), job `js` (setup-node 24, `npm ci`, `npm run lint`, `npm test`)

**Checkpoint**: `docker compose up -d db`, `dotnet build backend`, `npm install`, `npm run dev -w web` succeed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain primitives, full schema, auth, tree roles, **redaction**, audit, files, jobs, shared client, app shells.

### Domain primitives (tests first)

- [ ] T012 [P] Tests for `PartialDate` (Day/Month/Year/Unknown precision bounds; approximate ±5 y; Hijri via UmAlQura with tabular fallback outside 1318–1500 AH; invalid month/day rejected; `CertainlyBefore`, `PossiblyOverlaps`) in `backend/tests/FamilyTree.Domain.Tests/Dates/PartialDateTests.cs`
- [ ] T013 [P] Tests for `ArabicNormalizer` using vectors in `packages/shared/test-vectors/normalize.json` (create the file: tashkeel, tatweel, أإآٱ→ا, ة→ه, ى→ي, ؤ→و, ئ→ي, Latin lowercase, spaces) in `backend/tests/FamilyTree.Domain.Tests/Text/ArabicNormalizerTests.cs`
- [ ] T014 [P] Tests for `PublicIdFormatter` (`BYR` + 7 → `BYR-000007`; prefix validation `^[A-Z]{2,6}$`; parse back) in `backend/tests/FamilyTree.Domain.Tests/People/PublicIdTests.cs`
- [ ] T015 [P] Implement `PartialDate` and `HijriConverter` in `backend/src/FamilyTree.Domain/Dates/`
- [ ] T016 [P] Implement `ArabicNormalizer` in `backend/src/FamilyTree.Domain/Text/ArabicNormalizer.cs`
- [ ] T017 [P] Implement `PublicIdFormatter` in `backend/src/FamilyTree.Domain/People/PublicId.cs`
- [ ] T018 [P] Implement rule primitives `RuleCode` (all 23 codes in contracts/rule-codes.md), `RuleSeverity`, `RuleResult`, `RuleOutcome` (`ThrowIfBlocked(acknowledged)`), `RuleException` in `backend/src/FamilyTree.Domain/Rules/`
- [ ] T019 [P] Implement `RuleMessages` (ar/en templates from contracts/rule-codes.md) in `backend/src/FamilyTree.Domain/Rules/RuleMessages.cs`
- [ ] T020 [P] Implement `VerificationStatus`, `Confidence`, `Verification` value object (defaults Unconfirmed/Low) in `backend/src/FamilyTree.Domain/Evidence/Verification.cs`

### Entities & persistence

- [ ] T021 Implement entities `FamilyTree` (IdPrefix, NextPersonNumber, visibility, iddah/pregnancy settings), `TreeMembership`, `Person` (PublicId, names, gender, dates, IsLiving, PhotoFileId, SearchText, DeletedAt), `Marriage` (+Verification, IsPlaceholder), `ParentageClaim`, `KinshipLink` (+Verification), `Source`, `SourceFile`, `Citation`, `StoredFile`, `Branch`, `ExportJob`, `ImportBatch`, `RuleAcknowledgement`, `ChangeRecord` in `backend/src/FamilyTree.Domain/{Trees,People,Marriages,Parentage,Kinship,Evidence,Branches,Files,Jobs,Imports,Rules,Audit}/`
- [ ] T022 Implement `AppDbContext` (Identity `AppUser` with DisplayName; all sets; soft-delete global filters) in `backend/src/FamilyTree.Infrastructure/Persistence/AppDbContext.cs`
- [ ] T023 Implement EF configurations: snake_case, PartialDate column groups, Verification columns, composite keys `(tree_id, id)` and composite FKs, xmin row version, enums → smallint, jsonb for `import_batch.rows/summary` and `export_job.params` in `backend/src/FamilyTree.Infrastructure/Persistence/Configurations/*.cs`
- [ ] T024 Create migration `Init` and hand-edit it per data-model.md: extensions `btree_gist`, `pg_trgm`, `citext`; generated `marriage.certain_period` and `is_placeholder`; exclusion constraint `ex_marriage_wife_one_husband` (Disputed excluded); placeholder partial unique indexes; `parentage_claim` partial unique preferred index + duplicate-claim unique index; `citation` single-target CHECK; oral-account CHECK on `source`; branch single-root CHECK; GIN trigram index on `person.search_text`; unique `(tree_id, public_id)`; deferred constraint trigger `trg_verified_has_citation` on marriage/parentage_claim/kinship_link — in `backend/src/FamilyTree.Infrastructure/Persistence/Migrations/`
- [ ] T025 Implement `AuditInterceptor` (ChangeRecord with before/after JSON, user from `ICurrentUser`, CorrelationId from `X-Correlation-Id` header or an ambient scope used by imports) in `backend/src/FamilyTree.Infrastructure/Persistence/AuditInterceptor.cs`
- [ ] T026 [P] Implement `SearchTextInterceptor` (names + public id → normalised `SearchText`) in `backend/src/FamilyTree.Infrastructure/Persistence/SearchTextInterceptor.cs`
- [ ] T027 Implement `PersonIdAllocator` (lock tree row `FOR UPDATE`, increment `next_person_number`, format with T017) in `backend/src/FamilyTree.Infrastructure/Persistence/PersonIdAllocator.cs`

### Files & jobs

- [ ] T028 Implement abstractions `IAppDbContext`, `ICurrentUser`, `IClock`, `IEmailSender`, `IFileStore`, `IJobQueue`, `ITreeAccess` in `backend/src/FamilyTree.Application/Abstractions/`
- [ ] T029 [P] Implement `LocalDiskFileStore` (root `FileStore:Root`, path `{treeId}/{fileId}`, sha256, size ≤ 25 MB configurable, content-type allow-list) in `backend/src/FamilyTree.Infrastructure/Files/LocalDiskFileStore.cs`
- [ ] T030 [P] Implement `JobQueue` (`Channel<Guid>`) + `JobWorker` BackgroundService (re-queue pending jobs at startup, dispatch by `ExportJob.Kind` to registered `IExportHandler`s, expire results after 24 h) in `backend/src/FamilyTree.Infrastructure/Jobs/`

### Auth, trees, roles

- [ ] T031 Implement Identity + JWT `TokenService` (15-min access JWT, rotating hashed 30-day refresh tokens) and endpoints `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/me` in `backend/src/FamilyTree.Infrastructure/Auth/TokenService.cs` and `backend/src/FamilyTree.Api/Endpoints/AuthEndpoints.cs`
- [ ] T032 Implement password reset (G2): `/auth/forgot-password` (always 202, rate-limited), `/auth/reset-password` (Identity token, 1 h, single use) and the email template in `backend/src/FamilyTree.Api/Endpoints/AuthEndpoints.cs` and `backend/src/FamilyTree.Infrastructure/Email/`
- [ ] T033 Implement a dev email sender that writes to the console and a SMTP sender chosen by config in `backend/src/FamilyTree.Infrastructure/Email/{ConsoleEmailSender.cs,SmtpEmailSender.cs}`
- [ ] T034 Implement tree authorization: route-bound `treeId`; `TreeRoleRequirement` handler reading `tree_membership`; policies `TreeViewer` (Member+; anonymous **denied** until T042 enables Public access), `TreeEditor` (Admin+), `TreeOwner` in `backend/src/FamilyTree.Api/Auth/TreeAuthorization.cs`
- [ ] T035 Implement tree endpoints `GET/POST /trees`, `GET/PUT/DELETE /trees/{treeId}` (creator becomes Owner; `idPrefix` required on create, immutable) in `backend/src/FamilyTree.Application/Trees/` and `backend/src/FamilyTree.Api/Endpoints/TreeEndpoints.cs`
- [ ] T036 Implement ProblemDetails mapping: `RuleException` → 422/409 with `results[]`; Npgsql `23P01` on `ex_marriage_wife_one_husband` → 422 `WIFE_HAS_HUSBAND`; `23505` on the preferred-claim index → 422 `CHILD_HAS_PARENTS`; trigger error from `trg_verified_has_citation` → 422 `VERIFIED_REQUIRES_SOURCE`; `DbUpdateConcurrencyException` → 412; file size → 413, type → 415 in `backend/src/FamilyTree.Api/Errors/ProblemMapping.cs`
- [ ] T037 Wire `Program.cs`: DbContext, interceptors, Identity, JWT, authorization, CORS for the web dev origin, OpenAPI `/openapi/v1.json`, `/api/v1` group, Brotli/Gzip, rate limiter on `/auth/*`, file store, job worker, `seed-demo` arg in `backend/src/FamilyTree.Api/Program.cs`
- [ ] T038 Create integration fixture: `PostgresFixture` (Testcontainers postgres:17 + migrations), `ApiFactory` (temp file-store root, captured email sender), helpers `RegisterAndLoginAsync`, `CreateTreeAsync`, `AsAdmin/AsMember/Anonymous` in `backend/tests/FamilyTree.Api.IntegrationTests/Infrastructure/`
- [ ] T039 Integration tests: register/login/refresh rotation/logout, forgot→reset password via captured email, tree create → Owner, Member cannot PUT tree, foreign tree → 404, idPrefix immutable, anonymous → 401/404 on every tree route in `backend/tests/FamilyTree.Api.IntegrationTests/AuthAndTreesTests.cs`

### Redaction first (C1)

- [ ] T040 [P] Unit tests for `LivingPolicy` (is_living flag; no death + birth < 100 years; no death + unknown birth → living) and `Redactor` (living → `{id, publicId:null, "Living person", redacted:true}`, links kept; deceased untouched; members never redacted) in `backend/tests/FamilyTree.Domain.Tests/Privacy/RedactorTests.cs`
- [ ] T041 Implement `LivingPolicy` and `Redactor` (works on person DTOs, graph payloads, citations/quotations naming living people, file access decisions) in `backend/src/FamilyTree.Application/Privacy/`
- [ ] T042 Enable anonymous `TreeViewer` access **only** for Public trees and only through endpoints whose projections call `Redactor` (marker `RequiresRedaction()` on the endpoint group; startup check fails if an anonymous-allowed endpoint lacks it) in `backend/src/FamilyTree.Api/Auth/TreeAuthorization.cs`
- [ ] T043 Integration test: startup check rejects an anonymous-allowed endpoint without the redaction marker; Private tree anonymous → 404 in `backend/tests/FamilyTree.Api.IntegrationTests/RedactionGuardTests.cs`

### Shared client & app shells

- [ ] T044 [P] Implement `packages/shared`: `gen:api` script (openapi-typescript → `src/api/schema.d.ts`), `src/api/client.ts` (openapi-fetch with token provider + 401 refresh retry), `src/rules/messages.ts`, `src/text/normalizeArabic.ts` + tests on `test-vectors/normalize.json`
- [ ] T045 [P] Implement `packages/shared/src/status/styles.ts` (status → dash pattern, colour, badge icon; confidence → stroke width; legend entries in ar/en) with tests in `packages/shared/src/status/styles.test.ts`
- [ ] T046 [P] Implement web shell `web/src/app/{main.tsx,router.tsx,AuthProvider.tsx,queryClient.ts,i18n.ts}`: login, register, forgot/reset password pages, tree list + create tree (with ID prefix), `<html dir>` switching, `web/src/locales/{ar,en}.json`
- [ ] T047 [P] Implement mobile shell: `mobile/app/_layout.tsx` (QueryClient with persisted cache, i18n + RTL via `I18nManager`), `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/forgot.tsx`, `mobile/src/auth/tokenStore.ts` (expo-secure-store), `mobile/app/trees.tsx`

**Checkpoint**: register/sign-in/reset on web and mobile; trees with roles; no anonymous data exposure possible; tests green.

---

## Phase 3: User Story 1 — People and Islamic marriages (Priority: P1) 🎯 MVP

**Goal**: People (with IDs and photos) and marriages with the 4-wives / one-husband rules, iddah, mahram, statuses.

**Independent Test**: Via the web admin forms: 4 concurrent wives saved; 5th refused; 5th during a divorced wife's iddah
→ warning; woman divorced then remarried saved; overlapping husband refused; mahram pair → warning → confirm → flagged;
a new marriage shows Unconfirmed/Low; Verified refused (no source yet).

### Tests for User Story 1 (write first, must fail)

- [ ] T048 [P] [US1] `MarriagePolicy` concurrency tests: 4 overlapping allowed; 5th → `MAX_CONCURRENT_WIVES`; non-pairwise sweep; vague dates → `POSSIBLE_OVERLAP`; 5th within a divorced wife's iddah → `FIFTH_WIFE_DURING_IDDAH` warning, after iddah → no result; Disputed marriages excluded, Disputed 5th → `DISPUTED_EXCEEDS_LIMIT` warning in `backend/tests/FamilyTree.Domain.Tests/Marriages/ConcurrentWivesTests.cs`
- [ ] T049 [P] [US1] Woman rules: sequential husbands allowed; overlap → `WIFE_HAS_HUSBAND`; Disputed overlap → `DISPUTED_EXCEEDS_LIMIT`; inside iddah (90/130 days, tree-configurable) → `IDDAH_OVERLAP`; same gender → `SAME_GENDER_MARRIAGE` in `backend/tests/FamilyTree.Domain.Tests/Marriages/WifeRulesTests.cs`
- [ ] T050 [P] [US1] `THIRD_DIVORCE` tests (≥3 cumulative divorces, cleared by her intervening marriage) in `backend/tests/FamilyTree.Domain.Tests/Marriages/ThirdDivorceTests.cs`
- [ ] T051 [P] [US1] `KinshipService` mahram tests (mother, daughter, full/half sister, aunts any level, niece, grand-niece, father's wife, son's wife, wife's mother, wife's daughter → code + relation; first cousin → none; missing links → none) in `backend/tests/FamilyTree.Domain.Tests/Kinship/MahramTests.cs`
- [ ] T052 [P] [US1] `FORBIDDEN_COMBINATION` tests (two sisters concurrently; woman + aunt; sister after death → none; sister during ex-wife's iddah → warning) in `backend/tests/FamilyTree.Domain.Tests/Kinship/CombinationTests.cs`
- [ ] T053 [P] [US1] Person rule tests: `DEATH_BEFORE_BIRTH`; death sets IsLiving=false; gender immutable once married; `PERSON_HAS_LINKS` unless cascade=detach in `backend/tests/FamilyTree.Domain.Tests/People/PersonRulesTests.cs`
- [ ] T054 [P] [US1] Integration tests persons: create assigns sequential `publicId`, never reused after delete; update with If-Match/412; delete 422 `PERSON_HAS_LINKS` / detach; restore; photo upload (ok, 413, 415) and download auth in `backend/tests/FamilyTree.Api.IntegrationTests/PersonsTests.cs`
- [ ] T055 [P] [US1] Integration tests marriages: 422/409/acknowledge→201 flows, acknowledgements stored + flags; defaults Unconfirmed/Low; Verified without citation → 422; concurrent 5th wife from two clients → one succeeds; exclusion constraint via raw SQL insert → 23P01; delete/restore; `POST /validate/marriage` returns results and saves nothing in `backend/tests/FamilyTree.Api.IntegrationTests/MarriagesTests.cs`

### Implementation for User Story 1

- [ ] T056 [US1] Implement `MarriagePolicy` (gender; concurrency sweep on non-Disputed certain periods; iddah-extended sweep → `FIFTH_WIFE_DURING_IDDAH`; Disputed → `DISPUTED_EXCEEDS_LIMIT`; woman overlap; possible overlap; `IDDAH_OVERLAP`; `THIRD_DIVORCE`) in `backend/src/FamilyTree.Domain/Marriages/MarriagePolicy.cs`
- [ ] T057 [US1] Implement `KinshipGraph` and `KinshipService.FindMahram` / `FindForbiddenCombinations` (preferred lineage) in `backend/src/FamilyTree.Domain/Kinship/`
- [ ] T058 [US1] Implement `KinshipSubgraphQuery` (recursive CTE over preferred claims: ancestors depth 6 of both people, needed descendants, their marriages, kinship links) in `backend/src/FamilyTree.Infrastructure/Queries/KinshipSubgraphQuery.cs`
- [ ] T059 [US1] Implement person commands `CreatePerson` (allocates public id), `UpdatePerson`, `DeletePerson`, `RestorePerson`, `SetPersonPhoto`, `DeletePersonPhoto` in `backend/src/FamilyTree.Application/People/`
- [ ] T060 [US1] Implement `EvidencePolicy.CanSetStatus` (Verified requires ≥1 citation; used by all relationship commands) in `backend/src/FamilyTree.Domain/Evidence/EvidencePolicy.cs`
- [ ] T061 [US1] Implement marriage commands `CreateMarriage`, `UpdateMarriage` (transaction + `FOR UPDATE` on spouses, policies, acknowledgement handling, sequence recompute, EvidencePolicy), `DeleteMarriage`, `RestoreMarriage`, and `ValidateMarriage` dry-run in `backend/src/FamilyTree.Application/Marriages/`
- [ ] T062 [US1] Map endpoints persons (`/persons`, `/{id}`, `/restore`, `/photo`), marriages (`/marriages`, `/{id}`, `/restore`), `POST /validate/marriage`, `GET /files/{fileId}` (redaction-aware) in `backend/src/FamilyTree.Api/Endpoints/{PersonEndpoints,MarriageEndpoints,FileEndpoints}.cs`
- [ ] T063 [US1] Regenerate shared API types (`npm run gen:api -w packages/shared`) and commit `packages/shared/src/api/schema.d.ts`
- [ ] T064 [P] [US1] Implement `PartialDateInput` (Hijri/Gregorian, Y/M/D, approximate) in `web/src/components/PartialDateInput.tsx`
- [ ] T065 [P] [US1] Implement `StatusBadge`, `StatusLegend`, `VerificationFields` (status + confidence; Verified option disabled with tooltip when citationCount = 0) in `web/src/components/`
- [ ] T066 [P] [US1] Implement `PersonForm` (names ar/en, gender, dates, living, photo upload, shows public id) in `web/src/features/people/PersonForm.tsx`
- [ ] T067 [P] [US1] Implement `MarriageForm` (spouse pickers by gender, dates, end reason, divorce kind/count, VerificationFields) in `web/src/features/marriages/MarriageForm.tsx`
- [ ] T068 [US1] Implement `WarningDialog` + `useRuleAwareMutation` (422 inline, 409 dialog → re-submit with acknowledgedWarnings) in `web/src/features/rules/`
- [ ] T069 [US1] Implement People page (search by name or public id, create/edit person, marriages list with status badges, add/edit marriage, warning flags) in `web/src/features/people/PeoplePage.tsx`
- [ ] T070 [P] [US1] Web tests: 5th-wife refusal message, iddah warning confirm flow, Verified disabled without citations in `web/tests/marriages.test.tsx`

**Checkpoint**: US1 independent test passes; `dotnet test` green.

---

## Phase 4: User Story 2 — Children attached to a specific marriage (Priority: P1)

**Goal**: Preferred parentage claims, placeholders, nasab, kafala and milk kinship.

**Independent Test**: Man with two wives, two children per marriage, grandchild under one child's marriage; children in two
groups; a second preferred parentage refused; a child born before the father refused; kafala shown as a separate link.

### Tests for User Story 2

- [ ] T071 [P] [US2] `ParentagePolicy` tests: first claim preferred; second preferred → `CHILD_HAS_PARENTS`; same marriage twice → `DUPLICATE_PARENTAGE_CLAIM`; cycle → `ANCESTOR_CYCLE`; certain earlier birth than parent → `CHILD_BORN_BEFORE_PARENT`; possible conflict → `PARENT_TOO_YOUNG`; birth outside marriage period → `BIRTH_OUTSIDE_MARRIAGE_PERIOD` in `backend/tests/FamilyTree.Domain.Tests/Parentage/ParentagePolicyTests.cs`
- [ ] T072 [P] [US2] `NasabFormatter` tests on shared vectors `packages/shared/test-vectors/nasab.json` (create: "محمد بن عبدالله بن عبدالمطلب", "Fatimah bint Muhammad ibn Abdullah", stop at unknown father, laqab) in `backend/tests/FamilyTree.Domain.Tests/Text/NasabFormatterTests.cs`
- [ ] T073 [P] [US2] Milk kinship tests (milk mother, milk sister, milk father's daughter → `MAHRAM_MILK`; guardianship → none) in `backend/tests/FamilyTree.Domain.Tests/Kinship/MilkKinshipTests.cs`
- [ ] T074 [P] [US2] Integration tests: `POST /persons/{id}/parentage-claims` (preferred), `knownParentId` reuses one placeholder per parent (U1) and placeholder → normal when spouse set; `POST /validate/parentage` saves nothing; person detail groups children per marriage; claim delete/restore; cycle via CTE refused in `backend/tests/FamilyTree.Api.IntegrationTests/ParentageTests.cs`
- [ ] T075 [P] [US2] Integration tests kinship links create/update/delete with verification fields in `backend/tests/FamilyTree.Api.IntegrationTests/KinshipLinksTests.cs`

### Implementation for User Story 2

- [ ] T076 [US2] Implement `ParentagePolicy` in `backend/src/FamilyTree.Domain/Parentage/ParentagePolicy.cs` and `NasabFormatter` in `backend/src/FamilyTree.Domain/Text/NasabFormatter.cs`
- [ ] T077 [US2] Implement `AncestryQueries` (is-ancestor over **all** claims for cycles; preferred-only ancestors for nasab) in `backend/src/FamilyTree.Infrastructure/Queries/AncestryQueries.cs`
- [ ] T078 [US2] Extend `KinshipGraph`/`KinshipService` with milk links (`MAHRAM_MILK`) in `backend/src/FamilyTree.Domain/Kinship/KinshipService.cs`
- [ ] T079 [US2] Implement commands `CreateParentageClaim` (preferred path; placeholder reuse via `knownParentId`), `UpdateParentageClaim`, `DeleteParentageClaim`, `RestoreParentageClaim`, `ValidateParentage`, `SetPlaceholderSpouse` in `backend/src/FamilyTree.Application/Parentage/`
- [ ] T080 [US2] Implement `CreateKinshipLink`, `UpdateKinshipLink`, `DeleteKinshipLink` in `backend/src/FamilyTree.Application/Kinship/`
- [ ] T081 [US2] Implement `GetPersonDetail` (nasab, claims, marriages with children/alternativeChildren, kinship links, flags; redaction applied) in `backend/src/FamilyTree.Application/People/GetPersonDetail.cs`
- [ ] T082 [US2] Map endpoints parentage claims, `/validate/parentage`, kinship links, `GET /persons/{id}` detail in `backend/src/FamilyTree.Api/Endpoints/{ParentageEndpoints,KinshipEndpoints,PersonEndpoints}.cs`; regenerate shared types
- [ ] T083 [P] [US2] Implement `formatNasab` in `packages/shared/src/text/formatNasab.ts` with tests on `test-vectors/nasab.json`
- [ ] T084 [US2] Implement web person profile (public id, photo, nasab, parents, "Children with {spouse}" per marriage, add child per marriage, kinship links with status badges) in `web/src/features/people/PersonDetailPage.tsx`

**Checkpoint**: US1 + US2 via forms; children grouping correct.

---

## Phase 5: User Story 6 — Sources, verification and competing claims (Priority: P1)

**Goal**: Sources (incl. oral accounts) with attachments, citations, Verified-needs-source, competing parentage claims.

**Independent Test**: Oral-account parentage with narrator; competing documented claim; mark it preferred; profile lists
both with sources; the tree (once US3 lands) and profile show Disputed styling.

### Tests for User Story 6

- [ ] T085 [P] [US6] `EvidencePolicy` tests: Verified needs ≥1 citation on marriage/claim/kinship; removing the last citation of a Verified relationship → `VERIFIED_REQUIRES_SOURCE`; source delete → `SOURCE_IN_USE` with affected list; oral account requires narrator + told date in `backend/tests/FamilyTree.Domain.Tests/Evidence/EvidencePolicyTests.cs`
- [ ] T086 [P] [US6] Competing-claim tests: adding an alternative marks all claims Disputed (unless keepStatuses); prefer-swap keeps exactly one preferred; deleting the preferred leaves none (no inference); cycle via an alternative claim refused in `backend/tests/FamilyTree.Domain.Tests/Parentage/CompetingClaimsTests.cs`
- [ ] T087 [P] [US6] Integration tests sources: CRUD, oral-account validation, attach file (ok/413/415), detach, download respects redaction, delete with `SOURCE_IN_USE` → acknowledge → relationships downgraded + audited in `backend/tests/FamilyTree.Api.IntegrationTests/SourcesTests.cs`
- [ ] T088 [P] [US6] Integration tests citations: single-target validation, cite person facts, Verified after citing, delete last citation of Verified → 422; DB trigger rejects a raw-SQL Verified row with no citation in `backend/tests/FamilyTree.Api.IntegrationTests/CitationsTests.cs`
- [ ] T089 [P] [US6] Integration tests: alternative claim create, `/prefer` swap updates nasab of descendants, `GET /relationships` filters (status, confidence, noSource, kind, branch) with cursor paging in `backend/tests/FamilyTree.Api.IntegrationTests/ClaimsAndResearchTests.cs`

### Implementation for User Story 6

- [ ] T090 [US6] Implement source commands/queries `CreateSource`, `UpdateSource`, `DeleteSource` (SOURCE_IN_USE + downgrade), `AttachSourceFile`, `DetachSourceFile`, `ListSources`, `GetSource` in `backend/src/FamilyTree.Application/Evidence/Sources/`
- [ ] T091 [US6] Implement citation commands `CreateCitation`, `UpdateCitation`, `DeleteCitation` in `backend/src/FamilyTree.Application/Evidence/Citations/`
- [ ] T092 [US6] Extend parentage commands with alternatives (`asPreferred=false`, `keepStatuses`) and `PreferParentageClaim` in `backend/src/FamilyTree.Application/Parentage/`
- [ ] T093 [US6] Implement `ListRelationships` research query in `backend/src/FamilyTree.Application/Evidence/ListRelationships.cs`
- [ ] T094 [US6] Map endpoints sources, source files, citations, `/parentage-claims/{id}/prefer`, `/relationships` in `backend/src/FamilyTree.Api/Endpoints/{SourceEndpoints,CitationEndpoints,ParentageEndpoints,ResearchEndpoints}.cs`; regenerate shared types
- [ ] T095 [P] [US6] Implement web `SourcesPage` + `SourceForm` (type-specific fields, oral-account narrator picker, file upload list) in `web/src/features/evidence/`
- [ ] T096 [P] [US6] Implement `CitationPicker` (search/create source inline, detail, quotation) used in MarriageForm, claim panel, kinship form and person facts in `web/src/features/evidence/CitationPicker.tsx`
- [ ] T097 [US6] Add the claims section to the person profile (preferred + alternatives with status, sources, "Make preferred", "Add alternative claim") in `web/src/features/parentage/ClaimsSection.tsx`
- [ ] T098 [P] [US6] Implement `ResearchQueuePage` (filters, links to fix) in `web/src/features/evidence/ResearchQueuePage.tsx`
- [ ] T099 [P] [US6] Web tests: Verified enabled only after citing; alternative claim flow; source delete warning in `web/tests/evidence.test.tsx`

**Checkpoint**: Evidence works end-to-end via forms and profile.

---

## Phase 6: User Story 3 — Visual tree builder (Priority: P1)

**Goal**: React Flow canvas with type-to-add, drag to marry, drag onto union for a child (or alternative claim), status
styling, side panel with verification + citations, auto-layout, undo/redo, quick lineage entry, merge.

**Independent Test**: Empty tree → 3 generations only on the canvas; reload identical; invalid drop explained at drop point;
Undo reverts; statuses and alternative claims visibly styled; legend present.

### Tests for User Story 3

- [ ] T100 [P] [US3] Shared layout tests: unions beside husband by sequence; children under their union; woman's sequential husbands by date; alternative-claim and kinship edges present with their status (G3); RTL mirrors x in `packages/shared/src/layout/layout.test.ts`
- [ ] T101 [P] [US3] `LineageParser` tests (ibn/bin/b./bint/ابن/بن/بنت, tashkeel, extra spaces) in `backend/tests/FamilyTree.Domain.Tests/Text/LineageParserTests.cs`
- [ ] T102 [P] [US3] Integration tests `/lineage/parse` (candidates) and `/lineage/commit` (links created Unconfirmed/Low; with `sourceId` → citation created; reuse of father's placeholder; warnings flow) in `backend/tests/FamilyTree.Api.IntegrationTests/LineageTests.cs`
- [ ] T103 [P] [US3] Integration tests `/persons/{id}/merge` (moves marriages, claims, citations, links; keeps the survivor's public id; refused when rules break; audit) in `backend/tests/FamilyTree.Api.IntegrationTests/MergeTests.cs`
- [ ] T104 [P] [US3] Integration test `GET /graph` payload (claims with p/vs/cf, marriages vs/cf/ph, links vs, public ids) in `backend/tests/FamilyTree.Api.IntegrationTests/GraphTests.cs`
- [ ] T105 [P] [US3] Web tests command stack: do/undo/redo for create person, marriage, claim, prefer swap, delete→restore in `web/tests/commandStack.test.ts`

### Implementation for User Story 3

- [ ] T106 [US3] Implement `GetTreeGraph` (persons, marriages, claims, links, flags; `branchId` param accepted, filtered in US7) in `backend/src/FamilyTree.Application/Trees/GetTreeGraph.cs` + endpoint in `backend/src/FamilyTree.Api/Endpoints/GraphEndpoints.cs`
- [ ] T107 [US3] Implement `LineageParser` in `backend/src/FamilyTree.Domain/Text/LineageParser.cs`; `ParseLineage` / `CommitLineage` (Unconfirmed default, optional `sourceId`, placeholder reuse) in `backend/src/FamilyTree.Application/Lineage/`; endpoints
- [ ] T108 [US3] Implement `MergePersons` in `backend/src/FamilyTree.Application/People/MergePersons.cs` + endpoint
- [ ] T109 [US3] Implement shared layout (ELK layered DOWN; person + union nodes; spouse ports; preferred-claim edges; alternative-claim and kinship edges routed separately; RTL) in `packages/shared/src/layout/layout.ts`
- [ ] T110 [US3] Implement layout Web Worker + `useTreeLayout` in `web/src/features/editor/{layout.worker.ts,useTreeLayout.ts}`
- [ ] T111 [P] [US3] Implement `PersonNode` (names per locale, public id, years, photo thumbnail, flag badge) in `web/src/features/editor/nodes/PersonNode.tsx`
- [ ] T112 [P] [US3] Implement `UnionNode` (years, end-reason glyph, status badge, placeholder style, drop target) in `web/src/features/editor/nodes/UnionNode.tsx`
- [ ] T113 [P] [US3] Implement `StatusEdge` (dash/colour/width from `styles.ts`; tooltip with status, confidence, citation count) in `web/src/features/editor/edges/StatusEdge.tsx`
- [ ] T114 [US3] Implement command stack + command factories (correlation id per command) in `web/src/features/editor/commands/`
- [ ] T115 [US3] Implement `Canvas` (node/edge types, pan/zoom, minimap, `StatusLegend` overlay, collapse beyond 4 generations, drag-over validation colouring, drop flows incl. "Already has preferred parents — add as alternative claim?") in `web/src/features/editor/Canvas.tsx`
- [ ] T116 [US3] Implement `MarriageDialog` reusing `MarriageForm` in `web/src/features/editor/MarriageDialog.tsx`
- [ ] T117 [US3] Implement `CommandBar` (type name → gender → create; lineage text → parse → candidate picker → optional source → commit) in `web/src/features/editor/CommandBar.tsx`
- [ ] T118 [US3] Implement `SidePanel` (person → PersonForm + citations on facts; union → MarriageForm + citations; claim edge → status, citations, make preferred; delete with confirm) in `web/src/features/editor/SidePanel.tsx`
- [ ] T119 [US3] Implement `EditorPage` (Canvas + CommandBar + SidePanel + undo/redo toolbar, admin route `/trees/:treeId/edit`) and `MergeSuggestion` in `web/src/features/editor/`

**Checkpoint**: Quickstart steps 1–14 pass in the web editor.

---

## Phase 7: User Story 4 — Members browse on web and mobile (Priority: P2)

**Goal**: Read-only viewing with ancestor landing, search (names + IDs), statuses visible, RTL.

**Independent Test**: Phone: search a grandchild, open the profile, go up to the great-grandfather and across to a
half-uncle; status badges and legend visible; Arabic is RTL.

### Tests for User Story 4

- [ ] T120 [P] [US4] Integration tests `/ancestors`, `/descendants?depth`, `/search` (Arabic variants, English, public id), Member 403 on writes in `backend/tests/FamilyTree.Api.IntegrationTests/ViewingTests.cs`
- [ ] T121 [P] [US4] Mobile tests: `AncestorLadder` order, wives per ancestor, status badges, RTL in `mobile/tests/AncestorLadder.test.tsx`

### Implementation for User Story 4

- [ ] T122 [US4] Implement `GetAncestors`, `GetDescendants`, `SearchPersons` (normalised trigram + prefix + exact public id; redaction) in `backend/src/FamilyTree.Application/{Trees,Search}/` + endpoints
- [ ] T123 [US4] Implement web read-only viewer (Canvas view mode, search, profile drawer, legend) at `/trees/:treeId` in `web/src/features/viewer/ViewerPage.tsx`
- [ ] T124 [P] [US4] Mobile API hooks (`useTree`, `useAncestors`, `useDescendants`, `usePerson`, `useSearch`, `useSource`) with persisted cache in `mobile/src/api/hooks.ts`
- [ ] T125 [P] [US4] Mobile `StatusBadge`, `StatusLegend` (from shared styles) in `mobile/src/components/`
- [ ] T126 [P] [US4] Mobile `AncestorLadder` (nasab chain with wives per ancestor, status per link, expandable children per marriage) in `mobile/src/components/AncestorLadder.tsx`
- [ ] T127 [US4] Mobile landing `mobile/app/(tabs)/lineage.tsx` (linked person, tree root, or picked person; "Set as me")
- [ ] T128 [P] [US4] Mobile `PersonCard`, `MarriageGroup`, `ClaimList` and screen `mobile/app/person/[id].tsx` (public id, photo, nasab, claims, marriages with children, sources list)
- [ ] T129 [P] [US4] Mobile source screen `mobile/app/sources/[id].tsx` (details, citations, attachments opened via authorized download)
- [ ] T130 [US4] Mobile `TreeCanvas` (shared layout, react-native-svg, status edges incl. alternative claims and kinship links (G3), pan/zoom, lazy expansion, legend) in `mobile/src/components/TreeCanvas.tsx` and `mobile/app/(tabs)/tree.tsx`
- [ ] T131 [P] [US4] Mobile search tab (names or public id; nasab in results) in `mobile/app/(tabs)/search.tsx`
- [ ] T132 [P] [US4] Mobile settings tab (language with RTL restart, sign out, switch tree) in `mobile/app/(tabs)/settings.tsx` and `mobile/src/locales/{ar,en}.json`

**Checkpoint**: Quickstart section 6 passes on a phone via Expo Go.

---

## Phase 8: User Story 7 — Maternal lineage and branches (Priority: P2)

**Goal**: Maternal line view; named branches rooted at a person or a marriage; branch filtering everywhere.

**Independent Test**: Two branches from one patriarch through two wives; filter to one; follow a maternal line 3 generations.

### Tests for User Story 7

- [ ] T133 [P] [US7] Integration tests `/maternal-line` (order, each mother's nasab, stops at unknown, redaction) in `backend/tests/FamilyTree.Api.IntegrationTests/MaternalLineTests.cs`
- [ ] T134 [P] [US7] Integration tests branches: CRUD + single-root validation; membership for root person vs root marriage; includeSpouses; a person in two branches; `branchId` filter on `/graph`, `/search`, `/relationships` in `backend/tests/FamilyTree.Api.IntegrationTests/BranchesTests.cs`

### Implementation for User Story 7

- [ ] T135 [US7] Implement `GetMaternalLine` (CTE via preferred claim → wife) in `backend/src/FamilyTree.Application/Trees/GetMaternalLine.cs` + endpoint
- [ ] T136 [US7] Implement `BranchMembershipQuery` (recursive CTE, optional spouses) in `backend/src/FamilyTree.Infrastructure/Queries/BranchMembershipQuery.cs` and branch commands/queries in `backend/src/FamilyTree.Application/Branches/` + endpoints
- [ ] T137 [US7] Apply `branchId` filtering and per-person branch indexes (`br`) in `GetTreeGraph`, `SearchPersons`, `ListRelationships`; branches on `GetPersonDetail` in `backend/src/FamilyTree.Application/`
- [ ] T138 [P] [US7] Web `BranchesPage` (create from person or marriage, colour) and `BranchFilter` on editor + viewer in `web/src/features/branches/`
- [ ] T139 [P] [US7] Web maternal line panel on the profile in `web/src/features/people/MaternalLine.tsx`
- [ ] T140 [P] [US7] Mobile `MaternalLadder` + screen `mobile/app/person/[id]/maternal.tsx`, and a branch picker on tree/search tabs in `mobile/src/components/BranchPicker.tsx`

**Checkpoint**: Branch filter and maternal lines work on web and mobile.

---

## Phase 9: User Story 5 — Access control, audit and sharing (Priority: P3)

**Goal**: Invitations, roles, history, Public trees (redaction already enforced since Phase 2).

**Independent Test**: Invite member → view only; edit appears in history; signed-out view of a Public tree shows "Living person".

### Tests for User Story 5

- [ ] T141 [P] [US5] Integration tests invitations + members (expired/used token refused, role change, removal, last Owner cannot leave) in `backend/tests/FamilyTree.Api.IntegrationTests/MembershipTests.cs`
- [ ] T142 [P] [US5] Redaction coverage tests for every anonymous-allowed endpoint: `/graph`, `/persons/{id}`, `/search`, `/ancestors`, `/maternal-line`, `/descendants`, `/sources`, `/sources/{id}`, `/files/{id}`, `/branches`, `/persons/{id}/parentage-claims` in `backend/tests/FamilyTree.Api.IntegrationTests/RedactionTests.cs`
- [ ] T143 [P] [US5] Integration tests `/history` (create/update/delete/restore with before/after and user; filter by entity; paging) in `backend/tests/FamilyTree.Api.IntegrationTests/HistoryTests.cs`

### Implementation for User Story 5

- [ ] T144 [US5] Implement invitations (`CreateInvitation`, `AcceptInvitation`) in `backend/src/FamilyTree.Application/Trees/Invitations/` + endpoints
- [ ] T145 [US5] Implement member endpoints (`GET /members`, `PATCH/DELETE /members/{userId}`, ≥1 Owner invariant) in `backend/src/FamilyTree.Api/Endpoints/MemberEndpoints.cs`
- [ ] T146 [US5] Implement `GetHistory` + endpoint in `backend/src/FamilyTree.Application/History/GetHistory.cs`
- [ ] T147 [P] [US5] Web `MembersPage` (invite, roles, remove, link member to person) in `web/src/features/members/MembersPage.tsx`
- [ ] T148 [P] [US5] Web `HistoryPage` (timeline, before/after diff, import operations grouped by correlation id) in `web/src/features/history/HistoryPage.tsx`
- [ ] T149 [P] [US5] Web `TreeSettingsPage` (names, visibility + share link, iddah days, pregnancy days, root person; prefix read-only) in `web/src/features/trees/TreeSettingsPage.tsx`
- [ ] T150 [US5] Public viewer route `/p/:treeId` (web) and deep link `familytree://tree/:treeId` (mobile) with anonymous client in `web/src/features/viewer/PublicViewerPage.tsx` and `mobile/app/public/[treeId].tsx`

**Checkpoint**: Quickstart step 11 passes; redaction coverage green.

---

## Phase 10: User Story 8 — PDF family trees and printable reports (Priority: P3)

**Goal**: Ancestor, descendant, branch wall charts and person reports in Arabic/English with legend and redaction.

**Independent Test**: Descendant chart for a 3-generation branch and a person report; PDF structure, legend and sources match the screen.

### Tests for User Story 8

- [ ] T151 [P] [US8] `ChartLayout` tests (union grouping under husband, wives by sequence, alternative-claim edges, RTL mirroring, no overlapping boxes) in `backend/tests/FamilyTree.Domain.Tests/Charts/ChartLayoutTests.cs`
- [ ] T152 [P] [US8] Integration tests exports-PDF: job lifecycle (Queued→Done), each chart type renders, text extracted with PdfPig contains names, public ids, legend labels and source titles; Arabic text present; anonymous Public PDF redacts living people; anonymous Excel → 403; result expiry in `backend/tests/FamilyTree.Api.IntegrationTests/PdfExportTests.cs`
- [ ] T153 [P] [US8] Performance test: 500-person branch descendant PDF < 30 s (SC-009) in `backend/tests/FamilyTree.Api.IntegrationTests/PdfPerformanceTests.cs`

### Implementation for User Story 8

- [ ] T154 [US8] Implement `ChartLayout` (tidy tree with union nodes; ancestor and descendant modes; RTL) in `backend/src/FamilyTree.Domain/Charts/ChartLayout.cs`
- [ ] T155 [US8] Implement export job commands (`CreateExport`, `GetExport`, `DownloadExport`) with role checks in `backend/src/FamilyTree.Application/Exports/` + endpoints in `backend/src/FamilyTree.Api/Endpoints/ExportEndpoints.cs`
- [ ] T156 [US8] Implement QuestPDF renderers `AncestorChartPdf`, `DescendantChartPdf`, `BranchWallChartPdf` (custom size or tiled A3), `PersonReportPdf` (family group sheet with citations), shared `StatusPdfStyles` mirroring `styles.ts`, embedded Noto Naskh Arabic + Noto Sans, `ContentFromRightToLeft` for Arabic in `backend/src/FamilyTree.Infrastructure/Pdf/`
- [ ] T157 [US8] Register the PDF export handler with `JobWorker` (redacted data load for anonymous requests) in `backend/src/FamilyTree.Infrastructure/Pdf/PdfExportHandler.cs`
- [ ] T158 [P] [US8] Web `ExportDialog` (PDF chart type, root/branch, generations, language, paper; job polling; download) in `web/src/features/exports/ExportDialog.tsx`
- [ ] T159 [P] [US8] Mobile "Share as PDF" on person and branch screens (create job, poll, `expo-sharing`) in `mobile/src/components/SharePdfButton.tsx`

**Checkpoint**: Quickstart step 16 passes.

---

## Phase 11: User Story 9 — Excel/CSV (and GEDCOM) import/export (Priority: P3)

**Goal**: Template, preview-then-commit imports, lossless exports; GEDCOM through the same pipeline (U2).

**Independent Test**: Export a branch to Excel, change 2 names, add 1 child row, re-import → preview 2 Update + 1 New → commit → one history operation.

### Tests for User Story 9

- [ ] T160 [P] [US9] Integration tests Excel: template download; export sheets/columns incl. ids, statuses, confidence, source refs; export→import into empty tree reproduces people/ids/claims/statuses/citations (SC-010) in `backend/tests/FamilyTree.Api.IntegrationTests/ExcelRoundTripTests.cs`
- [ ] T161 [P] [US9] Integration tests import preview: outcomes New/Update/Unchanged/Rejected; match by public id, then name+father; ambiguous → candidates; structural violation row rejected while others commit; warnings acknowledged with source `import`; commit = one correlation id; stale preview (tree changed) → 409; discard in `backend/tests/FamilyTree.Api.IntegrationTests/ImportPreviewTests.cs`
- [ ] T162 [P] [US9] Integration tests CSV zip export/import parity with Excel in `backend/tests/FamilyTree.Api.IntegrationTests/CsvTests.cs`
- [ ] T163 [P] [US9] Integration tests GEDCOM: export (FAM/INDI, `_VSTAT`, `_PREF`, `_BYRID`, SOUR) and import through preview; round trip into an empty tree (SC-006) in `backend/tests/FamilyTree.Api.IntegrationTests/GedcomTests.cs`

### Implementation for User Story 9

- [ ] T164 [US9] Implement `SpreadsheetSchema` (sheets People, Marriages, Parentage, Kinship, Sources, Citations; columns, `ref` cross-references, validation) in `backend/src/FamilyTree.Application/Imports/SpreadsheetSchema.cs`
- [ ] T165 [US9] Implement `ExcelWriter`/`ExcelReader` (ClosedXML) and `CsvZipWriter`/`CsvZipReader` (CsvHelper) in `backend/src/FamilyTree.Infrastructure/Spreadsheets/`
- [ ] T166 [US9] Implement `GedcomWriter`/`GedcomReader` (5.5.1 + custom tags per R15) in `backend/src/FamilyTree.Infrastructure/Gedcom/`
- [ ] T167 [US9] Implement `ImportPreviewService` (parse → stage rows in `import_batch` → dry-run each row through Application validators → outcomes + candidates) in `backend/src/FamilyTree.Application/Imports/ImportPreviewService.cs`
- [ ] T168 [US9] Implement `ImportCommitService` (one transaction, ambient correlation id, replay via existing commands, skip rejected rows, stale check) in `backend/src/FamilyTree.Application/Imports/ImportCommitService.cs`
- [ ] T169 [US9] Register Excel/Csv/Gedcom export handlers with `JobWorker` and map import endpoints (`/imports/template`, `/imports`, `/imports/{id}`, `/imports/{id}/commit`, discard) in `backend/src/FamilyTree.Infrastructure/Spreadsheets/` and `backend/src/FamilyTree.Api/Endpoints/ImportEndpoints.cs`
- [ ] T170 [P] [US9] Web `ImportWizard` (upload, format, preview grid with outcome filter and rule messages, new-or-merge choices, commit/discard) in `web/src/features/imports/ImportWizard.tsx`
- [ ] T171 [P] [US9] Extend `ExportDialog` with Excel, CSV, GEDCOM (branch filter) in `web/src/features/exports/ExportDialog.tsx`

**Checkpoint**: Quickstart step 17 passes.

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T172 [P] Seed demo data (4 generations, polygamous + sequential marriages, oral and documented sources, one disputed parentage, kafala, milk kinship, two branches, Arabic + English names) in `backend/src/FamilyTree.Infrastructure/Seed/DemoSeeder.cs`
- [ ] T173 [P] Backend performance tests: 50k-person tree — `/search` < 200 ms server; 5k `/graph` < 500 ms and < 1 MB compressed (SC-004, SC-011) in `backend/tests/FamilyTree.Api.IntegrationTests/PerformanceTests.cs`
- [ ] T174 [P] Mobile performance check (G4): open a 5,000-person tree on a mid-range Android device (release build) and record time-to-interactive < 3 s; document the procedure and results in `mobile/docs/performance.md`
- [ ] T175 [P] RTL/LTR audit (G5): web (logical CSS, mirrored canvas controls) and mobile (every screen in ar and en, `I18nManager` restart) — fix issues in `web/src/**` and `mobile/**`
- [ ] T176 [P] Accessibility: keyboard alternatives for drag-and-drop ("Marry…", "Add as child of…", "Add alternative claim…"), status never conveyed by colour alone, aria labels in `web/src/features/editor/`
- [ ] T177 [P] Security hardening: password policy, refresh-token reuse detection, security headers, upload content sniffing, secrets via user-secrets/env in `backend/src/FamilyTree.Api/Program.cs`
- [ ] T178 [P] Packaging: `backend/src/FamilyTree.Api/Dockerfile` (fonts included), `api` service + files volume in `docker-compose.yml`, web production build, `mobile/eas.json`
- [ ] T179 Run all of `specs/001-family-tree-core/quickstart.md` end-to-end and fix gaps
- [ ] T180 Update `README.md` with run commands, architecture diagram and screenshots

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → stories. Phase 2 includes redaction (T040–T043) **before** any anonymous access (C1).
- **US1 (3)**: after Phase 2. **MVP.**
- **US2 (4)**: after US1 (uses persons/marriages, KinshipService).
- **US6 (5)**: after US2 (alternative claims extend parentage; citations target marriages/claims/links).
- **US3 (6)**: after US1 + US2 + US6 so the canvas draws statuses and alternative claims from day one.
- **US4 (7)**: after US2 (T081) and T109 (shared layout); backend part (T120, T122) can start after US2.
- **US7 (8)**: after US4 queries (filters extend them).
- **US5 (9)**: after Phase 2; T142 runs after all anonymous endpoints exist (end of US7).
- **US8 (10)**: after US2 + US6 (citations in reports) + US7 (branch charts).
- **US9 (11)**: after US6 + US7; reuses `JobWorker` from Phase 2 and `ExportDialog` from US8.
- **Polish (12)**: after the desired stories.

### Within Each Story

Tests first (must fail) → domain → application → infrastructure queries → endpoints → regenerate shared types → UI.

### Parallel Opportunities

- Setup: T007–T011. Foundational: T012–T014 then T015–T020; T029/T030; T044–T047 after T037.
- US1: T048–T055 together; T064–T067 together. US2: T071–T075. US6: T085–T089; T095/T096/T098.
- US3: T100–T105; T111–T113. US4: T124–T126, T128/T129, T131/T132. US7: T133/T134; T138–T140.
- US5: T141–T143; T147–T149. US8: T151–T153; T158/T159. US9: T160–T163; T170/T171. Polish: T172–T178.

---

## Parallel Example: User Story 6

```text
# Tests together:
T085 EvidencePolicyTests.cs   T086 CompetingClaimsTests.cs   T087 SourcesTests.cs
T088 CitationsTests.cs        T089 ClaimsAndResearchTests.cs

# Web after T094:
T095 SourcesPage/SourceForm   T096 CitationPicker   T098 ResearchQueuePage
```

## Parallel Example: User Story 9

```text
T160 ExcelRoundTripTests   T161 ImportPreviewTests   T162 CsvTests   T163 GedcomTests
# then T165 (spreadsheets) and T166 (GEDCOM) in parallel, after T164
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 (including redaction and person IDs).
2. Phase 3 (US1): people and marriages with every rule, statuses defaulting to Unconfirmed, via web forms.
3. **STOP and VALIDATE** with the US1 independent test.

### Incremental Delivery

1. + US2 → children per marriage, nasab, kafala/milk.
2. + US6 → sources, citations, Verified-needs-source, competing claims (the "reliable record" core).
3. + US3 → visual canvas with status styling.
4. + US4 → mobile viewer with ancestor landing. + US7 → maternal lines and branches.
5. + US5 → invitations, history, public sharing. + US8 → PDFs. + US9 → Excel/CSV/GEDCOM.

### Notes

- Commit after each task or logical group; keep `dotnet test` and `npm test` green at each checkpoint.
- Changing a rule code updates `contracts/rule-codes.md`, `RuleMessages.cs`, and `packages/shared/src/rules/messages.ts` together.
- Changing status styles updates `packages/shared/src/status/styles.ts` and `StatusPdfStyles` together.
