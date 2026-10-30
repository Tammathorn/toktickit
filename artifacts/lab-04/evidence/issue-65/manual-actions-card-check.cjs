// Task 002 step 5 - hand-equivalent check of the Actions Taken card on the real
// running app (dev database). Not a committed test. Fails on any console error,
// page error or same-origin 5xx.
const { chromium, request } = require("@playwright/test");

const CLIENT = "http://localhost:5173";
const API = "http://localhost:3000";
const E2E_REQUESTER = { email: "siriporn.c@example.ac.th", password: "Requester#2026" };

(async () => {
  const problems = [];
  const log = (m) => console.log(m);

  const req = await request.newContext({ baseURL: API });
  if ((await req.post("/api/auth/login", { data: E2E_REQUESTER })).status() !== 200) throw new Error("requester login");
  const cats = await (await req.get("/api/categories")).json();
  const sys = await (await req.get("/api/related-systems")).json();
  const created = await req.post("/api/tickets", {
    data: { categoryId: cats[0].id, relatedSystemId: sys[0].id, summary: "Task 002 step 5: Actions Taken check", description: "Created by the task 002 hand-equivalent check.", requestedPriority: "MEDIUM" },
  });
  const ticket = await created.json();
  log(`ticket ${ticket.id} ${ticket.ticketNumber} (${created.status()})`);

  const browser = await chromium.launch();
  const watch = (page, who) => {
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${who} console.error: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${who} pageerror: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 500 && r.url().startsWith(CLIENT)) problems.push(`${who} ${r.status()} ${r.url()}`); });
  };

  const staffCtx = await browser.newContext({ storageState: "e2e/.auth/it-staff.json", baseURL: CLIENT });
  const page = await staffCtx.newPage();
  watch(page, "staff");
  await page.goto(`/queue/${ticket.id}`);
  const card = page.getByRole("region", { name: "Actions Taken" });
  await card.getByText("No actions recorded yet.").waitFor();
  log("staff: empty card shown");

  async function addPlanned(desc) {
    await card.getByLabel("Planned").check();
    await card.getByLabel(/^Description/).fill(desc);
    await card.getByRole("button", { name: "Add Action" }).click();
    await page.getByText("Action added.").first().waitFor();
  }

  // 1. create planned
  await addPlanned("Replace the toner cartridge.");
  const rows = card.locator("li.tk-action-row");
  if ((await rows.count()) !== 1) throw new Error("expected one row");
  await rows.nth(0).getByText("Planned").first().waitFor();
  log("1 create planned: ok");

  // 2. edit
  await rows.nth(0).getByRole("button", { name: "Edit" }).click();
  const edit = rows.nth(0).getByRole("group", { name: "Edit action" });
  await edit.getByLabel(/^Description/).fill("Replace the toner cartridge and clean the drum.");
  await edit.getByRole("button", { name: "Save Action" }).click();
  await page.getByText("Action saved.").first().waitFor();
  await rows.nth(0).getByText("Replace the toner cartridge and clean the drum.").waitFor();
  log("2 edit: ok");

  // 3. complete
  await rows.nth(0).getByRole("button", { name: "Complete" }).click();
  const comp = rows.nth(0).getByRole("group", { name: "Complete action" });
  await comp.getByLabel(/^Result/).fill("Printed a test page; output is clean.");
  await comp.getByRole("button", { name: "Complete Action" }).click();
  await page.getByText("Action completed.").first().waitFor();
  await rows.nth(0).getByText("Completed", { exact: true }).first().waitFor();
  log("3 complete: ok");

  // 4. cancel (a second planned action)
  await addPlanned("Order a spare drum unit.");
  const second = card.locator("li.tk-action-row-planned");
  await second.getByRole("button", { name: "Cancel action" }).click();
  const canc = second.getByRole("group", { name: "Cancel action" });
  await canc.getByLabel(/^Reason/).fill("Not needed; the drum cleaned up.");
  await canc.getByRole("button", { name: "Cancel Action" }).click();
  await page.getByText("Action cancelled.").first().waitFor();
  if ((await card.locator("li.tk-action-row-cancelled").count()) !== 1) throw new Error("expected a cancelled row");
  if ((await card.locator("li.tk-action-row-completed").count()) !== 1) throw new Error("expected a completed row");
  log("4 cancel: ok");

  // Requester view of the same Ticket: read-only card, both rows, no controls.
  const reqCtx = await browser.newContext({ baseURL: CLIENT });
  const rpage = await reqCtx.newPage();
  // Watched from sign-in on: the signed-out session probe before it answers 401 by design (C-149).
  await rpage.goto("/");
  await rpage.getByLabel(/Email Address/).fill(E2E_REQUESTER.email);
  await rpage.getByLabel(/^Password/).fill(E2E_REQUESTER.password);
  await rpage.getByRole("button", { name: "Sign In" }).click();
  await rpage.waitForURL((u) => !u.pathname.endsWith("/login") && u.pathname !== "/");
  watch(rpage, "requester");
  await rpage.goto(`/tickets/${ticket.id}`);
  const rcard = rpage.getByRole("region", { name: "Actions Taken" });
  await rcard.getByText("Recorded by IT Staff.").waitFor();
  const rrows = await rcard.locator("li.tk-action-row").count();
  const rbuttons = await rcard.getByRole("button").count();
  log(`requester: ${rrows} rows, ${rbuttons} buttons in the card`);
  if (rrows !== 2 || rbuttons !== 0) throw new Error("requester card not read-only with 2 rows");

  await browser.close();
  await req.dispose();
  log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "console: no error, no pageerror, no 5xx");
  process.exit(problems.length ? 1 : 0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
