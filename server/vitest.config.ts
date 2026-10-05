import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // C-83 — creates, migrates and seeds toktickit_test, then points
    // DATABASE_URL at it so no test reaches the dev database.
    globalSetup: ["./tests/global-setup.ts"],
    // The API files share one Postgres database and one UPLOAD_DIR. Running
    // them one file at a time keeps row counts and directory listings stable;
    // tests within a file still run in order.
    fileParallelism: false,
    // migrate deploy, the seed and the MIG-14 drift check each shell out.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
