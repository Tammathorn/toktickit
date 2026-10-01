-- C-71 — IT Priority is backfilled from Requested Priority, then made NOT NULL.
--
-- Prisma's generated SQL carried the `SET NOT NULL` with no backfill, and
-- warned that it "will fail if there are existing NULL values in that column".
-- Every Lab 2 Ticket has a NULL itPriority (L2 C-07), so the UPDATE below was
-- added by hand and runs first, inside the same transaction as the constraint.
-- 4.5 says IT Priority starts as a copy of Requested Priority; backfilling old
-- Tickets the same way gives one rule for old and new Tickets.

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ownerId" INTEGER,
ADD COLUMN     "requesterResolvedAt" TIMESTAMP(3);

-- Backfill before the constraint, never after it
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- CreateIndex — the queue's own indexes. None of the four Lab 2 indexes serves
-- the queue, because the queue has no requester scope; every queue query starts
-- from a status set (BR-72), so currentStatus leads each of these three.
CREATE INDEX "Ticket_currentStatus_itPriority_createdAt_idx" ON "Ticket"("currentStatus", "itPriority", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_currentStatus_ownerId_idx" ON "Ticket"("currentStatus", "ownerId");

-- CreateIndex
CREATE INDEX "Ticket_currentStatus_categoryId_idx" ON "Ticket"("currentStatus", "categoryId");

-- AddForeignKey — zero or one Ticket Owner (BR-45), nullable so a Ticket can be
-- unassigned.
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
