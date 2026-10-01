-- AlterEnum — C-70.
--
-- The three Lab 3 statuses are added in their own migration, before the
-- migration that uses them: PostgreSQL cannot use a new enum value in the same
-- transaction that adds it. Nothing else happens here.
--
-- Each value is placed at its contract position (specification.md section 7)
-- rather than appended, so the type sorts NEW, OPEN, IN_PROGRESS,
-- WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED and the queue's
-- enum ordering (api-spec 8.1) is the declared one.
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN' BEFORE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER' BEFORE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED' BEFORE 'CANCELLED';
