import request from "supertest";
import type { PrismaClient, UserRole } from "@prisma/client";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/lib/password.js";

// The logged-in Supertest agent tests.md section 1.2 plans (Lab 3, #40). An
// agent keeps the tt_session cookie from its login, so every later request on
// it is made as that user - the only identity the API accepts (C-64).

export type Agent = ReturnType<typeof request.agent>;

// Every user a test file creates gets this password, so it can sign in. Never a
// real password; it exists only in toktickit_test.
export const TEST_PASSWORD = "Test#Password1";

export async function signIn(email: string, password = TEST_PASSWORD): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`sign-in as ${email} failed with ${res.status}`);
  return agent;
}

let counter = 0;

// Creates a user who can sign in at once - a password set, no change owed - and
// returns the row with a signed-in agent. `tag` keeps the address unique and
// lets afterAll find the rows it made.
export async function signedInUser(
  prisma: PrismaClient,
  tag: string,
  options: { role?: UserRole; name?: string } = {},
): Promise<{ id: number; email: string; name: string; agent: Agent }> {
  counter += 1;
  const email = `${tag}-${Date.now()}-${counter}@example.test`;
  const user = await prisma.user.create({
    data: {
      name: options.name ?? `${tag} ${counter}`,
      email,
      role: options.role ?? "REQUESTER",
      passwordHash: hashPassword(TEST_PASSWORD),
      mustChangePassword: false,
    },
  });
  return { id: user.id, email, name: user.name, agent: await signIn(email) };
}

// A test file's own users and everything hanging off them, removed in afterAll.
export async function removeUsers(prisma: PrismaClient, ids: number[]): Promise<void> {
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
