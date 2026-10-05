# TokTickIT Lab 3 - Phase 1 Codebase Analysis

The read-only output of handoff section 7 prompt 1.1, recorded because prompts 1.4 and 1.6
depend on it. Sections 2b to 2e and 3 are reproduced unedited; the numbering is the
prompt's, not this file's. Point 1 (deliverables by PDF part), point 2a (the `CLAUDE.md`
conflict table, discharged by the Lab 3 rewrite), point 4 (rule-area options) and point 5
(disagreements) are not carried here - their conclusions are recorded in
`docs/lab-03/decisions.md` as C-53 to C-92.

Line numbers are as of commit `e5a27ae`, before any Lab 3 code change.

---

## 2b. Code invalidated, file and line

| File:line | What breaks |
|---|---|
| `server/prisma/schema.prisma:18-20` | Comment claims `TicketStatus` "carries values unreachable in Lab 2 so ... **Lab 3 needs no enum migration**". False: 4.5 requires 8 statuses; the enum has 5. |
| `schema.prisma:28-34` | Enum missing `OPEN`, `WAITING_FOR_REQUESTER`, `REOPENED`. |
| `schema.prisma:63-79` | `RequesterUser` - no role, no `passwordHash`, no `mustChangePassword`. Comment at 67-69 asserts no such field "exists, and none is added (BR-65)". |
| `schema.prisma:93-118` | `Ticket` has no `ownerId`; `itPriority:102` is nullable and never set; no `PublicComment`/`InternalNote` relations. |
| `schema.prisma:112-117` | The four indexes are all led by `requesterId`. The queue (D-23) filters on `currentStatus`, `itPriority`, `ownerId`, `categoryId` with **no** requester scope - none of these four serves it. New indexes are needed; this is the section 5.2 index justification for Lab 3. |
| `server/src/app.ts:14` | `app.use(cors())` - wildcard origin cannot carry credentials (D-03). |
| `app.ts:61-78` | `GET /api/requesters` - unauthenticated user list. Remove. |
| `app.ts:82-83` | Routers mounted with no auth middleware anywhere in the chain. |
| `server/src/lib/requester.ts` (whole file, 54 lines) | The `?requesterId=` mechanism. `requireRequesterQuery:42` is the middleware on every protected route; `RequesterResolution:13-17` encodes 400 `REQUESTER_REQUIRED` / 404 `REQUESTER_NOT_FOUND` / 403 `REQUESTER_INACTIVE`, all three of which become unreachable. |
| `server/src/routes/tickets.ts:37-41` | Caller taken from `body.requesterId` (C-12). Directly violates labsheet BR-03 / AC-03. |
| `tickets.ts:68, 117, 173, 186` | Four `requireRequesterQuery` mounts. |
| `tickets.ts:130-132`, `161-163` | `403 TICKET_FORBIDDEN` / `ATTACHMENT_FORBIDDEN` on non-owner - the existence leak 6.2 forbids. -> 404. |
| `tickets.ts:44` | `createTicketWithNumber` receives `requesterId` from the body; must take it from the session, and must now also set `itPriority = requestedPriority` (4.5). |
| `server/src/routes/attachments.ts:14-17` (comment), `54-57`, `69-71`, `109` | Same 403-on-non-owner rule and the same `requireRequesterQuery` mounts. |
| `server/src/lib/list-query.ts:11` | `STATUSES` hard-codes the five Lab 2 values - the status filter silently rejects `OPEN`, `WAITING_FOR_REQUESTER`, `REOPENED` with 400. **Missed by handoff section 1.** |
| `list-query.ts:8` | `SORT_FIELDS` = `createdAt, ticketNumber, summary, currentStatus`. D-23 needs `updatedAt` and `itPriority` too. |
| `list-query.ts` `listWhere(requesterId, q)` | Signature hard-codes requester scoping; the queue is not requester-scoped. "Reuse" here means refactor to an optional scope, not reuse as-is. |
| `server/src/lib/ticket-dto.ts:8-25, 33` | `ticketInclude` has no owner, comments or notes; `toTicketDto` returns `requesterId`. One DTO can no longer serve both audiences - the Requester DTO must not carry Internal Notes. |
| `server/src/seed/graded-seed.ts:28-36, 45-51` | Five `RequesterUser` rows, no passwords, no roles; no IT Staff, no Administrator. 5.3 requires 4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff, >=1 active Administrator, realistic tickets, and example comments and notes. |
| `server/src/seed/demo-seed.ts` | Creates demo tickets keyed on requester - must gain owners, statuses, priorities. |
| `client/src/api.ts:1` | `VITE_API_URL ?? "http://localhost:3000"` - an **unset** variable falls back to the cross-origin URL, which breaks `SameSite=Strict`. D-03's `VITE_API_URL=""` works only because `??` does not treat `""` as nullish; this is load-bearing and must be stated in the contract. |
| `api.ts:73-77` | `fetchRequesters()`. Remove. |
| `api.ts:101` | `TicketStatus` union - 5 values. **Missed by handoff section 1.** |
| `api.ts:118, 133, 144, 158-168, 224-234, 241-242, 248-256, 259-261` | Eight functions thread `requesterId` through the URL or body. All lose the parameter and gain `credentials: "include"` (or nothing, if the proxy makes them same-origin - decide and state it). |
| `api.ts:1-62` | No 401 handling. A 401 after session expiry must redirect to Login, not surface as a generic `ApiError`. |
| `client/src/requester/RequesterContext.tsx` (whole file, 127 lines) | The selector state, `STORAGE_KEY = "toktickit.requesterId"` (:16), and `localStorage` persistence. Deleted; `client/src/requester/` goes with it. |
| `client/src/pages/RequesterSelection.tsx` | Deleted. |
| `client/src/App.tsx:2, 4, 15, 18, 24, 39` | `RequesterProvider`, the `if (!selected) return <RequesterSelection/>` gate, and `key={selected.id}`. Becomes `AuthProvider` + a login gate + a must-change-password gate. |
| `client/src/components/AppShell.tsx:13-16` | `NAV_ITEMS` is Requester-only and static - needs role-derived navigation. |
| `AppShell.tsx:111-119` | "Development Requester: {name}" + **Change Requester** button. Becomes name + role badge + Logout. |
| `client/src/components/Badge.tsx:26` | `StatusBadge` distinguishes only `NEW` vs "other" - 8 statuses need 8 treatments, and a **role** badge family does not exist. **Missed by handoff section 1.** |
| `client/src/pages/MyTickets.tsx:39-45` | `STATUS_OPTIONS` - 5 values. **Missed by handoff section 1.** |
| `client/src/pages/TicketDetail.tsx:85` | `{t.itPriority && <PriorityBadge .../>}` - after the 4.5 backfill the badge always renders, so the conditional is dead and the "no IT badge" style tests break. |
| `client/src/router.tsx` | ~60-line History router (C-51). Lab 3 roughly doubles the route count and adds guards; either extend it or revisit C-51 with a decision. |
| `server/.env.example` | No `CLIENT_ORIGIN`, no session TTL, no test-database URL. |
| `server/package.json:10` | `"prisma:migrate": "prisma migrate dev"` - the script the handoff forbids. Either remove it or repoint it at `migrate deploy`. |
| `server/vitest.config.ts` | No `globalSetup`; D-15 needs one to point `DATABASE_URL` at `toktickit_test` and run migrate deploy + seed. |
| `playwright.config.ts:9-14, 22` | Comments and screenshot paths name Lab 2 only; no `storageState` projects for the three roles. `testDir: "./e2e"` does pick up `e2e/lab-03/` automatically. |

## 2c. Tests invalidated (detail in section 3)

The specific assertions that fail, beyond "it uses `requesterId`":

- `server/tests/lab-02/data-model.db.test.ts:84-97` - **DB-04 asserts the enum equals exactly the five Lab 2 values, in order.** Adding three values fails it. The describe block is titled "enums carry their full Lab 3 range". **Missed by handoff section 1.**
- `data-model.db.test.ts:225, 237` - **DB-08 asserts the FK pair `Ticket->RequesterUser`.** The rename to `User` fails it. **Missed by handoff section 1.**
- `data-model.db.test.ts:36-45, 52, 59, 146, 172` - five `prisma.requesterUser.*` calls; the client property becomes `prisma.user`.
- `data-model.db.test.ts:171-193` - asserts `itPriority` is **null** after creation. The 4.5 backfill fails it. **Missed by handoff section 1.**
- `create-ticket.api.test.ts` **API-03** - same `itPriority: null` assertion. **Missed.**
- `create-ticket.api.test.ts:180-187` **API-12/API-13** - 403 `REQUESTER_INACTIVE`, 404 `REQUESTER_NOT_FOUND`. Both codes cease to exist. **Missed.**
- `create-ticket.api.test.ts` **API-11** - asserts the inactive Requester is absent from `GET /api/requesters`, the route being deleted. Needs a named replacement (the admin user list, Administrator-only). **Missed.**
- `my-tickets.api.test.ts:241-244`, `ticket-detail.api.test.ts:67-70, 116-119`, `attachments.api.test.ts:148-163, 286-301` - six tests assert **403 + a specific `*_FORBIDDEN` code** for a non-owner. All become 404 under D-09, superseding C-13 and C-20.
- `client/tests/lab-02/MyTickets.test.tsx:217` and `RequesterTicketDetail.test.tsx:78` (**STYLE-07**) - assert **no IT Priority badge anywhere**. Both fail after the backfill. **Missed.**
- All five `client/tests/lab-02/*.tsx` import `STORAGE_KEY` from the deleted context (`:6`, `:8`, `:6`, `:6`, `:5`) and seed `localStorage` - they will not compile, let alone run.
- `e2e/lab-02/*.spec.ts` - three specs define `STORAGE_KEY = "toktickit.requesterId"` and use `page.addInitScript` to inject identity; all five call `${API_URL}/api/...?requesterId=`.
- `client/tests/lab-01/App.test.tsx` renders `SystemCheck` directly (C-04) - **survives untouched**, but requires a decision: is `/system-check` public or behind login? Not covered by handoff section 4.

## 2d. Lab 2 documents invalidated

- `docs/lab-02/specification.md:178` **BR-03**, `:186-193` **BR-11..BR-18** (the eight selector rules), `:239` **BR-64**, `:240` **BR-65** ("Lab 2 stores no password, hash, session, token or role field"). Superseded, not deleted - they are Lab 2's record.
- `specification.md:196` **BR-21** (403/404 split) - superseded with C-13.
- `specification.md:182` **BR-07** ("IT Priority is null at creation and is not settable anywhere") - superseded by 4.5.
- `specification.md:507-514` **AC-04..AC-11** (eight selection ACs), `:519` **AC-16**, `:540-543` **AC-37/AC-39**, `:567-568` **AC-64/AC-65**.
- `specification.md:484, 487` - API table rows for `GET /api/requesters` and the 403/404 rule.
- `specification.md:346-359` - the `RequesterUser` model table and its "No password, hash, session, token or role field (BR-65)" sentence.
- `specification.md:689` **LC-02** - "Lab 3 attaches authentication to this model **without touching Ticket.requesterId**". D-05 honours the spirit (ids survive) but the model is renamed, so LC-02 should be cited as *satisfied with a note*, not as still literally true.
- `docs/lab-02/api-spec.md` section 2.3 (`GET /api/requesters`), section 1.3 error catalogue (three requester codes), section 1.4 check order, sections 3.1-4.4 (every endpoint's `requesterId` parameter), section 5.1 cross-cutting statuses.
- `docs/lab-02/ui-spec.md` section 9 (shell: Development Requester + Change Requester), section 10 (whole Selection screen), section 8 badges (5 statuses, no role family), section 13 (Requester Ticket Detail, which gains comments), section 15 screenshot paths, section 16 visual checklist.
- `docs/lab-02/tests.md` - the Final column stays true for Lab 2, but the regression-disposition table in `docs/lab-03/tests.md` must name each row's fate.
- `README.md:5` (selector described as the identity mechanism), `:37` (`requester/` context in the tree), `:218` ("choose a Development Requester and press Continue"), `:263-273` (the endpoint table - every row carries `?requesterId=`, and line 272-273 states the 403/404 rule).

## 2e. What handoff section 1's table missed - consolidated

1. **`docs/lab-02/decisions.md` runs C-01..C-52, not C-41.** `CLAUDE.md:160-161` and handoff section 1 both say C-41. Lab 3 starts at **C-53** either way, but the "Carried from Lab 2" list in prompt 1.2 must cover C-42..C-52 (C-42 identity transport, C-43 malformed page, C-44/C-52 disposition, C-45 unknown-vs-inactive caller, C-46 unavailable state, C-51 hand-rolled router) - five of those eleven are directly affected by Lab 3.
2. **`server/src/lib/list-query.ts:8,11`** - `STATUSES` and `SORT_FIELDS` are hard-coded Lab 2 sets; `listWhere()` hard-codes requester scoping.
3. **`client/src/api.ts:101`** and **`client/src/pages/MyTickets.tsx:39-45`** - the same 5-value status list, twice more.
4. **`client/src/components/Badge.tsx:26`** - `StatusBadge` handles `NEW` vs "other"; no role badge exists. Labsheet section 7 requires consistent badges for status, Requested Priority, IT Priority **and role**.
5. **The `itPriority` backfill breaks four existing tests**, not just data: `data-model.db.test.ts:171`, `create-ticket.api.test.ts` API-03, `MyTickets.test.tsx:217`, `RequesterTicketDetail.test.tsx:78` (STYLE-07). It also makes `TicketDetail.tsx:85`'s conditional dead.
6. **`data-model.db.test.ts` DB-04 pins the enum to exactly five values in order**, and **DB-08 pins the FK name `Ticket->RequesterUser`**. Both are exact-equality assertions that the migration breaks on its first run.
7. **Removing `GET /api/requesters` retires test API-11**, which the regression table must name with its replacement.
8. **The four `Ticket` indexes are useless to the queue.** Every one is led by `requesterId`; the queue filters on status, IT priority, owner and category with no requester scope. New indexes plus a justification are required by 5.2 - and handoff section 1 treats indexes as untouched.
9. **Labsheet section 10 contradicts section 12 on two test filenames** - section 10's example table cites `server/tests/lab-03/notes.api.test.ts` and `e2e/lab-03/first-login.spec.ts`; section 12 names `comments-notes.api.test.ts` and `authentication.spec.ts`. This is exactly the C-02 situation; section 12 must win, and it needs its own decision row.
10. **Labsheet section 10 requires eight test levels; `CLAUDE.md:197` says six.** Security/authorization and migration/regression are new.
11. **`server/package.json:10` ships the forbidden script** (`prisma:migrate` = `migrate dev`). A rule in prose is weaker than deleting the script.
12. **`client/tests/lab-01/App.test.tsx` survives, but `/system-check` needs a public-or-private decision** - not in handoff section 4.
13. **`server/.env.example` needs new variables** and `CLAUDE.md:264` names only the Lab 2 pair.
14. **The check order changes shape.** `api-spec.md` 1.4 is caller -> resource -> ownership. Lab 3 needs auth -> password gate -> role -> load -> ownership -> validate, and the position of the *role* check is what makes a Requester's Internal-Notes request 403 rather than 404 even for a nonexistent ticket (AC-04). Handoff section 4 implies it in the D-09 row but never states the order.
15. **`Ticket.requesterId` should keep its name.** D-05 renames the table; nothing says the FK column stays `requesterId`. If the agent renames it to `userId` for symmetry, all four indexes, `list-query.ts`, `ticket-dto.ts` and the migration's data preservation are affected for no gain. Worth one sentence in a decision row.
16. **Labsheet 4.3's role table is garbled in the PDF** - the Requester / IT Staff / Administrator labels are offset from their cells. Read in order, the three paragraphs are Requester, IT Staff, Administrator. Worth recording so the matrix is not built from the broken layout.

---

# 3. Every Lab 2 test file: survives / adapt / retire

Counts are `it(` occurrences. Current totals: **86 server - 48 client - 42 E2E x 3 viewports = 126**, matching handoff section 1.

| File | Tests | Disposition |
|---|---|---|
| `server/tests/lab-01/health.test.ts` | 1 | **Survives as-is** - `/api/health` is public (D-11). |
| `server/tests/lab-01/categories.test.ts` | 1 | **Survives as-is** - `/api/categories` public (D-11); the four names in id order still hold on a freshly seeded `toktickit_test`. |
| `client/tests/lab-01/App.test.tsx` | 3 | **Survives as-is** - renders `SystemCheck` directly (C-04), no context. Needs only the `/system-check` public/private decision for the app, not for the test. |
| `server/tests/lab-02/ticket-number.unit.test.ts` | 13 | **Survives as-is** - pure generator, no identity, no DB. |
| `server/tests/lab-02/create-ticket.api.test.ts` | 15 | **Adapt** - logged-in Supertest agent; drop the body `requesterId`. **Three rows change meaning:** API-03 (asserts `itPriority: null` -> must assert it copies `requestedPriority`), API-12/API-13 (`REQUESTER_INACTIVE`/`REQUESTER_NOT_FOUND` -> the login and session paths instead). **One retires:** API-11 (`GET /api/requesters`) -> replaced by the Administrator user-list test in `users-admin.api.test.ts`. Add the AC-03 test: a body `requesterId` naming another user is ignored. |
| `server/tests/lab-02/my-tickets.api.test.ts` | 15 | **Adapt** - 29 `requesterId` references, all to the agent's session. One row changes status: `:241` 403 `TICKET_FORBIDDEN` -> **404**. Add the AC-03 query-parameter-ignored test. |
| `server/tests/lab-02/ticket-detail.api.test.ts` | 6 | **Adapt** - `:67` API-27 and `:116` both 403 -> **404**; `:58` `REQUESTER_NOT_FOUND` retires with C-45. API-28 ("no comment or note key in the payload") **inverts**: the Requester DTO must now carry Public Comments and must still carry no Internal Note key. |
| `server/tests/lab-02/attachments.api.test.ts` | 17 | **Adapt** - `:148` and `:294` (API-41) 403 -> **404**; `:286` API-40 (non-owner gets 403 not 410 for a removed file) becomes **404 not 410**, which preserves its point under C-13's replacement. `:158-163` inactive/unknown caller rows retire with the resolver; replaced by the inactive-login test in `auth.api.test.ts`. |
| `server/tests/lab-02/data-model.db.test.ts` | 18 | **Adapt, heaviest** - five `prisma.requesterUser` -> `prisma.user`; **DB-04** enum equality (5 -> 8 values in declared order); **DB-08** `Ticket->RequesterUser` -> `Ticket->User`; DB-06's `itPriority: null` assertion inverts. DB-01/DB-02 (seed shape and idempotency) must grow to the 5.3 role counts. DB-05 (indexes) must grow to the queue indexes. Consider splitting the migration-specific assertions into `server/tests/lab-03/migration.db.test.ts` rather than overloading this file. |
| `client/tests/lab-02/CreateTicket.test.tsx` | 12 | **Adapt** - replace the `STORAGE_KEY` + `RequesterProvider` harness with an `AuthContext` test wrapper. |
| `client/tests/lab-02/MyTickets.test.tsx` | 11 | **Adapt** - same wrapper; `:217` ("no IT badge anywhere") **must be rewritten**, not deleted, to assert the IT Priority badge renders with the backfilled value. |
| `client/tests/lab-02/RequesterTicketDetail.test.tsx` | 5 | **Adapt** - same wrapper; **STYLE-07** at `:78` rewritten as above. Grows with the Public Comments list, the composer, and the "Problem Appears Resolved" action. |
| `client/tests/lab-02/AttachmentSection.test.tsx` | 7 | **Adapt** - wrapper only; the attachment contract itself is unchanged. |
| `client/tests/lab-02/RequesterSelection.test.tsx` | 10 | **Retire** - the screen is removed by labsheet 8.2. Needs a decision row naming the replacement: `client/tests/lab-03/Login.test.tsx` + `ChangePassword.test.tsx`. Ten tests is the largest single drop; the "before and after" count report in Issue 4 must match it exactly. |
| `e2e/lab-02/requester-ticket-flow.spec.ts` | 12 | **Adapt** - section 12 protects this filename. Replace `addInitScript`/`STORAGE_KEY` with a login helper + `storageState`. `:166-174` (Requester B reads A's ticket -> 403) becomes 404. |
| `e2e/lab-02/create-ticket-screenshots.spec.ts` | 6 | **Adapt** - login helper. `:60` selector injection goes. |
| `e2e/lab-02/my-tickets-screenshots.spec.ts` | 11 | **Adapt** - login helper; `:213` direct API 403 -> 404. Also the test-data-leak problem D-15 names: this spec creates tickets on every run. |
| `e2e/lab-02/ticket-detail-screenshots.spec.ts` | 7 | **Adapt** - login helper. |
| `e2e/lab-02/selection-screenshots.spec.ts` | 6 | **Retire** - the screen is gone. Replaced by `e2e/lab-03/authentication.spec.ts`. The four Selection screenshots in `artifacts/lab-02/screenshots/create-ticket/` (C-47) stay as Lab 2 evidence; they are not regenerated. |

**Net:** 2 files retired (16 tests x the E2E multiplier on one of them), 14 adapted, 4 survive untouched. Expect the Lab 2 count to fall by exactly **10 client** and **6 E2E specs (18 runs)** and by nothing on the server - any other drop is a bug.

> **Correction, recorded after the fact.** The last sentence is wrong on the server. It
> counts files, not test IDs. `create-ticket.api.test.ts` carries a dedicated `it()` for
> API-11 (line 231) and for API-12 (line 180), both of which retire, so the server count
> does fall. `docs/lab-03/tests.md` counts the regression by test ID, and the
> disposition column above is the authority for what each one becomes.
