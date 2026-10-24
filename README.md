# Bayrab Genealogy — Spec-Driven Development

A genealogy management platform for documenting, exploring, and preserving the Bayrab family tree. Built with a
Spec-Driven Development (SDD) approach using [GitHub Spec Kit](https://github.com/github/spec-kit), the project turns
family histories, oral accounts, historical documents, and verified relationships into a structured, searchable, and
expandable digital family tree.

The platform supports paternal and maternal lineages, marriages, family branches, source citations, and confidence
levels for every recorded relationship. It separates verified facts from oral accounts, disputed claims, and
unconfirmed relationships, so the data stays reliable and no lineage is assumed without support.

## Islamic family structure

- A man may be recorded with **several wives at the same time**; each marriage is its own record with dates and how it ended.
- A woman may be recorded with **several husbands in sequence** (after divorce or widowhood).
- Every child is tied to a specific marriage (father **and** mother), so half-siblings through different wives or
  husbands stay distinct. Lineage (nasab) follows the father; maternal lines are equally browsable.
- Guardianship (kafala) and milk kinship are recorded but never change lineage.
- The platform is a **historical record**: information is accepted as entered, by default without verification. It
  does not enforce or warn about religious rules or dates; it only prevents things that would break the tree (a person
  becoming their own ancestor, the same child added twice to the same parents).
- People are drawn as **diamonds**: the top connector links to parents, the sides to siblings, the bottom to children.

## Core capabilities

- **Interactive tree**: an expandable, searchable family tree with person profiles. Admins build it visually on the web
  (type, drag and drop); family members explore it on desktop or on their phones, where the same web app installs as a PWA,
  landing on their own ancestors.
- **Genealogy records**: parents, children, spouses, maternal lineage, and extended family relationships, each person
  with a unique permanent identifier (e.g. `BYR-000123`).
- **Evidence and verification**: sources (documents, books, official records, gravestones, photos, websites, oral
  accounts) with attachments and citations. Relationships can optionally carry a status (Verified, Oral account,
  Disputed, Not verified — the default) and a confidence level (High, Medium, Low). When sources disagree, competing claims are kept with one
  marked preferred.
- **Family branches**: named branches rooted at an ancestor or a specific marriage, for browsing, filtering, printing,
  and export.
- **PDF output**: ancestor charts, descendant charts, branch wall charts, and printable person reports, in Arabic or English.
- **Import and export**: Excel and CSV (with preview before commit) and GEDCOM.
- **Scale**: designed for tens of thousands of individuals across multiple family branches.
- **Bilingual**: Arabic (right-to-left) and English throughout, with Hijri and Gregorian dates.

## Objective

Preserve the Bayrab family heritage through a reliable, maintainable, and extensible digital genealogy platform that
also lays the foundation for future research, collaboration, and publication.

## Technology

| Layer | Stack |
|---|---|
| API | .NET 10, ASP.NET Core minimal APIs, vertical slice architecture, EF Core + Npgsql, ASP.NET Core Identity + JWT |
| Database | PostgreSQL 17 (Docker for local development) |
| Client | React, TypeScript, Vite, React Flow, TanStack Query, i18next; installable PWA (vite-plugin-pwa) for phones |

## Spec-Driven Development

Requirements, data models, workflows, acceptance criteria, and implementation tasks are written before code:

| Artifact | Path |
|---|---|
| Constitution (project principles) | [.specify/memory/constitution.md](.specify/memory/constitution.md) |
| Feature spec | [specs/001-family-tree-core/spec.md](specs/001-family-tree-core/spec.md) |
| Plan, research, data model, contracts | [specs/001-family-tree-core/](specs/001-family-tree-core/) |
| Tasks | [specs/001-family-tree-core/tasks.md](specs/001-family-tree-core/tasks.md) |

Workflow: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
