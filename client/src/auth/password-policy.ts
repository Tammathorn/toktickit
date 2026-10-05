// The one password validator and the authentication message catalogue are a
// single module shared with the server (C-60, BR-14, ui-spec.md section 11:
// "one module imported by both sides, not two implementations that agree
// today"). This file is the client's only door to it. vite.config.ts allows the
// dev server to serve exactly that one file from outside client/.
export * from "../../../server/src/lib/password-policy.js";
