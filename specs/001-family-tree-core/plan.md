# Implementation Plan: Islamic Family Tree — Core

> ⚠ **Outdated (2026-10-17)**: the spec was elaborated with the Bayrab Genealogy scope (sources & verification status, competing claims, branches, person IDs, PDF, Excel/CSV) and the constitution moved to v1.2.0. Regenerate with `/speckit-plan` then `/speckit-tasks` before implementing.

**Branch**: `001-family-tree-core` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-family-tree-core/spec.md`

## Summary

A multi-tree genealogy platform whose purpose is letting family members see their ancestors, with marriages
modelled the Islamic way: a man may have up to four concurrent wives; a woman one husband at a time, marrying again
in sequence. Marriages are first-class **union** records; every child belongs to exactly one union (father + mother),
so half-siblings through different wives or husbands stay distinct. Structural rules are hard constraints (domain +
PostgreSQL exclusion constraint); judgment rules (mahram, iddah, third divorce, implausible dates) are warnings the
admin confirms. Admins build the tree on a React Flow canvas in the **web app** (type to add, drag to marry, drag onto a
union to add a child, undo/redo, quick-entry "X ibn Y ibn Z", GEDCOM). Users view on the **React Native (Expo) app**,
landing on their ancestor chain. One .NET 10 REST API serves both; PostgreSQL 17 stores everything.

## Technical Context

**Language/Version**: C# 14 / .NET 10 (SDK 10.0.301); TypeScript 5.x on Node.js 24
**Primary Dependencies**: ASP.NET Core 10 Web API, EF Core 10 + Npgsql, ASP.NET Core Identity, JWT bearer,
Microsoft.AspNetCore.OpenApi; React 19 + Vite, @xyflow/react 12, elkjs, TanStack Query, i18next, react-hook-form + zod;
Expo (latest stable SDK) + React Native, react-native-svg, react-native-gesture-handler, reanimated, expo-secure-store;
openapi-typescript + openapi-fetch
**Storage**: PostgreSQL 17 (Docker locally) with `btree_gist`, `pg_trgm`, `citext`
**Testing**: xUnit + FluentAssertions-style asserts (Shouldly) + Testcontainers.PostgreSql; Vitest + Testing Library (web,
shared); Jest (mobile, via jest-expo)
**Target Platform**: Linux container or Windows host for API; modern evergreen browsers; iOS 16+ / Android 10+
**Project Type**: Web service + web SPA + mobile app (monorepo)
**Performance Goals**: 5k-person tree usable in <3 s on mid-range phone; search <1 s; rule check on marriage create <300 ms p95
**Constraints**: Arabic RTL + English LTR everywhere; living-person redaction server-side; tenant isolation per tree
**Scale/Scope**: up to ~50k persons per tree, hundreds of trees, ~25 web screens/dialogs, ~8 mobile screens

No open NEEDS CLARIFICATION items — see [research.md](research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* (Constitution v1.1.0)

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Islamic family law is the domain model | Marriage first-class; ≤4 concurrent wives; 1 husband at a time; child ↔ one union; nasab via father; kafala separate; judgment rules = confirmable warnings | PASS | PASS — `marriage` table + `parent_marriage_id`; rule table in data-model.md; `kinship_link` separate |
| II. Server-enforced, client-mirrored | Domain service + DB constraints; structured codes | PASS | PASS — exclusion constraint, row-lock count, composite FKs; `RuleProblem` + rule-codes.md |
| III. Test-first domain rules | Allowed + rejected test per rule; Testcontainers integration | PASS | PASS — test layout below; each rule code has paired tests |
| IV. Visual, forgiving editing | Every gesture = explicit API command; invalid drops explained; undo | PASS | PASS — `/validate/*` dry-run, soft delete + `/restore`, client command stack |
| V. One API, two clients | `/api/v1`; generated shared types | PASS | PASS — OpenAPI → `packages/shared` |
| VI. Privacy & roles | Owner/Admin/Member per tree; Private/Public; living redaction; audit | PASS | PASS — redaction in projection layer; `change_record` interceptor |
| VII. Simplicity & bilingual | One DB, one API; RTL/LTR | PASS | PASS — 4 backend projects mandated by constitution tech constraints; i18next + logical CSS |

No violations → Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-family-tree-core/
├── plan.md              # This file
├── research.md          # Phase 0 decisions R1–R16
├── data-model.md        # Tables, constraints, rule codes, state transitions
├── quickstart.md        # Run + manual verification script
├── contracts/
│   ├── openapi.yaml     # REST contract /api/v1
│   └── rule-codes.md    # Violation/warning codes + ar/en messages
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
docker-compose.yml                 # postgres:17 (+ api later)
package.json                       # npm workspaces: web, mobile, packages/*
backend/
├── FamilyTree.sln
├── src/
│   ├── FamilyTree.Domain/         # Entities, PartialDate, rule engine (pure, no EF)
│   │   ├── People/                # Person, Gender, NameParts
│   │   ├── Marriages/             # Marriage, EndReason, DivorceKind, MarriagePolicy (4 wives / 1 husband / iddah)
│   │   ├── Kinship/               # KinshipGraph, KinshipService (mahram, combination), KinshipLink
│   │   ├── Dates/                 # PartialDate, HijriConverter, DateBounds
│   │   ├── Rules/                 # RuleResult, RuleCode, RuleSeverity, RuleException
│   │   └── Text/                  # ArabicNormalizer, NasabFormatter
│   ├── FamilyTree.Application/    # Use cases (commands/queries), DTOs, authorization requirements, redaction
│   │   ├── Trees/ People/ Marriages/ Kinship/ Lineage/ Search/ History/ Gedcom/
│   │   └── Abstractions/          # IAppDbContext, ICurrentUser, IClock, IEmailSender
│   ├── FamilyTree.Infrastructure/ # EF Core DbContext, configurations, migrations, audit interceptor,
│   │                              # subgraph CTE queries, GEDCOM reader/writer, Identity, JWT, email
│   └── FamilyTree.Api/            # Minimal API endpoint groups, ProblemDetails mapping, OpenAPI, auth setup
└── tests/
    ├── FamilyTree.Domain.Tests/       # rule unit tests (allowed + rejected for every code)
    └── FamilyTree.Api.IntegrationTests/ # WebApplicationFactory + Testcontainers PostgreSQL
packages/
└── shared/
    ├── src/api/                   # schema.d.ts (generated), client.ts (openapi-fetch)
    ├── src/rules/messages.ts      # rule code → ar/en
    ├── src/text/                  # normalizeArabic, formatNasab (mirrors C#; shared test vectors)
    ├── src/layout/                # graph → ELK input → positions (used by web + mobile)
    └── src/i18n/                  # ar.json, en.json
web/                               # Admin editor (React + Vite)
├── src/
│   ├── app/                       # router, auth provider, query client, i18n/RTL
│   ├── features/auth/ trees/ members/ history/ gedcom/
│   ├── features/editor/
│   │   ├── Canvas.tsx             # React Flow, node types, drop handling
│   │   ├── nodes/PersonNode.tsx UnionNode.tsx
│   │   ├── CommandBar.tsx         # type-to-add + quick lineage entry
│   │   ├── SidePanel.tsx          # person/marriage forms
│   │   ├── MarriageDialog.tsx WarningDialog.tsx
│   │   ├── commands/              # command stack (undo/redo) with inverse ops
│   │   └── layout.worker.ts       # elkjs in a Web Worker
│   └── features/viewer/           # read-only view for Members on web
└── tests/
mobile/                            # Viewer (Expo, read-only)
├── app/                           # expo-router: (auth)/login, (tabs)/lineage, tree, search, person/[id], settings
├── src/components/                # AncestorLadder, TreeCanvas (svg), PersonCard, MarriageGroup
└── tests/
```

**Structure Decision**: Monorepo with `backend/` (.NET Clean Architecture, 4 projects + 2 test projects), `web/`
(admin editor), `mobile/` (viewer), and `packages/shared/` (generated API types + shared logic). npm workspaces keep
web, mobile, and shared in one install without adding pnpm/yarn.

## Key design notes

1. **Marriage creation flow** (FR-004–FR-009): API → `CreateMarriageHandler` opens a transaction, `SELECT ... FOR UPDATE`
   on husband and wife rows, loads their marriages + kinship subgraph (recursive CTE, depth 6), runs `MarriagePolicy` and
   `KinshipService`. Violations → 422. Warnings not in `acknowledgedWarnings` → 409. Otherwise insert marriage + one
   `rule_acknowledgement` per acknowledged warning; commit. Exclusion constraint violation (race) → mapped to 422 `WIFE_HAS_HUSBAND`.
2. **Editor drop flow** (FR-014/016): on drag-over a target, the canvas calls `/validate/marriage` or
   `/validate/parent-marriage` (debounced, cached per pair) and colours the target green/amber/red; on drop, red shows the
   reason, amber opens `WarningDialog`, green opens `MarriageDialog` (dates) or links immediately (child).
3. **Undo/redo** (FR-017): each editor action is a `Command { do(), undo() }` backed by API calls (create ↔ delete,
   delete ↔ restore, update ↔ update-with-previous-values). Stack is per session; server history is the durable record.
4. **Layout** (FR-015): union nodes are placed in the same ELK layer as spouses with ports; wives ordered by
   `sequenceForHusband`; children of a union laid out under that union. For a woman with sequential husbands, unions are
   ordered by start date left→right (right→left in RTL).
5. **Ancestor view** (FR-023, mobile landing): `/persons/{id}/ancestors` returns the nasab chain plus mothers and each
   ancestor's other unions (collapsed); mobile renders it as a vertical ladder — fast and readable on small screens — with
   a "Show as tree" toggle using the shared layout.

## Complexity Tracking

> No constitution violations; nothing to justify.
