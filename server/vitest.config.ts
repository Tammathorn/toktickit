import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The API files share one Postgres database and one UPLOAD_DIR. Running
    // them one file at a time keeps row counts and directory listings stable;
    // tests within a file still run in order.
    fileParallelism: false,
  },
});
