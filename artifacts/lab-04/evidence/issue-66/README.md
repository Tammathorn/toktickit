# Issue 5 (#66) - Ticket workflow: gate, stale updates, status history

Terminal evidence for `feature/lab4-5-ticket-workflow`, ANSI stripped. Each file is headed with
its command, date, commit and exit code; the header says what was uncommitted at capture time.
The folder is named by the GitHub number (`issue-66`), like `issue-64/` and `issue-65/`.
No file here contains a session token (checked: no `tt_session=` value and no 64-hex string).

## Tests first

| File | What it proves |
|---|---|
| `red-ticket-workflow.txt` | `npx vitest run tests/lab-04/ticket-workflow.api.test.ts` with the new file and **no** #66 code: 44 failed, 23 passed (67; the audit test was added later). The 23 that already hold on the Lab 3/#64 code: UNIT-06, WF-01, WF-08, WF-12, WF-14..WF-17, WF-20, WF-27, WF-31, WF-33, WF-35, WF-40..WF-43, WF-50, WF-52, WF-53, WF-62..WF-64 (refusal orders Lab 3 already had, the #64 action routes, the #63 history row on create, and the C-158 cut). Every gate, version, `lastActivityAt`, `resolvedAt`, history-write and replay row fails |

## Suites

| File | What it proves |
|---|---|
| `green-server-suite.txt` | `cd server; npm test`: 470 passed, 19 files (402 before + 68 new: UNIT-05..07, WF-01..WF-64 and the audit test; nothing deleted or skipped) |
| `green-client-suite.txt` | `cd client; npx vitest run`: 166 passed, 13 files - unchanged; no client file changed in this Issue |
| `e2e-suite-run1-before-adaptation.txt` | First full e2e run with the #66 server: 269 passed, 34 skipped, 9 failed. E2E-15 and E2E-32 (x3 viewports): the server now records status history, so the status word also appears in the Status history list and the text locator matched twice. E2E-47 (x3): the User Management focus walk timed out at 30 s - dev-database growth, not #66 (see below) |
| `e2e-suite-run2-mobile-e2e47-hang.txt` | Full run after the adaptations and `test.slow()`: 277 passed, 34 skipped, 1 failed - mobile E2E-47 stuck in `keyboard.press("Tab")` and ran 11.5 min (desktop and tablet E2E-47 passed in 33 s). The whole run took 12.3 min instead of about 1.5, a host stall rather than a test result |
| `e2e-47-mobile-rerun.txt` | Mobile E2E-47 alone right after: the same stall, 4.7 h of wall time (the host was asleep or starved); kept as the record of it, not as a test result |
| `green-e2e-suite.txt` | Final full run with fresh servers: **278 passed + 34 skipped = 312 runs**, the same as before this Issue; E2E-47 35-36 s on all three viewports under `test.slow()`. No `ECONNRESET` this time |

## Adapted tests (no assertion removed or loosened)

| Test | Decision | Change |
|---|---|---|
| L3 API-54..API-61, API-62, API-64, API-66..API-72, the untitled step-1 test, API-119, API-121, API-123 (`staff-ticket-detail.api.test.ts`) | C-138, C-137 (tests.md 4.1) | `setOwner`/`setPriority`/`setStatus` send the Ticket's current `version`; RESOLVED cells (API-62, API-64, API-70) record one completed action first; API-121/123 direct bodies carry `version` |
| L3 SEC-13 (`authorization.api.test.ts`) | C-138 | The Administrator's owner, priority and status PATCHes send `version`. SEC-23 makes no staff PATCH, so it is unchanged (tests.md 4.1 corrected) |
| L3 API-48, L2 my-tickets row shape | C-140 | Row key sets gain `lastActivityAt` |
| L2 API-34 (`attachments.api.test.ts`) | C-140 | The forced insert failure is injected on `prisma.$transaction`, which now holds the row insert and the `lastActivityAt` move; the no-row/no-file assertions are unchanged |
| L3 E2E-12, E2E-15, E2E-26, `staffMoves` | C-156, C-138, C-137 | Commit `5617a2c` first added status assertions to the raw fixture PATCHes (C-156, before any version change). Then `moveStatus` (`e2e/support/lab4.ts`) reads `version` from the staff GET and asserts 200; RESOLVED steps record a completed action first |
| L3 E2E-15, E2E-32 locators | BR-50, C-167 | The header status badge is named apart from the Status history list's badges |
| L3 E2E-47 | - (planner answer, option B) | `test.slow()` only: the focus walk visits every Edit button of the unpaginated user list, and each full e2e run adds users to the dev DB (21.7 s in #64 -> 29.8 s in #65 -> over 30 s here). No assertion, locator or Tab count changed |

## Changes to the planner's patch

1. `gateReasonsFrom(facts)` in `lib/workflow.ts`: the gate's four conditions as a pure function
   (UNIT-05 needs one); `gateReasons` now gathers the facts and calls it. Behaviour unchanged.
2. `allowedTransitions(status)` in `lib/status-transitions.ts` (UNIT-07); the staff DTO uses it.
3. `staff.ts`: a constant the patch placed between two import statements moved below them.
4. After the end-of-Issue audit (one read-only Opus subagent; no blockers):
   - Owner PATCH: an `ownerId` past int4 reached Prisma and answered 500; it is now 400 at
     `fields.ownerId` (new test "WF-34 (audit)", red in `red-audit-fixes.txt`).
   - Owner and status routes judge one snapshot: `version` is read with the first load, so a
     Ticket closed between two reads can no longer turn a TICKET_CLOSED / step-3 answer into
     STALE_UPDATE. Under the row lock, a Ticket found Closed or Cancelled answers 409
     INVALID_STATUS_TRANSITION (step 3) before the stale check. IT Priority's late mismatch goes
     through `staleOrGone`, so a closed Ticket still gets TICKET_CLOSED first.
   - The status change's `now` is taken after the lock wait, so its history row is never
     stamped earlier than a change that committed first.
   - Public Comment and Internal Note writes lock the Ticket row and re-check that it is still
     open inside the transaction, so a close committed between the check and the write cannot
     take an entry (an Internal Note still writes nothing to the Ticket, BR-47).
   The two race fixes have no deterministic test (they need a close to commit between two reads).

| File | What it proves |
|---|---|
| `red-audit-fixes.txt` | The new owner-bound test before the fix: 500 instead of 400 |
