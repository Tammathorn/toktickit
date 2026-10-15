# Lab 4 API Contract

TokTickIT - CPE 334 Individual Sprint 4.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding REST contract for Lab 4. It answers `LS 6`, `LS 6.1` and
`LS 6.2`.

`docs/lab-04/specification.md` governs. Where this document and the specification disagree,
the specification wins and the disagreement is a defect to report, not to resolve locally.
References: `BR-nn`, `FR-nn`, `AC-nn` are Lab 4 (`specification.md`); `C-nnn` from C-122 is
a Lab 4 decision; Lab 3 and Lab 2 rules are cited `L3 BR-nn`, `L3 C-nn`, `L2 C-nn`.

`docs/lab-03/api-spec.md` remains the full contract for every endpoint this document does not
change; it is cited `L3 api x.y`. This document restates only what Lab 4 adds or changes, so
an endpoint absent from sections 3 to 5 is unchanged from Lab 3.

**Thirty-six endpoints.** Six are new (sections 3 and 4), fourteen are Lab 2-3 endpoints whose
contract changes (section 5), and sixteen are unchanged. Section 8.1 is the inventory.

The five places where the first draft needed a rule `specification.md` did not state are
recorded in section 9; each is now closed by a decision row (C-175 to C-179).

---

## 1. Conventions

Carried unchanged from `L3 api 1`: base path `/api`, JSON bodies (multipart for upload),
identity only from the `tt_session` cookie (BR-03, L3 C-64), ISO 8601 UTC timestamps with `Z`,
and no password, `passwordHash` or session token in any body or log line (L3 BR-88).

**New in Lab 4:**

- **Request timestamps carry an offset.** `actionAt` is sent as ISO 8601 **with an explicit
  offset** (`2026-10-14T09:00:00+07:00`); a value without one is 400 (BR-07). The server
  stores UTC and returns `Z`.
- **`version`** is an integer in the body of every Ticket PATCH and every action edit, complete
  and cancel (BR-36). Claim and the Requester's flag send none (BR-38).
- **`clientRequestId`** is an optional UUID (RFC 4122 string) on the four creates (BR-42).

### 1.1 Error envelope

Unchanged from `L3 api 1.1`:

```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "That item does not exist." } }
```

`fields` is present only on `VALIDATION_FAILED` and `INVALID_QUERY_PARAM`, keyed by field.
**One code adds one key (C-173):** `RESOLUTION_GATE_NOT_MET` carries `reasons`, the array BR-29
requires, inside `error`, the same way `fields` sits inside it for validation:

```json
{
  "error": {
    "code": "RESOLUTION_GATE_NOT_MET",
    "message": "This ticket cannot be resolved yet.",
    "reasons": ["NO_COMPLETED_ACTION", "PLANNED_ACTIONS_OPEN"]
  }
}
```

`STALE_UPDATE` uses the plain envelope; it carries no copy of the current resource. The client
re-fetches the Ticket (BR-39, C-138).

Every message string is the one `ui-spec.md` section 6 fixes; server and client emit the same
text.

### 1.2 Status codes

`L3 api 1.2` unchanged. Lab 4 adds no new status; it adds codes to 200 (a replayed create,
BR-43), 400, 404 and 409.

| Status | Lab 4 additions |
|---|---|
| 200 | A replayed create (`clientRequestId` already used by this author) - same body shape as the first success (C-165) |
| 201 | Action Taken created |
| 400 | Missing or non-integer `version`; an action field out of bounds; `actionAt` without an offset; `statusGroup` with `currentStatus` |
| 404 | `ACTION_NOT_FOUND` |
| 409 | `STALE_UPDATE`, `RESOLUTION_GATE_NOT_MET`, `PLANNED_ACTIONS_OPEN`, `TICKET_RESOLVED`, `ACTION_NOT_PLANNED` |
| 422 | `ASSIGNEE_NOT_ELIGIBLE` on an action's assignee |

### 1.3 Error code catalogue

Every code the API can emit. Lab 4 rows are marked **4**; `4Δ` is a Lab 3 code whose scope
Lab 4 widens. A code absent from this table is a defect.

| Lab | `code` | Status | Raised when |
|---|---|---|---|
| 3 · 4Δ | `VALIDATION_FAILED` | 400 | A body field fails a rule; `fields` names each. Lab 4: action fields (BR-04 to BR-07), a missing or non-integer `version` (BR-36), a malformed `clientRequestId` |
| 3 · 4Δ | `INVALID_QUERY_PARAM` | 400 | A query or path parameter is unparseable or out of set (L3 C-113). Lab 4: `statusGroup` other than `open`, `requesterResolved` other than `true`, and `statusGroup` with `currentStatus` (BR-88) |
| 3 | `SAME_STATUS` | 400 | A status change targets the current status (L3 C-77; BR-89 step 2) |
| 3 | `AUTH_REQUIRED` | 401 | No valid session |
| 3 | `INVALID_CREDENTIALS` | 401 | Login failure, one body for every cause |
| 3 | `ACCOUNT_INACTIVE` | 403 | Login whose password verified on an inactive account |
| 3 | `PASSWORD_CHANGE_REQUIRED` | 403 | The password-change gate is set |
| 3 · 4Δ | `FORBIDDEN_ROLE` | 403 | The role may never perform the operation, raised before any load. Lab 4: a Requester on any action write or on `GET /api/dashboard/staff`; IT Staff or Administrator on `GET /api/dashboard/requester` (BR-17, BR-59, BR-60) |
| 3 | `ORIGIN_NOT_ALLOWED` | 403 | A state-changing request with a foreign `Origin` |
| 3 | `TICKET_NOT_FOUND` | 404 | No such Ticket, or not this caller's |
| **4** | `ACTION_NOT_FOUND` | 404 | No Action Taken with that id (C-172). A Requester gets 403 `FORBIDDEN_ROLE` first, before any load, so this means genuine absence |
| 3 | `ATTACHMENT_NOT_FOUND` | 404 | No such Attachment, or not this caller's |
| 3 | `USER_NOT_FOUND` | 404 | No such User (Administrator routes) |
| 3 | `ALREADY_OWNED` | 409 | Claim lost the race |
| 3 | `OWNER_REQUIRED` | 409 | A move into a worked status without an owner, or unassigning in one. On `-> RESOLVED` it is checked **before** the gate (BR-28) |
| 3 · 4Δ | `TICKET_CLOSED` | 409 | A write on a `CLOSED` or `CANCELLED` Ticket. Lab 4: also every action write (BR-24). The status route answers `INVALID_STATUS_TRANSITION` instead (BR-89 step 3) |
| **4** | `TICKET_RESOLVED` | 409 | An action write on a `RESOLVED` Ticket - "Reopen it first" (BR-24, C-122) |
| 3 · 4Δ | `INVALID_STATUS_TRANSITION` | 409 | A target outside the 5.1 matrix (BR-89 step 6), or any target from `CLOSED` or `CANCELLED` (step 3) |
| **4** | `STALE_UPDATE` | 409 | The `version` sent is not the current one; nothing changes (BR-36) |
| **4** | `RESOLUTION_GATE_NOT_MET` | 409 | A move to `RESOLVED` with an owner, but the gate fails. `error.reasons` lists every applicable reason, in the fixed order `NO_COMPLETED_ACTION`, `PLANNED_ACTIONS_OPEN`, `FOLLOW_UP_REQUIRED`, `NO_ACTION_SINCE_REOPEN` (BR-29, C-167) |
| **4** | `PLANNED_ACTIONS_OPEN` | 409 | A move to `CANCELLED` while the Ticket has a `PLANNED` action (BR-33, C-124). The same string is also a gate **reason**, never a top-level code on `-> RESOLVED` |
| **4** | `ACTION_NOT_PLANNED` | 409 | Edit, complete or cancel on an action that is `COMPLETED` or `CANCELLED` (BR-14, C-162) |
| 3 | `RESOLUTION_NOT_PERMITTED_IN_STATUS` | 409 | The Requester's flag outside Open, In Progress, Waiting for Requester or Reopened |
| 3 | `EMAIL_TAKEN` | 409 | Duplicate email |
| 3 | `LAST_ADMINISTRATOR` | 409 | The change would leave no active Administrator |
| 3 | `ATTACHMENT_REMOVED` | 410 | The Attachment is soft-removed |
| 3 | `FILE_TOO_LARGE` | 413 | Upload over 5 MB |
| 3 | `UNSUPPORTED_FILE_TYPE` | 415 | Upload outside the permitted types |
| 3 | `CURRENT_PASSWORD_INCORRECT` | 422 | Wrong current password on change-password |
| 3 · 4Δ | `ASSIGNEE_NOT_ELIGIBLE` | 422 | The named user is a Requester, inactive or unknown. Lab 4: also an action's `assigneeId` on create and edit (BR-18, L3 BR-48) |
| 3 | `SELF_DEACTIVATION` | 422 | An Administrator deactivating their own account |
| 3 | `ATTACHMENT_LIMIT_REACHED` | 422 | Five active Attachments already |
| 3 | `REMOVAL_REASON_REQUIRED` | 422 | Empty removal reason |
| 3 | `INTERNAL_ERROR` | 500 | Anything unhandled, safely |

**The gate reasons** are values inside `error.reasons`, not codes:

| Reason | True when (BR-29 to BR-31) |
|---|---|
| `NO_COMPLETED_ACTION` | The Ticket has no `COMPLETED` action |
| `PLANNED_ACTIONS_OPEN` | The Ticket has a `PLANNED` action |
| `FOLLOW_UP_REQUIRED` | The latest `COMPLETED` action by `finishedAt desc, id desc` has `followUpRequired` true |
| `NO_ACTION_SINCE_REOPEN` | The Ticket has a status-history row into `REOPENED` and no action has a `finishedAt` after the latest such row |

---

## 2. Check order

### 2.1 Every write except the status change (BR-40)

One shared order, so the status for any request is deterministic. Steps 1 to 6 are Lab 3's
(`L3 api 1.4`); 7 to 11 are C-138 with C-159, C-162 and C-166.

1. **Session** - none -> 401 `AUTH_REQUIRED`.
2. **Password-change gate** -> 403 `PASSWORD_CHANGE_REQUIRED`.
3. **Role** - the role may never perform this operation -> 403 `FORBIDDEN_ROLE`, before any
   load, so it is identical whether or not the resource exists.
4. **Path parameters** - not a positive integer -> 400 `INVALID_QUERY_PARAM`.
5. **Load** - the Ticket, or for `/api/actions/:id` the action and then its Ticket -> 404.
6. **Ownership** - a Requester's Ticket that is not theirs -> 404 `TICKET_NOT_FOUND`.
7. **Replay lookup** (the four creates only) - this author has already used this
   `clientRequestId` -> **200** with the original, same body shape as a first success. The
   body is not compared (C-165, C-166). Runs before step 8, so a replay succeeds on a Ticket
   that has since closed.
8. **Ticket state** - `CLOSED` or `CANCELLED` -> 409 `TICKET_CLOSED`; for an action write,
   `RESOLVED` -> 409 `TICKET_RESOLVED` (BR-24, C-159).
9. **Body validation** -> 400 `VALIDATION_FAILED` with `fields`, including a missing or
   non-integer `version`.
10. **Stale check** - `version` is not the current one -> 409 `STALE_UPDATE`. Each write's
    UPDATE is conditional on the version, so a race lost after this check is also
    `STALE_UPDATE`.
11. **The operation's own refusals** - on an action edit `ACTION_NOT_PLANNED` (409) and then
    `ASSIGNEE_NOT_ELIGIBLE` (422), in that order (C-176); elsewhere `OWNER_REQUIRED` on
    unassign (409) and `ALREADY_OWNED` (409).

The `Origin` check runs before step 1 on `POST`, `PATCH` and `DELETE` (L3 C-58).

**Every action write and every Ticket status change** opens its transaction with a conditional
`UPDATE "Ticket" ... WHERE id = :id` that also sets `lastActivityAt` - the row lock of BR-34.
Writes on one Ticket therefore serialize; a gate check cannot be overtaken by a planned-action
insert.

### 2.2 `PATCH /api/staff/tickets/:id/status` (BR-89, C-164)

After steps 1 to 5 of section 2.1 (there is no ownership step for staff and no replay):

1. `currentStatus` absent or not one of the eight statuses -> 400 `VALIDATION_FAILED`.
2. Target equals the current status -> 400 `SAME_STATUS`.
3. Current status `CLOSED` or `CANCELLED` -> 409 `INVALID_STATUS_TRANSITION`.
4. `version` missing or not an integer -> 400 `VALIDATION_FAILED` (`fields.version`).
5. `version` stale -> 409 `STALE_UPDATE`.
6. Move outside the matrix -> 409 `INVALID_STATUS_TRANSITION`.
7. Target in a worked status and no owner -> 409 `OWNER_REQUIRED`; then, on `-> RESOLVED`,
   the gate -> 409 `RESOLUTION_GATE_NOT_MET`; then, on `-> CANCELLED`, a `PLANNED` action ->
   409 `PLANNED_ACTIONS_OPEN`.

Steps 1, 2, 3 and 6 are Lab 3's own order with nothing removed; 4 and 5 are inserted. A
terminal Ticket is refused whatever `version` the client holds, and API-64, API-66, API-67,
API-69, API-119 and API-121 keep their assertions (C-164).

---

## 3. Actions Taken endpoints

**IT Staff and Administrator only.** A Requester receives 403 `FORBIDDEN_ROLE` at step 3,
before the Ticket or action is loaded (BR-17). Any active staff user may write on any Ticket;
the assignee is not a permission (BR-19). There is no `GET` route: actions are embedded in
both Ticket Detail DTOs (section 6), and every write returns the full IT Staff Ticket DTO
(C-136), so the screen refreshes the Ticket summary from the response (FR-08).

Every action write also sets the Ticket's `lastActivityAt` (BR-46). None changes the Ticket's
`version` (BR-37) or its status (BR-16).

**Fields the operation does not accept** (BR-90, C-175). On these four routes only, a known
field the operation does not accept - `result` on a `PLANNED` create or on an edit,
`assigneeId` on complete or cancel, and the like - and any field the API does not define are
refused 400 `VALIDATION_FAILED`, with `fields.<name>` = `<name> is not accepted here.`. Two
groups are **silently ignored** instead, so BR-03 and L3 C-64 hold: the server-set fields
(`createdById`, `createdAt`, `performedById`, `finishedAt`, and `version` on create) and identity
fields (`requesterId`, `authorId` and the like) - a client can never assert who it is.
`clientRequestId` is accepted on create.

### 3.1 `POST /api/tickets/:id/actions`

| | |
|---|---|
| **Role** | IT Staff, Administrator |
| **Ticket state** | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` (BR-24) |
| **Serves** | FR-02, FR-03 |
| **Verified by** | AC-01, AC-03 to AC-14, AC-17, AC-22, AC-27 to AC-29, AC-37 to AC-39, AC-62, AC-64, AC-126 |

**Request body - planned**

```json
{
  "status": "PLANNED",
  "actionAt": "2026-10-16T10:00:00+07:00",
  "description": "Replace the laptop battery with the spare from the store room.",
  "assigneeId": 9,
  "attachmentNotes": "Photo of the battery label is attachment 2.",
  "clientRequestId": "6f1d0c2e-8a7b-4b8e-9d3f-2c1a5e7b9f10"
}
```

**Request body - recorded already completed**

```json
{
  "status": "COMPLETED",
  "actionAt": "2026-10-15T09:30:00+07:00",
  "description": "Ran the battery diagnostic.",
  "result": "Battery health 41%; replacement needed.",
  "followUpRequired": true,
  "followUpNote": "Order a replacement battery.",
  "clientRequestId": "0b9c7f4e-1d2a-4e3b-8c5d-7a6f9e8d1c2b"
}
```

| Field | Type | Rule | Trace |
|---|---|---|---|
| `status` | `"PLANNED"` \| `"COMPLETED"` | Required. `CANCELLED` is 400 | BR-09 |
| `actionAt` | string | Required. ISO 8601 with offset; >= the Ticket's `createdAt`; when `COMPLETED`, <= server now + 5 minutes | BR-07 |
| `description` | string | Required. Trimmed, 1-2000 | BR-04 |
| `assigneeId` | integer | Optional; absent means the caller. Must name an active IT Staff or Administrator user, else 422 `ASSIGNEE_NOT_ELIGIBLE` | BR-18 |
| `attachmentNotes` | string | Optional. 0-500, plain text | BR-06 |
| `result` | string | Required when `COMPLETED`. Trimmed, 1-2000 | BR-04, BR-11 |
| `followUpRequired` | boolean | When `COMPLETED`; default `false` | BR-05 |
| `followUpNote` | string | Required iff `followUpRequired` is true; 1-1000. Sent with `followUpRequired` false -> 400 | BR-05 |
| `clientRequestId` | string (UUID) | Optional | BR-42 |

The server sets `createdById` (the caller), `createdAt`, `version` 0, and for a `COMPLETED`
create `performedById` = the caller and `finishedAt` = `createdAt` (BR-13, C-160).

**Response 201** - the IT Staff Ticket DTO (section 6.2), its `actions` array including the new
row. **Response 200** on a replay - the same shape, with the original row (C-165).

| Status | Code | Condition |
|---|---|---|
| 201 | - | Created |
| 200 | - | Replay of this author's `clientRequestId` (section 2.1 step 7) |
| 400 | `INVALID_QUERY_PARAM` | `:id` not a positive integer |
| 400 | `VALIDATION_FAILED` | Any field rule above |
| 401 | `AUTH_REQUIRED` | No session |
| 403 | `PASSWORD_CHANGE_REQUIRED` / `FORBIDDEN_ROLE` | Gate set / the caller is a Requester (AC-03) |
| 404 | `TICKET_NOT_FOUND` | No such Ticket |
| 409 | `TICKET_RESOLVED` | The Ticket is `RESOLVED` (AC-37) |
| 409 | `TICKET_CLOSED` | The Ticket is `CLOSED` or `CANCELLED` (AC-38) |
| 422 | `ASSIGNEE_NOT_ELIGIBLE` | The assignee is a Requester, inactive or unknown (AC-27, AC-28) |
| 500 | `INTERNAL_ERROR` | Unexpected; nothing is half-written |

A concurrent duplicate that hits the `(createdById, clientRequestId)` unique constraint (Prisma
P2002) answers 200 with the original, never 500 (BR-43, AC-64).

### 3.2 `PATCH /api/actions/:id`

Edit a `PLANNED` action (BR-10).

```json
{
  "version": 0,
  "description": "Replace the battery and recalibrate.",
  "actionAt": "2026-10-16T14:00:00+07:00",
  "assigneeId": 7,
  "attachmentNotes": ""
}
```

| Field | Type | Rule |
|---|---|---|
| `version` | integer | Required; the action's `version` as last read (BR-36) |
| `description` | string | Optional; as 3.1 |
| `actionAt` | string | Optional; as 3.1 for a `PLANNED` action |
| `assigneeId` | integer | Optional. Eligibility as 3.1 is checked **only when it differs from the stored assignee**; re-sending the stored assignee, even one since deactivated, is accepted (BR-18, C-177) |
| `attachmentNotes` | string | Optional; 0-500 |

At least one editable field is required; `{ "version": n }` alone is 400. An edit whose values
all equal the stored ones answers 200 with **no write**: the action `version` and the Ticket's
`lastActivityAt` stay as they were (BR-90, C-175).

Success increases the action's `version` by one (BR-37).

**Response 200** - the IT Staff Ticket DTO.

| Status | Code | Condition |
|---|---|---|
| 200 | - | Saved |
| 400 | `INVALID_QUERY_PARAM` / `VALIDATION_FAILED` | Bad `:id` / a field rule, a missing `version`, no editable field, or a field not accepted here (C-175) |
| 401, 403 | as 3.1 | |
| 404 | `ACTION_NOT_FOUND` | No such action |
| 409 | `TICKET_RESOLVED` / `TICKET_CLOSED` | The action's Ticket is Resolved / terminal |
| 409 | `STALE_UPDATE` | `version` is not current (AC-55) |
| 409 | `ACTION_NOT_PLANNED` | The action is `COMPLETED` or `CANCELLED` (AC-23); a stale version answers `STALE_UPDATE` first (AC-121) |
| 422 | `ASSIGNEE_NOT_ELIGIBLE` | AC-27, AC-28 |
| 500 | `INTERNAL_ERROR` | |

### 3.3 `POST /api/actions/:id/complete`

```json
{
  "version": 1,
  "result": "Battery replaced; holds charge for 6 hours.",
  "followUpRequired": false,
  "actionAt": "2026-10-16T14:20:00+07:00"
}
```

| Field | Type | Rule |
|---|---|---|
| `version` | integer | Required |
| `result` | string | Required; trimmed, 1-2000 |
| `followUpRequired` | boolean | Required |
| `followUpNote` | string | Required iff `followUpRequired`; 1-1000 |
| `actionAt` | string | Optional (C-168). The final `actionAt` - this one, else the stored one - must be <= server now + 5 minutes and >= the Ticket's `createdAt`, else 400 at `actionAt` |

Sets `status` `COMPLETED`, `performedById` = the caller, `finishedAt` = server now, and
increases `version` (BR-11). A deactivated assignee does not block it (BR-19, AC-30).

**Response 200** - the IT Staff Ticket DTO. Errors as 3.2, without 422; 400 includes a future
final `actionAt` (AC-131, AC-132).

### 3.4 `POST /api/actions/:id/cancel`

```json
{ "version": 1, "result": "Requester bought a new laptop; battery no longer needed." }
```

| Field | Type | Rule |
|---|---|---|
| `version` | integer | Required |
| `result` | string | Required - the reason; trimmed, 1-2000 (BR-12) |

Sets `status` `CANCELLED`, `performedById` = the caller, `finishedAt` = server now, increases
`version`. **Response 200** - the IT Staff Ticket DTO. Errors as 3.3.

---

## 4. Dashboard endpoints

Computed at request time from authoritative rows, with `now` read once per request and passed
to every metric (BR-52). "Recent" is `>= now - 168 h`, inclusive (BR-53). "Active" is not
`CLOSED` and not `CANCELLED` (BR-54). No query parameters; no polling (BR-58). Each returns
concise data, never a Ticket collection: lists hold at most 5 rows, except "My planned
actions" (BR-56, BR-84).

**Common shape**

| Key | Type | Notes |
|---|---|---|
| `generatedAt` | ISO string | The `now` the metrics used |
| `timeZone` | `"Asia/Bangkok"` | For display (BR-52) |
| `cards` | array of `{ key, label, count, drillDown }` | Every card always present; a zero is `0` (BR-57) |
| `lists` | object | Each list `{ items, viewAll }`, `viewAll` null where none exists |

`drillDown` and `viewAll` are client URLs. Each card's `count` equals the total its drill-down
returns (BR-56). **Each list is in its drill-down's order, so its rows are the first rows of
that list** (C-161).

**List item** (Ticket lists): `{ id, ticketNumber, summary, currentStatus, itPriority,
lastActivityAt }`, plus `createdAt` on Urgent and `resolvedAt` on Recently resolved. No
Requester, no email, no description. Staff items link to `/queue/:id`, Requester items to
`/tickets/:id`.

### 4.1 `GET /api/dashboard/requester`

| | |
|---|---|
| **Role** | Requester only. IT Staff and Administrator -> 403 before any query (BR-59, AC-85) |
| **Scope** | Every query begins `requesterId = session user` (AC-02) |
| **Serves** | FR-20 |

| `key` | `label` | Query, in words | `drillDown` | BR |
|---|---|---|---|---|
| `openTickets` | `Open tickets` | own Tickets in New, Open, In Progress, Waiting for Requester, Reopened | `/tickets?statusGroup=open` | BR-73 |
| `waitingForYou` | `Waiting for you` | own Tickets in Waiting for Requester | `/tickets?currentStatus=WAITING_FOR_REQUESTER` | BR-74 |
| `resolvedAwaitingClosure` | `Resolved - awaiting closure` | own Tickets in Resolved | `/tickets?currentStatus=RESOLVED` | BR-75 |
| `closed` | `Closed` | own Tickets in Closed | `/tickets?currentStatus=CLOSED` | BR-76 |

| List | Rows | Order and tie-break | `viewAll` | BR |
|---|---|---|---|---|
| `recentlyUpdated` | own Tickets, `lastActivityAt >= now - 168 h`, at most 5 | `lastActivityAt desc, id desc` - My Tickets' order for `sort=lastActivityAt:desc` | `/tickets?sort=lastActivityAt:desc` | BR-77 |
| `recentlyResolved` | own Tickets, `resolvedAt >= now - 168 h` (Resolved or Closed), at most 5 | `resolvedAt desc, id desc` | null | BR-78 |

**Response 200**

```json
{
  "generatedAt": "2026-10-15T03:00:00.000Z",
  "timeZone": "Asia/Bangkok",
  "cards": [
    { "key": "openTickets", "label": "Open tickets", "count": 3, "drillDown": "/tickets?statusGroup=open" },
    { "key": "waitingForYou", "label": "Waiting for you", "count": 1, "drillDown": "/tickets?currentStatus=WAITING_FOR_REQUESTER" },
    { "key": "resolvedAwaitingClosure", "label": "Resolved - awaiting closure", "count": 1, "drillDown": "/tickets?currentStatus=RESOLVED" },
    { "key": "closed", "label": "Closed", "count": 4, "drillDown": "/tickets?currentStatus=CLOSED" }
  ],
  "lists": {
    "recentlyUpdated": {
      "items": [
        { "id": 42, "ticketNumber": "TKT-2026-000042", "summary": "Laptop battery drains quickly",
          "currentStatus": "IN_PROGRESS", "itPriority": "HIGH",
          "lastActivityAt": "2026-10-15T02:10:00.000Z" }
      ],
      "viewAll": "/tickets?sort=lastActivityAt:desc"
    },
    "recentlyResolved": {
      "items": [
        { "id": 37, "ticketNumber": "TKT-2026-000037", "summary": "Printer shows offline",
          "currentStatus": "CLOSED", "itPriority": "MEDIUM",
          "lastActivityAt": "2026-10-14T08:00:00.000Z",
          "resolvedAt": "2026-10-13T07:45:00.000Z" }
      ],
      "viewAll": null
    }
  }
}
```

No Internal Note, owner email, or staff-only field appears in this response.

| Status | Code | Condition |
|---|---|---|
| 200 | - | Requester |
| 401 | `AUTH_REQUIRED` | No session |
| 403 | `PASSWORD_CHANGE_REQUIRED` / `FORBIDDEN_ROLE` | Gate set / IT Staff or Administrator |
| 500 | `INTERNAL_ERROR` | |

### 4.2 `GET /api/dashboard/staff`

| | |
|---|---|
| **Role** | IT Staff, Administrator. A Requester -> 403 before any query (BR-60, AC-86) |
| **Serves** | FR-18, FR-19 |

| `key` | `label` | Query, in words | `drillDown` | BR |
|---|---|---|---|---|
| `unassigned` | `Unassigned` | active Tickets with no owner | `/queue?owner=unassigned` | BR-79 |
| `mine` | `Mine` | active Tickets owned by the caller | `/queue?owner=me` | BR-80 |
| `statusNew` | `New` | Tickets in New | `/queue?currentStatus=NEW` | BR-81 |
| `statusOpen` | `Open` | Tickets in Open | `/queue?currentStatus=OPEN` | BR-81 |
| `statusInProgress` | `In Progress` | Tickets in In Progress | `/queue?currentStatus=IN_PROGRESS` | BR-81 |
| `statusWaitingForRequester` | `Waiting for Requester` | Tickets in Waiting for Requester | `/queue?currentStatus=WAITING_FOR_REQUESTER` | BR-81 |
| `statusReopened` | `Reopened` | Tickets in Reopened | `/queue?currentStatus=REOPENED` | BR-81 |
| `statusResolved` | `Resolved` | Tickets in Resolved | `/queue?currentStatus=RESOLVED` | BR-81 |
| `highItPriority` | `High IT Priority` | active Tickets with IT Priority High | `/queue?itPriority=HIGH` | BR-82 |
| `requesterSaysResolved` | `Requester says resolved` | active Tickets with `requesterResolvedAt` set | `/queue?requesterResolved=true` | BR-83 |
| `myPlannedActions` | `My planned actions` | `PLANNED` actions assigned to the caller on active Tickets | `/dashboard#my-actions` | BR-84 |

| List | Rows | Order and tie-break | `viewAll` | BR |
|---|---|---|---|---|
| `myPlannedActions` | **every** such action - no cap, no paging; count = rows | `actionAt asc, id asc` | null (the panel is the drill-down) | BR-84, C-169 |
| `recentlyUpdated` | active Tickets, `lastActivityAt >= now - 168 h`, at most 5 | `lastActivityAt desc, id desc` - the queue's order for `sort=lastActivityAt:desc` | `/queue?sort=lastActivityAt:desc` | BR-85 |
| `urgent` | active Tickets, IT Priority High, at most 5 | `createdAt asc, id desc` - exactly what `/queue?itPriority=HIGH` returns (L2 C-29 tie-break) | `/queue?itPriority=HIGH` | BR-86, C-161 |

A planned-action item: `{ id, actionAt, description, ticket: { id, ticketNumber, summary,
currentStatus } }`. It links to the Ticket's staff detail.

**`userCounts`** - the Administrator only; absent, not null, for IT Staff (AC-87):

| `key` | `label` | `count` | `activeCount` | `drillDown` |
|---|---|---|---|---|
| `requesters` | `Requesters` | every `User` with role Requester | of those, `isActive` true | `/users?role=REQUESTER` |
| `itStaff` | `IT Staff` | every `User` with role IT Staff | likewise | `/users?role=IT_STAFF` |
| `administrators` | `Administrators` | every `User` with role Administrator | likewise | `/users?role=ADMINISTRATOR` |

`count` equals the row count of `GET /api/users?role=` (BR-87); `activeCount` is the "N active"
secondary text and has no drill-down.

**Response 200** (Administrator; abbreviated to three cards)

```json
{
  "generatedAt": "2026-10-15T03:00:00.000Z",
  "timeZone": "Asia/Bangkok",
  "cards": [
    { "key": "unassigned", "label": "Unassigned", "count": 4, "drillDown": "/queue?owner=unassigned" },
    { "key": "mine", "label": "Mine", "count": 0, "drillDown": "/queue?owner=me" },
    { "key": "myPlannedActions", "label": "My planned actions", "count": 1, "drillDown": "/dashboard#my-actions" }
  ],
  "lists": {
    "myPlannedActions": {
      "items": [
        { "id": 31, "actionAt": "2026-10-16T03:00:00.000Z",
          "description": "Replace the laptop battery with the spare from the store room.",
          "ticket": { "id": 42, "ticketNumber": "TKT-2026-000042",
                      "summary": "Laptop battery drains quickly", "currentStatus": "IN_PROGRESS" } }
      ],
      "viewAll": null
    },
    "recentlyUpdated": { "items": [], "viewAll": "/queue?sort=lastActivityAt:desc" },
    "urgent": {
      "items": [
        { "id": 18, "ticketNumber": "TKT-2026-000018", "summary": "VPN disconnects randomly",
          "currentStatus": "OPEN", "itPriority": "HIGH",
          "createdAt": "2026-10-02T01:00:00.000Z", "lastActivityAt": "2026-10-03T05:30:00.000Z" }
      ],
      "viewAll": "/queue?itPriority=HIGH"
    }
  },
  "userCounts": [
    { "key": "requesters", "label": "Requesters", "count": 5, "activeCount": 4, "drillDown": "/users?role=REQUESTER" },
    { "key": "itStaff", "label": "IT Staff", "count": 4, "activeCount": 3, "drillDown": "/users?role=IT_STAFF" },
    { "key": "administrators", "label": "Administrators", "count": 2, "activeCount": 2, "drillDown": "/users?role=ADMINISTRATOR" }
  ]
}
```

| Status | Code | Condition |
|---|---|---|
| 200 | - | IT Staff or Administrator |
| 401 | `AUTH_REQUIRED` | |
| 403 | `PASSWORD_CHANGE_REQUIRED` / `FORBIDDEN_ROLE` | Gate set / Requester |
| 500 | `INTERNAL_ERROR` | |

---

## 5. Changed Lab 2-3 endpoints

Each keeps its `L3 api` contract except what its box lists.

### 5.1 `POST /api/tickets` (`L3 api 4.1`)

> **Changed from Lab 3**
> - Optional `clientRequestId` (UUID); a replay returns **200** with the Requester Ticket DTO of
>   the original (C-139, C-165, C-166). Unique per `(requesterId, clientRequestId)`. Subject to
>   C-158's cut order: if cut, the field is ignored and every create is a 201.
> - Writes the creation status-history row, `fromStatus` null to `NEW` (C-167).
> - Sets `lastActivityAt` = creation time (BR-46); `version` 0.
> - The 201 body is the extended Requester Ticket DTO (section 6.1).

### 5.2 `GET /api/tickets` (`L3 api 4.2`)

> **Changed from Lab 3**
> - `statusGroup=open` - New, Open, In Progress, Waiting for Requester, Reopened (BR-55).
>   Any other value -> 400 `INVALID_QUERY_PARAM`. With `currentStatus` -> 400
>   `INVALID_QUERY_PARAM`, `fields.statusGroup` (BR-88, C-170).
> - `sort` accepts `lastActivityAt:asc|desc`, tie-break `id desc` as every sort (C-143).
> - Rows gain `lastActivityAt` (C-140).

### 5.3 `GET /api/tickets/:id` (`L3 api 4.3`)

> **Changed from Lab 3** - the Requester Ticket DTO gains `version`, `lastActivityAt`,
> `resolvedAt`, `actions` and `statusHistory` (section 6.1). Still no Internal Note key, and
> no staff email anywhere (C-123, L3 C-95).

### 5.4 `POST /api/tickets/:id/requester-resolved` (`L3 api 4.4`)

> **Changed from Lab 3**
> - Sends **no** `version`; increases the Ticket `version` (BR-38, C-163).
> - Sets `lastActivityAt` (BR-46).
> - A repeat stays permitted, as `L3 api 4.4`: it overwrites the timestamp and, being a write,
>   moves `version` and `lastActivityAt` again (BR-38, C-178).

### 5.5 `POST /api/tickets/:id/attachments` and `DELETE /api/attachments/:id` (`L3 api 5.2`, `5.4`)

> **Changed from Lab 3** - a successful upload and a successful soft removal each set the
> Ticket's `lastActivityAt` (BR-46). Neither changes `version` (BR-37). Uploads have no
> `clientRequestId` (BR-45).

### 5.6 `POST /api/tickets/:id/public-comments` (`L3 api 6.2`)

> **Changed from Lab 3**
> - Optional `clientRequestId`; a replay returns **200** with the original comment row, unique
>   per `(authorId, clientRequestId)` (C-139, C-165, C-166).
> - Sets the Ticket's `lastActivityAt` (BR-46); `version` unchanged (BR-37).

### 5.7 `POST /api/tickets/:id/internal-notes` (`L3 api 7.2`)

> **Changed from Lab 3**
> - Optional `clientRequestId`, as 5.6.
> - **Never** writes `lastActivityAt` (BR-47) and never changes `version`.

### 5.8 `GET /api/staff/tickets` (`L3 api 8.1`)

> **Changed from Lab 3**
> - `requesterResolved=true` - `requesterResolvedAt IS NOT NULL`. Any other value -> 400
>   (C-143). Combines with the default status set like every other filter.
> - `sort` accepts `lastActivityAt:asc|desc`; `updatedAt` stays for the Lab 3 test (BR-48).
> - Rows gain `lastActivityAt` (C-140).

### 5.9 `GET /api/staff/tickets/:id` (`L3 api 8.2`)

> **Changed from Lab 3** - the IT Staff Ticket DTO gains `version`, `lastActivityAt`,
> `resolvedAt`, `actions`, `statusHistory`, `allowedTransitions` and `resolutionGate`
> (section 6.2).

### 5.10 `POST /api/staff/tickets/:id/claim` (`L3 api 8.3`)

> **Changed from Lab 3** - still no body and no `version` (already conditional, L3 C-75); a
> successful claim increases `version` and sets `lastActivityAt` (BR-38, BR-46).

### 5.11 `PATCH /api/staff/tickets/:id/owner` (`L3 api 8.4`)

> **Changed from Lab 3**
> - Body gains required `version`: `{ "ownerId": 7, "version": 3 }`. Missing -> 400; stale ->
>   409 `STALE_UPDATE` (BR-36), in the section 2.1 order: `TICKET_CLOSED`, then body, then
>   stale, then `OWNER_REQUIRED` and `ASSIGNEE_NOT_ELIGIBLE`.
> - Success increases `version` and sets `lastActivityAt`.

### 5.12 `PATCH /api/staff/tickets/:id/it-priority` (`L3 api 8.5`)

> **Changed from Lab 3** - body gains required `version`
> (`{ "itPriority": "HIGH", "version": 3 }`), with the same 400 and 409 `STALE_UPDATE`; success
> increases `version` and sets `lastActivityAt`. Re-sending the current value stays 200.

### 5.13 `PATCH /api/staff/tickets/:id/status` (`L3 api 8.6`)

> **Changed from Lab 3**
> - Body: `{ "currentStatus": "RESOLVED", "version": 4 }`. Evaluated in the seven steps of
>   section 2.2.
> - `-> RESOLVED`: the gate after `OWNER_REQUIRED` (BR-28, BR-29); sets `resolvedAt`.
> - `-> REOPENED`: clears `resolvedAt`. `-> CLOSED`: keeps it (BR-49).
> - `-> CANCELLED`: refused 409 `PLANNED_ACTIONS_OPEN` while a `PLANNED` action exists (BR-33).
> - Every success: row lock first (BR-34), `version` + 1, `lastActivityAt` set, one
>   `TicketStatusChange` appended in the same transaction (BR-50), and the Lab 3 flag-clearing
>   on Resolved, Closed, Cancelled unchanged.
> - Replaces the silent three-attempt retry in `staff.ts`: a lost race is `STALE_UPDATE`, never
>   `INVALID_STATUS_TRANSITION` (C-138).

```json
{
  "error": {
    "code": "RESOLUTION_GATE_NOT_MET",
    "message": "This ticket cannot be resolved yet.",
    "reasons": ["FOLLOW_UP_REQUIRED"]
  }
}
```

### 5.14 `GET /api/users` (`L3 api 9.1`)

Unchanged as an API: `role` was already a query parameter. FR-24's change is that User
Management **reads** it from the URL, so `/users?role=IT_STAFF` opens filtered. Listed here
because the Administrator's user cards depend on it.

---

## 6. Response shapes

### 6.1 Requester Ticket DTO (`L3 api 10.2`, extended)

Lab 3 keys unchanged, plus:

| Key | Type | Notes |
|---|---|---|
| `version` | integer | Read-only for the Requester; no Requester write sends it (BR-38) |
| `lastActivityAt` | ISO string | "Last updated" (BR-48) |
| `resolvedAt` | ISO string \| null | BR-49 |
| `actions` | array | `actionAt desc, id desc` (BR-22); Requester action shape below |
| `statusHistory` | array | `changedAt, id` ascending (BR-23); people by `{ name }` only |
| `historyComplete` | boolean | False for a Ticket that predates the history (BR-51, C-179) |

**Requester action** - every field, people by name only, no ids, no `version` (BR-20):

```json
{
  "id": 31, "status": "COMPLETED",
  "actionAt": "2026-10-15T02:30:00.000Z",
  "description": "Ran the battery diagnostic.",
  "result": "Battery health 41%; replacement needed.",
  "followUpRequired": true, "followUpNote": "Order a replacement battery.",
  "attachmentNotes": null,
  "assignee": { "name": "Siriporn Chai" },
  "createdBy": { "name": "Siriporn Chai" },
  "performedBy": { "name": "Siriporn Chai" },
  "createdAt": "2026-10-15T02:31:10.000Z",
  "finishedAt": "2026-10-15T02:31:10.000Z"
}
```

**Status-history row (Requester)**:
`{ "id": 88, "fromStatus": null, "toStatus": "NEW", "changedBy": { "name": "Nicha Srisuk" },
"changedAt": "2026-10-10T01:00:00.000Z" }`.

**`historyComplete`** (boolean, both DTOs; BR-51, C-179): true when `statusHistory` holds the
creation row (`fromStatus` null -> `NEW`), false for a Ticket that predates the history. No
migration date is returned.

### 6.2 IT Staff Ticket DTO (`L3 api 10.5`, extended)

The 6.1 additions, with staff shapes, plus two keys:

| Key | Type | Notes |
|---|---|---|
| `actions` | array | Staff action shape below |
| `statusHistory` | array | `changedBy` as `{ id, name }` |
| `allowedTransitions` | `TicketStatus[]` | Every target the 5.1 matrix permits from the current status; `[]` on `CLOSED` and `CANCELLED`. Includes `RESOLVED` even when the gate fails (C-171) |
| `resolutionGate` | `{ met: boolean, reasons: string[] }` | The gate evaluated now, reasons in the fixed order (BR-27, C-171). Owner absence is not a reason (BR-28) |

**Staff action**:

```json
{
  "id": 32, "status": "PLANNED",
  "actionAt": "2026-10-16T03:00:00.000Z",
  "description": "Replace the laptop battery with the spare from the store room.",
  "result": null, "followUpRequired": false, "followUpNote": null,
  "attachmentNotes": "Photo of the battery label is attachment 2.",
  "assignee": { "id": 9, "name": "Kittipong Lee", "isActive": false },
  "createdBy": { "id": 7, "name": "Siriporn Chai", "isActive": true },
  "performedBy": null,
  "createdAt": "2026-10-15T02:40:00.000Z", "finishedAt": null,
  "version": 0,
  "allowedOperations": ["EDIT", "COMPLETE", "CANCEL"]
}
```

`allowedOperations` is FR-09 (C-174): `["EDIT", "COMPLETE", "CANCEL"]` for a `PLANNED` action on a
Ticket in a writable status (BR-24), else `[]`. `isActive` false renders "(inactive)". No
email on any person.

### 6.3 List rows

The Requester list row (`L3 api 10.3`) and the queue row (`L3 api 10.4`) each gain
`lastActivityAt`. The queue's "Last updated" column and sort use it (BR-48).

---

## 7. Authorization summary

`specification.md` section 5.2 is the authority for all 36 routes. The six Lab 4 rows:

| Endpoint | Anon | MustChange | Requester | IT Staff | Administrator |
|---|---|---|---|---|---|
| `POST /api/tickets/:id/actions` | 401 | 403 | 403 | 201 / 200 replay / 400 / 404 / 409 `TICKET_RESOLVED`, `TICKET_CLOSED` / 422 | as IT Staff |
| `PATCH /api/actions/:id` | 401 | 403 | 403 | 200 / 400 / 404 / 409 Ticket state, `STALE_UPDATE`, `ACTION_NOT_PLANNED` / 422 | as IT Staff |
| `POST /api/actions/:id/complete` | 401 | 403 | 403 | 200 / 400 / 404 / 409 as edit | as IT Staff |
| `POST /api/actions/:id/cancel` | 401 | 403 | 403 | 200 / 400 / 404 / 409 as edit | as IT Staff |
| `GET /api/dashboard/requester` | 401 | 403 | 200, own data | 403 | 403 |
| `GET /api/dashboard/staff` | 401 | 403 | 403 | 200 | 200 with `userCounts` |

Every 403 in a role column is raised before any load or query. The route-versus-matrix test
(C-155, FR-31) compares the registered routes with `specification.md` 5.2.

---

## 8. Traceability

### 8.1 Endpoint inventory

| § | Endpoint | Lab 4 status |
|---|---|---|
| `L3 api 2.1-2.4` | health, categories, related-systems, login | Unchanged |
| `L3 api 3.1-3.3` | me, change-password, logout | Unchanged |
| 5.1 | `POST /api/tickets` | Changed |
| 5.2 | `GET /api/tickets` | Changed |
| 5.3 | `GET /api/tickets/:id` | Changed |
| 5.4 | `POST /api/tickets/:id/requester-resolved` | Changed |
| `L3 api 5.1` | `GET /api/tickets/:id/attachments` | Unchanged |
| 5.5 | `POST /api/tickets/:id/attachments` | Changed |
| `L3 api 5.3` | `GET /api/attachments/:id/download` | Unchanged |
| 5.5 | `DELETE /api/attachments/:id` | Changed |
| `L3 api 6.1` | `GET /api/tickets/:id/public-comments` | Unchanged |
| 5.6 | `POST /api/tickets/:id/public-comments` | Changed |
| `L3 api 7.1` | `GET /api/tickets/:id/internal-notes` | Unchanged |
| 5.7 | `POST /api/tickets/:id/internal-notes` | Changed |
| 5.8 | `GET /api/staff/tickets` | Changed |
| 5.9 | `GET /api/staff/tickets/:id` | Changed |
| 5.10 | `POST /api/staff/tickets/:id/claim` | Changed |
| 5.11 | `PATCH /api/staff/tickets/:id/owner` | Changed |
| 5.12 | `PATCH /api/staff/tickets/:id/it-priority` | Changed |
| 5.13 | `PATCH /api/staff/tickets/:id/status` | Changed |
| `L3 api 8.7` | `GET /api/staff/assignable-users` | Unchanged |
| `L3 api 9.1-9.4` | the four user routes | Unchanged (5.14 notes the URL role filter) |
| 3.1-3.4 | the four action routes | New |
| 4.1, 4.2 | the two dashboard routes | New |

Seven unchanged auth and public routes, nine further unchanged routes, fourteen changed, six
new: 36, matching `specification.md` 5.2 row for row.

### 8.2 Requirement coverage

| Requirements | Served by |
|---|---|
| FR-01 to FR-09 - Actions Taken | 3.1 to 3.4, 6.1, 6.2 |
| FR-10 to FR-14 - workflow | 2.2, 5.13, 6.2 |
| FR-15 to FR-17 - activity time and queries | 5.2, 5.8, 6.3 |
| FR-18 to FR-24 - dashboards | 4.1, 4.2, 5.14 |
| FR-25 - duplicate submission | 2.1 step 7, 3.1, 5.1, 5.6, 5.7 |
| FR-31 - route versus matrix | 7, 8.1 |

---

## 9. Rules this document needed and could not find - all closed

The first draft declared five gaps and resolved none on its own authority. Each is now closed
by a decision row, cited in place above. Three shape choices the draft made were confirmed as
decisions too: `ACTION_NOT_FOUND` (C-172), `error.reasons` (C-173) and `allowedOperations`
(C-174).

| # | Where | Gap | Closed by | Answer |
|---|---|---|---|---|
| 1 | Section 3, 3.2 | A field an action operation does not accept; an empty or no-change edit | C-175 | 400 naming the field, except server-set and identity fields, which stay ignored; empty edit 400; no-change edit 200 with no write |
| 2 | 2.1 step 11 | `ACTION_NOT_PLANNED` versus `ASSIGNEE_NOT_ELIGIBLE` | C-176 | `ACTION_NOT_PLANNED` first |
| 3 | 3.2 | Re-sending a since-deactivated assignee | C-177 | Accepted; eligibility checked only on a change |
| 4 | 5.4 | A repeated "Problem Appears Resolved" | C-178 | A write: timestamp overwritten, `version` and `lastActivityAt` move |
| 5 | 6.1 | The legacy history line's date | C-179 | No date; `historyComplete` |
