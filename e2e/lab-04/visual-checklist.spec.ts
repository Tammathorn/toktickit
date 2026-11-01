import fs from "node:fs";
import path from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { test, expect } from "../support/console";
import { ADMINISTRATOR, E2E_REQUESTER, IT_STAFF, REQUESTER_A, REQUESTER_C, STATE, apiAs, signIn } from "../support/auth";
import { SIGNED_OUT, addAction, claim, gotoRequesterDetail, gotoStaffDetail, newTicket, staffTicket, userIdByEmail, vp, type TicketRef } from "../support/lab4-shots";
import { moveStatus } from "../support/lab4";

// Issue #70, step 4 - the ui-spec 16 checklist (VIS-01 to VIS-32), MEASURED in the
// running app at 1280 (desktop), 834 (tablet) and 390 (mobile). Nothing here is
// read from the CSS source: every value comes from getBoundingClientRect,
// getComputedStyle, the CSSOM of the loaded stylesheet, the keyboard (real Tab
// presses) or the DOM of a real screen. The values are written, per viewport, to
// artifacts/lab-04/evidence/issue-70/visual-measurements-<vp>.json, and the
// verdict of each row is asserted (soft), so a defect fails the run.

const OUT = path.resolve(__dirname, "../../artifacts/lab-04/evidence/issue-70");

const TOKENS: Record<string, [number, number, number]> = {
  "--tk-primary": [0, 107, 60],
  "--tk-secondary": [11, 122, 70],
  "--tk-pale": [234, 246, 239],
  "--tk-bg": [245, 247, 246],
  "--tk-surface": [255, 255, 255],
  "--tk-text": [31, 42, 36],
  "--tk-text-muted": [90, 107, 98],
  "--tk-border": [216, 224, 219],
  "--tk-readonly-bg": [237, 241, 238],
  "--tk-danger": [164, 38, 44],
  "--tk-warning": [138, 90, 0],
  "--tk-info": [31, 92, 116],
  "--tk-internal-bg": [243, 241, 231],
  "--tk-internal-border": [201, 185, 138],
};

type Row = { id: string; ok: boolean; values: unknown };
const rows: Row[] = [];
function row(id: string, ok: boolean, values: unknown) {
  rows.push({ id, ok, values });
  expect.soft(ok, `${id} at ${vp()}: ${JSON.stringify(values).slice(0, 1500)}`).toBe(true);
}

// ---- measurements run inside the page ------------------------------------

async function metrics(page: Page, label: string) {
  // Colours are measured once every transition (a field's border turning red, a ring fading in) has finished.
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  });
  return page.evaluate(
    ([tokens, labelText, viewportWidth]) => {
      // The configured width, not window.innerWidth: on a mobile viewport the browser widens
      // the layout viewport to fit overflowing content, which would hide the overflow.
      const width = viewportWidth as number;
      const allowed = Object.values(tokens as Record<string, number[]>);
      const inRoot = document.querySelector("#root")!;
      const visible = (el: Element) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      };
      const els = Array.from(inRoot.querySelectorAll("*")).filter(visible);
      const parse = (c: string) => {
        const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
        return m ? { rgb: [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])], a: m[4] === undefined ? 1 : +m[4] } : null;
      };
      const isToken = (rgb: number[]) => allowed.some((t) => t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2]);
      const offToken = new Map<string, string>();
      for (const el of els) {
        const cs = getComputedStyle(el);
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
        const probes: Array<[string, string]> = [["background-color", cs.backgroundColor]];
        if (hasText) probes.push(["color", cs.color]);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          if (parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none") {
            probes.push([`border-${side.toLowerCase()}-color`, cs.getPropertyValue(`border-${side.toLowerCase()}-color`)]);
          }
        }
        for (const [prop, value] of probes) {
          const c = parse(value);
          if (!c || c.a === 0) continue;
          if (!isToken(c.rgb)) {
            const key = `${c.rgb.join(",")}${c.a < 1 ? `/${c.a}` : ""}`;
            if (!offToken.has(key)) offToken.set(key, `${prop} on <${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 60)}">`);
          }
        }
      }
      // Clipped labels/counts: content wider than its own clipping box, or a box outside the viewport.
      const textEls = els.filter((el) => /^(H1|H2|H3|LABEL|BUTTON|A|SPAN|DT|DD|P|LI|LEGEND)$/.test(el.tagName) && (el.textContent ?? "").trim() !== "");
      const clipped: string[] = [];
      for (const el of textEls) {
        const cs = getComputedStyle(el as Element);
        const h = el as HTMLElement;
        const clips = cs.overflowX !== "visible" || cs.textOverflow === "ellipsis";
        if (clips && h.scrollWidth > h.clientWidth + 1 && h.clientWidth > 0 && !cs.webkitLineClamp) {
          clipped.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 40)} "${(el.textContent ?? "").trim().slice(0, 30)}" ${h.scrollWidth}>${h.clientWidth}`);
        }
        const r = h.getBoundingClientRect();
        if (r.right > width + 1 || r.left < -1) clipped.push(`offscreen ${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
      // Overlap between interactive controls and messages.
      const boxes = Array.from(inRoot.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=alert],[role=status],.invalid-feedback"))
        .filter((el) => visible(el) && (el as HTMLElement).getBoundingClientRect().width > 2 && !el.closest(".visually-hidden"))
        .map((el) => ({ el, r: (el as HTMLElement).getBoundingClientRect() }));
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (w > 2 && h > 2) overlaps.push(`${(a.el.textContent ?? a.el.getAttribute("aria-label") ?? "").trim().slice(0, 20)} x ${(b.el.textContent ?? b.el.getAttribute("aria-label") ?? "").trim().slice(0, 20)} (${Math.round(w)}x${Math.round(h)})`);
        }
      }
      // Touch targets: every enabled interactive control that is not an inline link in running text.
      const small: string[] = [];
      let controls = 0;
      for (const { el, r } of boxes) {
        if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) continue;
        const cs = getComputedStyle(el);
        if ((el as HTMLButtonElement).disabled) continue;
        const inline = el.tagName === "A" && cs.display === "inline" && !el.classList.contains("btn");
        const labelRect = el instanceof HTMLInputElement && /checkbox|radio/.test(el.type) ? (el.labels?.[0]?.getBoundingClientRect() ?? r) : r;
        controls++;
        if (Math.min(labelRect.width, labelRect.height) < 43.5) {
          small.push(`${inline ? "[inline link] " : ""}${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 28)}" ${Math.round(labelRect.width)}x${Math.round(labelRect.height)}`);
        }
      }
      const text = inRoot.textContent ?? "";
      return {
        label: labelText,
        url: location.pathname + location.search,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: width,
        reportedInnerWidth: window.innerWidth,
        h1: document.querySelectorAll("h1").length,
        offToken: Array.from(offToken.entries()).map(([k, v]) => `rgb(${k}) ${v}`),
        clipped,
        overlaps,
        controls,
        smallTargets: small,
        tikTock: /TikTockIT/i.test(text),
        profile: /\bProfile\b/.test(text),
        badges: Array.from(inRoot.querySelectorAll(".tk-badge")).filter(visible).map((b) => ({
          kind: b.className.includes("tk-action-badge") ? "action-status" : b.className.includes("role") ? "role" : /(^|\s)tk-(priority|badge-priority|it-)/.test(b.className) ? "priority" : "status/other",
          cls: b.className.replace(/\s+/g, " ").slice(0, 60),
          text: (b.textContent ?? "").trim(),
          hasIcon: !!b.querySelector("svg"),
        })),
        brand: document.querySelector(".tk-brand")?.textContent?.trim() ?? null,
        createTicketOffered: Array.from(inRoot.querySelectorAll("a,button")).some((e) => /create ticket/i.test(e.textContent ?? "")),
        delta: /from yesterday|vs\.? yesterday|since yesterday|[▲▼↑↓]\s*\d|\+\d+\s*(from|vs)/i.test(text),
      };
    },
    [TOKENS, label, test.info().project.use.viewport!.width] as const,
  );
}

async function tabWalk(page: Page, label: string, max = 140) {
  await page.evaluate(() => {
    (window as unknown as { __focused: Set<Element> }).__focused = new Set();
    document.addEventListener("focusin", (e) => (window as unknown as { __focused: Set<Element> }).__focused.add(e.target as Element), true);
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
    // Sequential focus starts where the last focus was; an empty, unfocusable-by-Tab
    // span at the top of the page puts the starting point at the top (instrumentation only).
    const start = document.createElement("span");
    start.id = "vis-tab-start";
    start.tabIndex = -1;
    document.body.prepend(start);
    start.focus();
  });
  const seq: Array<{ name: string; top: number; left: number; ring: boolean; shadow: string; outline: string; key: string }> = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (i === 0) await page.evaluate(() => document.getElementById("vis-tab-start")?.remove());
    // The ring is a transition: read it once the transition has finished.
    await page.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    });
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // The L3 ui 4 token ring; on the dark header the same 3 px ring is drawn in --tk-pale.
      const ringShadow = /rgba\(11, 122, 70, 0\.35\) 0px 0px 0px 3px|rgb\(234, 246, 239\) 0px 0px 0px 3px/.test(cs.boxShadow);
      const outlined = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      // The 3 px token ring, the pale ring on the dark header's links, and the white ring Bootstrap's
      // navbar-dark draws on its menu toggler are all visible rings. A date field's native calendar
      // button takes a Tab stop of its own inside the control and is drawn by the browser: the host
      // is not :focus there, so it is counted separately, not as a missing ring.
      const hostFocused = el.matches(":focus");
      const togglerRing = /rgba\(255, 255, 255, 0\.55\) 0px 0px 0px 4px/.test(cs.boxShadow);
      return {
        name: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40) || `${el.tagName.toLowerCase()}${el instanceof HTMLInputElement ? `[${el.type}]` : ""}#${el.id}`,
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        ring: ringShadow || outlined || togglerRing || !hostFocused,
        shadow: cs.boxShadow.slice(0, 80),
        outline: `${cs.outlineStyle} ${cs.outlineWidth}`,
        key: `${el.tagName}|${el.id}|${el.getAttribute("class") ?? ""}|${(el.textContent ?? "").slice(0, 30)}|${Math.round(r.top + window.scrollY)}|${Math.round(r.left)}`,
      };
    });
    if (!info) break;
    if (seq.length > 2 && seq[0].key === info.key) break;
    seq.push(info);
  }
  const missed = await page.evaluate(() => {
    const seen = (window as unknown as { __focused: Set<Element> }).__focused;
    const out: string[] = [];
    document.querySelectorAll("#root a[href], #root button, #root input:not([type=hidden]), #root select, #root textarea").forEach((el) => {
      const h = el as HTMLButtonElement;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (h.disabled || r.width === 0 || r.height === 0 || cs.visibility === "hidden" || el.closest(".collapse:not(.show)")) return;
      // A radio group is one Tab stop: its unchecked members are reached with the arrow keys.
      if (el instanceof HTMLInputElement && el.type === "radio" && !el.checked) return;
      if (!seen.has(el)) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}"`);
    });
    return out;
  });
  // Visual order: going up the page is allowed only when the next target is in another column.
  const backwards: string[] = [];
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].top < seq[i - 1].top - 4 && seq[i].left < seq[i - 1].left + 100) backwards.push(`${seq[i - 1].name} -> ${seq[i].name}`);
  }
  return { label, stops: seq.length, noRing: seq.filter((s) => !s.ring).map((s) => `${s.name} (${s.shadow}; ${s.outline})`), missed, backwards };
}

// A dialog's keyboard contract (VIS-27): focus lands inside, Tab and Shift+Tab stay inside, Escape closes it and focus returns to the opener.
async function dialogProof(page: Page, opener: ReturnType<Page["locator"]>, kind: string) {
  const inside = () => page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"));
  await expect(page.getByRole("dialog")).toBeVisible();
  const startInside = await inside();
  const tabs: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    tabs.push(await inside());
  }
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Shift+Tab");
    tabs.push(await inside());
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const restored = await opener.evaluate((el) => el === document.activeElement);
  return { kind, focusStartsInside: startInside, tabStaysInside: tabs.every(Boolean), tabPresses: tabs.length, escapeCloses: true, focusRestoredToOpener: restored };
}

async function openTicketFor(summary: string, opts: { owned?: boolean } = {}): Promise<TicketRef> {
  const t = await newTicket(summary);
  if (opts.owned !== false) {
    const staff = await apiAs(IT_STAFF);
    await claim(staff, t.id);
    await moveStatus(staff, t.id, "OPEN");
    await staff.dispose();
  }
  return t;
}

const grey = (rgb: number[]) => {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
};
const rgbOf = (c: string) => (/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c) ?? []).slice(1, 4).map(Number);

test.describe("Visual checklist - measured", () => {
  test.use({ storageState: SIGNED_OUT });

  test("VIS-01 to VIS-32 measured at this viewport", async ({ page, consoleGuard }) => {
    test.setTimeout(420_000);
    consoleGuard.expectStatus(409);
    const pages: Array<Awaited<ReturnType<typeof metrics>>> = [];
    const measure = async (label: string) => {
      await page.waitForLoadState("networkidle");
      pages.push(await metrics(page, label));
    };
    const mobile = vp() === "mobile";
    const columns = async (sel: string) =>
      page.evaluate((s) => new Set(Array.from(document.querySelectorAll(s)).map((e) => Math.round(e.getBoundingClientRect().left))).size, sel);

    // ---- Dashboards ------------------------------------------------------
    await signIn(page, IT_STAFF);
    await page.goto("/dashboard");
    await expect(page.locator("a.tk-metric-card").first()).toBeVisible();
    await measure("staff dashboard");
    const staffCards = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a.tk-metric-card")).map((a) => ({
        isLink: a.tagName === "A",
        linksInside: a.querySelectorAll("a").length,
        label: a.querySelector(".tk-metric-label")?.textContent?.trim() ?? "",
        count: a.querySelector(".tk-metric-count")?.textContent?.trim() ?? "",
        cue: a.querySelector(".tk-metric-more")?.textContent?.trim() ?? "",
        name: a.getAttribute("aria-label") ?? "",
      })),
    );
    row("VIS-06", staffCards.length === 11 && staffCards.every((c) => c.isLink && c.linksInside === 0 && c.label !== "" && /^\d+$/.test(c.count) && /View list/.test(c.cue) && c.name.includes(c.count)), {
      cards: staffCards.length,
      samples: staffCards.slice(0, 3),
    });
    const listCounts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("section[aria-labelledby^='list-'], #my-actions")).map((s) => ({
        title: s.querySelector("h2")?.textContent?.trim(),
        rows: s.querySelectorAll("ol > li").length,
        viewAll: !!Array.from(s.querySelectorAll("a")).find((a) => a.textContent?.trim() === "View all"),
      })),
    );
    row("VIS-08 staff", listCounts.filter((l) => l.title !== "My planned actions").every((l) => l.rows <= 5 && l.viewAll) && listCounts.length === 3, listCounts);
    const staffCols = await columns("a.tk-metric-card");
    const colsStaff = await page.evaluate(() => {
      const tops = Array.from(document.querySelectorAll("a.tk-metric-card")).map((a) => Math.round(a.getBoundingClientRect().top));
      return tops.filter((t) => t === tops[0]).length;
    });
    row("VIS-32 staff grid", colsStaff === (vp() === "desktop" ? 4 : vp() === "tablet" ? 3 : 2), { viewport: vp(), cardsInFirstRow: colsStaff, distinctLefts: staffCols });
    const countWrap = await page.evaluate(() => Array.from(document.querySelectorAll(".tk-metric-count")).every((c) => c.getBoundingClientRect().height < 48));
    row("VIS-28 count never wraps", countWrap, { countHeightsUnder48: countWrap });

    const typo = await page.evaluate(() => {
      const px = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? { size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight } : null;
      };
      return { h1: px(".tk-title"), h2: px(".tk-section-title"), label: px(".tk-metric-label"), count: px(".tk-metric-count") };
    });
    row("VIS-03 dashboard type scale", typo.h1?.size === "28px" && typo.h2?.size === "20px" && typo.label?.size === "14px" && typo.count?.size === "32px" && typo.count?.weight === "600", typo);

    const cardStyle = await page.evaluate(() => {
      const pick = (el: Element) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, shadow: cs.boxShadow };
      };
      return { metric: pick(document.querySelector("a.tk-metric-card")!), panel: pick(document.querySelector("section.tk-card")!) };
    });
    const surfaceOk = (s: { bg: string; border: string; shadow: string }) => s.bg === "rgb(255, 255, 255)" && s.border === "1px solid rgb(216, 224, 219)" && /rgba\(31, 42, 36, 0\.06\) 0px 1px 2px/.test(s.shadow);
    row("VIS-02 dashboard cards", surfaceOk(cardStyle.metric) && surfaceOk(cardStyle.panel), cardStyle);

    // Keyboard: Tab order, reachability, ring (VIS-24, VIS-25).
    const dashWalk = await tabWalk(page, "staff dashboard");
    row("VIS-24 dashboard", dashWalk.missed.length === 0 && dashWalk.backwards.length === 0 && dashWalk.stops > 15, dashWalk);
    row("VIS-25 dashboard", dashWalk.noRing.length === 0, { stops: dashWalk.stops, withoutRing: dashWalk.noRing });

    // VIS-26 My planned actions.
    const planTicket = await newTicket("VIS planned for me");
    const araya = await apiAs(IT_STAFF);
    await addAction(araya, planTicket.id, { status: "PLANNED", description: "VIS planned action" });
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /^My planned actions: [1-9]\d*\./ }).click();
    const focusAfter = await page.evaluate(() => ({ id: document.activeElement?.id, hash: location.hash }));
    row("VIS-26", focusAfter.id === "my-actions-title" && focusAfter.hash === "#my-actions", focusAfter);

    // Administrator dashboard: user cards (VIS-11) and the Updated line (VIS-12, VIS-10).
    await page.context().clearCookies();
    await signIn(page, ADMINISTRATOR);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "User accounts" })).toBeVisible();
    await measure("administrator dashboard");
    const userCards = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".tk-metric-grid-users a.tk-metric-card")).map((a) => ({
        label: a.querySelector(".tk-metric-label")?.textContent?.trim(),
        count: a.querySelector(".tk-metric-count")?.textContent?.trim(),
        secondary: a.querySelector(".tk-metric-more")?.textContent?.trim(),
        secondaryColor: getComputedStyle(a.querySelector(".tk-metric-more")!).color,
      })),
    );
    row("VIS-11", userCards.length === 3 && userCards.every((c) => /^\d+ active$/.test(c.secondary ?? "")), userCards);
    const userGridCols = await page.evaluate(() => new Set(Array.from(document.querySelectorAll(".tk-metric-grid-users a.tk-metric-card")).map((e) => Math.round(e.getBoundingClientRect().top))).size);
    row("VIS-32 user cards", userGridCols >= 1, { rowsOfUserCards: userGridCols });

    const updated = page.getByText(/^Updated /);
    const before = await updated.textContent();
    await page.route("**/api/dashboard/staff", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { generatedAt: string };
      body.generatedAt = new Date(Date.parse(body.generatedAt) + 15 * 60 * 1000).toISOString();
      await route.fulfill({ response, json: body });
    });
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(updated).not.toHaveText(before!);
    const after = await updated.textContent();
    await page.unroute("**/api/dashboard/staff");
    row("VIS-12", /^Updated \d{2} \w{3} \d{4} \d{2}:\d{2} \(Asia\/Bangkok\)$/.test(before ?? "") && after !== before, { before, afterRefresh: after, ariaLive: await updated.getAttribute("aria-live") });

    // Requester dashboards (VIS-07 zero cards, VIS-08 requester).
    await page.context().clearCookies();
    await signIn(page, REQUESTER_C);
    await page.goto("/dashboard");
    await expect(page.locator("a.tk-metric-card").first()).toBeVisible();
    await measure("requester dashboard (zero)");
    const zero = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a.tk-metric-card")).map((a) => ({
        label: a.querySelector(".tk-metric-label")?.textContent?.trim(),
        count: a.querySelector(".tk-metric-count")?.textContent?.trim(),
        emptyComponentInside: !!a.querySelector(".tk-empty, .tk-panel-empty"),
        isLink: a.tagName === "A",
        href: a.getAttribute("href"),
      })),
    );
    row("VIS-07", zero.length === 4 && zero.every((c) => c.count === "0" && !c.emptyComponentInside && c.isLink), zero);
    const reqCols = await page.evaluate(() => {
      const tops = Array.from(document.querySelectorAll("a.tk-metric-card")).map((a) => Math.round(a.getBoundingClientRect().top));
      return tops.filter((t) => t === tops[0]).length;
    });
    row("VIS-32 requester grid", reqCols === (vp() === "desktop" ? 4 : 2), { viewport: vp(), cardsInFirstRow: reqCols });

    await page.context().clearCookies();
    await signIn(page, REQUESTER_A);
    await page.goto("/dashboard");
    await expect(page.locator("a.tk-metric-card").first()).toBeVisible();
    await measure("requester dashboard");
    const reqLists = await page.evaluate(() =>
      Array.from(document.querySelectorAll("section[aria-labelledby^='list-']")).map((s) => ({
        title: s.querySelector("h2")?.textContent?.trim(),
        rows: s.querySelectorAll("ol > li").length,
        viewAll: !!Array.from(s.querySelectorAll("a")).find((a) => a.textContent?.trim() === "View all"),
      })),
    );
    row("VIS-08 requester", reqLists.every((l) => l.rows <= 5) && reqLists.find((l) => l.title === "Recently updated")?.viewAll === true, reqLists);
    const reqWalk = await tabWalk(page, "requester dashboard");
    row("VIS-24 requester dashboard", reqWalk.missed.length === 0 && reqWalk.backwards.length === 0, reqWalk);
    row("VIS-25 requester dashboard", reqWalk.noRing.length === 0, { stops: reqWalk.stops, withoutRing: reqWalk.noRing });

    // ---- Staff Ticket Detail ---------------------------------------------
    const t = await openTicketFor("VIS ticket detail");
    const staff = await apiAs(IT_STAFF);
    const admin = await apiAs(ADMINISTRATOR);
    const dechaId = await userIdByEmail(admin, "decha.i@example.ac.th");
    const decha = await apiAs({ email: "decha.i@example.ac.th", password: IT_STAFF.password });
    await addAction(staff, t.id, { status: "PLANNED", description: "VIS planned: order the part" });
    await addAction(decha, t.id, { description: "VIS completed: swapped the cable", result: "Link restored.", followUpRequired: true, followUpNote: "Re-test on Monday", assigneeId: dechaId });
    const toCancel = await addAction(admin, t.id, { status: "PLANNED", description: "VIS cancelled: visit room 12" });
    const cancelId = toCancel.actions.find((a) => a.description === "VIS cancelled: visit room 12")!;
    const cancelRes = await admin.post(`/api/actions/${cancelId.id}/cancel`, { data: { version: cancelId.version, result: "Room was moved." } });
    expect(cancelRes.status()).toBe(200);
    const requesterApi = await apiAs(E2E_REQUESTER);
    expect((await requesterApi.post(`/api/tickets/${t.id}/public-comments`, { data: { body: "VIS comment from the Requester" } })).status()).toBe(201);
    expect((await staff.post(`/api/tickets/${t.id}/internal-notes`, { data: { body: "VIS internal note for staff" } })).status()).toBe(201);
    await requesterApi.dispose();

    await page.context().clearCookies();
    await signIn(page, IT_STAFF);
    await gotoStaffDetail(page, t);
    await expect(page.locator("li.tk-action-row")).toHaveCount(3);
    await measure("staff ticket detail");

    const distinct = await page.evaluate(() => {
      const read = (el: Element | null) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          borderLeft: `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
          borderTop: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
          icon: el.querySelector("h2 svg")?.innerHTML.replace(/\s+/g, " ").slice(0, 60) ?? null,
          standing: Array.from(el.querySelectorAll("p")).find((p) => /Shown to the Requester|Visible to the Requester|Not visible to the Requester/.test(p.textContent ?? ""))?.textContent?.trim() ?? null,
          standingWeight: (() => {
            const p = Array.from(el.querySelectorAll("p")).find((q) => /Shown to the Requester|Visible to the Requester|Not visible to the Requester/.test(q.textContent ?? ""));
            return p ? getComputedStyle(p).fontWeight : null;
          })(),
        };
      };
      return { actions: read(document.querySelector("#actions-taken")), comments: read(document.querySelector("section[aria-labelledby='public-comments-title']")), notes: read(document.querySelector("section[aria-labelledby='internal-notes-title']")) };
    });
    const a = distinct.actions!, c = distinct.comments!, n = distinct.notes!;
    const cues = {
      bar: a.borderLeft !== c.borderLeft && a.borderLeft !== n.borderLeft && /^4px solid/.test(a.borderLeft),
      icon: !!a.icon && a.icon !== c.icon && a.icon !== n.icon,
      label: a.standing === "Shown to the Requester." && c.standing !== a.standing && n.standing !== a.standing,
      ground: n.bg !== a.bg,
    };
    const greyOf = { actions: grey(rgbOf(a.bg)), comments: grey(rgbOf(c.bg)), notes: grey(rgbOf(n.bg)), barActions: grey(rgbOf(a.borderLeft.split("solid ")[1] ?? "")), barComments: grey(rgbOf(c.borderLeft.split("solid ")[1] ?? "")) };
    row("VIS-13", cues.bar && cues.icon && cues.label && Math.abs(greyOf.barActions - greyOf.barComments) > 0.1, { cues, distinct, greyscaleLuminance: greyOf });

    const above = await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll("#actions-taken p")).find((p) => p.textContent?.trim() === "Shown to the Requester.")!;
      const composer = document.querySelector("#actions-taken form")!;
      return { labelTop: Math.round(label.getBoundingClientRect().top + scrollY), composerTop: Math.round(composer.getBoundingClientRect().top + scrollY), weight: getComputedStyle(label).fontWeight, visible: label.getBoundingClientRect().height > 0 };
    });
    row("VIS-14", above.visible && above.labelTop < above.composerTop && above.weight === "600", above);

    const badges = await page.evaluate(() => {
      const out: Record<string, unknown> = {};
      for (const s of ["planned", "completed", "cancelled"]) {
        const b = document.querySelector(`.tk-action-${s}`);
        if (!b) continue;
        const cs = getComputedStyle(b);
        const text = b.querySelector("span");
        out[s] = {
          text: text?.textContent,
          icon: b.querySelector("svg path")?.getAttribute("d"),
          borderStyle: cs.borderTopStyle,
          bg: cs.backgroundColor,
          strike: getComputedStyle(text!).textDecorationLine,
        };
      }
      return out as Record<string, { text: string; icon: string; borderStyle: string; bg: string; strike: string }>;
    });
    const sig = (k: string) => `${badges[k].icon}|${badges[k].borderStyle}|${badges[k].strike}`;
    row("VIS-15", Object.keys(badges).length === 3 && new Set([sig("planned"), sig("completed"), sig("cancelled")]).size === 3 && badges.planned.borderStyle === "dashed" && badges.cancelled.strike.includes("line-through"), badges);

    const finished = await page.evaluate(() =>
      Array.from(document.querySelectorAll("li.tk-action-row-completed, li.tk-action-row-cancelled")).map((li) => ({
        kind: li.className.includes("completed") ? "completed" : "cancelled",
        by: /(Completed|Cancelled) by .+/.exec(li.textContent ?? "")?.[0] ?? null,
        reasonLabel: Array.from(li.querySelectorAll("dt")).map((d) => d.textContent).includes("Reason"),
        resultLabel: Array.from(li.querySelectorAll("dt")).map((d) => d.textContent).includes("Result"),
        bg: getComputedStyle(li).backgroundColor,
      })),
    );
    row("VIS-16", finished.length === 2 && finished.every((f) => f.by !== null && (f.kind === "cancelled" ? f.reasonLabel : f.resultLabel)), finished);

    const ro = await page.evaluate(() => ({
      finishedRow: getComputedStyle(document.querySelector("li.tk-action-row-completed")!).backgroundColor,
      readonlyField: getComputedStyle(document.querySelector(".tk-readonly-value")!).backgroundColor,
      editable: ["#action-description", "#action-result", "#action-assigneeId"].map((s) => getComputedStyle(document.querySelector(s)!).backgroundColor),
    }));
    const roGrey = grey(rgbOf(ro.finishedRow));
    const whiteGrey = grey([255, 255, 255]);
    row("VIS-19", ro.finishedRow === "rgb(237, 241, 238)" && ro.readonlyField === "rgb(237, 241, 238)" && ro.editable.every((e) => e === "rgb(255, 255, 255)") && whiteGrey - roGrey > 0.05, { ...ro, luminanceReadonly: roGrey.toFixed(3), luminanceWhite: whiteGrey.toFixed(3), greyscaleDifference: (whiteGrey - roGrey).toFixed(3) });

    // VIS-17, VIS-21, VIS-22 on the composer.
    const noteBefore = await page.locator("#action-followUpNote").count();
    await page.locator("#action-followUpRequired").check();
    const noteLabel = page.locator("label[for='action-followUpNote']");
    await expect(noteLabel).toBeVisible();
    const markerBox = await page.locator("label[for='action-followUpNote'] .tk-required").evaluate((e) => ({ text: e.textContent, color: getComputedStyle(e).color, ariaHidden: e.getAttribute("aria-hidden") }));
    await page.locator("#action-followUpRequired").uncheck();
    const noteAfterUntick = await page.locator("#action-followUpNote").count();
    await page.locator("#action-followUpRequired").check();
    row("VIS-17", noteBefore === 0 && noteAfterUntick === 0 && markerBox.text === "*" && markerBox.color === "rgb(164, 38, 44)", { beforeTick: noteBefore, afterUntick: noteAfterUntick, marker: markerBox });

    await page.getByRole("button", { name: "Add Action" }).click();
    await expect(page.locator("#action-description-error")).toBeVisible();
    const validation = await page.evaluate(() => {
      const out: Array<Record<string, unknown>> = [];
      document.querySelectorAll("#actions-taken form .invalid-feedback").forEach((msg) => {
        const control = msg.previousElementSibling?.matches(".tk-counter") ? msg.previousElementSibling.previousElementSibling : msg.previousElementSibling;
        const mr = msg.getBoundingClientRect();
        const cr = control!.getBoundingClientRect();
        const label = document.querySelector(`label[for='${(control as HTMLElement).id}']`);
        out.push({
          message: msg.textContent,
          control: (control as HTMLElement).id,
          gapBelowControl: Math.round(mr.top - cr.bottom),
          startsUnderControl: Math.abs(mr.left - cr.left) < 4,
          color: getComputedStyle(msg).color,
          asteriskStillThere: !!label?.querySelector(".tk-required"),
          asteriskColor: label?.querySelector(".tk-required") ? getComputedStyle(label.querySelector(".tk-required")!).color : null,
          ariaInvalid: (control as HTMLElement).getAttribute("aria-invalid"),
        });
      });
      return out;
    });
    row("VIS-21", validation.length >= 3 && validation.every((v) => (v.gapBelowControl as number) >= 0 && (v.gapBelowControl as number) < 40 && v.startsUnderControl && v.color === "rgb(164, 38, 44)"), validation);
    row("VIS-22", validation.every((v) => v.asteriskStillThere && v.asteriskColor === "rgb(164, 38, 44)"), validation.map((v) => ({ control: v.control, asterisk: v.asteriskStillThere, asteriskColor: v.asteriskColor, messageToo: v.message })));
    await measure("staff ticket detail - validation errors shown");

    // VIS-20: the disabled Resolved option and its reasons, together.
    const gate = await page.evaluate(() => {
      const select = document.querySelector("#status-select") as HTMLSelectElement;
      const option = select.querySelector("option[value='RESOLVED']") as HTMLOptionElement;
      const callout = document.querySelector("#gate-callout") as HTMLElement;
      const sr = select.getBoundingClientRect();
      const cr = callout.getBoundingClientRect();
      return {
        optionText: option.textContent,
        optionDisabled: option.disabled,
        reasons: Array.from(callout.querySelectorAll("li")).map((l) => l.textContent),
        describedBy: select.getAttribute("aria-describedby"),
        calloutVisible: cr.height > 0,
        selectToCalloutGap: Math.round(cr.top - sr.bottom),
        fitsOneScreen: cr.bottom - sr.top < window.innerHeight,
      };
    });
    row("VIS-20", gate.optionDisabled && gate.reasons.length >= 1 && gate.calloutVisible && gate.describedBy === "gate-callout" && gate.fitsOneScreen, gate);

    // VIS-24 / VIS-25 on the full detail screen.
    const detailWalk = await tabWalk(page, "staff ticket detail", 160);
    row("VIS-24 staff detail", detailWalk.missed.length === 0 && detailWalk.backwards.length === 0 && detailWalk.stops > 20, detailWalk);
    row("VIS-25 staff detail", detailWalk.noRing.length === 0, { stops: detailWalk.stops, withoutRing: detailWalk.noRing });

    // VIS-23: the conflict panels, in the group that caused them, with the draft kept.
    await gotoStaffDetail(page, t);
    const plannedRow = page.locator("li.tk-action-row", { hasText: "VIS planned: order the part" });
    await plannedRow.getByRole("button", { name: "Edit", exact: true }).click();
    const editGroup = page.getByRole("group", { name: "Edit action" });
    await editGroup.getByLabel("Description").fill("VIS planned: order the part and the adapter");
    const live = await staffTicket(admin, t.id);
    const plannedRaw = live.actions.find((x) => x.description === "VIS planned: order the part")!;
    expect((await admin.patch(`/api/actions/${plannedRaw.id}`, { data: { version: plannedRaw.version, attachmentNotes: "VIS B changed this" } })).status()).toBe(200);
    await editGroup.getByRole("button", { name: "Save Action" }).click();
    await expect(editGroup.getByRole("alert")).toContainText("This changed while you were working");
    const actionConflict = await page.evaluate(() => {
      const panel = document.querySelector("[aria-label='Edit action'] [role=alert]") as HTMLElement;
      const group = panel.closest("[role=group]") as HTMLElement;
      const draft = (group.querySelector("textarea") as HTMLTextAreaElement).value;
      const buttons = Array.from(panel.querySelectorAll("button")).map((b) => b.textContent);
      const gr = group.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      return { insideGroup: group.getAttribute("aria-label"), panelWithinGroupBox: pr.top >= gr.top && pr.bottom <= gr.bottom, draft, buttons };
    });
    await measure("staff ticket detail - action conflict");
    const conflictWalk = await tabWalk(page, "conflict panel", 140);
    const conflictOrder = conflictWalk.noRing.length === 0 && conflictWalk.missed.length === 0;
    row("VIS-23 action", actionConflict.insideGroup === "Edit action" && actionConflict.panelWithinGroupBox && actionConflict.draft === "VIS planned: order the part and the adapter" && actionConflict.buttons.includes("Apply my changes again"), actionConflict);
    row("VIS-24 conflict buttons", conflictOrder, { missed: conflictWalk.missed, backwards: conflictWalk.backwards, stops: conflictWalk.stops });
    await page.getByRole("group", { name: "Edit action" }).getByRole("button", { name: "Discard my changes" }).click();

    await gotoStaffDetail(page, t);
    await page.locator("#status-select").selectOption("IN_PROGRESS");
    const live2 = await staffTicket(admin, t.id);
    expect((await admin.patch(`/api/staff/tickets/${t.id}/it-priority`, { data: { itPriority: "HIGH", version: live2.version } })).status()).toBe(200);
    await page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("group", { name: "Current Status controls" }).getByRole("alert")).toContainText("This changed while you were working");
    const statusConflict = await page.evaluate(() => {
      const panel = document.querySelector("[aria-label='Current Status controls'] [role=alert]");
      const group = panel?.closest("[role=group]");
      return { insideGroup: group?.getAttribute("aria-label"), chosenStatusKept: (document.querySelector("#status-select") as HTMLSelectElement).value, buttons: Array.from(panel?.querySelectorAll("button") ?? []).map((b) => b.textContent) };
    });
    await measure("staff ticket detail - status conflict");
    row("VIS-23 status", statusConflict.insideGroup === "Current Status controls" && statusConflict.chosenStatusKept === "IN_PROGRESS" && statusConflict.buttons.includes("Apply my changes again"), statusConflict);

    // VIS-27: the three status confirmations.
    const dialogs = [];
    {
      const resolveT = await openTicketFor("VIS dialog resolve");
      await addAction(staff, resolveT.id);
      await gotoStaffDetail(page, resolveT);
      await page.locator("#status-select").selectOption("RESOLVED");
      const opener = page.getByRole("group", { name: "Current Status controls" }).getByRole("button", { name: "Save Changes" });
      await opener.focus();
      await page.keyboard.press("Enter");
      dialogs.push(await dialogProof(page, opener, "Resolve this ticket"));
      const closeT = await openTicketFor("VIS dialog close");
      await addAction(staff, closeT.id);
      await moveStatus(staff, closeT.id, "RESOLVED");
      await gotoStaffDetail(page, closeT);
      await page.locator("#status-select").selectOption("CLOSED");
      await opener.focus();
      await page.keyboard.press("Enter");
      dialogs.push(await dialogProof(page, opener, "Close this ticket"));
      await gotoStaffDetail(page, t);
      await page.locator("#status-select").selectOption("CANCELLED");
      await opener.focus();
      await page.keyboard.press("Enter");
      dialogs.push(await dialogProof(page, opener, "Cancel this ticket"));
    }
    row("VIS-27", dialogs.length === 3 && dialogs.every((d) => d.focusStartsInside && d.tabStaysInside && d.escapeCloses && d.focusRestoredToOpener), dialogs);

    // ---- Requester Ticket Detail ----------------------------------------
    await page.context().clearCookies();
    await signIn(page, E2E_REQUESTER);
    await gotoRequesterDetail(page, t);
    await measure("requester ticket detail");
    const reqView = await page.evaluate(() => {
      const card = document.querySelector("section[aria-labelledby='actions-title']")!;
      return {
        rows: card.querySelectorAll("li.tk-action-row").length,
        controls: card.querySelectorAll("button, input, textarea, select, form").length,
        composerHeading: !!Array.from(document.querySelectorAll("h3")).find((h) => /Record an action/.test(h.textContent ?? "")),
        standing: card.querySelector("p.fw-semibold")?.textContent,
        emailInPage: /@/.test(document.querySelector("#root")!.innerHTML),
      };
    });
    row("VIS-18", reqView.rows === 3 && reqView.controls === 0 && !reqView.composerHeading && reqView.standing === "Recorded by IT Staff." && !reqView.emailInPage, reqView);
    const reqDetailWalk = await tabWalk(page, "requester detail", 80);
    row("VIS-25 requester detail", reqDetailWalk.noRing.length === 0, { stops: reqDetailWalk.stops, withoutRing: reqDetailWalk.noRing });

    // ---- Other Lab 4-affected screens, for the cross-cutting rows --------------
    await page.context().clearCookies();
    await signIn(page, IT_STAFF);
    await page.goto("/queue?owner=unassigned");
    await expect(page.getByRole("heading", { level: 1, name: "Ticket Queue" })).toBeVisible();
    await measure("ticket queue");
    await page.context().clearCookies();
    await signIn(page, ADMINISTRATOR);
    await page.goto("/users?role=IT_STAFF");
    await expect(page.getByRole("heading", { level: 1, name: "User Management" })).toBeVisible();
    await measure("user management");

    // ---- Cross-cutting rows from every measured page --------------------------
    row("VIS-01", pages.every((p) => p.offToken.length === 0), pages.map((p) => ({ page: p.label, offTokenColours: p.offToken })));
    const hexScan = await page.evaluate(() => {
      const hits: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        const owner = sheet.ownerNode as HTMLElement | null;
        const id = owner?.getAttribute?.("data-vite-dev-id") ?? "";
        if (!/theme\.css/.test(id)) continue;
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText !== ":root" && /#[0-9a-fA-F]{3,8}\b/.test(rule.cssText)) hits.push(rule.selectorText);
        }
      }
      const inline = Array.from(document.querySelectorAll("[style]")).filter((e) => /#[0-9a-fA-F]{3,8}\b/.test(e.getAttribute("style") ?? "")).length;
      const themeSheets = Array.from(document.styleSheets).filter((s) => /theme\.css/.test((s.ownerNode as HTMLElement | null)?.getAttribute?.("data-vite-dev-id") ?? "")).length;
      return { themeSheets, rulesWithHexOutsideRoot: hits, inlineStyleHex: inline };
    });
    row("VIS-01 stylesheet", hexScan.themeSheets === 1 && hexScan.rulesWithHexOutsideRoot.length === 0 && hexScan.inlineStyleHex === 0, hexScan);
    row("VIS-03 one h1", pages.every((p) => p.h1 === 1), pages.map((p) => ({ page: p.label, h1: p.h1 })));
    row("VIS-04", pages.every((p) => !p.tikTock && !p.profile && p.brand === "TokTickIT") && pages.filter((p) => !/^requester/.test(p.label)).every((p) => !p.createTicketOffered), pages.map((p) => ({ page: p.label, brand: p.brand, tikTock: p.tikTock, profile: p.profile, createTicketOffered: p.createTicketOffered })));
    row("VIS-10", pages.filter((p) => /dashboard/.test(p.label)).every((p) => !p.delta), pages.filter((p) => /dashboard/.test(p.label)).map((p) => ({ page: p.label, deltaText: p.delta })));
    row("VIS-28 no clipped label or count", pages.every((p) => p.clipped.length === 0), pages.map((p) => ({ page: p.label, clipped: p.clipped })));
    row("VIS-29 no overlap", pages.every((p) => p.overlaps.length === 0), pages.map((p) => ({ page: p.label, overlaps: p.overlaps })));
    row("VIS-30 no horizontal scroll", pages.every((p) => p.scrollWidth <= p.innerWidth), pages.map((p) => ({ page: p.label, scrollWidth: p.scrollWidth, innerWidth: p.innerWidth })));
    if (mobile) {
      row("VIS-31 touch targets at 390", pages.every((p) => p.smallTargets.length === 0), pages.map((p) => ({ page: p.label, controls: p.controls, below44: p.smallTargets })));
    } else {
      rows.push({ id: "VIS-31", ok: true, values: { note: "measured at 390 only; below-44 controls at this width, for information", perPage: pages.map((p) => ({ page: p.label, controls: p.controls, below44: p.smallTargets.length })) } });
    }

    // VIS-05: every badge on every measured page renders with text (and the action badges with an icon too).
    const allBadges = pages.flatMap((p) => p.badges.map((b) => ({ page: p.label, ...b })));
    const kinds = Array.from(new Set(allBadges.map((b) => b.kind)));
    row(
      "VIS-05",
      allBadges.length > 0 && allBadges.every((b) => b.text.length > 0) && allBadges.filter((b) => b.kind === "action-status").every((b) => b.hasIcon),
      { badges: allBadges.length, kinds, emptyText: allBadges.filter((b) => b.text === "").length, distinctTexts: Array.from(new Set(allBadges.map((b) => b.text))).sort() },
    );

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `visual-measurements-${vp()}.json`), JSON.stringify({ viewport: vp(), width: pages[0]?.innerWidth, measuredAt: new Date().toISOString(), rows, pages }, null, 2) + "\n");
    await araya.dispose();
    await staff.dispose();
    await admin.dispose();
    await decha.dispose();
  });
});
