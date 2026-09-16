import type { PrismaClient } from "@prisma/client";

// The GRADED seed — labsheet section 5.3, exactly as specified (C-22).
// Four Categories, at least six Related Systems, at least four active
// Development Requesters, at least one inactive.
//
// Idempotent by upsert: running it twice creates no duplicate rows and changes
// nothing that already exists. Demo Tickets live in seed-demo.ts and are
// deliberately not here, so this seed cannot be said to exceed 5.3.

export const CATEGORY_NAMES = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
] as const;

export const RELATED_SYSTEM_NAMES = [
  "Email",
  "Campus Wi-Fi",
  "VPN",
  "LEB2 App",
  "Grade Submission App",
  "Printer",
  "Corporate Laptop",
] as const;

export const REQUESTERS = [
  { name: "Anucha Prasert", email: "anucha.p@example.ac.th", isActive: true },
  { name: "Kanya Somsri", email: "kanya.s@example.ac.th", isActive: true },
  { name: "Nattapong Wong", email: "nattapong.w@example.ac.th", isActive: true },
  { name: "Siriporn Chaiyo", email: "siriporn.c@example.ac.th", isActive: true },
  // At least one inactive Requester — 5.3 requires it so the BR-11 exclusion
  // and the C-33 / AC-63 rejection path can both be demonstrated.
  { name: "Prasit Boonmee", email: "prasit.b@example.ac.th", isActive: false },
] as const;

export async function seedGraded(prisma: PrismaClient): Promise<void> {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const r of REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: { name: r.name, email: r.email, isActive: r.isActive },
    });
  }
}

export function gradedSeedSummary() {
  const active = REQUESTERS.filter((r) => r.isActive).length;
  return {
    categories: CATEGORY_NAMES.length,
    relatedSystems: RELATED_SYSTEM_NAMES.length,
    activeRequesters: active,
    inactiveRequesters: REQUESTERS.length - active,
  };
}
