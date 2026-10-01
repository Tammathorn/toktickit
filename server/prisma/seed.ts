import { getPrisma } from "../src/prisma.js";
import { seedGraded, gradedSeedSummary } from "../src/seed/graded-seed.js";

// The graded seed — labsheet section 5.3 as C-91 reads it. Safe to run
// repeatedly: users, Categories and Related Systems by upsert, Tickets by the
// natural key (Requester email, summary), comments and notes by Ticket plus
// body. The logic lives in src/seed/graded-seed.ts so the data-model and
// migration tests can call it directly rather than shelling out to this runner.
async function main() {
  const prisma = getPrisma();
  await seedGraded(prisma);
  const s = gradedSeedSummary();
  console.log(
    `Seeded ${s.categories} categories, ${s.relatedSystems} related systems, ` +
      `${s.activeRequesters} active and ${s.inactiveRequesters} inactive Requesters, ` +
      `${s.activeItStaff} active and ${s.inactiveItStaff} inactive IT Staff, ` +
      `${s.administrators} Administrator, ${s.firstLoginAccounts} first-login account, ` +
      `${s.tickets} tickets, ${s.publicComments} public comments and ${s.internalNotes} internal notes.`,
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
