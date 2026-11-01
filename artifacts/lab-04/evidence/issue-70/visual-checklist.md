# Issue #70 - visual and accessibility checklist, measured

Command: `npx playwright test e2e/lab-04` against the fresh `toktickit_evidence` database (see `README.md` here).
Measured: 2026-10-31, at 1280 (desktop), 834 (tablet) and 390 (mobile) px, in Chromium, by `e2e/lab-04/visual-checklist.spec.ts`.

Every value below is **measured in the running app** - `getBoundingClientRect`, `getComputedStyle`, the loaded stylesheet's CSSOM, real Tab key presses, the DOM of the screens - and is copied from the JSON the spec writes (`visual-measurements-<viewport>.json`, one per width, listing every page measured and every raw value). Nothing is ticked from reading CSS. A row passes only where the measurement passes at every width; the spec asserts each row, so a failing row fails the run.

Notes on method: the colour check lists every computed text, background and border colour of every visible element on the page and flags any that is not one of the 14 ui-spec 1 tokens (transitions are finished before it reads). The viewport check uses the configured width, because a mobile browser widens `window.innerWidth` to fit overflowing content. A radio group is one Tab stop (its members move with the arrow keys), and a date field's native calendar button takes a Tab stop the browser draws itself; both are accounted for, not hidden. A focus ring counts when it is the 3 px token ring, the same ring in `--tk-pale` on the dark header's links, or the white ring Bootstrap draws on the header's menu toggler. The Requester Ticket Detail screen is a Lab 2 screen; it is measured because Lab 4 adds a card to it.

## Defects the measurements found, fixed in this Issue (`client/src/theme.css`)

| Found by | What was measured | Fix |
|---|---|---|
| VIS-01 | Links drew Bootstrap blue `rgb(13,110,253)` (Bootstrap 5.3 reads `--bs-link-color-rgb`, not the `--bs-link-color` the theme set); checked boxes were Bootstrap blue | `--bs-link-color-rgb` and `--bs-link-hover-color-rgb` set to the tokens; `.form-check-input:checked` uses `--tk-primary` |
| VIS-21 | Field-error text was Bootstrap red `rgb(220,53,69)`, not `--tk-danger` `rgb(164,38,44)` | `.invalid-feedback` and `.is-invalid` borders use `--tk-danger` |
| VIS-25 | Checkboxes, radios and invalid fields focused with Bootstrap's blue or red 4 px ring; the header's links with Bootstrap's blue ring | The token ring on all of them; `--tk-pale` on the header's links (the green token ring would not show on the green header) |
| VIS-31 | At 390: dashboard Ticket links 24 px tall, `View all` 21 px, the action row buttons 41 px wide, the composer's radio and checkbox labels 24 px tall | `min-height` and `min-width` 44 px below `md` |
| VIS-28, VIS-30 | At 390 the staff dashboard's `Requester says resolved` badge ended at 413 px, 23 px past the viewport (document scrollWidth 413) | The badge may wrap inside a metric card |

The first measurement of VIS-25, VIS-30 and VIS-31 was flawed in two ways that were corrected before these results: the ring was read before its transition had ended, and the page width was read from `window.innerWidth`, which on mobile had been widened by the very overflow being looked for.

## Results

| Row | 1280 | 834 | 390 | Result |
|---|---|---|---|---|
| VIS-01 | 11 pages: 0 computed colours outside the 14 tokens | 11 pages: 0 computed colours outside the 14 tokens | 11 pages: 0 computed colours outside the 14 tokens | pass |
| VIS-01 stylesheet | theme.css loaded once; 0 rules with a hex outside :root; 0 inline hex | theme.css loaded once; 0 rules with a hex outside :root; 0 inline hex | theme.css loaded once; 0 rules with a hex outside :root; 0 inline hex | pass |
| VIS-02 dashboard cards | metric card and panel: rgb(255, 255, 255), 1px solid rgb(216, 224, 219), rgba(31, 42, 36, 0.06) 0px 1px 2px 0px | metric card and panel: rgb(255, 255, 255), 1px solid rgb(216, 224, 219), rgba(31, 42, 36, 0.06) 0px 1px 2px 0px | metric card and panel: rgb(255, 255, 255), 1px solid rgb(216, 224, 219), rgba(31, 42, 36, 0.06) 0px 1px 2px 0px | pass |
| VIS-03 dashboard type scale | h1 28px/600, h2 20px, label 14px, count 32px/600 | h1 28px/600, h2 20px, label 14px, count 32px/600 | h1 28px/600, h2 20px, label 14px, count 32px/600 | pass |
| VIS-03 one h1 | 11 pages, h1 count 1 | 11 pages, h1 count 1 | 11 pages, h1 count 1 | pass |
| VIS-04 | 11 pages: brand "TokTickIT", TikTockIT 0, Profile 0, Create Ticket offered to staff 0 | 11 pages: brand "TokTickIT", TikTockIT 0, Profile 0, Create Ticket offered to staff 0 | 11 pages: brand "TokTickIT", TikTockIT 0, Profile 0, Create Ticket offered to staff 0 | pass |
| VIS-05 | 177 badges, kinds role/status/other/priority/action-status, empty text 0, 17 distinct labels | 177 badges, kinds role/status/other/priority/action-status, empty text 0, 15 distinct labels | 186 badges, kinds status/other/priority/role/action-status, empty text 0, 16 distinct labels | pass |
| VIS-06 | 11 cards, each one <a> with label, number, "View list" cue and no nested link | 11 cards, each one <a> with label, number, "View list" cue and no nested link | 11 cards, each one <a> with label, number, "View list" cue and no nested link | pass |
| VIS-07 | 4 cards read "0", links, no empty component inside | 4 cards read "0", links, no empty component inside | 4 cards read "0", links, no empty component inside | pass |
| VIS-08 requester | Recently updated 5 + View all; Recently resolved 1 | Recently updated 5 + View all; Recently resolved 1 | Recently updated 5 + View all; Recently resolved 1 | pass |
| VIS-08 staff | My planned actions 7; Recently updated 5 + View all; Urgent 5 + View all | My planned actions 17; Recently updated 5 + View all; Urgent 5 + View all | My planned actions 27; Recently updated 5 + View all; Urgent 5 + View all | pass |
| VIS-10 | 4 dashboards, delta text found: 0 | 4 dashboards, delta text found: 0 | 4 dashboards, delta text found: 0 | pass |
| VIS-11 | Requesters 6 (5 active); IT Staff 4 (3 active); Administrators 2 (1 active) | Requesters 6 (5 active); IT Staff 4 (3 active); Administrators 3 (1 active) | Requesters 6 (5 active); IT Staff 4 (3 active); Administrators 4 (1 active) | pass |
| VIS-12 | "Updated 31 Oct 2026 21:09 (Asia/Bangkok)" -> "Updated 31 Oct 2026 21:24 (Asia/Bangkok)", aria-live=polite | "Updated 31 Oct 2026 21:10 (Asia/Bangkok)" -> "Updated 31 Oct 2026 21:25 (Asia/Bangkok)", aria-live=polite | "Updated 31 Oct 2026 21:10 (Asia/Bangkok)" -> "Updated 31 Oct 2026 21:25 (Asia/Bangkok)", aria-live=polite | pass |
| VIS-13 | bar 4px solid rgb(0, 107, 60) vs 1px solid rgb(216, 224, 219); icon clipboard vs none; label "Shown to the Requester." (weight 600); ground notes rgb(243, 241, 231); bar greyscale luminance 0.108 vs 0.730 | bar 4px solid rgb(0, 107, 60) vs 1px solid rgb(216, 224, 219); icon clipboard vs none; label "Shown to the Requester." (weight 600); ground notes rgb(243, 241, 231); bar greyscale luminance 0.108 vs 0.730 | bar 4px solid rgb(0, 107, 60) vs 1px solid rgb(216, 224, 219); icon clipboard vs none; label "Shown to the Requester." (weight 600); ground notes rgb(243, 241, 231); bar greyscale luminance 0.108 vs 0.730 | pass |
| VIS-14 | label top 732px above composer top 1399px, weight 600 | label top 1320px above composer top 2343px, weight 600 | label top 1719px above composer top 2831px, weight 600 | pass |
| VIS-15 | borders dashed/solid/solid; icons distinct; cancelled line-through | borders dashed/solid/solid; icons distinct; cancelled line-through | borders dashed/solid/solid; icons distinct; cancelled line-through | pass |
| VIS-16 | cancelled: Cancelled by Panida Srisawat, Reason label; completed: Completed by Decha Intharat, Result label | cancelled: Cancelled by Panida Srisawat, Reason label; completed: Completed by Decha Intharat, Result label | cancelled: Cancelled by Panida Srisawat, Reason label; completed: Completed by Decha Intharat, Result label | pass |
| VIS-17 | note count before tick 0, after untick 0; marker "*" rgb(164, 38, 44), aria-hidden true | note count before tick 0, after untick 0; marker "*" rgb(164, 38, 44), aria-hidden true | note count before tick 0, after untick 0; marker "*" rgb(164, 38, 44), aria-hidden true | pass |
| VIS-18 | 3 rows, 0 controls, composer heading false, label "Recorded by IT Staff.", @ in page false | 3 rows, 0 controls, composer heading false, label "Recorded by IT Staff.", @ in page false | 3 rows, 0 controls, composer heading false, label "Recorded by IT Staff.", @ in page false | pass |
| VIS-19 | finished row rgb(237, 241, 238), read-only field rgb(237, 241, 238), editable rgb(255, 255, 255); luminance 0.871 vs white 1.000 | finished row rgb(237, 241, 238), read-only field rgb(237, 241, 238), editable rgb(255, 255, 255); luminance 0.871 vs white 1.000 | finished row rgb(237, 241, 238), read-only field rgb(237, 241, 238), editable rgb(255, 255, 255); luminance 0.871 vs white 1.000 | pass |
| VIS-20 | "Resolved - not available yet" disabled=true; 2 reasons shown 8px below; aria-describedby=gate-callout | "Resolved - not available yet" disabled=true; 2 reasons shown 8px below; aria-describedby=gate-callout | "Resolved - not available yet" disabled=true; 2 reasons shown 8px below; aria-describedby=gate-callout | pass |
| VIS-21 | 3 messages, rgb(164, 38, 44), 28-28px below the control (counter between), aligned to the control's left edge | 3 messages, rgb(164, 38, 44), 28-28px below the control (counter between), aligned to the control's left edge | 3 messages, rgb(164, 38, 44), 28-28px below the control (counter between), aligned to the control's left edge | pass |
| VIS-22 | 3 required fields keep the asterisk (rgb(164, 38, 44)) beside the message | 3 required fields keep the asterisk (rgb(164, 38, 44)) beside the message | 3 required fields keep the asterisk (rgb(164, 38, 44)) beside the message | pass |
| VIS-23 action | panel inside "Edit action", draft kept ("VIS planned: order the part ..."), buttons Apply my changes again / Discard my changes | panel inside "Edit action", draft kept ("VIS planned: order the part ..."), buttons Apply my changes again / Discard my changes | panel inside "Edit action", draft kept ("VIS planned: order the part ..."), buttons Apply my changes again / Discard my changes | pass |
| VIS-23 status | panel inside "Current Status controls", chosen status IN_PROGRESS kept, buttons Apply my changes again / Discard my changes | panel inside "Current Status controls", chosen status IN_PROGRESS kept, buttons Apply my changes again / Discard my changes | panel inside "Current Status controls", chosen status IN_PROGRESS kept, buttons Apply my changes again / Discard my changes | pass |
| VIS-24 conflict buttons | 40 Tab stops with the conflict panel open; unreached 0; out of order 0 | 40 Tab stops with the conflict panel open; unreached 0; out of order 0 | 38 Tab stops with the conflict panel open; unreached 0; out of order 0 | pass |
| VIS-24 dashboard | 37 Tab stops; unreached 0; out of visual order 0 | 47 Tab stops; unreached 0; out of visual order 0 | 55 Tab stops; unreached 0; out of visual order 0 | pass |
| VIS-24 requester dashboard | 18 Tab stops; unreached 0; out of order 0 | 18 Tab stops; unreached 0; out of order 0 | 15 Tab stops; unreached 0; out of order 0 | pass |
| VIS-24 staff detail | 30 Tab stops; unreached 0; out of order 0 | 30 Tab stops; unreached 0; out of order 0 | 28 Tab stops; unreached 0; out of order 0 | pass |
| VIS-25 dashboard | 37 focused elements, without a ring: 0 | 47 focused elements, without a ring: 0 | 55 focused elements, without a ring: 0 | pass |
| VIS-25 requester dashboard | 18 focused, without a ring: 0 | 18 focused, without a ring: 0 | 15 focused, without a ring: 0 | pass |
| VIS-25 requester detail | 9 focused, without a ring: 0 | 9 focused, without a ring: 0 | 6 focused, without a ring: 0 | pass |
| VIS-25 staff detail | 30 focused, without a ring: 0 | 30 focused, without a ring: 0 | 28 focused, without a ring: 0 | pass |
| VIS-26 | focus on #my-actions-title, URL hash #my-actions | focus on #my-actions-title, URL hash #my-actions | focus on #my-actions-title, URL hash #my-actions | pass |
| VIS-27 | Resolve this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Close this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Cancel this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true | Resolve this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Close this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Cancel this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true | Resolve this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Close this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true; Cancel this ticket: focus inside true, 9 Tab/Shift+Tab stay inside true, Escape closes, focus restored true | pass |
| VIS-28 count never wraps | every count box under 48 px tall (one line) | every count box under 48 px tall (one line) | every count box under 48 px tall (one line) | pass |
| VIS-28 no clipped label or count | 11 pages, clipped or off-screen text: 0 | 11 pages, clipped or off-screen text: 0 | 11 pages, clipped or off-screen text: 0 | pass |
| VIS-29 no overlap | 11 pages, overlapping control/message pairs: 0 | 11 pages, overlapping control/message pairs: 0 | 11 pages, overlapping control/message pairs: 0 | pass |
| VIS-30 no horizontal scroll | 11 pages, scrollWidth 1280 vs viewport 1280 | 11 pages, scrollWidth 834 vs viewport 834 | 11 pages, scrollWidth 390 vs viewport 390 | pass |
| VIS-31 | information only: 189 of 252 controls under 44 px (the rule applies below md) | information only: 199 of 262 controls under 44 px (the rule applies below md) | 245 controls on 11 pages, below 44 px: 0 | pass |
| VIS-32 requester grid | 4 cards per row | 2 cards per row | 2 cards per row | pass |
| VIS-32 staff grid | 4 cards per row | 3 cards per row | 2 cards per row | pass |
| VIS-32 user cards | 1 row(s) of user cards | 1 row(s) of user cards | 2 row(s) of user cards | pass |

VIS-09 (each card's count equals the total of the list it opens) is measured by E2E-23 and E2E-24 in the browser at every width, every card of four accounts clicked. desktop: it-staff 10 cards, mismatches 0; administrator 13 cards, mismatches 0; requester-a 4 cards, mismatches 0; requester-c 4 cards, mismatches 0 | tablet: it-staff 10 cards, mismatches 0; administrator 13 cards, mismatches 0; requester-a 4 cards, mismatches 0; requester-c 4 cards, mismatches 0 | mobile: it-staff 10 cards, mismatches 0; administrator 13 cards, mismatches 0; requester-a 4 cards, mismatches 0; requester-c 4 cards, mismatches 0. The raw (card, link, count, list total) pairs are in `card-vs-list-<account>-<viewport>.json`. A pair that disagrees on the first read is re-read up to twice (another test may create a Ticket between the two reads); the test fails if it never agrees.

VIS-12: the Refresh request is the real one; the `Updated` line shows minutes, and a refresh within the same minute would not change it, so the refresh response's `generatedAt` is shifted by 15 minutes (the time E2E-25 advances the clock) before the page reads it. What is measured is that the screen re-renders the line from the new response, in `aria-live="polite"`; the server's own timestamp is not what changed. Counts such as planned actions or Administrators differ between the three widths because the three projects run in parallel on one database and each creates its own rows; each width's numbers are consistent with its own lists (VIS-09).

## Verdict per VIS row

| Row | Verdict | Where it is shown |
|---|---|---|
| VIS-01 | pass | all screenshots |
| VIS-02 | pass | staff-dashboard/*-populated.png |
| VIS-03 | pass | all screenshots |
| VIS-04 | pass | all screenshots |
| VIS-05 | pass | staff-dashboard/*-populated.png, actions-taken/*-list.png |
| VIS-06 | pass | staff-dashboard/*-populated.png |
| VIS-07 | pass | requester-dashboard/*-zero.png |
| VIS-08 | pass | staff-dashboard/*-populated.png, requester-dashboard/*-populated.png |
| VIS-09 | pass | E2E-23 and E2E-24 JSON |
| VIS-10 | pass | staff-dashboard/*-populated.png |
| VIS-11 | pass | staff-dashboard/*-administrator.png |
| VIS-12 | pass | staff-dashboard/*-populated.png |
| VIS-13 | pass | actions-taken/*-list.png, regression/staff-detail-*-notes.png |
| VIS-14 | pass | actions-taken/*-list.png |
| VIS-15 | pass | actions-taken/*-finished.png |
| VIS-16 | pass | actions-taken/*-finished.png |
| VIS-17 | pass | actions-taken/*-follow-up-note.png |
| VIS-18 | pass | actions-taken/*-requester.png |
| VIS-19 | pass | actions-taken/*-finished.png |
| VIS-20 | pass | ticket-workflow/*-gate-unmet.png |
| VIS-21 | pass | actions-taken/*-validation.png |
| VIS-22 | pass | actions-taken/*-validation.png |
| VIS-23 | pass | actions-taken/*-conflict.png, ticket-workflow/*-conflict.png |
| VIS-24 | pass | staff-dashboard/*-focus.png, requester-dashboard/*-focus.png |
| VIS-25 | pass | staff-dashboard/*-focus.png |
| VIS-26 | pass | staff-dashboard/*-my-actions.png |
| VIS-27 | pass | ticket-workflow/*-resolve-confirm.png |
| VIS-28 | pass | all screenshots |
| VIS-29 | pass | all screenshots |
| VIS-30 | pass | all screenshots |
| VIS-31 | pass | the mobile screenshots |
| VIS-32 | pass | staff-dashboard/*-populated.png, requester-dashboard/*-populated.png |
