# TokTickIT — Project Constraints

CPE 334 Lab 1 (Individual Sprint 1). A vertical slice proving the stack works end to end:
React UI → Express REST API → Prisma ORM → PostgreSQL.

These constraints come from `docs/lab-01/spec/`. They override default preferences and
"better" alternatives. When a rule here conflicts with what seems technically nicer, the
rule wins — this is graded coursework against a fixed contract.

## Mandatory stack — no substitutions

| Area | Required |
| --- | --- |
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Architecture | REST-style APIs |
| Testing | Vitest (frontend/unit) + Supertest (API) |

**Never install, scaffold, import, or suggest:** Next.js, Tailwind, Drizzle, Jest,
Playwright, or any authentication library. Also out of scope for Lab 1: any other
framework, database, ORM, or UI library.

If a task seems to need one of these, stop and say so rather than substituting.

## Scope — Lab 1 is only two features

The entire deliverable is a page showing the app name and a `[Check System]` button.
Clicking it shows system status plus the four request categories loaded from PostgreSQL.

In scope:
1. Health check — `GET /api/health`
2. Category list — `GET /api/categories`
3. Loading state while requests are in flight
4. A useful error message when backend or DB is unavailable

**Do not add:** tickets, ticket creation, login/auth, roles, uploads/attachments,
comments, notes, dashboards, or any other screen. Those arrive in Labs 2–4. Do not
"prepare" for them with extra models, routes, or components.

## Required repository structure

Must match exactly:

```
toktickit/
 ├── client/
 ├── server/
 │   ├── prisma/
 │   ├── src/
 │   └── tests/
 │         └── lab-01/
 ├── docs/
 │   └── lab-01/
 │         ├── ai_use.md
 │         └── reviewer.md
 ├── .gitignore
 └── README.md
```

`docs/lab-01/tests.md` is also required (submission Part 2). All test files live under
`tests/lab-01/`. Do not relocate, rename, or add top-level directories.

## Git rules — I do not run git

**Never run:** `git commit`, `git push`, `git merge`, `gh pr` (any subcommand), or any
branch operation (`git branch`, `git checkout -b`, `git switch`, `git rebase`).

When work reaches a commit point, **print the suggested commands** in a code block and
let the user run them. Read-only inspection (`git status`, `git log`, `git diff`) is fine.

Branch model for reference when suggesting commands:

```
main                       ← stable release, never commit directly
 └─ lab1-staging           ← integration branch, never commit directly
      ├─ feature/1-project-foundation
      ├─ feature/2-health-check
      ├─ feature/3-category-seed
      └─ feature/4-category-list
```

Every feature branch opens a PR into `lab1-staging` (not `main` — GitHub defaults to
`main`, so the base must be changed). After all four merge, one release PR goes
`lab1-staging → main`. Peer review is mandatory on every PR.

Commit message style: short, imperative, prefixed — `feat:` `fix:` `test:` `docs:` `chore:`.

## Data model

The only model in Lab 1:

```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
}
```

The seed inserts exactly: Account and Access, Hardware, Software, Network. It must be
idempotent — use `upsert` so re-running creates no duplicates.

## API contract

```
GET /api/health   → 200
{ "status": "ok", "service": "TokTickIT API" }

GET /api/categories → 200
[ { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" } ]
```

Category order must be predictable. The React UI must render categories from the API
response — never hard-coded values.

## Required tests

| Tool | Minimum test |
| --- | --- |
| Supertest | `GET /api/health` returns 200 and `status = ok` |
| Supertest | `GET /api/categories` returns the four seeded categories |
| Vitest | TokTickIT heading renders |
| Vitest | At least one loading / success / error state behaves correctly |

Evidence is passing terminal output, recorded in `docs/lab-01/tests.md`.

## Secrets

`.env` is never committed; `.env.example` is. Database credentials must not appear in any
tracked file. `node_modules/`, `dist/`, `build/` stay ignored.

## Working style

Small tasks with clear constraints. The user is responsible for every file, command,
dependency, and test — so explain what changed and why, and never generate code they
would not be able to explain.
