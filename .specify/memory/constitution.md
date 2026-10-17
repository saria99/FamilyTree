<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: new principles VIII and IX; Principle I child rule expanded to
  "one preferred parentage + alternative claims"; project renamed Bayrab Genealogy)
- Modified principles: I (child ↔ marriage rule now applies to the preferred parentage; disputed marriages
  excluded from hard concurrency limits), V (PDF/spreadsheet outputs share the same rules), VI (attachments follow redaction)
- Added principles: VIII. Evidence Before Assumption; IX. Stable Identity and Data Portability
- Added sections: Mission
- Removed sections: none
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check reads gates from this file; no edit needed)
  ✅ .specify/templates/spec-template.md (no mandatory section changes)
  ✅ .specify/templates/tasks-template.md (no structural change)
  ⚠ specs/001-family-tree-core/plan.md, research.md, data-model.md, contracts/, tasks.md — must be regenerated
    (/speckit-plan, /speckit-tasks) to add evidence, branches, IDs, PDF, Excel/CSV
- Follow-up TODOs: none
-->

# Bayrab Genealogy Constitution

## Mission

Preserve the Bayrab family heritage through a reliable, maintainable, and extensible digital genealogy platform that
turns family histories, oral accounts, historical documents, and verified relationships into a structured, searchable
family tree, and that serves as a foundation for future research, collaboration, and publication.

## Core Principles

### I. Islamic Family Law Is the Domain Model (NON-NEGOTIABLE)

The data model and validation rules MUST reflect Islamic marriage and lineage (nasab) rules,
not a Western "two parents, one spouse" genealogy model:

- A man MAY have up to **four** wives whose marriages overlap in time. A fifth concurrent
  marriage MUST be rejected.
- A woman MUST have at most **one** husband at any point in time. She MAY marry again
  **in sequence** after divorce or the husband's death. Overlapping marriage periods for a
  woman MUST be rejected.
- A marriage is a first-class entity (husband, wife, start date, end date, end reason:
  divorce / death / annulment (faskh) / ongoing). Marriages are never inferred from children.
- Every person with recorded parents has exactly one **preferred** parentage: one marriage (a specific
  father **and** mother), so half-siblings through different wives or different husbands are always
  distinguishable. Alternative parentage claims MAY exist (Principle VIII) but never replace the
  preferred line silently.
- Hard concurrency limits (four wives, one husband) count marriages that are not marked Disputed; a
  disputed marriage that would break them is recorded with a warning.
- Lineage (nasab) follows the father. Adoption/fostering (kafala) MUST NOT be stored as
  biological parentage; it is a separate, optional relationship type.
- The product is a **historical record**, not a marriage authority. Structural rules above are
  hard constraints. Judgment rules (mahram relationships detectable from the tree, combining
  sisters, iddah, third divorce, implausible dates) MUST produce warnings that an admin confirms;
  the confirmation is stored with the record.

Rationale: these rules are the reason the product exists, and real history must still be
recordable even when it is messy or incomplete.

### II. Rules Enforced on the Server, Mirrored on the Clients

All relationship rules from Principle I MUST be enforced in the .NET domain layer and by
PostgreSQL constraints where expressible (e.g. exclusion constraints on overlapping date
ranges). React and React Native clients MAY pre-validate for fast feedback but MUST NOT be
the only line of defense. Validation errors MUST be returned as structured problem details
with a machine-readable code so both clients can show the same message (Arabic and English).

### III. Test-First for Domain Rules

Every marriage, parentage, and mahram rule MUST have automated tests written before or with
its implementation, covering the allowed case and the rejected case (e.g. 4th wife allowed,
5th concurrent wife rejected; remarriage after divorce allowed, overlapping husband rejected).
API endpoints MUST have integration tests against a real PostgreSQL (Testcontainers).

### IV. Visual, Forgiving Tree Editing

Admins build the tree visually: add people by typing, connect them by drag-and-drop, and edit
inline. Every visual action maps to an explicit API command (CreatePerson, CreateMarriage,
AddChildToMarriage, EndMarriage, ...). Invalid drops MUST be rejected with a clear reason, not
silently ignored. Destructive operations MUST be undoable or require confirmation.

### V. One API, Two Clients

A single versioned REST API (`/api/v1`) serves the React web app and the React Native app.
Shared TypeScript types and validation messages MUST be generated from or kept in a shared
package, not hand-copied between clients. The web app is the primary admin editor; the mobile
app MUST at minimum support browsing, searching, and viewing the tree. Generated outputs (PDF charts
and reports, Excel/CSV/GEDCOM exports) MUST be produced by the API from the same rules and the same
redaction as on-screen views.

### VI. Privacy and Role-Based Access

Family data is personal. Many trees are hosted; roles are per tree: **Owner**, **Admin**
(edit), **Member** (view). A tree is Private (default) or Public; visitors to a Public tree see
living people only as "Living person". Living people's personal
details MUST NOT be visible to unauthenticated users, including through source attachments, PDFs,
or exports. All edits and imports MUST be audit-logged (who, what, when).

### VII. Simplicity and Bilingual (RTL) Support

Start with the simplest design that satisfies the rules (YAGNI): one database, one API, no
microservices. The UI MUST support Arabic (RTL) and English (LTR) from the first release,
including Arabic names (ism, nasab chain "ibn/bint", laqab, kunya).

### VIII. Evidence Before Assumption (NON-NEGOTIABLE)

- Every relationship (parentage claim, marriage, guardianship, milk kinship) MUST carry a verification
  status — **Verified**, **Oral account**, **Disputed**, **Unconfirmed** — and a confidence level
  (High / Medium / Low). The default is Unconfirmed / Low.
- A relationship MUST NOT be Verified unless at least one source is cited. Oral accounts MUST record
  the narrator and when the account was given.
- The system MUST NOT create or infer relationships the admin did not enter, and MUST NOT upgrade a
  status automatically.
- When sources disagree, each claim is stored with its own sources and status; exactly one claim per
  person is preferred.
- Every view and output MUST show status with a consistent visual language and a legend, so verified
  facts are never confused with oral accounts, disputed claims, or unconfirmed relationships.

Rationale: the platform's value is reliability; unsupported lineage assumptions are the main risk to it.

### IX. Stable Identity and Data Portability

- Every person MUST have a unique, permanent, human-readable identifier (e.g. `BYR-000123`) that is
  never reused, appears in all outputs, and is used to match records on import.
- Data MUST be exportable and re-importable without loss (GEDCOM, Excel, CSV), including statuses,
  confidence levels, sources, and citations. Imports MUST preview before committing and MUST pass the
  same rules as manual edits.
- The design MUST scale to tens of thousands of individuals and multiple family branches without
  changing the data model.

## Technology & Architecture Constraints

- Backend: .NET (C#, latest LTS/current SDK installed), ASP.NET Core Web API, EF Core with
  Npgsql, Clean Architecture layers (Domain, Application, Infrastructure, Api).
- Database: PostgreSQL. Schema changes only via EF Core migrations.
- Web: React + TypeScript (Vite). Tree canvas via a graph library that supports custom nodes
  and drag-and-drop (e.g. React Flow) with automatic layout.
- Mobile: React Native (Expo) + TypeScript.
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

**Version**: 1.2.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-17
