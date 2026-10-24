---
description: "Task list for 001-family-tree-core (Bayrab Genealogy) — vertical slices + React PWA, prototype first"
---

# Tasks: Bayrab Genealogy — Core Platform

**Input**: Design documents from `specs/001-family-tree-core/` (regenerated 2026-10-21)
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Stack**: .NET 10 single project `backend/src/Bayrab.Api` in vertical slices (`Features/<Area>/<UseCase>.cs` + shared
`Domain/` kernel), PostgreSQL 17, one React PWA in `web/`.

**Order**: **Phase 0 is a visual prototype**: no backend and no database. It uses fictional sample data in the
browser's storage plus JSON file save/load, and deploys to GitHub Pages for feedback. Backend phases start after feedback.

**2026-10-24**: religious-rule governance removed (research R31). Rule tasks below are reduced to the integrity checks
(same-gender couple, one preferred parentage, duplicate claim, cycles); mahram/iddah/limit/date/Verified-source work is dropped.
Diamond nodes and drag-to-relate added as T122–T125 (research R32).

**Tests**: Constitution III: test-first for every rule; one integration test class per backend feature area
(Testcontainers PostgreSQL). Phase 0 rule ports are tested with Vitest using shared `test-vectors/`, which the xUnit
tests reuse later.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 … US9 from spec.md (Phase 0 tasks are labelled with the story whose experience they prototype)

---

## Phase 0: Visual Prototype (no backend) 🎯 first feedback

**Goal**: A clickable, installable React PWA with a fictional sample family where people can try the whole experience:
build the tree visually, feel the Islamic marriage rules, see statuses and sources, browse ancestors on a phone, switch
Arabic/English. Data lives in the browser (localStorage) and can be downloaded or opened as a JSON file.

**Independent Test**: Open the GitHub Pages URL on a phone and on a desktop. On desktop: add a man and five women; four
marriages succeed and the fifth is refused with the rule message; add children to two different wives; drag a child onto
a second union → offered as an alternative (Disputed) claim; Undo works; Download JSON, Reset demo, Open JSON restores it.
On phone: install to home screen; the ancestor view opens; search "عبد الله" finds the person; airplane mode still opens it.

### Setup

- [x] T001 Scaffold `web/` with Vite React TS; add `@xyflow/react elkjs react-router-dom i18next react-i18next react-hook-form zod @hookform/resolvers idb-keyval`; dev deps `vitest @testing-library/react @testing-library/user-event jsdom @playwright/test vite-plugin-pwa`
- [x] T002 [P] Configure ESLint + Prettier (`web/eslint.config.js`, `web/.prettierrc`) and Vitest (`web/vitest.config.ts`, jsdom) — *done with oxlint (Vite template default) instead of ESLint*
- [x] T003 [P] Configure `vite-plugin-pwa` in `web/vite.config.ts` (generateSW, `registerType: 'prompt'`, manifest name "Bayrab Genealogy", short name "Bayrab", standalone, theme colours, `base` from `VITE_BASE` for GitHub Pages) and add icons `web/public/icons/{icon-192.png,icon-512.png,maskable-512.png}`
- [x] T004 [P] Add GitHub Pages deploy workflow `.github/workflows/pages.yml` (Node 24, `npm ci && npm run build` in `web/` with `VITE_BASE=/<repo>/`, upload `web/dist`, SPA 404 fallback copy of `index.html`)
- [x] T005 [P] Add root `.gitignore` (node, dist, dotnet, `.env`, `backend/.data/`), `.editorconfig`, `.gitattributes` (`* text=auto eol=lf`)

### Data & rules in the browser

- [x] T006 [US1] Define the TS model mirroring data-model.md (`Person` with `publicId`, `Marriage`, `ParentageClaim`, `KinshipLink`, `Source`, `Citation`, `Branch`, `Verification`, `PartialDate`) in `web/src/data/model.ts`
- [x] T007 [P] [US1] Create a **fictional** demo family (loaded via Settings or `?seed=demo`; the default seed is the Bayrab records file `web/src/data/seed/bayrab-records.json`, imported by `records.ts`) (prefix `DEMO`, 4 generations, a man with 3 wives, a woman with two sequential husbands, one disputed parentage, one oral-account source, one document source, kafala, milk kinship, two branches, Arabic + English names) in `web/src/data/sampleFamily.ts`
- [x] T008 [US1] Implement `DataSource` interface (queries + commands matching the API slices) in `web/src/data/DataSource.ts` and `LocalStore` (reducer, command history for undo/redo, localStorage persistence with schema version, "Reset demo") in `web/src/data/LocalStore.ts`
- [x] T009 [P] [US1] Create rule test vectors `test-vectors/rules/{concurrent-wives,wife-overlap,parentage,iddah,verified-source}.json` (input graph + proposed change + expected codes) and `test-vectors/{normalize,nasab,status-styles}.json` — *done as `test-vectors/rules.json` and `test-vectors/text.json`*
- [x] T010 [US1] Vitest tests over the vectors for `MAX_CONCURRENT_WIVES`, `WIFE_HAS_HUSBAND`, `SAME_GENDER_MARRIAGE`, `POSSIBLE_OVERLAP`, `IDDAH_OVERLAP`, `FIFTH_WIFE_DURING_IDDAH`, `DISPUTED_EXCEEDS_LIMIT`, `CHILD_HAS_PARENTS`, `DUPLICATE_PARENTAGE_CLAIM`, `ANCESTOR_CYCLE`, `CHILD_BORN_BEFORE_PARENT`, `VERIFIED_REQUIRES_SOURCE` in `web/src/domain/rules.test.ts`
- [x] T011 [US1] Implement `partialDate.ts` (Y/M/D precision bounds, approximate; Hijri display via `Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura')`) and `rules.ts` (the codes in T010; mahram checks are deferred to the backend phase) in `web/src/domain/`
- [x] T012 [P] [US1] Implement `messages.ts` (ar/en from contracts/rule-codes.md) in `web/src/domain/messages.ts`
- [x] T013 [P] [US2] Implement `normalizeArabic.ts` and `formatNasab.ts` with tests on `test-vectors/` in `web/src/domain/text/`
- [x] T014 [P] [US3] Implement `LineageParser` port (ibn/bin/bint/ابن/بن/بنت) with tests in `web/src/domain/text/lineageParser.ts`
- [x] T015 [US1] Implement JSON file save/load: "Download tree (JSON)" and "Open JSON file" with zod validation and a version check, in `web/src/data/jsonFile.ts` and `web/src/features/settings/DataFileMenu.tsx`

### Shell, statuses, layout

- [x] T016 [US4] Implement the app shell: router, i18n ar/en with `<html dir>` switching, responsive layout (desktop: toolbar + canvas + side panel; phone < 768 px: bottom tabs Lineage/Tree/Search/Settings), permanent "Prototype — fictional sample data" banner, in `web/src/app/` and `web/src/locales/{ar,en}.json`
- [x] T017 [P] [US6] Implement `status/styles.ts` (dash, colour, width by confidence, badge icon; checked against `test-vectors/status-styles.json`), `StatusBadge`, `StatusLegend` in `web/src/shared/`
- [x] T018 [US3] Implement layout (elkjs in a Web Worker: person + union nodes, wives ordered by sequence beside the husband, children under their union, alternative-claim and kinship edges, RTL mirroring) with tests in `web/src/features/layout/` — *elkjs is lazy-loaded on the main thread; move to a Worker if large trees feel slow*
- [x] T019 [P] [US3] Implement `PersonNode` (name per locale, public id, years, gender colour, flag), `UnionNode` (years, end-reason glyph, status badge, drop target), `StatusEdge` in `web/src/features/editor/{nodes,edges}/`

### Editor (desktop)

- [x] T020 [US3] Implement `Canvas` (React Flow, pan/zoom, minimap, legend overlay, branch filter, drag-over rule check colouring green/amber/red, drop flows: person→person = MarriageDialog, person→union = child, child with preferred parents → "Add as alternative claim?") in `web/src/features/editor/Canvas.tsx`
- [x] T021 [US3] Implement `CommandBar` (type name + Enter → gender → new person; lineage text → parse → pick existing/new → create chain as Unconfirmed) in `web/src/features/editor/CommandBar.tsx`
- [x] T022 [US1] Implement `SidePanel` with `PersonForm`, `MarriageForm` (dates, end reason, divorce kind/count, status + confidence; Verified disabled until a source is cited), claim panel (status, sources, Make preferred), and `WarningDialog` (confirm warnings) in `web/src/features/editor/`
- [x] T023 [US3] Implement undo/redo toolbar and Ctrl+Z / Ctrl+Y over `LocalStore` history in `web/src/features/editor/UndoRedo.tsx`
- [x] T024 [P] [US6] Implement Sources page (list, create with type-specific fields incl. oral-account narrator/date/recorder) and `CitationPicker` in `web/src/features/evidence/`

### Viewing (desktop + phone)

- [x] T025 [US4] Implement the person profile (desktop drawer / phone full-screen sheet): public id, nasab, maternal line, parents and alternative claims, marriages in order with children per marriage, kinship links, sources, status badges, in `web/src/features/viewer/Profile.tsx`
- [x] T026 [P] [US4] Implement `AncestorLadder` (phone landing: nasab chain, each ancestor's wives, expandable children per marriage, status per link) and `MaternalLadder` in `web/src/features/viewer/`
- [x] T027 [P] [US4] Implement search (normalised Arabic/English + public id) for desktop and the phone tab in `web/src/features/search/Search.tsx`
- [x] T028 [US4] Implement view-only tree tab for phones (same Canvas with editing disabled, touch pinch/pan, legend) in `web/src/features/viewer/TreeView.tsx`

### PWA & feedback

- [x] T029 [P] [US4] Implement install button (`beforeinstallprompt`), iOS "Add to Home Screen" sheet, update toast, offline banner in `web/src/features/pwa/`
- [x] T030 [P] Add feedback issue template `.github/ISSUE_TEMPLATE/prototype-feedback.md` (what you tried, what confused you, attach your downloaded JSON) and a "Give feedback" link in Settings
- [x] T031 Playwright smoke tests: add 5 wives → 5th refused; child under each wife; alternative claim flow; undo; JSON download → reset → open restores; reload keeps data; offline reload opens (service worker) in `web/tests/prototype.spec.ts`
- [ ] T032 Deploy to GitHub Pages, run Lighthouse installability check on the deployed URL, and record the URL and feedback plan in `specs/001-family-tree-core/prototype-feedback.md`

### Phase 0 revisions (2026-10-24)

- [x] T122 [US1] Remove religious-rule and date checks from the browser rules (`web/src/domain/rules.ts`, `messages.ts`, `commands.ts`); keep integrity checks; update `test-vectors/rules.json` and the desktop test (5th wife accepted)
- [x] T123 [US3] Diamond person node with connectors top = parents, left/right = siblings, bottom = children in `web/src/features/editor/nodes.tsx`
- [x] T124 [US3] Drag from a connector to a person to create parent / sibling / child links (marriage picker, "other parent unknown") in `web/src/features/editor/FamilyCanvas.tsx` and `web/src/data/commands.ts`
- [x] T125 [US3] Free arrangement (positions kept in the tree data, rings follow spouses, Auto-arrange) and re-shifting (Move here / Add as alternative) with Playwright coverage in `web/tests/desktop.spec.ts`

**Checkpoint (STOP)**: Collect feedback. Update spec.md/plan.md with what changed before starting Phase 1.

---

## Phase 1: Backend Setup

- [ ] T033 Create `backend/Bayrab.sln` with `backend/src/Bayrab.Api` (ASP.NET Core minimal API), `backend/tests/Bayrab.UnitTests`, `backend/tests/Bayrab.IntegrationTests` (xunit)
- [ ] T034 Add `backend/Directory.Build.props` (net10.0, nullable, TreatWarningsAsErrors) and `backend/Directory.Packages.props` (Npgsql.EntityFrameworkCore.PostgreSQL 10.x, Microsoft.EntityFrameworkCore.Design, Identity.EntityFrameworkCore, JwtBearer, Microsoft.AspNetCore.OpenApi, QuestPDF, ClosedXML, CsvHelper; tests: xunit, Shouldly, Testcontainers.PostgreSql, Microsoft.AspNetCore.Mvc.Testing, NetArchTest.Rules, UglyToad.PdfPig)
- [ ] T035 [P] Add `backend/.config/dotnet-tools.json` (`dotnet-ef`) and `docker-compose.yml` (postgres:17, volume, healthcheck)
- [ ] T036 [P] Create folders `Features/`, `Domain/`, `Infrastructure/`, `Common/` in `backend/src/Bayrab.Api/` and the `IEndpoint` interface + assembly scan registration in `backend/src/Bayrab.Api/Common/Endpoints/`
- [ ] T037 [P] Architecture tests: slices don't reference other slices' namespaces; `Domain` doesn't reference `Features`, `Infrastructure`, EF Core, or ASP.NET in `backend/tests/Bayrab.UnitTests/ArchitectureTests.cs`
- [ ] T038 [P] Extend `.github/workflows/ci.yml`: job `backend` (`dotnet test backend`), job `web` (`npm ci`, lint, Vitest, build, Lighthouse CI)

---

## Phase 2: Foundational (Blocking Prerequisites)

### Domain kernel (tests first; reuse `test-vectors/`)

- [ ] T039 [P] Tests `PartialDate` (precision bounds, approximate, Hijri UmAlQura + tabular fallback) in `backend/tests/Bayrab.UnitTests/Domain/PartialDateTests.cs`
- [ ] T040 [P] Tests `ArabicNormalizer` and `PublicId` on `test-vectors/normalize.json` in `backend/tests/Bayrab.UnitTests/Domain/TextAndIdTests.cs`
- [ ] T041 [P] Implement `PartialDate`, `HijriConverter`, `ArabicNormalizer`, `PublicId`, `Verification` in `backend/src/Bayrab.Api/Domain/{Dates,Text,People,Evidence}/`
- [ ] T042 [P] Implement `RuleCode` (23 codes), `RuleResult`, `RuleOutcome`, `RuleException`, `RuleMessages` in `backend/src/Bayrab.Api/Domain/Rules/`
- [ ] T043 Implement entities (FamilyTree, TreeMembership, Person, Marriage, ParentageClaim, KinshipLink, Source, SourceFile, Citation, StoredFile, Branch, ExportJob, ImportBatch, RuleAcknowledgement, ChangeRecord) in `backend/src/Bayrab.Api/Domain/Entities/`

### Persistence

- [ ] T044 Implement `AppDbContext` (Identity `AppUser`, soft-delete filters) and EF configurations (snake_case, PartialDate groups, composite keys/FKs, xmin, enums, jsonb) in `backend/src/Bayrab.Api/Infrastructure/Persistence/`
- [ ] T045 Create migration `Init`, hand-edited per data-model.md (extensions, generated columns, placeholder and preferred-claim partial unique indexes, citation single-target CHECK, oral-account CHECK, branch single-root CHECK, trigram index, `(tree_id, public_id)` unique) in `backend/src/Bayrab.Api/Infrastructure/Persistence/Migrations/`
- [ ] T046 Implement `AuditInterceptor` (correlation id from header or ambient import scope) and `SearchTextInterceptor` in `backend/src/Bayrab.Api/Infrastructure/Persistence/Interceptors/`
- [ ] T047 Implement `PersonIdAllocator` (row lock + counter) in `backend/src/Bayrab.Api/Infrastructure/Persistence/PersonIdAllocator.cs`
- [ ] T048 [P] Implement `IFileStore` + `LocalDiskFileStore` (25 MB, type allow-list) in `backend/src/Bayrab.Api/Infrastructure/Files/`
- [ ] T049 [P] Implement `JobQueue` + `JobWorker` BackgroundService (re-queue on start, handler dispatch, 24 h expiry) in `backend/src/Bayrab.Api/Infrastructure/Jobs/`

### Common

- [ ] T050 Implement `CurrentUser`, `ProblemMapping` (RuleException → 422/409; 23P01 → WIFE_HAS_HUSBAND; preferred index 23505 → CHILD_HAS_PARENTS; trigger → VERIFIED_REQUIRES_SOURCE; concurrency → 412; 413/415) in `backend/src/Bayrab.Api/Common/`
- [ ] T051 Implement `TreeAuthorization` (policies TreeViewer/TreeEditor/TreeOwner; anonymous **denied** until T055) in `backend/src/Bayrab.Api/Common/Auth/TreeAuthorization.cs`
- [ ] T052 Wire `Program.cs` (DbContext, interceptors, Identity, JWT, `AddValidation()`, OpenAPI, endpoint scan under `/api/v1`, compression, rate limiting on auth, file store, job worker, static files + `MapFallbackToFile` for the PWA, dev CORS off because Vite proxies) in `backend/src/Bayrab.Api/Program.cs`
- [ ] T053 Integration fixture (Testcontainers postgres:17 + migrations, `ApiFactory` with temp file root and captured email, helpers) in `backend/tests/Bayrab.IntegrationTests/Infrastructure/`

### Redaction first (C1)

- [ ] T054 [P] Tests `LivingPolicy` + `Redactor` in `backend/tests/Bayrab.UnitTests/Domain/RedactorTests.cs`
- [ ] T055 Implement `LivingPolicy` (`Domain/Privacy/`) and `Redactor` + `RequiresRedaction()` endpoint marker + startup guard, then allow anonymous TreeViewer for Public trees only in `backend/src/Bayrab.Api/Common/Privacy/`
- [ ] T056 Integration tests: guard rejects an unmarked anonymous endpoint; Private tree anonymous → 404 in `backend/tests/Bayrab.IntegrationTests/RedactionGuardTests.cs`

### Auth & trees slices

- [ ] T057 [P] Slices `Register`, `Login`, `Refresh` (HttpOnly SameSite=Strict cookie), `Logout`, `GetMe`, `ForgotPassword`, `ResetPassword` + `TokenService` + console/SMTP email senders in `backend/src/Bayrab.Api/Features/Auth/` and `backend/src/Bayrab.Api/Infrastructure/{Auth,Email}/`
- [ ] T058 [P] Slices `CreateTree` (idPrefix), `GetTree`, `ListTrees`, `UpdateTree`, `DeleteTree` in `backend/src/Bayrab.Api/Features/Trees/`
- [ ] T059 Integration tests auth + trees (refresh cookie rotation, reset via captured email, roles, foreign tree 404, prefix immutable) in `backend/tests/Bayrab.IntegrationTests/AuthAndTreesTests.cs`

### Web switches to the API

- [ ] T060 Add `npm run gen:api` (openapi-typescript → `web/src/api/schema.d.ts`), `web/src/api/client.ts` (openapi-fetch, in-memory access token, refresh on 401), Vite dev proxy `/api → http://localhost:5080`
- [ ] T061 Implement `ApiStore` (same `DataSource` interface as `LocalStore`) skeleton + login/register/forgot/reset pages + tree list/create in `web/src/data/ApiStore.ts` and `web/src/features/{auth,trees}/`; keep `LocalStore` selectable via `VITE_DATA_SOURCE=local` for demos

**Checkpoint**: sign-in, trees, roles, redaction guard; the prototype still runs in local mode.

---

## Phase 3: US1 — People and Islamic marriages (P1) 🎯 backend MVP

### Tests (first)

- [ ] T062 [P] [US1] Unit tests on `test-vectors/rules.json` (five+ wives and overlapping husbands accepted; same-gender couple refused) in `backend/tests/Bayrab.UnitTests/Domain/MarriageChecksTests.cs`
- [~] T063 [P] [US1] ~~Unit tests mahram and `FORBIDDEN_COMBINATION`~~ — dropped 2026-10-24 (R31)
- [ ] T064 [P] [US1] Unit tests person checks (gender immutable once married, `PERSON_HAS_LINKS`; implausible dates accepted) in `backend/tests/Bayrab.UnitTests/Domain/PersonRulesTests.cs`
- [ ] T065 [P] [US1] Integration tests People slices (public id allocation/no reuse, If-Match 412, delete/detach/restore, photo 200/413/415 + authorized download) in `backend/tests/Bayrab.IntegrationTests/PeopleTests.cs`
- [ ] T066 [P] [US1] Integration tests Marriages slices (5th wife accepted, same-gender 422, defaults Not verified/Low, Verified without citation accepted, delete/restore, `ValidateMarriage` saves nothing) in `backend/tests/Bayrab.IntegrationTests/MarriagesTests.cs`

### Implementation

- [ ] T067 [US1] Implement `MarriageChecks` (gender only) in `backend/src/Bayrab.Api/Domain/Marriages/`
- [~] T068 [US1] ~~`KinshipService` / `KinshipSubgraphQuery` for mahram checks~~ — dropped 2026-10-24 (R31)
- [ ] T069 [US1] Slices `CreatePerson`, `UpdatePerson`, `DeletePerson`, `RestorePerson`, `SetPersonPhoto`, `DeletePersonPhoto` in `backend/src/Bayrab.Api/Features/People/` and `DownloadFile` in `Features/Files/`
- [ ] T070 [US1] Slices `CreateMarriage`, `UpdateMarriage`, `DeleteMarriage`, `RestoreMarriage`, `ValidateMarriage` in `backend/src/Bayrab.Api/Features/Marriages/`
- [ ] T071 [US1] Regenerate `web/src/api/schema.d.ts`; implement person + marriage methods in `ApiStore`; map 422/409 to the existing `WarningDialog` in `web/src/data/ApiStore.ts`

**Checkpoint**: The prototype's person/marriage flows work against the API (`VITE_DATA_SOURCE=api`).

---

## Phase 4: US2 — Children on a specific marriage (P1)

- [ ] T072 [P] [US2] Unit tests `ParentagePolicy` (CHILD_HAS_PARENTS, DUPLICATE_PARENTAGE_CLAIM, ANCESTOR_CYCLE; implausible dates accepted) and `NasabFormatter` on `test-vectors/nasab.json` in `backend/tests/Bayrab.UnitTests/Domain/ParentageTests.cs`
- [~] T073 [P] [US2] ~~Unit tests milk kinship mahram~~ — dropped 2026-10-24 (R31)
- [ ] T074 [P] [US2] Integration tests Parentage slices (preferred create, placeholder reuse via `knownParentId` (U1), placeholder → normal, `ValidateParentage` saves nothing, delete/restore, cycle) and Kinship slices in `backend/tests/Bayrab.IntegrationTests/ParentageAndKinshipTests.cs`
- [ ] T075 [US2] Implement `ParentageChecks`, `NasabFormatter` in `backend/src/Bayrab.Api/Domain/` and `AncestryQueries` in `backend/src/Bayrab.Api/Common/Queries/`
- [ ] T076 [US2] Slices `CreateParentageClaim` (preferred + placeholder reuse), `UpdateParentageClaim`, `DeleteParentageClaim`, `RestoreParentageClaim`, `ValidateParentage`, `ListParentageClaims`, `SetPlaceholderSpouse` in `backend/src/Bayrab.Api/Features/Parentage/`
- [ ] T077 [US2] Slices `CreateKinshipLink`, `UpdateKinshipLink`, `DeleteKinshipLink` in `backend/src/Bayrab.Api/Features/Kinship/` and `GetPersonDetail` in `Features/People/`
- [ ] T078 [US2] Wire parentage, kinship and profile into `ApiStore`

---

## Phase 5: US6 — Sources, verification, competing claims (P1)

- [ ] T079 [P] [US6] Unit tests optional evidence (any status with or without citations; oral-account fields) and competing claims (alternative → Disputed, prefer swap, delete preferred leaves none, cycle via alternative) in `backend/tests/Bayrab.UnitTests/Domain/EvidenceAndClaimsTests.cs`
- [ ] T080 [P] [US6] Integration tests Sources slices (CRUD, oral validation, attach 200/413/415, detach, redaction-aware download, delete removes citations, statuses unchanged, audit) in `backend/tests/Bayrab.IntegrationTests/SourcesTests.cs`
- [ ] T081 [P] [US6] Integration tests Citations slices (single target, person facts, removing the last citation keeps the status) in `backend/tests/Bayrab.IntegrationTests/CitationsTests.cs`
- [ ] T082 [P] [US6] Integration tests `PreferParentageClaim` (descendants' nasab updates) and `ListRelationships` filters + paging in `backend/tests/Bayrab.IntegrationTests/ClaimsAndResearchTests.cs`
- [ ] T083 [US6] Slices `CreateSource`, `UpdateSource`, `DeleteSource`, `ListSources`, `GetSource`, `AttachSourceFile`, `DetachSourceFile` in `backend/src/Bayrab.Api/Features/Evidence/Sources/`
- [ ] T084 [US6] Slices `CreateCitation`, `UpdateCitation`, `DeleteCitation`, `ListRelationships` in `backend/src/Bayrab.Api/Features/Evidence/`; alternative-claim support in `CreateParentageClaim` + `PreferParentageClaim` in `Features/Parentage/`
- [ ] T085 [US6] Wire sources, citations, claims and a Research queue page (`web/src/features/evidence/ResearchQueuePage.tsx`) into `ApiStore`

---

## Phase 6: US3 — Visual builder on the API (P1)

- [ ] T086 [P] [US3] Unit tests `LineageParser` (C#, same vectors as T014) in `backend/tests/Bayrab.UnitTests/Domain/LineageParserTests.cs`
- [ ] T087 [P] [US3] Integration tests `GetTreeGraph` payload, `ParseLineage`/`CommitLineage` (Unconfirmed default, sourceId citation, placeholder reuse, warnings), `MergePersons` in `backend/tests/Bayrab.IntegrationTests/GraphLineageMergeTests.cs`
- [ ] T088 [US3] Slices `GetTreeGraph` (`Features/Viewing/`), `ParseLineage`, `CommitLineage` (`Features/Lineage/`), `MergePersons` (`Features/People/`) in `backend/src/Bayrab.Api/`
- [ ] T089 [US3] Switch the Canvas drag-over checks to `ValidateMarriage`/`ValidateParentage` (debounced, cached) with local TS rules as instant pre-check; undo/redo issues inverse API calls with `X-Correlation-Id`; merge suggestion UI in `web/src/features/editor/`
- [ ] T090 [P] [US3] Web tests: command stack against a mocked `ApiStore` in `web/tests/commandStack.test.ts`

**Checkpoint**: Quickstart steps 1–14 pass with `VITE_DATA_SOURCE=api`.

---

## Phase 7: US4 — Viewing on desktop and phone, installed PWA (P2)

- [ ] T091 [P] [US4] Integration tests `GetAncestors`, `GetDescendants`, `SearchPersons` (Arabic variants, English, public id), Member 403 on writes in `backend/tests/Bayrab.IntegrationTests/ViewingTests.cs`
- [ ] T092 [US4] Slices `GetAncestors`, `GetDescendants`, `SearchPersons` in `backend/src/Bayrab.Api/Features/Viewing/`
- [ ] T093 [US4] Offline data: TanStack Query persisted to IndexedDB per user (`@tanstack/query-async-storage-persister` + `idb-keyval`), cleared on logout together with the photo cache; photo `CacheFirst` runtime route in `web/vite.config.ts` and `web/src/app/queryPersistence.ts`
- [ ] T094 [US4] Phone landing on the API: ancestor view of `linkedPersonId` (or tree root, or picked person) with "Set as me" in `web/src/features/viewer/LineageTab.tsx`
- [ ] T095 [P] [US4] Playwright: installability (manifest + SW), offline reopen of the last tree after sign-in, logout clears IndexedDB in `web/tests/pwa.spec.ts`

---

## Phase 8: US7 — Maternal line and branches (P2)

- [ ] T096 [P] [US7] Integration tests `GetMaternalLine` and Branches slices (CRUD, single root, membership by person vs marriage, spouses, multi-branch person, `branchId` filter on graph/search/relationships) in `backend/tests/Bayrab.IntegrationTests/MaternalAndBranchesTests.cs`
- [ ] T097 [US7] Slices `GetMaternalLine` (`Features/Viewing/`) and `CreateBranch`, `UpdateBranch`, `DeleteBranch`, `ListBranches` (`Features/Branches/`) + `BranchMembershipQuery` (`Common/Queries/`) and branch filtering in graph/search/relationships
- [ ] T098 [US7] Wire maternal line and branches (BranchesPage, BranchFilter) into `ApiStore` and the UI in `web/src/features/branches/`

---

## Phase 9: US5 — Access, audit, sharing (P3)

- [ ] T099 [P] [US5] Integration tests Members/Invitations (expired/used token, role change, last Owner) in `backend/tests/Bayrab.IntegrationTests/MembershipTests.cs`
- [ ] T100 [P] [US5] Redaction coverage for every anonymous-allowed slice (graph, person, search, ancestors, maternal, descendants, sources, files, branches, claims) in `backend/tests/Bayrab.IntegrationTests/RedactionTests.cs`
- [ ] T101 [P] [US5] Integration tests `GetHistory` in `backend/tests/Bayrab.IntegrationTests/HistoryTests.cs`
- [ ] T102 [US5] Slices `CreateInvitation`, `AcceptInvitation`, `ListMembers`, `UpdateMember`, `RemoveMember` (`Features/Members/`) and `GetHistory` (`Features/History/`)
- [ ] T103 [P] [US5] Web Members, History, Tree settings (visibility + share link, iddah/pregnancy days) pages and the public viewer route `/p/:treeId` in `web/src/features/{members,history,trees,viewer}/`

---

## Phase 10: US8 — PDF charts and reports (P3)

- [ ] T104 [P] [US8] Unit tests `ChartLayout` (unions, wives order, alternative edges, RTL, no overlap) in `backend/tests/Bayrab.UnitTests/Domain/ChartLayoutTests.cs`
- [ ] T105 [P] [US8] Integration tests PDF exports (job lifecycle, all chart types, PdfPig text contains names/ids/legend/sources/Arabic, anonymous Public PDF redacted, anonymous Excel 403, expiry) and 500-person < 30 s in `backend/tests/Bayrab.IntegrationTests/PdfExportTests.cs`
- [ ] T106 [US8] Implement `ChartLayout` in `backend/src/Bayrab.Api/Domain/Charts/` and QuestPDF renderers (`AncestorChartPdf`, `DescendantChartPdf`, `BranchWallChartPdf`, `PersonReportPdf`, `StatusPdfStyles`, Noto Naskh Arabic + Noto Sans) in `backend/src/Bayrab.Api/Infrastructure/Pdf/`
- [ ] T107 [US8] Slices `CreateExport`, `GetExport`, `DownloadExport` + PDF job handler in `backend/src/Bayrab.Api/Features/Exports/`
- [ ] T108 [P] [US8] Web `ExportDialog` (chart, root/branch, generations, language, paper, polling, download; "Share as PDF" via Web Share API on phones) in `web/src/features/exports/`

---

## Phase 11: US9 — Excel/CSV/GEDCOM (P3)

- [ ] T109 [P] [US9] Integration tests Excel round trip (SC-010) and template in `backend/tests/Bayrab.IntegrationTests/ExcelRoundTripTests.cs`
- [ ] T110 [P] [US9] Integration tests import preview/commit (outcomes, id then name+father matching, candidates, rejected rows skipped, warnings ack `import`, one correlation id, stale 409, discard) in `backend/tests/Bayrab.IntegrationTests/ImportTests.cs`
- [ ] T111 [P] [US9] Integration tests CSV zip parity and GEDCOM export/import round trip (SC-006) in `backend/tests/Bayrab.IntegrationTests/CsvAndGedcomTests.cs`
- [ ] T112 [US9] Implement `SpreadsheetSchema`, ClosedXML/CsvHelper readers & writers, GEDCOM reader/writer in `backend/src/Bayrab.Api/Infrastructure/{Spreadsheets,Gedcom}/`
- [ ] T113 [US9] Slices `GetImportTemplate`, `CreateImport` (preview), `GetImport`, `CommitImport`, `DiscardImport` in `backend/src/Bayrab.Api/Features/Imports/` and Excel/Csv/Gedcom export handlers in `Features/Exports/`
- [ ] T114 [P] [US9] Web `ImportWizard` (upload, preview grid, new-or-merge, commit/discard; also accepts the Phase 0 JSON file format) and Excel/CSV/GEDCOM options in `ExportDialog` in `web/src/features/{imports,exports}/`

---

## Phase 12: Polish & Cross-Cutting

- [ ] T115 [P] Seed demo data command (reuse `web/src/data/sampleFamily.ts` exported as JSON) in `backend/src/Bayrab.Api/Infrastructure/Seed/DemoSeeder.cs`
- [ ] T116 [P] Performance tests: 50k search < 200 ms server; 5k graph < 500 ms and < 1 MB compressed in `backend/tests/Bayrab.IntegrationTests/PerformanceTests.cs`
- [ ] T117 [P] Phone performance (G4): 5,000-person tree in the installed PWA on a mid-range Android phone, time-to-interactive < 3 s; record in `web/docs/performance.md`
- [ ] T118 [P] RTL/LTR audit on desktop and phone widths (G5); accessibility: keyboard alternatives to drag-and-drop, status never colour-only, aria labels
- [ ] T119 [P] Security hardening (password policy, refresh reuse detection, security headers incl. CSP compatible with the service worker, upload sniffing, secrets)
- [ ] T120 [P] Packaging: multi-stage `backend/src/Bayrab.Api/Dockerfile` (build web → copy `web/dist` to `wwwroot`, fonts included), `api` service in `docker-compose.yml`
- [ ] T121 Run `specs/001-family-tree-core/quickstart.md` end-to-end; update `README.md`

---

## Dependencies & Execution Order

- **Phase 0** has no dependencies and ships first; **STOP for feedback** before Phase 1.
- **Phase 1 → Phase 2** (redaction before anonymous access) → US1 → US2 → US6 → US3 → US4 → US7 → US5 → US8 → US9 → Polish.
- The web UI built in Phase 0 is reused throughout; backend phases add slices and wire `ApiStore` methods
  (T071, T078, T085, T089, T093, T098, T103, T108, T114).
- Within a phase: tests first (must fail) → Domain → Common queries → slices → regenerate types → `ApiStore`/UI.

### Parallel Opportunities

- Phase 0: T002–T005; T007/T009; T012–T014; T017/T019; T024; T026/T027; T029/T030.
- Backend: test tasks marked [P] in each phase together; Auth and Trees slices (T057/T058) together.

## Implementation Strategy

1. **Phase 0 visual prototype** → deploy to GitHub Pages → collect feedback (JSON files + issues) → adjust the spec.
2. Backend MVP: Phase 1–2 + US1, with the same UI switched to `ApiStore`.
3. Then US2 → US6 → US3 → US4 → US7 → US5 → US8 → US9.
