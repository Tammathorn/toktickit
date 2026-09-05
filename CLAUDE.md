# TokTickIT - Project Constraints

CPE 334 Lab 2 (Individual Sprint 2). The Requester-facing ticketing MVP, built on the
Lab 1 vertical slice: React UI -> Express REST API -> Prisma ORM -> PostgreSQL.

These constraints come from `docs/lab-02/spec/` and from the approved decisions in
`docs/lab-02/decisions.md`. They override default preferences and "better"
alternatives. When a rule here conflicts with what seems technically nicer, the rule
wins - this is graded coursework against a fixed contract.

## Repository path

```
C:\Downloads\Lab1_Starter_Scaffold\toktickit
```

That is the only path. There is no `C:\dev\toktickit`; any command in an older document
that says otherwise is wrong. Always work from inside this directory so relative paths
resolve.

## Mandatory stack - no substitutions

| Area | Required |
| --- | --- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Architecture | REST-style APIs |
| Testing | Vitest (frontend/unit) + Supertest (API) |

**Never install, scaffold, import, or suggest:** Next.js, Tailwind, Drizzle, Jest, or any
authentication library. Also out of scope: any other framework, database, ORM, or UI
library.

If a task seems to need one of these, stop and say so rather than substituting.

### Dependencies added for Lab 2

- **Playwright** is in scope, for the root-level `e2e/` folder only. It is installed at
  the repository root, not inside `client/`. Do not add Playwright tests anywhere else.
- **multer** is approved for attachment upload (multipart parsing).

No other new dependency is added without asking first.

## Scope - Lab 2 is Requester-facing only

Four screens: Development Requester Selection, Create Ticket, My Tickets, Requester
Ticket Detail. Five entities: RequesterUser, Ticket, Attachment, Category,
RelatedSystem.

In scope:

1. Development Requester selection and switching
2. Create Ticket, with validation and a backend-generated Ticket Number
3. My Tickets - search, filtering, sorting, pagination, ownership
4. Requester Ticket Detail, read-only, with the attachment lifecycle
5. Attachment upload, download, and soft removal
6. Loading, empty, no-results, and safe failure states throughout
7. Responsive behavior at desktop, tablet, and mobile

**Never add:** authentication, login, logout, passwords, password hashing, sessions,
tokens, authenticated identities, real role-based authorization, IT Staff dashboard or
queue, claiming or reassigning tickets, changing IT Priority, public comments, internal
notes, actions taken, any status change beyond the initial `New`, or administrator
management of users, roles, or reference data.

Those arrive in Labs 3-4. Do not "prepare" for them with extra routes, screens, or
controls.

## The Development Requester selector is not authentication

It is a temporary testing mechanism that stands in for login until Lab 3. The UI must
say so on the selection screen, in plain words. Never describe it as a login, never
treat the selected identity as a secure claim, and never build authorization on top of
it. Ownership checks still run in the backend on every request.

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
message directly below the field. Success must not rely on color alone.

## Required repository structure

Labsheet section 12. `e2e/` and `artifacts/` are legitimate top-level directories,
alongside `client/` and `server/`.

```
toktickit/
 |- client/
 |    |- src/
 |    \- tests/
 |          |- lab-01/
 |          \- lab-02/
 |                |- CreateTicket.test.tsx
 |                |- MyTickets.test.tsx
 |                |- RequesterTicketDetail.test.tsx
 |                \- AttachmentSection.test.tsx
 |- server/
 |    |- prisma/
 |    |- src/
 |    \- tests/
 |          |- lab-01/
 |          \- lab-02/
 |                |- create-ticket.api.test.ts
 |                |- my-tickets.api.test.ts
 |                |- ticket-detail.api.test.ts
 |                |- attachments.api.test.ts
 |                \- ticket-number.unit.test.ts
 |- e2e/
 |    \- lab-02/
 |          \- requester-ticket-flow.spec.ts
 |- artifacts/
 |    \- lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/
 |- docs/
 |    |- lab-01/
 |    \- lab-02/
 |          |- specification.md
 |          |- api-spec.md
 |          |- ui-spec.md
 |          |- tests.md
 |          |- decisions.md
 |          |- reviewer.md
 |          \- ai-use.md
 |- playwright.config.ts
 |- package.json
 |- .gitignore
 \- README.md
```

Section 12 is a **minimum**. Files may be added; the named files must not be renamed,
relocated, or removed. Client tests go in `client/tests/lab-02/` because
`client/vite.config.ts` includes only `tests/**/*.test.tsx` - any other location
collects zero tests and still reports success.

`artifacts/` is tracked; it is screenshot evidence. `test-results/`,
`playwright-report/`, `blob-report/` and `server/uploads/` stay ignored.

## The contract

Once written, these four documents are the contract:

```
docs/lab-02/specification.md
docs/lab-02/api-spec.md
docs/lab-02/ui-spec.md
docs/lab-02/tests.md
```

`docs/lab-02/decisions.md` records the approved decisions behind them, C-01 through
C-41.

If a task appears to need behavior that none of these cover, **stop and ask** rather
than inventing a rule. Do not silently resolve a conflict between two of them - report
it.

## Lab 1 must keep working

Lab 1 behavior and its tests keep passing on the final `main`. Per decision C-04, the
Check System page becomes a component reachable at a route, and the Lab 1 test is
repointed at that component rather than at the app root.

**Never delete or skip a test to make a suite green.** If a test fails, fix the cause or
report it.

The Lab 1 API contract is unchanged:

```
GET /api/health     -> 200 { "status": "ok", "service": "TokTickIT API" }
GET /api/categories -> 200 [ { "id": 1, "name": "Account and Access" }, ... ]
```

`GET /api/categories` keeps returning the four seeded categories in id order with the
same `{id, name}` shape, even though `Category` gains an `isActive` column (C-05).

Seeds stay idempotent - use `upsert`, so re-running creates no duplicates. Never run
`prisma migrate reset`; it destroys the Lab 1 seed data (C-37).

## Product name

The product is **TokTickIT** everywhere - headings, page titles, component names, test
assertions, documentation. The labsheet illustration on page 9 renders it "TikTockIT";
that is a typo in the image and is not followed (C-41).

## Required tests

Six levels, per labsheet section 9.2: unit, API/integration, UI component, UI style,
responsive, and E2E.

| Tool | Covers |
| --- | --- |
| Vitest | Ticket Number format (unit), UI components, UI style assertions |
| Supertest | Create Ticket, My Tickets, Ticket Detail, Attachments |
| Playwright | The end-to-end Requester flow and three-viewport screenshots |

Every acceptance criterion maps to at least one planned test, and every planned test
names its actual file path. Evidence is passing terminal output, recorded in
`docs/lab-02/tests.md`.

## Git rules - I do not run git

**Never run:** `git commit`, `git push`, `git merge`, `gh pr` (any subcommand), or any
branch operation (`git branch`, `git checkout -b`, `git switch`, `git rebase`).

When work reaches a commit point, **print the suggested commands** in a code block and
let the user run them. Read-only inspection (`git status`, `git log`, `git diff`) is fine.

Branch model for reference when suggesting commands:

```
main                          <- stable release, never commit directly
 \- lab2-staging              <- integration branch, never commit directly
      |- feature/1-sprint-spec
      |- feature/2-data-model
      |- feature/3-requester-context
      |- feature/4-create-ticket
      |- feature/5-my-tickets
      |- feature/6-ticket-detail
      |- feature/7-e2e-visual
      \- feature/8-release-docs
```

Every feature branch opens a PR into `lab2-staging` (not `main` - GitHub defaults to
`main`, so the base must be changed). After all eight merge, one release PR goes
`lab2-staging -> main`. Peer review is mandatory on every PR.

Commit message style: short, imperative, prefixed - `feat:` `fix:` `test:` `docs:`
`chore:`.

## Secrets

`.env` is never committed; `.env.example` is. Database credentials must not appear in any
tracked file. `node_modules/`, `dist/`, `build/` stay ignored.

New Lab 2 variables (`UPLOAD_DIR`, `MAX_UPLOAD_BYTES`) go into `server/.env.example` with
placeholder values only.

## Working style

Small tasks with clear constraints. The user is responsible for every file, command,
dependency, and test - so explain what changed and why, and never generate code they
would not be able to explain.

Verify by reading the file or running the command. Do not infer from what looks
plausible, and do not report work as done without evidence.
