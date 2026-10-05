import { randomBytes, scryptSync } from "node:crypto";

// C-53 — password hashing is scrypt from node:crypto. No authentication
// library is installed: CLAUDE.md bans passport, jsonwebtoken, bcrypt,
// bcryptjs, argon2 and express-session unless a decision row approves one, and
// none does.
//
// A hash is stored as five dollar-separated parts, so the cost parameters
// travel with the hash and an old hash stays verifiable if they are ever
// raised:
//
//     scrypt$N$r$p$salt$hash          salt and hash hex-encoded
//
// Verification and the shared password-policy validator belong to the
// authentication work (Issue 3). This module exists in Issue 2 because the
// seed has to write hashes in this exact format (C-72) and nothing may ever
// write a plaintext password to a column.

const N = 16_384;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, KEY_BYTES, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("hex"), hash.toString("hex")].join("$");
}
