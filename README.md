# TokTickIT

An IT service desk application. Lab 1 built a vertical slice proving every layer of the
stack works together: **React UI → Express REST API → Prisma ORM → PostgreSQL**. Lab 2
builds the Requester-facing ticketing MVP on it: Create Ticket with a backend-generated
Ticket Number and attachment upload, My Tickets with search, filters, sorting and
pagination, and a read-only Ticket Detail with the attachment lifecycle (download,
preview, soft removal with a reason). Lab 3 replaces Lab 2's Development Requester
selector with real authentication - Login, a mandatory first-login password change,
three roles (Requester, IT Staff, Administrator) with server-enforced authorization on
every protected route, an IT Staff Ticket Queue and Ticket Detail (claim, assign, IT
Priority, status, Public Comments, Internal Notes), and minimalist Administrator user
management. Ownership and role are enforced by the backend on every request, never by the
client alone.

The Lab 1 Check System screen is kept at `/system-check`.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 6 + Bootstrap 5 |
| Backend | Node.js + Express 4 + TypeScript |
| Database | PostgreSQL + Prisma 5 |
| Testing | Vitest (UI/unit) + Supertest (API) + Playwright (E2E, responsive, screenshots) |
| Uploads | multer, files stored under `server/uploads/` (gitignored) |

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **npm** (ships with Node)
- **PostgreSQL 14+** reachable on port 5432 — either [via Docker](#3-start-postgresql)
  (recommended, no system install) or a native PostgreSQL installation
- **Playwright's Chromium**, for the E2E suite only: `npx playwright install chromium` at
  the repository root after `npm install` there

## Repository layout

```
toktickit/
 ├── client/                  React + Vite frontend
 │    ├── src/                pages/, components/, router.tsx, theme.css
 │    └── tests/lab-01/, lab-02/, lab-03/   Vitest UI and UI-style tests
 ├── server/                  Express + Prisma backend
 │    ├── prisma/             schema.prisma, migrations/, seed.ts (graded), seed-demo.ts (demo)
 │    ├── src/                app.ts (exports app), index.ts (listen), routes/, lib/, middleware/, seed/
 │    ├── tests/lab-01/, lab-02/, lab-03/   Supertest API tests, unit tests, data-model tests
 │    └── uploads/            attachment files (gitignored, created on first run)
 ├── e2e/lab-02/              Playwright: the Requester flow and three screenshot specs
 ├── e2e/lab-03/              Playwright: authentication, the staff flow, user administration
 ├── artifacts/lab-02/screenshots/   tracked screenshot evidence (create-ticket, my-tickets, ticket-detail)
 ├── artifacts/lab-03/        evidence.md (the index), screenshots/, evidence/issue-N/ (terminal output),
 │                            report-lab03.md
 ├── docs/lab-01/             Lab 1 records
 ├── docs/lab-02/             specification.md, api-spec.md, ui-spec.md, tests.md, decisions.md,
 │                            reviewer.md, ai-use.md
 ├── docs/lab-03/             the same seven files, plus handoff.md
 ├── playwright.config.ts     Chromium only; desktop 1280, tablet 834, mobile 390
 ├── package.json             root: Playwright only
 ├── CLAUDE.md                project constraints for AI coding agents
 └── README.md
```

`src/app.ts` exports the Express app and `src/index.ts` calls `app.listen()`. They are kept
separate so Supertest can import the app without opening a port. Do not merge them.

## Setup

### 1. Install dependencies

The client and server are independent npm projects — install both:

```bash
npm install --prefix client
npm install --prefix server
npm install                     # repository root: Playwright, for the E2E suite
npx playwright install chromium
```

### 2. Configure environment variables

Copy each `.env.example` to `.env` and fill in your own local values. **Never commit a real
`.env`** — both are gitignored; only the `.env.example` templates are tracked.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
PORT=3000
UPLOAD_DIR=uploads              # where attachment files are stored, relative to server/
MAX_UPLOAD_BYTES=5242880        # 5 MB per file (BR-43)
CLIENT_ORIGIN="http://localhost:5173"   # Lab 3 CSRF cover (C-58): the one Origin a
                                         # state-changing request may carry
```

The two upload variables have working defaults in the code (`uploads`, 5 MB), so the
server runs without them; they are listed so the storage location and limit are visible.

`client/.env`:

```
VITE_API_URL=""
```

Empty, not omitted, and not the API's own origin: the Vite dev server proxies `/api` to
the API (`client/vite.config.ts`), so the client calls same-origin paths and the session
cookie travels with them (decision C-56). An unset variable would fall back to a
cross-origin URL, which would break the cookie-based session entirely.

### 3. Start PostgreSQL

#### Option A — Docker (recommended)

No system-wide install. Requires Docker Desktop to be running.

```bash
docker run --name toktickit-db \
  -e POSTGRES_USER=toktickit \
  -e POSTGRES_PASSWORD=toktickit \
  -e POSTGRES_DB=toktickit \
  -p 5432:5432 \
  -d postgres:16
```

PowerShell uses backticks instead of backslashes for line continuation, so on Windows
either put it on one line or use:

```powershell
docker run --name toktickit-db `
  -e POSTGRES_USER=toktickit `
  -e POSTGRES_PASSWORD=toktickit `
  -e POSTGRES_DB=toktickit `
  -p 5432:5432 `
  -d postgres:16
```

Everyday container control:

```bash
docker start toktickit-db     # after a reboot
docker stop  toktickit-db
docker logs  toktickit-db     # troubleshoot startup
docker rm -f toktickit-db     # delete the container and its data
```

The matching connection string for `server/.env` — these credentials are local
development values only, never production ones:

```
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
```

#### Option B — native PostgreSQL install

Install PostgreSQL (Windows: `winget install PostgreSQL.PostgreSQL.16`), then create the
database and matching role:

```bash
createdb toktickit
```

Set `DATABASE_URL` in `server/.env` to your own username and password:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
```

#### Verify the connection

```bash
cd server
npx prisma validate      # schema parses and DATABASE_URL is loaded
```

### 4. Apply the migrations

Six migrations exist: the Lab 1 `Category` table, the additive Lab 2 data model
(`RequesterUser`, `RelatedSystem`, `Ticket`, `Attachment`, `Category.isActive`), and four
Lab 3 migrations - new `TicketStatus` enum values added ahead of the migration that uses
them (decision C-70), the `RequesterUser` → `User` rename with roles (`ALTER TABLE ...
RENAME`, never drop-and-recreate, decision C-67), the Ticket workflow fields (`ownerId`,
`itPriority` NOT NULL, `requesterResolvedAt`), and the `Session`, `PublicComment` and
`InternalNote` tables. Apply them with **`migrate deploy`**, not `migrate dev`:

```bash
cd server
npx prisma migrate deploy
```

> `prisma migrate dev` can offer to **reset** the database on schema drift, which destroys
> the seeded data. `migrate deploy` only applies pending migrations and can never reset
> (decision C-37). Never run `prisma migrate reset`. The `npm run prisma:migrate` script
> ran `migrate dev` until Lab 3; decision C-86 repointed it at `migrate deploy`, so the
> command that can offer a reset is no longer in `package.json`.

### 5. Seed the database

Two seeds, both safe to re-run.

**Graded seed** (labsheet 5.3, required): four Categories, seven Related Systems, the
eleven user accounts in the table below, and nine Tickets spread across every status and
priority with example Public Comments and Internal Notes. Users and reference data are
`upsert`ed and Tickets are matched on `(Requester email, summary)`, so running it twice
creates nothing new (decision C-91):

```bash
cd server
npm run prisma:seed
```

#### Seeded accounts — local development only

These passwords exist so that each role can be signed into on a local machine. They are
**not** secrets, they are **not** anyone's real password, and nothing outside a local
database ever uses them. A password is written **only where the stored hash is NULL**
(decision C-72), so a password changed through the application is never overwritten by a
re-seed. Hashes are scrypt from `node:crypto`, stored as `scrypt$N$r$p$salt$hash`
(decision C-53); no plaintext password is stored anywhere.

| Role | Accounts | Password |
|---|---|---|
| Requester | `anucha.p@`, `kanya.s@`, `nattapong.w@`, `siriporn.c@` (active), `prasit.b@` (inactive) | `Requester#2026` |
| IT Staff | `araya.m@`, `decha.i@`, `fonthip.c@` (active), `somkid.r@` (inactive) | `ItStaff#2026` |
| Administrator | `panida.s@` | `Admin#2026` |
| First login | `first.login@` | `FirstLogin#2026` |

All addresses are at `example.ac.th`. The inactive accounts cannot sign in, which is what
makes that refusal demonstrable. The first-login account keeps `mustChangePassword` set and
is never updated by the seed, so the mandatory first-login password change can be shown
again on every run.

Any user who came through the Lab 3 migration and is not named above has no password at
all: a NULL hash can never authenticate, and an Administrator sets an initial password for
that account. That is the only account-recovery path this application has - there is no
password-reset email anywhere in it.

**Demo seed** (optional, decision C-91): extra volume only - fourteen Tickets for the first
active Requester, three for the second, none for the third - so My Tickets and the Ticket
Queue can show pagination, the empty state and the no-results state. Idempotent on
`(requester, summary)`:

```bash
cd server
npx tsx prisma/seed-demo.ts
```

The Playwright specs create their own Tickets as the *last* active Requester and never
touch the demo Requesters, so the demo counts stay 14 / 3 / 0 across test runs.

### Three databases

| Database | Purpose | Created by |
|---|---|---|
| `toktickit` | The development database - this is what the two `npm run dev` servers below use | Step 3 above, once |
| `toktickit_test` | The server test suite's own database, so Supertest never touches dev data (decision C-83) | Automatically, by `tests/global-setup.ts`, the first time `npm test --prefix server` runs - `migrate deploy` plus the graded seed, every run |
| `toktickit_evidence` | A freshly migrated and seeded database used once per Lab 3 Issue (#44) to regenerate the final, authoritative Part 6 and Part 9 screenshot sets, so those captures do not depend on whatever state the dev database has accumulated from everyday use | Manually, as below - not created automatically, and not created by any test run |

`toktickit_evidence` is local evidence infrastructure, not part of normal development - most
contributors never need it. If it is ever dropped and needs recreating:

```bash
# from the postgres maintenance database, create it
psql -h localhost -U toktickit -d postgres -c 'CREATE DATABASE "toktickit_evidence";'

# migrate and seed it (never migrate dev, never migrate reset)
cd server
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit_evidence?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit_evidence?schema=public" npm run prisma:seed
```

Then start the API with `DATABASE_URL` overridden to point at it for that one process only
(never edit the committed `server/.env`), run the Playwright suite against it to capture
screenshots, and restart the API pointed back at `toktickit` afterward. The connection
string for `toktickit_evidence` never appears in any tracked file.

## Running in development

Two terminals, one per service:

```bash
# terminal 1 — API on http://localhost:3000
cd server && npm run dev

# terminal 2 — UI on http://localhost:5173
cd client && npm run dev
```

Then open <http://localhost:5173> and sign in with one of the seeded accounts above. A
fresh sign-in with `mustChangePassword` true (the `first.login@` account) reaches only
Change Password until it succeeds; every other account lands on its role's screen - My
Tickets for a Requester, the Ticket Queue for IT Staff, User Management is reachable for
an Administrator. The Lab 1 screen is at <http://localhost:5173/system-check>, public like
`/api/health` and `/api/categories` (decision C-62).

## Running the tests

Three suites. The first two need only the database; the third needs both dev servers.

```bash
# 1. Unit, data-model and API tests (Vitest + Supertest) — needs the database container
npm test --prefix server

# 2. UI component and UI-style tests (Vitest + Testing Library) — no database needed
npm test --prefix client

# 3. E2E, responsive checks and screenshots (Playwright) — needs the API on :3000
#    and the client on :5173 running, in two other terminals
npm run test:e2e
```

The server tests import the Express app directly (no server process) but run against a
real PostgreSQL database - **`toktickit_test`, never the development database**. A Vitest
global setup creates that database if it is missing, applies the migrations with
`migrate deploy` and seeds it, then points `DATABASE_URL` at it before any test runs, so
nothing a test does can reach the data used for screenshots (decision C-83). It needs no
setup of its own beyond the running container. The files still run one at a time, because
they share that database and `server/uploads/`.

The Playwright configuration deliberately has no `webServer`: start the two dev servers
yourself so a missing database fails visibly rather than looking like a test failure.
Playwright runs against the development database and signs in as the fixed seeded
accounts.

Useful variants:

```bash
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts       # the E2E flow only
npx playwright test e2e/lab-03/authentication.spec.ts              # Lab 3: login, the shell, logout
npx playwright test e2e/lab-03 --project=mobile                     # one viewport, all Lab 3 specs
npx playwright show-report                                          # after a run
```

`e2e/lab-03/` holds three specs - `authentication.spec.ts`, `staff-ticket-flow.spec.ts`
(the IT Staff queue and Ticket Detail) and `user-administration.spec.ts` - signed in
through a Playwright setup project that captures one storage state per role once per run
(`e2e/.auth/`, gitignored). Running a Lab 3 spec by itself still needs that setup project;
`npx playwright test e2e/lab-03` picks it up automatically from `playwright.config.ts`'s
project dependencies.

The screenshot specs write into `artifacts/lab-02/screenshots/` and
`artifacts/lab-03/screenshots/`, both tracked as evidence. Planned tests, the
acceptance-criterion matrix, the visual checklist and the final results are in
[`docs/lab-02/tests.md`](docs/lab-02/tests.md) and
[`docs/lab-03/tests.md`](docs/lab-03/tests.md).

## API endpoints

The full Lab 3 contract - every endpoint, the authentication and session model, the fixed
check order, the error code catalogue and the role rules - is
[`docs/lab-03/api-spec.md`](docs/lab-03/api-spec.md); that document supersedes the Lab 2
contract below wherever the two disagree (`requesterId` as a client-supplied identity, in
particular, no longer exists anywhere - decision C-64). The Lab 2 contract stays below as a
historical record of what Lab 2 shipped, since Lab 2's own behavior and tests keep passing
on `main`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Lab 1 health check |
| `GET /api/categories`, `GET /api/related-systems`, `GET /api/requesters` | Active reference data |
| `POST /api/tickets` | Create a Ticket; the Ticket Number is assigned inside the creation transaction |
| `GET /api/tickets?requesterId=…` | The selected Requester's Tickets: search, filters, sort, pagination |
| `GET /api/tickets/:id?requesterId=…` | One owned Ticket with its attachments |
| `POST /api/tickets/:id/attachments?requesterId=…` | Upload one file (JPG, PNG, WEBP, PDF, 5 MB, five active per Ticket) |
| `GET /api/tickets/:id/attachments?requesterId=…` | Attachment metadata, active and removed |
| `GET /api/attachments/:id/download?requesterId=…&disposition=attachment` or `inline` | Download or preview, ownership-checked |
| `DELETE /api/attachments/:id?requesterId=…` | Soft removal with a required reason |

`requesterId` is a client-supplied testing value, not an authenticated identity; the
server re-checks ownership on every request (403 for another Requester's data, 404 for
nothing at all, 410 for a removed file to its owner).

### `GET /api/health`

```json
200 OK
{ "status": "ok", "service": "TokTickIT API" }
```

### `GET /api/categories`

```json
200 OK
[ { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" } ]
```

## Other scripts

| Command | Location | What it does |
| --- | --- | --- |
| `npm run build` | client / server | Type-check and build for production |
| `npm run preview` | client | Serve the production build locally |
| `npm start` | server | Run the compiled server from `dist/` |
| `npm run prisma:migrate` | server | Runs `prisma migrate dev` - kept from Lab 1; prefer `npx prisma migrate deploy` (see step 4) |
| `npm run prisma:seed` | server | The graded seed (Categories, Related Systems, Development Requesters) |
| `npx tsx prisma/seed-demo.ts` | server | The demo Tickets for Part 7 |
| `npm run test:e2e` | root | Playwright, all of `e2e/` at three viewports |

## Documentation

Lab 3:

- [`docs/lab-03/specification.md`](docs/lab-03/specification.md) — requirements, business rules, acceptance criteria
- [`docs/lab-03/api-spec.md`](docs/lab-03/api-spec.md) — the REST contract: every endpoint, auth, sessions, the check order, error codes
- [`docs/lab-03/ui-spec.md`](docs/lab-03/ui-spec.md) — the Zen Green visual contract, the nine screens, and screenshot paths
- [`docs/lab-03/tests.md`](docs/lab-03/tests.md) — planned tests, AC matrix, visual checklist, final results
- [`docs/lab-03/decisions.md`](docs/lab-03/decisions.md) — approved decisions C-53 onward, and which Lab 2 decisions they supersede
- [`docs/lab-03/reviewer.md`](docs/lab-03/reviewer.md) — peer review record
- [`docs/lab-03/ai-use.md`](docs/lab-03/ai-use.md) — AI use and prompt log
- [`docs/lab-03/handoff.md`](docs/lab-03/handoff.md) — the per-Issue handoff brief
- [`artifacts/lab-03/evidence.md`](artifacts/lab-03/evidence.md) — the evidence index: every Part 1-9 requirement mapped to its file
- [`artifacts/lab-03/report-lab03.md`](artifacts/lab-03/report-lab03.md) — the labsheet report, Part 1 through Part 9

Lab 2:

- [`docs/lab-02/specification.md`](docs/lab-02/specification.md) — requirements, business rules, acceptance criteria, data changes
- [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md) — the REST contract
- [`docs/lab-02/ui-spec.md`](docs/lab-02/ui-spec.md) — the Zen Green visual contract and screenshot paths
- [`docs/lab-02/tests.md`](docs/lab-02/tests.md) — planned tests, AC matrix, visual checklist, final results
- [`docs/lab-02/decisions.md`](docs/lab-02/decisions.md) — approved decisions C-01..C-52
- [`docs/lab-02/reviewer.md`](docs/lab-02/reviewer.md) — peer review record
- [`docs/lab-02/ai-use.md`](docs/lab-02/ai-use.md) — AI use and reflection

Lab 1:

- [`docs/lab-01/tests.md`](docs/lab-01/tests.md), [`docs/lab-01/reviewer.md`](docs/lab-01/reviewer.md), [`docs/lab-01/ai_use.md`](docs/lab-01/ai_use.md)

[`CLAUDE.md`](CLAUDE.md) holds the project constraints for AI coding agents.
