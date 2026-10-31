# Issue 6 (#67) - IT Staff and Administrator dashboard

Terminal and Part 5 evidence for `feature/lab4-6-staff-dashboard`, ANSI stripped. Each text
file is headed with its command, date, commit and exit code; the header says what was
uncommitted at capture time. The folder is named by the GitHub number (`issue-67`), like
`issue-64/` to `issue-66/`. No file here contains a session token or a password hash (checked:
no `tt_session=` value, no 64-hex string, no `passwordHash`, no `scrypt$`).

## Tests first

| File | What it proves |
|---|---|
| `red-staff-dashboard-server.txt` | `npx vitest run tests/lab-04/staff-dashboard.api.test.ts` with the new file and **no** #67 code: 24 failed of 24. The dashboard route answers 404; the queue rejects `sort=lastActivityAt:desc` (400) and ignores `requesterResolved` |
| `red-dashboards-client.txt` | The client tests of `tmp/lab4/07` applied alone (`--include="client/tests/*"`): 26 failed, 24 passed. Every StaffDashboard and RequesterDashboard test, and the three adapted Lab 3 tests (Login UI-50, the landing test, ChangePassword UI-13) fail; the untouched Login and ChangePassword tests pass |
| `red-audit-fixes-client.txt` | The audit's strengthened client tests with `Dashboard.tsx` temporarily missing the two audit fixes: UI-01 (card `href` must be its `drillDown`) and STYLE-10 (`aria-live="polite"` on the Updated line) fail; the other strengthened tests already held |

## Suites

| File | What it proves |
|---|---|
| `green-staff-dashboard-server.txt` | The new file after the patch: 24 passed |
| `green-staff-dashboard-server-verbose.txt` | The same file with `--reporter=verbose`, so every test name prints. It holds **SEC-05**, the Part 5 role-restriction evidence (C-180): a Requester calling `GET /api/dashboard/staff` gets 403 `FORBIDDEN_ROLE` with a body of exactly `{ error: { code, message } }` and no metric content |
| `green-server-suite.txt` | `cd server; npm test`: **494 passed, 20 files** (470 before + 24 new: API-60..API-81, SEC-05, SEC-07; nothing deleted or skipped) |
| `green-client-suite.txt` | `cd client; npx vitest run`: **192 passed, 15 files** (166 before + 15 StaffDashboard + 3 audit additions + 8 RequesterDashboard; the 3 additions are extra declarations under UI-07, UI-10, UI-12) |
| `e2e-suite-run1-resp12-header.txt` | First full e2e run: 277 passed, 34 skipped, **1 failed** - L3 RESP-12 at tablet: with Dashboard added (C-144) the Administrator's header overflowed the 720 px md container by 84 px. Fixed in `theme.css` (the header container uses the full width in the 768-991 px band only) |
| `e2e-suite-run2.txt` | Full run after the header fix: 278 passed + 34 skipped = 312 runs |
| `e2e-suite-run3-econnreset.txt` | First full run after the audit fixes: 277 passed, 34 skipped, 1 failed - desktop L3 E2E-46 hit a transport `ECONNRESET` on an API sign-in (the #64 flake), not an assertion. One `tt_session` value in its call log is redacted |
| `green-e2e-suite.txt` | Final full run with fresh servers: **278 passed + 34 skipped = 312 runs**, the same as before this Issue (no Lab 4 e2e spec exists yet). The adapted E2E-48 also wrote nine `nav-<vp>-<role>-dashboard.png` files under `artifacts/lab-03/`; they were removed with the `git checkout -- artifacts/lab-02 artifacts/lab-03` restore, not committed |

## Part 5 - metrics match database queries (C-127, BR-56)

Captured on the dev database (`toktickit`) with the API running and **no** e2e run in
progress; the API capture and the psql run were back to back (about 25 s apart; nothing else
was writing).

| File | What it proves |
|---|---|
| `part5-staff-cards.sql` | One hand-written SQL query per staff card (api-spec 4.2 "Query, in words"), plus the Administrator's user counts by role. The caller is `araya.m@example.ac.th` (IT Staff) |
| `part5-psql-staff-cards.txt` | `psql -f part5-staff-cards.sql` output (run through `docker exec`, the file copied in with `docker cp`) |
| `part5-api-staff-dashboard-it-staff.json` | `GET /api/dashboard/staff` as the IT Staff account at the same moment |
| `part5-api-staff-dashboard-administrator.json` | The same as the Administrator (`panida.s@example.ac.th`): it has `userCounts` |
| `part5-api-drilldown-totals.json` | For each card: its `count`, the drill-down API (`GET /api/staff/tickets?<the card's query>`) and its `meta.total`; for My planned actions the panel's row count; for each user card the `GET /api/users?role=` row count. Every `equal` is `true` |

The three sources agree on every card: unassigned 1935, mine 246, New 2200, Open 143,
In Progress 29, Waiting for Requester 1, Reopened 1, Resolved 63, High IT Priority 10,
Requester says resolved 49, My planned actions 2; Requesters 143 (142 active), IT Staff 49
(48 active), Administrators 1 (1 active). The large counts come from users and Tickets that
earlier e2e runs left in the dev database.

Screenshots of the dashboards (E2E-33, C-180's Requester capture) belong to
`e2e/lab-04/dashboards.spec.ts`, which Issue 9 writes; they are not part of this folder.

## Adapted tests (no assertion removed or loosened)

| Test | Decision | Change |
|---|---|---|
| L3 UI-50, the landing test (`client/tests/lab-03/Login.test.tsx`) | C-144 | Nav gains `Dashboard` first; every role lands on `/dashboard` (from the planner's patch) |
| L3 UI-13 (`client/tests/lab-03/ChangePassword.test.tsx`) | C-144 | After the change the app continues to `Dashboard` (from the planner's patch; added to tests.md 4.2) |
| L3 E2E-01, E2E-03, E2E-05, RESP-07, the Forbidden test (`e2e/lab-03/authentication.spec.ts`) | C-144 | Landing `/dashboard`, heading `Dashboard`, nav `Dashboard` first, `Go to Dashboard` |
| L3 E2E-06, RESP-08 (same file) | C-144 | Wait for the landing heading `Dashboard` instead of `My Tickets` (added to tests.md 4.3) |
| L3 E2E-48 (`e2e/lab-03/visual-evidence.spec.ts`) | C-144 | Each role's aria-current walk starts at `/dashboard` |
| L2 RESP-04 (`e2e/lab-02/requester-ticket-flow.spec.ts`) | C-144 | Title only: "both nav items" became "the nav items" |

## Changes to the planner's patches (`tmp/lab4/06`, `tmp/lab4/07`)

Both applied cleanly (no `-3`). Changes made afterwards:

1. `client/src/theme.css`: in the 768-991 px band the header container uses the full width.
   With Dashboard first in the nav (C-144) the Administrator's header overflowed at 834 px
   (L3 RESP-12, `e2e-suite-run1-resp12-header.txt`).
2. After the end-of-Issue audit (one read-only Opus subagent; one blocker):
   - `Dashboard.tsx`: the `Updated …` line is `aria-live="polite"` (ui-spec 14, STYLE-10 - the
     blocker); the My planned actions card's `href` is its `drillDown` (`/dashboard#my-actions`)
     instead of `#my-actions`; a no-op label ternary removed.
   - `StaffTicketQueue.tsx`: an invalid `requesterResolved` in the URL shows its field message
     under the select, like the category filter.
   - `StaffDashboard.test.tsx` now asserts what its tests.md rows ask: UI-03 View all kept on
     empty lists; UI-04 15 min with no request, Refresh disabled and busy in flight, the Updated
     line changing; UI-05 no `+N`/`-N` delta text; UI-07 seven rows in API order, card 7, footer,
     focus on arrival at the hash; UI-09 Refresh disabled while loading and kept on failure;
     UI-10 the `requesterResolved=true` landing (Only these, the request, Last updated =
     `lastActivityAt`); UI-11 changing the role writes the URL; UI-12 `aria-current` on
     `/dashboard#my-actions`; STYLE-09 the status badge; STYLE-10 aria-live, one `h1`, named links.
   Not changed (audit notes): the loading skeleton draws one list panel, not three (ui-spec 12.1).
