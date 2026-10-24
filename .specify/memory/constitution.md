<!--
Sync Impact Report
- Version change: 2.0.0 → 3.0.0 (MAJOR: religious-rule governance removed; the platform records history as given)
- Modified principles: I (Islamic Family Structure — model only, no rule enforcement or warnings),
  II (renamed: Data Integrity on the Server), III (tests for integrity checks and endpoints),
  VIII (renamed: Optional Evidence — statuses and sources are optional labels, no verification requirement)
- Added sections: none
- Removed sections: none
- Templates requiring updates:
  ✅ .specify/templates/* (no structural change)
  ✅ specs/001-family-tree-core/spec.md, research.md, data-model.md, contracts/rule-codes.md, plan.md, tasks.md
    updated on 2026-10-24
- Follow-up TODOs: none
-->

# Bayrab Genealogy Constitution

## Mission

Preserve the Bayrab family heritage through a reliable, maintainable, and extensible digital genealogy platform that
turns family histories, oral accounts, historical documents, and verified relationships into a structured, searchable
family tree, and that serves as a foundation for future research, collaboration, and publication.

## Core Principles

### I. Islamic Family Structure (NON-NEGOTIABLE)

The data model MUST be able to represent Islamic family history, not only a Western "two parents,
one spouse" genealogy:

- A man MAY have several wives at the same time; a woman MAY have several husbands one after
  another. Each marriage is a first-class record (husband, wife, start date, end date, how it
  ended: divorce / khul' / annulment (faskh) / death / ongoing). Marriages are never inferred
  from children.
- Every person with recorded parents has exactly one **preferred** parentage: one marriage (a
  specific father **and** mother), so half-siblings through different wives or different husbands
  are always distinguishable. Alternative parentage claims MAY exist but never replace the
  preferred line silently.
- Lineage (nasab) follows the father; maternal lines are equally browsable. Guardianship (kafala)
  and milk kinship are separate relationships and never change lineage.
- The platform is a **historical record, not a religious authority**. It MUST NOT enforce, block,
  or warn about religious rules (number of wives, one husband at a time, mahram, iddah, third
  divorce) or about implausible dates. Information is accepted as given.

Rationale: the family wants to preserve history as it was told and recorded, without the system
judging it.

### II. Data Integrity on the Server

Only checks that keep the tree consistent and drawable are enforced: a marriage is a husband (man)
and a wife (woman); one preferred parentage per person; no duplicate parentage claim; nobody becomes
their own ancestor; records are never linked across trees. These MUST be enforced in the .NET
`Domain/` kernel and by PostgreSQL constraints where expressible. The React client MAY pre-check
them for fast feedback. Errors MUST be returned as structured problem details with a
machine-readable code so every screen shows the same message (Arabic and English).

### III. Test-First for Integrity Checks and Endpoints

Every integrity check in Principle II MUST have automated tests for the accepted and the refused
case, and tests MUST also show that religious-rule situations (e.g. a fifth concurrent wife,
overlapping husbands) are accepted. API endpoints MUST have integration tests against a real
PostgreSQL (Testcontainers).

### IV. Visual, Forgiving Tree Editing

Admins build the tree visually: add people by typing, connect them by drag-and-drop, and edit
inline. Every visual action maps to an explicit API command (CreatePerson, CreateMarriage,
AddChildToMarriage, EndMarriage, ...). Invalid drops MUST be rejected with a clear reason, not
silently ignored. Destructive operations MUST be undoable or require confirmation.

### V. One API, One Installable Web Client

A single versioned REST API (`/api/v1`) serves one React application. On desktop it is the admin
editor; on phones it is installed as a **Progressive Web App** for members to browse, search, and view
the tree. The PWA MUST be installable (manifest, icons, service worker), MUST be usable at phone widths
with touch, and MUST reopen the last viewed tree read-only when offline. TypeScript API types MUST be
generated from the OpenAPI contract, not hand-written. Generated outputs (PDF charts
and reports, Excel/CSV/GEDCOM exports) MUST be produced by the API from the same rules and the same
redaction as on-screen views.

### VI. Privacy and Role-Based Access

Family data is personal. Many trees are hosted; roles are per tree: **Owner**, **Admin**
(edit), **Member** (view). A tree is Private (default) or Public; visitors to a Public tree see
living people only as "Living person". Living people's personal
details MUST NOT be visible to unauthenticated users, including through source attachments, PDFs,
or exports. All edits and imports MUST be audit-logged (who, what, when).

### VII. Simplicity and Bilingual (RTL) Support

Start with the simplest design that satisfies the rules (YAGNI): one database, one backend
project, one client application, no microservices. The UI MUST support Arabic (RTL) and English (LTR) from the first release,
including Arabic names (ism, nasab chain "ibn/bint", laqab, kunya).

### VIII. Optional Evidence

- Relationships MAY carry a status — **Verified**, **Oral account**, **Disputed**, **Not verified**
  (default) — and a confidence level (High / Medium / Low). These are optional labels: nothing is
  required to set any of them, and no verification step exists.
- Sources and citations MAY be attached to relationships and facts as references.
- The system MUST NOT create or infer relationships that were not entered (it records history, it
  does not reconstruct it), and MUST NOT change a status automatically.
- When accounts disagree, each claim MAY be stored with its own sources; exactly one claim per
  person is preferred.
- Where statuses are used, views and outputs show them with one consistent visual language and a
  legend; the default status draws as a plain line.

Rationale: the family wants history recorded by default without verification, while keeping the
option to note where information came from.

### IX. Stable Identity and Data Portability

- Every person MUST have a unique, permanent, human-readable identifier (e.g. `BYR-000123`) that is
  never reused, appears in all outputs, and is used to match records on import.
- Data MUST be exportable and re-importable without loss (GEDCOM, Excel, CSV), including statuses,
  confidence levels, sources, and citations. Imports MUST preview before committing and MUST pass the
  same rules as manual edits.
- The design MUST scale to tens of thousands of individuals and multiple family branches without
  changing the data model.

## Technology & Architecture Constraints

- Backend: .NET (C#, latest LTS/current SDK installed), ASP.NET Core minimal APIs, EF Core with
  Npgsql, **vertical slice architecture**: one project organised by feature
  (`Features/<Area>/<UseCase>`). Each slice owns its endpoint, request/response, validation, and
  handler. Cross-cutting Islamic and evidence rules live in a shared `Domain/` kernel that slices
  call; slices MUST NOT call each other's handlers. Architecture tests enforce this.
- Database: PostgreSQL. Schema changes only via EF Core migrations.
- Client: React + TypeScript (Vite) as an installable PWA (web app manifest + service worker).
  Tree canvas via a graph library that supports custom nodes, touch, and drag-and-drop (e.g. React
  Flow) with automatic layout. No native mobile app.
- Auth: JWT bearer tokens issued by the API (ASP.NET Core Identity).
- Source control: Git, hosted on GitHub; Spec-Driven Development with GitHub Spec Kit.

## Development Workflow & Quality Gates

- Every feature follows: specify → clarify → plan → tasks → implement.
- A feature is done only when: domain tests pass, API integration tests pass, the web
  editor reflects the rule, and the Constitution Check in the plan has no unjustified violations.
- Pull requests MUST describe which principles they touch and how they were verified.

## Governance

This constitution supersedes other practices. Amendments require an edit to this file with a
Sync Impact Report, a semantic version bump (MAJOR: principle removed/redefined; MINOR:
principle added or materially expanded; PATCH: wording), and updates to affected templates.
Every plan MUST pass the Constitution Check before implementation; complexity beyond these
rules MUST be justified in the plan's Complexity Tracking table.

**Version**: 3.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-24
