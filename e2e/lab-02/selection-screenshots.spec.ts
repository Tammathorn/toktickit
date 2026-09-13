import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

// Development Requester Selection screen - screenshot evidence for LS 14 Part 6
// and the specification.md Definition of Done ("the four Selection screen
// states are captured"). Paths follow C-47 / ui-spec.md section 15: the
// create-ticket folder with a selection- prefix, one file per viewport project.
//
// Populated, dropdown and selected use the real API. Loading, empty and failure
// are produced by intercepting GET /api/requesters at the network layer, so the
// client code under test is unchanged and the states are reproducible.
//
// Requires the manual start sequence in docs/lab-02/tests.md section 5:
// the database container, the API on :3000 and the Vite client on :5173.

const SHOT_DIR = path.resolve(__dirname, "../../artifacts/lab-02/screenshots/create-ticket");
const REQUESTERS_ROUTE = "**/api/requesters";
const STORAGE_KEY = "toktickit.requesterId";

// The one inactive Requester the graded seed guarantees (LS 5.3, C-33).
const INACTIVE_NAME = "Prasit Boonmee";

function shot(page: Page, state: string) {
  const vp = test.info().project.name;
  return page.screenshot({ path: path.join(SHOT_DIR, `selection-${vp}-${state}.png`), fullPage: true });
}

test.beforeEach(async ({ page }) => {
  // Every test starts with no stored selection.
  await page.addInitScript((key) => window.localStorage.removeItem(key), STORAGE_KEY);
});

test.describe("Development Requester Selection", () => {
  test("populated: active Requesters listed, not a login screen", async ({ page }) => {
    await page.goto("/");
    const select = page.getByLabel("Development Requester");
    await expect(select).toBeVisible();
    await expect(select).toBeEnabled();
    await expect(page.getByText("This is not a login screen")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await shot(page, "populated");
  });

  test("dropdown: only active Requesters are offered", async ({ page }) => {
    await page.goto("/");
    const select = page.getByLabel("Development Requester");
    await expect(select).toBeVisible();

    const names = await select.locator("option").allTextContents();
    expect(names.length).toBeGreaterThanOrEqual(5); // placeholder + at least four active
    expect(names).not.toContain(INACTIVE_NAME);

    // A native <select> popup renders outside the page and is not captured by a
    // screenshot, so for the evidence the same control is shown as an open
    // listbox (its `size` set to the option count). Nothing else changes.
    await select.focus();
    await select.evaluate((el: HTMLSelectElement) => {
      el.size = el.options.length;
      el.style.height = "auto"; // the 2.5 rem control height would clip the list
    });
    await shot(page, "dropdown");
  });

  test("loading: spinner with select and Continue disabled", async ({ page }) => {
    await page.route(REQUESTERS_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByText("Loading Development Requesters…")).toBeVisible();
    await expect(page.getByLabel("Development Requester")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await shot(page, "loading");
  });

  test("empty: no select, explanatory message, Continue disabled", async ({ page }) => {
    await page.route(REQUESTERS_ROUTE, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.goto("/");
    await expect(
      page.getByText("No active Development Requester is available. Seed the database and reload."),
    ).toBeVisible();
    await expect(page.getByLabel("Development Requester")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await shot(page, "empty");
  });

  test("failure: safe message with Retry, nothing stored", async ({ page }) => {
    await page.route(REQUESTERS_ROUTE, (route) => route.abort("connectionrefused"));
    await page.goto("/");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(
      "Something went wrong on our side. Your work has not been lost - please try again.",
    );
    await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    await shot(page, "failure");
  });

  test("selected: the shell shows the Requester name and Change Requester", async ({ page }) => {
    await page.goto("/");
    const select = page.getByLabel("Development Requester");
    await expect(select).toBeVisible();
    const chosen = await select.locator("option").nth(1).textContent();
    await select.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continue" }).click();

    const banner = page.getByRole("banner");
    await expect(banner).toContainText(chosen ?? "");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).not.toBeNull();

    if (test.info().project.name === "mobile") {
      // The header collapses to a toggler below md; open it so the Requester
      // name and Change Requester rows are in the capture.
      await page.getByRole("button", { name: "Toggle navigation" }).click();
    }
    await expect(banner.getByRole("button", { name: "Change Requester" })).toBeVisible();
    await shot(page, "selected");

    // Change Requester returns to the Selection screen and clears the store.
    await banner.getByRole("button", { name: "Change Requester" }).click();
    await expect(page.getByLabel("Development Requester")).toBeVisible();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  });
});
