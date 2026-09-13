import type { PrismaClient, RequestedPriority } from "@prisma/client";
import { createTicketWithNumber } from "../lib/ticket-repository.js";

// The DEMO seed — C-22. NOT graded content, and deliberately separate from the
// graded seed so that seed.ts cannot be said to exceed labsheet 5.3.
//
// It exists because the 5.3 seed contains no Tickets, yet PDF Part 7 needs a
// paginated list, a contrasting Requester, an empty state and a no-results
// state. Regenerable at any time (specification.md section 11, assumption 4).
//
// Idempotent without a natural key on Ticket: each planned row is matched on
// (requesterId, summary), which is unique within this fixture.

type DemoTicket = {
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: RequestedPriority;
  daysAgo: number;
};

// Requester A — enough rows that pageSize 10 yields two pages (BR-27, AC-44),
// spread across categories, related systems and priorities so that every filter
// and the no-results state can be demonstrated.
const A_TICKETS: DemoTicket[] = [
  {
    summary: "Laptop battery drains within an hour",
    description:
      "The battery drops from full to twenty percent within an hour of light use, even with the screen dimmed and no external devices attached.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "HIGH",
    daysAgo: 1,
  },
  {
    summary: "Cannot connect to campus Wi-Fi in Building 4",
    description:
      "The laptop sees the campus network but authentication fails repeatedly on the fourth floor of Building 4. Other buildings connect normally.",
    categoryName: "Network",
    relatedSystemName: "Campus Wi-Fi",
    requestedPriority: "HIGH",
    daysAgo: 2,
  },
  {
    summary: "VPN disconnects every few minutes",
    description:
      "The VPN client connects and then drops after roughly three minutes, which makes remote work on the grade system impossible.",
    categoryName: "Network",
    relatedSystemName: "VPN",
    requestedPriority: "HIGH",
    daysAgo: 3,
  },
  {
    summary: "Password reset link never arrives",
    description:
      "The account password reset was requested four times this morning and no message has arrived in the inbox or the spam folder.",
    categoryName: "Account and Access",
    relatedSystemName: "Email",
    requestedPriority: "MEDIUM",
    daysAgo: 4,
  },
  {
    summary: "Printer on floor 3 jams on every duplex job",
    description:
      "Double sided printing jams at the second sheet every time. Single sided printing completes without any problem at all.",
    categoryName: "Hardware",
    relatedSystemName: "Printer",
    requestedPriority: "MEDIUM",
    daysAgo: 5,
  },
  {
    summary: "LEB2 App will not load course materials",
    description:
      "Course material pages show a spinner indefinitely on both Chrome and Edge, while the rest of the application responds normally.",
    categoryName: "Software",
    relatedSystemName: "LEB2 App",
    requestedPriority: "MEDIUM",
    daysAgo: 6,
  },
  {
    summary: "Grade submission times out at the final step",
    description:
      "The grade submission form accepts all entries and then times out when the submit button is pressed, losing the entered values.",
    categoryName: "Software",
    relatedSystemName: "Grade Submission App",
    requestedPriority: "HIGH",
    daysAgo: 7,
  },
  {
    summary: "Shared mailbox missing from Outlook",
    description:
      "The departmental shared mailbox disappeared from the folder list this week and cannot be re-added through the account settings.",
    categoryName: "Account and Access",
    relatedSystemName: "Email",
    requestedPriority: "MEDIUM",
    daysAgo: 8,
  },
  {
    summary: "Laptop fan runs constantly at full speed",
    description:
      "The cooling fan runs at maximum speed from the moment the machine boots, even with no applications open and the processor idle.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "LOW",
    daysAgo: 9,
  },
  {
    summary: "Wi-Fi drops when moving between lecture halls",
    description:
      "The connection drops entirely when walking between lecture halls rather than roaming, and needs a manual reconnect each time.",
    categoryName: "Network",
    relatedSystemName: "Campus Wi-Fi",
    requestedPriority: "LOW",
    daysAgo: 10,
  },
  {
    summary: "Cannot open PDF attachments from email",
    description:
      "PDF attachments downloaded from email open as blank documents in the built in reader, although the same files open on another machine.",
    categoryName: "Software",
    relatedSystemName: "Email",
    requestedPriority: "LOW",
    daysAgo: 11,
  },
  {
    summary: "Access request for the archived grade folder",
    description:
      "Read access is needed to the archived grade folder from the previous academic year in order to answer a student transcript query.",
    categoryName: "Account and Access",
    relatedSystemName: "Grade Submission App",
    requestedPriority: "LOW",
    daysAgo: 12,
  },
  {
    summary: "Printer driver missing after Windows update",
    description:
      "The floor printer disappeared from the device list following the latest Windows update and the driver will not reinstall automatically.",
    categoryName: "Hardware",
    relatedSystemName: "Printer",
    requestedPriority: "MEDIUM",
    daysAgo: 13,
  },
  {
    summary: "VPN certificate expires next week",
    description:
      "The VPN client warns that the installed certificate expires next week and asks for a replacement to be installed before that date.",
    categoryName: "Network",
    relatedSystemName: "VPN",
    requestedPriority: "LOW",
    daysAgo: 14,
  },
];

// Requester B — a small, clearly different set, so that switching A to B
// visibly empties the list (AC-11, PDF Part 7).
const B_TICKETS: DemoTicket[] = [
  {
    summary: "Monitor flickers when docked",
    description:
      "The external monitor flickers roughly once a minute while the laptop is docked, and stops entirely when the cable is connected directly.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "MEDIUM",
    daysAgo: 1,
  },
  {
    summary: "Cannot sign in to the LEB2 App on mobile",
    description:
      "Sign in on the mobile application returns an unspecified error, while the same credentials work correctly in the desktop browser.",
    categoryName: "Account and Access",
    relatedSystemName: "LEB2 App",
    requestedPriority: "HIGH",
    daysAgo: 3,
  },
  {
    summary: "Request a second monitor for the office",
    description:
      "A second monitor is requested for the shared office to allow grade checking and course preparation side by side during the term.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "LOW",
    daysAgo: 6,
  },
];

export async function seedDemo(
  prisma: PrismaClient,
): Promise<{ created: number; skipped: number }> {
  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  if (requesters.length < 3) {
    throw new Error(
      "Demo seed needs at least three active Development Requesters. Run the graded seed first.",
    );
  }
  const [a, b] = requesters;
  // The third active Requester is deliberately left with no Tickets, so the
  // "No tickets yet" empty state (BR-57, AC-49) is reachable without deleting
  // anything.

  const categories = await prisma.category.findMany();
  const systems = await prisma.relatedSystem.findMany();

  const categoryId = (name: string): number => {
    const found = categories.find((c) => c.name === name);
    if (!found) {
      throw new Error(`Demo seed: unknown Category ${name}. Run the graded seed first.`);
    }
    return found.id;
  };
  const systemId = (name: string): number => {
    const found = systems.find((s) => s.name === name);
    if (!found) {
      throw new Error(
        `Demo seed: unknown Related System ${name}. Run the graded seed first.`,
      );
    }
    return found.id;
  };

  let created = 0;
  let skipped = 0;

  for (const [requester, planned] of [
    [a, A_TICKETS],
    [b, B_TICKETS],
  ] as const) {
    for (const t of planned) {
      const existing = await prisma.ticket.findFirst({
        where: { requesterId: requester.id, summary: t.summary },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      await createTicketWithNumber(prisma, {
        requesterId: requester.id,
        categoryId: categoryId(t.categoryName),
        relatedSystemId: systemId(t.relatedSystemName),
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        createdAt: new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000),
      });
      created += 1;
    }
  }

  return { created, skipped };
}
