# Implementation Plan: Bayrab Genealogy — Core Platform

**Branch**: `001-family-tree-core` | **Date**: 2026-10-06, regenerated 2026-10-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-family-tree-core/spec.md` (elaborated 2026-10-17)

## Summary

Bayrab Genealogy is a multi-tree genealogy platform (the Bayrab tree is the first) for documenting, exploring and
preserving family heritage with **evidence**. Marriages follow Islamic rules: a man may have up to four concurrent wives;
a woman one husband at a time, remarrying in sequence. Marriages are first-class **union** records, and children attach to
unions through **parentage claims**: exactly one preferred claim drives the tree and nasab, while competing claims are
kept with their own sources. Every relationship carries a **verification status** (Verified, Oral account, Disputed,
Unconfirmed) and a **confidence** level; Verified requires a cited **source**. People get permanent IDs (`BYR-000123`);
admins define **branches**; viewers follow paternal and maternal lines. Admins build the tree on a React Flow canvas in
the web app; members view on web and the React Native (Expo) app, landing on their ancestors. The .NET 10 API also
produces **PDF** charts and reports (QuestPDF) and **Excel/CSV/GEDCOM** imports and exports with preview-then-commit.
PostgreSQL 17 stores everything; attachments live in a file store behind an interface.

## Technical Context

**Language/Version**: C# 14 / .NET 10 (SDK 10.0.301); TypeScript 5.x on Node.js 24
**Primary Dependencies**: ASP.NET Core 10 Web API, EF Core 10 + Npgsql, ASP.NET Core Identity, JWT bearer,
Microsoft.AspNetCore.OpenApi, QuestPDF (Community licence), ClosedXML, CsvHelper; React 19 + Vite, @xyflow/react 12,
elkjs, TanStack Query, i18next, react-hook-form + zod; Expo (latest stable SDK) + React Native, react-native-svg,
react-native-gesture-handler, reanimated, expo-secure-store; openapi-typescript + openapi-fetch
**Storage**: PostgreSQL 17 (Docker locally) with `btree_gist`, `pg_trgm`, `citext`; files on a local disk volume via
`IFileStore` (S3-compatible later)
**Testing**: xUnit + Shouldly + Testcontainers.PostgreSql; Vitest + Testing Library (web, shared); Jest (mobile, jest-expo)
**Target Platform**: Linux container or Windows host for API; modern evergreen browsers; iOS 16+ / Android 10+
**Project Type**: Web service + web SPA + mobile app (monorepo)
**Performance Goals**: 5k-person tree usable in <3 s on a mid-range phone; search <1 s at 50k people; marriage rule check
<300 ms p95; 500-person descendant PDF <30 s
**Constraints**: Arabic RTL + English LTR everywhere (including PDFs); living-person redaction server-side in every
output; tenant isolation per tree; no inferred relationships; status visible in every view
**Scale/Scope**: ≥50k persons per tree, multiple branches, hundreds of trees, ~35 web screens/dialogs, ~10 mobile screens

No open NEEDS CLARIFICATION items. Decisions: [research.md](research.md) R1–R27.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* (Constitution v1.2.0)

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Islamic family law is the domain model | Marriage first-class; ≤4 concurrent wives; 1 husband at a time; one *preferred* parentage per child; nasab via father; kafala separate; judgment rules = warnings; Disputed marriages excluded from hard limits | PASS | PASS — `marriage`, `parentage_claim` (partial unique preferred index), exclusion constraint with Disputed excluded, `FIFTH_WIFE_DURING_IDDAH` warning |
| II. Server-enforced, client-mirrored | Domain + DB constraints; structured codes | PASS | PASS — exclusion constraint, row locks, composite FKs, deferred `trg_verified_has_citation`; rule-codes.md |
| III. Test-first; every endpoint integration-tested | Allowed + rejected test per rule; Testcontainers per endpoint | PASS | PASS — tasks pair every rule code and every endpoint group (incl. validate, lineage, merge, claims, sources, branches, exports, imports) with tests (analysis fix C2) |
| IV. Visual, forgiving editing | Gesture = API command; invalid drops explained; undo | PASS | PASS — `/validate/*` dry-runs, soft delete + `/restore` (persons, marriages, claims), command stack |
| V. One API, two clients; outputs from the API | Shared generated types; PDFs/exports generated server-side | PASS | PASS — OpenAPI → `packages/shared`; QuestPDF/ClosedXML in Infrastructure; same Redactor |
| VI. Privacy & roles | Living redaction everywhere; audit | PASS | PASS — `Redactor` built in Phase 2 **before** any anonymous access is allowed (analysis fix C1); applies to files, PDFs, exports, search |
| VII. Simplicity & bilingual | One DB, one API, no extra infra; RTL/LTR | PASS | PASS — background jobs via hosted service + table (no Hangfire); local disk store; Arabic font embedded in PDFs |
| VIII. Evidence before assumption | Status + confidence on every relationship; Verified needs source; no inference; competing claims; legend everywhere | PASS | PASS — verification columns, `citation` with single-target CHECK, lineage commit defaults Unconfirmed, shared status style table (R22) |
| IX. Stable identity & portability | Permanent IDs; lossless GEDCOM/Excel/CSV; preview imports; scale | PASS | PASS — `public_id` counter (R20), import_batch preview/commit (R25), round-trip tests, 50k performance test |

No violations → Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-family-tree-core/
├── plan.md              # This file
├── research.md          # Decisions R1–R27
├── data-model.md        # Tables, constraints, rule codes, state transitions
├── quickstart.md        # Run + manual verification script
├── contracts/
│   ├── openapi.yaml     # REST contract /api/v1 (v1.1.0)
│   └── rule-codes.md    # Violation/warning codes + ar/en messages
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
docker-compose.yml                 # postgres:17 (+ api later); volume for /data/files
package.json                       # npm workspaces: web, mobile, packages/*
backend/
├── FamilyTree.sln
├── src/
│   ├── FamilyTree.Domain/         # Pure domain (no EF)
│   │   ├── People/                # Person, Gender, NameParts, PublicId
│   │   ├── Marriages/             # Marriage, EndReason, DivorceKind, MarriagePolicy
│   │   ├── Parentage/             # ParentageClaim, ParentagePolicy (preferred/alternative, dates, cycles)
│   │   ├── Evidence/              # VerificationStatus, Confidence, Source, Citation, EvidencePolicy
│   │   ├── Kinship/               # KinshipGraph, KinshipService (mahram, combination), KinshipLink
│   │   ├── Branches/              # Branch
│   │   ├── Dates/                 # PartialDate, HijriConverter
│   │   ├── Rules/                 # RuleCode, RuleResult, RuleOutcome, RuleMessages
│   │   ├── Text/                  # ArabicNormalizer, NasabFormatter, LineageParser
│   │   └── Charts/                # ChartLayout (tidy tree with unions) used by PDFs
│   ├── FamilyTree.Application/    # Commands/queries, DTOs, Redactor, authorization requirements
│   │   ├── Trees/ People/ Marriages/ Parentage/ Kinship/ Evidence/ Branches/ Lineage/ Search/
│   │   ├── History/ Exports/ Imports/ Privacy/
│   │   └── Abstractions/          # IAppDbContext, ICurrentUser, IClock, IEmailSender, IFileStore, IJobQueue
│   ├── FamilyTree.Infrastructure/ # EF Core, migrations, interceptors, CTE queries, Identity/JWT, email,
│   │                              # LocalDiskFileStore, JobWorker, Pdf/ (QuestPDF), Spreadsheets/ (ClosedXML, CsvHelper), Gedcom/
│   └── FamilyTree.Api/            # Minimal API endpoint groups, ProblemDetails mapping, OpenAPI, auth setup
└── tests/
    ├── FamilyTree.Domain.Tests/        # rule unit tests (allowed + rejected for every code), layout, parsers
    └── FamilyTree.Api.IntegrationTests/ # WebApplicationFactory + Testcontainers PostgreSQL, one file per endpoint group
packages/
└── shared/
    ├── src/api/                   # schema.d.ts (generated), client.ts (openapi-fetch)
    ├── src/rules/messages.ts      # rule code → ar/en
    ├── src/status/styles.ts       # verification status → line style, weight, badge, colour (R22)
    ├── src/text/                  # normalizeArabic, formatNasab (shared test vectors with C#)
    ├── src/layout/                # graph → ELK → positions (unions, claims, kinship links; web + mobile)
    └── src/i18n/                  # ar.json, en.json
web/                               # Admin editor + member viewer (React + Vite)
├── src/
│   ├── app/                       # router, auth provider, query client, i18n/RTL
│   ├── components/                # PartialDateInput, StatusBadge, StatusLegend, VerificationFields, FileUpload
│   ├── features/auth/ trees/ members/ history/
│   ├── features/people/ marriages/ parentage/   # forms, profile page
│   ├── features/evidence/         # SourcesPage, SourceForm, CitationPicker, ResearchQueue
│   ├── features/branches/         # BranchesPage, BranchFilter
│   ├── features/editor/           # Canvas, nodes (PersonNode, UnionNode), edges (StatusEdge), CommandBar,
│   │                              # SidePanel, dialogs, commands/ (undo/redo), layout.worker.ts
│   ├── features/viewer/           # read-only viewer, public viewer
│   ├── features/exports/          # ExportDialog (PDF/Excel/CSV/GEDCOM), job polling
│   └── features/imports/          # ImportWizard (upload → preview grid → commit)
└── tests/
mobile/                            # Viewer (Expo, read-only)
├── app/                           # expo-router: (auth)/login, (tabs)/lineage, tree, search, settings,
│                                  # person/[id], person/[id]/maternal, sources/[id], public/[treeId]
├── src/components/                # AncestorLadder, MaternalLadder, TreeCanvas (svg), PersonCard, MarriageGroup,
│                                  # StatusBadge, StatusLegend, ClaimList
└── tests/
```

**Structure Decision**: Monorepo with `backend/` (.NET Clean Architecture, 4 projects + 2 test projects), `web/`,
`mobile/`, and `packages/shared/`. npm workspaces; no extra services beyond PostgreSQL.

## Key design notes

1. **Marriage creation** (FR-004–FR-009, FR-044): transaction → `SELECT … FOR UPDATE` on husband and wife → load marriages
   + kinship subgraph (CTE depth 6) → `MarriagePolicy` (Disputed excluded from limits; iddah-extended overlap → warning)
   + `KinshipService` → 422 / 409 / insert + acknowledgements. Exclusion-constraint race → 422 `WIFE_HAS_HUSBAND`.
2. **Parentage** (FR-010, FR-031, FR-045): `POST …/parentage-claims` with `asPreferred`; second preferred → 422
   `CHILD_HAS_PARENTS` (UI offers "add as alternative"); alternative → all claims Disputed unless `keepStatuses`.
   Cycle check walks all claims; lineage queries follow preferred claims only. Unknown parent → reuse placeholder (R27).
3. **Evidence** (FR-028–FR-034): `EvidencePolicy` refuses Verified without citations; deferred trigger as backstop;
   deleting a source → `SOURCE_IN_USE` → downgrade on acknowledgement. Quick lineage entry never sets Verified unless a
   source is supplied.
4. **Editor drop flow** (FR-014/016): drag-over → debounced `/validate/marriage` or `/validate/parentage` → green/amber/red;
   drop red → reason tooltip; amber → `WarningDialog`; green → `MarriageDialog` or claim created. Dropping a person who
   already has preferred parents onto a union opens "Add as alternative claim?".
5. **Rendering statuses** (FR-033, SC-008): `StatusEdge` (web) and `TreeCanvas` (mobile) draw edges from the shared style
   table; alternative claims and kinship links are drawn as their own edges (fix G3); `StatusLegend` in every view and PDF.
6. **Redaction first** (C1): Phase 2 builds `Redactor` + tests; until then, the `TreeViewer` policy rejects anonymous users.
7. **Exports/imports** (FR-039–FR-043, FR-019): `export_job` + hosted worker; PDFs via `ChartLayout` + QuestPDF with Noto
   Naskh Arabic; imports parse to `import_batch` preview and commit through the same Application commands under one
   correlation id; GEDCOM import uses the same pipeline (U2).
8. **Ancestor & maternal views** (FR-023, FR-036): `/ancestors` (paternal chain + mothers + each ancestor's unions) and
   `/maternal-line`; mobile renders ladders with a "Show as tree" toggle.

## Complexity Tracking

> No constitution violations; nothing to justify.
