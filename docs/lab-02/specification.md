# Lab 2 Sprint Engineering Specification

TokTickIT - CPE 334 Individual Sprint 2.
Owner: Tammathorn Kananurak (67070503489).

Sources: `docs/lab-02/decisions.md` (C-01..C-41, settled), the Lab 2 labsheet, and
`CLAUDE.md`. Trace columns cite `LS x.y` for a labsheet clause and `C-nn` for a decision.
The full endpoint contract lives in `api-spec.md`; the full visual contract lives in
`ui-spec.md`. Where this document and either of those disagree, the disagreement is a
defect to report, not to resolve locally.

---

## 1. Sprint Goal

A Requester can select a Development Requester identity, raise an IT support ticket with
supporting attachments, receive a backend-generated Ticket Number, and then find, open
and manage that ticket among their own - searching, filtering, sorting and paging through
a list that never shows another Requester's work. Attachments can be added, previewed,
downloaded and soft-removed with a recorded reason. The whole surface is responsive across
desktop, tablet and mobile and carries a single Zen Green visual system that later sprints
reuse.

---

## 2. Stakeholder Request Interpretation

The IT department wants to start receiving real support requests, so the Requester-facing
half of the product must work end to end before any staff-facing tooling exists.

Read narrowly, the request is for four screens and one lifecycle. A Requester describes a
problem, classifies it, attaches evidence and submits. The backend owns the identity of
that ticket - its number, its date, its initial status - because those must be trustworthy
and unique. After submission the Requester needs to find their ticket again among many,
which makes search, filtering, sorting and pagination part of the minimum rather than
polish. They must never see anyone else's ticket, which makes ownership a backend concern
enforced on every request rather than a UI filter.

Login does not exist yet. The stakeholder accepts a temporary Development Requester
selector standing in for it, on the explicit understanding that it is a testing mechanism
and proves nothing. Every ownership rule written this sprint is therefore enforced against
a client-supplied identifier, and Lab 3 replaces that identifier with an authenticated one
without changing the ownership rules themselves.

The second half of the request is consistency: a Zen Green theme and a set of reusable
form, list, badge, validation, loading, empty and error conventions that later screens
inherit instead of reinventing.

---

## 3. Scope

### Included

- Development Requester Selection, persistence, display and switching, with its loading,
  empty and API-failure states
- Create Ticket, with client and server validation and a backend-generated Ticket Number
- Attachment upload, preview, download and soft removal across creation and Ticket Detail
- My Tickets: owned list with search, filtering, sorting, pagination and its state set
- Requester Ticket Detail, read-only, with the attachment section
- Backend ownership enforcement on every Ticket and Attachment request
- Loading, empty, no-results and safe failure states on every screen that fetches
- Responsive behavior at desktop, tablet and mobile, and keyboard accessibility
- The Zen Green component and state conventions later sprints reuse

### Excluded

Per `LS 4.2` and `CLAUDE.md`, and not to be added even partially:

- Authentication and authorization: login, logout, passwords, password hashing, sessions,
  tokens, authenticated identities, real role-based authorization
- IT Staff functions: staff dashboard or queue, claiming or reassigning tickets, changing
  IT Priority, any other ticket-owner function
- Public Comments, Internal Notes, Actions Taken
- Any Current Status change beyond the initial `NEW` - no resolution confirmation,
  resolving, closing, reopening or cancelling
- Administrator management of users, Requesters, roles or reference data

Identified and deliberately deferred: Ticket **edit mode** (C-06). `LS 8.6` asks that the
screen modes be identified; `LS 8.5` requires Ticket Detail header fields to be read-only
and `LS 4.2` removes status changes, so no field remains that a Requester may legitimately
edit this sprint.

---

## 4. Functional Requirements

| ID | Requirement | Trace |
|---|---|---|
| FR-01 | The Selection screen shall list Development Requesters loaded from PostgreSQL, showing active Requesters only. | LS 8.1, LS 5.3 |
| FR-02 | The Selection screen shall render a loading state while the active-Requester request is in flight. | LS 8.1 |
| FR-03 | The Selection screen shall render an empty state when no active Requester exists. | LS 8.1 |
| FR-04 | The Selection screen shall render a safe failure state, with a retry action, when the active-Requester request fails. | LS 8.1, LS 14 Part 6 |
| FR-05 | The Selection screen shall display the explanation that the selector exists for Lab 2 testing only and is not a login screen. | LS 8.1, LS 4.3 BR-03 |
| FR-06 | The system shall persist the selected Requester and restore it on reload. | LS 8.1, C-32 |
| FR-07 | The application shell shall display the selected Requester's name. | LS 8.1 |
| FR-08 | The application shell shall offer a Change Requester action that returns to the Selection screen. | LS 8.1 |
| FR-09 | The system shall reload all Requester-scoped data whenever the selection changes. | LS 8.1 |
| FR-10 | The system shall route any attempt to reach a Requester-scoped screen without a valid selection to the Selection screen. | LS 8.11 AC-02, C-32 |
| FR-11 | The system shall load active Categories and active Related Systems from the API to populate the Create Ticket controls. | LS 6, C-05 |
| FR-12 | The Create Ticket screen shall capture Category, Related System, Ticket Summary, Requested Priority and Description. | LS 4.4 |
| FR-13 | The Create Ticket screen shall display the selected Development Requester as a read-only value. | LS 4.4 |
| FR-14 | The Create Ticket screen shall display Ticket Date as a read-only system-generated value. | LS 4.4, C-34 |
| FR-15 | The Create Ticket screen shall display the Ticket Number only after successful creation. | LS 4.4 |
| FR-16 | The client shall validate all required fields before submission and render field-level messages beside the offending control. | LS 4.4, LS 8.3 |
| FR-17 | The backend shall validate the request, persist one Ticket, generate its Ticket Number and set Current Status to `NEW`. | LS 4.3 BR-01, LS 4.3 BR-02 |
| FR-18 | The submit control shall show a busy state and be disabled while a creation request is in flight. | LS 8.3, C-26 |
| FR-19 | On success the system shall display the generated Ticket Number and a clear next action. | LS 8.3 |
| FR-20 | On creation failure the system shall show a safe error and retain every value the Requester entered. | LS 14 Part 6, LS 6.3 |
| FR-21 | The Create Ticket screen shall accept permitted attachments, uploaded after the Ticket has been created. | LS 4.5, C-15 |
| FR-22 | Ticket Detail shall allow the owning Requester to add a permitted attachment to an existing Ticket. | LS 1, LS 4.5 |
| FR-23 | The system shall reject a file whose type or size is not permitted and report the reason per file. | LS 4.5, C-14 |
| FR-24 | The system shall refuse an upload that would exceed five active attachments on a Ticket. | LS 4.5, C-18 |
| FR-25 | The owning Requester shall be able to download an active attachment. | LS 6 |
| FR-26 | The owning Requester shall be able to preview an active attachment inline, per BR-49. | LS 4.5 |
| FR-27 | The owning Requester shall be able to soft-remove an active attachment, supplying a reason and passing the confirmation step defined in BR-48. | LS 4.5, C-19 |
| FR-28 | A removed attachment shall remain visible as metadata while its download and preview are blocked. | LS 4.5 |
| FR-29 | When attachment upload fails after the Ticket was created, the system shall retain the Ticket and list the failed files as retryable. | LS 4.5, C-15 |
| FR-30 | My Tickets shall list only Tickets owned by the selected Requester. | LS 4.3, LS 6 |
| FR-31 | My Tickets shall page through results and expose the pagination metadata the API returns. | LS 6.1, C-27 |
| FR-32 | My Tickets shall search across Ticket Number and Ticket Summary. | LS 6.1, C-30 |
| FR-33 | My Tickets shall filter by Category, Related System and Current Status. | LS 6.1, C-27 |
| FR-34 | My Tickets shall sort on the four permitted sort fields enumerated in BR-25, defaulting to newest first. | LS 6.1, BR-25, C-29 |
| FR-35 | My Tickets shall offer a Clear filters action whenever a search or filter is active. | LS 17, C-28 |
| FR-36 | Every screen that fetches shall render a loading state while its requests are in flight. | LS 8.1, LS 8.4 |
| FR-37 | My Tickets shall render an empty state when the Requester owns no Tickets and no filter is active. | LS 8.4, C-28 |
| FR-38 | My Tickets shall render a distinct no-results state when a search or filter excludes every Ticket. | LS 8.4, C-28 |
| FR-39 | Every screen that fetches shall render a safe failure state when its request fails. | LS 6.3, LS 8.6 |
| FR-40 | My Tickets shall open the Requester Ticket Detail for a listed Ticket. | LS 8.4 |
| FR-41 | Ticket Detail shall present the current Ticket information as read-only. | LS 8.5 |
| FR-42 | Ticket Detail shall present the attachment section with active and removed attachments distinguished. | LS 8.5, LS 17 |
| FR-43 | The system shall reject any request for a Ticket or Attachment that the selected Requester does not own. | LS 8.11 AC-03, C-13 |
| FR-44 | The backend shall enforce ownership on every Ticket and Attachment request, independently of what the client sends. | LS 6.3, LS 4.2 |
| FR-45 | Every screen shall meet the desktop, tablet and mobile layout rules without horizontal page scrolling. | LS 8.7 |
| FR-46 | Every interactive control shall carry an accessible name. | LS 8.3, LS 17 |
| FR-47 | Every interactive control shall show a visible keyboard focus indicator. | LS 8.3, LS 17 |
| FR-48 | No control, badge or message shall convey its state by color alone. | LS 7, LS 17 |
| FR-49 | Every displayed timestamp shall use the single format fixed by BR-10. | C-39, LS 8.8 |

**49 functional requirements.**

### 4.1 Create Ticket field contract

`LS 4.4` requires this document to state which fields are required, which are editable,
the validation limits and the allowed values. The validation rules themselves are BR-30 to
BR-34; this table is the per-field view of them.

| Field | Required | Editable | Limits | Allowed values |
|---|---|---|---|---|
| Ticket Number | n/a | No - system generated | `TKT-YYYY-NNNNNN` | Backend only; not rendered until creation succeeds (BR-01, BR-04, FR-15) |
| Ticket Date | n/a | No - system generated | Displayed `DD MMM YYYY HH:mm` Asia/Bangkok | Backend `createdAt` only (BR-05, BR-10) |
| Requester | n/a | No - taken from the selection | - | The selected Development Requester, fixed at creation (BR-06) |
| Category | Yes | Yes - single select | Exactly one value | Any active `Category.id` (BR-33, BR-34, BR-56) |
| Related System | Yes | Yes - single select | Exactly one value | Any active `RelatedSystem.id` (BR-33, BR-34, BR-56) |
| Ticket Summary | Yes | Yes - single-line text | 5-120 characters after trim | Free text (BR-30, BR-31) |
| Requested Priority | Yes | Yes - single select, defaults `MEDIUM` | Exactly one value | `LOW`, `MEDIUM`, `HIGH` (BR-08, BR-33, BR-34) |
| Description | Yes | Yes - multiline, taller than one row | 20-5000 characters after trim | Free text (BR-30, BR-32) |
| Attachments | No | Yes - multiple file selection | 5 MB per file; five active per Ticket | JPG, JPEG, PNG, WEBP, PDF (BR-42, BR-43, BR-44) |
| IT Priority | n/a | No - not rendered in create mode | - | Null throughout Lab 2 (BR-07) |
| Current Status | n/a | No - system generated | - | `NEW` at creation (BR-02, BR-09) |

---

## 5. Business Rules

Every rule names the area it serves, so coverage is checkable by grouping the Area column.
All eleven `LS 4.3` areas carry rules. One further area - **Reference data** - carries the
rules `LS 6` requires but `LS 4.3` does not name.

BR-11 serves two areas. It is the selector rule for *Requester selection and switching*,
and it is also the entire selector requirement of the *Inactive Requesters* area, so that
area cross-references it rather than restating it as a second rule.

| ID | Area | Rule | Trace |
|---|---|---|---|
| BR-01 | Ticket defaults and system-generated values | The official Ticket Number is generated by the backend and must be unique. | LS 4.3 BR-01 |
| BR-02 | Ticket defaults and system-generated values | A new Ticket begins with Current Status `NEW`. | LS 4.3 BR-02 |
| BR-03 | Requester selection and switching | Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication. | LS 4.3 BR-03 |
| BR-04 | Ticket defaults and system-generated values | The Ticket Number has the format `TKT-YYYY-NNNNNN`, where the six digits are the Ticket's zero-padded autoincrement id and the year comes from its `createdAt`. | C-11 |
| BR-05 | Ticket defaults and system-generated values | Ticket Date is the system-generated `createdAt`. It is never entered by a Requester and is always read-only. | C-34, LS 4.4 |
| BR-06 | Ticket defaults and system-generated values | A Ticket's Requester is fixed at creation to the Requester selected at that moment and never changes thereafter. | LS 14 Part 6, LS 5.1 |
| BR-07 | Ticket defaults and system-generated values | IT Priority is null at creation and is not settable anywhere in Lab 2. | C-07, LS 4.2 |
| BR-08 | Ticket defaults and system-generated values | Requested Priority is one of `LOW`, `MEDIUM`, `HIGH`, and the Create Ticket form defaults it to `MEDIUM`. | C-23 |
| BR-09 | Ticket defaults and system-generated values | Current Status may hold `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` or `CANCELLED`, but only `NEW` is reachable in Lab 2. | C-21, LS 4.2 |
| BR-10 | Ticket defaults and system-generated values | All timestamps are stored in UTC and displayed in the Asia/Bangkok timezone using the single fixed format `DD MMM YYYY HH:mm`. No other display format is used anywhere. | C-39 |
| BR-11 | Requester selection and switching; Inactive Requesters | Only active Requesters are offered in the selector; an inactive Requester never appears in it. | LS 5.3, C-33 |
| BR-12 | Requester selection and switching | The selection is held in React context and persisted in `localStorage`. The mechanism is named in the rule because `LS 8.1` asks directly how the selection is stored, so the mechanism is the answer to a question the labsheet poses rather than an implementation detail imported into a rule. | C-32, LS 8.1 |
| BR-13 | Requester selection and switching | On application boot the stored selection is re-validated against the active-Requester list; if it is missing or no longer active it is cleared and the Selection screen is shown carrying an explanatory message saying why the previous selection is gone. | C-32 |
| BR-14 | Requester selection and switching | Changing the Requester discards all Requester-scoped data in memory and refetches it. | LS 8.1 |
| BR-15 | Requester selection and switching | Without a valid selection, no Requester-scoped screen may render; the Selection screen is shown instead. | LS 8.11 AC-02 |
| BR-16 | Requester selection and switching | While the active-Requester request is in flight the Selection screen shows a loading state, and the dropdown and Continue control are disabled. | LS 8.1 |
| BR-17 | Requester selection and switching | When the active-Requester request succeeds but returns no rows, the Selection screen shows an empty state explaining that no active Development Requester exists; no dropdown is offered and Continue stays disabled. | LS 8.1 |
| BR-18 | Requester selection and switching | When the active-Requester request fails, the Selection screen shows a safe failure state carrying a retry action and no internal detail per BR-38, and no selection is stored. | LS 8.1, LS 14 Part 6 |
| BR-19 | Ticket ownership | A Ticket belongs to exactly one Requester, and an Attachment belongs to exactly one Ticket. | LS 5.1 |
| BR-20 | Ticket ownership | Ownership is enforced in the backend on every Ticket and Attachment request; the client is never trusted to filter. | LS 6.3, LS 4.2 |
| BR-21 | Ticket ownership | A request for a Ticket or Attachment that exists but belongs to another Requester is refused with 403. A request for one that does not exist is refused with 404. | C-13 |
| BR-22 | Ticket ownership | Every list query is scoped to the selected Requester before any search, filter or sort is applied. | LS 6.1, LS 8.11 AC-03 |
| BR-23 | Search, filtering, sorting and pagination | Search matches Ticket Number by exact or prefix match and Ticket Summary case-insensitively; Description is not searched. | C-30 |
| BR-24 | Search, filtering, sorting and pagination | The filterable fields are Category, Related System and Current Status. | C-27 |
| BR-25 | Search, filtering, sorting and pagination | The permitted sort fields are exactly four: `createdAt`, `ticketNumber`, `summary` and `currentStatus`. Each accepts direction `asc` or `desc`, supplied as `field:direction`. Any other field name, or any other direction, is outside the permitted set. | C-27, LS 6.1 |
| BR-26 | Search, filtering, sorting and pagination | The default sort is `createdAt` descending, with `id` descending as the secondary sort, applied as the tiebreak under every permitted sort field. | C-29 |
| BR-27 | Search, filtering, sorting and pagination | Permitted page sizes are 10, 25 and 50; the default is 10. | C-27 |
| BR-28 | Search, filtering, sorting and pagination | A `sort` naming a field or direction outside BR-25, or a `pageSize` outside BR-27, is malformed input and is refused with 400 and field-level errors. | C-27, BR-25 |
| BR-29 | Search, filtering, sorting and pagination | A `page` beyond the last page returns an empty result array with correct metadata, not an error. | C-27 |
| BR-30 | Validation and duplicate-submission prevention | All text values are trimmed before validation and stored trimmed. | C-25 |
| BR-31 | Validation and duplicate-submission prevention | Ticket Summary is required and must be 5 to 120 characters after trimming. | C-25 |
| BR-32 | Validation and duplicate-submission prevention | Description is required and must be 20 to 5000 characters after trimming. | C-25 |
| BR-33 | Validation and duplicate-submission prevention | Category, Related System and Requested Priority are each required; a missing value on any of the three is a validation failure. | C-25, LS 4.4 |
| BR-34 | Validation and duplicate-submission prevention | Category and Related System must each name a row that exists and is active; Requested Priority must be one of the three values in BR-08. A value outside those sets is a validation failure. | C-25, LS 4.4 |
| BR-35 | Validation and duplicate-submission prevention | Client and server both source their validation message text from the message catalogue in `docs/lab-02/ui-spec.md`, and neither emits text that is absent from it. `ui-spec.md` must define exactly one message for each validation rule fixed by C-25 - that is, one for each of BR-30 to BR-34, per field where the rule applies per field. This is what makes the identical-message requirement of `LS 4.4` a checkable claim rather than an aspiration. | C-25, LS 4.4 |
| BR-36 | Validation and duplicate-submission prevention | Duplicate submission is prevented at the UI only: the submit control is disabled for the duration of the request. There is no server-side duplicate guard. | C-26, LS 8.3 |
| BR-37 | Failure behavior and data retained after errors | A failed creation retains every value the Requester entered, including the attachment selection, which is held in client component state and is not re-read from the file input. | LS 14 Part 6, C-15 |
| BR-38 | Failure behavior and data retained after errors | Error responses carry a safe message and a machine-readable code. They never expose stack traces, SQL statements, filesystem paths or raw database error text. The autoincrement `id` is outside this rule: it appears in every resource URL by design per C-12, and C-11 derives the public Ticket Number from it. | LS 6.3, C-12 |
| BR-39 | Failure behavior and data retained after errors | A request that is well formed but violates a business rule is refused with 422 and a machine-readable code. The two such violations in Lab 2 are an upload that would exceed five active attachments (BR-44) and a removal submitted with an empty reason (BR-47). 422 is distinct from 400, which is reserved for malformed input. | LS 6.4, C-14 |
| BR-40 | Failure behavior and data retained after errors | A failure to upload an attachment never rolls back a Ticket that was already created; the Ticket is retained and the failed files are reported as retryable. | C-15, LS 4.5 |
| BR-41 | Failure behavior and data retained after errors | The upload compensation strategy is ordered as follows. Type and size are enforced by the multipart layer before the request reaches the handler, so a file rejected under BR-42 or BR-43 is never committed to `UPLOAD_DIR`; if a write is aborted mid-stream, the partial file is unlinked before the error is returned. Otherwise the file is written to disk first and the `Attachment` row is inserted second. If the row insert fails, the written file is deleted before the error is returned. If the five-active check of BR-44 fails - which can only be evaluated after the file has been written - the file is deleted before the 422 is returned. The invariant this produces is: no orphaned `Attachment` row, and no orphaned file in `UPLOAD_DIR`. | LS 4.5, C-15, C-17 |
| BR-42 | Attachment upload, download and soft removal | Permitted attachment types are JPG, JPEG, PNG, WEBP and PDF. | LS 4.5 |
| BR-43 | Attachment upload, download and soft removal | The maximum size is 5 MB per file. | LS 4.5 |
| BR-44 | Attachment upload, download and soft removal | A Ticket may carry at most five active attachments. Soft-removed attachments do not count toward that maximum. | LS 4.5, C-18 |
| BR-45 | Attachment upload, download and soft removal | An unsupported file type is refused with 415 and an oversized upload with 413. | C-14 |
| BR-46 | Attachment upload, download and soft removal | Removal is always soft: the row is retained and marked removed, with the removal timestamp recorded. No row is ever deleted and no stored file is ever unlinked by a removal. | LS 4.5 |
| BR-47 | Attachment upload, download and soft removal | Removal requires a reason that is non-empty after trimming, recorded with the removal timestamp. A removal submitted with an empty reason is refused under BR-39. | C-19, BR-39 |
| BR-48 | Attachment upload, download and soft removal | Removal requires an explicit confirmation step before any request is sent: a dialog that names the attachment's original filename, carries the required removal-reason field, and offers a destructive Confirm action and a Cancel action. Cancel closes the dialog, changes nothing and issues no request. Confirm stays disabled until the reason is non-empty after trimming. | LS 4.5, C-19 |
| BR-49 | Attachment upload, download and soft removal | An active attachment may be previewed by the owning Requester. Preview is served by the same ownership-checked route as download (BR-54), with `Content-Disposition: inline` rather than `attachment`. The image types JPG, JPEG, PNG and WEBP render inline in the page; PDF opens in the browser's own viewer. Nothing else counts as a preview, and no type outside BR-42 can reach the route at all. | LS 4.5 |
| BR-50 | Attachment upload, download and soft removal | A removed attachment's metadata, including its removal reason, remains visible on Ticket Detail, while its bytes are unreachable: neither the download of FR-25 nor the inline preview of BR-49 will serve them. | LS 4.5 |
| BR-51 | Attachment upload, download and soft removal | A download or preview request for a removed attachment is refused with 410 to the owning Requester and 403 to any other. | C-20, C-13 |
| BR-52 | Attachment upload, download and soft removal | Only the owning Requester may add or remove an attachment. | LS 4.5, LS 6.3 |
| BR-53 | Attachment upload, download and soft removal | Files are stored on disk under a generated safe filename; the original filename is retained as metadata only. | C-17 |
| BR-54 | Attachment upload, download and soft removal | Attachment bytes are served only through an ownership-checked route, never from a static directory. | C-17 |
| BR-55 | Inactive Requesters | An API request naming an inactive Requester is refused with 403 and a safe message. | C-33 |
| BR-56 | Reference data | `GET /api/categories` and `GET /api/related-systems` return only rows whose `isActive` is true, in `id` order. The Lab 1 `{id, name}` response shape is unchanged, and all four seeded Categories are active, so the Lab 1 assertion continues to hold. | LS 6, C-05 |
| BR-57 | Empty and no-results states | The empty state applies when the Requester owns no Tickets and no search or filter is active. It is headed **"No tickets yet"** and offers a Create Ticket action. | C-28 |
| BR-58 | Empty and no-results states | The no-results state applies when a search or filter is active and excludes every Ticket. It is headed **"No matches"** and offers a Clear filters action. | C-28 |
| BR-59 | Empty and no-results states | The two states are visually and textually distinct: they differ in heading copy and in the action offered, never in wording alone. | C-28, LS 17 |
| BR-60 | Ticket Detail access | Ticket Detail is reachable only for a Ticket the selected Requester owns. | LS 8.5, C-13 |
| BR-61 | Ticket Detail access | All Ticket header fields on Ticket Detail are read-only. | LS 8.5 |
| BR-62 | Ticket Detail access | The only mutating actions available from Ticket Detail are adding and soft-removing an attachment. | LS 8.5, C-06 |
| BR-63 | Ticket Detail access | Ticket Detail never renders Public Comments, Internal Notes, Actions Taken or any status-workflow control. | LS 4.2, LS 8.5 |
| BR-64 | Transition to real authentication in Lab 3 | The `requesterId` accompanying a request is a client-supplied testing value, carries no security guarantee, and is never described in the UI or the code as an authenticated identity. | LS 4.3 BR-03, C-12 |
| BR-65 | Transition to real authentication in Lab 3 | Lab 2 stores no password, hash, session, token or role field. | LS 4.2 |

**65 business rules.**

Three statements carried as business rules in an earlier draft are not business rules,
because no Lab 2 implementation can violate them: the retention of an inactive Requester's
data, the shape of `RequesterUser` for Lab 3, and the wording of the ownership rules. They
are recorded as Lab 3 design constraints LC-01 to LC-03 in section 11.

---

## 6. UI Specification Summary

The binding visual contract is `ui-spec.md`. This section fixes the structure it details.

**Application shell.** TokTickIT identity (C-41), My Tickets and Create Ticket navigation,
the selected Development Requester with a Change Requester action, a clear active-page
indicator, and a responsive mobile navigation. The shell renders only once a valid
Requester is selected.

**Development Requester Selection.** TokTickIT title; a short explanation that the selector
exists for Lab 2 testing only and is not a login screen; a dropdown of active Requesters
loaded from PostgreSQL; a Continue action; keyboard-accessible controls. Four states are
specified and screenshotted: loading (BR-16), populated, empty (BR-17) and API failure
(BR-18). The disclaimer text is required, not decorative (BR-03, FR-05).

**Create Ticket.** System-generated and read-only values are visually distinct from
editable ones - the field-by-field split is section 4.1. Labels sit above controls.
Required fields carry a red asterisk that never substitutes for the validation message.
Inputs share one height; Description is taller. Validation messages appear beside their
field and are drawn from the `ui-spec.md` catalogue (BR-35). Submit shows a busy state and
is disabled in flight. Six states are specified and screenshotted: initial, validation
failure, submitting, success, API failure, invalid attachment.

**My Tickets.** Search, filters, sort, Clear filters and pagination controls; a desktop
table and a mobile card or responsive-table representation; loading, empty, no-results and
failure states, with empty and no-results visibly distinct (BR-57 to BR-59).

**Requester Ticket Detail.** Read-only Ticket header, clearly separated from the attachment
section. Attachment states: active, uploading, invalid, removed, unavailable. Active
attachments offer preview and download (BR-49); removal runs through the confirmation
dialog of BR-48. No comments, notes, actions-taken or workflow controls.

**Badges.** Requested Priority, IT Priority and Current Status share one badge system. IT
Priority renders only when a value is present (BR-07). No badge conveys meaning by color
alone (FR-48).

**Timestamps.** Every displayed timestamp uses `DD MMM YYYY HH:mm` in Asia/Bangkok
(BR-10): Ticket Date, Last Updated, upload time and removal time alike.

**Zen Green tokens.** Four hex values are fixed here and are binding: primary `#006B3C`,
secondary `#0B7A46`, pale `#EAF6EF`, page background `#F5F7F6`. Two further tokens are
named here but receive their hex values in `ui-spec.md`, because `LS 7` states them as
descriptions rather than codes: the white card surface, and the dark charcoal-green body
text. `ui-spec.md` must pin both to a specific hex value, so that the visual check has
something to compare against.

**Responsive rules.** Desktop >= 992 px multi-column, centered with a sensible maximum
width. Tablet 768-991 px two-column where practical, with Ticket Summary and Description
given width. Mobile < 768 px stacked with touch-friendly controls. At every size: no
clipped labels, no overlapping messages, no hidden buttons, no unreadable attachment
names, no horizontal page scrolling.

---

## 7. Data Changes

PostgreSQL via Prisma. One additive migration introduces everything below; `prisma migrate
reset` is never run because it would destroy the Lab 1 seed data (C-37).

Prisma's default table naming is accepted throughout: no model carries an `@@map` and no
field carries a `@map`. The Lab 1 models already rely on that default, and introducing an
explicit naming scheme for the Lab 2 models alone would leave the schema inconsistent with
itself for no benefit.

### Enums

| Enum | Values | Trace |
|---|---|---|
| `RequestedPriority` | `LOW`, `MEDIUM`, `HIGH` | C-23 |
| `TicketStatus` | `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED` | C-21 |

`TicketStatus` carries values unreachable in Lab 2 so the status filter is a real control
and Lab 3 needs no enum migration (BR-09).

### `Category` - modified

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement - unchanged |
| `name` | `String` | `@unique` - unchanged |
| `createdAt` | `DateTime` | `@default(now())` - unchanged |
| `isActive` | `Boolean` | **new**, `@default(true)` (C-05) |

`GET /api/categories` filters on `isActive` and keeps returning `{id, name}` in id order,
so the Lab 1 Supertest assertion continues to pass (C-05, BR-56).

### `RelatedSystem` - new

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `name` | `String` | `@unique` |
| `isActive` | `Boolean` | `@default(true)` - drives BR-56 |
| `createdAt` | `DateTime` | `@default(now())` |

### `RequesterUser` - new

Named per C-31; labelled "Development Requester" in the UI.

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `name` | `String` | not null |
| `email` | `String` | `@unique` |
| `isActive` | `Boolean` | `@default(true)` - drives BR-11 |
| `createdAt` | `DateTime` | `@default(now())` |

No password, hash, session, token or role field (BR-65). Lab 3 attaches authentication to
this model without touching `Ticket.requesterId` (LC-02).

### `Ticket` - new

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement - source of the Ticket Number digits (BR-04) |
| `ticketNumber` | `String?` | `@unique`, `TKT-YYYY-NNNNNN`. **Nullable** - see the assignment note below (BR-01, BR-04, C-49) |
| `requesterId` | `Int` | FK -> `RequesterUser.id`, not null |
| `categoryId` | `Int` | FK -> `Category.id`, not null |
| `relatedSystemId` | `Int` | FK -> `RelatedSystem.id`, not null |
| `summary` | `String` | not null, 5-120 after trim (BR-31) |
| `description` | `String` | `@db.Text`, not null, 20-5000 after trim (BR-32) |
| `requestedPriority` | `RequestedPriority` | not null, default `MEDIUM` (BR-08) |
| `itPriority` | `RequestedPriority?` | **nullable**, never set in Lab 2 (BR-07) |
| `currentStatus` | `TicketStatus` | not null, `@default(NEW)` (BR-02) |
| `createdAt` | `DateTime` | `@default(now())`, stored UTC - the Ticket Date (BR-05, BR-10) |
| `updatedAt` | `DateTime` | `@updatedAt`, stored UTC - drives the Last Updated column |

**Ticket Number assignment (C-49).** The six digits are the row's own autoincrement `id`,
which does not exist until the row is inserted, so the number cannot be written by the
insert that creates it. Both statements run inside one `prisma.$transaction`: the `Ticket`
is created, then the same row is updated with
`` `TKT-${createdAt year}-${String(id).padStart(6, "0")}` ``. Two consequences follow and
are recorded rather than hidden:

- `ticketNumber` is **nullable in the schema**, because the column holds no value between
  the create and the update. It is never null outside that transaction, so BR-01 and AC-15
  hold for every Ticket any caller can observe. PostgreSQL permits repeated nulls under a
  unique constraint, so nullability and `@unique` do not conflict.
- No sequence table and no collision retry exist. The digits derive from a primary key that
  is already unique, so a collision is not reachable and a retry would guard nothing.

### `Attachment` - new

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `ticketId` | `Int` | FK -> `Ticket.id`, not null |
| `originalFilename` | `String` | as supplied, metadata only (BR-53) |
| `storedFilename` | `String` | `@unique`, generated, never user-controlled (BR-53) |
| `mimeType` | `String` | validated against BR-42 |
| `sizeBytes` | `Int` | validated against BR-43 |
| `uploadedAt` | `DateTime` | `@default(now())`, stored UTC |
| `isRemoved` | `Boolean` | `@default(false)` - the soft-removal flag (BR-46) |
| `removedAt` | `DateTime?` | set with the removal, stored UTC |
| `removalReason` | `String?` | required when `isRemoved` is true (BR-47) |


Soft removal is a flag plus two nullable companions rather than a separate archive table:
the metadata must stay visible on Ticket Detail (BR-50), so the row must remain in the
table the detail query already reads.

**Referential actions.** Both foreign keys take Prisma's default `onDelete` behavior for a
required relation, `Restrict`, and neither overrides it. No delete path exists in Lab 2:
`LS 4.2` excludes administration of Requesters, BR-46 makes attachment removal soft, and no
endpoint deletes a Ticket. `Restrict` is therefore the action that matches the sprint - it
refuses a deletion that nothing is supposed to perform - and specifying `Cascade` would be
defining behavior for a path the contract does not contain. Revisiting this belongs with
LC-01 in Lab 3.

### Relationships

`RequesterUser` 1-n `Ticket`; `Ticket` n-1 `RequesterUser`; `Ticket` 1-n `Attachment`;
`Category` 1-n `Ticket`; `RelatedSystem` 1-n `Ticket` - exactly the five `LS 5.1` requires.

No further relationship is introduced for attachment upload or removal metadata. `LS 5.1`
asks for any additional relationship to be documented, and the answer here is that none is
needed: BR-52 restricts removal to the owning Requester, who is already reachable through
`Attachment -> Ticket -> RequesterUser`, so a `removedBy` relation would store a value that
is derivable and can never differ.

### Index decisions - justified

`LS 5.2` requires at least one database-design decision to be justified. The indexes are
chosen from the query the list endpoint actually issues, not from the fields that merely
exist.

Every My Tickets query is scoped to one Requester before anything else happens (BR-22) and
is then ordered by `createdAt` descending with `id` descending as tiebreak (BR-26). That
makes the composite the workload, not `requesterId` alone:

- **`@@index([requesterId, createdAt(sort: Desc)])`** - serves the default list query and
  its pagination directly. A single-column index on `requesterId` would still leave the
  sort to be performed on the matched rows for every page.
- **`@@index([requesterId, currentStatus])`**, **`@@index([requesterId, categoryId])`**,
  **`@@index([requesterId, relatedSystemId])`** - the three filterable fields from C-27,
  each led by `requesterId` because no filter is ever applied outside a Requester scope.
- **`ticketNumber @unique`** - enforces BR-01, serves the exact and prefix search half of
  C-30, and serves the `ticketNumber` sort field of BR-25. No separate index is added.
- **Ticket Summary is deliberately left unindexed**, even though BR-25 makes it a permitted
  sort field. C-30 matches it case-insensitively by substring, and a B-tree index cannot
  serve a leading-wildcard match, so it would buy nothing for search. As a sort field it is
  a non-default choice over a page-sized result set, which does not justify the write cost.
  Trigram or full-text indexing is the correct answer at a scale this sprint does not
  reach, and is recorded as deferred rather than pretended.
- **`Attachment @@index([ticketId, isRemoved])`** - Ticket Detail always reads a Ticket's
  attachments split by removal state (BR-50), and the five-active-attachment check (BR-44)
  counts on exactly this pair.

Description carries no index, consistent with C-30 excluding it from search.

### Migration decisions

One additive migration. `Category.isActive` lands with `@default(true)`, so existing Lab 1
rows become active without a backfill script. No column is dropped or renamed, no table is
recreated, and the Lab 1 seed survives (C-37). The graded seed stays exactly as `LS 5.3`
specifies; demonstration Tickets come from a separate `server/prisma/seed-demo.ts` (C-22).

---

## 8. API Contract

Summary only, and deliberately so. The binding contract - request and response shapes,
every validation rule, every status code, pagination metadata and error bodies - is
`api-spec.md`, which is written next. This section is expanded into a per-endpoint summary
of request and response shapes once `api-spec.md` exists; restating the full contract in
two documents before then would create exactly the divergence that keeping it in one place
avoids. Nothing in this table may be relied on where the two differ; report the difference
instead.

| Capability | Method and path | Notes |
|---|---|---|
| Retrieve active Categories | `GET /api/categories` | Active only; Lab 1 shape preserved (BR-56) |
| Retrieve active Related Systems | `GET /api/related-systems` | Active only (BR-56) |
| Retrieve active Development Requesters | `GET /api/requesters` | Active only (BR-11) |
| Create a Ticket | `POST /api/tickets` | `requesterId` in body (C-12) |
| Retrieve the selected Requester's Tickets | `GET /api/tickets` | `?requesterId=` plus the C-27 query contract; sort field set per BR-25 |
| Retrieve one owned Ticket | `GET /api/tickets/:id` | 403 / 404 per BR-21 |
| Upload an Attachment | `POST /api/tickets/:id/attachments` | multipart, multer (C-16); 422 per BR-39 when the fifth active slot is full |
| Retrieve Attachment metadata | `GET /api/tickets/:id/attachments` | Active and removed, distinguished |
| Download or preview an active Attachment | `GET /api/attachments/:id/download` | `Content-Disposition: inline` for preview per BR-49; 410 / 403 per BR-51 |
| Soft-remove an Attachment | `DELETE /api/attachments/:id` | Reason required in body (BR-47); 422 per BR-39 when empty |

Status codes in use: **200, 201, 400, 403, 404, 410, 413, 415, 422, 500**. Their assignment
is fixed by C-13, C-14, C-20 and BR-39, and is enumerated per endpoint in `api-spec.md`.
409 is deliberately not used: the only two refusals of a well-formed request are business
rule violations, not resource-state conflicts.

---

## 9. Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-01 | Given valid Ticket data, when the Requester submits the form, then one Ticket is saved and the official Ticket Number is displayed. | LS 8.11, FR-12, FR-15, FR-17, FR-19 |
| AC-02 | Given no Development Requester is selected, when the user attempts to open My Tickets, then the Requester Selection screen is shown. | LS 8.11, FR-10 |
| AC-03 | Given Requester B is selected, when a Ticket belonging to Requester A is requested, then the Ticket data is not returned. | LS 8.11, FR-30, FR-43, FR-44 |
| AC-04 | Given the Selection screen has loaded, when the list renders, then every active Requester appears and no inactive Requester appears. | BR-11, FR-01 |
| AC-05 | Given the active-Requester request has not settled, when the Selection screen renders, then a loading state is visible and the dropdown and Continue control are disabled. | BR-16, FR-02 |
| AC-06 | Given the active-Requester request returns zero rows, when the Selection screen renders, then the empty state is shown, no dropdown is offered, and Continue stays disabled. | BR-17, FR-03 |
| AC-07 | Given the active-Requester request fails, when the Selection screen renders, then a safe failure state with a retry action is shown, no stack trace, SQL, filesystem path or database text appears, and no selection is stored. | BR-18, BR-38, FR-04 |
| AC-08 | Given the Selection screen renders, when its text is read, then it states that the selector is for Lab 2 testing only and is not a login screen. | BR-03, FR-05 |
| AC-09 | Given a Requester was selected, when the browser is reloaded, then the same Requester is still selected and the shell shows their name. | BR-12, FR-06, FR-07 |
| AC-10 | Given a stored selection names a Requester who is no longer active, when the application boots, then the selection is cleared and the Selection screen is shown carrying an explanatory message saying why the previous selection is gone. | BR-13 |
| AC-11 | Given Requester A is selected with tickets listed, when the Requester is changed to B, then A's tickets are no longer displayed and B's data is fetched. | BR-14, FR-09 |
| AC-12 | Given a Requester is selected, when the shell renders, then a Change Requester action is present, and activating it returns to the Selection screen. | FR-08 |
| AC-13 | Given the Create Ticket form is open, when it renders, then Category and Related System options come from the API and no option is hard-coded. | FR-11 |
| AC-14 | Given one inactive Category and one inactive Related System exist, when `GET /api/categories` and `GET /api/related-systems` are called, then neither inactive row is returned, and the remaining rows keep the `{id, name}` shape in id order. | BR-56, FR-11 |
| AC-15 | Given a Ticket is created, when the response returns, then its Ticket Number matches `^TKT-\d{4}-\d{6}$` and no other Ticket shares it. | BR-01, BR-04 |
| AC-16 | Given a Ticket is created, when it is read back, then its Current Status is `NEW` and its IT Priority is null. | BR-02, BR-07 |
| AC-17 | Given the Ticket Summary field is empty, when the Requester submits, then a message appears beside that field and no API request is made. | BR-31, FR-16 |
| AC-18 | Given a Ticket Summary of 4 characters and one of 121 characters, when each is submitted, then both are rejected. | BR-31 |
| AC-19 | Given a Ticket Summary of exactly 5 characters and one of exactly 120 characters, when each is submitted, then both are accepted. | BR-31 |
| AC-20 | Given a Ticket Summary padded with leading and trailing spaces, when the Ticket is saved, then the stored value is trimmed. | BR-30 |
| AC-21 | Given a creation request is in flight, when the Requester clicks submit again, then the control is disabled and exactly one API call is made. | BR-36, FR-18 |
| AC-22 | Given the backend is unavailable, when the Requester submits, then a safe error is shown and every entered value, including the attachment selection, is still present in the form. | BR-37, BR-38, FR-20 |
| AC-23 | Given each validation rule in BR-30 to BR-34 is violated in turn, when the client and then the server rejects the request, then both render the message that `ui-spec.md` defines for that rule, character for character. | BR-35 |
| AC-24 | Given a file of an unsupported type, when it is uploaded, then it is refused with 415 and the reason names the file. | BR-42, BR-45, FR-23 |
| AC-25 | Given a file larger than 5 MB, when it is uploaded, then it is refused with 413. | BR-43, BR-45, FR-23 |
| AC-26 | Given a Ticket with five active attachments, when a sixth is uploaded, then it is refused with 422 and a machine-readable code. | BR-39, BR-44, FR-24 |
| AC-27 | Given a Ticket with five active attachments, when one is soft-removed and the upload is retried, then the upload succeeds. | BR-44 |
| AC-28 | Given a Ticket was created but an attachment upload failed, when the response returns, then the Ticket still exists and the failed file is reported as retryable. | BR-40, FR-21, FR-29 |
| AC-29 | Given an upload that fails after the file has been written, when the error is returned, then no `Attachment` row exists for it and no file for it remains in `UPLOAD_DIR`. | BR-41 |
| AC-30 | Given an active attachment, when the owning Requester downloads it, then the file is returned with `Content-Disposition: attachment`. | FR-25 |
| AC-31 | Given an active image attachment, when the owning Requester previews it, then 200 is returned with `Content-Disposition: inline` and the bytes match the uploaded file. | BR-49, FR-26 |
| AC-32 | Given an owned Ticket with fewer than five active attachments, when the Requester adds a permitted file from Ticket Detail, then it appears in the active attachment list without leaving the screen. | FR-22 |
| AC-33 | Given the Requester opens the removal dialog for an active attachment, when they cancel, then no request is made and the attachment stays active; and when they supply a reason and confirm, then the attachment is removed. | BR-48, FR-27 |
| AC-34 | Given an attachment is soft-removed with a reason, when Ticket Detail is reloaded, then its metadata and the reason are still visible and it is marked removed. | BR-46, BR-47, BR-50, FR-28 |
| AC-35 | Given a removal is submitted with an empty reason, when it reaches the server, then it is refused with 422 and a machine-readable code. | BR-39, BR-47 |
| AC-36 | Given a removed attachment, when the owning Requester requests its download or preview, then 410 is returned. | BR-51, FR-28 |
| AC-37 | Given a removed attachment, when a Requester who does not own it requests its download or preview, then 403 is returned. | BR-51, BR-21 |
| AC-38 | Given a Ticket with one active and one removed attachment, when its attachment metadata is retrieved, then both are returned and the removed one is distinguishable from the active one. | FR-42 |
| AC-39 | Given Requester B is selected, when an Attachment belonging to Requester A's Ticket is requested directly, then 403 is returned. | BR-21, BR-52, FR-44 |
| AC-40 | Given a Ticket id that does not exist, when it is requested, then 404 is returned. | BR-21 |
| AC-41 | Given tickets whose summaries differ, when a search term matching one summary is applied, then only matching tickets are listed. | BR-23, FR-32 |
| AC-42 | Given a search on a full Ticket Number, when it is applied, then exactly that Ticket is listed. | BR-23 |
| AC-43 | Given tickets across several categories, when a Category filter is applied, then only tickets in that Category are listed. | BR-24, FR-33 |
| AC-44 | Given more tickets than one page holds, when page 2 is requested, then the second page is returned and the metadata reports the correct total and page count. | BR-27, BR-29, FR-31 |
| AC-45 | Given a page number beyond the last page, when it is requested, then an empty result array is returned with correct metadata and no error. | BR-29 |
| AC-46 | Given each of the four permitted sort fields `createdAt`, `ticketNumber`, `summary` and `currentStatus` in turn, when the list is requested with `asc` and then `desc`, then 200 is returned and the rows are ordered on that field in that direction. | BR-25, FR-34 |
| AC-47 | Given a `sort` value outside BR-25 - `description:asc` for the field, `createdAt:sideways` for the direction - when the list is requested, then 400 is returned with a field-level error naming `sort`. | BR-25, BR-28 |
| AC-48 | Given tickets created at different times, when the list loads with no sort specified, then they are ordered newest first, with `id` descending breaking ties. | BR-26, FR-34 |
| AC-49 | Given a Requester who owns no tickets and no filter is active, when My Tickets loads, then the state headed "No tickets yet" is shown with a Create Ticket action. | BR-57, FR-37 |
| AC-50 | Given a Requester who owns tickets, when a filter excludes all of them, then the state headed "No matches" is shown with a Clear filters action, and both its heading and its action differ from those in AC-49. | BR-58, BR-59, FR-35, FR-38 |
| AC-51 | Given the API is unavailable, when My Tickets loads, then a safe failure state is shown and no stack trace, SQL, filesystem path or database text appears in the message. | BR-38, FR-39 |
| AC-52 | Given a request is in flight on the Selection, My Tickets, Create Ticket or Ticket Detail screen, when that screen renders, then a loading state is visible until the request settles. | FR-36 |
| AC-53 | Given an owned Ticket, when its Detail is opened, then every header field is read-only and no comment, note, actions-taken or status control is rendered. | BR-61, BR-63, FR-41 |
| AC-54 | Given the viewport is 1280, 834 and 390 px wide in turn, when each of the four screens renders, then it satisfies every row of the visual checklist in `docs/lab-02/tests.md`, which is derived from the layout rules in `ui-spec.md`. | FR-45, LS 8.7, LS 8.8 |
| AC-55 | Given the viewport is 1280, 834 and 390 px wide in turn, when each of the four screens renders, then `document.documentElement.scrollWidth` is less than or equal to `window.innerWidth`. | FR-45, LS 8.7 |
| AC-56 | Given a keyboard-only user on the Selection, My Tickets, Create Ticket or Ticket Detail screen, when they tab through it, then every interactive control is reachable, carries a visible focus indicator and has an accessible name. | FR-46, FR-47 |
| AC-57 | Given a validation error, when it renders, then its meaning is carried by its text and its position beside the field, and it remains legible with color removed. | FR-48, LS 7 |
| AC-58 | Given a Requested Priority, IT Priority or Current Status badge, when it renders, then its value is readable as text and does not depend on the badge color. | FR-48, LS 7 |
| AC-59 | Given a successful creation, when the confirmation renders, then success is stated in text and does not depend on color alone. | FR-48, LS 7 |
| AC-60 | Given any displayed timestamp on any screen, when it renders, then it reads as `DD MMM YYYY HH:mm` in Asia/Bangkok. | BR-10, FR-49 |
| AC-61 | Given the Create Ticket form renders, when the Requester inspects the Requester and Ticket Date fields, then both are shown as read-only values, are styled as read-only per `ui-spec.md`, and neither accepts input. | FR-13, FR-14, LS 4.4 |
| AC-62 | Given a Ticket is listed in My Tickets, when the Requester opens it from the list, then the Requester Ticket Detail for that Ticket is shown. | FR-40 |
| AC-63 | Given the seeded inactive Requester, when their `requesterId` is supplied to any ownership-bearing endpoint, then 403 is returned with a machine-readable code and a safe message, and no Ticket or Attachment data is returned. | BR-55, C-33 |
| AC-64 | Given an Attachment id that does not exist, when its download or its removal is requested, then 404 is returned. | BR-21, C-45 |
| AC-65 | Given a `requesterId` that names no Requester at all, when any ownership-bearing endpoint is called, then 404 is returned, and it is returned before the addressed Ticket or Attachment is looked up. | C-45, BR-21 |
| AC-66 | Given an unexpected server error on any endpoint, when the response returns, then its status is 500 and its body carries a machine-readable code and a safe message containing no stack trace, SQL statement, filesystem path or database error text. | BR-38, LS 6.4 |
| AC-67 | Given a request that bypasses the client and violates a validation rule in BR-30 to BR-34, when it reaches the server directly, then 400 is returned with a field-level error for each offending field, proving the server validates independently of the client. | BR-33, BR-34, BR-35, LS 4.4 |

**67 acceptance criteria.**

---

## 10. Definition of Done

Per `LS 13.1`. Each item is verifiable by reading a named file or running a named command.

**Implementation**

- [x] Every FR-01..FR-49 is implemented and can be exercised in the running application.
- [x] Every BR-01..BR-65 is enforced where the rule says it is enforced - client rules in
      the client, backend rules in the backend.
- [x] `git grep -n` finds no password, session, token, role, comment, note, actions-taken
      or status-transition code anywhere in `client/src` or `server/src` (LS 4.2).
- [x] `server/prisma/schema.prisma` matches section 7, including every index.
- [x] `npx prisma migrate status` reports no pending migration.
- [x] `npm run prisma:seed` run twice creates no duplicate rows (LS 5.3).

**Tests**

- [x] `cd server && npm test` passes on the final `main` branch, including the Lab 1 suite.
- [x] `cd client && npm test` passes on the final `main` branch, including the repointed
      Lab 1 suite (C-04).
- [x] `npm run test:e2e` passes from the repository root on the final `main` branch.
- [x] All six test levels from `LS 9.2` are present: unit, API, UI component, UI style,
      responsive, E2E.
- [x] Every AC-01..AC-67 maps to at least one test in `tests.md`, and every planned test
      names a file path that exists.
- [x] The boundary cases are covered by passing tests: Ticket Summary at 4, 5, 120 and 121
      characters; Description at 19, 20, 5000 and 5001; the fifth and the sixth active
      attachment; a file at 5 MB and one just over; page sizes 10, 25, 50 and one outside
      the set; the last page and one page beyond it.
- [x] No test is skipped, disabled, commented out or marked `.only` - verifiable by
      `git grep -n "\.skip\|\.only\|xit(\|xdescribe("`.

**UI**

- [x] Every screen matches `ui-spec.md` at 1280, 834 and 390 px.
- [x] The visual checklist in `tests.md` is completed, with no unresolved item.
- [x] Screenshots exist under `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/`.
- [x] The four Zen Green hex tokens fixed in section 6 appear unchanged in the built CSS,
      and the two tokens `LS 7` states as descriptions - the white card surface and the
      dark charcoal-green body text - carry the hex values `ui-spec.md` assigns them.
- [x] The Selection screen carries the "not a login screen" disclaimer (BR-03, AC-08).

**Review**

- [ ] Every Issue was implemented on its own feature branch and merged into `lab2-staging`
      through a peer-reviewed PR (LS 10.1).
- [x] `docs/lab-02/reviewer.md` records reviewer identity, PR links, comments given and
      received, responses and approvals.
- [x] One release PR merged `lab2-staging` into `main`.

**Documentation**

- [x] `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `decisions.md`,
      `reviewer.md` and `ai-use.md` all exist under `docs/lab-02/`.
- [x] `specification.md` and `api-spec.md` do not contradict each other on any endpoint.
- [x] Every endpoint implemented in `server/src` conforms to `api-spec.md` on path, method,
      request shape, response shape and status code, with a Supertest assertion for each.
- [x] `ui-spec.md` defines exactly one validation message per rule in BR-30..BR-34, and the
      client and server strings match it (BR-35, AC-23).
- [x] README setup and test commands are current and were run as written.
- [x] `server/.env.example` lists `UPLOAD_DIR` and `MAX_UPLOAD_BYTES`; no `.env` is tracked.

**Demonstration**

- [x] The six Create Ticket states are captured (LS 14 Part 6).
- [x] The four Selection screen states are captured: loading, populated, empty and API
      failure (LS 8.1, LS 14 Part 6).
- [x] Requester A to B switching is captured showing A's tickets disappear (LS 14 Part 7).
- [ ] Attachment add, preview, download, soft removal with reason, retained metadata and
      blocked download of a removed file are captured (LS 14 Part 8).
- [x] A cross-requester rejection is captured showing the 403 (BR-21).

**Verified 2026-09-17 against `main`.** 30 of 32 items are ticked from a named file, command
or PR: the three suites on `main` at `d48cbd2` (server 86, client 48, Playwright 126), the
`git grep` checks, DB-01..DB-08 for the schema and seed, VIS-01 in `tests.md` section 4, the
93 files under `artifacts/lab-02/screenshots/`, and PRs #18-#26. The item-3 `git grep`
matches only ARIA `role=` attributes, a download-status `note` label and a `refsToken`
refresh counter - none implements an excluded feature. Two items stay unticked: **peer
review on every PR** - one of eight feature PRs (#18) was reviewed, seven were merged
without review, as `reviewer.md` records; and **the attachment preview capture** - preview
is asserted by API-36 and appears as a control in `detail-<vp>-active.png`, but no capture
shows it open.

---

## 11. Assumptions and Decisions

The reasoning behind the choices in this document is recorded once, in
`docs/lab-02/decisions.md`, as C-01..C-41. It is not repeated here. The decisions that
shape this specification most directly are C-05 (reference-data `isActive`), C-11 (Ticket
Number format), C-12 (identity transport), C-13 and C-20 (ownership and removed-file
statuses), C-15 (two-step upload), C-21 (status enum breadth), C-25 (validation bounds),
C-26 (duplicate prevention), C-27 to C-30 (list query contract), C-32 and C-33 (selection
and inactive Requesters), C-37 (migration strategy) and C-39 (timestamp handling).

### Deferred: edit mode

`LS 8.6` asks that the screen modes be identified. Lab 2 implements **view** and **create**
only. **Edit mode is identified and deferred** (C-06): `LS 8.5` makes the Ticket header
read-only and `LS 4.2` removes status transitions, leaving no field a Requester may
legitimately edit this sprint. It is recorded here rather than silently omitted.

### Lab 3 design constraints

These three statements were carried as business rules in an earlier draft. They are not
business rules, because no Lab 2 implementation can violate them: Lab 2 contains no delete
path at all, and the other two describe intent rather than behavior. They are recorded here
so that they are not lost when Lab 3 begins.

| ID | Constraint | Trace |
|---|---|---|
| LC-01 | Tickets and Attachments belonging to a Requester who has been made inactive are retained, never deleted. This constrains the administration functions that `LS 4.2` defers, not this sprint. | C-33 |
| LC-02 | `RequesterUser` is modelled so that Lab 3 can attach authentication fields to it without restructuring Ticket ownership, which already points at `RequesterUser.id`. | LS 5.2 |
| LC-03 | The ownership rules BR-19 to BR-22 are written against the selected Requester rather than against the selector, so Lab 3 replaces only how that identity is obtained, not the rules themselves. | LS 4.3, C-13 |

### Assumptions

These are working assumptions, not decisions, and each is testable rather than load-bearing:

1. A single Requester operates one browser at a time, so no concurrent-edit handling is
   required for the attachment count check (BR-44).
2. Attachment volume stays small enough that local disk storage is sufficient (C-17); no
   object store is introduced.
3. Ticket volume stays below the point at which substring search on Ticket Summary needs
   trigram or full-text indexing, as recorded in section 7.
4. The demonstration data created by `server/prisma/seed-demo.ts` (C-22) is not graded
   content and may be regenerated at any time.

### Canonical glossary (C-40)

These spellings are used verbatim as UI labels, and their `Field` column supplies the field
names used in `api-spec.md` and the Prisma schema. No synonym is introduced anywhere.

| Term | Field | Meaning |
|---|---|---|
| Development Requester | `RequesterUser` | The seeded identity selected in place of login. Model name per C-31; this label in all UI. |
| Ticket Number | `ticketNumber` | The backend-generated public identifier, `TKT-YYYY-NNNNNN`. Never "ticket id". |
| Ticket Date | `createdAt` | The system-generated creation timestamp shown to the Requester. |
| Last Updated | `updatedAt` | The timestamp shown in the My Tickets list. |
| Ticket Summary | `summary` | The short title. Never shortened to "Summary" in UI text. |
| Description | `description` | The long problem statement. |
| Category | `categoryId` / `Category.name` | The request classification. |
| Related System | `relatedSystemId` / `RelatedSystem.name` | The service, application, device or platform affected. |
| Requested Priority | `requestedPriority` | The priority the Requester asks for. |
| IT Priority | `itPriority` | The priority IT assigns. Null throughout Lab 2. |
| Current Status | `currentStatus` | The workflow state. `NEW` throughout Lab 2. |
| Attachment | `Attachment` | An uploaded supporting file. |
| Active attachment | `isRemoved = false` | An attachment that can be downloaded and previewed. |
| Removed attachment | `isRemoved = true` | A soft-removed attachment: metadata visible, bytes unreachable. |
| Removal reason | `removalReason` | The required justification recorded at removal. |
| Empty state | - | The Requester owns no Tickets and no filter is active. Headed "No tickets yet". |
| No-results state | - | A search or filter is active and excludes every Ticket. Headed "No matches". |
