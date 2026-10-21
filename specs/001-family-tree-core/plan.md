# Implementation Plan: Bayrab Genealogy — Core Platform

**Branch**: `001-family-tree-core` | **Date**: 2026-10-06, regenerated 2026-10-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-family-tree-core/spec.md` (elaborated 2026-10-17, stack 2026-10-21)

## Summary

Bayrab Genealogy is a multi-tree genealogy platform (the Bayrab tree is the first) for documenting, exploring and
preserving family heritage with **evidence**. Marriages follow Islamic rules: a man may have up to four concurrent
wives; a woman one husband at a time, remarrying in sequence. Marriages are first-class **union** records, and children
attach to unions through **parentage claims**: one preferred claim drives the tree and nasab, while competing claims
are kept with their own sources. Every relationship carries a **verification status** and **confidence**; Verified
requires a cited **source**. People get permanent IDs (`BYR-000123`); admins define **branches**; viewers follow
paternal and maternal lines.

**Stack (2026-10-21)**: one **.NET 10** backend project in **vertical slice architecture**, **PostgreSQL 17**, and one
**React PWA**: the admin editor on desktop and an installable, offline-capable viewer on phones (no native app). The API
also produces PDFs (QuestPDF) and Excel/CSV/GEDCOM imports and exports.

**Delivery order**: **Phase 0 is a visual prototype**: the React PWA with fictional sample data, all logic in the
browser, deployed as a static site for fast feedback. Only after feedback do we build the backend and database and
switch the app from the in-browser store to the API.

## Technical Context

**Language/Version**: C# 14 / .NET 10 (SDK 10.0.301); TypeScript 5.x on Node.js 24
**Primary Dependencies**: ASP.NET Core 10 minimal APIs (built-in validation), EF Core 10 + Npgsql, ASP.NET Core
Identity, JWT bearer, Microsoft.AspNetCore.OpenApi, QuestPDF (Community licence), ClosedXML, CsvHelper; React 19 + Vite,
vite-plugin-pwa (Workbox), @xyflow/react 12, elkjs, TanStack Query (+ IndexedDB persister), react-router, i18next,
react-hook-form + zod, openapi-typescript + openapi-fetch
**Storage**: Phase 0: in-browser store (localStorage) + JSON file download/upload. Phase 1+: PostgreSQL 17
(`btree_gist`, `pg_trgm`, `citext`); files on a disk volume via `IFileStore`
**Testing**: xUnit + Shouldly + Testcontainers.PostgreSql + NetArchTest.Rules; Vitest + Testing Library; Playwright
(PWA offline/install smoke); Lighthouse CI (installability)
**Target Platform**: Linux container (API serving the PWA, same origin); evergreen desktop browsers; iOS 16.4+ Safari and
Android Chrome (installed PWA). Phase 0: static hosting (GitHub Pages)
**Project Type**: Web service + single React PWA
**Performance Goals**: 5k-person tree usable in <3 s on a mid-range phone; search <1 s at 50k people; marriage rule check
<300 ms p95; 500-person descendant PDF <30 s
**Constraints**: Arabic RTL + English LTR everywhere; living-person redaction server-side; tenant isolation; no
inferred relationships; status visible in every view; offline read of the last viewed tree on phones
**Scale/Scope**: ≥50k persons per tree, multiple branches, hundreds of trees

No open NEEDS CLARIFICATION items. Decisions: [research.md](research.md) R1–R30.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* (Constitution v2.0.0)

| Principle | Gate | Result |
|---|---|---|
| I. Islamic family law is the domain model | ≤4 concurrent wives; 1 husband at a time; one preferred parentage; Disputed excluded from hard limits; judgment rules = warnings | PASS — `Domain/` kernel policies; DB exclusion constraint; partial unique preferred index. Phase 0 mirrors the structural rules in TypeScript |
| II. Server-enforced, client-mirrored | Domain + DB constraints | PASS for the product. **Phase 0 exception**: rules run only in the browser (see Complexity Tracking) |
| III. Test-first; every endpoint integration-tested | | PASS — one integration test class per feature area; unit tests for every rule code; Phase 0 rule ports have Vitest tests |
| IV. Visual, forgiving editing | Gestures = commands; drops explained; undo | PASS — Phase 0 builds exactly this experience first |
| V. One API, one installable web client | Generated types; PWA installable; offline last tree | PASS — vite-plugin-pwa (R29); OpenAPI → `web/src/api` (R12) |
| VI. Privacy & roles | Redaction everywhere; audit | PASS — Redactor in Phase 2 before anonymous access. **Phase 0 holds fictional data only** |
| VII. Simplicity | One DB, one backend project, one client | PASS — single `Bayrab.Api` project, single `web/` app, no shared npm package |
| VIII. Evidence before assumption | Status + confidence on every relationship; Verified needs source | PASS — data model + `EvidencePolicy`; Phase 0 shows statuses, legend and the Verified-needs-source rule |
| IX. Stable identity & portability | Permanent IDs; lossless exports; preview imports | PASS — `public_id`; import_batch; Phase 0 JSON file uses the same ids |

## Project Structure

### Documentation (this feature)

```text
specs/001-family-tree-core/
├── plan.md  research.md (R1–R30)  data-model.md  quickstart.md  tasks.md
├── contracts/ (openapi.yaml, rule-codes.md)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
test-vectors/                      # JSON vectors shared by xUnit and Vitest (normalize, nasab, status styles, rules)
docker-compose.yml                 # postgres:17 (+ api image later)
backend/
├── Bayrab.sln
├── src/Bayrab.Api/                # ONE project, vertical slices (R28)
│   ├── Program.cs                 # DI, auth, OpenAPI, IEndpoint discovery, static PWA + fallback (R30)
│   ├── Features/                  # one file per use case: Request/Response + Handler + Endpoint
│   │   ├── Auth/                  # Register, Login, Refresh, Logout, ForgotPassword, ResetPassword, GetMe
│   │   ├── Trees/                 # CreateTree, GetTree, UpdateTree, DeleteTree, ListTrees
│   │   ├── Members/               # ListMembers, UpdateMember, RemoveMember, CreateInvitation, AcceptInvitation
│   │   ├── People/                # CreatePerson, UpdatePerson, DeletePerson, RestorePerson, GetPersonDetail,
│   │   │                          # SetPersonPhoto, DeletePersonPhoto, MergePersons
│   │   ├── Marriages/             # CreateMarriage, UpdateMarriage, DeleteMarriage, RestoreMarriage, ValidateMarriage
│   │   ├── Parentage/             # CreateParentageClaim, UpdateParentageClaim, DeleteParentageClaim,
│   │   │                          # RestoreParentageClaim, PreferParentageClaim, ValidateParentage, ListParentageClaims
│   │   ├── Kinship/               # CreateKinshipLink, UpdateKinshipLink, DeleteKinshipLink
│   │   ├── Evidence/              # Sources (Create/Update/Delete/List/Get/AttachFile/DetachFile),
│   │   │                          # Citations (Create/Update/Delete), ListRelationships
│   │   ├── Branches/              # CreateBranch, UpdateBranch, DeleteBranch, ListBranches
│   │   ├── Viewing/               # GetTreeGraph, GetAncestors, GetDescendants, GetMaternalLine, SearchPersons
│   │   ├── Lineage/               # ParseLineage, CommitLineage
│   │   ├── History/               # GetHistory
│   │   ├── Files/                 # DownloadFile
│   │   ├── Exports/               # CreateExport, GetExport, DownloadExport (+ Pdf/Excel/Csv/Gedcom handlers)
│   │   └── Imports/               # GetImportTemplate, CreateImport (preview), GetImport, CommitImport, DiscardImport
│   ├── Domain/                    # shared kernel, no EF/ASP.NET: entities, PartialDate, Verification, PublicId,
│   │                              # MarriagePolicy, ParentagePolicy, KinshipService, EvidencePolicy, LivingPolicy,
│   │                              # ChartLayout, ArabicNormalizer, NasabFormatter, LineageParser, Rules/
│   ├── Infrastructure/            # AppDbContext, Configurations, Migrations, Interceptors, Files, Jobs, Email,
│   │                              # Pdf (QuestPDF), Spreadsheets (ClosedXML, CsvHelper), Gedcom
│   └── Common/                    # IEndpoint, ProblemMapping, TreeAuthorization, Redactor, CurrentUser,
│                                  # shared queries: KinshipSubgraphQuery, AncestryQueries, BranchMembershipQuery
└── tests/
    ├── Bayrab.UnitTests/          # Domain rules, layout, parsers, architecture rules (NetArchTest)
    └── Bayrab.IntegrationTests/   # one class per feature area, HTTP + Testcontainers PostgreSQL
web/                               # the single React PWA
├── public/                        # icons (192/512 maskable), robots.txt
├── src/
│   ├── app/                       # router, providers, i18n/RTL, responsive shell (desktop / phone layouts)
│   ├── data/                      # DataSource interface; Phase 0: LocalStore (in-browser) + sampleFamily.ts;
│   │                              # Phase 4+: ApiStore (openapi-fetch) — screens depend only on the interface
│   ├── domain/                    # TS rule ports for Phase 0 + client pre-validation later (rules, nasab, normalize)
│   ├── api/                       # schema.d.ts (generated), client.ts
│   ├── shared/                    # status/styles.ts, components (StatusBadge, StatusLegend, PartialDateInput, ...)
│   ├── features/
│   │   ├── editor/                # Canvas, nodes, StatusEdge, CommandBar, SidePanel, dialogs, commands (undo/redo)
│   │   ├── layout/                # elkjs graph → positions (worker)
│   │   ├── people/ marriages/ parentage/ evidence/ branches/
│   │   ├── viewer/                # read-only canvas, AncestorLadder, MaternalLadder, profile sheet (phone + desktop)
│   │   ├── search/ settings/ auth/ trees/ members/ history/ exports/ imports/
│   │   └── pwa/                   # install prompt, iOS install sheet, update toast, offline banner
│   └── main.tsx
├── vite.config.ts                 # vite-plugin-pwa, /api proxy in dev
└── tests/                         # Vitest + Playwright
```

**Structure Decision**: One backend project with vertical slices plus a shared `Domain/` kernel; one React PWA. The
React screens talk to a `DataSource` interface so the Phase 0 in-browser store can be swapped for the API without
rewriting the UI.

## Phasing

| Phase | Outcome | Backend? |
|---|---|---|
| **0. Visual prototype** | PWA with fictional sample family: canvas editing, rules in the browser, statuses, ancestor/maternal views, phone layout, Arabic/English, JSON file save/load, GitHub Pages deploy | No |
| 1–2. Setup + foundation | Solution, schema, auth, trees, redaction, files, jobs | Yes |
| 3–11. Stories | US1, US2, US6, US3 (switch canvas to API), US4, US7, US5, US8, US9 | Yes |
| 12. Polish | Seed, performance, RTL/accessibility, security, packaging | Yes |

## Key design notes

1. **Marriage creation** (FR-004–FR-009, FR-044): `Features/Marriages/CreateMarriage.cs` → transaction →
   `SELECT … FOR UPDATE` on both spouses → `KinshipSubgraphQuery` → `MarriagePolicy` + `KinshipService` → 422 / 409 /
   insert + acknowledgements. Exclusion-constraint race → 422 `WIFE_HAS_HUSBAND`.
2. **Parentage** (FR-010, FR-031, FR-045): `CreateParentageClaim` with `asPreferred`; second preferred → 422
   `CHILD_HAS_PARENTS` (UI offers "add as alternative"). Cycle check walks all claims; lineage follows preferred claims.
3. **Evidence** (FR-028–FR-034): `EvidencePolicy` + deferred DB trigger; `DeleteSource` → `SOURCE_IN_USE` → downgrade.
4. **Editor drop flow**: drag-over → Phase 0: local rule check; later `/validate/*` → green/amber/red → dialog or reason.
5. **Status rendering**: `StatusEdge` from `web/src/shared/status/styles.ts`; `StatusPdfStyles` mirrors it (test vector).
6. **Redaction first** (C1): `Common/Redactor` in Phase 2; anonymous access denied until then.
7. **PWA** (R29): shell precache; per-user IndexedDB query cache; photo runtime cache; cleared on logout.
8. **Same origin** (R30): the API serves `web/dist`; dev uses the Vite proxy.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Phase 0 runs rules only in the browser (Principle II) and has no auth/redaction (Principle VI) | Get visual feedback on the editing and viewing experience in days, deployable as a static site | Building the backend first delays feedback on the UI, the riskiest part. Mitigation: fictional data only, a "Prototype — sample data" banner, no real family records; Phase 0 ends before any real data is entered |
