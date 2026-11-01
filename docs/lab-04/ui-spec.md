# Lab 4 UI Specification - Zen Green Theme

TokTickIT - CPE 334 Individual Sprint 4.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding visual contract for Lab 4. It answers `LS 7`, `LS 8.1` to
`LS 8.6`, and Part 9's requirement for a measured visual and accessibility checklist.

`docs/lab-04/specification.md` governs, and `docs/lab-04/api-spec.md` governs the data rendered
here. Where this document disagrees with either, they win and the disagreement is a defect to
report. The product is **TokTickIT** everywhere; the mock-ups' "TikTockIT" is a typo and is not
followed (L2 C-41, X-6).

**Carried from Lab 3 unchanged** (`docs/lab-03/ui-spec.md`, cited `L3 ui x`): Bootstrap and its
`lg` / `md` bands (L3 ui 1), the colour tokens (L3 ui 2), typography and spacing (L3 ui 3),
control states including the 44 px mobile touch target (L3 ui 4), required marker and
validation placement (L3 ui 5), the Lab 3 message catalogue (L3 ui 6), button hierarchy
(L3 ui 7), the four badge families (L3 ui 8), the Public Comment / Internal Note distinction
(L3 ui 19) and the shared state components (L3 ui 20.1). **No new visual system and no new
colour token**: every Lab 4 element below is built from them.

**The three Playwright viewports** stay **1280, 834 and 390 px** (`desktop`, `tablet`,
`mobile`), one inside each band (L3 C-90).

The three places where the first draft needed a rule `specification.md` did not state are
recorded in section 17; each is now closed by a decision row (C-177, C-179, C-180).

---

## 1. Tokens in use

Exact values, from `CLAUDE.md` and L3 ui 2. Nothing else is introduced.

| Token | Value | Lab 4 use |
|---|---|---|
| `--tk-primary` | `#006B3C` | Header, primary buttons, the Actions Taken accent bar, card counts |
| `--tk-secondary` | `#0B7A46` | Links, focus ring, active tab, card hover border, "View all" |
| `--tk-pale` | `#EAF6EF` | Success panel, the Completed action badge, active-nav underline |
| `--tk-bg` | `#F5F7F6` | Page ground |
| `--tk-surface` | `#FFFFFF` | Cards, metric cards, the Actions Taken panel |
| `--tk-text` | `#1F2A24` | Body text (dark charcoal-green, not black) |
| `--tk-text-muted` | `#5A6B62` | Card labels' secondary text ("N active"), timestamps, empty copy |
| `--tk-border` | `#D8E0DB` | Card and field borders |
| `--tk-readonly-bg` | `#EDF1EE` | Read-only fields; finished action rows; disabled Resolved option |
| `--tk-danger` | `#A4262C` | Validation, destructive buttons, failure panel |
| `--tk-warning` | `#8A5A00` | The conflict panel's border and heading; the Planned badge |
| `--tk-info` | `#1F5C74` | "Requester says resolved" marker and card accent; the gate-reasons callout |
| `--tk-internal-bg`, `--tk-internal-border` | `#F3F1E7`, `#C9B98A` | Internal Notes only, unchanged |

## 2. Shell and navigation (C-144, BR-61)

L3 ui 9 unchanged except the navigation table and the landing screen:

| Role | Navigation, in order | Landing |
|---|---|---|
| Requester | `Dashboard`, `My Tickets`, `Create Ticket` | `/dashboard` |
| IT Staff | `Dashboard`, `Ticket Queue` | `/dashboard` |
| Administrator | `Dashboard`, `Ticket Queue`, `User Management` | `/dashboard` |

- Active page: 600 weight, 3 px `--tk-pale` underline and `aria-current="page"` (L3 ui 9.1),
  so never colour alone. On `/dashboard#my-actions` the Dashboard item stays current.
- The **TokTickIT** wordmark links to `/dashboard` for every role.
- The Forbidden component's link reads `Go to Dashboard` and points at `/dashboard`.
- `/`, an unknown path, and the post-login and post-password-change redirects go to
  `/dashboard`.
- **No Profile menu**, no avatar (C-144). Name, Role badge and `Log Out` stay at the right of
  the header as in Lab 3. No staff `Create Ticket` anywhere (L3 C-101, X-4).
- `/system-check` stays public and outside every navigation (L3 C-87).

## 3. Validation message catalogue - Lab 4 additions

Client and server emit these strings character for character (L3 BR-87). Each appears
directly below its control.

| Rule | Field | Message |
|---|---|---|
| BR-09 | `status` | `Choose Planned or Completed.` |
| BR-07 | `actionAt` (missing, unparseable, no offset) | `Action Date/Time is required.` |
| BR-07 | `actionAt` (before the Ticket) | `Action Date/Time cannot be before the ticket was created.` |
| BR-07, C-168 | `actionAt` (completed, later than now + 5 min) | `Enter the time the work was done. It cannot be in the future.` |
| BR-04 | `description` | `Description is required and must be 2000 characters or fewer.` |
| BR-04 | `result` (complete, completed create) | `Result is required and must be 2000 characters or fewer.` |
| BR-12 | `result` (cancel) | `Reason is required and must be 2000 characters or fewer.` |
| BR-05 | `followUpNote` (required) | `Follow-up Note is required when follow-up is needed, and must be 1000 characters or fewer.` |
| BR-05 | `followUpNote` (sent while not required) | `Remove the Follow-up Note, or tick Follow-Up Required?.` - never reachable from the screen, which clears the note (AC-09) |
| BR-06 | `attachmentNotes` | `Attachment Notes must be 500 characters or fewer.` |
| BR-18 | `assigneeId` | `Choose an active IT Staff or Administrator user.` (L3 ui 6.1, reused). The server's 422 `ASSIGNEE_NOT_ELIGIBLE` carries no `fields` key (C-191), so the screen places this message at the Assignee field from the status and code |
| BR-90, C-192 | `version` (an action edit with no editable field) | `Change at least one field before saving.` - the server's 400 `fields.version`; never reachable from the screen, whose `Save Action` stays disabled until a field differs (section 8.4) |
| BR-36 | `version` | `Refresh the page and try again.` - a client defect if ever shown |
| BR-42 | `clientRequestId` | `clientRequestId must be a UUID.` - a client defect if ever shown |
| C-175 | any field an action route does not accept | `<field> is not accepted here.` - a client defect if ever shown |
| BR-88 | `statusGroup` (query) | `statusGroup must be open and cannot be combined with currentStatus.` |
| C-143 | `requesterResolved` (query) | `requesterResolved must be true.` |

## 4. Non-field messages - Lab 4 additions

| Code | Message |
|---|---|
| `STALE_UPDATE` | `Someone else changed this first. The latest version is shown, and your changes are kept so you can apply them again.` |
| `RESOLUTION_GATE_NOT_MET` | `This ticket cannot be resolved yet.` followed by one line per reason (below) |
| `PLANNED_ACTIONS_OPEN` | `This ticket still has planned actions. Complete or cancel them before cancelling the ticket.` |
| `TICKET_RESOLVED` | `This ticket is resolved. Reopen it first to record more work.` |
| `ACTION_NOT_PLANNED` | `This action is already finished and cannot be changed. Record a new action instead.` |
| `ACTION_NOT_FOUND` | `That item does not exist.` (L3 ui 6.2's shared 404 string) |
| `FORBIDDEN_ROLE` on a dashboard | `You do not have access to that page.` (L3 ui 6.2) |

**Gate reasons** - the same lines under the disabled Resolved option (section 10.2) and in a
refusal:

| Reason | Line |
|---|---|
| `NO_COMPLETED_ACTION` | `Record at least one completed action.` |
| `PLANNED_ACTIONS_OPEN` | `Complete or cancel every planned action.` |
| `FOLLOW_UP_REQUIRED` | `The latest completed action needs follow-up. Record the follow-up work first.` |
| `NO_ACTION_SINCE_REOPEN` | `Record an action completed since the ticket was reopened.` |

## 5. Buttons, busy labels and success copy

Levels as L3 ui 7. New buttons:

| Button | Level | Busy label | Success panel (C-119 extended) |
|---|---|---|---|
| `Add Action` | Primary in the Actions Taken composer | `Adding…` | `Action added.` |
| `Save Action` | Primary in edit mode | `Saving…` | `Action saved.` |
| `Complete Action` | Primary in the complete panel | `Completing…` | `Action completed.` |
| `Cancel Action` | Destructive in the cancel panel | `Cancelling…` | `Action cancelled.` |
| `Edit`, `Complete`, `Cancel action` | Tertiary, on a planned row | - | - |
| `Refresh` | Secondary, Dashboard header | `Refreshing…` | none - the generated-at line updates |
| `Apply my changes again` | Primary, in the conflict panel | `Applying…` | the operation's own success copy |
| `Discard my changes` | Secondary, in the conflict panel | - | - |

The secondary control that closes a composer panel is labelled `Close`, never `Cancel`, so it
is never confused with `Cancel Action` (L3 ui 16.2's `Keep the ticket` rule). A disabled
button keeps its level's shape (L3 C-118). Every busy button is `disabled` and `aria-busy`, so
a second click sends nothing (BR-44).

## 6. Screen: IT Staff and Administrator Dashboard (`/dashboard`)

`LS 8.1`, FR-18, FR-19. Data: `GET /api/dashboard/staff` (`api-spec.md` 4.2).

**Header row.** `h1` `Dashboard`; below it the muted line
`Updated DD MMM YYYY HH:mm (Asia/Bangkok)` from `generatedAt`; at the right a secondary
`Refresh` button (BR-58). No "+N from yesterday" anywhere (C-142, X-5). No greeting is
required; the user's name is already in the header.

**Card grid.** One metric card per `cards[]` entry, in API order: Unassigned, Mine, New, Open,
In Progress, Waiting for Requester, Reopened, Resolved, High IT Priority, Requester says
resolved, My planned actions. Grid: 4 per row at `lg`, 3 at `md`, 2 below `md`.

Each card:

- is **one `<a>`** to its `drillDown`, white surface, 1 px `--tk-border`, restrained shadow;
  hover and focus border `--tk-secondary`, focus ring per L3 ui 4;
- shows the label (0.875 rem, 600), the count (2 rem, 600, `--tk-primary`), and a muted
  `View list` line with a chevron, so the card says it is a link without colour;
- has the accessible name `<label>: <count>. Open <destination>.`, e.g.
  `Unassigned: 4. Open the Ticket Queue filtered to unassigned tickets.`,
  `My planned actions: 2. Go to My planned actions on this page.`;
- shows `0` when the count is zero - **a zero card is not an empty state** (BR-57) - and stays
  a working link to the empty list.

The status cards carry the matching L3 ui 8.2 status badge beside the label, and the
`Requester says resolved` card the L3 ui 8.5 marker icon, so status cards read as status by
shape and text.

**Administrator user cards** (`userCounts`), a second row headed `User accounts`, only for the
Administrator: `Requesters`, `IT Staff`, `Administrators`, each a link to its `drillDown`
(`/users?role=…`), the count as above, and the muted secondary text `N active` (no link of its
own, BR-87). Accessible name: `IT Staff: 4 accounts, 3 active. Open User Management filtered
to IT Staff.`

**Panels**, below the grid: two columns at `lg` (left: My planned actions; right: Recently
updated above Urgent), one column below.

| Panel | `id` | Rows | Each row | Footer |
|---|---|---|---|---|
| `My planned actions` | `my-actions` | **every** row, no cap (BR-84) | Action Date/Time, description (2 lines, ellipsis), then the Ticket Number and status badge as a link to `/queue/:id` | the count, `N planned actions` |
| `Recently updated` | - | up to 5 | Ticket Number (link), summary, status badge, IT Priority badge, `Last updated` time | `View all` -> `viewAll` |
| `Urgent` | - | up to 5 | as above, with `Created` time | `View all` -> `viewAll` |

Lists are in the API's order - each is the first rows of its drill-down (C-161). The
`#my-actions` panel is an `h2` landmark section; arriving at the hash scrolls it into view and
moves focus to its heading (`tabindex="-1"`).

**Quick Actions** (C-144): a small card with two tertiary-styled tiles, `Search Tickets`
(`/queue`) and `My Queue` (`/queue?owner=me`), each icon **and** text. No `Create Ticket`.

## 7. Screen: Requester Dashboard (`/dashboard`)

`LS 8.2`, FR-20. Data: `GET /api/dashboard/requester` (`api-spec.md` 4.1). Same shell, header
row and card component as section 6.

- **Cards**, 4 per row at `lg`, 2 at `md` and below: `Open tickets`, `Waiting for you`,
  `Resolved - awaiting closure`, `Closed`, each a link to its `drillDown` on My Tickets.
  `Waiting for you` carries the L3 ui 8.2 Waiting badge, the one card that asks the Requester
  to act.
- **Lists**: `Recently updated` (up to 5, `View all` -> `/tickets?sort=lastActivityAt:desc`)
  and `Recently resolved` (up to 5, no `View all`; each row shows `Resolved DD MMM YYYY`). Rows
  link to `/tickets/:id`.
- **Quick Action**: `Create Ticket` (`/tickets/new`). The mock-up's "View My Tickets" tile is
  not added: My Tickets is already in the navigation (C-144).
- It never repeats the My Tickets table (`LS 8.2`).

## 8. Actions Taken on IT Staff Ticket Detail

`LS 8.3`, FR-01 to FR-09. A fifth card, placed after Ticket Operations and before Attachments,
because the work record drives the status decision beside it.

### 8.1 Distinct from comments and notes

| | Public Comments | Internal Notes | **Actions Taken** |
|---|---|---|---|
| Ground | white | warm ivory | white |
| Edge | none | 1 px ivory border all round | **4 px `--tk-primary` bar on the left** |
| Icon | speech bubble | padlock | **clipboard-check** |
| Standing label | `Visible to the Requester.` | `Not visible to the Requester.` | **`Shown to the Requester.`** (BR-21), always present, 600 weight, above the composer |
| Layout | chronological thread | chronological thread | **cards at every width** (C-195) |

Five differences, at least three of which survive greyscale (bar, icon, label).

### 8.2 The list

Heading `Actions Taken`, the standing label, then the rows in `actionAt desc, id desc` order
(BR-22). At every width each action is a card, its fields a definition list: `Status`,
`Action Date/Time`, `Description`, `Assignee`, `Result`, `Follow-up`, `Finished` (C-195).

**Action status badge** - square-cornered like a Ticket status, with an icon and text, so it
reads without colour:

| Status | Badge | Row treatment |
|---|---|---|
| `PLANNED` | `Planned`, outlined 1 px dashed `--tk-warning`, clock icon | white row; tertiary `Edit`, `Complete`, `Cancel action` when `allowedOperations` lists them (FR-09) |
| `COMPLETED` | `Completed`, `--tk-pale` fill, check icon | `--tk-readonly-bg` row; `Completed by <name>` and the finish time |
| `CANCELLED` | `Cancelled`, `--tk-readonly-bg` fill, struck-through label, x icon | `--tk-readonly-bg` row; `Cancelled by <name>`; the result shown under the label `Reason` (BR-12) |

Each row also shows `Created by <name> on DD MMM YYYY HH:mm` (the Action create date/time,
X-3) in muted text. A follow-up shows `Follow-up needed:` and the note; none shows
`No follow-up`. Attachment Notes, when present, show under `Attachment Notes`. All text is plain
text, `white-space: pre-wrap` (BR-08). An assignee whose `isActive` is false shows
`<name> (inactive)` (L3 ui 8.5). Times in Asia/Bangkok, `DD MMM YYYY HH:mm`.

**Empty:** `No actions recorded yet.` in muted text, with the composer still present.

### 8.3 Create mode - the composer

Below the list, a form headed `Record an action`:

| Control | Label | Notes |
|---|---|---|
| Radio pair | `Status` - `Planned` / `Completed` | Required; default `Completed` |
| `datetime-local` | `Action Date/Time` | Required; read as Asia/Bangkok and sent with `+07:00` (BR-07, AC-14); default the current Bangkok minute |
| Textarea | `Description` | Required; counter `n / 2000` |
| Select | `Assignee` | From `GET /api/staff/assignable-users`; default the signed-in user (BR-18) |
| Textarea | `Result` | Shown and required only when `Completed`; counter `n / 2000` |
| Checkbox | `Follow-Up Required?` | Shown only when `Completed` |
| Textarea | `Follow-up Note` | **Revealed only when the box is ticked**, then required (red asterisk); counter `n / 1000`. Unticking clears it (BR-05, AC-09) |
| Textarea | `Attachment Notes` | Optional; helper `Which file to look at, e.g. "attachment 2, the photo of the label".`; counter `n / 500` |

Primary `Add Action`. A new `clientRequestId` is minted when the composer opens and after each
success (BR-44). On success: the success panel, the form resets, and the Ticket summary and list
re-render from the returned DTO (FR-08).

**On a Resolved Ticket** the composer and every row control are not rendered; a muted line reads
`This ticket is resolved. Reopen it first to record more work.` **On a Closed or Cancelled
Ticket** likewise, with the Lab 3 closed line once below the lists (L3 C-117). The list stays
readable in both.

### 8.4 View and edit mode

`Edit` on a planned row opens the row in place (a card-within-card at every width) with
`Description`, `Action Date/Time`, `Assignee` and `Attachment Notes` pre-filled, primary
`Save Action` and secondary `Close`. Status, result and follow-up are not editable here
(BR-10). Only changed fields are sent, with the action's `version`; `Save Action` stays
disabled until at least one field differs from the stored value, because an edit with no
editable field is 400 (BR-90, C-175). An assignee who has since been deactivated shows as
`<name> (inactive)` in the select and does not block saving other fields: it is not re-checked
unless changed (BR-18, C-177).

### 8.5 Complete and Cancel

`Complete` opens a panel in the row: `Action Date/Time` (pre-filled with the stored value,
editable; C-168), `Result` (required), `Follow-Up Required?` and the revealed `Follow-up Note`.
Primary `Complete Action`. If the stored time is in the future the field shows the C-168 message
on submit, asking for the time the work was done (AC-132).

`Cancel action` opens a panel with one textarea labelled `Reason` (required, `n / 2000`) and the
helper `Cancelling is final. The action stays on the record with your reason.` Destructive
`Cancel Action`, secondary `Close`.

Neither panel offers a delete; finished rows have no controls at all (BR-14, BR-15).

### 8.6 Requester Ticket Detail - read-only

The same card and list, placed after the Ticket information card and before Attachments. Same
badges, labels and order; **no composer, no row controls**, people by name only, no email (BR-20). The standing
label reads `Recorded by IT Staff.` instead of `Shown to the Requester.`. Empty:
`No actions recorded yet.`

## 9. Status control on IT Staff Ticket Detail

### 9.1 Offers

The Lab 3 `Current Status` select (L3 ui 16.2) now lists **exactly `allowedTransitions`**
(BR-27, FR-10), plus the current status as the unselectable current value. The client holds no
copy of the matrix. On `CLOSED` and `CANCELLED` `allowedTransitions` is empty and the Lab 3
terminal presentation applies.

### 9.2 The gate

When `allowedTransitions` contains `RESOLVED` and `resolutionGate.met` is false, the `Resolved`
option is rendered **disabled** with the text `Resolved - not available yet`, and directly
beneath the select a `--tk-info` callout with an info icon:

```
Resolved is not available yet:
- Record at least one completed action.
- Complete or cancel every planned action.
```

one line per reason in the API's order (section 4). The callout is bound to the select with
`aria-describedby`, so a screen reader hears why. When `met` is true the option is enabled and
the callout absent. The server still enforces the gate; if a stale screen sends `RESOLVED` and
the API answers `RESOLUTION_GATE_NOT_MET`, the same callout renders as a conflict (section 11)
after the Ticket is re-fetched.

### 9.3 Confirmations and refusals

Resolved, Closed and Cancelled keep their L3 ui 16.2 confirmation dialogs and copy. A refusal of
`-> CANCELLED` with `PLANNED_ACTIONS_OPEN` renders the section 4 message inline in the status
group, with a link `Go to Actions Taken` to the card. `OWNER_REQUIRED` keeps its Lab 3 inline
message. Success keeps `Status changed to <Status>.`

### 9.4 Status history - both detail screens

A section headed `Status history` in the Ticket information card, oldest first (BR-23):

| Row | Text |
|---|---|
| Creation row (`fromStatus` null) | `DD MMM YYYY HH:mm - Created as New by <name>` |
| Change | `DD MMM YYYY HH:mm - <From> -> <To> by <name>`, with both status badges |

An ordered list, `<ol>`, so the order is announced. No edit or delete control (BR-15). When the
DTO's `historyComplete` is false (a legacy Ticket) a muted line above the list reads
`Status changes made before this history began were not recorded.` (BR-51, C-179). No date is
shown.

## 10. Other screens - what changes

| Screen | Change | Trace |
|---|---|---|
| My Tickets | The Current Status filter gains an `Open tickets` option first after `All statuses`, which sets `statusGroup=open` and clears `currentStatus` (they never combine, BR-88). The sort gains `Recently updated` (`lastActivityAt:desc`). The screen reads both from the URL, so the Requester cards land filtered. `Last updated` shows `lastActivityAt` | FR-17, BR-48 |
| Ticket Queue | The toolbar gains `Requester says resolved` - a select `Any` / `Only these` setting `requesterResolved=true`. The `Recently updated` / `Least recently updated` sort options send `lastActivityAt` (BR-48, C-140). `Last updated` shows `lastActivityAt` | FR-16 |
| User Management | The role filter is read from and written to the URL (`/users?role=`), so the user cards land filtered | FR-24 |
| Both Ticket Detail screens | `Last Updated` shows `lastActivityAt`; Actions Taken and Status history added (sections 8, 9) | BR-48 |
| Create Ticket, both composers | Mint `clientRequestId` on open and after success; keep every value after 400, 409, 422, 500 or a network failure (BR-63). Password fields everywhere are cleared after a failure (BR-64) | C-139, C-147 |
| Forbidden | Link `Go to Dashboard` | C-144 |
| Everything removed | Any leftover placeholder, duplicate control or obsolete text the Issue #69 audit finds; `/system-check` kept | C-149 |

## 11. The conflict presentation (`STALE_UPDATE`, C-153)

Applies to every write that sends `version`: owner, IT Priority, status, action edit, complete
and cancel.

1. The submitting control's group shows an inline panel, `role="alert"`, 1 px
   `--tk-warning` border, warning icon, heading `This changed while you were working`, and the
   section 4 `STALE_UPDATE` message.
2. The client re-fetches the Ticket immediately and re-renders every card from it, so the fresh
   values are on screen (BR-39).
3. **The user's draft is kept** in the form - the chosen status, owner or priority, or the action
   fields typed - and is not sent again automatically (BR-63).
4. Two buttons: primary `Apply my changes again` re-submits the draft with the fresh `version`;
   secondary `Discard my changes` resets the form to the fresh values. If the fresh state no
   longer offers the draft (for example the chosen status is no longer in
   `allowedTransitions`, or the action is no longer planned), `Apply my changes again` is not
   rendered and the panel adds the relevant section 4 message.

Other conflicts render in the same panel shape without the two buttons: `ALREADY_OWNED`,
`OWNER_REQUIRED`, `RESOLUTION_GATE_NOT_MET`, `PLANNED_ACTIONS_OPEN`, `TICKET_RESOLVED`,
`ACTION_NOT_PLANNED`, `TICKET_CLOSED`. Each is followed by a re-fetch.

## 12. State tables

Exact text. `-` means the state cannot occur on that screen. Loading is always a skeleton of
the shape that replaces it with `aria-busy="true"` (L3 ui 20.1).

**Messages used below:** FAIL = `Something went wrong on our side. Your work has not been lost -
please try again.` with `Retry` (L3 ui 6.2); FORB = `You do not have access to that page.` /
`Your role does not allow this. Choose a destination from the menu above.` / `Go to Dashboard`;
NF = `That item does not exist.` with a link back.

### 12.1 IT Staff / Administrator Dashboard

| State | Presentation |
|---|---|
| Loading | Skeleton cards, then one skeleton panel per list in the same two-column grid (three for IT Staff and Administrator, two for a Requester); `Refresh` disabled |
| Success | - (no write). After Refresh, the `Updated …` line changes |
| Validation | - |
| Empty | Per list: `No planned actions are assigned to you.` / `No tickets were updated in the last 7 days.` / `No High IT Priority tickets are open.` Each with the outline document icon; `View all` stays. The first is captured for real (the Administrator who owns nothing); the other two only from a mocked response (C-180) |
| Zero | The card shows `0`; still a link (BR-57) |
| No results | - |
| Forbidden | - . `/dashboard` serves each role its own dashboard, so a forbidden state cannot occur here (C-180). Role restriction is proven at the API: a Requester's `GET /api/dashboard/staff` is 403 with no metric content |
| Not found | - |
| Conflict | - |
| Failure | FAIL panel replacing the grid; `Refresh` stays |

### 12.2 Requester Dashboard

As 12.1, with Empty copy `None of your tickets changed in the last 7 days.` and
`None of your tickets were resolved in the last 7 days.`; Zero is the real case of an account
with no Tickets (nattapong.w), where all four cards show `0` and both lists show Empty.
Forbidden: `-` (C-180), as 12.1.

### 12.3 Actions Taken (staff)

| State | Presentation |
|---|---|
| Loading | Part of the Ticket Detail skeleton |
| Success | `Action added.` / `Action saved.` / `Action completed.` / `Action cancelled.` - pale panel with check icon, `aria-live="polite"` |
| Validation | Section 3 messages below each field; focus to the first invalid field |
| Empty | `No actions recorded yet.` |
| Zero | - |
| No results | - |
| Forbidden | The Lab 3 staff-detail Forbidden for a Requester URL (L3 ui 20) |
| Not found | `ACTION_NOT_FOUND`: NF inline in the row, then re-fetch |
| Conflict | Section 11: `STALE_UPDATE` with the two buttons; `ACTION_NOT_PLANNED`, `TICKET_RESOLVED`, `TICKET_CLOSED` without. `ASSIGNEE_NOT_ELIGIBLE` renders at the Assignee field (section 3) |
| Failure | FAIL in the composer or row panel; every typed value kept (BR-63) |

### 12.4 Actions Taken (Requester)

Loading, Empty (`No actions recorded yet.`) and the screen's Lab 3 Forbidden, Not found and
Failure only; there is no write.

### 12.5 Ticket workflow (IT Staff Ticket Detail)

| State | Presentation |
|---|---|
| Loading | Lab 3 skeleton |
| Success | `Status changed to <Status>.` |
| Validation | - (the select only offers valid values) |
| Empty | Status history never empty for a new Ticket; legacy shows the section 9.4 line |
| Zero | - |
| No results | - |
| Forbidden / Not found | Lab 3 |
| Conflict | Section 11; gate callout (9.2); `PLANNED_ACTIONS_OPEN` with `Go to Actions Taken`; `OWNER_REQUIRED` |
| Failure | FAIL; the chosen status kept |

### 12.6 Screens whose Lab 3 states change

| Screen | Change to its L3 ui 20 row |
|---|---|
| My Tickets | No results now also names `Open tickets` when `statusGroup=open` is the filter: `No matches` / `No tickets match "Open tickets".` / `Clear filters` |
| Ticket Queue | No results names `Requester says resolved` when that filter is set |
| Create Ticket | Failure keeps every value (already Lab 2); a replayed 200 is treated as success |
| Requester Ticket Detail | Conflict gains nothing new; Actions Taken and history are read-only |
| Owner and IT Priority controls | Conflict gains `STALE_UPDATE` (section 11) |

## 13. Responsive rules

At 1280, 834 and 390 px on every Lab 4 screen (FR-33, AC-120):

- No clipped label, no overlapping control or message, no hidden or unreachable control.
- **No horizontal page scroll**: `document.documentElement.scrollWidth <= window.innerWidth`.
- Card grids: staff 4 / 3 / 2 columns, Requester 4 / 2 / 2; the count never wraps below its
  label.
- Actions Taken: cards at every width (C-195).
- Dashboard panels: two columns at `lg`, one below.
- Touch targets at least 44 px below `md` (L3 ui 4), including card links and row actions.

## 14. Accessibility rules

L3 ui 22 carried, plus:

| Rule | Applies to |
|---|---|
| A metric card is one link whose accessible name carries label, count and destination | Every dashboard card |
| `Updated …` line is `aria-live="polite"` so Refresh is announced | Both dashboards |
| Hash navigation to `#my-actions` moves focus to its heading | Staff dashboard |
| Action status is text plus icon plus shape, never colour | Actions Taken badges |
| Disabled `Resolved` option has the reasons via `aria-describedby` | Status control |
| Conflict panel is `role="alert"`; its buttons are reachable by Tab in order | Section 11 |
| Revealed `Follow-up Note` follows the checkbox in Tab order and is announced as required | Composer and complete panel |
| Status history is an ordered list | Both detail screens |
| Every new control has a visible `<label>` | All Lab 4 forms |

## 15. Screenshot paths

Written by the Playwright specs in `e2e/lab-04/` into `artifacts/lab-04/screenshots/`, named
`<screen>-<viewport>-<state>.png`, `<viewport>` one of `desktop`, `tablet`, `mobile`. Every name
below is captured **at all three viewports**. Each Issue captures its folder with the spec it
adds; Issue #70 (Issue 9) re-runs all of them on one fresh seed and completes section 16.
Captures wait for transitions to settle. Names containing `mocked` come from a mocked response
and say so.

**`staff-dashboard/`** - Issue #67, `dashboards.spec.ts` (8 states)

```
staff-dashboard-<vp>-populated.png        IT Staff, seeded data
staff-dashboard-<vp>-administrator.png    with the three user cards
staff-dashboard-<vp>-loading.png
staff-dashboard-<vp>-zero.png             the Administrator who owns nothing: Mine 0, My planned
                                          actions 0, and its panel's real Empty state
staff-dashboard-<vp>-lists-empty-mocked.png  Recently updated and Urgent empty - the seed always
                                          holds recent and High Tickets, so this cannot be real
staff-dashboard-<vp>-my-actions.png       after following the card to #my-actions
staff-dashboard-<vp>-failure.png
staff-dashboard-<vp>-focus.png            keyboard focus on a card
```

No staff-dashboard Forbidden capture: the state cannot occur (C-180).

**`requester-dashboard/`** - Issue #68, `dashboards.spec.ts` (5 states)

```
requester-dashboard-<vp>-populated.png  only the four Requester cards - Part 5's UI role evidence (C-180)
requester-dashboard-<vp>-loading.png
requester-dashboard-<vp>-zero.png       nattapong.w: four 0 cards, both lists' real Empty state
requester-dashboard-<vp>-failure.png
requester-dashboard-<vp>-focus.png
```

Part 5's role-restriction evidence is completed by terminal output, not a screenshot: a
Requester's `GET /api/dashboard/staff` -> 403 with no metric content, saved under
`artifacts/lab-04/evidence/issue-6/` (C-180).

**`actions-taken/`** - Issue #65, `actions-taken-flow.spec.ts` (15 states)

```
actions-<vp>-list.png              one Ticket, actions by three staff users (BR-02)
actions-<vp>-empty.png
actions-<vp>-create-planned.png
actions-<vp>-create-completed.png
actions-<vp>-validation.png
actions-<vp>-follow-up-note.png    box ticked, note revealed and required
actions-<vp>-edit.png
actions-<vp>-complete.png
actions-<vp>-cancel.png
actions-<vp>-finished.png          Completed by / Cancelled by / Reason
actions-<vp>-inactive-assignee.png the 422 at the Assignee field
actions-<vp>-conflict.png          STALE_UPDATE, draft kept
actions-<vp>-success.png
actions-<vp>-terminal.png          Resolved or Closed: read-only
actions-<vp>-requester.png         Requester Ticket Detail, read-only, names only
```

**`ticket-workflow/`** - Issue #66, `ticket-resolution.spec.ts` (10 states)

```
workflow-<vp>-status-menu.png      exactly allowedTransitions
workflow-<vp>-gate-unmet.png       Resolved disabled, reasons beneath
workflow-<vp>-resolve-confirm.png
workflow-<vp>-resolved.png
workflow-<vp>-cancel-blocked.png   PLANNED_ACTIONS_OPEN
workflow-<vp>-conflict.png         STALE_UPDATE on the status control
workflow-<vp>-history.png          staff view, oldest first
workflow-<vp>-requester-history.png
workflow-<vp>-legacy-history.png   historyComplete false: a Lab 3 Ticket on the dev database (C-179)
workflow-<vp>-reopened.png
```

**`regression/`** - Issue #69, a regression spec in `e2e/lab-04/` (14 states, Part 8)

```
login-<vp>-initial.png
nav-<vp>-requester.png             Dashboard current
nav-<vp>-it-staff.png
nav-<vp>-administrator.png
my-tickets-<vp>-populated.png
my-tickets-<vp>-open-group.png     landed from the Open tickets card
create-ticket-<vp>-validation.png
requester-detail-<vp>-comments-attachments.png
queue-<vp>-populated.png
queue-<vp>-requester-resolved.png  landed from the card
staff-detail-<vp>-notes.png        comments, notes and actions in one frame
users-<vp>-role-filter.png         landed from a user card
forbidden-<vp>-requester.png       a Requester at /queue
system-check-<vp>-online.png
```

**Total: 52 states x 3 viewports = 156 screenshots**, of which one state - three files,
`staff-dashboard-<vp>-lists-empty-mocked.png` - is mocked and named so (C-180).

## 16. Visual and accessibility checklist

Measured by Issue #70 at D 1280, T 834, M 390 against the section 15 captures and recorded in
`tests.md`. A row passes only where a file proves it at every width.

**Design consistency**

- VIS-01 Only the section 1 tokens appear; no component hard-codes a hex.
- VIS-02 Every Lab 4 card uses the white surface, 1 px `--tk-border` and the Lab 3 shadow.
- VIS-03 Headings, labels and counts use the L3 ui 3 sizes; one `h1` per screen.
- VIS-04 TokTickIT is spelled correctly everywhere; no "TikTockIT", no Profile menu, no staff
  Create Ticket.
- VIS-05 Status, priority, role and action-status badges render with text, by the L3 ui 8 and
  section 8.2 shapes.

**Dashboards**

- VIS-06 Every card shows label, count and a `View list` cue; each is one link.
- VIS-07 A zero card shows `0`, not the empty component.
- VIS-08 Each list shows at most 5 rows (My planned actions excepted) and a `View all` where
  section 6/7 names one.
- VIS-09 Each card's count equals the total on the screen it opens (spot-checked per card).
- VIS-10 No "+N from yesterday" or other delta text.
- VIS-11 The Administrator's user cards show `N active` as secondary text.
- VIS-12 `Updated … (Asia/Bangkok)` is present and changes after Refresh.

**Actions Taken**

- VIS-13 Actions Taken differs from Public Comments and Internal Notes on the section 8.1 counts,
  in colour and in greyscale.
- VIS-14 `Shown to the Requester.` is always visible above the composer.
- VIS-15 Planned, Completed and Cancelled are distinguishable in greyscale (icon, border style,
  strike-through).
- VIS-16 `Completed by` / `Cancelled by` and `Reason` labels appear on finished rows.
- VIS-17 The Follow-up Note appears only when the box is ticked and carries the required marker.
- VIS-18 The Requester view has no composer and no row control, and shows no email.

**Editable and read-only fields**

- VIS-19 Finished action rows and read-only Ticket fields use `--tk-readonly-bg`; editable
  controls are white; the difference survives greyscale.
- VIS-20 The disabled Resolved option and its reasons are visible together.

**Validation placement**

- VIS-21 Every Lab 4 validation message sits directly below its own control in `--tk-danger`.
- VIS-22 Required fields show the red asterisk; the asterisk never replaces the message.
- VIS-23 The conflict panel sits in the group that caused it, with the draft still in the form.

**Keyboard focus**

- VIS-24 Every card, list link, row action, composer control and conflict button is reachable by
  Tab, in visual order.
- VIS-25 Every focused element shows the L3 ui 4 ring; none is suppressed.
- VIS-26 Following the My planned actions card moves focus to the panel heading.
- VIS-27 Every dialog traps and restores focus (the three status confirmations, unchanged).

**Clipping, overlap and overflow**

- VIS-28 No clipped label or count at any width.
- VIS-29 No overlapping control or message at any width.
- VIS-30 No horizontal page scroll at any width (`scrollWidth <= innerWidth`).
- VIS-31 Touch targets at least 44 px at 390 px.
- VIS-32 Card grids reflow to the section 13 column counts.

## 17. Rules this document needed and could not find - all closed

The first draft declared three gaps and resolved none on its own authority. Each is now closed
by a decision row, cited in place above.

| # | Where | Gap | Closed by | Answer |
|---|---|---|---|---|
| 3 | 8.4 | Saving an edit with the unchanged, since-deactivated assignee | C-177 | Accepted; the assignee is re-checked only when changed |
| 5 | 9.4, 15 | The date in the legacy history line | C-179 | No date: `historyComplete` false shows `Status changes made before this history began were not recorded.` |
| 6 | 12.1, 12.2, 15 | A Dashboard Forbidden state for Part 5 | C-180 | It cannot occur; no capture. The evidence is the API's 403 plus the Requester's own dashboard |
