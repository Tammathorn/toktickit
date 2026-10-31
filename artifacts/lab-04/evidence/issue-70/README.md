# Issue 9 (#70) - E2E, the final screenshots, the visual checklist and the performance smoke

Evidence for `feature/lab4-9-e2e-visual`. The folder is named by the GitHub number (`issue-70`).
Text files are headed with their command, date and commit and have ANSI stripped and session
tokens redacted (checked: no `tt_session=` value, no 64-hex string, no `scrypt$` hash, no database
password in this folder).

## How the screenshots were taken

`toktickit_evidence` (the Lab 3 one was renamed `toktickit_evidence_lab3`, nothing dropped from it)
was created new, migrated with `prisma migrate deploy` (zero drift), seeded with the graded seed and
the demo seed, and both servers were started on it. `npx playwright test e2e/lab-04` then wrote every
image in `artifacts/lab-04/screenshots/` (`e2e-capture-run.txt`: 138 passed, 3 skipped). The
`legacy-history` capture alone comes from `toktickit_rehearsal` (the Lab 3 dump, migrated; C-188), run
with `E2E_LEGACY_HISTORY=1` and the servers on that database (`e2e-legacy-history-run.txt`); that run only
reads, apart from the session rows its sign-in creates. The development database `toktickit` was not
touched. The Lab 2 and Lab 3 specs rewrite their own screenshots on every run; `git checkout -- artifacts/lab-02
artifacts/lab-03` restored them, and nothing of theirs is in this Issue's commits.

## Files

| File | What it proves |
|---|---|
| `visual-checklist.md` | VIS-01..VIS-32 at 1280, 834 and 390, every value measured in the running app; the defects the measurement found and their fixes |
| `visual-measurements-desktop.json`, `-tablet.json`, `-mobile.json` | The raw values behind each row, per page: colours, rectangles, Tab stops, dialog focus behaviour (written by `e2e/lab-04/visual-checklist.spec.ts`) |
| `card-vs-list-<account>-<viewport>.json` (12) | For VIS-09: every dashboard card clicked in the browser, its count and the total of the list it opened (written by E2E-23 and E2E-24; IT Staff, Administrator, Requester A and C) |
| `green-e2e-suite.txt` | `npx playwright test`: **413 passed, 37 skipped** (450 runs; 299 + 34 before). The 37 skipped are the 34 pre-existing ones and the three `legacy-history` runs, which need `toktickit_rehearsal` |
| `green-server-suite.txt` | `cd server; npm test`: **510 passed, 21 files**, unchanged |
| `green-client-suite.txt` | `cd client; npx vitest run`: **193 passed, 15 files**, unchanged |
| `perf-smoke.txt` | `npm run test:perf` on `toktickit_perf` (2,000 Tickets, 5,000 actions): PERF-01 and PERF-02 pass; the `EXPLAIN (ANALYZE, BUFFERS)` of each dashboard query is printed as information only (C-148) |
| `e2e-capture-run.txt` | The capture run: `npx playwright test e2e/lab-04` on the fresh evidence database, 138 passed, 3 skipped |
| `e2e-legacy-history-run.txt` | The legacy-history capture run against `toktickit_rehearsal` |
| `e2e-attempt-1-econnreset.txt`, `e2e-attempt-2-econnreset.txt` | The two full runs that lost one API sign-in each to the sporadic ECONNRESET (E2E-33, then E2E-35); everything else passed. Kept, as agreed, beside the green run. After the second, `apiAs` was changed to retry a thrown ECONNRESET up to three times |

## Screenshot counts

| Folder | Files | Contents |
|---|---|---|
| `actions-taken/` | 45 | 15 states x 3 viewports |
| `ticket-workflow/` | 30 | 10 states x 3 (legacy-history from `toktickit_rehearsal`) |
| `staff-dashboard/` | 24 | 8 states x 3 (`-lists-empty-mocked` is the one mocked state, named so) |
| `requester-dashboard/` | 15 | 5 states x 3 |
| `regression/` | 51 | 14 states x 3 = 42, plus the nine `nav-<vp>-<role>-dashboard.png` of Lab 3's E2E-48 |
| **Total** | **165** | 156 contract screenshots (52 states x 3) + 9 |

Each folder has its own `README.md` naming every file and what it proves. `-failure` captures are a
declared mocked 500 (C-182) and say so; `status-menu` shows the control, since a screenshot cannot draw a
native dropdown (the test asserts its options equal `allowedTransitions`).
