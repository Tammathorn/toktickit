-- C-67 — RequesterUser becomes User by RENAME, never by DROP + CREATE.
--
-- Prisma generates `DROP TABLE "RequesterUser"` + `CREATE TABLE "User"` for a
-- model rename, which would destroy every row and so every Ticket's owner.
-- That generated SQL was replaced by hand with the statements below: the ids
-- survive, and with them every Ticket.requesterId, whose column name does not
-- change either (C-68). The Ticket foreign key needs no work at all - a
-- constraint follows the table it references through a rename.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- RenameTable, with its primary key, its email unique index and its sequence
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
ALTER SEQUENCE "RequesterUser_id_seq" RENAME TO "User_id_seq";

-- AlterTable — the authentication columns (C-69, C-72).
--
-- Every migrated row arrives with role REQUESTER, passwordHash NULL and
-- mustChangePassword true. A NULL hash can never authenticate and returns the
-- same generic 401 as a wrong password, so the window between migrating and
-- seeding is closed rather than open (BR-07, BR-17).
ALTER TABLE "User"
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
    ADD COLUMN "passwordHash" TEXT,
    ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- @updatedAt is written by Prisma Client on every update, so the column carries
-- no database default once the existing rows have been backfilled above.
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
