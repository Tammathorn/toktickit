# TokTickIT

An IT service desk application. Lab 1 builds a vertical slice proving every layer of the
stack works together: **React UI → Express REST API → Prisma ORM → PostgreSQL**.

Opening the frontend shows the app name and a `[Check System]` button. Clicking it reports
the backend status and lists the four supported request categories loaded from the
database.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 6 + Bootstrap 5 |
| Backend | Node.js + Express 4 + TypeScript |
| Database | PostgreSQL + Prisma 5 |
| Testing | Vitest (UI/unit) + Supertest (API) |

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **npm** (ships with Node)
- **PostgreSQL 14+** reachable on port 5432 — either [via Docker](#3-start-postgresql)
  (recommended, no system install) or a native PostgreSQL installation

## Repository layout

```
toktickit/
 ├── client/            React + Vite frontend
 │    ├── src/
 │    └── tests/lab-01/ Vitest UI tests
 ├── server/            Express + Prisma backend
 │    ├── prisma/       schema.prisma, seed.ts
 │    ├── src/          app.ts (exports app), index.ts (listen)
 │    └── tests/lab-01/ Supertest API tests
 ├── docs/lab-01/       ai_use.md, reviewer.md, tests.md
 ├── .gitignore
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
```

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

### 4. Run the migration

Creates the `Category` table from `server/prisma/schema.prisma`:

```bash
cd server
npx prisma migrate dev --name init
```

> The schema has no models until Issue 3 defines the `Category` model. Until then,
> `prisma migrate` and `prisma generate` have nothing to generate — this is expected.

### 5. Seed the database

Inserts the four request categories — Account and Access, Hardware, Software, Network.
The seed uses `upsert`, so it is safe to run more than once without creating duplicates:

```bash
cd server
npm run prisma:seed
```

## Running in development

Two terminals, one per service:

```bash
# terminal 1 — API on http://localhost:3000
cd server && npm run dev

# terminal 2 — UI on http://localhost:5173
cd client && npm run dev
```

Then open <http://localhost:5173> and click **Check System**.

## Running the tests

```bash
npm test --prefix server   # Supertest — API endpoints
npm test --prefix client   # Vitest — UI rendering and states
```

The API tests import the Express app directly, so no server needs to be running. The
category tests do require the database to be migrated and seeded.

Test inventory and results are recorded in [`docs/lab-01/tests.md`](docs/lab-01/tests.md).

## API endpoints

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
| `npm run prisma:migrate` | server | Run `prisma migrate dev` |
| `npm run prisma:seed` | server | Seed the request categories |

## Documentation

- [`docs/lab-01/tests.md`](docs/lab-01/tests.md) — test inventory and evidence
- [`docs/lab-01/reviewer.md`](docs/lab-01/reviewer.md) — peer reviewer details and PR links
- [`docs/lab-01/ai_use.md`](docs/lab-01/ai_use.md) — AI agent usage and reflection
- [`CLAUDE.md`](CLAUDE.md) — project constraints for AI coding agents
