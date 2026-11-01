# Issue 8 (#69) - Final hardening (reduced) and README

Terminal evidence for `feature/lab4-8-hardening`, ANSI stripped. Each text file is headed with
its command, date and commit. The folder is named by the GitHub number (`issue-69`), like
`issue-64/` to `issue-68/`. No file here contains a session token or a password hash (checked:
no `tt_session=` value, no 64-hex string, no `scrypt$` hash).

Scope was cut for the 31 Oct deadline: the client audit and the focus-management, UI-50 and
test-gap items are **not done** and are listed as such in `docs/lab-04/tests.md` 6.1.

| File | What it proves |
|---|---|
| `fixture-failure-messages.txt` | The console-error fixture (`e2e/support/console.ts`, C-149, C-182) trips for the right reason. For each of E2E-28..E2E-32 and E2E-30b/30c: expected versus actual status and the fixture's own message. E2E-28 (`console.error`), E2E-29 (`pageerror`), E2E-30 (a same-origin 500: both the console line and the `5xx` entry) and E2E-32 (the same 404 undeclared) fail with the fixture's message; E2E-31 (the 404 declared with `expectStatus`) and E2E-30b (a mocked 500 declared with `declareFailure`) pass; E2E-30c (a 500 declared for another URL) fails |
| `green-server-suite.txt` | `cd server; npm test`: **510 passed, 21 files**, unchanged from #68 (no server file changed) |
| `green-client-suite.txt` | `cd client; npx vitest run`: **193 passed, 15 files** (192 + the dashboard loading-placeholder test, UI-09 second declaration) |
| `green-e2e-suite.txt` | `npx playwright test`: **299 passed, 34 skipped** (278 + 21 = the seven fixture tests in `e2e/lab-04/regression.spec.ts` x three viewports). Nothing deleted or skipped; the 34 skipped are the pre-existing ones |

## Red run, honestly

The dashboard-loading test (three skeleton panels, ui-spec 12.1) was run before the change and
failed on `.tk-skeleton-panel` (0 found, 3 expected); only the tail of that run was seen and it
was not saved, so there is no red file. The fixture tests have no red run: the fixture is
new, and `fixture-failure-messages.txt` shows each negative case failing for the intended
reason.

The nine `nav-*-dashboard.png` files the Lab 3 E2E-48 spec writes into `artifacts/lab-03/` on
every run were deleted, not committed; Issue #70 moves that spec's output to `artifacts/lab-04`.
