import { expect, type APIRequestContext } from "@playwright/test";

// Lab 4 fixture helper for the adapted Lab 3 specs (tests.md 4.3, C-137). The
// IT Staff Ticket Detail now offers Resolved only once the resolution gate is
// met - at least one completed action, none planned, no follow-up pending - so a
// Lab 3 flow that resolves a Ticket through the UI first records one completed
// action through the real API (POST /api/tickets/:id/actions, api-spec 3.1).
// `staff` is an IT Staff or Administrator context from apiAs().
export async function addCompletedAction(staff: APIRequestContext, ticketId: number, description = "E2E fixture: checked and fixed."): Promise<void> {
  const res = await staff.post(`/api/tickets/${ticketId}/actions`, {
    data: {
      status: "COMPLETED",
      // Now: after the Ticket's createdAt and not in the future (BR-07).
      actionAt: new Date().toISOString(),
      description,
      result: "Resolved for the E2E fixture.",
      followUpRequired: false,
    },
  });
  expect(res.status(), `completed action on ticket ${ticketId}`).toBe(201);
}
