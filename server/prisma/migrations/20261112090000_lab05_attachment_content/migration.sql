-- Lab 5 (R-04): keep attachment bytes in PostgreSQL when the app runs on
-- Cloud Run, whose container disk is lost on every restart and redeploy.
-- Additive only: one nullable column, so the previous release still runs
-- against this schema and a rollback needs no down-migration.
ALTER TABLE "Attachment" ADD COLUMN "content" BYTEA;
