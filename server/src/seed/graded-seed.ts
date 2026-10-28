import type { PrismaClient, RequestedPriority, TicketStatus, UserRole } from "@prisma/client";
import { hashPassword } from "../lib/password.js";
import { createTicketWithNumber } from "../lib/ticket-repository.js";

// The GRADED seed — labsheet section 5.3, as C-91 now reads it: accounts for
// all three roles, realistic Tickets across Requesters, statuses, priorities
// and ownership, and harmless example Public Comments and Internal Notes.
//
// Idempotent, and safe to run repeatedly:
//   - Users, Categories and Related Systems by upsert on their unique keys.
//   - Tickets by the natural key (Requester email, summary), because
//     ticketNumber is derived from the row id (L2 C-49) and ids differ between
//     the dev and test databases.
//   - Comments and notes by their Ticket plus their body.
//
// Passwords (C-72): a persona receives the documented local-development
// password ONLY where passwordHash IS NULL, which is the state every row
// migrated out of Lab 2 arrives in. A password somebody has since changed is
// therefore never overwritten, and the dedicated first-login account is created
// flagged and never updated again.
//
// Extra volume for queue and My Tickets pagination lives in seed-demo.ts, so
// this seed stays readable and cannot be said to exceed 5.3.

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

// LOCAL DEVELOPMENT ONLY. These are documented in the README, are never a real
// personal password, and exist so a marker can sign in as each role. They
// satisfy the C-60 policy, so changing one through the UI is a fair test.
export const SEED_PASSWORDS = {
  requester: "Requester#2026",
  itStaff: "ItStaff#2026",
  administrator: "Admin#2026",
  firstLogin: "FirstLogin#2026",
} as const;

export type SeedUser = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password: string;
};

// The five Lab 2 personas. Their emails are the upsert key, so the migrated
// rows are matched rather than duplicated and every existing Ticket keeps its
// Requester (C-67).
export const REQUESTERS: readonly SeedUser[] = [
  { name: "Anucha Prasert", email: "anucha.p@example.ac.th", role: "REQUESTER", isActive: true, password: SEED_PASSWORDS.requester },
  { name: "Kanya Somsri", email: "kanya.s@example.ac.th", role: "REQUESTER", isActive: true, password: SEED_PASSWORDS.requester },
  { name: "Nattapong Wong", email: "nattapong.w@example.ac.th", role: "REQUESTER", isActive: true, password: SEED_PASSWORDS.requester },
  { name: "Siriporn Chaiyo", email: "siriporn.c@example.ac.th", role: "REQUESTER", isActive: true, password: SEED_PASSWORDS.requester },
  // At least one inactive Requester — 5.3 requires it, and an inactive user
  // keeps their Tickets and Attachments (L2 LC-01) while being unable to log in.
  { name: "Prasit Boonmee", email: "prasit.b@example.ac.th", role: "REQUESTER", isActive: false, password: SEED_PASSWORDS.requester },
];

// Three active IT Staff and one inactive, so an inactive owner can be shown as
// "(inactive)" until the Ticket is reassigned (C-75).
export const IT_STAFF: readonly SeedUser[] = [
  { name: "Araya Methee", email: "araya.m@example.ac.th", role: "IT_STAFF", isActive: true, password: SEED_PASSWORDS.itStaff },
  { name: "Decha Intharat", email: "decha.i@example.ac.th", role: "IT_STAFF", isActive: true, password: SEED_PASSWORDS.itStaff },
  { name: "Fonthip Charoen", email: "fonthip.c@example.ac.th", role: "IT_STAFF", isActive: true, password: SEED_PASSWORDS.itStaff },
  { name: "Somkid Rattana", email: "somkid.r@example.ac.th", role: "IT_STAFF", isActive: false, password: SEED_PASSWORDS.itStaff },
];

// Exactly one active Administrator, so the last-active-Administrator rule
// (C-80) is demonstrable from the seeded state.
export const ADMINISTRATORS: readonly SeedUser[] = [
  { name: "Panida Srisawat", email: "panida.s@example.ac.th", role: "ADMINISTRATOR", isActive: true, password: SEED_PASSWORDS.administrator },
];

export const SEED_USERS: readonly SeedUser[] = [...REQUESTERS, ...IT_STAFF, ...ADMINISTRATORS];

// The dedicated first-login account (C-72). It is created with
// mustChangePassword true and is never updated by the seed, so the mandatory
// change can be demonstrated again on every run.
export const FIRST_LOGIN_ACCOUNT: SeedUser = {
  name: "Wichai Tanaka",
  email: "first.login@example.ac.th",
  role: "REQUESTER",
  isActive: true,
  password: SEED_PASSWORDS.firstLogin,
};

export type SeedTicket = {
  requesterEmail: string;
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: RequestedPriority;
  /** Omitted where IT agrees with the Requester: it then copies Requested Priority. */
  itPriority?: RequestedPriority;
  currentStatus: TicketStatus;
  /** null is an unassigned Ticket, which the queue's owner filter needs. */
  ownerEmail: string | null;
  daysAgo: number;
  /** C-76 — the Requester has indicated the problem appears resolved. */
  requesterResolved?: boolean;
  publicComments?: { authorEmail: string; body: string }[];
  internalNotes?: { authorEmail: string; body: string }[];
};

// ---------------------------------------------------------------------------
// Lab 4 (C-146, C-188, spec 7.9) - Actions Taken, keyed by (Ticket summary,
// description). Times are hours before the run, so the rolling 7-day metrics
// never go empty a week after seeding. The plan gives Tickets with zero, one
// and several actions; one Ticket with actions by three different staff
// (BR-02); planned, completed, cancelled and follow-up-required actions; one
// open Ticket that passes the gate (Grade submission) and one that fails it
// (Campus Wi-Fi: its only post-reopen action was cancelled, C-186); and
// completed actions behind every seeded Resolved and Closed Ticket. Nothing is
// assigned to the Administrator, so her "My planned actions" stays a real 0.
// ---------------------------------------------------------------------------
export type SeedAction = {
  ticketSummary: string;
  description: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  hoursAgo: number;
  byEmail: string;
  assigneeEmail?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string;
  attachmentNotes?: string;
};

export const SEED_ACTIONS: readonly SeedAction[] = [
  {
    ticketSummary: "VPN disconnects after roughly three minutes",
    description: "Checked the VPN client logs on the Requester's laptop.",
    status: "COMPLETED",
    hoursAgo: 80,
    byEmail: "araya.m@example.ac.th",
    result: "The client drops the tunnel when the idle timer fires at 180 seconds.",
  },
  {
    ticketSummary: "VPN disconnects after roughly three minutes",
    description: "Compared the gateway idle timeout with the campus profile.",
    status: "COMPLETED",
    hoursAgo: 50,
    byEmail: "decha.i@example.ac.th",
    result: "The gateway profile still has the old 3-minute timeout.",
    followUpRequired: true,
    followUpNote: "Ask the network team to raise the idle timeout to 30 minutes.",
  },
  {
    ticketSummary: "VPN disconnects after roughly three minutes",
    description: "Re-test the VPN for 30 minutes after the gateway profile change.",
    status: "PLANNED",
    hoursAgo: -20,
    // The third staff user on this Ticket (BR-02), planning work for the owner.
    byEmail: "fonthip.c@example.ac.th",
    assigneeEmail: "araya.m@example.ac.th",
    attachmentNotes: "The log excerpt from the first check is attachment 1, if the Requester uploads it.",
  },
  {
    ticketSummary: "Grade submission form times out at the final step",
    description: "Reproduced the timeout with a 60-row grade sheet.",
    status: "COMPLETED",
    hoursAgo: 100,
    byEmail: "decha.i@example.ac.th",
    result: "Raised the form's request limit; a 60-row sheet now submits in 4 seconds.",
  },
  {
    ticketSummary: "Shared departmental mailbox missing from Outlook",
    description: "Checked the mailbox permissions in the admin console.",
    status: "COMPLETED",
    hoursAgo: 150,
    byEmail: "fonthip.c@example.ac.th",
    result: "Full Access had been removed during the semester clean-up.",
    followUpRequired: true,
    followUpNote: "Restore Full Access and wait for Outlook to resync.",
  },
  {
    ticketSummary: "Shared departmental mailbox missing from Outlook",
    description: "Restored Full Access and restarted Outlook with the Requester.",
    status: "COMPLETED",
    hoursAgo: 100,
    byEmail: "fonthip.c@example.ac.th",
    result: "The shared mailbox appears in Outlook again.",
  },
  {
    ticketSummary: "Printer on the third floor jams on every duplex job",
    description: "Replaced the duplex unit's pickup roller.",
    status: "COMPLETED",
    hoursAgo: 460,
    byEmail: "araya.m@example.ac.th",
    result: "Twenty duplex test pages printed without a jam.",
  },
  {
    ticketSummary: "Campus Wi-Fi drops when moving between buildings",
    description: "Enabled fast roaming on the building access points.",
    status: "COMPLETED",
    hoursAgo: 260,
    byEmail: "decha.i@example.ac.th",
    result: "Roaming between buildings A and B held the connection in a walk test.",
  },
  {
    ticketSummary: "Campus Wi-Fi drops when moving between buildings",
    description: "Walk test from building C to the library.",
    status: "CANCELLED",
    hoursAgo: 40,
    byEmail: "decha.i@example.ac.th",
    result: "The library access points are being replaced next week; test after that.",
  },
];

// The status path a seeded Ticket took, written as history only for Tickets
// this seed creates (C-188). Legacy rows get none.
const STATUS_PATH: Record<TicketStatus, TicketStatus[]> = {
  NEW: [],
  OPEN: ["OPEN"],
  IN_PROGRESS: ["IN_PROGRESS"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
  RESOLVED: ["IN_PROGRESS", "RESOLVED"],
  CLOSED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "REOPENED"],
  CANCELLED: ["CANCELLED"],
};

// All eight statuses, all three Requested Priorities, owned and unassigned.
// A status that means work is in hand - IN_PROGRESS, WAITING_FOR_REQUESTER,
// RESOLVED - always carries an owner, because C-93 requires somebody
// accountable for a Ticket being worked on.
//
// NOTHING HERE MAY BELONG TO THE THIRD ACTIVE REQUESTER, nattapong.w. That
// persona is deliberately left without a single Ticket, because it is how the
// "No tickets yet" empty state is reached without deleting anything (BR-57,
// AC-49). e2e/lab-02/my-tickets-screenshots.spec.ts asserts their total is 0,
// and the inactive Requester prasit.b keeps one Ticket instead, which shows
// that deactivation retains a user's data (L2 LC-01).
export const SEED_TICKETS: readonly SeedTicket[] = [
  {
    requesterEmail: "anucha.p@example.ac.th",
    summary: "Mailbox rejects the new password on the desktop client",
    description:
      "The webmail login accepts the new password but the desktop mail client keeps asking for it again, so no mail has been sent since Monday morning.",
    categoryName: "Account and Access",
    relatedSystemName: "Email",
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    ownerEmail: null,
    daysAgo: 1,
  },
  {
    requesterEmail: "kanya.s@example.ac.th",
    summary: "Lecture hall projector loses the laptop signal",
    description:
      "The projector in the second floor lecture hall drops the laptop signal every few minutes, which interrupts the class until the cable is reseated.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "MEDIUM",
    currentStatus: "OPEN",
    ownerEmail: null,
    daysAgo: 2,
    requesterResolved: true,
    publicComments: [
      {
        authorEmail: "kanya.s@example.ac.th",
        body: "The signal has been steady since yesterday afternoon, so this looks resolved from my side.",
      },
    ],
  },
  {
    requesterEmail: "kanya.s@example.ac.th",
    summary: "VPN disconnects after roughly three minutes",
    description:
      "The VPN client connects and then drops after about three minutes, every time, which makes working on the grade system from home impossible.",
    categoryName: "Network",
    relatedSystemName: "VPN",
    requestedPriority: "LOW",
    // IT disagrees with the Requester here: both columns exist so that a
    // disagreement is visible at a glance (ui-spec section 18).
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    ownerEmail: "araya.m@example.ac.th",
    daysAgo: 4,
    publicComments: [
      {
        authorEmail: "araya.m@example.ac.th",
        body: "We have reproduced the disconnection on a test account and are working through the gateway logs.",
      },
    ],
    internalNotes: [
      {
        authorEmail: "araya.m@example.ac.th",
        body: "Session timeout on the gateway is still at the vendor default. Change is scheduled in the next maintenance window.",
      },
    ],
  },
  {
    requesterEmail: "siriporn.c@example.ac.th",
    summary: "Grade submission form times out at the final step",
    description:
      "The grade submission form accepts every entry and then times out when submit is pressed, losing all the values that were typed in.",
    categoryName: "Software",
    relatedSystemName: "Grade Submission App",
    requestedPriority: "HIGH",
    currentStatus: "WAITING_FOR_REQUESTER",
    ownerEmail: "decha.i@example.ac.th",
    daysAgo: 6,
    publicComments: [
      {
        authorEmail: "decha.i@example.ac.th",
        body: "Could you tell us which course and section you were submitting, and roughly what time the timeout happened?",
      },
    ],
    internalNotes: [
      {
        authorEmail: "decha.i@example.ac.th",
        body: "Nothing in the application log at the reported time. Waiting for the course code before asking the vendor.",
      },
    ],
  },
  {
    requesterEmail: "anucha.p@example.ac.th",
    summary: "Shared departmental mailbox missing from Outlook",
    description:
      "The departmental shared mailbox disappeared from the folder list this week and it cannot be added again through the account settings.",
    categoryName: "Account and Access",
    relatedSystemName: "Email",
    requestedPriority: "MEDIUM",
    currentStatus: "RESOLVED",
    ownerEmail: "fonthip.c@example.ac.th",
    daysAgo: 9,
    publicComments: [
      {
        authorEmail: "fonthip.c@example.ac.th",
        body: "Your access to the shared mailbox has been restored. Please sign out and back in, and let us know if it is still missing.",
      },
    ],
    internalNotes: [
      {
        authorEmail: "fonthip.c@example.ac.th",
        body: "The mailbox permission was dropped by the group clean-up on the first of the month. Membership restored.",
      },
    ],
  },
  {
    requesterEmail: "kanya.s@example.ac.th",
    summary: "Printer on the third floor jams on every duplex job",
    description:
      "Double sided printing jams at the second sheet every single time, while single sided printing completes without any problem at all.",
    categoryName: "Hardware",
    relatedSystemName: "Printer",
    requestedPriority: "LOW",
    currentStatus: "CLOSED",
    ownerEmail: "araya.m@example.ac.th",
    daysAgo: 21,
    publicComments: [
      {
        authorEmail: "araya.m@example.ac.th",
        body: "The duplex unit has been replaced and a test job completed cleanly. Closing this ticket.",
      },
    ],
  },
  {
    requesterEmail: "siriporn.c@example.ac.th",
    summary: "Campus Wi-Fi drops when moving between buildings",
    description:
      "The connection drops completely when walking between buildings rather than roaming across access points, and it needs a manual reconnect each time.",
    categoryName: "Network",
    relatedSystemName: "Campus Wi-Fi",
    requestedPriority: "MEDIUM",
    currentStatus: "REOPENED",
    ownerEmail: "decha.i@example.ac.th",
    daysAgo: 14,
    publicComments: [
      {
        authorEmail: "siriporn.c@example.ac.th",
        body: "This started happening again this morning on the walk between Building 2 and Building 4.",
      },
    ],
    internalNotes: [
      {
        authorEmail: "decha.i@example.ac.th",
        body: "Roaming thresholds were only applied to the Building 2 controller. The rest of the campus still needs the same change.",
      },
    ],
  },
  {
    requesterEmail: "siriporn.c@example.ac.th",
    summary: "Request a second monitor for the shared office",
    description:
      "A second monitor is requested for the shared office so that grade checking and course preparation can be done side by side during the term.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "LOW",
    currentStatus: "CANCELLED",
    ownerEmail: null,
    daysAgo: 30,
    publicComments: [
      {
        authorEmail: "siriporn.c@example.ac.th",
        body: "A spare monitor was found within the department, so this request is no longer needed.",
      },
    ],
  },
  {
    requesterEmail: "prasit.b@example.ac.th",
    summary: "Course material pages will not load in the LEB2 App",
    description:
      "Course material pages show a loading spinner indefinitely in both Chrome and Edge, while every other part of the application responds normally.",
    categoryName: "Software",
    relatedSystemName: "LEB2 App",
    requestedPriority: "MEDIUM",
    currentStatus: "OPEN",
    ownerEmail: null,
    daysAgo: 40,
  },
];

// C-91 — the natural key is (Requester email, summary). The seed stops with an
// error rather than proceeding if two seeded Tickets would share one, because a
// duplicate key could silently match the wrong row on a later run.
export function assertUniqueTicketKeys(
  tickets: readonly { requesterEmail: string; summary: string }[],
): void {
  const seen = new Set<string>();
  for (const t of tickets) {
    const key = `${t.requesterEmail}\u0000${t.summary}`;
    if (seen.has(key)) {
      throw new Error(
        `Graded seed: duplicate Ticket key (${t.requesterEmail}, "${t.summary}"). ` +
          "The (Requester email, summary) key must identify exactly one seeded Ticket.",
      );
    }
    seen.add(key);
  }
}

export async function seedGraded(prisma: PrismaClient): Promise<void> {
  assertUniqueTicketKeys(SEED_TICKETS);

  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        passwordHash: hashPassword(u.password),
        mustChangePassword: false,
      },
    });
    // C-72 — one guarded write. It reaches a row migrated out of Lab 2, whose
    // hash is NULL, and never a hash a person has changed.
    await prisma.user.updateMany({
      where: { email: u.email, passwordHash: null },
      data: { passwordHash: hashPassword(u.password), mustChangePassword: false },
    });
  }

  // Created flagged, and deliberately never updated after that.
  await prisma.user.upsert({
    where: { email: FIRST_LOGIN_ACCOUNT.email },
    update: {},
    create: {
      name: FIRST_LOGIN_ACCOUNT.name,
      email: FIRST_LOGIN_ACCOUNT.email,
      role: FIRST_LOGIN_ACCOUNT.role,
      isActive: FIRST_LOGIN_ACCOUNT.isActive,
      passwordHash: hashPassword(FIRST_LOGIN_ACCOUNT.password),
      mustChangePassword: true,
    },
  });

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userId = (email: string): number => {
    const found = users.find((u) => u.email === email);
    if (!found) throw new Error(`Graded seed: unknown user ${email}.`);
    return found.id;
  };

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const systems = await prisma.relatedSystem.findMany({ select: { id: true, name: true } });
  const categoryId = (name: string): number => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Graded seed: unknown Category ${name}.`);
    return found.id;
  };
  const systemId = (name: string): number => {
    const found = systems.find((s) => s.name === name);
    if (!found) throw new Error(`Graded seed: unknown Related System ${name}.`);
    return found.id;
  };

  for (const t of SEED_TICKETS) {
    const requesterId = userId(t.requesterEmail);
    const createdAt = new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000);

    const existing = await prisma.ticket.findFirst({
      where: { requesterId, summary: t.summary },
      select: { id: true },
    });
    const isNew = !existing;
    const ticketId =
      existing?.id ??
      (
        await createTicketWithNumber(prisma, {
          requesterId,
          categoryId: categoryId(t.categoryName),
          relatedSystemId: systemId(t.relatedSystemName),
          summary: t.summary,
          description: t.description,
          requestedPriority: t.requestedPriority,
          itPriority: t.itPriority,
          currentStatus: t.currentStatus,
          ownerId: t.ownerEmail ? userId(t.ownerEmail) : undefined,
          requesterResolvedAt: t.requesterResolved ? createdAt : undefined,
          createdAt,
        })
      ).id;

    // Lab 4 (C-188): a Ticket created here gets its path as status history,
    // spread evenly from creation to a day ago, by the owner (or the
    // Administrator for a Ticket nobody owned), and resolvedAt on Resolved and
    // Closed (BR-49). Re-running finds the Ticket and writes nothing.
    if (isNew) {
      const path = STATUS_PATH[t.currentStatus];
      const changer = t.ownerEmail ? userId(t.ownerEmail) : userId("panida.s@example.ac.th");
      const span = Math.max(createdAt.getTime() + 60_000, Date.now() - 24 * 60 * 60 * 1000) - createdAt.getTime();
      let from: TicketStatus = "NEW";
      let resolvedAt: Date | null = null;
      for (let i = 0; i < path.length; i += 1) {
        const at = new Date(createdAt.getTime() + (span * (i + 1)) / (path.length + 1));
        await prisma.ticketStatusChange.create({
          data: { ticketId, fromStatus: from, toStatus: path[i], changedById: changer, changedAt: at },
        });
        if (path[i] === "RESOLVED") resolvedAt = at;
        if (path[i] === "REOPENED") resolvedAt = null;
        from = path[i];
      }
      if (resolvedAt) await prisma.ticket.update({ where: { id: ticketId }, data: { resolvedAt } });
    }

    for (const c of t.publicComments ?? []) {
      const found = await prisma.publicComment.findFirst({
        where: { ticketId, body: c.body },
        select: { id: true },
      });
      if (!found) {
        await prisma.publicComment.create({
          data: { ticketId, authorId: userId(c.authorEmail), body: c.body },
        });
      }
    }
    for (const n of t.internalNotes ?? []) {
      const found = await prisma.internalNote.findFirst({
        where: { ticketId, body: n.body },
        select: { id: true },
      });
      if (!found) {
        await prisma.internalNote.create({
          data: { ticketId, authorId: userId(n.authorEmail), body: n.body },
        });
      }
    }
  }

  // Lab 4 - Actions Taken (spec 7.9), keyed by (Ticket, description).
  for (const a of SEED_ACTIONS) {
    const plan = SEED_TICKETS.find((t) => t.summary === a.ticketSummary);
    if (!plan) throw new Error(`Graded seed: action for unknown Ticket "${a.ticketSummary}".`);
    const ticket = await prisma.ticket.findFirst({
      where: { requesterId: userId(plan.requesterEmail), summary: plan.summary },
      select: { id: true, createdAt: true },
    });
    if (!ticket) continue;
    const exists = await prisma.actionTaken.findFirst({ where: { ticketId: ticket.id, description: a.description }, select: { id: true } });
    if (exists) continue;
    const by = userId(a.byEmail);
    // Never before the Ticket itself (BR-07), even on a legacy dev row.
    const at = new Date(Math.max(ticket.createdAt.getTime() + 60_000, Date.now() - a.hoursAgo * 60 * 60 * 1000));
    const finished = a.status !== "PLANNED";
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        status: a.status,
        actionAt: at,
        description: a.description,
        result: a.result ?? null,
        followUpRequired: a.followUpRequired ?? false,
        followUpNote: a.followUpNote ?? null,
        attachmentNotes: a.attachmentNotes ?? null,
        assigneeId: a.assigneeEmail ? userId(a.assigneeEmail) : by,
        createdById: by,
        createdAt: finished ? at : new Date(),
        performedById: finished ? by : null,
        finishedAt: finished ? at : null,
      },
    });
  }

  // BR-46: every seeded Ticket's activity time is its latest recorded event.
  for (const t of SEED_TICKETS) {
    const ticket = await prisma.ticket.findFirst({ where: { requesterId: userId(t.requesterEmail), summary: t.summary }, select: { id: true } });
    if (!ticket) continue;
    // Public Comments and Attachments count, as in the M2 backfill; Internal
    // Notes never do (BR-47).
    const [lastHistory, lastAction, lastComment, attachments] = await Promise.all([
      prisma.ticketStatusChange.findFirst({ where: { ticketId: ticket.id }, orderBy: { changedAt: "desc" }, select: { changedAt: true } }),
      prisma.actionTaken.findFirst({ where: { ticketId: ticket.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true, finishedAt: true } }),
      prisma.publicComment.findFirst({ where: { ticketId: ticket.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.attachment.aggregate({ where: { ticketId: ticket.id }, _max: { uploadedAt: true, removedAt: true } }),
    ]);
    const candidates = [
      lastHistory?.changedAt,
      lastAction?.finishedAt ?? lastAction?.createdAt,
      lastComment?.createdAt,
      attachments._max.uploadedAt,
      attachments._max.removedAt,
    ].filter((d): d is Date => !!d);
    if (candidates.length === 0) continue;
    const latest = new Date(Math.max(...candidates.map((d) => d.getTime())));
    await prisma.ticket.updateMany({ where: { id: ticket.id, lastActivityAt: { lt: latest } }, data: { lastActivityAt: latest } });
  }
}

export function gradedSeedSummary() {
  const byRole = (role: UserRole, isActive: boolean) =>
    SEED_USERS.filter((u) => u.role === role && u.isActive === isActive).length;
  return {
    categories: CATEGORY_NAMES.length,
    relatedSystems: RELATED_SYSTEM_NAMES.length,
    activeRequesters: byRole("REQUESTER", true),
    inactiveRequesters: byRole("REQUESTER", false),
    activeItStaff: byRole("IT_STAFF", true),
    inactiveItStaff: byRole("IT_STAFF", false),
    administrators: byRole("ADMINISTRATOR", true),
    firstLoginAccounts: 1,
    tickets: SEED_TICKETS.length,
    publicComments: SEED_TICKETS.reduce((n, t) => n + (t.publicComments?.length ?? 0), 0),
    internalNotes: SEED_TICKETS.reduce((n, t) => n + (t.internalNotes?.length ?? 0), 0),
    actions: SEED_ACTIONS.length,
  };
}
