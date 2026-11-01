# PR #74 review fix - a replay key reused on another Ticket (C-199)

Evidence for the change PAKATO123 requested on PR #74 (Issue #64). The folder is named by the GitHub
number. Text files are headed with their command, date, branch and commit, ANSI stripped; no session
token, hash or database URL is in this folder.

| File | What it proves |
|---|---|
| `red-actions.txt` | API-125 to API-128 run before the fix on `feature/lab4-3-actions-api` at `5e29bd1`: 4 failed (the route answered 200 with the other Ticket's DTO) |
| `green-actions.txt` | The whole `actions-taken.api.test.ts` after the fix at `0e21ac8`: 61 passed |
| `red-comments-notes.txt` | API-129 to API-132 run before the fix on `feature/lab4-5-ticket-workflow` at `81147fe`: 4 failed (200 with the first Ticket's entry) |
| `green-comments-notes.txt` | The whole `ticket-workflow.api.test.ts` after the fix at `21e5e0c`: 72 passed |
| `green-server-suite.txt` | `cd server; npx vitest run --reporter=verbose` on `feature/lab4-10-release-docs` at `8dcf0d3`, after the fix was merged up 3->4->5->6->7->8->9->10: **518 passed, 21 files** (510 + API-125 to API-132) |
| `green-client-suite.txt` | `cd client; npx vitest run` at `8dcf0d3`: **193 passed, 15 files**, unchanged |
| `green-e2e-lab4-desktop.txt` | `npx playwright test --project=desktop e2e/lab-04` at `8dcf0d3`: **48 passed, 1 skipped** (`legacy-history`, which needs `toktickit_rehearsal`). API and client ran on a new `toktickit_e2e009`, migrated with zero drift and seeded; both servers were stopped by process id afterwards |
