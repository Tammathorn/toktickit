import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

// The one server file the client imports: the shared password validator and
// authentication message catalogue (C-60). The dev server may serve exactly
// this file from outside client/, and nothing else there.
const SHARED_POLICY = fileURLToPath(new URL("../server/src/lib/password-policy.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // C-56 - /api goes to the API through this dev server, so the browser sees
    // one origin and the SameSite=Strict session cookie travels with every
    // request. VITE_API_URL is "" so api.ts builds same-origin paths.
    proxy: { "/api": "http://localhost:3000" },
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), SHARED_POLICY] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});
