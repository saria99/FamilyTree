# Feature Specification: Bayrab Genealogy — Core Platform

**Feature Branch**: `001-family-tree-core`
**Created**: 2026-10-06
**Status**: Draft (clarified, elaborated 2026-10-17)
**Input**: User description: "Build a family tree website where a man can be married to more than one wife at the same time, and a woman can marry more than one man in sequence (at different times), following the Islamic way. The admin builds the tree visually by typing, drag-and-drop, or whatever suits creating these relationships, to show the children and grandchildren. Web and mobile apps."
**Elaborated (2026-10-17)**: "Bayrab Genealogy — a genealogy management platform for documenting, exploring, and preserving the Bayrab family tree. It turns family histories, oral accounts, historical documents, and verified relationships into a structured, searchable, expandable digital family tree; supports paternal and maternal lineages, marriages, family branches, source citations, and confidence levels for each recorded relationship; distinguishes verified facts from oral accounts, disputed claims, and unconfirmed relationships; and offers PDF family trees, printable reports, and Excel/CSV import/export, scaling to thousands of individuals and multiple family branches."

## Overview

Bayrab Genealogy preserves the Bayrab family heritage as a reliable, maintainable, extensible digital record and a
foundation for future research, collaboration, and publication. Three ideas shape every requirement below:

1. **Islamic family structure** — a man may have up to four wives at the same time; a woman one husband at a time,
   remarrying in sequence; every child is tied to a specific father and mother; lineage (nasab) follows the father,
   while maternal lines are equally browsable.
2. **Evidence before assumption** — every relationship carries a verification status (Verified, Oral account,
   Disputed, Unconfirmed), a confidence level, and the sources behind it. The system never invents a relationship
   and never hides the difference between a documented fact and a family story. Where sources disagree, competing
   claims are kept side by side, with one marked preferred.
3. **Access and output** — admins build the tree visually on the web; family members explore it on the web and the
   mobile app, landing on their own ancestors; the tree can be printed as PDF charts and reports and exchanged as
   Excel, CSV, or GEDCOM.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin records people and Islamic marriages (Priority: P1)

An admin adds family members (name in Arabic and/or English, gender, birth/death dates) and records
marriages between them. A man can have up to four wives at the same time; each marriage has its own
start date and, if it ended, an end date and reason (divorce, death of spouse, annulment). A woman can
be recorded with several husbands as long as the marriages do not overlap in time.

**Why this priority**: Correct marriage modelling is the whole reason for the product. Without it no tree
can be built.

**Independent Test**: Using the admin web forms, create a man with three concurrent wives, and a woman who
was married, divorced, and then remarried. Confirm both are saved and displayed, and that a fifth concurrent
wife or an overlapping second husband is refused with a clear reason.

**Acceptance Scenarios**:

1. **Given** a man with 3 ongoing marriages, **When** the admin adds a 4th marriage, **Then** it is saved.
2. **Given** a man with 4 ongoing marriages, **When** the admin adds a 5th marriage starting while all 4 are ongoing,
   **Then** it is refused with the message "A man may not have more than four wives at the same time."
3. **Given** a man with 4 marriages where one ended by divorce last year, **When** the admin adds a new marriage
   starting after that divorce, **Then** it is saved.
4. **Given** a woman whose marriage ended by divorce on a known date, **When** the admin adds a new marriage
   to a different man starting after that date, **Then** it is saved and both husbands appear in her history in order.
5. **Given** a woman with an ongoing marriage, **When** the admin adds a second marriage overlapping in time,
   **Then** it is refused with the message "A woman may have only one husband at a time."
6. **Given** two people who are mahram to each other according to the tree (e.g. a man and his sister, niece, or
   his wife's sister while he is still married to the wife), **When** the admin tries to marry them, **Then** a warning
   names the relationship and the marriage is saved only if the admin confirms (the tree records history, it does not rule on it).
7. **Given** an admin creates a marriage without attaching a source, **When** it is saved, **Then** its verification
   status is "Unconfirmed" with confidence "Low" unless the admin chooses otherwise (never "Verified" without a source).

---

### User Story 2 - Admin adds children to a specific marriage (Priority: P1)

The admin attaches each child to the marriage they were born from, i.e. to a specific father **and** mother.
Children of different wives of the same man are shown as separate branches, and children of a woman from
different husbands are shown under each husband.

**Why this priority**: Showing children and grandchildren correctly is the second half of the core value.
Islamic lineage follows the father, and half-siblings must be distinguishable.

**Independent Test**: Create a man with two wives, add two children to each marriage, then add a grandchild
under one of those children's marriages. The tree shows four children in two clearly separated groups and the
grandchild under the correct parent.

**Acceptance Scenarios**:

1. **Given** a man with wives A and B, **When** the admin adds a child to the marriage with A, **Then** the child
   appears under that couple, not under B.
2. **Given** a woman married first to X then to Y, **When** the admin views her, **Then** her children are grouped as
   "with X" and "with Y".
3. **Given** a child with a preferred parentage, **When** the admin attaches them to a second set of parents, **Then** it is
   refused as a second *preferred* parentage, and the admin is offered to record it as an alternative (disputed) claim instead.
4. **Given** a child whose birth date is before the parents' marriage start or more than the allowed period after the
   marriage ended, **When** saved, **Then** the admin sees a warning to confirm the dates (it is not silently accepted or blocked).
5. **Given** an orphan raised by a guardian (kafala), **When** the admin records the guardian, **Then** it is stored as
   guardianship, the child's lineage stays with the biological father, and the tree shows it as a dashed link.

---

### User Story 3 - Admin builds the tree visually (Priority: P1)

The admin works on a visual canvas: types a name to add a person, drags a person onto another person to create
a marriage, drags a person onto a marriage to add them as a child, and edits details in a side panel. The tree
lays itself out automatically. A quick-entry mode lets the admin type entries like "Ahmad ibn Ali ibn Hasan" to
create a lineage chain in one step.

**Why this priority**: The user explicitly wants visual building with typing and drag-and-drop. This is how
the P1 data actually gets entered.

**Independent Test**: Starting with an empty tree, build three generations (grandfather, two wives, five children,
two grandchildren) using only the canvas, with no forms outside it. Confirm the result is correct after reloading.

**Acceptance Scenarios**:

1. **Given** the canvas, **When** the admin types a name and presses Enter, **Then** a new person card appears.
2. **Given** a man and a woman on the canvas, **When** the admin drags one onto the other, **Then** a marriage dialog
   opens pre-filled with both, asks for the start date, and creates the marriage on confirm.
3. **Given** a marriage on the canvas, **When** the admin drags a person onto the marriage connector, **Then** the person
   becomes a child of that marriage.
4. **Given** a drop that breaks a structural rule (e.g. same-gender marriage, 5th concurrent wife, child born before their parent),
   **When** the admin releases it, **Then** nothing is changed and the reason is shown next to the drop point.
5. **Given** any change, **When** the admin presses Undo, **Then** the last change is reversed.
6. **Given** quick entry "Fatimah bint Muhammad ibn Abdullah", **When** submitted, **Then** the system creates or
   matches Fatimah, Muhammad and Abdullah and links them father-to-child (asking which existing person to use if a
   name already exists).

---

### User Story 4 - Members browse the tree on web and mobile (Priority: P2)

Family members sign in on the website or the mobile app to explore the tree: zoom and pan, tap a person to see
their details, spouses (with marriage periods), children grouped by marriage, and their full nasab chain
("X ibn Y ibn Z"). They can search by name in Arabic or English and jump to that person.

**Why this priority**: Viewing is the main use for most family members but depends on data from P1 stories.

**Independent Test**: With a pre-built tree, a member on the phone app searches for a grandchild, opens their card,
and navigates up to the great-grandfather and then across to a half-uncle from a different wife.

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** they search "محمد" or "Muhammad", **Then** matching people are listed in both scripts.
2. **Given** a person's card, **When** opened, **Then** it shows the nasab chain up to the earliest known paternal ancestor.
3. **Given** the app language is Arabic, **When** the tree is shown, **Then** text and layout are right-to-left.
4. **Given** a member who is not an admin, **When** they try to edit, **Then** editing controls are not available.

---

### User Story 5 - Access control, audit and sharing (Priority: P3)

The owner invites other admins and members, removes access, and reviews a history of all changes (who changed
what and when). Living people's personal details are hidden from anyone who is not signed in.

**Why this priority**: Needed before inviting the wider family, but not needed to build and validate the tree itself.

**Independent Test**: Invite a member by email, confirm they can view but not edit. Make a change as admin and see it
in the history. Open a shared link while signed out and confirm living people show only a name placeholder.

**Acceptance Scenarios**:

1. **Given** an owner, **When** they invite an email as Member, **Then** that person can sign up and view the tree only.
2. **Given** any edit, **When** the history is opened, **Then** it shows the user, time, and before/after values.
3. **Given** a signed-out visitor, **When** they view a shared tree, **Then** living people show as "Living person" without dates or details.

---

### User Story 6 - Sources, verification status and competing claims (Priority: P1)

For every relationship (parentage, marriage, guardianship, milk kinship) and for key facts (names, birth, death),
the admin records where the information comes from — a document, book, official record, gravestone, photo, website,
or an oral account (who told it, to whom, when) — attaches scans or recordings, and sets a verification status
(Verified, Oral account, Disputed, Unconfirmed) and confidence (High, Medium, Low). When sources disagree, for example
two accounts naming different fathers, the admin records each as a separate claim with its own sources and marks one
as preferred; the tree follows the preferred claim and shows the others as alternatives.

**Why this priority**: The project's purpose is a *reliable* record. Without status and sources, oral tradition and
documented fact become indistinguishable and unsupported lineage assumptions creep in.

**Independent Test**: Record a parentage as an oral account citing a named narrator; record a competing parentage claim
citing a document; mark the documented one preferred. The tree draws the preferred line solid and the alternative
dashed with a "Disputed" badge; the person's profile lists both claims with their sources.

**Acceptance Scenarios**:

1. **Given** a relationship with no cited source, **When** the admin sets it to "Verified", **Then** it is refused with
   "A relationship can only be Verified when at least one source is cited."
2. **Given** a child with a preferred parentage, **When** the admin adds an alternative parentage claim, **Then** both are
   stored, the preferred one still drives the tree, nasab and searches, and both are marked "Disputed".
3. **Given** two competing claims, **When** the admin makes the alternative preferred, **Then** the tree, nasab chain and
   descendants' nasab update, and the change appears in history.
4. **Given** an oral account, **When** recorded, **Then** it captures narrator (a person in the tree or a free-text name),
   date told, recorder, and optional audio/text attachment.
5. **Given** a source cited by Verified relationships, **When** the admin deletes it, **Then** a warning lists the
   affected relationships, and on confirmation those without another source drop to "Unconfirmed".
6. **Given** any viewer (web, mobile, PDF), **When** a relationship is shown, **Then** its status is visible through a
   line style and badge explained by a legend.

---

### User Story 7 - Maternal lineage and family branches (Priority: P2)

Viewers can follow a person's maternal line (mother, mother's mother, …) as easily as the paternal nasab. Admins define
named family branches (for example "Descendants of Ahmad Bayrab through his wife Aminah"), each rooted at an ancestor or
a specific marriage, so large trees can be browsed, filtered, printed, and exported branch by branch.

**Why this priority**: The Bayrab tree spans thousands of people in several branches; branches make it navigable, and
maternal lines are part of the heritage the family wants preserved.

**Independent Test**: Create two branches from the same patriarch through two different wives. Filter the tree to one
branch and confirm only that wife's descendants show; open any person's maternal line view and follow it back three generations.

**Acceptance Scenarios**:

1. **Given** a person, **When** the viewer opens "Maternal line", **Then** mothers are listed generation by generation with
   each mother's own nasab.
2. **Given** a branch rooted at a marriage, **When** selected, **Then** the tree shows only descendants of that marriage
   (plus their spouses), and the branch name appears on each member's profile.
3. **Given** a person belonging to several branches (through father and mother), **When** viewed, **Then** all branches are listed.

---

### User Story 8 - PDF family trees and printable reports (Priority: P3)

Admins and members generate PDFs: ancestor (pedigree) chart, descendant chart for a person or branch, full-branch wall
chart, and a person report (family group sheet) listing spouses, children per marriage, facts, statuses, and source
citations. PDFs are available in Arabic or English, on A4/A3 or large-format paper.

**Why this priority**: Printing and publication are explicit goals, but depend on the data and views above.

**Independent Test**: Generate a descendant chart for a 3-generation branch and a person report for the patriarch; open
both PDFs and confirm structure, status legend, and source list match the screen.

**Acceptance Scenarios**:

1. **Given** a branch, **When** the user requests a descendant chart PDF, **Then** a PDF is produced with wives and their
   children grouped per marriage, status line styles, a legend, the tree name, and generation date.
2. **Given** a public tree and a signed-out visitor, **When** a PDF is generated, **Then** living people are redacted exactly as on screen.
3. **Given** Arabic language selected, **When** a PDF is generated, **Then** text is right-to-left with Arabic names and Hijri dates where recorded.

---

### User Story 9 - Excel and CSV import/export (Priority: P3)

Admins exchange data with spreadsheets: download a template, fill in people, marriages, parentage, and sources (often
collected by relatives in Excel), upload it, review a preview listing new, updated, and conflicting rows with all rule
violations and warnings, and commit. Any tree or branch can be exported to Excel (one sheet per record type) or CSV (zip).

**Why this priority**: Bulk entry of historical lists is how existing family records will be brought in, but the visual
editor and GEDCOM already allow data entry.

**Independent Test**: Export a branch to Excel, change two names and add one child row, re-import; the preview shows exactly
two updates and one creation; after commit the tree reflects them and history attributes them to the import.

**Acceptance Scenarios**:

1. **Given** a filled template, **When** uploaded, **Then** nothing is saved until the admin reviews and commits the preview.
2. **Given** rows that reference people by their unique person ID, **When** imported, **Then** existing people are updated, not duplicated.
3. **Given** a row that would give a woman two husbands at once, **When** previewed, **Then** that row is shown as rejected
   with the rule message, and the rest can still be committed.
4. **Given** an export, **When** it is opened, **Then** each relationship row includes its verification status, confidence,
   and source IDs.

---

### Edge Cases

- A man with four wives divorces one; can a new marriage start the next day? Most scholars (Hanafi, Hanbali) hold that
  a wife in iddah still counts toward the four, certainly after a revocable divorce. The system therefore saves it with a
  `FIFTH_WIFE_DURING_IDDAH` warning while the divorced wife's iddah is running (FR-044); after the iddah it is saved
  without warning. Marrying the divorced wife's sister, aunt, or niece during her iddah gives `FORBIDDEN_COMBINATION`.
- Marriage dates unknown (common for older generations): the admin can mark a marriage with unknown dates; rule checks
  then become warnings, not blocks, because overlap cannot be proven.
- The same couple divorces and remarries: allowed as a second marriage record between the same two people, up to the
  limit where a third divorce makes remarriage impossible without an intervening marriage; the system warns in that case.
- A man marries two sisters at different times (second after the first's death or divorce and iddah): allowed.
- Duplicate people (same name, same father): the editor offers to merge.
- Deleting a person who has children or marriages: blocked until the admin confirms what happens to those links.
- Very large trees (thousands of people): the viewer collapses distant branches and expands on demand.
- Cycles: refused per FR-013, for preferred and alternative claims alike.
- A disputed marriage that would be a fifth concurrent wife or a second concurrent husband: hard limits count only
  marriages not marked "Disputed"; recording a disputed marriage that would break a limit produces a warning instead,
  so conflicting accounts can still be documented.
- Two sources give different birth years: the fact keeps one value with its status and sources; the other reading is
  recorded as a second citation with its own quotation and noted on the fact.
- A relationship entered by quick lineage entry ("A ibn B ibn C") with no source: created as "Unconfirmed", never "Verified".
- An imported spreadsheet row without a person ID: matched by normalised name + father when unambiguous, otherwise
  offered as "new or merge" in the preview.

## Requirements *(mandatory)*

### Functional Requirements

**People**

- **FR-001**: Admins MUST be able to create, edit and delete a person with: given name (ism), names in Arabic and
  English, gender (male/female), optional laqab, kunya, birth date/place, death date/place, living/deceased status,
  photo (uploaded and stored by the platform, like source attachments), and notes. Dates MAY be exact, year-only, or unknown, and MAY be given in Hijri or Gregorian.
- **FR-002**: The system MUST compute and display each person's nasab chain from the recorded paternal line.

**Marriages**

- **FR-003**: A marriage MUST link exactly one man (husband) and one woman (wife) with a start date, optional end date,
  and an end reason (divorce, death, annulment). Divorces MAY record the type (revocable / irrevocable) and count.
- **FR-004**: The system MUST refuse a marriage that would give a man more than four wives whose marriages overlap in time.
- **FR-005**: The system MUST refuse a marriage that would give a woman two husbands whose marriages overlap in time.
- **FR-006**: When a woman's new marriage starts inside her waiting period (iddah) after divorce or her husband's death,
  the system MUST warn and save only after the admin confirms.
- **FR-007**: The system MUST warn (admin confirms) about marriages between people who are mahram by blood or marriage as far as the tree
  shows (parents/ancestors, children/descendants, siblings, aunts/uncles, nieces/nephews, spouse's ancestors and
  descendants), and about a man being married at the same time to two women who are sisters, or a woman and her
  paternal or maternal aunt. Confirmed warnings MUST be stored with the record and shown as a flag to admins.
- **FR-008**: The system MUST refuse marriages between two people of the same gender.
- **FR-009**: When marriage dates are unknown or partial, rule checks that depend on them MUST become warnings the admin
  confirms, instead of blocks.
- **FR-044**: The system MUST warn (`FIFTH_WIFE_DURING_IDDAH`, admin confirms) when a man's new marriage starts while he
  already has four wives counting any wife still in iddah from a divorce by him.

**Children & lineage**

- **FR-010**: Each person MUST have at most one **preferred** biological parentage (one marriage: father + mother), which
  drives the tree, nasab, and searches. Additional **alternative** parentage claims MAY be recorded (FR-031). A child MAY
  be recorded with a known father but unknown mother (placeholder wife), or vice versa. All children of the same known
  parent whose other parent is unknown share **one** placeholder marriage, so they appear as one group, unless the
  admin splits them.
- **FR-011**: The system MUST warn when a child's birth date is before the parents' marriage start date, or later than
  the end of the marriage plus the allowed pregnancy period, and when a child is born before a parent is old enough.
- **FR-012**: Guardianship (kafala) and milk kinship (rada'a) MUST be recordable as separate relationships that never change
  lineage. Milk kinship MUST count in the mahram checks of FR-007.
- **FR-013**: The system MUST refuse any change that would make a person their own ancestor.
- **FR-045**: The system MUST refuse a parentage where the child's birth is certainly before a parent's birth
  (`CHILD_BORN_BEFORE_PARENT`); when the dates only possibly conflict it is a `PARENT_TOO_YOUNG` warning (FR-011).

**Visual editor**

- **FR-014**: Admins MUST be able to build and edit the tree on a visual canvas: add a person by typing; marry two people
  by dragging one onto the other; add a child by dragging a person onto a marriage; edit details in a side panel.
- **FR-015**: The canvas MUST lay out the tree automatically, grouping each man's wives beside him and each marriage's
  children beneath that marriage, so half-siblings are visibly separate.
- **FR-016**: Invalid edits on the canvas MUST be refused with the specific rule and people named.
- **FR-017**: Admins MUST be able to undo and redo their changes within a session.
- **FR-018**: Admins MUST be able to quick-enter a lineage chain as text ("A ibn B ibn C" / "A bint B ibn C", in Arabic or
  English) and resolve each name to an existing or new person.
- **FR-019**: Admins MUST be able to import and export the tree in GEDCOM format, with marriages and their dates kept.
  GEDCOM import follows the same preview-then-commit flow as FR-042: records that break a structural rule are rejected
  and listed, the people they mention are still imported, and warnings are acknowledged with source "import".

**Viewing, search, language**

- **FR-020**: Members MUST be able to view the tree on the website and on the mobile app (iOS and Android), with zoom,
  pan, collapse/expand branches, and a person detail view.
- **FR-021**: Users MUST be able to search people by any name in Arabic or English, ignoring diacritics (tashkeel) and hamza spelling differences.
- **FR-022**: The whole interface MUST be available in Arabic (right-to-left) and English (left-to-right).
- **FR-023**: Users MUST be able to open a person-centred view (ancestors up, descendants down) and a whole-tree view. The ancestor view ("my lineage": father, grandfathers up the nasab chain, and each ancestor's wives) is the default landing view for viewers.

**Access & audit**

- **FR-024**: The system MUST support the roles Owner, Admin (edit) and Member (view). Users sign in with email and password and
  can reset a forgotten password through an emailed single-use link.
- **FR-025**: The system MUST host many separate family trees. Any signed-up user can create a tree and becomes its Owner;
  roles are per tree, and a person record belongs to exactly one tree. Trees MUST be isolated from each other.
- **FR-026**: Each tree MUST have a visibility setting chosen by its Owner: Private (default, members only) or Public
  (anyone can view). In a public tree, living people MUST appear only as "Living person" with no dates or details to visitors.
- **FR-027**: Every change MUST be recorded in a history showing the user, time and before/after values.

**Evidence, verification and competing claims**

- **FR-028**: Every relationship (parentage claim, marriage, guardianship, milk kinship) MUST carry a verification status —
  Verified, Oral account, Disputed, Unconfirmed — and a confidence level — High, Medium, Low. New relationships default
  to Unconfirmed / Low unless set otherwise.
- **FR-029**: Admins MUST be able to manage sources: type (document, book, official record, gravestone, photo, website,
  oral account, other), title, author/narrator, date, repository/location, reference/URL, notes, and attachments
  (images, PDFs, audio). Oral accounts MUST record narrator, date told, and recorder.
- **FR-030**: Admins MUST be able to cite one or more sources on any relationship and on person facts (names, birth,
  death), with an optional page/detail and quotation per citation. A relationship MUST NOT be set to Verified without at
  least one citation.
- **FR-031**: Admins MUST be able to record competing parentage claims for one person, each with its own status,
  confidence, and citations; exactly one MUST be preferred. Switching the preferred claim MUST update the tree and nasab.
  Recording an alternative claim MUST mark all of that person's parentage claims Disputed unless the admin resolves it.
- **FR-032**: The system MUST NOT create or infer a relationship that the admin did not enter (e.g. it never assumes a
  child's mother from the father's only wife, nor a marriage from shared children).
- **FR-033**: Every view and output (web canvas, mobile, profiles, PDFs, exports) MUST show each relationship's status with a
  consistent visual language (e.g. solid = Verified, dashed = Oral account, dotted red = Disputed, grey = Unconfirmed) and a legend.
- **FR-034**: Admins MUST be able to list and filter relationships by status, confidence, and "has no source" to drive research.

**Identity, lineages and branches**

- **FR-035**: Every person MUST receive a unique, permanent, human-readable identifier within the tree (e.g. `BYR-000123`),
  never reused after deletion, shown on profiles, searches, PDFs, and exports, and usable to match records on import.
- **FR-036**: Viewers MUST be able to open a person's maternal line (mother, maternal grandmother, …) alongside the paternal nasab.
- **FR-037**: Admins MUST be able to define named family branches rooted at a person or at a specific marriage; viewers MUST
  be able to filter the tree, search, PDFs, and exports by branch.
- **FR-038**: Person profiles MUST show: identifier, names, facts with their citations, preferred and alternative parentage,
  marriages in order with children per marriage, maternal and paternal lines, branches, sources, and status badges.

**PDF and printing**

- **FR-039**: Users MUST be able to generate PDF ancestor charts, descendant charts (per person or branch), branch wall charts,
  and person reports (family group sheets with citations), in Arabic or English, at A4, A3, or custom large sizes.
- **FR-040**: PDFs MUST apply the same visibility and redaction rules as on-screen viewing and include a status legend,
  tree name, branch, and generation date.

**Spreadsheet import/export**

- **FR-041**: Admins MUST be able to download an Excel template and import Excel (.xlsx) or CSV files of people, marriages,
  parentage claims, sources, and citations.
- **FR-042**: Imports MUST show a preview (new, updated, unchanged, rejected rows with rule results) and save nothing until
  the admin commits; rejected rows MUST NOT block valid rows; a committed import MUST appear in history as one operation.
- **FR-043**: Admins MUST be able to export a tree or branch to Excel (one sheet per record type) or CSV (zip of files),
  including person IDs, statuses, confidence levels, and source references, such that re-importing the export into an
  empty tree reproduces it.

### Key Entities

- **Person**: An individual with a unique permanent identifier (e.g. BYR-000123). Names (Arabic/English, ism, laqab,
  kunya), gender, birth/death facts, living status, photo, notes. Has at most one preferred parentage claim and any
  number of alternative claims.
- **Marriage**: A union between one man and one woman over a period. Start date, end date, end reason, divorce details,
  date certainty. Has zero or more children. A man may have up to four overlapping marriages; a woman none overlapping.
- **Parentage Claim**: A statement that a person is the child of a specific marriage, with status, confidence,
  citations, and a preferred flag (exactly one preferred per person).
- **Guardianship / Milk kinship**: Non-lineage relationship between two people with type and optional dates.
- **Verification**: Status (Verified, Oral account, Disputed, Unconfirmed) and confidence (High, Medium, Low) attached to
  every relationship.
- **Source**: Where information comes from — type, title, author or narrator, date, repository, reference, attachments.
- **Citation**: The link between a source and a relationship or person fact, with page/detail and optional quotation.
- **Branch**: A named part of the tree rooted at a person or a marriage, used for browsing, filtering, printing, and export.
- **Import Batch**: An uploaded spreadsheet with its preview results and, once committed, the changes it made.
- **Family Tree**: The collection of people and relationships an owner manages, with its members and their roles.
- **User & Role**: An account and its permission (Owner, Admin, Member) on a tree.
- **Change Record**: An audit entry: who, when, what entity, before and after.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin with no training can build a 3-generation tree of 20 people with polygamous and sequential marriages in under 15 minutes.
- **SC-002**: 100% of structural violations (5th concurrent wife, overlapping husband, same-gender marriage, cycles,
  a second preferred parentage) are refused with a clear reason, and 100% of judgment cases (mahram, iddah, third divorce,
  date inconsistencies) produce a warning naming the people and rule.
- **SC-003**: For any person, a viewer can tell which mother (or which husband, for a woman) each child comes from, in one glance and without opening details.
- **SC-004**: A tree of 5,000 people opens and becomes usable on a mid-range phone in under 3 seconds, and search results appear in under 1 second.
- **SC-005**: Every screen is fully usable in Arabic RTL and English LTR, with no layout breakage.
- **SC-006**: A GEDCOM export followed by import into an empty tree gives the same people, marriages, and children.
- **SC-007**: 100% of relationships display a verification status in every view and output, and 0 relationships are
  Verified without a cited source.
- **SC-008**: A viewer can tell, without opening details, whether a line in the tree is verified, oral, disputed, or unconfirmed.
- **SC-009**: A descendant-chart PDF of a 500-person branch is ready in under 30 seconds.
- **SC-010**: An Excel export of a 5,000-person tree re-imported into an empty tree reproduces the same people, IDs,
  relationships, statuses, and citations.
- **SC-011**: The platform holds at least 50,000 individuals across multiple branches with search still under 1 second.

## Clarifications

### Session 2026-10-06

- Q: Iddah handling? → A: Warn; save after admin confirms.
- Q: One tree or many? → A: Many separate trees, each with its own Owner, Admins and Members.
- Q: Purpose? → A: The site is provided so people can see their ancestors; the ancestor view is the primary viewing experience.
- Q: Who edits where? → A: Admins edit through the web app; users view from the mobile app.
- Q: Signed-out visitors? → A: The product is a historical record, not a marriage tool; it must be flexible enough to show the
  real complexity. Structural rules stay strict; judgment rules (mahram, iddah, third divorce, dates) are confirmable
  warnings. Visibility is per tree (Private default / Public), living people always hidden from visitors.

### Session 2026-10-17

- Q: Project description? → A: Adopted the "Bayrab Genealogy" description (sources, verification status, confidence,
  maternal lineage, branches, unique IDs, PDF, Excel/CSV, scale to thousands of individuals).
- Q: When sources disagree about a relationship? → A: Competing claims, each with its own sources and status; one is
  preferred and drawn as the main line, the others as dashed alternatives.
- Q: Who sees non-Verified relationships? → A: Everyone, clearly marked with line style, badge, and legend (web, mobile, PDF).

## Assumptions

- Purpose: let family members see their ancestors (and how branches connect through multiple wives and sequential husbands). A historical genealogy record. The system records what happened and highlights possible inconsistencies; it does not issue religious rulings.

- The Bayrab family tree is the first tree on the platform; multi-tree support (FR-025) remains so other branches or
  families can be hosted later.
- Collaboration features (members suggesting edits, reviewer approval) and publication workflows are future work; this
  release provides the data foundation for them.
- Confidence is a three-level admin judgment (High/Medium/Low), separate from status; no numeric scoring.
- Source attachments are stored by the platform (scans, PDFs, audio up to a configurable size, default 25 MB each) and
  follow the same visibility rules as the people they concern.
- Admins are trusted family members; there is no approval workflow for edits in this release (history and undo are the safety net).
- Gender is binary (male/female) as required by Islamic marriage rules.
- "Allowed pregnancy period" for FR-011 uses a configurable default (e.g. 4 years, reflecting classical opinions) and only produces warnings.
- Mahram checks are limited to what the recorded data proves. Missing links mean no block.
- The triple-divorce rule (no remarriage to the same wife after a third divorce without an intervening marriage) is a warning,
  because older records are often incomplete.
- Editing is done only by admins on the web app. The mobile app is for users to view and search (no editing).
- Hijri and Gregorian dates are both stored and converted for display. Exact day conversion may vary by one day, which is acceptable.
- Email delivery is available for invitations and password resets.
