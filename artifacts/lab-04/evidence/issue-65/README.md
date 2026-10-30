# Issue 4 (#65) - Actions Taken UI (and the workflow UI of #66)

Terminal evidence for `feature/lab4-4-actions-ui`, ANSI stripped. Each file is headed with its
command, date, commit and exit code. The commit is `fdd6131` (the Issue 3 branch tip) with the
Issue 4 work uncommitted at capture time; the header's note says which stage. The folder is
named by the GitHub number (`issue-65`), as the task directed, like `issue-64/`.

One `tt_session` cookie value in a Playwright call log in `e2e-suite-run1-before-adaptation.txt`
is replaced with `[REDACTED]` (CLAUDE.md: a session token never enters a tracked file). Nothing
else in any file was changed.

## Tests first

| File | What it proves |
|---|---|
| `red-client-suite.txt` | `cd client; npx vitest run` with only the patch's `client/tests/*` applied: 13 failed, 128 passed (141). `tests/lab-04/ActionsTaken.test.tsx` does not compile (`src/components/ActionsTaken.js` does not exist, 25 tests uncollected); 12 of 13 `TicketWorkflow.test.tsx` tests fail; the adapted L3 "a confirmed Resolved move sends the request" fails because the request does not yet carry `version` (C-138). The one Lab 4 pass is UI-42 (gate met: Resolved enabled, no callout), which the Lab 3 screen already satisfies |
| `red-panel-closes.txt` | Found by the hand check below: UI-31, UI-32, UI-33 extended to require that a successful Edit, Complete or Cancel returns the row to view mode (UI-32/33's mocks now return the action finished, so the check cannot pass vacuously). 3 failed, 22 passed before the fix |

## Suites (Labs 1-3 regression)

| File | What it proves |
|---|---|
| `green-client-suite.txt` | `cd client; npx vitest run`: 166 passed, 13 files (128 Lab 1-3 + 38 new: ActionsTaken 25, TicketWorkflow 13). The `act(...)` warnings in stderr are React test noise of the same kind the Lab 3 files already print; no test fails on them |
| `green-server-suite.txt` | `cd server; npm test`: 402 passed, 18 files - unchanged, as this Issue changes no server file |
| `e2e-suite-run1-before-adaptation.txt` | First full e2e run with the new UI and no e2e change: 267 passed, 34 skipped, 11 failed. E2E-11, E2E-15 (x3), E2E-46 (x3): Resolved is now disabled until the resolution gate is met (C-137). E2E-45 (x3): the focus walk stopped at the composer's `datetime-local` input. E2E-21 [mobile]: a transport `ECONNRESET` on an API login before any assertion - the same failure `issue-64/` recorded, here with a single non-watch API process, so a stray `tsx watch` is not its only cause |
| `green-e2e-suite.txt` | After the adaptations below: 278 passed, 34 skipped = 312 runs, the same as before this Issue |

### E2E adaptations

| Test | Decision | Change |
|---|---|---|
| L3 E2E-11 (`e2e/lab-03/staff-ticket-flow.spec.ts`) | C-137 (tests.md 4.3) | One completed action is recorded through the API before the UI Resolve |
| L3 E2E-15 (same file) | C-137 | Same: the staff UI Resolve needs the gate met. tests.md 4.3 lists E2E-15 for C-138/C-156 only, so this C-137 part is new to the table |
| L3 E2E-46 (`e2e/lab-03/visual-evidence.spec.ts`) | C-137 | Same, before the Resolved confirmation is opened. tests.md 4.3 says "via the helper only"; the gate makes a completed action necessary too |
| L3 E2E-45, via `focusWalk` (same file) | C-123, ui-spec 8.3 | The composer brings the first radio pair and `datetime-local` input onto a walked screen. The helper now counts a named radio group as one Tab stop (the browser's own model) and treats consecutive Tabs inside one element (the date/time segments) as one stop instead of a completed cycle. The three assertions - full cycle, every stop ringed, every focusable reached - are unchanged; the record now shows 19 of 19 reached on staff detail. E2E-45 is not in tests.md 4.3 |

The helper `e2e/support/lab4.ts` (`addCompletedAction`) posts the action through the real
`POST /api/tickets/:id/actions`. No assertion was removed or loosened.

## Hand-equivalent check (task step 5)

| File | What it proves |
|---|---|
| `manual-actions-card-check.cjs` | The script (run from the repository root with both dev servers on the dev database). It creates a fresh Ticket as the dedicated E2E Requester - not a demo-seed Ticket, so no seeded Ticket gains permanent action rows - then, as IT Staff in a real Chromium: create planned, edit, complete, and create-then-cancel a second planned action; then signs in as the Requester and checks the read-only card. It fails on any `console.error`, `pageerror` or same-origin 5xx |
| `manual-actions-card-check-run1-creation-minute.txt` | Run 1 found a defect: the composer's default time is the current Bangkok minute (seconds dropped), so on a Ticket created in that same minute the server refused it as before `createdAt` (BR-07), with a 400 in the console |
| `manual-actions-card-check-run2-panel-stays-open.txt` | Run 2, after the time fix, found the second: after a successful Save the Edit panel stayed open (and so would Complete/Cancel on a now-finished action), so the row's Complete button never came back |
| `manual-actions-card-check-run3-signed-out-401.txt` | Run 3: every staff step and the Requester card pass; the only console lines are two 401s from the signed-out session probe before the Requester signs in, a status C-149 allowlists |
| `manual-actions-card-check.txt` | Final run: all four operations, the Requester sees 2 rows and 0 buttons, and no console error, page error or 5xx (the Requester page is watched from sign-in on) |

## Changes to the planner's patch

1. `bangkokLocalToIso(local, notBefore?)`: the Ticket's own creation minute is sent as
   `createdAt` exactly; an earlier minute is still sent unchanged for the server to refuse.
   Used by the composer, Edit and Complete. UNIT-09 gains three expectations.
2. A successful row write (Edit, Complete, Cancel) closes its panel. UI-31..UI-33 gain the check.
3. After the end-of-Issue audit (one read-only Opus subagent): the Edit panel compares the draft
   with the values it opened with, not the re-fetched action, and Complete sends `actionAt`
   only if this user changed it. Before this, "Apply my changes again" after a `STALE_UPDATE`
   wrote another user's change back with the old value, which is the lost update C-138 exists to stop.
   UI-34's re-fetched action now carries another user's `attachmentNotes` (`red-audit-fixes.txt`:
   UI-34 failed before the fix). Also: Ticket-level `STALE_UPDATE` waits for the re-fetch
   before it offers Apply; Unassign gets the two-button panel; the stale heading shows even
   when Apply is withheld, with the ui-spec 11.4 reason line (status: the Lab 3 transition
   message; action: `TICKET_RESOLVED` or `ACTION_NOT_PLANNED` as the fresh state says); the
   gate callout gains its info icon (ui-spec 9.2). UI-40 now uses a pair the matrix never
   offers (it passed before and after; it is a tightening, not a red).

| File | What it proves |
|---|---|
| `red-audit-fixes.txt` | `npx vitest run tests/lab-04` with the tightened UI-34 and UI-40, before the audit fixes: 1 failed (UI-34), 37 passed |

`green-client-suite.txt`, `green-e2e-suite.txt` and `manual-actions-card-check.txt` were
re-captured after the audit fixes. `green-server-suite.txt` was not: this Issue changes no
server file.

Not yet proven against the real server: no route in `server/src/routes/staff.ts` reads `version` yet; that
arrives with #66. The Ticket-level `version`/`STALE_UPDATE` UI is proven against mocks only.
When #66 makes `version` required, the version-less raw PATCHes in the Lab 3 e2e specs
(`staffMoves`, E2E-12/15/26 fixtures) must send it, as tests.md 4.3 already plans.
