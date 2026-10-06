# Feature Specification: Islamic Family Tree — Core

**Feature Branch**: `001-family-tree-core`
**Created**: 2026-10-06
**Status**: Draft (clarified)
**Input**: User description: "Build a family tree website where a man can be married to more than one wife at the same time, and a woman can marry more than one man in sequence (at different times), following the Islamic way. The admin builds the tree visually by typing, drag-and-drop, or whatever suits creating these relationships, to show the children and grandchildren. Web and mobile apps."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin records people and Islamic marriages (Priority: P1)

An admin adds family members (name in Arabic and/or English, gender, birth/death dates) and records
marriages between them. A man can have up to four wives at the same time; each marriage has its own
start date and, if it ended, an end date and reason (divorce, death of spouse, annulment). A woman can
be recorded with several husbands as long as the marriages do not overlap in time.

**Why this priority**: Correct marriage modelling is the whole reason for the product. Without it no tree
can be built.

**Independent Test**: Using only the admin editor, create a man with three concurrent wives, and a woman who
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
3. **Given** a child, **When** the admin tries to attach them to a second biological set of parents, **Then** it is refused.
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
3. **Given** a marriage on the canvas, **When** the admin drags a person onto the marriage link, **Then** the person
   becomes a child of that marriage.
4. **Given** a drop that breaks a structural rule (e.g. same-gender marriage, 5th concurrent wife, child older than parent),
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

### Edge Cases

- A man's marriage to a 4th wife ends by divorce; can a new marriage start the next day? Yes for the man (subject to
  the iddah rule below for the woman he divorced, which does not restrict him except from marrying her sister/aunt/niece
  during her iddah).
- Marriage dates unknown (common for older generations): the admin can mark a marriage with unknown dates; rule checks
  then become warnings, not blocks, because overlap cannot be proven.
- The same couple divorces and remarries: allowed as a second marriage record between the same two people, up to the
  limit where a third divorce makes remarriage impossible without an intervening marriage; the system warns in that case.
- A man marries two sisters at different times (second after the first's death or divorce and iddah): allowed.
- Duplicate people (same name, same father): the editor offers to merge.
- Deleting a person who has children or marriages: blocked until the admin confirms what happens to those links.
- Very large trees (thousands of people): the viewer collapses distant branches and expands on demand.
- Cycles (a person becoming their own ancestor): always refused.

## Requirements *(mandatory)*

### Functional Requirements

**People**

- **FR-001**: Admins MUST be able to create, edit and delete a person with: given name (ism), names in Arabic and
  English, gender (male/female), optional laqab, kunya, birth date/place, death date/place, living/deceased status,
  photo, and notes. Dates MAY be exact, year-only, or unknown, and MAY be given in Hijri or Gregorian.
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

**Children & lineage**

- **FR-010**: Each person MUST have at most one biological parent marriage (father + mother). A child MAY be recorded
  with a known father but unknown mother (placeholder wife), or vice versa.
- **FR-011**: The system MUST warn when a child's birth date is before the parents' marriage start date, or later than
  the end of the marriage plus the allowed pregnancy period, and when a child is born before a parent is old enough.
- **FR-012**: Guardianship (kafala) and milk kinship (rada'a) MUST be recordable as separate relationships that never change
  lineage. Milk kinship MUST count in the mahram checks of FR-007.
- **FR-013**: The system MUST refuse any change that would make a person their own ancestor.

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

**Viewing, search, language**

- **FR-020**: Members MUST be able to view the tree on the website and on the mobile app (iOS and Android), with zoom,
  pan, collapse/expand branches, and a person detail view.
- **FR-021**: Users MUST be able to search people by any name in Arabic or English, ignoring diacritics (tashkeel) and hamza spelling differences.
- **FR-022**: The whole interface MUST be available in Arabic (right-to-left) and English (left-to-right).
- **FR-023**: Users MUST be able to open a person-centred view (ancestors up, descendants down) and a whole-tree view. The ancestor view ("my lineage": father, grandfathers up the nasab chain, and each ancestor's wives) is the default landing view for viewers.

**Access & audit**

- **FR-024**: The system MUST support the roles Owner, Admin (edit) and Member (view). Users sign in with email and password.
- **FR-025**: The system MUST host many separate family trees. Any signed-up user can create a tree and becomes its Owner;
  roles are per tree, and a person record belongs to exactly one tree. Trees MUST be isolated from each other.
- **FR-026**: Each tree MUST have a visibility setting chosen by its Owner: Private (default, members only) or Public
  (anyone can view). In a public tree, living people MUST appear only as "Living person" with no dates or details to visitors.
- **FR-027**: Every change MUST be recorded in a history showing the user, time and before/after values.

### Key Entities

- **Person**: An individual. Names (Arabic/English, ism, laqab, kunya), gender, birth/death facts, living status, photo, notes.
  Belongs to at most one parent marriage.
- **Marriage**: A union between one man and one woman over a period. Start date, end date, end reason, divorce details,
  date certainty. Has zero or more children. A man may have up to four overlapping marriages; a woman none overlapping.
- **Guardianship / Milk kinship**: Non-lineage relationship between two people with type and optional dates.
- **Family Tree**: The collection of people and relationships an owner manages, with its members and their roles.
- **User & Role**: An account and its permission (Owner, Admin, Member) on a tree.
- **Change Record**: An audit entry: who, when, what entity, before and after.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin with no training can build a 3-generation tree of 20 people with polygamous and sequential marriages in under 15 minutes.
- **SC-002**: 100% of structural violations (5th concurrent wife, overlapping husband, same-gender marriage, cycles,
  second biological parents) are refused with a clear reason, and 100% of judgment cases (mahram, iddah, third divorce,
  date inconsistencies) produce a warning naming the people and rule.
- **SC-003**: For any person, a viewer can tell which mother (or which husband, for a woman) each child comes from, in one glance and without opening details.
- **SC-004**: A tree of 5,000 people opens and becomes usable on a mid-range phone in under 3 seconds, and search results appear in under 1 second.
- **SC-005**: Every screen is fully usable in Arabic RTL and English LTR, with no layout breakage.
- **SC-006**: A GEDCOM export followed by import into an empty tree gives the same people, marriages, and children.

## Clarifications

### Session 2026-10-06

- Q: Iddah handling? → A: Warn; save after admin confirms.
- Q: One tree or many? → A: Many separate trees, each with its own Owner, Admins and Members.
- Q: Purpose? → A: The site is provided so people can see their ancestors; the ancestor view is the primary viewing experience.
- Q: Who edits where? → A: Admins edit through the web app; users view from the mobile app.
- Q: Signed-out visitors? → A: The product is a historical record, not a marriage tool; it must be flexible enough to show the
  real complexity. Structural rules stay strict; judgment rules (mahram, iddah, third divorce, dates) are confirmable
  warnings. Visibility is per tree (Private default / Public), living people always hidden from visitors.

## Assumptions

- Purpose: let family members see their ancestors (and how branches connect through multiple wives and sequential husbands). A historical genealogy record. The system records what happened and highlights possible inconsistencies; it does not issue religious rulings.

- Admins are trusted family members; there is no approval workflow for edits in this release (history and undo are the safety net).
- Gender is binary (male/female) as required by Islamic marriage rules.
- "Allowed pregnancy period" for FR-011 uses a configurable default (e.g. 4 years, reflecting classical opinions) and only produces warnings.
- Mahram checks are limited to what the recorded data proves. Missing links mean no block.
- The triple-divorce rule (no remarriage to the same wife after a third divorce without an intervening marriage) is a warning,
  because older records are often incomplete.
- Editing is done only by admins on the web app. The mobile app is for users to view and search (no editing).
- Hijri and Gregorian dates are both stored and converted for display. Exact day conversion may vary by one day, which is acceptable.
- Email delivery is available for invitations and password resets.
