import { getPrisma } from "../src/prisma.js";
import { seedGraded, gradedSeedSummary } from "../src/seed/graded-seed.js";

// The graded seed — labsheet section 5.3. Safe to run repeatedly (upsert).
// The logic lives in src/seed/graded-seed.ts so the data-model tests can call it
// directly rather than shelling out to this runner.
async function main() {
  const prisma = getPrisma();
  await seedGraded(prisma);
  const s = gradedSeedSummary();
  console.log(
    `Seeded ${s.categories} categories, ${s.relatedSystems} related systems, ` +
      `${s.activeRequesters} active and ${s.inactiveRequesters} inactive Development Requesters.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
