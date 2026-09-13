# Lab 2 API Contract

TokTickIT - CPE 334 Individual Sprint 2.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding REST contract for Lab 2. It answers `LS 6`, `LS 6.1`,
`LS 6.3` and `LS 6.4`.

`docs/lab-02/specification.md` governs. Where this document and the specification
disagree, the specification wins and the disagreement is a defect to report, not to
resolve locally. Field names are taken verbatim from the specification's section 11
glossary. Rule references are `BR-nn`, requirement references `FR-nn`, criterion
references `AC-nn`, decision references `C-nn`.

Ten capabilities are required by `LS 6`. Ten endpoints are defined below.

---

## 1. Conventions

**Base path.** All endpoints are mounted under `/api`. The server runs on the port the
Lab 1 configuration already fixes.

**Content types.** Requests and responses are `application/json; charset=utf-8`, with two
exceptions: attachment upload is `multipart/form-data` (C-16), and attachment download
returns the stored file's own `Content-Type`.

**Identity transport (C-12, C-42).** `requesterId` is a client-supplied testing value. It
is never an authenticated identity (BR-64), and the server re-checks ownership on every
request regardless of what the client sends (BR-20, FR-44).

| Endpoint | Where `requesterId` travels |
|---|---|
| `POST /api/tickets` | JSON body field `requesterId` - the one creation endpoint (C-12) |
| Every other endpoint that needs it | Query parameter `?requesterId=` (C-42) |

C-42 settles the two endpoints C-12 did not reach - attachment upload and attachment
removal - by putting the identifier in the query string rather than in a multipart or
JSON body, so there is one rule to remember and one place to assert against.

**Timestamps.** Every timestamp in a response body is ISO 8601 with an explicit `Z`
offset, serialised from the UTC value in the database. BR-10's `DD MMM YYYY HH:mm`
Asia/Bangkok rendering is a display rule the client applies; the API never returns a
pre-formatted date.

**Reference data is not owned.** `GET /api/categories`, `GET /api/related-systems` and
`GET /api/requesters` carry no `requesterId` and perform no ownership check. The other
seven endpoints require one.

### 1.1 Error envelope

Every 4xx and 5xx response uses this shape. No response body ever contains a stack trace,
a SQL statement, a filesystem path or raw database error text (BR-38, AC-66).

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "That ticket does not exist."
  }
}
```

A validation failure adds a `fields` object keyed by the offending field. Each value is
the message `ui-spec.md` defines for that rule; the server emits no validation text that
is absent from that catalogue, and the client renders the identical string (BR-35, AC-23).

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields need attention.",
    "fields": {
      "summary": "Ticket Summary is required and must be between 5 and 120 characters.",
      "description": "Description is required and must be between 20 and 5000 characters."
    }
  }
}
```

### 1.2 Status codes

Fixed by `specification.md` section 8. No other status is returned by any endpoint.

| Status | Condition |
|---|---|
| 200 | Successful retrieval, successful download or preview, successful soft removal |
| 201 | Ticket created, Attachment created |
| 400 | Malformed input: a missing, unparseable or out-of-set parameter or body field |
| 403 | Ownership failure (BR-21), or a `requesterId` naming an inactive Requester (BR-55, C-45) |
| 404 | The addressed Ticket or Attachment does not exist (BR-21), or a `requesterId` naming no Requester at all (C-45) |
| 410 | The addressed Attachment is soft-removed and the caller owns it (BR-51) |
| 413 | Upload exceeds 5 MB (BR-43, BR-45) |
| 415 | Upload is not JPG, JPEG, PNG, WEBP or PDF (BR-42, BR-45) |
| 422 | A well-formed request that violates a business rule (BR-39) |
| 500 | Unexpected server error, reported safely (AC-66) |

409 is deliberately unused: the only two refusals of a well-formed request are business
rule violations, not resource-state conflicts.

### 1.3 Error code catalogue

| `code` | Status | Raised when |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Body fails a field rule; `fields` names each one (AC-67) |
| `INVALID_QUERY_PARAM` | 400 | `sort`, `pageSize`, `page`, `disposition` or a filter value is unparseable or out of set (BR-28, C-43) |
| `REQUESTER_REQUIRED` | 400 | `requesterId` absent, or not a positive integer |
| `REQUESTER_NOT_FOUND` | 404 | `requesterId` names no Requester at all (C-45, AC-65) |
| `REQUESTER_INACTIVE` | 403 | `requesterId` names a Requester whose `isActive` is false (BR-55, C-33, AC-63) |
| `TICKET_FORBIDDEN` | 403 | The Ticket exists and another Requester owns it (BR-21) |
| `ATTACHMENT_FORBIDDEN` | 403 | The Attachment's Ticket belongs to another Requester (BR-21, BR-52) |
| `TICKET_NOT_FOUND` | 404 | No Ticket with that id |
| `ATTACHMENT_NOT_FOUND` | 404 | No Attachment with that id (AC-64) |
| `ATTACHMENT_REMOVED` | 410 | The Attachment is soft-removed and the caller owns it (BR-51) |
| `FILE_TOO_LARGE` | 413 | Upload over 5 MB (BR-43) |
| `UNSUPPORTED_FILE_TYPE` | 415 | Upload outside the permitted set (BR-42) |
| `ATTACHMENT_LIMIT_REACHED` | 422 | The Ticket already holds five active Attachments (BR-44) |
| `REMOVAL_REASON_REQUIRED` | 422 | Removal reason is empty after trimming (BR-47) |
| `INTERNAL_ERROR` | 500 | Anything unhandled (AC-66) |

### 1.4 Check order

Every ownership-bearing endpoint evaluates in this fixed order, so the status for any
given request is deterministic and testable:

1. Parse and validate parameters and body -> 400
2. Resolve `requesterId`: no such Requester -> 404 `REQUESTER_NOT_FOUND`; Requester
   inactive -> 403 `REQUESTER_INACTIVE`
3. Load the addressed resource; absent -> 404
4. Compare owner; mismatch -> 403
5. For a download or preview, check removal state; removed -> 410
6. Apply business rules -> 422
7. Perform the operation -> 200 or 201

Two orderings carry consequences and are deliberate:

- **Step 2 precedes step 3** (C-45). `GET /api/tickets/999?requesterId=999`, where neither
  exists, returns `REQUESTER_NOT_FOUND`. The caller is resolved before the addressed
  resource is looked up, so the response never reveals whether that Ticket exists to
  someone who is not a Requester at all (AC-65).
- **Step 4 precedes step 5** (C-13, C-20). A non-owner asking for a removed Attachment
  receives 403 and never learns it was removed (AC-37).

`disposition` on the download route is validated at step 1 but applied only at step 7, so
it can never change which of 403, 404 or 410 a caller receives (C-44).

---

## 2. Reference data endpoints

### 2.1 Retrieve active Categories

| | |
|---|---|
| **Method and path** | `GET /api/categories` |
| **Path parameters** | None |
| **Query parameters** | None |
| **Request body** | None |
| **Ownership check** | None - reference data is not owned |
| **Serves** | FR-11 |
| **Verified by** | AC-13, AC-14 |

Returns every `Category` whose `isActive` is true, in ascending `id` order (BR-56). The
Lab 1 response shape is unchanged, which is what keeps the Lab 1 Supertest assertion
passing (C-05).

**Response 200**

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

`isActive` is not exposed. The client has no use for it and the Lab 1 contract fixes the
shape to `{id, name}`.

| Status | Condition |
|---|---|
| 200 | Success. An empty table returns `[]`, not 404 |
| 500 | Unexpected error, `INTERNAL_ERROR` |

### 2.2 Retrieve active Related Systems

| | |
|---|---|
| **Method and path** | `GET /api/related-systems` |
| **Path parameters** | None |
| **Query parameters** | None |
| **Request body** | None |
| **Ownership check** | None |
| **Serves** | FR-11 |
| **Verified by** | AC-13, AC-14 |

Returns every `RelatedSystem` whose `isActive` is true, in ascending `id` order (BR-56).
Related Systems are a flat list and are never scoped to a Category (C-24).

**Response 200**

```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" },
  { "id": 4, "name": "LEB2 App" },
  { "id": 5, "name": "Grade Submission App" },
  { "id": 6, "name": "Printer" }
]
```

| Status | Condition |
|---|---|
| 200 | Success. An empty table returns `[]` |
| 500 | Unexpected error, `INTERNAL_ERROR` |

### 2.3 Retrieve active Development Requesters

| | |
|---|---|
| **Method and path** | `GET /api/requesters` |
| **Path parameters** | None |
| **Query parameters** | None |
| **Request body** | None |
| **Ownership check** | None - this is the list the selector chooses from |
| **Serves** | FR-01 |
| **Verified by** | AC-04, AC-06, AC-07 |

Returns every `RequesterUser` whose `isActive` is true, in ascending `id` order. An
inactive Requester never appears (BR-11). This endpoint is not authentication and returns
no credential of any kind (BR-03, BR-65).

**Response 200**

```json
[
  { "id": 1, "name": "Anucha Prasert", "email": "anucha.p@example.ac.th" },
  { "id": 2, "name": "Kanya Somsri", "email": "kanya.s@example.ac.th" }
]
```

| Status | Condition |
|---|---|
| 200 | Success. When no active Requester exists the body is `[]`, which drives the Selection screen's empty state (BR-17, AC-06). This is not an error |
| 500 | Unexpected error, `INTERNAL_ERROR`, which drives the Selection screen's failure state (BR-18, AC-07) |

---

## 3. Ticket endpoints

### 3.1 Create a Ticket

| | |
|---|---|
| **Method and path** | `POST /api/tickets` |
| **Path parameters** | None |
| **Query parameters** | None |
| **Ownership check** | The created Ticket is bound to `requesterId` and never reassigned (BR-06) |
| **Serves** | FR-12, FR-15, FR-17, FR-19 |
| **Verified by** | AC-01, AC-15, AC-16, AC-20, AC-23, AC-63, AC-65, AC-66, AC-67 |

This is the only endpoint that carries `requesterId` in the body (C-12).

**Request body**

```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 6,
  "summary": "Laptop battery drains quickly",
  "description": "The battery drops from full to twenty percent within an hour of light use.",
  "requestedPriority": "MEDIUM"
}
```

**Validation rules**

| Field | Rule | Trace |
|---|---|---|
| `requesterId` | Required, positive integer, names an existing and active Requester | C-45, BR-55 |
| `categoryId` | Required, positive integer, names a Category that exists and is active | BR-33, BR-34 |
| `relatedSystemId` | Required, positive integer, names a Related System that exists and is active | BR-33, BR-34 |
| `summary` | Required; trimmed before validation; 5 to 120 characters after trimming | BR-30, BR-31 |
| `description` | Required; trimmed before validation; 20 to 5000 characters after trimming | BR-30, BR-32 |
| `requestedPriority` | Required; one of `LOW`, `MEDIUM`, `HIGH` | BR-08, BR-33, BR-34 |

Text values are stored trimmed (BR-30, AC-20). The server applies the same rules the
client applies and emits the same messages (BR-35), and enforces them independently of the
client, so a request that bypasses the browser is still rejected (AC-67).

`ticketNumber`, `createdAt`, `updatedAt`, `currentStatus` and `itPriority` are rejected if
supplied: they are system-generated, and accepting them would contradict BR-01, BR-02,
BR-05 and BR-07.

**Response 201**

`ticketNumber` is generated by the backend as `TKT-YYYY-NNNNNN`, where the six digits are
the row's zero-padded autoincrement id and the year comes from `createdAt` (BR-01, BR-04,
C-11). It is **assigned inside the creation transaction** - the row is inserted, then
updated with the number derived from its own `id` - so it is always a non-null string in
the 201 body (C-49). A client never receives a Ticket without its Ticket Number, and no
second request is needed to obtain one. `currentStatus` is `NEW` and `itPriority` is null
(BR-02, BR-07). `updatedAt` is always later than `createdAt`, never equal: the number-assigning
update inside the transaction bumps Prisma's `@updatedAt` a few milliseconds after the insert
(C-49).

```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "requester": { "id": 1, "name": "Anucha Prasert" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 6, "name": "Printer" },
  "summary": "Laptop battery drains quickly",
  "description": "The battery drops from full to twenty percent within an hour of light use.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "createdAt": "2026-09-05T04:12:33.000Z",
  "updatedAt": "2026-09-05T04:12:33.041Z",
  "attachments": []
}
```

`attachments` is always `[]` on creation. Attachments are uploaded in a second step
against the returned `id` (C-15, FR-21), which is what lets a Ticket survive an attachment
failure (BR-40, AC-28).

| Status | Condition |
|---|---|
| 201 | Ticket created |
| 400 | A validation rule above fails, `VALIDATION_FAILED` with `fields` (AC-67); or `requesterId` absent or unparseable, `REQUESTER_REQUIRED` |
| 403 | `requesterId` names an inactive Requester, `REQUESTER_INACTIVE` (AC-63) |
| 404 | `requesterId` names no Requester at all, `REQUESTER_NOT_FOUND` (AC-65) |
| 500 | Unexpected error, `INTERNAL_ERROR` (AC-66). The client shows a safe error and retains every entered value (BR-37, AC-22) |

There is no duplicate-submission guard here. Duplicate prevention is UI-only by C-26 and
BR-36: the submit control is disabled while the request is in flight (AC-21).

### 3.2 Retrieve the selected Requester's Tickets

| | |
|---|---|
| **Method and path** | `GET /api/tickets` |
| **Path parameters** | None |
| **Ownership check** | The query is scoped to `requesterId` before any search, filter or sort is applied (BR-22) |
| **Serves** | FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-37, FR-38 |
| **Verified by** | AC-03, AC-41 to AC-50, AC-63, AC-65 |

**Query parameters**

| Parameter | Required | Default | Permitted values | Trace |
|---|---|---|---|---|
| `requesterId` | Yes | - | Positive integer naming an existing, active Requester | C-12, C-45 |
| `search` | No | - | Free text. Matches Ticket Number by exact or prefix match, and Ticket Summary case-insensitively by substring. Description is never searched | BR-23 |
| `categoryId` | No | - | Positive integer | BR-24 |
| `relatedSystemId` | No | - | Positive integer | BR-24 |
| `currentStatus` | No | - | One of `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED` | BR-24, BR-09, C-27 |
| `sort` | No | `createdAt:desc` | `field:direction`; field one of `createdAt`, `ticketNumber`, `summary`, `currentStatus`; direction one of `asc`, `desc` | BR-25 |
| `page` | No | `1` | Positive integer | C-27, C-43 |
| `pageSize` | No | `10` | `10`, `25` or `50` | BR-27 |

The status filter parameter and the status sort token are both `currentStatus`, matching
the glossary field name. C-27 was amended and BR-25 renamed for this; it was the only
query token that differed from its glossary name (C-40).

`id` descending is applied as the tiebreak under every permitted sort field, so ordering
is total and a page boundary never duplicates or drops a row (BR-26, AC-48).

**Example**

```
GET /api/tickets?requesterId=1&search=laptop&categoryId=2&currentStatus=NEW&sort=createdAt:desc&page=1&pageSize=10
```

**Response 200**

The envelope is exactly C-27's.

```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 6, "name": "Printer" },
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "currentStatus": "NEW",
      "createdAt": "2026-09-05T04:12:33.000Z",
      "updatedAt": "2026-09-05T04:12:33.041Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1,
    "sort": "createdAt:desc"
  }
}
```

`description` is omitted from list rows; the detail endpoint returns it. Which of these
fields become visible columns or card fields is `ui-spec.md`'s decision, not this
document's.

A `page` beyond the last page returns `data: []` with correct `meta`, and is not an error
(BR-29, C-43, AC-45). A `page` that is not a positive integer is malformed and returns 400
(C-43). A Requester who owns nothing returns `data: []` with `total: 0`; the client
distinguishes the empty state from the no-results state by whether a search or filter was
active (BR-57, BR-58, AC-49, AC-50), not by anything the API returns.

| Status | Condition |
|---|---|
| 200 | Success, including an empty page and an empty result set |
| 400 | `sort` naming a field or direction outside BR-25; `pageSize` outside `{10, 25, 50}`; `page` not a positive integer; `currentStatus` or a filter id unparseable or out of set. `INVALID_QUERY_PARAM`, naming the offending parameter in `fields` (BR-28, C-43, AC-47) |
| 400 | `requesterId` absent or unparseable, `REQUESTER_REQUIRED` |
| 403 | `requesterId` names an inactive Requester, `REQUESTER_INACTIVE` (AC-63) |
| 404 | `requesterId` names no Requester at all, `REQUESTER_NOT_FOUND` (AC-65) |
| 500 | Unexpected error, `INTERNAL_ERROR` (AC-51, AC-66) |

### 3.3 Retrieve one owned Ticket

| | |
|---|---|
| **Method and path** | `GET /api/tickets/:id` |
| **Path parameters** | `id` - the Ticket's autoincrement id, positive integer |
| **Query parameters** | `requesterId`, required |
| **Request body** | None |
| **Ownership check** | `Ticket.requesterId` must equal the supplied `requesterId` (BR-21, BR-60) |
| **Serves** | FR-41, FR-43, FR-44 |
| **Verified by** | AC-03, AC-40, AC-53, AC-63, AC-65 |

The Ticket is addressed by `id`, not by Ticket Number. Ticket Number is the public
identifier shown to people (glossary); `id` is what the URL carries, by C-11 and C-12.

**Response 200**

The full Ticket, identical in shape to the 201 body of 3.1, with `attachments` populated
in ascending `id` order. Active and removed Attachments are both present and are
distinguished by `isRemoved` (BR-50, FR-42).

```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "requester": { "id": 1, "name": "Anucha Prasert" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 6, "name": "Printer" },
  "summary": "Laptop battery drains quickly",
  "description": "The battery drops from full to twenty percent within an hour of light use.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "createdAt": "2026-09-05T04:12:33.000Z",
  "updatedAt": "2026-09-05T04:12:33.041Z",
  "attachments": [
    {
      "id": 7,
      "originalFilename": "battery-report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 184320,
      "uploadedAt": "2026-09-05T04:15:02.000Z",
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null
    }
  ]
}
```

`storedFilename` is never returned. It is internal storage detail (BR-53), and exposing it
would work against BR-54's rule that bytes are reachable only through the checked route.

No Public Comment, Internal Note, Actions Taken or status-transition field appears in this
response, now or as an empty placeholder (BR-63, AC-53).

| Status | Condition |
|---|---|
| 200 | The Ticket exists and the caller owns it |
| 400 | `id` not a positive integer; or `requesterId` absent or unparseable |
| 403 | The Ticket exists and another Requester owns it, `TICKET_FORBIDDEN` (AC-03); or `requesterId` names an inactive Requester, `REQUESTER_INACTIVE` (AC-63) |
| 404 | No Ticket with that id, `TICKET_NOT_FOUND` (AC-40); or `requesterId` names no Requester at all, `REQUESTER_NOT_FOUND` (AC-65) |
| 500 | Unexpected error, `INTERNAL_ERROR` (AC-66) |

403 and 404 are deliberately distinct, per C-13. Lab 2 has no authentication, so there is
no security boundary a distinguishable 403 would weaken.

---

## 4. Attachment endpoints

### 4.1 Upload an Attachment

| | |
|---|---|
| **Method and path** | `POST /api/tickets/:id/attachments` |
| **Path parameters** | `id` - the Ticket's id, positive integer |
| **Query parameters** | `requesterId`, required (C-42) |
| **Content type** | `multipart/form-data`, parsed by multer (C-16) |
| **Ownership check** | The Ticket must exist and be owned by `requesterId` (BR-52) |
| **Serves** | FR-21, FR-22, FR-23, FR-24, FR-29 |
| **Verified by** | AC-24 to AC-29, AC-32, AC-63, AC-65 |

**Request**

```
POST /api/tickets/42/attachments?requesterId=1
Content-Type: multipart/form-data
```

| Part | Type | Rule |
|---|---|---|
| `file` | file | Required, exactly one file per request |

The multipart body carries the file and nothing else; `requesterId` is in the query string
(C-42). One file per request: the Create Ticket screen uploads several files by issuing
several requests, which is what makes per-file success and failure reportable (FR-23) and
lets the client list exactly the failed files as retryable (BR-40, FR-29, AC-28).

**Validation rules**

| Rule | Limit | Status on failure | Trace |
|---|---|---|---|
| Permitted type | JPG, JPEG, PNG, WEBP, PDF | 415 `UNSUPPORTED_FILE_TYPE` | BR-42, BR-45 |
| Maximum size | 5 MB, `MAX_UPLOAD_BYTES` | 413 `FILE_TOO_LARGE` | BR-43, BR-45 |
| Active attachment slots | At most five active per Ticket | 422 `ATTACHMENT_LIMIT_REACHED` | BR-44, BR-39 |

Type and size are enforced by multer's `fileFilter` and `limits`, before the handler runs,
so a file rejected on either ground is never committed to `UPLOAD_DIR`. The five-slot
check can only run after the file is on disk, so when it fails the written file is deleted
before the 422 is returned (BR-41, AC-29). Soft-removed Attachments do not occupy a slot,
so removing one frees capacity immediately (BR-44, C-18, AC-27).

The stored filename is generated and never derived from user input; the original filename
is kept as metadata only (BR-53).

**Response 201**

```json
{
  "id": 8,
  "ticketId": 42,
  "originalFilename": "screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 91204,
  "uploadedAt": "2026-09-05T04:20:11.000Z",
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null
}
```

| Status | Condition |
|---|---|
| 201 | Attachment stored and row written |
| 400 | No file part; more than one file part; `requesterId` absent or unparseable |
| 403 | The Ticket belongs to another Requester, `ATTACHMENT_FORBIDDEN`; or `requesterId` names an inactive Requester, `REQUESTER_INACTIVE` (AC-63) |
| 404 | No Ticket with that id, `TICKET_NOT_FOUND`; or `requesterId` names no Requester at all, `REQUESTER_NOT_FOUND` (AC-65) |
| 413 | File over 5 MB, `FILE_TOO_LARGE` (AC-25) |
| 415 | File type outside the permitted set, `UNSUPPORTED_FILE_TYPE` (AC-24) |
| 422 | The Ticket already holds five active Attachments, `ATTACHMENT_LIMIT_REACHED` (AC-26) |
| 500 | Unexpected error, `INTERNAL_ERROR` (AC-66). Any file already written is deleted first (BR-41) |

A failure here never removes or alters the Ticket. The Ticket is retained and the file is
reported as retryable (BR-40, AC-28).

### 4.2 Retrieve Attachment metadata

| | |
|---|---|
| **Method and path** | `GET /api/tickets/:id/attachments` |
| **Path parameters** | `id` - the Ticket's id, positive integer |
| **Query parameters** | `requesterId`, required |
| **Request body** | None |
| **Ownership check** | The Ticket must exist and be owned by `requesterId` |
| **Serves** | FR-42 |
| **Verified by** | AC-38, AC-63, AC-65 |

Returns every Attachment on the Ticket, active and removed alike, in ascending `id` order.
A removed Attachment keeps its metadata and its removal reason, which is what BR-50
requires and what the Ticket Detail attachment section renders.

**Response 200**

```json
[
  {
    "id": 7,
    "originalFilename": "battery-report.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 184320,
    "uploadedAt": "2026-09-05T04:15:02.000Z",
    "isRemoved": false,
    "removedAt": null,
    "removalReason": null
  },
  {
    "id": 8,
    "originalFilename": "screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 91204,
    "uploadedAt": "2026-09-05T04:20:11.000Z",
    "isRemoved": true,
    "removedAt": "2026-09-05T05:02:44.000Z",
    "removalReason": "Uploaded the wrong screenshot."
  }
]
```

`isRemoved` distinguishes the two, and `removedAt` and `removalReason` are non-null exactly
when it is true. A Ticket with no Attachments returns `[]`.

| Status | Condition |
|---|---|
| 200 | Success, including `[]` |
| 400 | `id` not a positive integer; `requesterId` absent or unparseable |
| 403 | The Ticket belongs to another Requester, `TICKET_FORBIDDEN`; or `requesterId` inactive, `REQUESTER_INACTIVE` |
| 404 | No Ticket with that id, `TICKET_NOT_FOUND`; or `requesterId` names no Requester, `REQUESTER_NOT_FOUND` |
| 500 | Unexpected error, `INTERNAL_ERROR` |

### 4.3 Download or preview an active Attachment

| | |
|---|---|
| **Method and path** | `GET /api/attachments/:id/download` |
| **Path parameters** | `id` - the Attachment's id, positive integer |
| **Query parameters** | `requesterId`, required. `disposition`, optional, `attachment` or `inline`, default `attachment` (C-44) |
| **Request body** | None |
| **Ownership check** | The Attachment's Ticket must be owned by `requesterId` (BR-52) |
| **Serves** | FR-25, FR-26, FR-28 |
| **Verified by** | AC-30, AC-31, AC-36, AC-37, AC-64 |

One route serves both download and preview, as BR-49 requires. `disposition=attachment`
returns `Content-Disposition: attachment; filename="<originalFilename>"`;
`disposition=inline` returns `Content-Disposition: inline`, so an image renders in the page
and a PDF opens in the browser's own viewer. Bytes are served only through this
ownership-checked route and never from a static directory (BR-54).

Per C-44, ownership and removal state are checked before `disposition` is considered, so
the parameter can never change which of 403, 404 or 410 a caller receives.

**Response 200**

The file bytes, with `Content-Type` set from the stored `mimeType` and `Content-Length`
from `sizeBytes`. There is no JSON body.

| Status | Condition |
|---|---|
| 200 | The Attachment is active and the caller owns it (AC-30, AC-31) |
| 400 | `id` not a positive integer; `requesterId` absent or unparseable; `disposition` outside `{attachment, inline}`, `INVALID_QUERY_PARAM` |
| 403 | The Attachment's Ticket belongs to another Requester, `ATTACHMENT_FORBIDDEN`, returned whether or not the Attachment is removed because ownership is checked first (AC-37); or `requesterId` inactive, `REQUESTER_INACTIVE` |
| 404 | No Attachment with that id, `ATTACHMENT_NOT_FOUND` (AC-64); or `requesterId` names no Requester, `REQUESTER_NOT_FOUND` |
| 410 | The Attachment is soft-removed and the caller owns it, `ATTACHMENT_REMOVED` (AC-36) |
| 500 | Unexpected error, `INTERNAL_ERROR` |

410 to the owner and 403 to everyone else is C-20 and BR-51 exactly. The owner already sees
the metadata, so 410 is truthful and distinguishes a removed file from one that never
existed; a non-owner is refused on ownership grounds before removal state is considered.

### 4.4 Soft-remove an Attachment

| | |
|---|---|
| **Method and path** | `DELETE /api/attachments/:id` |
| **Path parameters** | `id` - the Attachment's id, positive integer |
| **Query parameters** | `requesterId`, required (C-42) |
| **Ownership check** | The Attachment's Ticket must be owned by `requesterId` (BR-52) |
| **Serves** | FR-27, FR-28 |
| **Verified by** | AC-33, AC-34, AC-35, AC-39, AC-64 |

Despite the HTTP verb, nothing is deleted. The row is retained and marked removed, and the
stored file is never unlinked (BR-46). The verb is `DELETE` because it is the removal of a
resource from the Requester's active set, which is what the client is expressing.

**Request**

```
DELETE /api/attachments/8?requesterId=1
Content-Type: application/json
```

```json
{ "removalReason": "Uploaded the wrong screenshot." }
```

**Validation rules**

| Field | Rule | Trace |
|---|---|---|
| `requesterId` (query) | Required, positive integer naming an existing, active Requester | C-42, C-45 |
| `removalReason` (body) | Required, trimmed, non-empty after trimming | BR-47 |

An empty or whitespace-only `removalReason` is a well-formed request that violates a
business rule, so it is 422 rather than 400 (BR-39, BR-47, AC-35). A missing
`removalReason` key is malformed input and is 400. Removing an already-removed Attachment
is 410 to the owner: the confirmation step of BR-48 makes this unreachable from the UI, but
the API is not entitled to assume the UI is the only caller.

**Response 200**

```json
{
  "id": 8,
  "originalFilename": "screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 91204,
  "uploadedAt": "2026-09-05T04:20:11.000Z",
  "isRemoved": true,
  "removedAt": "2026-09-05T05:02:44.000Z",
  "removalReason": "Uploaded the wrong screenshot."
}
```

The metadata and the reason are returned so the client can render the removed state without
refetching (BR-50, AC-34).

| Status | Condition |
|---|---|
| 200 | Attachment marked removed |
| 400 | `id` not a positive integer; `requesterId` absent or unparseable; `removalReason` key absent |
| 403 | The Attachment's Ticket belongs to another Requester, `ATTACHMENT_FORBIDDEN` (AC-39); or `requesterId` inactive, `REQUESTER_INACTIVE` |
| 404 | No Attachment with that id, `ATTACHMENT_NOT_FOUND` (AC-64); or `requesterId` names no Requester, `REQUESTER_NOT_FOUND` |
| 410 | The Attachment is already removed and the caller owns it, `ATTACHMENT_REMOVED` |
| 422 | `removalReason` empty after trimming, `REMOVAL_REASON_REQUIRED` (AC-35) |
| 500 | Unexpected error, `INTERNAL_ERROR` |

---

## 5. Traceability

Every capability in `LS 6` maps to one endpoint, and every endpoint maps to at least one
Functional Requirement and at least one Acceptance Criterion.

| # | `LS 6` capability | Endpoint | Serves FR | Verified by AC |
|---|---|---|---|---|
| 1 | Retrieve active Categories | `GET /api/categories` | FR-11 | AC-13, AC-14 |
| 2 | Retrieve active Related Systems | `GET /api/related-systems` | FR-11 | AC-13, AC-14 |
| 3 | Retrieve active Development Requesters | `GET /api/requesters` | FR-01 | AC-04, AC-06, AC-07 |
| 4 | Create a Ticket | `POST /api/tickets` | FR-12, FR-15, FR-17, FR-19 | AC-01, AC-15, AC-16, AC-20, AC-23, AC-67 |
| 5 | Retrieve the selected Requester's Tickets | `GET /api/tickets` | FR-30 to FR-35, FR-37, FR-38 | AC-03, AC-41 to AC-50 |
| 6 | Retrieve one owned Ticket | `GET /api/tickets/:id` | FR-41, FR-43, FR-44 | AC-03, AC-40, AC-53 |
| 7 | Upload an Attachment | `POST /api/tickets/:id/attachments` | FR-21, FR-22, FR-23, FR-24, FR-29 | AC-24 to AC-29, AC-32 |
| 8 | Retrieve Attachment metadata | `GET /api/tickets/:id/attachments` | FR-42 | AC-38 |
| 9 | Download an active Attachment | `GET /api/attachments/:id/download` | FR-25, FR-26, FR-28 | AC-30, AC-31, AC-36, AC-37 |
| 10 | Soft-remove an Attachment | `DELETE /api/attachments/:id` | FR-27, FR-28 | AC-33, AC-34, AC-35, AC-39 |

### 5.1 Cross-cutting statuses

These behaviors apply across endpoints rather than to one. Each now carries a criterion;
the four that previously had none were added to `specification.md` as AC-63 to AC-67.

| Behavior | Endpoints | Criterion |
|---|---|---|
| 403 `REQUESTER_INACTIVE` | All seven ownership-bearing endpoints | AC-63 |
| 404 `ATTACHMENT_NOT_FOUND` | 4.3, 4.4 | AC-64 |
| 404 `REQUESTER_NOT_FOUND` | All seven ownership-bearing endpoints | AC-65 |
| 500 `INTERNAL_ERROR` and its safe body shape | All ten | AC-66 |
| 400 from the server on a request that bypassed client validation | 3.1 | AC-67 |

---

## 6. Decisions this contract rests on

Four mechanism gaps were raised while drafting this document, where the labsheet and the
earlier decisions fixed a behavior but not the mechanism. All four are now settled as
decision rows, and this contract implements them. Nothing here is an open choice.

| Decision | Settles |
|---|---|
| C-42 | `requesterId` travels as `?requesterId=` on every endpoint except `POST /api/tickets`. C-12 had reached only the GET endpoints and ticket creation |
| C-43 | A malformed `page` returns 400 like `sort` and `pageSize`; a `page` beyond the last still returns an empty `data` array per C-27 |
| C-44 | The download route takes `?disposition=inline\|attachment`, defaulting to `attachment`, and ownership and removal state are checked before disposition is considered |
| C-45 | An unknown `requesterId` returns 404 and an inactive one 403, consistent with C-13's separation of missing from forbidden |

C-27 was amended in the same pass: the status filter parameter was renamed from `status` to
`currentStatus`, and BR-25's sort token renamed with it, so that no query token differs
from its C-40 glossary name.
