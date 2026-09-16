# TokTickIT

An IT service desk application. Lab 1 built a vertical slice proving every layer of the
stack works together: **React UI → Express REST API → Prisma ORM → PostgreSQL**. Lab 2
builds the Requester-facing ticketing MVP on it: a Development Requester selector (a
testing mechanism, not a login), Create Ticket with a backend-generated Ticket Number and
attachment upload, My Tickets with search, filters, sorting and pagination, and a
read-only Ticket Detail with the attachment lifecycle (download, preview, soft removal
with a reason). Ownership is enforced by the backend on every request.

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
 │    ├── src/                pages/, components/, requester/ (context), router.tsx, theme.css
 │    └── tests/lab-01/, lab-02/   Vitest UI and UI-style tests
 ├── server/                  Express + Prisma backend
 │    ├── prisma/             schema.prisma, migrations/, seed.ts (graded), seed-demo.ts (demo)
 │    ├── src/                app.ts (exports app), index.ts (listen), routes/, lib/, seed/
 │    ├── tests/lab-01/, lab-02/   Supertest API tests, unit tests, data-model tests
 │    └── uploads/            attachment files (gitignored, created on first run)
 ├── e2e/lab-02/              Playwright: the Requester flow and three screenshot specs
 ├── artifacts/lab-02/screenshots/   tracked screenshot evidence (create-ticket, my-tickets, ticket-detail)
 ├── docs/lab-01/             Lab 1 records
 ├── docs/lab-02/             specification.md, api-spec.md, ui-spec.md, tests.md, decisions.md,
 │                            reviewer.md, ai-use.md
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
```

The two upload variables have working defaults in the code (`uploads`, 5 MB), so the
server runs without them; they are listed so the storage location and limit are visible.

`client/.env`:

```
VITE_API_URL="http://localhost:3000"
```

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

Two migrations exist: the Lab 1 `Category` table and the additive Lab 2 data model
(`RequesterUser`, `RelatedSystem`, `Ticket`, `Attachment`, `Category.isActive`). Apply
them with **`migrate deploy`**, not `migrate dev`:

```bash
cd server
npx prisma migrate deploy
```

> `prisma migrate dev` (and the repository's `npm run prisma:migrate` script, kept from
> Lab 1) can offer to **reset** the database on schema drift, which destroys the seeded
> data. `migrate deploy` only applies pending migrations and can never reset
> (decision C-37). Never run `prisma migrate reset`.

### 5. Seed the database

Two seeds, both safe to re-run.

**Graded seed** (labsheet 5.3, required): four Categories, seven Related Systems, four
active and one inactive Development Requester. Every row is an `upsert`, so running it
twice creates nothing new:

```bash
cd server
npm run prisma:seed
```

**Demo seed** (optional, decision C-22): fourteen Tickets for the first active Requester,
three for the second, none for the third, so My Tickets can show pagination, a switch
between Requesters, the empty state and the no-results state. Idempotent on
`(requester, summary)`:

```bash
cd server
npx tsx prisma/seed-demo.ts
```

The Playwright specs create their own Tickets as the *last* active Requester and never
touch the demo Requesters, so the demo counts stay 14 / 3 / 0 across test runs.

## Running in development

Two terminals, one per service:

```bash
# terminal 1 — API on http://localhost:3000
cd server && npm run dev

# terminal 2 — UI on http://localhost:5173
cd client && npm run dev
```

Then open <http://localhost:5173>, choose a Development Requester and press **Continue**.
The Lab 1 screen is at <http://localhost:5173/system-check>.

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

The server tests import the Express app directly (no server process) but run against
the real PostgreSQL database, seeding what they need and removing it afterwards; the
files run one at a time because they share the database and `server/uploads/`. The
Playwright configuration deliberately has no `webServer`: start the two dev servers
yourself so a missing database fails visibly rather than looking like a test failure.

Useful variants:

```bash
npx playwright test e2e/lab-02/requester-ticket-flow.spec.ts       # the E2E flow only
npx playwright test e2e/lab-02 --project=mobile                     # one viewport
npx playwright show-report                                          # after a run
```

The screenshot specs write into `artifacts/lab-02/screenshots/`, which is tracked as
evidence. Planned tests, the acceptance-criterion matrix, the visual checklist and the
final results are in [`docs/lab-02/tests.md`](docs/lab-02/tests.md).

## API endpoints

The full Lab 2 contract - request and response shapes, validation, the error envelope and
the check order - is [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md). In brief:

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
