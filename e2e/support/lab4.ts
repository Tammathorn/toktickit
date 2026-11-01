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

// Lab 4 fixture move (C-138, C-156). From #66 the status PATCH requires the
// Ticket's current `version`, so it is read from the staff GET first, as the
// screen does; the move then asserts 200, so a refused fixture step fails here
// instead of leaving the test to assert against the wrong state.
export async function moveStatus(staff: APIRequestContext, ticketId: number, currentStatus: string): Promise<void> {
  const detail = await staff.get(`/api/staff/tickets/${ticketId}`);
  expect(detail.status(), `GET staff ticket ${ticketId}`).toBe(200);
  const { version } = (await detail.json()) as { version: number };
  const res = await staff.patch(`/api/staff/tickets/${ticketId}/status`, { data: { currentStatus, version } });
  expect(res.status(), `${currentStatus} on ticket ${ticketId}`).toBe(200);
}
