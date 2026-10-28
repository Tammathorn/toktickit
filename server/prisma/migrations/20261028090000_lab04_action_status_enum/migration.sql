-- Lab 4, M1 (C-145): the ActionTaken lifecycle enum, alone in its migration.
-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');
