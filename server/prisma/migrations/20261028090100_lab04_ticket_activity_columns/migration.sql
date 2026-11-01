-- Lab 4, M2 (spec 7.4, 7.7 step 3). Additive only: no DROP, no rename.

-- version (C-138) and resolvedAt (C-126): every legacy row gets 0 and NULL.
ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- lastActivityAt (C-140): added nullable, backfilled, then made NOT NULL with
-- its default. The backfill is the greatest of the Ticket's updatedAt, its
-- latest Public Comment, and its latest Attachment upload or removal; NULLs
-- are ignored by GREATEST. Internal Notes are never read (BR-47).
ALTER TABLE "Ticket" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

UPDATE "Ticket" t SET "lastActivityAt" = GREATEST(
  t."updatedAt",
  (SELECT MAX(c."createdAt") FROM "PublicComment" c WHERE c."ticketId" = t."id"),
  (SELECT MAX(a."uploadedAt") FROM "Attachment" a WHERE a."ticketId" = t."id"),
  (SELECT MAX(a."removedAt") FROM "Attachment" a WHERE a."ticketId" = t."id")
);

ALTER TABLE "Ticket" ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Ticket" ALTER COLUMN "lastActivityAt" SET NOT NULL;

-- Replay keys (C-139). NULL on every legacy row; PostgreSQL allows repeated
-- NULLs under a unique constraint, so no partial index is needed (C-145).
ALTER TABLE "Ticket" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "PublicComment" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "InternalNote" ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_requesterId_lastActivityAt_idx" ON "Ticket"("requesterId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Ticket_resolvedAt_idx" ON "Ticket"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_requesterId_clientRequestId_key" ON "Ticket"("requesterId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicComment_authorId_clientRequestId_key" ON "PublicComment"("authorId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalNote_authorId_clientRequestId_key" ON "InternalNote"("authorId", "clientRequestId");
