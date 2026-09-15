# Lab 2 UI Specification - Zen Green Theme

TokTickIT - CPE 334 Individual Sprint 2.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding visual contract for Lab 2. It answers `LS 7`, `LS 8`,
`LS 8.1` to `LS 8.8`, and every bullet of `LS 17` (Appendix C).

`docs/lab-02/specification.md` governs, and `api-spec.md` governs the data this UI
renders. Where this document disagrees with either, they win and the disagreement is a
defect to report, not to resolve locally. Every visible label is taken verbatim from the
specification's section 11 glossary. The product is **TokTickIT** in every heading, title,
component name and test assertion (C-41); the "TikTockIT" spelling in the labsheet
illustration on page 9 is a typo in the image and is not followed.

This document discharges three obligations that `specification.md` Definition of Done
items point at:

1. The **validation message catalogue** (section 6), which BR-35 and AC-23 make the single
   source both client and server quote from.
2. **Hex values** for the white card surface and the charcoal-green body text
   (section 2.2), which `LS 7` gives only as descriptions.
3. **Screenshot paths** (section 15), named so `tests.md` can reference them directly.

---

## 1. Framework and breakpoints

Bootstrap is the mandated UI library, and Bootstrap's own breakpoints are used rather than
custom media queries. This is not a convenience: `LS 8.7`'s three viewport bands are
Bootstrap's `lg` and `md` boundaries exactly, so a custom query would restate a number
Bootstrap already defines and risk drifting from it.

| `LS 8.7` band | Width | Bootstrap breakpoint | Container / grid usage |
|---|---|---|---|
| Desktop | >= 992 px | `lg` | `col-lg-*`, multi-column |
| Tablet | 768 - 991 px | `md` | `col-md-*`, two columns where practical |
| Mobile | < 768 px | below `md` | bare `col-12`, everything stacks |

Rules therefore read "at `lg` and above" rather than "at 1280 px". The three Playwright
viewports (C-10) are 1280, 834 and 390 px, one inside each band, and are the widths every
screenshot and responsive assertion uses.

Theme values are declared once as CSS custom properties on `:root` and consumed through
Bootstrap's variables and utility classes. No component hard-codes a hex value; a raw hex
outside the token block is a defect the style tests look for.

---

## 2. Color tokens

### 2.1 Fixed by the labsheet and CLAUDE.md

These four are quoted values and must appear unchanged in the built CSS.

| Token | Hex | Intended use |
|---|---|---|
| `--tk-primary` | `#006B3C` | App header, primary buttons, strong emphasis, active nav underline |
| `--tk-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states |
| `--tk-pale` | `#EAF6EF` | Selected rows, success surfaces, subtle section emphasis |
| `--tk-bg` | `#F5F7F6` | Page ground |

### 2.2 Pinned here because `LS 7` gives only a description

`LS 7` describes the surface as "White with subtle border and restrained shadow" and the
text as "Dark charcoal-green, not pure black". A Definition-of-Done item cannot check a
description, so both are pinned to a value here.

| Token | Hex | Why this value |
|---|---|---|
| `--tk-surface` | `#FFFFFF` | Cards and form fields. Pure white gives the card its separation from `--tk-bg`, which is the near-white the labsheet asks for |
| `--tk-text` | `#1F2A24` | Body text. A desaturated green-black: clearly not `#000000`, and ~15:1 against `--tk-surface`, comfortably past WCAG AA |

### 2.3 Supporting tokens

Derived from the above so the palette stays one system rather than a collection.

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `--tk-text-muted` | `#5A6B62` | Helper text, table meta, timestamps | 5.3:1, AA |
| `--tk-border` | `#D8E0DB` | Field borders, card borders, table rules | Non-text |
| `--tk-readonly-bg` | `#EDF1EE` | Read-only and system-generated field shading - the "soft gray-green" of `LS 7` | Non-text |
| `--tk-danger` | `#A4262C` | Validation messages, required asterisk, destructive button | 6.9:1, AA |
| `--tk-warning` | `#8A5A00` | Amber callout for the removed-attachment notice. Never ordinary decoration (`LS 7`) | 5.4:1, AA |

Card shadow is restrained: `0 1px 2px rgba(31, 42, 36, 0.06)` with a 1 px `--tk-border`.
No component uses a heavier elevation.

---

## 3. Typography and spacing

Bootstrap's native font stack is kept; no web font is loaded, so nothing depends on a
network fetch at screenshot time.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title (`h1`) | 1.75 rem | 600 | One per screen |
| Section heading (`h2`) | 1.25 rem | 600 | Card headers, field-group headings |
| Body and controls | 1 rem / 16 px | 400 | Never below 16 px on mobile, so iOS does not zoom on focus |
| Field label | 0.875 rem | 600 | Above its control, never beside it (`LS 8.3`) |
| Helper and meta text | 0.8125 rem | 400 | `--tk-text-muted` |
| Validation message | 0.8125 rem | 500 | `--tk-danger` |
| Badge | 0.75 rem | 600 | Uppercase, letter-spacing 0.02em |

Line height is 1.5 for body, 1.25 for headings.

Spacing uses Bootstrap's scale only, in `0.25 rem` steps. Fixed values:

| Gap | Value |
|---|---|
| Label to its control | `0.25 rem` (`mb-1`) |
| Control to its validation message | `0.25 rem` |
| Field group to field group | `1 rem` (`mb-3`) |
| Card padding | `1.5 rem` desktop and tablet, `1 rem` mobile |
| Section to section | `1.5 rem` |
| Page gutter | Bootstrap container default; content max-width `1140 px`, centered |

---

## 4. Control states

All six states apply to every input, select, textarea and file control.

| State | Background | Border | Text | Other |
|---|---|---|---|---|
| **Editable** | `--tk-surface` | 1 px `--tk-border` | `--tk-text` | Height `2.5 rem`; every single-line control shares it (`LS 8.3`) |
| **Read-only** | `--tk-readonly-bg` | 1 px `--tk-border` | `--tk-text` | `readonly` attribute, not `disabled`, so the value stays selectable and reachable by screen readers |
| **Invalid** | `--tk-surface` | 1 px `--tk-danger` | `--tk-text` | `aria-invalid="true"`; message directly below (section 5) |
| **Disabled** | `--tk-readonly-bg` | 1 px `--tk-border` | `--tk-text-muted` | `disabled`; cursor `not-allowed`; cannot receive focus or be activated |
| **Focused** | unchanged | 1 px `--tk-secondary` | unchanged | 3 px outer ring `--tk-secondary` at 35% alpha, offset 1 px. Never removed - `outline: none` without a replacement ring is a defect |
| **Busy** | unchanged | unchanged | unchanged | Applies to buttons; see section 7 |

Read-only and editable must be distinguishable in a greyscale screenshot: the shading
difference between `#EDF1EE` and `#FFFFFF` carries it without relying on hue.

Description is the one multiline control. It is taller than the shared height - 5 rows,
`min-height: 7.5 rem` - and is resizable vertically only, so a drag cannot break the grid.

---

## 5. Required marker and validation placement

Per `LS 8.3`:

- A required field's label carries a red asterisk: `<span class="tk-required" aria-hidden="true">*</span>`, colored `--tk-danger`. The label's accessible name carries "required" for assistive technology, so the marker is not the only signal.
- **The asterisk never substitutes for the validation message.** A field that fails validation shows both.
- The validation message appears **directly below its own control**, inside the same field group, in `--tk-danger` at 0.8125 rem. It is never rendered only as one summary at the top of the form.
- The message is bound with `aria-describedby` and the control gets `aria-invalid="true"`.
- On a failed submit, focus moves to the first invalid control so a keyboard user is not left at the submit button.
- A form-level banner may appear **in addition** when the failure is not attributable to one field, such as an API failure. It never replaces field-level messages.

---

## 6. Validation message catalogue

This is the single source BR-35 and AC-23 refer to. Client and server both emit these
strings, character for character; neither may emit validation text absent from this table.
Each rule has exactly one message, per field where the rule applies per field.

| Rule | Field | Message |
|---|---|---|
| BR-30 | all text fields | *No message.* Trimming is silent preprocessing with no failure mode of its own. Listed so the "one message per rule" claim is complete |
| BR-31 | `summary` | `Ticket Summary is required and must be between 5 and 120 characters.` |
| BR-32 | `description` | `Description is required and must be between 20 and 5000 characters.` |
| BR-33 | `categoryId` | `Category is required.` |
| BR-33 | `relatedSystemId` | `Related System is required.` |
| BR-33 | `requestedPriority` | `Requested Priority is required.` |
| BR-34 | `categoryId` | `Select an active Category from the list.` |
| BR-34 | `relatedSystemId` | `Select an active Related System from the list.` |
| BR-34 | `requestedPriority` | `Requested Priority must be Low, Medium or High.` |
| BR-47 | `removalReason` | `A removal reason is required.` |
| api-spec 3.1 | `ticketNumber`, `createdAt`, `updatedAt`, `currentStatus`, `itPriority` | `<name> is system generated and cannot be supplied.` - one message, with the offending field name substituted. Reachable only by a request that bypasses the form, so the client never renders it; it is listed so the server emits nothing absent from this table (BR-35). Added with Issue #13 |

A single message per rule is what makes AC-23 checkable: an empty Ticket Summary and a
4-character Ticket Summary both violate BR-31 and both produce the BR-31 string, so the
test asserts one constant rather than guessing which of several variants applies.

### 6.1 Non-field messages

These are surfaced as banners or per-file notices, not beside a form control. Each maps to
an `api-spec.md` error code.

| Code | Status | Message |
|---|---|---|
| `UNSUPPORTED_FILE_TYPE` | 415 | `<filename> is not a permitted file type. Allowed types are JPG, PNG, WEBP and PDF.` |
| `FILE_TOO_LARGE` | 413 | `<filename> is larger than 5 MB.` |
| `ATTACHMENT_LIMIT_REACHED` | 422 | `This ticket already has five active attachments. Remove one before adding another.` |
| `TICKET_FORBIDDEN`, `ATTACHMENT_FORBIDDEN` | 403 | `You do not have access to that item.` |
| `REQUESTER_INACTIVE` | 403 | `That Development Requester is no longer active. Choose another.` |
| `REQUESTER_NOT_FOUND` | 404 | `That Development Requester no longer exists. Choose another.` |
| `TICKET_NOT_FOUND`, `ATTACHMENT_NOT_FOUND` | 404 | `That item does not exist.` |
| `ATTACHMENT_REMOVED` | 410 | `That attachment was removed and can no longer be downloaded.` |
| `INVALID_QUERY_PARAM` | 400 | `Some search or filter values in the address are not valid. Clear filters to return to the default list.` |
| `INTERNAL_ERROR` | 500 | `Something went wrong on our side. Your work has not been lost - please try again.` |

`INVALID_QUERY_PARAM` is reachable without a client bug: a hand-edited address with a bad
`sort`, `pageSize`, `page` or filter value produces it, and `LS 14` Part 7 screenshots My
Tickets, so a silent empty list would be a real defect. Its panel renders in the list
region with the toolbar kept, exactly as section 12.5 specifies for a failure, but it
offers **Clear filters** rather than Retry - retrying the same invalid address fails
identically, whereas clearing returns to the default list (FR-35).

Two codes in `api-spec.md` deliberately have **no** user-facing message:

- `REQUESTER_REQUIRED` (400) is raised only when `requesterId` is absent or unparseable.
  The client always supplies it from the stored selection, so this status is reachable only
  through a client defect, never through anything a Requester can do. It surfaces as the
  generic `INTERNAL_ERROR` message; a bespoke string would imply a user action that does not
  exist.
- `VALIDATION_FAILED` (400) carries no banner of its own. Its content is the per-field
  `fields` object, and those strings are the section 6 catalogue rendered beside each
  control (BR-35). A banner would duplicate them and violate `LS 8.3`, which forbids one
  mysterious error at the top standing in for field-level messages.

No message quotes a stack trace, SQL, filesystem path or database text (BR-38, AC-66).

---

## 7. Button hierarchy

| Level | Use | Fill | Text | Border |
|---|---|---|---|---|
| **Primary** | The one main action per screen: Continue, Submit Ticket, Create Ticket | `--tk-primary` | `#FFFFFF` | none |
| **Secondary** | Supporting action: Cancel, Clear filters, Back to My Tickets | `--tk-surface` | `--tk-primary` | 1 px `--tk-primary` |
| **Tertiary** | Low-emphasis inline action: Download, Preview, Change Requester | transparent | `--tk-secondary` | none; underline on hover |
| **Destructive** | Remove attachment, and the Confirm inside its dialog | `--tk-danger` | `#FFFFFF` | none |
| **Disabled** | Any level when unavailable | `--tk-readonly-bg` | `--tk-text-muted` | 1 px `--tk-border` |
| **Busy** | A primary or destructive button during a request | unchanged | unchanged | Bootstrap spinner before the label; label changes to the progressive form; `disabled` and `aria-busy="true"` |

Rules from `LS 8.3`:

- Every button has visible text. Icons may accompany text but never replace it.
- Every icon-only control - there are none in Lab 2 by default - would require both an
  `aria-label` and a tooltip.
- Disabled buttons are visually distinct and cannot be activated; the busy state is a
  disabled state with a spinner, so a second click cannot fire a second request (BR-36,
  AC-21).
- Exactly one primary button per screen.

Busy labels are fixed: `Submit Ticket` -> `Submitting…`; `Continue` -> `Loading…`;
`Remove` -> `Removing…`.

---

## 8. Badges

One badge component serves Requested Priority, IT Priority and Current Status, which is
what `LS 8.8` means by badge consistency. Every badge carries its value as text; no badge
conveys meaning by color alone (FR-48, AC-58).

| Family | Value | Fill | Text | Shape cue |
|---|---|---|---|---|
| Requested Priority | `LOW` | `--tk-pale` | `--tk-text` | pill, thin border |
| Requested Priority | `MEDIUM` | `#FFFFFF` | `--tk-primary` | pill, 1 px `--tk-primary` |
| Requested Priority | `HIGH` | `--tk-danger` | `#FFFFFF` | pill, solid |
| IT Priority | same three values | same as above | same | pill with a leading `IT` prefix in the label text |
| Current Status | `NEW` | `--tk-primary` | `#FFFFFF` | square-cornered, to differ in shape from a priority pill |
| Current Status | the other four | `--tk-readonly-bg` | `--tk-text` | square-cornered |

Displayed text is title case, never the raw enum: `MEDIUM` renders as `Medium`, `NEW` as
`New`, `IN_PROGRESS` as `In Progress`.

Priority badges are pills and status badges are square-cornered, so the two families are
distinguishable in a greyscale screenshot.

**IT Priority renders only when the value is non-null** (BR-07, C-07). `itPriority` is null
throughout Lab 2, so this badge appears on no screen in this sprint. Its rules are fixed
here because `LS 8.8` requires the three families to be consistent, and the style test
asserts its *absence* rather than its appearance.

---

## 9. Application shell and navigation

Per `LS 8`. The shell renders only once a valid Development Requester is selected
(BR-15, FR-10).

**Desktop and tablet.** A single header bar, `--tk-primary` ground, white text:

- Left: the TokTickIT wordmark, which is also the link to My Tickets.
- Centre: `My Tickets` and `Create Ticket`.
- Right: the selected Development Requester's name, and a `Change Requester` tertiary
  action rendered on the primary ground in white (FR-07, FR-08, AC-12).

**Active page indication** is threefold, so it never depends on color alone: the active
item is 600 weight, carries a 3 px underline in `--tk-pale`, and sets `aria-current="page"`.

**Mobile.** The header collapses to the wordmark plus a Bootstrap toggler. The expanded
panel lists My Tickets, Create Ticket, the Requester name and Change Requester as
full-width rows with a 44 px minimum touch target. The panel is a `<nav>` with an
`aria-label`, and focus is trapped inside it while open.

---

## 10. Screen: Development Requester Selection

Per `LS 8.1`. Centered card, `max-width: 32 rem`, on `--tk-bg`. There is no shell: this
screen precedes it.

**Elements**

1. `TokTickIT` as `h1`.
2. The explanation, always present and never collapsed (FR-05, AC-08):
   > Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.
   Rendered at body size in `--tk-text`, inside a `--tk-pale` panel. It is required content, not decoration (BR-03).
3. A labelled `<select>`, label `Development Requester`, populated from `GET /api/requesters`.
4. A primary `Continue` button.

**Four states**, matching BR-16 to BR-18 and the api-spec responses:

| State | Trigger | Presentation |
|---|---|---|
| **Loading** | request in flight | Spinner plus `Loading Development Requesters…`; select and Continue both disabled (BR-16, AC-05) |
| **Populated** | 200 with rows | Select lists active Requesters by name; Continue enabled once a value is chosen |
| **Empty** | 200 with `[]` | No select is rendered at all. Message: `No active Development Requester is available. Seed the database and reload.` Continue stays disabled (BR-17, AC-06) |
| **API failure** | 500 or network failure | `--tk-danger` bordered panel with the `INTERNAL_ERROR` message and a secondary `Retry` button. No selection is stored (BR-18, AC-07) |

When a stored selection is cleared because that Requester is missing or now inactive, this
screen additionally shows a `--tk-warning` callout: `Your previous Development Requester is
no longer available. Choose another.` (BR-13, AC-10).

---

## 11. Screen: Create Ticket

Per `LS 8.2`. One card. Field order groups system-generated values first, then
classification, then the long text, then attachments, then actions - the arrangement
`LS 8.2` suggests.

**Layout**

| Band | Grid |
|---|---|
| Desktop `lg` | Read-only row three across; Category, Related System and Requested Priority three across; Ticket Summary full width; Description full width; attachments full width |
| Tablet `md` | Read-only row two across; classification two across; Ticket Summary and Description full width |
| Mobile | Every field `col-12`, stacked |

Ticket Summary and Description are full width at every band, which is `LS 8.2`'s
requirement that they receive sufficient space.

**Fields.** Required, editable, limits and allowed values are fixed by `specification.md`
section 4.1 and are not restated here. Presentation only:

| Field | Control | State |
|---|---|---|
| Ticket Number | text | Read-only. Before creation it shows `Generated on submission` in `--tk-text-muted`; after success it shows the returned value (FR-15) |
| Ticket Date | text | Read-only, `DD MMM YYYY HH:mm` Asia/Bangkok (BR-10, AC-60) |
| Requester | text | Read-only, the selected Development Requester's name (FR-13, AC-61) |
| Category | select | Editable, required asterisk |
| Related System | select | Editable, required asterisk |
| Ticket Summary | text | Editable, required asterisk, live counter `n / 120` in muted text |
| Requested Priority | select | Editable, required asterisk, defaults to `Medium` (BR-08) |
| Description | textarea | Editable, required asterisk, 5 rows, counter `n / 5000` |
| Attachments | file, multiple | Optional; see section 13 |

**Six states**, each screenshotted (`LS 14` Part 6):

| State | Presentation |
|---|---|
| **Initial** | Reference selects populated from the API, Requested Priority preset to `Medium`, no messages, Submit enabled |
| **Loading** | Category and Related System selects disabled with `Loading…` while their requests are in flight (FR-36, AC-52) |
| **Validation failure** | Each offending field gets the section 6 message below it and a `--tk-danger` border; focus moves to the first; **no API call is made** (AC-17) |
| **Submitting** | Submit shows the spinner and `Submitting…`, disabled; every field is read-only for the duration (BR-36, AC-21) |
| **Success** | The form is replaced by a `--tk-pale` panel headed `Ticket created`, showing the Ticket Number at `h2` size, with primary `View Ticket` and secondary `Create another ticket`. Success is stated in words, not by color (FR-19, AC-59) |
| **API failure** | A `--tk-danger` banner above the actions carrying the `INTERNAL_ERROR` message. **Every entered value and the attachment selection remain in place** (BR-37, AC-22) |

---

## 12. Screen: My Tickets

Per `LS 8.4`.

### 12.1 Controls

One toolbar above the list. Every control maps to an `api-spec.md` query parameter.

| Control | Parameter | Presentation |
|---|---|---|
| Search | `search` | Text input, label `Search`, placeholder `Ticket Number or Ticket Summary`, debounced 300 ms, resets `page` to 1 |
| Category filter | `categoryId` | Select, `All categories` default |
| Related System filter | `relatedSystemId` | Select, `All related systems` default |
| Current Status filter | `currentStatus` | Select, `All statuses` default |
| Sort | `sort` | Select of the four permitted fields x two directions (BR-25) |
| Clear filters | - | Secondary button, **rendered only when a search or filter is active** (FR-35) |
| Pagination | `page`, `pageSize` | Bootstrap pagination plus a page-size select of 10, 25, 50 (BR-27) |

Sort options and their tokens, matching BR-25 exactly:

| Option label | `sort` value |
|---|---|
| Newest first | `createdAt:desc` (default) |
| Oldest first | `createdAt:asc` |
| Ticket Number, ascending | `ticketNumber:asc` |
| Ticket Number, descending | `ticketNumber:desc` |
| Ticket Summary, A to Z | `summary:asc` |
| Ticket Summary, Z to A | `summary:desc` |
| Current Status, A to Z | `currentStatus:asc` |
| Current Status, Z to A | `currentStatus:desc` |

Pagination shows `Showing X to Y of N tickets`, read from `meta.total` and `meta.page`.
Previous is disabled on page 1 and Next on the last page. Changing page size returns to
page 1.

### 12.2 Desktop table

`LS 8.4` requires the columns to be decided and justified.

| Column | Field | Why it earns its place |
|---|---|---|
| Ticket Number | `ticketNumber` | The identifier a Requester quotes; also the search key (BR-23) |
| Ticket Summary | `summary` | The only human description in the row; widest column |
| Category | `category.name` | The filter is on it, so the value must be visible to make the filter legible |
| Requested Priority | `requestedPriority` | Badge family required by `LS 8.8`; the only place a priority badge appears in a list |
| Current Status | `currentStatus` | `LS 8.4` names it; the filter is on it |
| Last Updated | `updatedAt` | `LS 8.4` names it; `DD MMM YYYY HH:mm` Asia/Bangkok (BR-10) |

Related System and Description are deliberately not columns. Related System is filterable
but adds a second classification column that pushes Ticket Summary narrow; Description is
neither searched (BR-23) nor returned by the list endpoint. Both appear on Ticket Detail.

The whole row is a link to Ticket Detail (FR-40, AC-62), with a visible focus ring and an
accessible name of `Open <ticketNumber>`. Rows carry `--tk-pale` on hover and focus.

### 12.3 Tablet and mobile

At `md` the table keeps Ticket Number, Ticket Summary, Current Status and Last Updated;
Category and Requested Priority drop out.

Below `md` the table is replaced by **cards**, not by a horizontally scrolling table -
`LS 8.7` forbids horizontal page scrolling. One card per Ticket:

- Line 1: Ticket Number, and the Current Status badge right-aligned
- Line 2: Ticket Summary, up to two lines, then ellipsis
- Line 3: Category and the Requested Priority badge
- Line 4: `Last Updated <value>` in muted text

The whole card is the link target, minimum height 44 px per touch target.

### 12.4 Empty versus no-results

Two different components with different copy and different actions (BR-57 to BR-59,
C-28, AC-49, AC-50). They are never reachable at the same time.

| | Empty | No results |
|---|---|---|
| Condition | Requester owns no Tickets, no search or filter active | A search or filter is active and excludes every Ticket |
| Heading | `No tickets yet` | `No matches` |
| Body | `You have not created any tickets. Create your first one to get started.` | `No tickets match your search or filters.` |
| Action | Primary `Create Ticket` | Secondary `Clear filters` |
| Icon | Outline document | Outline magnifier |

### 12.5 Loading and failure

Loading is a five-row skeleton at table widths and three skeleton cards on mobile, with
`aria-busy="true"` on the region (FR-36, AC-52). Failure is a `--tk-danger` panel carrying
the `INTERNAL_ERROR` message plus a secondary `Retry`, replacing the list but keeping the
toolbar so filters are not lost (FR-39, AC-51).

---

## 13. Screen: Requester Ticket Detail

Per `LS 8.5`. Two clearly separated cards, so Ticket information never reads as an
editable form.

**Card 1 - Ticket information, entirely read-only** (BR-61, AC-53). Every value uses the
read-only treatment of section 4; none is an input.

Header row: Ticket Number at `h1`, with the Current Status badge and, when non-null, the
IT Priority badge beside it. Then a definition list, three columns at `lg`, two at `md`,
one on mobile: Ticket Date, Requester, Category, Related System, Requested Priority, Last
Updated. Ticket Summary and Description follow at full width, Description preserving line
breaks.

No Public Comments, Internal Notes, Actions Taken, status control, edit affordance or
placeholder for any of them is rendered (BR-63, AC-53).

**Card 2 - Attachments**, headed `Attachments`, with the active count as `n of 5 active`.
Active and removed attachments are listed in two labelled groups so the distinction is
structural rather than a style difference (FR-42, AC-38).

A secondary `Back to My Tickets` sits below both cards.

---

## 14. Attachments

### 14.1 Selection and upload presentation

On Create Ticket the file input accepts multiple files and lists each selection as a chip
showing filename, size and a remove control. Client-side checks run on selection and mark
a file invalid before any request, but the server's answer is authoritative (BR-42, BR-43).

Because uploads happen after the Ticket exists (C-15), the Create Ticket success panel
reports per-file outcomes: successes are listed plainly, failures appear with the section
6.1 message and a `Retry` action, and the Ticket remains created (BR-40, FR-29, AC-28).

### 14.2 The five attachment states

`specification.md` section 6 names five. Their presentation:

| State | Condition | Presentation |
|---|---|---|
| **Active** | `isRemoved` is false | Filename, type icon, size, upload timestamp. Tertiary `Preview` and `Download`, plus destructive `Remove` |
| **Uploading** | request in flight | Filename with a determinate progress bar, `aria-busy="true"`; no actions offered |
| **Invalid** | rejected by client check or 413/415 | `--tk-danger` border, the section 6.1 message naming the file, a `Retry` and a `Discard`. Never counts toward the five-slot limit |
| **Removed** | `isRemoved` is true | Muted row on `--tk-readonly-bg`, filename struck through, `Removed <timestamp>` and `Reason: <removalReason>` shown in full. A `--tk-warning` `Removed` badge. **No Preview, no Download** (BR-50, AC-34) |
| **Unavailable** | the row exists but its bytes could not be served - a 410 on an attachment the view believed active, or a 500 | Row rendered with actions disabled and the note `This attachment cannot be opened right now.` plus a `Refresh` action |

The **unavailable** state is defined here. `specification.md` names it among the five but
fixes no condition for it, and `api-spec.md` produces exactly two responses that leave a
row visible but unopenable - 410 and 500. See section 17.

### 14.3 Removal confirmation dialog

BR-48 fixes the behavior; this is its presentation. A Bootstrap modal, `role="dialog"`,
`aria-modal="true"`, focus trapped and returned to the triggering control on close.

- Title: `Remove attachment`
- Body: `Remove <originalFilename>? The file will stay listed with its details, but it can no longer be downloaded.`
- A required `Removal reason` textarea, 3 rows, with the asterisk and the BR-47 message on failure
- Destructive `Remove` - disabled until the reason is non-empty after trimming - and secondary `Cancel`
- **Cancel closes the dialog, changes nothing and issues no request** (AC-33)

---

## 15. Screenshot paths

Written by the Playwright spec into the three folders `LS 12` fixes. `<vp>` is one of
`desktop`, `tablet`, `mobile`, corresponding to 1280, 834 and 390 px (C-10). `tests.md`
references these paths verbatim.

```
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── selection-<vp>-loading.png
│   ├── selection-<vp>-populated.png
│   ├── selection-<vp>-empty.png
│   ├── selection-<vp>-failure.png
│   ├── selection-<vp>-dropdown.png     (addition: the open list, active names only)
│   ├── selection-<vp>-selected.png     (addition: the shell after Continue)
│   ├── create-<vp>-initial.png
│   ├── create-<vp>-validation.png
│   ├── create-<vp>-submitting.png
│   ├── create-<vp>-success.png
│   ├── create-<vp>-api-failure.png
│   └── create-<vp>-invalid-attachment.png
├── my-tickets/
│   ├── list-<vp>-populated.png
│   ├── list-<vp>-loading.png
│   ├── list-<vp>-empty.png
│   ├── list-<vp>-no-results.png
│   ├── list-<vp>-failure.png
│   ├── list-<vp>-switched.png      (addition: Requester B's list after switching from A)
│   ├── list-<vp>-search.png        (addition: search active)
│   ├── list-<vp>-filters.png       (addition: Category and Current Status filters active)
│   ├── list-<vp>-sorted.png        (addition: Ticket Number ascending)
│   ├── list-<vp>-page-2.png        (addition: second page)
│   └── list-<vp>-forbidden.png     (addition: the 403 when B opens one of A's Tickets)
└── ticket-detail/
    ├── detail-<vp>-active.png
    ├── detail-<vp>-removed.png
    ├── detail-<vp>-removal-dialog.png
    └── detail-<vp>-unauthorized.png
```

The Development Requester Selection screen has no folder of its own because `LS 12` fixes
the three folder names. Its four states live under `create-ticket/` with a `selection-`
prefix, which is where `LS 14` Part 6 asks for them: Part 6 covers Create Mode and
explicitly requires the Selection screen, its dropdown, the selected-user display, the
Change Requester action, and its loading and failure states.
The six `list-<vp>-*` additions were made with Issue #14 because `LS 14` Part 7 asks for the
switch from A to B, search, filters, sort, pagination and a cross-requester rejection, which
the five fixed names do not cover. The rejection is captured on the Ticket Detail route,
since that is where a Requester meets the 403, but filed under `my-tickets/` as Part 7 evidence.

`selection-<vp>-dropdown.png` and `selection-<vp>-selected.png` were added with Issue #12
because Part 6 asks for the dropdown and the selected-user display with Change Requester,
which the four C-47 states do not show on their own.

---

## 16. Visual inspection checklist

Completed by hand against the screenshots above, at all three viewports, and recorded in
`tests.md`. `LS 8.8` requires comparison against this document rather than memory.

**Color and tokens**

- [ ] The four fixed hex values appear unchanged in the built CSS
- [ ] `--tk-surface` is `#FFFFFF` and `--tk-text` is `#1F2A24`
- [ ] No component hard-codes a hex outside the token block
- [ ] Header, primary buttons and strong emphasis use `--tk-primary`; links, hover and focus accents use `--tk-secondary`

**Fields**

- [ ] Read-only fields are visibly shaded and distinguishable from editable fields in greyscale
- [ ] Every single-line control shares one height; Description is taller
- [ ] Every required field shows the red asterisk
- [ ] Every validation message sits directly below its own control, never only at the top

**Buttons and badges**

- [ ] One primary button per screen
- [ ] Disabled buttons are visibly distinct and cannot be activated
- [ ] Submit shows a spinner and a changed label while submitting
- [ ] Priority badges are pills, status badges are square-cornered, and both read as text
- [ ] No IT Priority badge appears anywhere (null throughout Lab 2)

**States**

- [ ] All four Selection states render as specified
- [ ] All six Create Ticket states render as specified
- [ ] `No tickets yet` and `No matches` differ in heading and in the action offered
- [ ] All five attachment states render as specified
- [ ] A removed attachment shows its reason and offers no Preview or Download

**Layout at 1280, 834 and 390 px**

- [ ] No clipped label
- [ ] No overlapping message
- [ ] No hidden or unreachable button
- [ ] No truncated attachment filename that cannot be read in full
- [ ] No horizontal page scrolling (AC-55)
- [ ] Mobile renders cards, not a scrolling table
- [ ] Touch targets at least 44 px on mobile

**Accessibility**

- [ ] Every interactive control is tab-reachable with a visible focus ring (AC-56)
- [ ] Every control has an accessible name
- [ ] No state is conveyed by color alone (AC-57, AC-58, AC-59)
- [ ] The active nav item carries weight, an underline and `aria-current`

---

## 17. Accessibility rules

| Rule | Applies to |
|---|---|
| Every control has a visible `<label>` bound by `for`/`id` | All form controls |
| Focus ring never suppressed without replacement | All focusable elements |
| `aria-invalid` and `aria-describedby` on failure | All validated controls |
| `aria-busy` on regions and buttons during requests | Loading regions, busy buttons |
| `aria-current="page"` on the active nav item | Shell |
| `aria-live="polite"` on the results count and the success panel | My Tickets, Create Ticket |
| `aria-live="assertive"` on API failure banners | All screens |
| Modal uses `role="dialog"`, `aria-modal`, focus trap, focus restore | Removal dialog |
| Meaning never carried by color alone | Badges, validation, success, active nav |
| Contrast at least 4.5:1 for text | All text tokens, verified in section 2 |

---

## 18. Points this document had to define

Two places where the sources fix a name but not its content. Neither contradicts
`specification.md` or `api-spec.md`; both are candidates for a decision row.

| Item | Situation | Definition adopted |
|---|---|---|
| The **unavailable** attachment state | `specification.md` section 6 names it as one of five attachment states but fixes no condition, and no BR mentions it | The row exists but its bytes could not be served: a 410 on an attachment the current view believed active, or a 500 from the download route. Actions disabled, explanatory note, `Refresh` offered. Chosen because these are the only two `api-spec.md` responses that leave a visible row unopenable |
| **Selection screen screenshot location** | `LS 12` fixes three screenshot folders and none is for the Selection screen, yet `specification.md`'s Definition of Done requires its four states captured | `create-ticket/selection-<vp>-*.png`. `LS 14` Part 6 groups the Selection screen with Create Mode evidence, so the grader finds it where Part 6 expects it, and no fourth folder is added to the `LS 12` tree |
