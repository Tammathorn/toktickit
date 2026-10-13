# TokTickIT - Project Constraints

CPE 334 Lab 4 (Individual Sprint 4). Actions Taken, the final Ticket workflow, role
dashboards, and hardening of Labs 1-3, on the Lab 3 product: React UI -> Express REST API ->
Prisma ORM -> PostgreSQL.

These constraints come from `docs/lab-04/spec/Lab_4_sheet.pdf` and the approved decisions in
`docs/lab-04/decisions.md` (C-122 onward). They override default preferences and "better"
alternatives - this is graded coursework against a fixed contract.

Lab 3 history lives in `docs/lab-03/` and Lab 2 history in `docs/lab-02/`. Their rows still
bind wherever `docs/lab-04/decisions.md` does not supersede them. Cite an earlier rule as
`L3 C-93` or `L2 C-26`, never bare.

## Repository path

`C:\Downloads\Lab1_Starter_Scaffold\toktickit` is the only path. There is no
`C:\dev\toktickit`; any older document that says otherwise is wrong. Always work from inside
this directory so relative paths resolve.

## Mandatory stack - no substitutions

| Area | Required |
| --- | --- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Architecture | REST-style APIs |
| Testing | Vitest (frontend/unit) + Supertest (API) + Playwright (E2E) |

**Never install, scaffold, import, or suggest:** Next.js, Tailwind, Drizzle, Jest, or any
other framework, database, ORM, or UI library.

**Authentication libraries stay banned:** `passport`, `jsonwebtoken`, `bcrypt`, `bcryptjs`,
`argon2`, `express-session`, and any hosted or third-party identity service. Authentication
uses `node:crypto` and Prisma alone. If a task seems to need one of these, stop and say so.

**Approved dependencies:** Playwright, for the root-level `e2e/` folder only, installed at the
repository root and never inside `client/`; and multer, for attachment multipart parsing.
No other new dependency without asking first. Client routing stays the hand-rolled
`client/src/router.tsx` with route guards; no router library (L3 C-85).

**The approved authentication mechanism.** Passwords: scrypt from `node:crypto`, per-user
16-byte salt, stored `scrypt$N$r$p$salt$hash`, compared with `timingSafeEqual` (L3 C-53).
Sessions: rows in a `Session` table; a 32-byte opaque token in the `tt_session` cookie with
only its SHA-256 stored; `HttpOnly; SameSite=Strict; Path=/`; 8 hours absolute, no sliding
renewal (L3 C-54, C-55). The Vite dev server proxies `/api`, so the app is same-origin, and
`VITE_API_URL` is the empty string (L3 C-56). CSRF cover is `SameSite=Strict` plus an
`Origin` check on state-changing requests (L3 C-58).

## Scope - Lab 4

Lab 4 adds an Actions Taken area on both Ticket Detail screens (staff read-write, Requester
read-only); the resolution gate and stale-update protection on the Ticket workflow; an IT
Staff dashboard (also the Administrator's, with user counts); a Requester dashboard; and
hardening across Labs 1-3.

**Never add** (labsheet 4.2, plus the Lab 3 list where it still applies):

SLA clocks, escalation engines, on-call scheduling, breach notifications; email, SMS, LINE,
push or any notification service (invitations and password mail included); inventory, spare
parts, purchasing, cost accounting; time sheets, billing, payroll, labor cost; multi-level
approval, electronic signatures; BI tools, report builders, export; multi-tenancy,
organizations, departments, production cloud operations; MFA, SSO, social login,
self-registration; extended profiles, profile photos, a Profile menu (C-144); multiple roles
per user, role history, account-audit screens; user deletion, bulk operations, import or
export, user-list pagination; lockout, unlocking, recovery, approval workflows; multi-column
sorting, multiple simultaneous filters; administrator management of Categories and Related
Systems; uploads on Actions Taken (C-134); Ticket creation by staff (L3 C-101, C-144);
auto-polling or live-updating dashboards (C-128); "from yesterday" deltas (C-142); any feature
the Sprint 4 contract does not approve.

## Security rules

Not style preferences - every one is graded.

- **Identity comes only from the session.** A `requesterId` in a query string or a request
  body is ignored (L3 C-64). Never trust a client-supplied identity for anything.
- **Role checks run in server middleware**, not in a screen. A hidden or disabled button is
  feedback, not a security control.
- **404 for a resource the caller may not see; 403 for an operation the role may never
  perform** (L3 C-65). A Requester calling a staff-only endpoint gets 403 before the resource
  is loaded, so the status reveals nothing about existence.
- **The check order is fixed** - L3 C-63, extended by C-138 and C-159.
- **Never return or log a password, a `passwordHash`, or a session token**, on any path,
  including error paths.
- **Seeded passwords are local-development only**, documented in the README, never a real
  personal password (L3 C-72).

## Lab 4 workflow rules
Cited, not restated - read the row before touching the code it governs.

- Version check and 409 `STALE_UPDATE` - C-138.
- Check order, with `TICKET_CLOSED` and `TICKET_RESOLVED` after ownership - C-138, C-159.
- Resolution gate, `OWNER_REQUIRED` first - C-137.
- `clientRequestId` duplicate handling - C-139.
- Row lock at the start of each workflow transaction - C-137.
- `lastActivityAt` never written by Internal Notes - C-140.

## Zen Green theme tokens

Use these values exactly:

| Token | Value | Use |
| --- | --- | --- |
| Primary green | `#006B3C` | App header, primary actions, strong emphasis |
| Secondary green | `#0B7A46` | Active tabs, focus accents, links, hover states |
| Pale green | `#EAF6EF` | Selected, success, subtle section emphasis |
| Page background | `#F5F7F6` | Page ground |
| Surface | White | Cards, with subtle border and restrained shadow |
| Text | Dark charcoal-green | Body text - not pure black |

Read-only fields: soft gray-green or warm ivory. Errors: dark red, message directly below the
field. Success never relies on color alone. New screens match the existing app; Public
Comments, Internal Notes and Actions Taken are visually distinct.

## Product name

**TokTickIT** everywhere - headings, titles, component names, test assertions, docs. The
labsheet illustration's "TikTockIT" is a typo and is not followed.

## The contract

```
docs/lab-04/specification.md   api-spec.md   ui-spec.md   tests.md   decisions.md
```

`decisions.md` records C-122 onward and which Lab 2 and Lab 3 rows it supersedes.
`docs/lab-04/phase1-analysis.md` is the codebase survey - reference, not contract. If a task appears to need behavior none of these cover, **stop and ask** rather than inventing
a rule. Never silently resolve a conflict between two of them - report it.

## Lab 4 working rules

1. **Contract merged before code.** Issue 2 does not start until the contract PR has merged
   into `lab4-staging`.
2. **Every count card has a drill-down whose list total equals the count**, proven by an API
   test per card (C-127).
3. **The server decides what the UI offers.** Allowed status moves and action operations come
   from the API (`allowedTransitions`); no status matrix is copied into the client. The server
   still enforces every rule.
4. **No console errors.** The e2e fixture fails a test on `console.error`, `pageerror` or a
   same-origin 5xx, with the allowlist C-149 defines.
5. **Every evidence folder has a `README.md`** naming every file and what it proves.
6. **Review comments are answered on GitHub first**, then recorded in `reviewer.md`.
7. **`ai-use.md` is a running log** - one or two prompts per Issue, plus what went wrong.

## Required repository structure

Labsheet section 12 for Lab 4, alongside the `lab-01`..`lab-03` trees. It is a **minimum**:
files may be added; named files are never renamed, relocated, or removed.

```
docs/lab-04/            specification  api-spec  ui-spec  tests  decisions  reviewer
                        ai-use  handoff  phase1-analysis                     (.md)
server/tests/lab-04/    actions-taken  ticket-workflow  requester-dashboard
                        staff-dashboard                              (.api.test.ts)
                        migration.db.test.ts
                        the perf-smoke script, run by `npm run test:perf` (C-148)
client/tests/lab-04/    StaffDashboard  RequesterDashboard  ActionsTaken
                        TicketWorkflow                                  (.test.tsx)
e2e/lab-04/             actions-taken-flow  ticket-resolution  dashboards  (.spec.ts)
artifacts/lab-04/       screenshots/{staff-dashboard,requester-dashboard,actions-taken,
                        ticket-workflow,regression}/
                        evidence.md   evidence/issue-<N>/README.md
```

The labsheet's `client/.../lab-04 tests/` is `client/tests/lab-04/`: `client/vite.config.ts`
collects only `tests/**/*.test.tsx`, and any other folder collects zero tests yet passes.

`artifacts/` is tracked evidence. `test-results/`, `playwright-report/`, `blob-report/`,
`server/uploads/`, `e2e/.auth/`, `tmp/` and `docs/lab-0*/spec/*.pdf` stay ignored.

## Labs 1-3 must keep working
Lab 1, 2 and 3 behavior and their tests keep passing on the final `main`.
**Never delete or skip a test to make a suite green.** A test is *adapted* where a decision
changed what it asserts, and **retired only when a decision row names its replacement**. Any
drop in a suite count must match a retirement row in `docs/lab-04/tests.md`; count by test ID,
not by file. If a test fails, fix the cause or report it.

The Lab 1 API contract is unchanged and public (L3 C-62):

```
GET /api/health     -> 200 { "status": "ok", "service": "TokTickIT API" }
GET /api/categories -> 200 [ { "id": 1, "name": "Account and Access" }, ... ]
```

`/api/related-systems` and `POST /api/auth/login` are also public, and `/system-check` stays
public (L3 C-87, C-149). Every other route requires a session.

## Database and migrations

- **Never run `prisma migrate reset`** - it destroys seed data.
- Create a migration with `npx prisma migrate dev --create-only`, read the SQL, then apply it
  with `npx prisma migrate deploy` (`npm run prisma:migrate` runs deploy, L3 C-86). If Prisma
  offers a reset, answer no and stop.
- Lab 4 migrations are additive only (C-145).
- Prove zero drift after every migration with `npx prisma migrate diff ... --exit-code`.
- Seeds stay idempotent - `upsert` or a natural key (L3 C-91, C-146). Re-running creates no
  duplicates and never overwrites a changed password (L3 C-72).
- Rehearse every migration first on `toktickit_rehearsal`, restored from
  `C:\Users\Tamat\Downloads\lab3-final.dump` (C-129, L3 C-83). Recovery is restoring that
  dump; there is no down-migration.

## Required tests

Ten levels, per labsheet section 10: unit, API/integration, UI component, UI style,
responsive, authorization, **workflow**, migration/regression, **performance-smoke**, and E2E.
The level is carried by the Test ID column, not by the file name.

| Tool | Covers |
| --- | --- |
| Vitest | Unit, UI components, UI style assertions |
| Supertest | Actions Taken, workflow, dashboards, authorization, migration, Labs 1-3 regression |
| Playwright | Actions Taken flow, Ticket resolution, dashboards, three viewports |
| `npm run test:perf` | Performance smoke against `toktickit_perf` (C-148) |

A security claim needs a test, not a code reading: the route-inventory test fails if a
non-public route answers without a session, and the matrix test compares every route with
the authorization matrix (C-155). Name tests so terminal output reads as evidence, e.g.
`Requester POST /api/tickets/:id/actions -> 403, no action created`.

Every acceptance criterion maps to at least one planned test naming its actual file path.
Tests first: run them and capture the failing output before implementing. Evidence is
passing terminal output, recorded in `docs/lab-04/tests.md`.

## Evidence

Much evidence can only be captured while the state exists. Owed on every Issue:
- **`artifacts/lab-04/evidence.md` is the index.** It maps every Part requirement to its
  evidence file, the Issue that produces it, and a status: `captured`, `pending` or
  `manual`. Every Issue updates it. A PR is not ready while one of its rows is pending.
- **UI states** are written by the Playwright specs in `e2e/lab-04/` under the names
  `ui-spec.md` fixes, as `<folder>/<screen>-<viewport>-<state>.png`. Wait for transitions to
  settle before capturing.
- **Terminal evidence** - red and green runs - is saved as text under
  `artifacts/lab-04/evidence/issue-<N>/`, ANSI stripped, headed with the command, the date
  and the commit hash.
- **GitHub evidence** - PR conversations, approvals, merge times, the commit graph and the
  project board - is captured when it happens, named by date and state.
- **Every image comes from the real running app or the real GitHub page.** Never edit an
  image, and never stage a state that did not happen. A mocked capture is named as mocked.

## Git rules - working agreement

You run git and gh yourself. Limits that never relax:

- Never `git add .` or `git add -A`. Stage explicit paths and run `git status` after staging.
- Never force-push, never rebase a pushed branch, nothing reaches `main` except the one
  release PR.
- Commit messages are short, imperative, prefixed - `feat:` `fix:` `test:` `docs:`
  `chore:` - and carry no Co-Authored-By or Claude-Session trailer.

### Pre-commit inspection - owed before every commit

1. Run `git status` and `git diff --stat`.
2. Report **exactly which files are staged** - name every one.
3. Flag anything unexpected: build output, uploaded attachments, `node_modules`, secrets or
   `.env` files, Playwright storage state, screenshots that do not belong to this task, and
   any file unrelated to the work. Leave such files unstaged and say so.
4. Only then commit.

### Branches and PRs (C-130)

`main` is the stable release and `lab4-staging` the integration branch; neither is committed
to directly. Feature branches are `feature/lab4-N-slug`: `1-contract`, `2-data-model`,
`3-actions-api`, `4-actions-ui`, `5-ticket-workflow`, `6-staff-dashboard`,
`7-requester-dashboard`, `8-hardening`, `9-e2e-visual`, `10-release-docs`.

- Every `gh pr create` carries `--base lab4-staging`. GitHub defaults to `main`.
- **Stacking:** feature PRs 2-9 may stack on the branch directly below while that PR awaits
  review, with `--base` set to that branch and the stack stated in the PR body. Each is
  retargeted to `lab4-staging` once the PR below merges. A change asked for in a lower PR is
  made there and merged upward with `git merge`, never a rebase, running all three suites at
  each level.
- **The contract PR (1) and the release PR (10) are never stacked.** The release PR,
  `lab4-staging` into `main`, opens only after every feature PR has merged.
- Peer review is mandatory on every PR.

## Secrets

`.env` is never committed; `.env.example` is, with placeholders only. Credentials, password
hashes, session tokens and secrets never enter a tracked file. `node_modules/`, `dist/`,
`build/` stay ignored.

## Working style

Small tasks with clear constraints. The user is responsible for every file, command,
dependency, and test - explain what changed and why, and never generate code they could not
explain. Verify by reading the file or running the command; never infer from what looks
plausible, and never report work as done without evidence.

## Token budget

- Read only the sections a task cites - grep by ID, never whole documents.
- Run only the test files touched during development; run all three suites once before the
  PR, and show summaries only.
- One subagent audit per Issue, at the end.
- Check screenshots by size; open one sample per folder.
- Final reports: at most 15 lines.
