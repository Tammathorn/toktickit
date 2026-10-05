# TokTickIT - Project Constraints

CPE 334 Lab 3 (Individual Sprint 3). Users, Roles, IT Staff Ticketing and Admin Screens,
built on the Lab 2 Requester MVP: React UI -> Express REST API -> Prisma ORM -> PostgreSQL.

These constraints come from `docs/lab-03/spec/Lab_3_sheet.pdf` and the approved decisions in
`docs/lab-03/decisions.md` (C-53 onward). They override default preferences and "better"
alternatives. When a rule here conflicts with what seems technically nicer, the rule wins -
this is graded coursework against a fixed contract.

Lab 2 history lives in `docs/lab-02/`. Its log C-01..C-52 still binds Lab 2 behavior;
`docs/lab-03/decisions.md` records which rows Lab 3 supersedes. Cite a Lab 2 rule as
`L2 C-13` or `L2 BR-21`, never bare.

## Repository path

```
C:\Downloads\Lab1_Starter_Scaffold\toktickit
```

That is the only path. There is no `C:\dev\toktickit`; any command in an older document that
says otherwise is wrong. Always work from inside this directory so relative paths resolve.

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

**Authentication libraries stay banned** unless a decision row approves one: `passport`,
`jsonwebtoken`, `bcrypt`, `bcryptjs`, `argon2`, `express-session`, and any hosted or
third-party identity service. Lab 3 builds authentication from `node:crypto` and Prisma
alone. If a task seems to need one of these, stop and say so rather than substituting.

**Approved dependencies:** Playwright, for the root-level `e2e/` folder only, installed at
the repository root and not inside `client/`; and multer, for attachment multipart parsing.
No other new dependency without asking first. Client routing stays the hand-rolled
`client/src/router.tsx` extended with route guards; no router library (C-85).

**The approved authentication mechanism.** Passwords: scrypt from `node:crypto`, per-user
16-byte salt, stored `scrypt$N$r$p$salt$hash`, compared with `timingSafeEqual` (C-53).
Sessions: rows in a `Session` table; a 32-byte opaque token in the `tt_session` cookie with
only its SHA-256 stored; `HttpOnly; SameSite=Strict; Path=/`; 8 hours absolute, no sliding
renewal (C-54, C-55). The Vite dev server proxies `/api`, so the app is same-origin, and
`VITE_API_URL` is set explicitly to the empty string (C-56). CSRF cover is `SameSite=Strict`
plus an `Origin` check on state-changing requests (C-58).

## Scope - Lab 3

Nine screens: Login, Change Password, My Tickets, Create Ticket, Requester Ticket Detail,
IT Staff Ticket Queue, IT Staff Ticket Detail, User Management, and the Lab 1 Check System
page. Entities: User, Session, Ticket, Attachment, PublicComment, InternalNote, Category,
RelatedSystem.

In scope:

1. Login, logout, current user, and mandatory first-login password change
2. Three roles - Requester, IT Staff, Administrator - with role-based navigation, and
   server-side authorization and ownership on every protected route
3. Migration from the Development Requester selector to the authenticated User, with every
   Lab 2 Requester function continuing on the authenticated identity
4. IT Staff Ticket Queue - search, filters, sorting, pagination
5. IT Staff Ticket Detail - ownership, IT Priority, permitted status changes
6. Public Comments and Internal Notes, append-only, and the Requester "Problem Appears
   Resolved" action (C-76)
7. Minimalist Administrator user management
8. Loading, saving, success, validation, empty, no-results, forbidden and safe failure
   states throughout, at desktop, tablet, and mobile

**Never add** (labsheet 4.2 and 8.5): email of any kind - invitations, password-reset mail,
initial passwords by mail; multi-factor authentication; SSO; social login; self-registration
or Requester-created accounts; Actions Taken; SLA calculation; escalation rules;
notification services; dashboards or KPI analytics beyond simple queue counts;
multi-tenancy, organizations or departments; extended user profiles and profile photos;
multiple roles per user; role history or account-audit screens; user deletion; bulk user
operations; user import or export; account lockout, unlocking or recovery; administrator
approval workflows; user-list pagination; multi-column sorting; multiple simultaneous
filters; production deployment or cloud infrastructure; and administrator management of
reference data (Categories, Related Systems) - 8.5 asks for one User Management screen
only.

The Resolution Summary and the "Service Actions" tab in the mock-up are Lab 4. Do not
"prepare" for Lab 4 with extra routes, screens, or controls.

## Security rules

Not style preferences - every one is graded in Part 7 or Part 8.

- **Identity comes only from the session.** A `requesterId` in a query string or a request
  body is ignored (C-64). Never trust a client-supplied identity for anything.
- **Role checks run in server middleware**, not in a screen. A hidden or disabled button is
  useful feedback; it is not a security control.
- **404 for a resource the caller may not see; 403 for an operation the role may never
  perform** (C-65). A Requester calling a queue or Internal Notes endpoint gets 403, and
  gets it before the resource is loaded, so the status reveals nothing about existence.
- **The check order is fixed** (C-63): session -> password-change gate -> role -> parse
  parameters -> load the resource -> ownership -> body validation.
- **Never return or log a password, a `passwordHash`, or a session token**, on any path,
  including error paths.
- **Seeded passwords are local-development only**, documented in the README, and never a
  real personal password.

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

Read-only fields use soft gray-green or warm ivory shading. Errors are dark red with the
message directly below the field. Success must not rely on color alone. New screens must
look like part of the same application, not a second visual system. Public Comments and
Internal Notes must be visually distinct.

## Required repository structure

Labsheet section 12, the Lab 3 minimum, alongside the existing `lab-01` and `lab-02` trees.

```
client/tests/lab-03/   Login  ChangePassword  StaffTicketQueue  StaffTicketDetail
                       UserManagement                                  (.test.tsx)
server/tests/lab-03/   auth  authorization  staff-queue  staff-ticket-detail
                       comments-notes  users-admin            (.api.test.ts)
                       migration.db.test.ts
e2e/lab-03/            authentication  staff-ticket-flow  user-administration  (.spec.ts)
artifacts/lab-03/      screenshots/{authentication,staff-queue,staff-ticket-detail,
                       user-management}/   migration/
                       evidence.md  evidence/issue-<N>/  screenshots/github/
docs/lab-03/           specification.md  api-spec.md  ui-spec.md  tests.md
                       decisions.md  reviewer.md  ai-use.md  handoff.md
```

Section 12 is a **minimum**. Files may be added; the named files must not be renamed,
relocated, or removed. Where labsheet section 10's example table disagrees with section 12
on a filename, section 12 wins (C-84). Client tests go in `client/tests/lab-03/` because
`client/vite.config.ts` includes only `tests/**/*.test.tsx` - any other location collects
zero tests and still reports success.

`artifacts/` is tracked; it is evidence. `test-results/`, `playwright-report/`,
`blob-report/`, `server/uploads/`, `e2e/.auth/` and `docs/lab-03/spec/*.pdf` stay ignored.

## The contract

These five documents are the contract:

```
docs/lab-03/specification.md   api-spec.md   ui-spec.md   tests.md   decisions.md
```

`decisions.md` records C-53 onward and which Lab 2 decisions they supersede.
`docs/lab-03/phase1-analysis.md` is the codebase survey they were written against; it is
reference, not contract.

If a task appears to need behavior that none of these cover, **stop and ask** rather than
inventing a rule. Do not silently resolve a conflict between two of them - report it.

## Lab 1 and Lab 2 must keep working

Lab 1 and Lab 2 behavior and their tests keep passing on the final `main`.

**Never delete or skip a test to make a suite green.** A Lab 2 test may be *adapted* to log
in, and an assertion may be *rewritten* where a decision changed the behavior it asserts. A
test is **retired only when a decision row names its replacement**. Any drop in a suite count
must match a retirement row in `docs/lab-03/tests.md`; count by test ID, not by file. If a
test fails, fix the cause or report it.

The Lab 1 API contract is unchanged and stays public (C-62):

```
GET /api/health     -> 200 { "status": "ok", "service": "TokTickIT API" }
GET /api/categories -> 200 [ { "id": 1, "name": "Account and Access" }, ... ]
```

`/api/related-systems` and `POST /api/auth/login` are also public, and `/system-check` stays
public (C-87). Every other route requires a session.

## Database and migrations

- **Never run `prisma migrate reset`** - it destroys seed data (L2 C-37).
- **Never run `npm run prisma:migrate`** - until C-86 repoints it in Issue 2 it still runs
  `migrate dev`, which can offer a reset.
- Apply migrations with `npx prisma migrate deploy`. Create them with
  `npx prisma migrate dev --create-only` and edit the SQL before applying. If Prisma offers
  a reset, answer no and stop.
- The `RequesterUser` -> `User` rename is `ALTER TABLE ... RENAME`, never DROP + CREATE
  (C-67). `Ticket.requesterId` keeps its column name (C-68). New enum values go in their own
  migration, before the migration that uses them (C-70).
- Prove zero drift after every migration with `npx prisma migrate diff ... --exit-code`.
- Seeds stay idempotent - `upsert`, or the `(Requester email, summary)` key for Tickets
  (C-91). Re-running creates no duplicates and never overwrites a changed password (C-72).
- The dev database is migrated only after the C-83 rehearsal passes.

## Product name

The product is **TokTickIT** everywhere - headings, page titles, component names, test
assertions, documentation. The labsheet illustration renders it "TikTockIT"; that is a typo
in the image and is not followed (L2 C-41).

## Required tests

Eight levels, per labsheet section 10: unit, API/integration, UI component, UI style,
responsive, **security/authorization**, **migration/regression**, and E2E. The level is
carried by the Test ID column, not by the file name (C-89).

| Tool | Covers |
| --- | --- |
| Vitest | Unit, UI components, UI style assertions |
| Supertest | Auth, authorization, queue, staff detail, comments and notes, user admin, migration |
| Playwright | Authentication, the staff flow, user administration, three viewports (C-90) |

A security claim needs a test, not a code reading: the route-inventory test in
`authorization.api.test.ts` walks the Express router and fails if any non-public route
answers without a session. Name tests so the terminal output reads as evidence, for example
`Requester GET /api/tickets/:id/internal-notes -> 403, no note content`.

Every acceptance criterion maps to at least one planned test, and every planned test names
its actual file path. Write the tests first, run them, and capture the failing output before
implementing. Evidence is passing terminal output, recorded in `docs/lab-03/tests.md`.

## Evidence

The PDF (labsheet section 14, Parts 1-9) is built from captured evidence, and most of it can
only be captured while the state exists. These rules are owed on every Issue.

- **`artifacts/lab-03/evidence.md` is the index.** It maps every Part 1-9 requirement to its
  evidence file, the Issue that produces it, and a status: `captured`, `pending` or
  `manual`. Every Issue updates it.
- **A PR is not ready while one of its rows is pending.** Before opening an Issue's PR,
  capture every row that Issue owns.
- **UI states** are written by the Playwright specs in `e2e/lab-03/` under the names
  `ui-spec.md` section 23 fixes, in its four `LS 12` folders. A screenshot section 23 does
  not list follows the same pattern, `<folder>/<screen>-<viewport>-<state>.png`, and is noted
  in `evidence.md`. `evidence.md` maps every file to its Part and row. Wait for transitions
  to settle before capturing (the L2 focus-ring lesson). Desktop for state evidence;
  desktop, tablet and mobile for Part 9.
- **Terminal evidence** - red and green runs - is saved as text under
  `artifacts/lab-03/evidence/issue-<N>/`, ANSI stripped, headed with the command, the date
  and the commit hash.
- **GitHub evidence** - PR conversations, approvals, merged-PR times, the commit graph and
  the project board (public) - is captured with headless Playwright into
  `artifacts/lab-03/screenshots/github/` when it happens, named by date and state. The
  board is captured every time a card moves to PR Review, Fixing or Done.
- **Every image comes from the real running app or the real GitHub page.** Never edit an
  image, and never stage a state that did not happen.
- **The final Part 6 and Part 9 sets are regenerated in Issue #44** on a freshly migrated
  and seeded database.

## Git rules - working agreement

You run git and gh yourself. Two hard limits that never relax:

- Never `git add .` or `git add -A`. Always stage explicit paths, and run `git status` after
  staging to confirm what is actually staged.
- Every `gh pr create` carries `--base lab3-staging`. GitHub defaults to main, and labsheet
  11.1 forbids developing directly on main or lab3-staging. **The one exception is C-110**:
  while review is batched, unapproved PRs may stack through #45, each with `--base` set to the
  feature branch directly below it and its stack stated in its body. PAKATO reviews all nine
  feature PRs at the end of the batch, not one partway through. Nothing merges into
  `lab3-staging` until the reviewer has reviewed. A change asked for in a lower PR is made on
  that branch, then merged upward into each stacked branch in order with `git merge` (never a
  rebase), with all three suites run at each level. A stacked PR is retargeted to
  `lab3-staging` once the PRs below it merge. **The release PR, `lab3-staging` into `main`, is
  never stacked** - it opens only after every feature PR has merged into `lab3-staging`.

Never force-push, never rebase a pushed branch, never merge into main except through the
single release PR. Commit messages carry no Co-Authored-By or Claude-Session trailer.

### Pre-commit inspection - owed before every commit

Inspecting the working tree before a commit is a duty, not an option. Before every commit:

1. Run `git status` and `git diff --stat`.
2. Report **exactly which files are staged** - name them, do not summarise as "the usual
   files".
3. Flag anything unexpected: build output, uploaded attachments, `node_modules`, secrets or
   `.env` files, Playwright storage state, screenshots that do not belong to this task, and
   any file unrelated to the work in hand. Leave such files unstaged and say so.
4. Only then commit.

Branch model (C-88): `main` is the stable release and `lab3-staging` the integration
branch; neither is ever committed to directly. Feature branches are
`feature/lab3-N-slug`, N = 1..9: `1-contract`, `2-data-migration`, `3-authentication`,
`4-authz-regression`, `5-staff-queue`, `6-staff-ticket-ops`, `7-user-admin`,
`8-e2e-visual`, `9-release-docs`.

Every feature branch opens a PR into `lab3-staging` (not `main` - GitHub defaults to `main`,
so the base must be changed). After all nine merge, one release PR goes
`lab3-staging -> main`. Peer review is mandatory on every PR.

Commit message style: short, imperative, prefixed - `feat:` `fix:` `test:` `docs:` `chore:`.

## Secrets

`.env` is never committed; `.env.example` is. Database credentials must not appear in any
tracked file. `node_modules/`, `dist/`, `build/` stay ignored.

New Lab 3 variables go into `server/.env.example` with placeholder values only, alongside
the Lab 2 `UPLOAD_DIR` and `MAX_UPLOAD_BYTES`. No password hash, session token, or signing
secret of any kind enters a tracked file.

## Working style

Small tasks with clear constraints. The user is responsible for every file, command,
dependency, and test - so explain what changed and why, and never generate code they would
not be able to explain.

Verify by reading the file or running the command. Do not infer from what looks plausible,
and do not report work as done without evidence.

## Token budget

- Read only the sections a task cites - grep by ID, never whole documents.
- Run only the test files touched during development; run all three suites once before
  the PR, and show summaries only.
- One subagent audit per Issue, at the end.
- Check screenshots by size; open one sample per folder.
- Final reports: at most 15 lines.
