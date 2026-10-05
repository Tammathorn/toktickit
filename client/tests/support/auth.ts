import { vi } from "vitest";
import * as api from "../../src/api.js";

// The AuthContext test wrapper tests.md section 1.2 plans (Lab 3, #40). Every
// client test renders the real <App />, whose AuthProvider asks
// GET /api/auth/me who is signed in; signInAs answers that question with the
// user given, so the screen renders exactly as it would for that user and
// role. Nothing is placed in browser storage - there is nothing there to read
// (FR-11, BR-25).

export const REQUESTER_A: api.AuthUser = {
  id: 1,
  name: "Anucha Prasert",
  email: "anucha.p@example.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

export const REQUESTER_B: api.AuthUser = {
  id: 2,
  name: "Kanya Somsri",
  email: "kanya.s@example.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

export const IT_STAFF: api.AuthUser = {
  id: 6,
  name: "Araya Methee",
  email: "araya.m@example.ac.th",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

export const ADMINISTRATOR: api.AuthUser = {
  id: 10,
  name: "Panida Srisawat",
  email: "panida.s@example.ac.th",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

export function signInAs(user: api.AuthUser) {
  return vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(user);
}

export function signedOut() {
  return vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
}
