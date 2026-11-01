-- Part 5 (C-127, BR-56): one query per IT Staff dashboard card, run on the dev
-- database (toktickit) with psql -f, straight after the API JSON beside it
-- was fetched. The caller is the seeded IT Staff account araya.m@example.ac.th
-- (the "Mine" and "My planned actions" cards are per caller). "Active" is not
-- CLOSED and not CANCELLED (BR-54). Each query is the card's api-spec 4.2
-- "Query, in words", written by hand in SQL, independent of the Prisma code.
\set staff_email 'araya.m@example.ac.th'
\pset footer off

\echo '-- card unassigned: active Tickets with no owner'
SELECT 'unassigned' AS card, count(*) AS count FROM "Ticket"
 WHERE "currentStatus" NOT IN ('CLOSED', 'CANCELLED') AND "ownerId" IS NULL;

\echo '-- card mine: active Tickets owned by the caller'
SELECT 'mine' AS card, count(*) AS count FROM "Ticket"
 WHERE "currentStatus" NOT IN ('CLOSED', 'CANCELLED')
   AND "ownerId" = (SELECT id FROM "User" WHERE email = :'staff_email');

\echo '-- card statusNew: Tickets in New'
SELECT 'statusNew' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'NEW';

\echo '-- card statusOpen: Tickets in Open'
SELECT 'statusOpen' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'OPEN';

\echo '-- card statusInProgress: Tickets in In Progress'
SELECT 'statusInProgress' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'IN_PROGRESS';

\echo '-- card statusWaitingForRequester: Tickets in Waiting for Requester'
SELECT 'statusWaitingForRequester' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'WAITING_FOR_REQUESTER';

\echo '-- card statusReopened: Tickets in Reopened'
SELECT 'statusReopened' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'REOPENED';

\echo '-- card statusResolved: Tickets in Resolved'
SELECT 'statusResolved' AS card, count(*) AS count FROM "Ticket" WHERE "currentStatus" = 'RESOLVED';

\echo '-- card highItPriority: active Tickets with IT Priority High'
SELECT 'highItPriority' AS card, count(*) AS count FROM "Ticket"
 WHERE "currentStatus" NOT IN ('CLOSED', 'CANCELLED') AND "itPriority" = 'HIGH';

\echo '-- card requesterSaysResolved: active Tickets with requesterResolvedAt set'
SELECT 'requesterSaysResolved' AS card, count(*) AS count FROM "Ticket"
 WHERE "currentStatus" NOT IN ('CLOSED', 'CANCELLED') AND "requesterResolvedAt" IS NOT NULL;

\echo '-- card myPlannedActions: PLANNED actions assigned to the caller on active Tickets'
SELECT 'myPlannedActions' AS card, count(*) AS count
  FROM "ActionTaken" a JOIN "Ticket" t ON t.id = a."ticketId"
 WHERE a.status = 'PLANNED'
   AND a."assigneeId" = (SELECT id FROM "User" WHERE email = :'staff_email')
   AND t."currentStatus" NOT IN ('CLOSED', 'CANCELLED');

\echo '-- Administrator userCounts: every account by role, and the active ones'
SELECT role, count(*) AS count, count(*) FILTER (WHERE "isActive") AS active_count
  FROM "User" GROUP BY role ORDER BY role;
