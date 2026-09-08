# TokTickIT — Lab 2 Handoff (rev. 3)

Context for a fresh chat or a fresh Claude Code session. Save this at
`docs/lab-02/handoff.md` so both can read it.

Author: Tammathorn Kananurak — 67070503489 — GitHub @Tammathorn
Peer reviewer: 67070503434 — GitHub @PAKATO123 (display name PAKATO)

**Changes in rev. 3:** Phase 1 is done and merged, so this file now records where the
sprint actually stands rather than only what was planned. New section 4A gives the current
state. The decision log has grown from C-01..C-41 to **C-01..C-49**. Section 7's Phase 1
prompts are kept as a record of what was run, not as work still to do.

**Changes in rev. 2:** repo path fixed to the real location (the move to `C:\dev` was
cancelled); Playwright moved from `client/` to the repository root to match labsheet
section 12; Issue count raised from seven to eight; labsheet PDF excluded from git.

---

## 1. Where Lab 1 ended

Lab 1 is submitted. Repository: https://github.com/Tammathorn/toktickit

| Item | Value |
|---|---|
| Issues | #2 #3 #4 #5 — all in Done on the board |
| Feature PRs | #1 #6 #7 #8 → `lab1-staging` |
| Release PR | #9 → `main` |
| Project board | `TokTickIT Individual Sprints`, statuses Backlog · Specified · Started · PR Review · Fixing · Done |
| Tests | server 2 pass, client 3 pass, 0 todo |
| Docs | `docs/lab-01/tests.md`, `reviewer.md`, `ai_use.md`, plus `CLAUDE.md` at root |

Working app: one page, `[Check System]` button, calls `/api/health` and
`/api/categories`, renders Online plus the four seeded categories, or Offline plus
"Unable to connect to TokTickIT API".

---

## 2. Machine setup

**Repository path — this is the real one, do not use any other:**

```
C:\Downloads\Lab1_Starter_Scaffold\toktickit
```

The move to `C:\dev\toktickit` was considered and cancelled. Any command in an older
document or an older chat that says `C:\dev\toktickit` is wrong. Always launch Claude
Code from inside the path above so relative paths resolve.

**Every time the laptop restarts:**

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# wait until the tray whale is steady and the dashboard says "Engine running"

docker ps                      # proves the daemon answers at all
docker start toktickit-db
docker ps                      # toktickit-db must be Up, 0.0.0.0:5432->5432/tcp

cd C:\Downloads\Lab1_Starter_Scaffold\toktickit
git checkout main && git pull
```

If `docker` returns `failed to connect to the docker API at npipe:...` the daemon is
simply not running yet. That is not a missing container. Do **not** re-run `docker run`
to "fix" it — the name would collide and the Lab 1 seed data is at risk. Start Docker
Desktop and wait.

Postgres runs in Docker. Container `toktickit-db`, image `postgres:16`, user /
password / database all `toktickit`, port 5432. Recreate **only if the container is
genuinely gone** (`docker ps -a` shows nothing):

```powershell
docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16
```

`server/.env`:
```
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

Two other containers exist from an unrelated project (`pgdatabase` on 15432,
`database-adminer-1` on 8080). Leave them alone.

Installed and authenticated: git 2.53, GitHub CLI (logged in as Tammathorn), Node,
Docker Desktop, VS Code. Playwright is **not** installed yet — it goes in during
phase 0, at the repository root.

Dev servers and tests, from the repo root:

```powershell
cd server; npm run dev      # API on :3000
cd client; npm run dev      # UI on :5173
cd server; npm test
cd client; npm test
```

---

## 3. Working rules that worked in Lab 1 — keep these

**Git stays with me.** `CLAUDE.md` forbids the agent from running commit, push, merge,
branch, or `gh pr`. The agent prints suggested commands; I run them and read
`git status` before every commit. Every Lab 1 commit is authored by me, and the
branch graph is what Part 1 is graded on.

**The agent gets exact replacement text.** The pattern that worked: I paste the old
lines and the new lines, it swaps them, then runs the tests. When a task needs design
judgment rather than substitution, I do it myself or ask for the full code first and
then hand it over as a substitution.

**Never accept "done" without evidence.** In Lab 1 the agent reported all eleven
Issue 1 criteria passing while PostgreSQL was not installed at all. Prompts must say:
verify by reading the file or running the command, do not infer from what looks
plausible.

**The agent's view of the machine goes stale.** It claimed Docker was not running and
the GitHub CLI was not installed when both worked — its shell predated the installs.
Restart Claude Code after installing anything, and always launch it from inside the
repo directory.

**Branch names come from the labsheet, not the agent.** It once proposed
`feature/2-api-health` when the lab specified `feature/2-health-check`.

**Never fabricate evidence.** No invented review comments, no second GitHub account,
no made-up partner responses. Where something genuinely did not happen, write what
did happen — that is worth more than a fake artifact that a grader can check against
the repo in ten seconds.

**Screenshot as you go.** Some states cannot be recreated later: a card sitting in
Fixing, a review conversation mid-thread, a validation error before it is fixed.

**Chase the reviewer early.** Lab 1 nearly failed on this. Lab 2 has roughly nine PRs;
tell @PAKATO123 during phase 0 that they will arrive through the week, not all at once,
and ask for comments with actual substance rather than "seems alright".

---

## 4. Lab 2 at a glance

60 points. Requester-facing ticketing MVP. Four screens: Development Requester
Selection, Create Ticket, My Tickets, Requester Ticket Detail. Five entities:
RequesterUser, Ticket, Attachment, Category, RelatedSystem. Around ten endpoints.
Six documents. Six levels of testing including Playwright E2E.

Roughly seven times the size of Lab 1. Estimated 26–36 hours of hands-on work, plus
peer-review waiting time. Not a one-night job.

**The structural difference from Lab 1:** the specification must exist *before* the
implementation, and Part 2 asks for a screenshot proving it. Getting the order wrong
loses those marks permanently — nothing can be backdated.

### Fixed constraints from the handout

Zen Green tokens: primary `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`, page
background `#F5F7F6`, surfaces white, text dark charcoal-green.

Attachments: JPG/JPEG/PNG/WEBP/PDF only, 5 MB per file, five active per ticket, soft
removal only, removed files never downloadable but metadata stays visible.

Seed: four categories (Account and Access, Hardware, Software, Network), at least six
related systems, at least four active Development Requesters and at least one inactive
one that must not appear in the selector. Idempotent, as in Lab 1.

Out of scope, and the agent must never add it: authentication, login, passwords,
sessions, tokens, real authorization, IT Staff workflow, public comments, internal
notes, actions taken, any status change beyond the initial New, admin functions.

### Required folder layout — labsheet section 12

```
docs/lab-02/{specification,tests,ui-spec,api-spec,reviewer,ai-use}.md
server/tests/lab-02/{create-ticket,my-tickets,ticket-detail,attachments}.api.test.ts
client/.../lab-02 tests/{CreateTicket,MyTickets,RequesterTicketDetail,AttachmentSection}.test.tsx
e2e/lab-02/requester-ticket-flow.spec.ts
artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/
```

`e2e/` sits at the repository root, beside `server/` and `client/` — **not** inside
`client/`. That is why Playwright is initialised at the root in phase 0.

Two ambiguities in section 12 that must be settled in phase 1, before any path is
written into tests.md:

- The client test folder is written as `client/.../lab-02 tests/`. Choose a concrete
  path (`client/src/__tests__/lab-02/` is the obvious one) and use it everywhere.
- Section 12 lists four server test files; the example table in section 9.1 says
  `server/tests/lab-02/tickets.api.test.ts` instead. Follow section 12 — that is the
  structure the Part 1 directory tree is graded against.

---

## 4A. Where the sprint stands — rev. 3

**Phase 1 is complete and merged.** Issue **#10** (Sprint specification and test plan),
branch `feature/1-sprint-spec`, merged to `lab2-staging` as **PR #18** on 2026-09-08.

### Documents that landed

| File | State |
|---|---|
| `docs/lab-02/specification.md` | FR-01..49, BR-01..65, AC-01..67, plus a per-field Create Ticket contract |
| `docs/lab-02/api-spec.md` | All ten labsheet section 6 capabilities, fixed check order, error-code catalogue |
| `docs/lab-02/ui-spec.md` | All nineteen appendix C bullets, validation message catalogue, pinned hex tokens |
| `docs/lab-02/tests.md` | 103 planned tests across the six section 9.2 levels, 67 of 67 AC coverage |
| `docs/lab-02/decisions.md` | **C-01..C-49** |
| `docs/lab-02/ai-use.md` | Draft, Phase 1 prompts only — finished in Issue #17 |

### Decisions added after the original C-01..C-41

| Range | Covers |
|---|---|
| C-42..C-45 | Identity transport on non-creation endpoints; malformed `page`; download `disposition`; unknown versus inactive Requester |
| C-46, C-47 | The unavailable attachment state; Selection screen screenshot location |
| C-48 | `client/tests/lab-02/RequesterSelection.test.tsx` added to the section 12 client test set |
| C-49 | Ticket Number assigned inside the creation transaction — closes the reviewer's comment on C-11 |

C-22's demo seed path was corrected to `server/prisma/seed-demo.ts`, and C-27's status
filter renamed `status` -> `currentStatus` for glossary consistency.

### Peer review

The reviewer's comment on **C-11** — the format was fixed but not the point at which the
autoincrement id becomes available — is **closed** by C-49, applied across `decisions.md`,
`specification.md` section 7 and `api-spec.md`.

### What Phase 1 changed about the plan

- One extra client test file, `RequesterSelection.test.tsx` (C-48). Section 12 names four
  and none covers the Selection screen, which carries nine acceptance criteria.
- **AC-54 has no automated test.** It is discharged by the manual visual checklist in
  `tests.md` section 4. Do not let a later phase quietly add a weaker automated test and
  call it covered.
- `server/prisma/seed-demo.ts` does not exist yet. It is written with Issue #11.
- Use `npx prisma migrate deploy`, never `npm run prisma:migrate` — that runs
  `migrate dev`, which offers a reset on drift, and C-37 forbids a reset.

### Issues remaining

| # | Issue | Branch | State |
|---|---|---|---|
| 1 | Sprint specification and test plan | `feature/1-sprint-spec` | **Done** — Issue #10, PR #18 |
| 2 | Data model, migration, seed | `feature/2-data-model` | Next |
| 3 | Development Requester context | `feature/3-requester-context` | Backlog |
| 4 | Create Ticket API and UI | `feature/4-create-ticket` | Backlog |
| 5 | My Tickets list | `feature/5-my-tickets` | Backlog |
| 6 | Ticket Detail and attachments | `feature/6-ticket-detail` | Backlog |
| 7 | E2E and responsive evidence | `feature/7-e2e-visual` | Backlog |
| 8 | Release integration and documentation | `feature/8-release-docs` | Backlog — includes Issue #17, finishing `ai-use.md` |

**Before starting Issue 2:** screenshot the merged PR #18 with its timestamp. That is the
Part 2 evidence that the specification preceded the implementation PRs, and it cannot be
reconstructed later.

---

## 5. Phase plan

| Phase | Work | Estimate |
|---|---|---|
| 0 | `lab2-staging` branch, board, eight Issues, folder scaffold, Playwright at root | 45 min |
| 1 | **Spec DD** — specification.md, api-spec.md, ui-spec.md, tests.md | 4–6 h |
| 2 | Prisma models, migration, idempotent seed | 2–3 h |
| 3 | Development Requester context and selection screen | 2–3 h |
| 4 | Create Ticket — API, Zen Green form, validation, upload | 4–6 h |
| 5 | My Tickets — search, filter, sort, pagination, states | 3–5 h |
| 6 | Ticket Detail, attachment lifecycle, ownership enforcement | 4–5 h |
| 7 | Playwright E2E, three-viewport screenshots, visual checklist | 3–4 h |
| 8 | reviewer.md, ai-use.md, README, final test results, release PR, 9-part PDF | 3 h |

### Issues and branches

| # | Issue | Branch |
|---|---|---|
| 1 | Sprint specification and test plan | `feature/1-sprint-spec` |
| 2 | Data model, migration, seed | `feature/2-data-model` |
| 3 | Development Requester context | `feature/3-requester-context` |
| 4 | Create Ticket API and UI | `feature/4-create-ticket` |
| 5 | My Tickets list | `feature/5-my-tickets` |
| 6 | Ticket Detail and attachments | `feature/6-ticket-detail` |
| 7 | E2E and responsive evidence | `feature/7-e2e-visual` |
| 8 | Release integration and documentation | `feature/8-release-docs` |

Issue 8 exists because labsheet section 10 requires the Issues to cover release
integration, and Part 1 is graded on every Issue sitting in Done. Without it,
`reviewer.md`, `ai-use.md`, the README update and the release PR are orphan commits
attached to no Issue.

Issue 1 must be merged before any other issue starts. Everything flows
feature → `lab2-staging` → one release PR → `main`, same as Lab 1. Labsheet section
10.1 forbids developing directly on `main` or `lab2-staging`, so even the phase 0
scaffold is committed on `feature/1-sprint-spec`.

### Model choice

Opus for phase 1 — four documents that cross-reference each other, where every
acceptance criterion has to map to a planned test and the API contract has to match the
data model. Sonnet loses that consistency.

Sonnet for phases 2–6 — implementing against a settled contract, faster and cheaper.

Opus again for the audit at the end of each issue.

Switch with `/model opus` and `/model sonnet`.

---

## 6. Phase 0 commands

**A. Bring the machine up**

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# wait for "Engine running"
docker ps
docker start toktickit-db
docker ps

cd C:\Downloads\Lab1_Starter_Scaffold\toktickit
git status                     # must be clean
```

**B. Branch**

```powershell
git checkout main && git pull
git checkout -b lab2-staging
git push -u origin lab2-staging
git checkout -b feature/1-sprint-spec
```

**C. Folder scaffold**

```powershell
mkdir docs\lab-02\spec
mkdir server\tests\lab-02
mkdir e2e\lab-02
mkdir artifacts\lab-02\screenshots\create-ticket
mkdir artifacts\lab-02\screenshots\my-tickets
mkdir artifacts\lab-02\screenshots\ticket-detail

New-Item artifacts\lab-02\screenshots\create-ticket\.gitkeep -ItemType File
New-Item artifacts\lab-02\screenshots\my-tickets\.gitkeep -ItemType File
New-Item artifacts\lab-02\screenshots\ticket-detail\.gitkeep -ItemType File

copy C:\Downloads\Lab_02_labsheet.pdf docs\lab-02\spec\
```

**D. Playwright, at the repository root**

```powershell
cd C:\Downloads\Lab1_Starter_Scaffold\toktickit
npm init playwright@latest
```

Answers: TypeScript · test folder `e2e` · GitHub Actions **no** · install browsers **yes**.

This creates a `package.json` at the root where there was none. That is expected. Then
open `playwright.config.ts` and confirm `testDir: './e2e'`, and verify:

```powershell
npx playwright --version
```

**E. Append to the root `.gitignore`**

```
docs/lab-02/spec/*.pdf
node_modules/
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

The labsheet PDF must be on disk for the agent to read, but it is course material, not
a deliverable, so it stays untracked.

**F. Board and Issues**

Reuse the existing project board; its six statuses already match. Create all eight
Issues before writing any Lab 2 code, all into Backlog, then move #1 to Specified.
In PowerShell, `` `n `` inside double quotes is a newline.

```powershell
gh issue create --project "TokTickIT Individual Sprints" --title "Sprint specification and test plan" --body "Branch: feature/1-sprint-spec`n`nDeliver docs/lab-02/specification.md, api-spec.md, ui-spec.md, tests.md and updated CLAUDE.md.`nBlocks every other Issue. Must be merged before implementation begins."

gh issue create --project "TokTickIT Individual Sprints" --title "Data model, migration, and idempotent seed" --body "Branch: feature/2-data-model`nDepends on #1`n`nPrisma models for RequesterUser, Ticket, Attachment, Category, RelatedSystem. Migration. Idempotent seed: 4 categories, at least 6 related systems, at least 4 active requesters and at least 1 inactive requester that must not appear in the selector."

gh issue create --project "TokTickIT Individual Sprints" --title "Development Requester context and selection screen" --body "Branch: feature/3-requester-context`nDepends on #2`n`nActive-requester API, Development Requester Selection screen, selected-requester context, Change Requester action, loading / empty / API-failure states. Testing mechanism only, not authentication."

gh issue create --project "TokTickIT Individual Sprints" --title "Create Ticket API and UI" --body "Branch: feature/4-create-ticket`nDepends on #3`n`nPOST /api/tickets with validation and backend-generated Ticket Number. Zen Green create form. Attachment upload. Six UI states: initial, validation failure, submitting, success, API failure, invalid attachment."

gh issue create --project "TokTickIT Individual Sprints" --title "My Tickets list with search, filter, sort, pagination" --body "Branch: feature/5-my-tickets`nDepends on #4`n`nPaginated owned-ticket list API and screen. Search, filters, sorting, pagination metadata, ownership enforcement, loading / empty / no-results / failure states."

gh issue create --project "TokTickIT Individual Sprints" --title "Requester Ticket Detail and attachment lifecycle" --body "Branch: feature/6-ticket-detail`nDepends on #5`n`nRead-only owned ticket detail. Attachment metadata, download, soft removal with reason. Removed attachments keep metadata but are not downloadable. Backend ownership checks with safe errors."

gh issue create --project "TokTickIT Individual Sprints" --title "E2E tests, responsive and visual evidence" --body "Branch: feature/7-e2e-visual`nDepends on #6`n`nPlaywright e2e/lab-02/requester-ticket-flow.spec.ts. UI style assertions. Desktop, tablet and mobile screenshots into artifacts/lab-02/screenshots/. Completed visual checklist in tests.md."

gh issue create --project "TokTickIT Individual Sprints" --title "Release integration and documentation" --body "Branch: feature/8-release-docs`nDepends on #7`n`nreviewer.md, ai-use.md, README and setup instructions, final test results filled into tests.md, then the release PR from lab2-staging to main."
```

**G. Phase 0 done when**

- [ ] `lab2-staging` exists on origin; current branch is `feature/1-sprint-spec`
- [ ] `e2e/` is at the root, not inside `client/`; `npx playwright --version` answers
- [ ] Section 12 folders all exist
- [ ] Labsheet PDF is in `docs/lab-02/spec/` and ignored by git
- [ ] Eight Issues on the board, each carrying its branch name and dependency
- [ ] @PAKATO123 has been told the PRs arrive across the week and that substantive
      comments are needed — do this now, not later
- [ ] Screenshot of the board with the Issues in Backlog, kept for Part 1

---

## 7. Phase 1 prompts — as run

**These were run and Phase 1 is merged.** They are kept as the record of what was actually
issued, and as the pattern for later phases: read first and write nothing, decide, then
write. `ai-use.md` carries the abbreviated versions plus the audit and review prompts that
followed them.

### 1.1 — Read first, write nothing

```
Read docs/lab-02/spec/Lab_02_labsheet.pdf and the existing CLAUDE.md.

Do not write any files yet. Report back:
1. Every deliverable the labsheet requires, grouped by which of the 9 PDF parts it feeds.
2. The business rules the handout states explicitly, and the areas where it says I must
   discover rules myself (section 4.3 lists eleven areas).
3. Everything explicitly excluded from Lab 2 scope.
4. Ambiguities and conflicts you found in the handout that I need to decide before
   any specification can be written. For each one, give me the options and your
   recommendation with a reason.

Be exhaustive on point 4 — that list is the actual work of this phase.
```

### 1.2 — Update the guardrail

```
Update CLAUDE.md for Lab 2. Keep the Lab 1 rules that still apply (mandatory stack,
never run git commands) and add:

- Repository path is C:\Downloads\Lab1_Starter_Scaffold\toktickit. There is no
  C:\dev\toktickit.
- Lab 2 scope: Requester-facing only. Never add authentication, sessions, passwords,
  IT Staff workflow, comments, internal notes, actions taken, or status changes beyond New.
- The Development Requester selector is a testing mechanism, not authentication. Say so
  in the UI.
- Zen Green tokens, exactly: primary #006B3C, secondary #0B7A46, pale #EAF6EF,
  page background #F5F7F6.
- Playwright is now in scope for the root-level e2e/ folder only. Still no other new
  frameworks.
- Required folder layout from labsheet section 12, including e2e/ at the repository
  root rather than inside client/.
- Rule: docs/lab-02/specification.md, api-spec.md, ui-spec.md and tests.md are the
  contract. If a task seems to need behavior not covered there, stop and ask rather
  than inventing a rule.
```

### 1.3 — specification.md

```
Write docs/lab-02/specification.md using the eleven-section template in labsheet
appendix A, and the decisions I gave you above.

Requirements:
- Numbered FR-01.., BR-01.., AC-01.. — each one atomic and testable.
- Business rules must cover all eleven areas from section 4.3: defaults and
  system-generated values, requester selection and switching, ownership, search,
  filtering, sorting, pagination, validation, duplicate-submission prevention, failure
  behavior and retained data, the full attachment lifecycle, inactive requesters, empty
  and no-results states, ticket detail access, and the Lab 3 auth transition.
- Fixed attachment constraints: JPG/JPEG/PNG/WEBP/PDF, 5 MB per file, 5 active per
  ticket, soft removal only, removed files not downloadable.
- Acceptance criteria in Given-When-Then form.
- Section 11 records the decisions I made, with my reasoning, not yours.

Do not restate the handout. This is an engineering specification, not a summary.
Flag anything you had to assume in section 11 rather than burying it.
```

### 1.4 — api-spec.md and ui-spec.md

```
Write docs/lab-02/api-spec.md and docs/lab-02/ui-spec.md from the approved
specification.md.

api-spec.md: every endpoint in labsheet section 6, with path, method, params, request
and response shapes, validation, ownership checks, pagination metadata, status codes
for success, invalid input, missing resource, ownership failure, unsupported file type,
oversized upload, and unexpected error. Safe error messages that leak no internals.

ui-spec.md: cover every bullet in appendix C. Use the exact Zen Green tokens from
CLAUDE.md. Include the app shell, all four screens, every control state
(editable, read-only, invalid, disabled, focused, busy), validation placement,
badge rules, list-versus-card responsive behavior, the three viewport rules from
section 8.7, accessibility, and the screenshot paths under artifacts/lab-02/screenshots/.

Both files must be consistent with specification.md. If you find a conflict, stop and
tell me instead of silently resolving it.
```

### 1.5 — tests.md

```
Write docs/lab-02/tests.md using the appendix B template.

The planned-test table needs the columns from labsheet 9.1: Test ID, Type,
Requirement/AC, What It Tests, Expected Result, Automated Test File, Final.
Leave Final blank — it gets filled after implementation.

Cover all six levels: unit, API, UI component, UI style, responsive, E2E.
Test file paths must match labsheet section 12: server/tests/lab-02/ with the four
named files, the client test folder we settled on, and e2e/lab-02/ at the repository
root. Where section 9.1 and section 12 disagree on a filename, follow section 12.

Then produce the AC-to-test traceability matrix and verify every single AC in
specification.md maps to at least one planned test. Tell me explicitly if any AC has
no test — do not quietly add one to make the matrix look complete.
```

Then: commit, PR into `lab2-staging`, peer review, merge — and **screenshot the merged
PR with its timestamp**. That screenshot is the Part 2 evidence that the spec preceded
the implementation. Take it before starting Issue 2.

---

## 8. Per-issue loop

Same rhythm as Lab 1, once per issue:

1. Move the card Backlog → Specified → Started
2. `git checkout lab2-staging && git pull && git checkout -b feature/N-slug`
3. Agent implements against the contract; I read every changed file
4. Run both suites myself; capture screenshots of any new UI states now
5. `git add .` → read `git status` → commit → push → `gh pr create --base lab2-staging`
6. Card → PR Review; send the link to @PAKATO123
7. Approved → merge → card → Done

---

## 9. PDF checklist — nine parts

Filename `report_lab02_67070503489.pdf`, headings `Answer Part 1` … `Answer Part 9`
in that exact order. Keep it concise; the handout penalises padding. Lab 1's report ran
19 pages and that felt right.

| Part | Pts | Needs |
|---|---|---|
| 1 | 10 | Commit graph on main, board all Done, rendered reviewer.md with both-direction comments, README and .gitignore, IDE directory tree |
| 2 | 5 | Rendered specification.md with numbered FR/BR/AC/DoD, plus proof it predates the implementation PRs |
| 3 | 10 | Rendered tests.md — planned table, AC traceability, real file paths, final pass status, and passing output from main |
| 4 | 5 | Rendered ai-use.md — LLM named, 6–10 key prompts, short reflection |
| 5 | 0 | Requester Selection screen (scored inside Part 6) |
| 6 | 10 | Create Ticket in six states: initial, validation failure, submitting, success, API failure, invalid attachment. Plus selector, dropdown, selected-user display, Change Requester, loading, failure. Show requesterId matches the saved ticket |
| 7 | 10 | My Tickets for Requester A, then switch to B and show A's tickets gone. Search, filters, sort, pagination, empty, no-results, cross-requester rejection |
| 8 | 5 | Ticket Detail, add attachment, download, soft removal with reason, retained metadata, blocked download of removed file, unauthorized access rejected |
| 9 | 5 | Rendered ui-spec.md plus desktop/tablet/mobile screenshots and the completed visual checklist |

Note the document is `ai-use.md` in Lab 2 (hyphen), where Lab 1 used `ai_use.md`
(underscore). Match the handout.

Two traps carried over from Lab 1: delete every `(fill this in)` heading from the
templates before screenshotting, and make sure reviewer.md carries the reviewer's
name, student ID, GitHub username **and** the links to the PRs reviewed in both
directions.
