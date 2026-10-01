import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedGraded } from "../src/seed/graded-seed.js";

// C-83 — the server suite runs against a separate toktickit_test database, so
// Supertest never touches the dev data L2 C-37 protects. This setup creates it
// if it is missing, applies every migration with `migrate deploy` (never
// `migrate dev`, never `migrate reset`), seeds it, and then points
// DATABASE_URL at it before any test worker starts.

const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DATABASE = "toktickit_test";

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function createDatabaseIfMissing(maintenanceUrl: string): Promise<void> {
  const admin = new PrismaClient({ datasources: { db: { url: maintenanceUrl } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE}"`);
  } catch (error) {
    // 42P04 duplicate_database is the normal case: it already exists.
    const text = String(error);
    if (!text.includes("42P04") && !/already exists/i.test(text)) throw error;
  } finally {
    await admin.$disconnect();
  }
}

export default async function setup(): Promise<void> {
  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new Error("DATABASE_URL is not set. Copy server/.env.example to server/.env.");
  }

  const testUrl = withDatabase(configured, TEST_DATABASE);
  await createDatabaseIfMissing(withDatabase(configured, "postgres"));

  execSync("npx prisma migrate deploy", {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });

  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    await seedGraded(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // Test workers are forked after this returns, so they inherit the test URL.
  process.env.DATABASE_URL = testUrl;
}
