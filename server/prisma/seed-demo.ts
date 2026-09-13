import { getPrisma } from "../src/prisma.js";
import { seedDemo } from "../src/seed/demo-seed.js";

// Demonstration data — C-22. Not graded, and separate from prisma/seed.ts.
// Run with:  npx tsx prisma/seed-demo.ts
// Requires the graded seed to have run first.
async function main() {
  const prisma = getPrisma();
  const { created, skipped } = await seedDemo(prisma);
  console.log(
    `Demo seed complete: ${created} tickets created, ${skipped} already present.`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
