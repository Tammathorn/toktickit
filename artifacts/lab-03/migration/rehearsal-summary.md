# Lab 3 migration rehearsal — MIG-21 and MIG-22

C-83 splits migration evidence in two. `server/tests/lab-03/migration.db.test.ts` runs
against a freshly created `toktickit_test` with no Lab 2 history, so it can prove the
**shape** of the migration and nothing about **preservation**. This rehearsal is the other
half: the final Lab 2 database restored into a throwaway `toktickit_rehearsal`, migrated,
and measured before and after. It is the only evidence that the C-67 rename preserved
ticket ownership, and it was run **before** the dev database was migrated.

Run on 2026-10-01 against `toktickit-db` (PostgreSQL 16), from
`C:\Downloads\Lab1_Starter_Scaffold\toktickit`.

## Files, in reading order

| File | What it holds |
|---|---|
| `rehearsal-before.txt` | `toktickit_rehearsal` restored from `lab2-final.dump`: migration history, row counts, tickets per Requester, `itPriority` nulls, three sample Tickets |
| `rehearsal-deploy.txt` | `npx prisma migrate deploy` applying the four Lab 3 migrations |
| `rehearsal-after.txt` | The same measurements after the migration, plus the enum order and the absence of `RequesterUser` |
| `rehearsal-drift.txt` | `npx prisma migrate diff ... --exit-code`, exit code recorded |
| `rehearsal-seed.txt` | The graded seed run **twice** on the migrated data, and the state it leaves |
| `red-run-migration-tests.txt` | The TDD red run: MIG-01..MIG-20 failing before any schema change (32 of 36 assertions failing) |
| `dev-before-counts.txt` | The dev database's counts, captured before any work started |

## MIG-21 — the rehearsal

Pass condition from `tests.md`: every table's row count unchanged, every Requester's ticket
count unchanged, `itPriority` non-null and equal to `requestedPriority` on every row, and
the drift check clean.

| Measure | Before | After | Verdict |
|---|---|---|---|
| `Category` | 4 | 4 | unchanged |
| `RelatedSystem` | 7 | 7 | unchanged |
| `RequesterUser` → `User` | 5 | 5 | unchanged, and renamed rather than recreated |
| `Ticket` | 286 | 286 | unchanged |
| `Attachment` | 368 | 368 | unchanged |
| `Session`, `PublicComment`, `InternalNote` | — | 0, 0, 0 | new, empty |
| Tickets per Requester (ids 1–5) | 14, 3, 0, 269, 0 | 14, 3, 0, 269, 0 | unchanged, same ids and emails |
| `itPriority` null | 286 of 286 | **0 of 286** | backfilled |
| `itPriority` = `requestedPriority` | 0 | **286 of 286** | C-71 holds for every migrated row |
| `migrate diff --exit-code` | — | `No difference detected.`, exit 0 | zero drift |
| `RequesterUser` table | present | **absent** | renamed, and no `DROP TABLE` ran |

Every migrated row arrived as C-72 requires: `role` REQUESTER, `passwordHash` NULL,
`mustChangePassword` true. A NULL hash cannot authenticate, so the window between migrating
and seeding is closed rather than open.

## MIG-22 — a Ticket that existed before the migration

Tickets 1, 2 and 3 (`TKT-2026-000001..3`), all `requestedPriority` HIGH and `requesterId` 1:

- before: `itPriority` NULL
- after: `itPriority` HIGH, `requesterId` still 1, `ticketNumber` unchanged, `ownerId` NULL,
  `requesterResolvedAt` NULL

## The seed, rehearsed on migrated data

`rehearsal-seed.txt` runs the graded seed twice on the migrated database. This is the part
that will touch real data on the dev database, so it was rehearsed first: C-72's guarded
write — a password only where `passwordHash IS NULL` — can only be exercised against rows
that actually came through the migration.

- The five migrated Requesters keep ids 1–5 and every Ticket they owned. They receive the
  documented local-development password and `mustChangePassword` is cleared.
- The new accounts take ids 48–53, continuing the renamed sequence: three active and one
  inactive IT Staff, one active Administrator, and the dedicated first-login account, which
  keeps `mustChangePassword` **true**.
- `Ticket` 286 → 295: the nine seeded Tickets. The before/after table above is what proves
  preservation; the seed's additions come afterwards and are deliberate.
- Two runs leave identical counts — 11 users, 295 tickets, 7 Public Comments, 4 Internal
  Notes — so the seed is idempotent.
- All 11 stored hashes match the C-53 format `scrypt$16384$8$1$<salt>$<hash>`. No plaintext
  password is written anywhere.

## Then, and only then

C-83 allows the dev database to be migrated only after this rehearsal passes. It passed on
every condition above, and `dev-after-counts.txt` records the dev database's own before and
after figures. `toktickit_rehearsal`, and the scratch database used to generate the
migrations, are throwaway and are not part of the application.
