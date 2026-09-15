# Lab 2 Test Plan and Results

TokTickIT - CPE 334 Individual Sprint 2.
Owner: Tammathorn Kananurak (67070503489).

Planned from `specification.md` before implementation, per `LS 9`. This plan is not
reconstructed from whatever tests were generated afterwards; it is the contract the
implementation is measured against.

Sources: `specification.md` (binding), `api-spec.md`, `ui-spec.md`, `decisions.md`.

---

## 1. Test Strategy

`LS 9.2` requires six levels. Per C-09 the level is carried by the **Test ID prefix**, not
by the filename, because `LS 12` fixes the client filenames and there is no room to encode
a level in them.

| Prefix | Level | Tool | Where it lives |
|---|---|---|---|
| `UNIT` | Unit | Vitest | `server/tests/lab-02/ticket-number.unit.test.ts` (C-08) |
| `API` | API / integration | Supertest + Vitest | The four `server/tests/lab-02/*.api.test.ts` files |
| `UI` | UI component | Vitest + Testing Library | The `client/tests/lab-02/*.test.tsx` files (C-03) |
| `STYLE` | UI style | Vitest + Testing Library | Inside the same client files (C-09) |
| `RESP` | Responsive | Playwright | `e2e/lab-02/requester-ticket-flow.spec.ts` (C-09) |
| `E2E` | End to end | Playwright | `e2e/lab-02/requester-ticket-flow.spec.ts` |
| `DB` | Data model (added in Issue #11, see section 7 item 7) | Vitest + Prisma against the real Postgres | `server/tests/lab-02/data-model.db.test.ts` |

**Test file inventory.** Every path below exists in the `LS 12` tree. Three are additions,
which `LS 12` permits because section 12 is a stated minimum:

```
server/tests/lab-02/ticket-number.unit.test.ts      addition, per C-08
server/tests/lab-02/data-model.db.test.ts           addition, Issue #11 (section 7 item 7)
server/tests/lab-02/create-ticket.api.test.ts       LS 12
server/tests/lab-02/my-tickets.api.test.ts          LS 12
server/tests/lab-02/ticket-detail.api.test.ts       LS 12
server/tests/lab-02/attachments.api.test.ts         LS 12
client/tests/lab-02/RequesterSelection.test.tsx     addition, per C-48
client/tests/lab-02/CreateTicket.test.tsx           LS 12
client/tests/lab-02/MyTickets.test.tsx              LS 12
client/tests/lab-02/RequesterTicketDetail.test.tsx  LS 12
client/tests/lab-02/AttachmentSection.test.tsx      LS 12
e2e/lab-02/requester-ticket-flow.spec.ts            LS 12
```

**Approach.** API tests run against the real Postgres container with a per-test transaction
rollback, so ownership and status behaviour are exercised against real constraints rather
than mocks. Client tests mock `fetch` at the module boundary and assert rendered output,
never implementation internals. Playwright drives the real stack across three viewport
projects (C-10). No test is skipped, `.only`, or commented out.

---

## 2. Planned Tests

111 planned tests: 103 across the six `LS 9.2` levels, plus DB-01..DB-08 in section 2.7.
`Final` was filled during Issue #16 from the run on `feature/7-e2e-visual` (section 7
item 8); every planned test is implemented and green. Issue #17 re-runs the three suites on
the final `main` and records that output in section 6, which is the Definition-of-Done run.

### 2.1 Unit

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-15, BR-04 | Ticket Number format from a known id and date | `formatTicketNumber(42, 2026-01-02)` returns `TKT-2026-000042`, matching `^TKT-\d{4}-\d{6}$` | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| UNIT-02 | Unit | BR-04 | Zero padding at boundaries | id 1 gives `000001`; id 999999 gives `999999`; id 1000000 does not truncate the year segment | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| UNIT-03 | Unit | BR-04, BR-10 | Year comes from `createdAt`, not from now | A ticket created 2025-12-31T23:59Z yields `TKT-2025-…` when run in 2026 | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| UNIT-04 | Unit | BR-10, AC-60 | Display formatter | A UTC instant renders as `DD MMM YYYY HH:mm` in Asia/Bangkok, +7 from the stored value | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| UNIT-05 | Unit | BR-30 | Trim helper | Leading and trailing whitespace removed before length is measured | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |

### 2.2 API and integration

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, FR-17 | Create a valid Ticket | 201; one row saved; body carries the generated Ticket Number | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-02 | API | AC-15 | Ticket Number uniqueness | Two creations return different numbers, both matching the regex | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-03 | API | AC-16 | Defaults on creation | `currentStatus` is `NEW`; `itPriority` is null | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-04 | API | AC-18, BR-31 | Ticket Summary lower and upper rejection | 4 chars and 121 chars both give 400 with the BR-31 message in `fields.summary` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-05 | API | AC-19, BR-31 | Ticket Summary boundaries accepted | 5 chars and 120 chars both give 201 | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-06 | API | BR-32 | Description boundaries | 19 and 5001 give 400; 20 and 5000 give 201 | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-07 | API | AC-20, BR-30 | Trimming on save | A padded Ticket Summary is stored trimmed | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-08 | API | AC-67, BR-33, BR-34 | Server validates independently of the client | A direct request with a missing Category and an out-of-set Requested Priority gives 400 with one `fields` entry each | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-09 | API | AC-23, BR-35 | Message parity, server side | Each BR-30..BR-34 violation returns exactly the `ui-spec.md` catalogue string | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-10 | API | AC-14, BR-56 | Reference data active filtering | An inactive Category and Related System are absent; remaining rows are `{id, name}` in id order | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-11 | API | AC-04, BR-11 | Active Requesters only | The seeded inactive Requester is absent from `GET /api/requesters` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-12 | API | AC-63, BR-55 | Inactive Requester refused | Creating with the inactive `requesterId` gives 403 `REQUESTER_INACTIVE` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-13 | API | AC-65, C-45 | Unknown Requester refused before resource lookup | `GET /api/tickets/999?requesterId=999` gives 404 `REQUESTER_NOT_FOUND`, not `TICKET_NOT_FOUND` | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-14 | API | AC-66, BR-38 | Safe unexpected error | A forced failure gives 500 `INTERNAL_ERROR`; body has no stack trace, SQL, path or database text | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-15 | API | AC-03, BR-22 | List scoped to owner | Requester B's list contains no Ticket owned by A | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-16 | API | AC-41, BR-23 | Search on Ticket Summary | Case-insensitive substring returns only matching rows | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-17 | API | AC-42, BR-23 | Search on Ticket Number | A full Ticket Number returns exactly that Ticket; a prefix returns its group; Description is never matched | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-18 | API | AC-43, BR-24 | Category filter | Only Tickets in that Category are returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-19 | API | BR-24 | Related System and Current Status filters | Each returns only matching rows; `currentStatus` is the parameter name | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-20 | API | AC-44, BR-27 | Pagination page 2 | Correct slice; `meta.total`, `meta.totalPages`, `meta.page`, `meta.pageSize` correct | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-21 | API | AC-45, BR-29 | Page beyond the last | `data: []` with correct `meta`, status 200, not an error | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-22 | API | BR-27, C-43 | Page size set and malformed page | 10, 25, 50 give 200; 11 gives 400; `page=abc` and `page=0` give 400 `INVALID_QUERY_PARAM` | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-23 | API | AC-46, BR-25 | The four permitted sort fields | `createdAt`, `ticketNumber`, `summary`, `currentStatus` each in `asc` and `desc` give 200 and correct order | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-24 | API | AC-47, BR-28 | Sort outside the permitted set | `description:asc` and `createdAt:sideways` each give 400 naming `sort` in `fields` | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-25 | API | AC-48, BR-26 | Default order and tiebreak | No `sort` gives `createdAt` desc; two rows sharing a timestamp order by `id` desc | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-26 | API | AC-40, BR-21 | Missing Ticket | 404 `TICKET_NOT_FOUND` | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-27 | API | AC-03, BR-21 | Ticket owned by another Requester | 403 `TICKET_FORBIDDEN`, and no Ticket field appears in the body | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-28 | API | AC-53, BR-63 | Detail payload shape | Response carries no comment, note, actions-taken or status-transition key, not even as null | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-29 | API | AC-38, FR-42 | Attachment metadata, both groups | Active and removed both returned; `isRemoved` distinguishes; `removalReason` present on the removed one | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-30 | API | AC-24, BR-42 | Unsupported type | A `.txt` upload gives 415 `UNSUPPORTED_FILE_TYPE`; no row and no file written | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-31 | API | AC-25, BR-43 | Oversized upload | 5 MB + 1 byte gives 413 `FILE_TOO_LARGE`; a file at exactly 5 MB gives 201 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-32 | API | AC-26, BR-44 | Sixth active attachment | 422 `ATTACHMENT_LIMIT_REACHED`; the fifth succeeded | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-33 | API | AC-27, BR-44 | Slot freed by removal | After soft-removing one of five, the next upload gives 201 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-34 | API | AC-29, BR-41 | Compensation on failure | A forced insert failure leaves no `Attachment` row and no file in `UPLOAD_DIR` | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-35 | API | AC-30, FR-25 | Download an active attachment | 200, `Content-Disposition: attachment`, bytes identical to the upload | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-36 | API | AC-31, BR-49 | Preview an active attachment | `?disposition=inline` gives 200 with `Content-Disposition: inline` and identical bytes | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-37 | API | AC-35, BR-47 | Empty removal reason | Whitespace-only reason gives 422 `REMOVAL_REASON_REQUIRED`; a missing key gives 400 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-38 | API | AC-34, BR-46 | Soft removal retains everything | After removal the row still exists, `isRemoved` true, `removedAt` and `removalReason` set, file still on disk | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-39 | API | AC-36, BR-51 | Removed download to owner | 410 `ATTACHMENT_REMOVED`, for both dispositions | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-40 | API | AC-37, BR-51 | Removed download to non-owner | 403 `ATTACHMENT_FORBIDDEN`, never 410, so removal state does not leak | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-41 | API | AC-39, BR-52 | Another Requester's attachment | 403 `ATTACHMENT_FORBIDDEN` on download and on removal | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-42 | API | AC-64, BR-21 | Missing attachment | Download and removal of an unknown id each give 404 `ATTACHMENT_NOT_FOUND` | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-43 | API | AC-28, BR-40 | Ticket survives an upload failure | After a rejected upload the Ticket still exists and is retrievable | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-44 | API | Lab 1 regression, C-05 | Lab 1 contract intact | `GET /api/health` and `GET /api/categories` return the Lab 1 shapes | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |

### 2.3 UI component

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | AC-04, FR-01 | Selector lists active Requesters | Every active Requester is an option; the inactive one is absent | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-02 | UI | AC-05, BR-16 | Selection loading state | Spinner shown; select and Continue disabled while the request is pending | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-03 | UI | AC-06, BR-17 | Selection empty state | On `[]`, no select renders, the empty message shows, Continue stays disabled | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-04 | UI | AC-07, BR-18 | Selection failure state | On 500, the failure panel and Retry render; no selection is written to `localStorage` | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-05 | UI | AC-08, BR-03 | Not-a-login disclaimer | The "This is not a login screen" text is present in the rendered output | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-06 | UI | AC-09, BR-12 | Selection persists across reload | A stored id is restored on mount and the shell shows that Requester's name | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-07 | UI | AC-10, BR-13 | Stale selection cleared | A stored id absent from the active list is cleared, the Selection screen renders, and the explanatory message shows | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-08 | UI | AC-02, FR-10 | Guard on Requester-scoped screens | With no selection, navigating to My Tickets renders the Selection screen | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-09 | UI | AC-12, FR-08 | Change Requester action | The action is present in the shell and returns to the Selection screen | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-10 | UI | AC-11, BR-14 | Requester switch clears data | After switching A to B, no A Ticket Number remains rendered and B's fetch fires | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-11 | UI | AC-13, FR-11 | Reference data from the API | Options match the mocked payload; no option exists that the mock did not supply | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-12 | UI | AC-17, FR-16 | Empty Ticket Summary blocks submit | The BR-31 message renders beside the field and `fetch` is never called | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-13 | UI | AC-23, BR-35 | Message parity, client side | Each BR-30..BR-34 violation renders exactly the `ui-spec.md` catalogue string | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-14 | UI | AC-21, BR-36 | Double submit prevented | Two rapid clicks produce exactly one `fetch`; the control is disabled between them | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-15 | UI | AC-22, BR-37 | Failure retains input | On a rejected request the error banner shows and every entered value and the attachment selection remain | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-16 | UI | AC-61, FR-13, FR-14 | Read-only Requester and Ticket Date | Both render as read-only and neither accepts input | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-17 | UI | AC-01, FR-19 | Success panel | The returned Ticket Number is displayed with the next action | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-18 | UI | AC-49, BR-57 | Empty state | Heading `No tickets yet` with a Create Ticket action | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-19 | UI | AC-50, BR-58, BR-59 | No-results state | Heading `No matches` with a Clear filters action; heading and action both differ from UI-18 | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-20 | UI | AC-51, FR-39 | My Tickets failure state | Safe message rendered; no stack trace, SQL, path or database text present | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-21 | UI | AC-52, FR-36 | Loading states | Selection, My Tickets, Create Ticket and Ticket Detail each show a loading state until their request settles | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-22 | UI | AC-62, FR-40 | Open detail from the list | Activating a row navigates to that Ticket's detail route | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-23 | UI | FR-35 | Clear filters visibility | The action is absent with no filter active and present once one is | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-24 | UI | AC-53, BR-61 | Detail is read-only | No editable control renders; no comment, note, actions-taken or status control is present | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| UI-25 | UI | AC-60, BR-10 | Timestamp rendering | Ticket Date and Last Updated render as `DD MMM YYYY HH:mm` | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| UI-26 | UI | AC-32, FR-22 | Add attachment from detail | A permitted file appears in the active group without navigation | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-27 | UI | AC-33, BR-48 | Removal dialog cancel and confirm | Cancel issues no request and leaves the row active; confirm with a reason removes it | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-28 | UI | BR-48, BR-47 | Confirm gated on reason | Confirm is disabled until the reason is non-empty after trimming | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-29 | UI | AC-34, BR-50 | Removed attachment presentation | Metadata and reason still shown; no Preview and no Download control rendered | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-30 | UI | C-46 | Unavailable attachment state | On a 410 for a row believed active, actions are disabled and the explanatory note plus Refresh render | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-31 | UI | AC-24, AC-25 | Per-file upload errors | 415 and 413 each render the `ui-spec.md` 6.1 message naming the file, with Retry and Discard | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| UI-32 | UI | Lab 1 regression, C-04 | Check System still works | `SystemCheck` renders its button and its Online / Offline states | `client/tests/lab-01/App.test.tsx` | Pass |

### 2.4 UI style

Per C-09 these live inside the client files named above; the `STYLE` prefix carries the
level.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI style | AC-57, FR-48 | Validation message placement and class | The message is the next sibling of its control, carries the error class, and `aria-invalid` is set | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| STYLE-02 | UI style | LS 8.3 | Required asterisk | Every required field's label carries the asterisk, and the asterisk never appears without the field also being able to show a message | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| STYLE-03 | UI style | LS 8.3, ui-spec 7 | Submit busy state | While pending, the button is disabled, `aria-busy` is true, and the label reads `Submitting…` | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| STYLE-04 | UI style | ui-spec 4 | Read-only field styling | Read-only fields carry the read-only class and the `readonly` attribute, not `disabled` | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| STYLE-05 | UI style | AC-59, FR-48 | Success not by colour alone | The success panel contains the word `created` as text, not only a green treatment | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| STYLE-06 | UI style | AC-58, ui-spec 8 | Badge text and shape | Priority badges carry the pill class and status badges the square class; each renders its value as title-case text | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| STYLE-07 | UI style | BR-07, C-07 | IT Priority badge absent | No IT Priority badge renders anywhere, because `itPriority` is null throughout Lab 2 | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| STYLE-08 | UI style | ui-spec 9 | Active navigation indication | The active item carries the active class and `aria-current="page"` | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| STYLE-09 | UI style | AC-56, FR-46 | Accessible names | Every interactive control in each screen has a non-empty accessible name | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| STYLE-10 | UI style | ui-spec 2 | Zen Green tokens present | The four fixed hex values and the two pinned in `ui-spec.md` 2.2 are all defined as custom properties on `:root` | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |

### 2.5 Responsive

Playwright, three viewport projects (C-10): desktop 1280, tablet 834, mobile 390.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | AC-55, FR-45 | No horizontal page scroll | On each of the four screens at each viewport, `document.documentElement.scrollWidth <= window.innerWidth` | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| RESP-02 | Responsive | ui-spec 12.3 | Mobile renders cards | At 390 px My Tickets renders the card list and no `<table>` is present | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| RESP-03 | Responsive | ui-spec 12.2 | Desktop renders the table | At 1280 px My Tickets renders the table with all six columns | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| RESP-04 | Responsive | ui-spec 9 | Mobile navigation | At 390 px the toggler is present and the expanded panel exposes both nav items plus Change Requester | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| RESP-05 | Responsive | AC-54 | Screenshot capture | All screenshots named in `ui-spec.md` 15 are written at all three viewports | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| RESP-06 | Responsive | AC-56 | Keyboard traversal | Tabbing each screen reaches every interactive control, each with a visible focus ring | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

### 2.6 End to end

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-08, AC-09 | The Requester flow | Select a Requester, create a Ticket, see the Ticket Number, find it in My Tickets, open its detail | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-02 | E2E | AC-11, AC-03 | Requester A to B switch | A's Tickets disappear from the list after switching to B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-03 | E2E | AC-32, AC-30, AC-34 | Attachment lifecycle | Add, download, then soft-remove with a reason; metadata and reason remain visible | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-04 | E2E | AC-36 | Removed download blocked | The removed attachment offers no download, and a direct request returns 410 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-05 | E2E | AC-03, AC-39 | Cross-requester rejection | Direct navigation to another Requester's Ticket, and a direct attachment request, are both refused with 403 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-06 | E2E | AC-49, AC-50 | Empty and no-results | A Requester with no Tickets shows `No tickets yet`; a filter that excludes everything shows `No matches` | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

### 2.7 Data model

Added during Issue #11. The DB prefix is a seventh level outside `LS 9.2`; see section 7
item 7 for why these rows exist.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| DB-01 | Data model | DoD, LS 5.3, C-22, BR-11, C-33 | Graded seed content | Exactly the four Categories in id order, all active; at least six Related Systems; at least four active and at least one inactive Development Requester | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-02 | Data model | DoD, LS 5.3, C-37 | Seed idempotence | Running `seedGraded` a second time leaves the Category, RelatedSystem and RequesterUser counts unchanged | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-03 | Data model | Lab 1 regression, C-05, C-37 | Lab 1 rows survive the additive migration | Categories 1-4 keep their original ids and names; `isActive` defaulted to true for every existing row | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-04 | Data model | C-21, C-23 | Enum ranges | `TicketStatus` declares NEW, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED in that order; `RequestedPriority` declares exactly LOW, MEDIUM, HIGH | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-05 | Data model | DoD, spec section 7, C-30, C-49 | Indexes | The four `Ticket` composite indexes and the `Attachment(ticketId, isRemoved)` index exist; `ticketNumber` is unique; `summary` and `description` carry no single-column index | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-06 | Data model | BR-01, BR-02, BR-07, C-49 | Ticket Number assigned inside the creation transaction | `createTicketWithNumber` returns a non-null number matching `^TKT-\d{4}-\d{6}$` derived from the row's own `id` and UTC `createdAt` year; `currentStatus` NEW and `itPriority` null; no Ticket with a null number is visible outside the transaction | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-07 | Data model | spec section 7, C-49, BR-50 | Column nullability | `Ticket.ticketNumber` is nullable; `Attachment.isRemoved` is not null while `removedAt` and `removalReason` are nullable | `server/tests/lab-02/data-model.db.test.ts` | Pass |
| DB-08 | Data model | LS 5.1 | Relationships are foreign keys | Ticket -> RequesterUser, Ticket -> Category, Ticket -> RelatedSystem and Attachment -> Ticket exist as FK constraints | `server/tests/lab-02/data-model.db.test.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability

All 67 criteria, each with the planned tests that discharge it.

| AC | Planned tests | AC | Planned tests |
|---|---|---|---|
| AC-01 | API-01, UI-17, E2E-01 | AC-35 | API-37 |
| AC-02 | UI-08 | AC-36 | API-39, E2E-04 |
| AC-03 | API-15, API-27, E2E-02, E2E-05 | AC-37 | API-40 |
| AC-04 | API-11, UI-01 | AC-38 | API-29 |
| AC-05 | UI-02 | AC-39 | API-41, E2E-05 |
| AC-06 | UI-03 | AC-40 | API-26 |
| AC-07 | UI-04 | AC-41 | API-16 |
| AC-08 | UI-05, E2E-01 | AC-42 | API-17 |
| AC-09 | UI-06, E2E-01 | AC-43 | API-18 |
| AC-10 | UI-07 | AC-44 | API-20 |
| AC-11 | UI-10, E2E-02 | AC-45 | API-21 |
| AC-12 | UI-09 | AC-46 | API-23 |
| AC-13 | UI-11 | AC-47 | API-24 |
| AC-14 | API-10 | AC-48 | API-25 |
| AC-15 | UNIT-01, API-02 | AC-49 | UI-18, E2E-06 |
| AC-16 | API-03 | AC-50 | UI-19, E2E-06 |
| AC-17 | UI-12 | AC-51 | UI-20 |
| AC-18 | API-04 | AC-52 | UI-21 |
| AC-19 | API-05 | AC-53 | API-28, UI-24 |
| AC-20 | API-07 | AC-54 | **VIS-01 (manual)** |
| AC-21 | UI-14 | AC-55 | RESP-01 |
| AC-22 | UI-15 | AC-56 | RESP-06, STYLE-09 |
| AC-23 | API-09, UI-13 | AC-57 | STYLE-01 |
| AC-24 | API-30, UI-31 | AC-58 | STYLE-06 |
| AC-25 | API-31, UI-31 | AC-59 | STYLE-05 |
| AC-26 | API-32 | AC-60 | UNIT-04, UI-25 |
| AC-27 | API-33 | AC-61 | UI-16 |
| AC-28 | API-43 | AC-62 | UI-22 |
| AC-29 | API-34 | AC-63 | API-12 |
| AC-30 | API-35, E2E-03 | AC-64 | API-42 |
| AC-31 | API-36 | AC-65 | API-13 |
| AC-32 | UI-26, E2E-03 | AC-66 | API-14 |
| AC-33 | UI-27 | AC-67 | API-08 |
| AC-34 | API-38, UI-29, E2E-03 | | |

**Coverage: 67 of 67.** 66 are discharged by an automated test. One, **AC-54**, is
discharged by the manual visual checklist in section 4, because it asks whether a rendered
screen matches a visual specification - a judgement no assertion in this sprint makes.
Its screenshots are produced automatically by RESP-05, so the evidence is reproducible even
though the comparison is human. This is stated rather than papered over with an automated
test that would assert something narrower than the criterion.

---

## 4. Responsive and Visual Checklist

**VIS-01.** This is the predicate AC-54 names. Every row is ticked by a person looking at
the screenshots RESP-05 writes, at each of the three viewports, against `ui-spec.md`.
Three columns: D = 1280 px, T = 834 px, M = 390 px.

Completed during Issue #16 against the captures in `artifacts/lab-02/screenshots/` as
regenerated on `feature/7-e2e-visual`. Rows that name a colour, a height, a width or a
count were measured in the browser at each viewport (computed styles and bounding boxes)
and, for rows 1 and 5, by reading pixels from the PNGs; rows about legibility, clipping,
overlap and greyscale were checked by eye, the greyscale ones on greyscale conversions of
the captures. Two rows needed a change before they passed; both are recorded under the
tables and in section 7 item 8.

### 4.1 Colour and tokens

| # | Check | D | T | M |
|---|---|---|---|---|
| 1 | App header is `#006B3C` | ✓ | ✓ | ✓ |
| 2 | Primary buttons are `#006B3C` with white text | ✓ | ✓ | ✓ |
| 3 | Links, hover and focus accents are `#0B7A46` | ✓ | ✓ | ✓ |
| 4 | Selected and success surfaces are `#EAF6EF` | ✓ | ✓ | ✓ |
| 5 | Page ground is `#F5F7F6` and card surface is `#FFFFFF` | ✓ | ✓ | ✓ |
| 6 | Body text is `#1F2A24`, not pure black | ✓ | ✓ | ✓ |

### 4.2 Fields

| # | Check | D | T | M |
|---|---|---|---|---|
| 7 | Read-only fields are visibly shaded against editable ones | ✓ | ✓ | ✓ |
| 8 | The read-only difference survives a greyscale screenshot | ✓ | ✓ | ✓ |
| 9 | All single-line controls share one height | ✓ | ✓ | ✓ |
| 10 | Description is taller than the single-line controls | ✓ | ✓ | ✓ |
| 11 | Every required label shows the red asterisk | ✓ | ✓ | ✓ |
| 12 | Every validation message sits directly below its own control | ✓ | ✓ | ✓ |
| 13 | No validation message appears only at the top of the form | ✓ | ✓ | ✓ |

### 4.3 Buttons and badges

| # | Check | D | T | M |
|---|---|---|---|---|
| 14 | Exactly one primary button per screen | ✓ | ✓ | ✓ |
| 15 | Disabled buttons are visibly distinct from enabled ones | ✓ | ✓ | ✓ |
| 16 | The submitting screenshot shows a spinner and `Submitting…` | ✓ | ✓ | ✓ |
| 17 | Priority badges are pills; status badges are square-cornered | ✓ | ✓ | ✓ |
| 18 | Every badge reads as text, title case, not raw enum | ✓ | ✓ | ✓ |
| 19 | No IT Priority badge appears on any screen | ✓ | ✓ | ✓ |

### 4.4 States

| # | Check | D | T | M |
|---|---|---|---|---|
| 20 | Selection loading, populated, empty and failure all captured | ✓ | ✓ | ✓ |
| 21 | The "not a login screen" text is legible in the Selection screenshot | ✓ | ✓ | ✓ |
| 22 | Create Ticket initial, validation, submitting, success, API failure and invalid attachment all captured | ✓ | ✓ | ✓ |
| 23 | The success screenshot shows the Ticket Number | ✓ | ✓ | ✓ |
| 24 | The API-failure screenshot still shows the entered values | ✓ | ✓ | ✓ |
| 25 | `No tickets yet` and `No matches` differ in heading and in action | ✓ | ✓ | ✓ |
| 26 | A removed attachment shows its reason and offers no Download or Preview | ✓ | ✓ | ✓ |

### 4.5 Layout

| # | Check | D | T | M |
|---|---|---|---|---|
| 27 | No label is clipped or truncated mid-word | ✓ | ✓ | ✓ |
| 28 | No message overlaps another element | ✓ | ✓ | ✓ |
| 29 | No button is hidden or pushed off-screen | ✓ | ✓ | ✓ |
| 30 | Every attachment filename is readable in full or safely truncated with the full name available | ✓ | ✓ | ✓ |
| 31 | No horizontal page scrolling | ✓ | ✓ | ✓ |
| 32 | My Tickets is a table at D and cards at M | ✓ | ✓ | ✓ |
| 33 | Touch targets are at least 44 px at M | n/a | n/a | ✓ |
| 34 | Ticket Summary and Description have full width at every viewport | ✓ | ✓ | ✓ |

### 4.6 Accessibility

| # | Check | D | T | M |
|---|---|---|---|---|
| 35 | The focused control shows a visible ring in the focus screenshot | ✓ | ✓ | ✓ |
| 36 | The active nav item is bold and underlined, not colour-only | ✓ | ✓ | ✓ |
| 37 | Validation, badge and success meaning survives greyscale | ✓ | ✓ | ✓ |

**Notes on rows that were not a plain tick.**

- **Row 14.** Create Ticket has exactly one primary (`Submit Ticket`; `View Ticket` after
  success), the Selection screen one (`Continue`), and the My Tickets empty state one
  (`Create Ticket`). The populated My Tickets list and Ticket Detail have **no** primary,
  because `ui-spec.md` 12.1 and 13 give them none: their actions are the tertiary row
  links, the secondary `Back to My Tickets` and the destructive `Remove`. Read as "never
  more than one", the row holds on every screen; read as "always one", it cannot hold on
  those two screens without inventing an action the spec does not have. Ticked on the
  first reading.
- **Row 33 - failed at M before Issue #16, fixed in the UI.** Every single-line control
  and button was 2.5 rem (40 px) at every band, per `ui-spec.md` section 4, so the
  search box, the filter selects, the pagination buttons, the brand link, the toggler and
  `Back to My Tickets` all measured 40 px at 390 px. `client/src/theme.css` now gives every
  single-line control and button 2.75 rem (44 px) below `md`, keeping row 9 true within
  the band; `ui-spec.md` section 4 records the band rule. Re-measured: no visible control
  under 44 px on any of the four screens at M. D and T are marked n/a because the row is
  scoped to M.
- **Row 35 - the focus capture is an addition.** `ui-spec.md` 15 names no focus
  screenshot, so RESP-06 writes `create-ticket/create-<vp>-focus.png` with Ticket
  Summary focused. The first capture was taken before Bootstrap's 150 ms transition had
  painted the ring; RESP-06 now waits for the computed border and box-shadow before the
  shot. The same wait was added to every Create Ticket capture so no `Submit Ticket`
  button is caught half-painted.
- **Row 8 and row 37.** Measured, not assumed: read-only `#EDF1EE` and editable `#FFFFFF`
  are 16 luminance levels apart (239 vs 255) and remain distinguishable in a greyscale
  conversion; priority pills and square status badges differ in shape and in text; the
  success panel says `Ticket created` in words; validation messages carry text below
  their control.

---

## 5. Test Commands

The API tests and Playwright both need the real database, so the container starts first.
`webServer` is disabled in `playwright.config.ts` (C-10) precisely so a missing container
fails visibly here rather than looking like a test failure.

**Manual start sequence**

```bash
# 1. Database - from the repository root
docker start toktickit-db
docker ps --filter name=toktickit-db      # confirm it is running

# 2. Migrations and seed - first run, or after a schema change
cd server
npx prisma migrate deploy                  # never `migrate reset` (C-37)
npm run prisma:seed                        # idempotent, safe to repeat
npx tsx prisma/seed-demo.ts                # non-graded demo data (C-22)

# 3. API - leave running
cd server
npm run dev                                # http://localhost:3000

# 4. Client - leave running, second terminal
cd client
npm run dev                                # http://localhost:5173
```

Two notes on the commands above, both verified against the repository rather than assumed:

- `npx prisma migrate deploy` is used in preference to the repository's own
  `npm run prisma:migrate`, which runs `prisma migrate dev`. On schema drift `migrate dev`
  offers to reset the database, and C-37 forbids a reset because it destroys the Lab 1 seed
  data. `migrate deploy` applies pending migrations and can never reset.
- The demo seed is invoked directly with `npx tsx`. `server/package.json` has a
  `prisma:seed` script but no `prisma:seed:demo`, and `server/prisma/seed-demo.ts` does not
  exist yet - it is created with the data-model work under C-22. Adding a matching script is
  optional; the direct invocation needs no package change.

**Test commands**

```bash
# Unit and API - server suite, includes the Lab 1 tests
cd server && npm test

# UI component and UI style - client suite, includes the repointed Lab 1 test (C-04)
cd client && npm test

# Responsive and E2E - repository root, needs steps 1, 3 and 4 running
npm run test:e2e

# Screenshots only, if the artifacts need regenerating
npx playwright test e2e/lab-02 --project=desktop --project=tablet --project=mobile
```

---

## 6. Final Results

Filled in from the run on the final `main` branch. Paste the terminal output for each
command, not a summary of it.

| Suite | Command | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server: unit + API | `cd server && npm test` | | | | |
| Client: UI + UI style | `cd client && npm test` | | | | |
| Responsive + E2E | `npm run test:e2e` | | | | |

Required for the Definition of Done: every suite green on the final `main`, nothing
skipped, disabled, commented out or marked `.only`, and the VIS-01 checklist completed with
no unresolved row.

```
[paste `cd server && npm test` output here]
```

```
[paste `cd client && npm test` output here]
```

```
[paste `npm run test:e2e` output here]
```

---

## 7. Known Limitations or Deferred Tests

1. **AC-54 is verified manually.** It asks whether a rendered screen matches a visual
   specification, which no assertion in this sprint makes. VIS-01 is its predicate and
   RESP-05 supplies the screenshots. An automated visual-regression baseline is the right
   answer at a scale this sprint does not reach.

2. **`client/tests/lab-02/RequesterSelection.test.tsx` is an addition to the `LS 12` tree**,
   settled by **C-48**. Section 12 lists four client test files and none covers the
   Development Requester Selection screen, yet nine criteria - AC-02, AC-04 to AC-10 and
   AC-12 - belong to it. Section 12 is a stated minimum and C-08 set the precedent, so the
   tests go in a correctly named new file rather than being pushed into
   `CreateTicket.test.tsx`, where they would make that filename inaccurate.

3. **No test asserts BR-22's clause ordering.** BR-22 requires the list query to be scoped
   to the Requester *before* search, filter or sort is applied. API-15 proves the outcome -
   no other Requester's Ticket is ever returned - but the internal ordering of query
   construction is not observable through the API, so nothing can fail on it.

4. **Concurrency is untested.** Assumption 1 in `specification.md` section 11 states that
   one Requester operates one browser at a time, so the five-slot attachment check (BR-44)
   has no concurrent-upload test. Two simultaneous uploads into the fifth slot are outside
   the sprint's assumptions.

5. **500 responses are provoked, not natural.** API-14 and API-34 force failures by stubbing
   the data layer. This proves the safe-error contract and the compensation path, but it
   does not prove that no other code path can leak internal detail.

6. **Lab 1 coverage is regression only.** UI-32 and API-44 assert the Lab 1 contract still
   holds. No new Lab 1 behaviour is tested, because none was added.

7. **DB-01..DB-08 were added during Issue #11**, after the plan was written. The schema,
   migration and seed carry Definition of Done items - "`schema.prisma` matches section 7,
   including every index" and "`npm run prisma:seed` run twice creates no duplicate rows" -
   that no planned test at any of the six `LS 9.2` levels covered, because none of the six
   levels observes the database directly. `server/tests/lab-02/data-model.db.test.ts` is an
   addition to the `LS 12` tree on the same basis as C-08 and C-48. Their `Final` column is
   marked Pass from the run on `feature/2-data-model`, not from the final `main`; it is
   re-run with the rest of the server suite in section 6.

8. **The `Final` column and VIS-01 were filled during Issue #16, not on the final `main`.**
   Every one of the 111 planned tests is implemented and was green on `feature/7-e2e-visual`
   (server 86, client 48, Playwright 126 across the four `e2e/lab-02` files). No planned
   test is unimplemented, skipped or marked `.only`. RESP-04 asserts the inline header at
   D and T rather than skipping there, so the suite reports zero skips. Section 6 stays
   empty until Issue #17 runs the three commands on `main`, which is the run the
   Definition of Done names. Two additions beyond the plan: STYLE-03 and STYLE-04 each
   gained a second `it` (button hierarchy per `ui-spec.md` 7; read-only versus editable
   surfaces in the theme), and the focus capture of row 35 above.
