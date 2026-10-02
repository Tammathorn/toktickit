import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// C-53 — password hashing is scrypt from node:crypto. No authentication
// library is installed: CLAUDE.md bans passport, jsonwebtoken, bcrypt,
// bcryptjs, argon2 and express-session unless a decision row approves one, and
// none does.
//
// A hash is stored as six dollar-separated fields, so the cost parameters
// travel with the hash and an old hash stays verifiable if they are ever
// raised:
//
//     scrypt$N$r$p$salt$hash          salt and hash hex-encoded
//
// The password POLICY (BR-12, BR-13) is not here: it lives in
// password-policy.ts, which has no node: imports so the client can import the
// same module (C-60, FR-17).

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

type StoredHash = { N: number; r: number; p: number; salt: Buffer; hash: Buffer };

const HEX = /^(?:[0-9a-f]{2})+$/;

function parseStored(stored: string): StoredHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return null;
  if (!HEX.test(parts[4]) || !HEX.test(parts[5])) return null;
  return { N: n, r, p, salt: Buffer.from(parts[4], "hex"), hash: Buffer.from(parts[5], "hex") };
}

// Derived once, on first use: the comparison target for a NULL or unreadable
// stored hash.
let decoy: { salt: Buffer; hash: Buffer } | null = null;

function decoyHash() {
  if (!decoy) {
    const salt = Buffer.alloc(SALT_BYTES);
    decoy = { salt, hash: scryptSync("", salt, KEY_BYTES, { N, r: R, p: P }) };
  }
  return decoy;
}

// BR-11, BR-17. True only when `password` derives to the stored hash. A NULL or
// unreadable stored value still runs one scrypt derivation and one
// timingSafeEqual before it fails, so an unknown email, a wrong password and a
// NULL hash cost the same and cannot be told apart by timing (C-53, AC-07).
export function verifyPassword(stored: string | null, password: string): boolean {
  const parsed = stored === null ? null : parseStored(stored);
  try {
    if (parsed) {
      const derived = scryptSync(password, parsed.salt, parsed.hash.length, { N: parsed.N, r: parsed.r, p: parsed.p });
      return timingSafeEqual(derived, parsed.hash);
    }
    const target = decoyHash();
    timingSafeEqual(scryptSync(password, target.salt, KEY_BYTES, { N, r: R, p: P }), target.hash);
    return false;
  } catch {
    // Cost parameters scrypt refuses: the stored value cannot verify anything.
    return false;
  }
}
