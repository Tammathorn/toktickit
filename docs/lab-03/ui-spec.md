# Lab 3 UI Specification - Zen Green Theme

TokTickIT - CPE 334 Individual Sprint 3.
Owner: Tammathorn Kananurak (67070503489).

This document is the binding visual contract for Lab 3. It answers `LS 7`, `LS 8`, `LS 8.1` to
`LS 8.7`, and `LS 8.8`'s requirement that screens be compared against a written specification
rather than against memory.

`docs/lab-03/specification.md` governs, and `docs/lab-03/api-spec.md` governs the data this UI
renders. Where this document disagrees with either, they win and the disagreement is a defect
to report, not to resolve locally. Every visible label is taken verbatim from the
`specification.md` section 11 glossary. The product is **TokTickIT** in every heading, title,
component name and test assertion (`L2 C-41`); the "TikTockIT" spelling in the labsheet
illustration is a typo in the image and is not followed.

**What is carried from Lab 2 unchanged.** The Zen Green tokens, typography, spacing, control
states including the 44 px mobile touch target, the required-marker and validation-placement
rules, the button hierarchy and the Bootstrap breakpoints are all carried. `docs/lab-02/ui-spec.md`
remains the record for Lab 2's own screens; this document restates what Lab 3 screens must obey
and adds what Lab 3 introduces, so that a Lab 3 screen can be built from this file alone.

**Nine screens exist** (`specification.md` section 6): Login, Change Password, My Tickets,
Create Ticket, Requester Ticket Detail, IT Staff Ticket Queue, IT Staff Ticket Detail, User
Management, and the Lab 1 Check System page.

This document discharges four obligations that `specification.md`'s Definition of Done points
at:

1. The **validation message catalogue** (section 6), which BR-87 makes the single source both
   client and server quote from.
2. The **four badge families** (section 8), which `LS 8.8` requires to read as one system.
3. The **Public Comment versus Internal Note distinction** (section 19), which `LS 8.4`
   requires to be visual and which AC-107 tests.
4. **Screenshot paths** (section 23), named so `tests.md` can reference them verbatim.

Section 25 lists what this document needed and could not find. Nothing there is resolved on
this document's own authority.

---

## 1. Framework and breakpoints

Bootstrap is the mandated UI library, and Bootstrap's own breakpoints are used rather than
custom media queries, because `LS 8.7`'s three viewport bands are Bootstrap's `lg` and `md`
boundaries exactly (carried from Lab 2).

| `LS 8.7` band | Width | Bootstrap breakpoint | Grid usage |
|---|---|---|---|
| Desktop | >= 992 px | `lg` | `col-lg-*`, multi-column |
| Tablet | 768 - 991 px | `md` | `col-md-*`, two columns where practical |
| Mobile | < 768 px | below `md` | bare `col-12`, everything stacks |

Rules read "at `lg` and above" rather than "at 1280 px". The three Playwright viewports are
**1280, 834 and 390 px**, one inside each band (C-90), and are the widths every screenshot and
responsive assertion uses.

Theme values are declared once as CSS custom properties on `:root` and consumed through
Bootstrap's variables and utility classes. No component hard-codes a hex value; a raw hex
outside the token block is a defect the style tests look for (AC-106 group).

**No router library is added.** Navigation is the hand-rolled History-API router in
`client/src/router.tsx`, extended with route guards (C-85). A guard renders the Login screen,
the Change Password screen or a forbidden state; it never renders a blank page (FR-24).

---

## 2. Color tokens

### 2.1 Fixed by the labsheet and `CLAUDE.md`

These four are quoted values and must appear unchanged in the built CSS.

| Token | Hex | Intended use |
|---|---|---|
| `--tk-primary` | `#006B3C` | App header, primary buttons, strong emphasis, active nav underline |
| `--tk-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states |
| `--tk-pale` | `#EAF6EF` | Selected rows, success surfaces, subtle section emphasis |
| `--tk-bg` | `#F5F7F6` | Page ground |

### 2.2 Pinned in Lab 2 because `LS 7` gives only a description

Carried unchanged from `docs/lab-02/ui-spec.md` 2.2. A Definition-of-Done item cannot check a
description, so both are pinned to a value.

| Token | Hex | Why this value |
|---|---|---|
| `--tk-surface` | `#FFFFFF` | Cards and form fields. Pure white separates the card from `--tk-bg` |
| `--tk-text` | `#1F2A24` | Body text. A desaturated green-black: clearly not `#000000`, ~15:1 on white |

### 2.3 Supporting tokens carried from Lab 2

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `--tk-text-muted` | `#5A6B62` | Helper text, table meta, timestamps | 5.3:1, AA |
| `--tk-border` | `#D8E0DB` | Field borders, card borders, table rules | Non-text |
| `--tk-readonly-bg` | `#EDF1EE` | Read-only and system-generated field shading - the "soft gray-green" of `LS 7` | Non-text |
| `--tk-danger` | `#A4262C` | Validation messages, required asterisk, destructive button | 6.9:1, AA |
| `--tk-warning` | `#8A5A00` | Amber callout for the removed-attachment notice | 5.4:1, AA |

### 2.4 Added for Lab 3

Three tokens, each earning its place against a Lab 3 rule that no carried token can express.

| Token | Hex | Use | Why it is needed |
|---|---|---|---|
| `--tk-internal-bg` | `#F3F1E7` | The Internal Notes panel ground - the "warm ivory" `LS 7` offers alongside soft gray-green | `LS 8.4` requires Public Comments and Internal Notes to be visually distinct (AC-107). Reusing `--tk-readonly-bg` would make the notes panel read as *read-only*, which is the opposite of the truth: it is the one panel a Requester may never read and staff may always write |
| `--tk-internal-border` | `#C9B98A` | The Internal Notes panel's 1 px border and its heading rule | A shaded ground alone is a hue difference. The border survives greyscale conversion, which is how AC-107 is checked |
| `--tk-info` | `#1F5C74` | The "Requester says resolved" marker, and informational callouts that are neither success nor failure | The resolution indication is not success (nothing was resolved - a Requester said it looks resolved) and not a warning. Using `--tk-pale` would read as success and pre-empt the staff decision BR-61 reserves to them. 6.4:1 on white, AA |

**No other colour is introduced.** A Lab 3 screen using a hex outside sections 2.1 to 2.4 is a
defect (`specification.md` Definition of Done, UI group).

Card shadow is restrained, carried from Lab 2: `0 1px 2px rgba(31, 42, 36, 0.06)` with a 1 px
`--tk-border`.

---

## 3. Typography and spacing

Carried from Lab 2 unchanged. Bootstrap's native font stack; no web font is loaded, so nothing
depends on a network fetch at screenshot time.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title (`h1`) | 1.75 rem | 600 | One per screen |
| Section heading (`h2`) | 1.25 rem | 600 | Card headers, field-group headings |
| Body and controls | 1 rem / 16 px | 400 | Never below 16 px on mobile, so iOS does not zoom on focus |
| Field label | 0.875 rem | 600 | Above its control, never beside it |
| Helper and meta text | 0.8125 rem | 400 | `--tk-text-muted` |
| Validation message | 0.8125 rem | 500 | `--tk-danger` |
| Badge | 0.75 rem | 600 | Uppercase, letter-spacing 0.02em |

Line height 1.5 for body, 1.25 for headings. Spacing uses Bootstrap's scale only, in 0.25 rem
steps: label to control 0.25 rem, control to validation message 0.25 rem, field group to field
group 1 rem, card padding 1.5 rem at `md` and above and 1 rem below, section to section
1.5 rem. Content max-width 1140 px, centered.

---

## 4. Control states

All six states apply to every input, select, textarea and file control. Carried from Lab 2,
**including the 44 px mobile touch-target fix** made in Lab 2 Issue #16 (VIS-01 row 33).

| State | Background | Border | Text | Other |
|---|---|---|---|---|
| **Editable** | `--tk-surface` | 1 px `--tk-border` | `--tk-text` | Height 2.5 rem at `md` and above, **2.75 rem below `md`** so every control is a 44 px touch target. Every single-line control and button shares the band's height |
| **Read-only** | `--tk-readonly-bg` | 1 px `--tk-border` | `--tk-text` | The `readonly` attribute, not `disabled`, so the value stays selectable and reachable by screen readers |
| **Invalid** | `--tk-surface` | 1 px `--tk-danger` | `--tk-text` | `aria-invalid="true"`; message directly below (section 5) |
| **Disabled** | `--tk-readonly-bg` | 1 px `--tk-border` | `--tk-text-muted` | `disabled`; cursor `not-allowed`; cannot receive focus or be activated |
| **Focused** | unchanged | 1 px `--tk-secondary` | unchanged | 3 px outer ring `--tk-secondary` at 35% alpha, offset 1 px. Never removed - `outline: none` without a replacement ring is a defect |
| **Busy** | unchanged | unchanged | unchanged | Applies to buttons; see section 7 |

Read-only and editable must be distinguishable **in a greyscale screenshot**: the shading
difference between `#EDF1EE` and `#FFFFFF` carries it without relying on hue. This matters more
in Lab 3 than in Lab 2, because the IT Staff detail screen puts read-only Ticket information
and editable operational fields on the same card stack (section 16).

Multiline controls - Description, and the comment and note composers - are taller than the
shared height and resize vertically only, so a drag cannot break the grid.

**Password fields** are `type="password"` with `autocomplete` set: `current-password` on the
current-password field, `new-password` on the new and confirmation fields. No reveal toggle is
specified; none is forbidden, but if added it carries an `aria-pressed` state and a text label,
never an icon alone (section 7).

---

## 5. Required marker and validation placement

Per `LS 8.3`, carried from Lab 2:

- A required field's label carries a red asterisk,
  `<span class="tk-required" aria-hidden="true">*</span>`, coloured `--tk-danger`. The label's
  accessible name carries "required", so the marker is not the only signal.
- **The asterisk never substitutes for the validation message.** A field that fails validation
  shows both.
- The validation message appears **directly below its own control**, inside the same field
  group, in `--tk-danger` at 0.8125 rem. It is never rendered only as one summary at the top of
  the form.
- The message is bound with `aria-describedby`, and the control gets `aria-invalid="true"`.
- On a failed submit, focus moves to the first invalid control.
- A form-level banner may appear **in addition** when the failure is not attributable to one
  field - an API failure, or a 409 conflict. It never replaces field-level messages.

---

## 6. Validation message catalogue

This is the single source BR-87 refers to. Client and server both emit these strings, character
for character; **neither may emit validation text absent from this table**. Each rule has
exactly one message, so a test asserts one constant rather than guessing which variant applies.

### 6.1 Lab 3 field messages

| Rule | Field | Message |
|---|---|---|
| Login | `email` | `Email Address is required.` |
| Login | `password` | `Password is required.` |
| BR-12 | `newPassword`, `initialPassword` | `Password must be 8 to 128 characters and contain an upper-case letter, a lower-case letter, a digit and a special character.` |
| BR-13 | `newPassword` | `New Password must be different from your current password.` |
| BR-13 | `confirmPassword` | `The confirmation does not match the new password.` |
| BR-15 | `currentPassword` | `Current Password is required.` |
| BR-105 | `currentPassword` | `That is not your current password.` - the 422 `CURRENT_PASSWORD_INCORRECT` refusal, rendered below the field like any other field message (C-106) |
| BR-99 | `name` | `Name is required and must be between 1 and 100 characters.` |
| BR-99 | `email` | `Email Address is required and must be a valid address of at most 254 characters.` |
| BR-75 | `role` | `Role is required.` |
| BR-75 | `role` | `Role must be Requester, IT Staff or Administrator.` |
| FR-59 | `isActive` | `Status is required.` |
| BR-64 | `body` | `A comment cannot be empty and must be 2000 characters or fewer.` - Public Comment composer |
| BR-64 | `body` | `A note cannot be empty and must be 2000 characters or fewer.` - Internal Note composer |
| BR-50 | `itPriority` | `IT Priority must be Low, Medium or High.` |
| BR-52 | `currentStatus` | `That is not a valid status.` |
| BR-45 | `ownerId` | `Choose an active IT Staff or Administrator user.` |

One message covers both the length bound and the character-class bound of BR-12, because a
password failing either fails the same rule and the message must not tell an attacker which
half it failed. The two `body` messages differ only in the noun, so a screenshot of either
composer names the thing the person is writing.

**Carried from Lab 2 unchanged** (`docs/lab-02/ui-spec.md` section 6), because BR-85 leaves every
Lab 2 field bound alone: the `summary`, `description`, `categoryId`, `relatedSystemId`,
`requestedPriority`, `removalReason` and system-generated-field messages. They are not restated
here; they are cited, and the same strings are emitted.

### 6.2 Non-field messages

Surfaced as banners, per-file notices or inline conflict panels, not beside a form control. Each
maps to an `api-spec.md` section 1.3 error code.

| Code | Status | Message |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | `That email address and password do not match an account.` |
| `ACCOUNT_INACTIVE` | 403 | `That account is not active. Contact an administrator.` |
| `AUTH_REQUIRED` | 401 | `Your session has ended. Please sign in again.` |
| `PASSWORD_CHANGE_REQUIRED` | 403 | *No banner.* The client shows the Change Password screen instead; reaching this code means the client's own gate was bypassed, and the screen is the correct response, not a message |
| `FORBIDDEN_ROLE` | 403 | `You do not have access to that page.` - rendered as the forbidden state, section 20 |
| `ORIGIN_NOT_ALLOWED` | 403 | *No bespoke message.* Reachable only by a request the application did not send; it surfaces as `INTERNAL_ERROR`'s message, because a bespoke string would imply a user action that does not exist |
| `TICKET_NOT_FOUND`, `ATTACHMENT_NOT_FOUND`, `USER_NOT_FOUND` | 404 | `That item does not exist.` |
| `ALREADY_OWNED` | 409 | `<name> claimed this ticket first. The ticket has been refreshed.` |
| `OWNER_REQUIRED` | 409 | `This ticket needs a Ticket Owner first. Claim it or assign it, then try again.` |
| `OWNER_REQUIRED` on unassign | 409 | `A ticket being worked on must keep its Ticket Owner. Move it to Open first, then unassign.` |
| `INVALID_STATUS_TRANSITION` | 409 | `That status change is not allowed from <current status>.` |
| `SAME_STATUS` | 400 | *No banner.* The UI never offers the current status as a target, so this is a client defect; it surfaces as `INTERNAL_ERROR` |
| `RESOLUTION_NOT_PERMITTED_IN_STATUS` | 409 | `You can only report this while the ticket is open or in progress.` |
| `EMAIL_TAKEN` | 409 | `That email address is already in use.` - shown **at the email field**, not as a banner (BR-77, FR-62) |
| `LAST_ADMINISTRATOR` | 409 | `There must always be at least one active Administrator.` |
| `SELF_DEACTIVATION` | 422 | `You cannot deactivate your own account.` |
| `CURRENT_PASSWORD_INCORRECT` | 422 | *No banner.* It carries `fields.currentPassword` and renders below that field as the section 6.1 message (BR-105, C-106) |
| `ASSIGNEE_NOT_ELIGIBLE` | 422 | `That user cannot own a ticket. Choose an active IT Staff or Administrator user.` |
| `INVALID_QUERY_PARAM` | 400 | `Some search or filter values are not valid. Clear filters to return to the default list.` |
| `VALIDATION_FAILED` | 400 | *No banner of its own.* Its content is the per-field `fields` object, and those strings are the section 6.1 catalogue rendered beside each control (BR-87). A banner would duplicate them and violate `LS 8.3`, which forbids one mysterious error at the top standing in for field-level messages. Carried from Lab 2 |
| `INTERNAL_ERROR` | 500 | `Something went wrong on our side. Your work has not been lost - please try again.` |

Carried from Lab 2 unchanged: `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`,
`ATTACHMENT_LIMIT_REACHED`, `ATTACHMENT_REMOVED` and `REMOVAL_REASON_REQUIRED`.

**Two Lab 2 messages are deleted with their codes** (C-64): the `REQUESTER_INACTIVE` and
`REQUESTER_NOT_FOUND` strings, both of which named the "Development Requester" that no longer
exists. `TICKET_FORBIDDEN` and `ATTACHMENT_FORBIDDEN`'s shared message
`You do not have access to that item.` also goes: a non-owner now receives 404 and the
`That item does not exist.` string, which is the whole point of C-65.

**`INVALID_CREDENTIALS` is one string for three causes** - unknown email, wrong password, NULL
hash. It never names which, and the Login screen never renders it beside the email field, which
would imply the address was the problem (BR-07, AC-05).

No message quotes a stack trace, SQL, filesystem path or database text (BR-89, AC-105). No
message contains a password, a hash or a token (BR-88).

---

## 7. Button hierarchy

Carried from Lab 2, with Lab 3's actions placed in the existing levels.

| Level | Use | Fill | Text | Border |
|---|---|---|---|---|
| **Primary** | The one main action per screen: `Sign In`, `Change Password`, `Submit Ticket`, `Create User`, `Save Changes` | `--tk-primary` | `#FFFFFF` | none |
| **Secondary** | Supporting: `Cancel`, `Clear filters`, `Back to My Tickets`, `Back to the Ticket Queue` | `--tk-surface` | `--tk-primary` | 1 px `--tk-primary` |
| **Tertiary** | Low-emphasis inline: `Download`, `Preview`, `Edit`, `Log Out`, `Set a new initial password` | transparent | `--tk-secondary` | none; underline on hover |
| **Destructive** | `Remove` on an attachment, and `Cancel Ticket`, `Deactivate` and the Confirm inside their dialogs | `--tk-danger` | `#FFFFFF` | none |
| **Disabled** | Any level when unavailable | `--tk-readonly-bg` | `--tk-text-muted` | 1 px `--tk-border` |
| **Busy** | A primary or destructive button during a request | unchanged | unchanged | Bootstrap spinner before the label; label changes to the progressive form; `disabled` and `aria-busy="true"` |

Rules from `LS 8.3`, carried: every button has visible text, and an icon may accompany but never
replace it; exactly one primary button per screen; a disabled button is visually distinct and
cannot be activated; the busy state is a disabled state with a spinner, so a second click cannot
fire a second request.

Busy labels are fixed. Every primary and destructive button in the document appears here, so a
button with no entry is a button this section has not specified:

| Button | Busy label | Where |
|---|---|---|
| `Sign In` | `Signing in…` | Login |
| `Change Password` | `Saving…` | Change Password |
| `Submit Ticket` | `Submitting…` | Create Ticket |
| `Report it` | `Reporting…` | The resolution confirmation, section 14.3 |
| `Claim` | `Claiming…` | Staff detail, section 16.2 |
| `Save Changes` | `Saving…` | Staff detail owner and IT Priority; User Management edit |
| `Unassign` | `Unassigning…` | Staff detail, section 16.2 |
| `Resolve` | `Resolving…` | The Resolved confirmation, section 16.2 |
| `Close` | `Closing…` | The Closed confirmation, section 16.2 |
| `Cancel Ticket` | `Cancelling…` | The Cancelled confirmation, section 16.2 |
| `Post Comment` | `Posting…` | Both comment composers |
| `Add Note` | `Adding…` | The note composer |
| `Create User` | `Creating…` | User Management create |
| `Set Password` | `Setting…` | The set-initial-password panel, section 17.2 |
| `Remove` | `Removing…` | The attachment removal dialog, Requester only |

**A hidden or disabled control is feedback, not a security control** (BR-40). Every operation a
button performs is refused by the backend when the route is reached directly, and the tests that
prove it are API tests, not UI tests (`specification.md` Definition of Done, Security group).

---

## 8. Badges

**Four families**, not three: `LS 7` and `LS 8.8` require consistent badges for Current Status,
Requested Priority, IT Priority **and Role**. The Lab 2 component handled two families and
distinguished only `NEW` from "other" (`phase1-analysis.md` 2e item 4); it is extended, not
replaced.

Every badge carries its value as text. **No badge conveys meaning by colour alone**, and the two
families are separable in greyscale by shape (AC-107 group, `specification.md` section 6).

### 8.1 Shape is the family signal

| Family | Shape | Rationale |
|---|---|---|
| Requested Priority | Pill, rounded | Carried from Lab 2 |
| IT Priority | Pill, rounded, with a leading `IT` in the label text | Same family as Requested Priority, distinguished by the prefix rather than by colour |
| Current Status | Square-cornered | Carried from Lab 2, so a status is never mistaken for a priority |
| Role | Square-cornered with a 1 px border and no fill | Distinct from status by being outlined rather than filled; distinct from priority by being square |

### 8.2 Current Status - all eight values

Eight values, eight treatments. Every value is reachable this sprint (BR-52, C-70), so unlike
Lab 2 there is no unreachable case.

| Value | Displayed | Fill | Text |
|---|---|---|---|
| `NEW` | `New` | `--tk-primary` | `#FFFFFF` |
| `OPEN` | `Open` | `--tk-secondary` | `#FFFFFF` |
| `IN_PROGRESS` | `In Progress` | `--tk-pale` | `--tk-primary` |
| `WAITING_FOR_REQUESTER` | `Waiting for Requester` | `--tk-surface`, 1 px `--tk-warning` | `--tk-warning` |
| `RESOLVED` | `Resolved` | `--tk-pale`, 1 px `--tk-secondary` | `--tk-secondary` |
| `CLOSED` | `Closed` | `--tk-readonly-bg` | `--tk-text-muted` |
| `REOPENED` | `Reopened` | `--tk-surface`, 1 px `--tk-info` | `--tk-info` |
| `CANCELLED` | `Cancelled` | `--tk-readonly-bg` | `--tk-text-muted`, label struck through |

The two terminal statuses, `CLOSED` and `CANCELLED`, share the muted treatment because they
share the property that matters - no transition leaves either (BR-58, C-98) - and are separated
by the strike-through, which survives greyscale. `WAITING_FOR_REQUESTER` is the one status that
asks the Requester for something, so it carries the warning hue.

Displayed text is title case, never the raw enum: `IN_PROGRESS` renders `In Progress`.

### 8.3 Requested Priority and IT Priority

| Value | Displayed | Fill | Text |
|---|---|---|---|
| `LOW` | `Low` / `IT Low` | `--tk-pale` | `--tk-text` |
| `MEDIUM` | `Medium` / `IT Medium` | `--tk-surface`, 1 px `--tk-primary` | `--tk-primary` |
| `HIGH` | `High` / `IT High` | `--tk-danger` | `#FFFFFF` |

**The IT Priority badge now always renders** (FR-31, BR-49). `itPriority` is non-null for every
Ticket after the C-71 backfill, so the Lab 2 conditional at `TicketDetail.tsx:85` is dead code
and the Lab 2 style tests asserting the badge's **absence** are rewritten to assert its
presence - not deleted (BR-95, `phase1-analysis.md` 2c).

### 8.4 Role

| Value | Displayed | Treatment |
|---|---|---|
| `REQUESTER` | `Requester` | Outlined, 1 px `--tk-border`, text `--tk-text-muted` |
| `IT_STAFF` | `IT Staff` | Outlined, 1 px `--tk-secondary`, text `--tk-secondary` |
| `ADMINISTRATOR` | `Administrator` | Outlined, 1 px `--tk-primary`, text `--tk-primary`, weight 700 |

Never `Admin`, never `ITStaff`, never `staff` in UI text (C-92 glossary).

### 8.5 Two markers using the same system

| Marker | Condition | Treatment |
|---|---|---|
| `Requester says resolved` | `requesterResolvedAt` is non-null | Square-cornered, `--tk-surface`, 1 px `--tk-info`, text `--tk-info`, with a leading check-outline icon **and** the text |
| `(inactive)` | `owner.isActive` is false | Not a badge - appended to the owner's name in `--tk-text-muted` italic, as `Siriporn Chai (inactive)`. It qualifies a name rather than labelling a state, so it reads inline |

The resolution marker is **never** styled as a status badge and never appears in the status
column, because it is a flag and not a status (BR-59, C-76). On the queue it sits beside the
Ticket Summary; on a detail screen it sits in the operations group.

---

## 9. Application shell and role-derived navigation

Per `LS 7` and `LS 8.2`. The shell renders **only** for an authenticated user with no
outstanding password change (FR-09). Login and Change Password render without it.

**Desktop and tablet.** One header bar, `--tk-primary` ground, white text:

- Left: the **TokTickIT** wordmark, which links to the role's landing screen.
- Centre: the role's navigation (section 9.1).
- Right: the authenticated user's **name**, their **Role badge** (section 8.4), and `Log Out` as
  a tertiary action rendered on the primary ground in white.

**No "Development Requester" text and no Change Requester control exists anywhere in the built
client** (FR-09, BR-94, AC-30). The strings are asserted absent, not merely unused.

### 9.1 Navigation by role

Derived from the role; an unauthorised destination is never presented (BR-36, FR-10).

| Role | Navigation | Landing screen |
|---|---|---|
| Requester | `My Tickets`, `Create Ticket` | My Tickets |
| IT Staff | `Ticket Queue` | Ticket Queue |
| Administrator | `Ticket Queue`, `User Management` | Ticket Queue |

An Administrator sees the Queue **and** User Management, because C-66 gives them every IT Staff
ticket permission (AC-33). IT Staff never see User Management (AC-32). A Requester sees neither
(AC-31).

`Check System` is not in any role's navigation. It is a public diagnostic page reached by URL
(C-87), as in Lab 1.

**Active page indication is threefold**, so it never depends on colour alone: 600 weight, a 3 px
underline in `--tk-pale`, and `aria-current="page"`.

**Mobile.** The header collapses to the wordmark plus a Bootstrap toggler. The expanded panel
lists the role's navigation items, then the user's name with the Role badge, then `Log Out`, as
full-width rows with a 44 px minimum touch target. The panel is a `<nav>` with an `aria-label`,
and focus is trapped inside it while open.

### 9.2 The client holds no identity

The client learns who it is from `GET /api/auth/me` and holds the result in memory only. **No
`localStorage`, `sessionStorage`, cookie written by script, or any other browser storage holds a
user id, an email address, a role or a token** (FR-11, BR-25, AC-34).

The Lab 2 key `toktickit.requesterId` is not read, not migrated and not cleared - no code path
looks at it (BR-94). A browser still holding it is unaffected.

**Any 401 from any request means the session is gone.** The client discards its in-memory user
and renders Login with the `AUTH_REQUIRED` message from section 6.2, never a generic error
(BR-34, FR-12, AC-35).

---

## 10. Screen: Login

Per `LS 8.1`. No shell. A centered card, `max-width: 26 rem`, on `--tk-bg`, with the TokTickIT
wordmark above it in `--tk-primary`.

**Fields**

| Field | Control | Rules |
|---|---|---|
| Email Address | `type="email"`, `autocomplete="username"`, required | Non-empty. Presence only - format is not validated here |
| Password | `type="password"`, `autocomplete="current-password"`, required | Non-empty. Never trimmed |

The client validates **presence only** before submitting (FR-01). It does not check the password
policy on this screen: the policy governs setting a password, not supplying one, and a
client-side policy check here would refuse a valid legacy password and tell an attacker the
policy bound.

**One primary button**, `Sign In`, full width, busy label `Signing in…` (FR-01).

No `Forgot password?` link, no `Create an account` link, no `Remember me`, no social button and
no SSO button - `LS 4.2` excludes recovery, self-registration and SSO, and a link to a page that
cannot exist is worse than no link (`specification.md` section 3 Excluded).

**Modes:** view and submit.

**States**

| State | Presentation |
|---|---|
| Initial | Both fields empty, `Sign In` enabled |
| Validating | Field-level messages from section 6.1 below the offending control; focus moves to the first invalid field |
| Submitting | `Sign In` busy and disabled; both fields disabled |
| Invalid credentials | The `INVALID_CREDENTIALS` banner **above the fields**, both values retained except the password, which is cleared; focus returns to the password field. Never rendered beside the email field (AC-05) |
| Inactive account | The `ACCOUNT_INACTIVE` banner in the same position, in `--tk-warning`, not `--tk-danger` - it is not the person's mistake (AC-08) |
| Session ended | The `AUTH_REQUIRED` banner, shown when the user arrives here from a 401 rather than by logging out (AC-35) |
| API failure | The `INTERNAL_ERROR` banner with a `Retry` secondary action; every entered value except the password is retained |

The password is cleared on every failure and retained on none. It is the one field where
retaining the value would be a hazard on a shared screen.

**On success** the client fetches the current user and routes to the Change Password screen if
`mustChangePassword` is true, otherwise to the role's landing screen (FR-18, section 9.1).

---

## 11. Screen: Change Password

Per `LS 8.1`. Shown to a user with an outstanding password change, **and to nobody else**
(`specification.md` section 6). No shell - the point of the gate is that nothing else is
reachable (FR-14, BR-20).

No role's navigation carries a link to this screen (section 9.1), and there is no
change-my-password affordance for a user who is not gated. `POST /api/auth/change-password`
remains callable by any authenticated user (`api-spec.md` 3.2), but Lab 3 renders no UI for that
case: `LS 4.2` excludes self-service account management beyond what the gate requires, and adding
a voluntary route would be a tenth screen.

Centered card, `max-width: 30 rem`, on `--tk-bg`.

**Header.** The authenticated user's **name** and **Role badge** at the top of the card
(FR-15, C-61, AC-22). This is why `GET /api/auth/me` is exempt from the gate: without it the
screen could not say who is being asked to change their password.

**A short explanatory line** above the fields:
`You must choose a new password before you can continue.` It is always present, because the gate
is the only way to reach this screen.

**The password rules are stated before the user types** (FR-16), as static helper text below the
New Password field, in `--tk-text-muted`, worded identically to the BR-12 message in section 6.1
so that the rule and its failure message cannot drift apart.

**Fields**

| Field | Control | Rules |
|---|---|---|
| Current Password | `type="password"`, `autocomplete="current-password"`, required | Non-empty. Verified by the backend (BR-15, AC-27) |
| New Password | `type="password"`, `autocomplete="new-password"`, required | BR-12 and BR-13, checked on the client and again on the server (BR-14) |
| Confirm New Password | `type="password"`, `autocomplete="new-password"`, required | Must equal New Password, **checked before any request is sent** (AC-26) |

**One validator** serves this screen, Administrator create and Administrator set-initial-password,
on the client and on the server (FR-17, BR-14, C-60). It is one module imported by both sides, not
two implementations that agree today.

**One primary button**, `Change Password`, busy label `Saving…`.

**Modes:** edit.

**States**

| State | Presentation |
|---|---|
| Initial | Three empty fields, the rules stated, `Change Password` enabled |
| Validating | Field-level messages from section 6.1; the confirmation mismatch is caught here, with no request sent (AC-26) |
| Saving | Button busy and disabled; all three fields disabled |
| Success | The success treatment of section 20 - a `--tk-pale` panel with a check icon **and** the text `Your password has been changed.` - then automatic continuation to the role's landing screen (FR-18, AC-28) |
| Wrong current password | On 422 `CURRENT_PASSWORD_INCORRECT`, the message at the Current Password field, not as a banner (section 6.1, C-106). The New Password and Confirm values are retained; Current Password is cleared and focused. **The user is not sent to Login** - a 422 is not a session failure, which is precisely why C-106 refuses 401 here |
| API failure | The `INTERNAL_ERROR` banner with `Retry`; all three fields cleared, because a retained password on a failed change is a hazard and the person must retype anyway |

Success is never conveyed by colour alone (`CLAUDE.md`): the panel carries an icon and a sentence.

**No password is ever rendered, echoed, logged or placed in a URL** (BR-88). The three fields are
the only place a password exists on the client, and they are cleared on unmount.

---

## 12. Screen: My Tickets - what changes

Structurally as Lab 2 (`docs/lab-02/ui-spec.md` section 12), which stays the authority on the
toolbar, the desktop table, the tablet and mobile layouts, and the empty-versus-no-results
distinction. **Four changes, and no others** (`specification.md` section 6):

1. **The identity in the header is the authenticated user**, from the shell (section 9). No
   Requester selector, no Change Requester control.
2. **The Current Status filter offers all eight statuses** (FR-32, C-70). The Lab 2 five-value
   `STATUS_OPTIONS` list is extended, and so are the two other places that hard-code five values
   (`phase1-analysis.md` 2e item 3).
3. **The IT Priority badge always renders** in the list, because `itPriority` is never null
   (FR-31, BR-49). At `lg` it is its own column beside Requested Priority; at `md` it is dropped
   with Category and Requested Priority; on mobile it sits on the card's badge line.
4. **The `Requester says resolved` marker** appears on a Ticket carrying the indication, so the
   Requester can see their own report was recorded (section 8.5).

The Lab 2 empty and no-results copy, loading skeleton and failure panel are unchanged
(`L2 C-28`). Every Lab 2 test of this screen is adapted to an authenticated wrapper, not
retired (BR-95, `phase1-analysis.md` section 3).

---

## 13. Screen: Create Ticket - what changes

Structurally as Lab 2 (`docs/lab-02/ui-spec.md` section 11). **Two changes:**

1. **The Requester field is the authenticated user**, rendered read-only with the section 4
   read-only treatment. In Lab 2 it displayed the selected Requester; the treatment is identical
   and only the source changes.
2. **Nothing in the form carries a `requesterId`.** The field is display-only and the request
   body has no identity field at all (`api-spec.md` 4.1, C-64).

The five-attachment rules, the per-file upload outcomes on the success panel, the field bounds and
every validation message are unchanged (BR-85).

**This screen is Requester-only.** IT Staff and Administrator users have no navigation to it and
receive 403 from its endpoint (C-101). A staff user reaching the URL directly sees the forbidden
state of section 20, not an empty form.

---

## 14. Screen: Requester Ticket Detail - what changes

Structurally as Lab 2 (`docs/lab-02/ui-spec.md` section 13): two clearly separated cards, Ticket
information entirely read-only, then Attachments. **Three additions and one change.**

### 14.1 Change: the Ticket header

The header row keeps Ticket Number at `h1` with the Current Status badge, and the IT Priority
badge now **always** renders beside it (FR-31). The `Requester says resolved` marker joins them
when set.

The read-only definition list gains one row: **Ticket Owner**, showing the owner's **name**, or
`Unassigned` when there is none.

**The owner's email address appears nowhere on this screen and in no response that feeds it**
(BR-100, C-95, AC-115). The DTO carries `owner: { name }` precisely so that there is no email to
render by accident.

An owner who has been deactivated shows as `Siriporn Chai (inactive)` (section 8.5). The
Requester is not told why, because they cannot act on it.

### 14.2 Addition: the Public Comments section

A third card, headed `Public Comments`, on the white surface (section 19 fixes why the surface
matters).

**The list**, newest first (BR-67, FR-27). Each entry:

- Line 1: the author's **name**, their **Role badge**, and the creation time as
  `DD MMM YYYY HH:mm` Asia/Bangkok (`L2 BR-10`).
- Line 2 onward: the body, rendered as **plain text** with `white-space: pre-wrap`, never through
  `dangerouslySetInnerHTML` (BR-66, AC-51, AC-52).

An entry authored by the Requester themselves is marked with a left border in `--tk-secondary`, so
their own words are distinguishable from a staff reply without relying on reading the name.

**Empty state:** `No comments yet.` in `--tk-text-muted`, with the composer still present - an
empty comment list is not a dead end.

**The composer.** A textarea labelled `Add a comment`, 3 rows, with:

- A **live character counter** `n / 2000` below the control, in `--tk-text-muted`, turning
  `--tk-danger` past 2000 (FR-53).
- One primary button `Post Comment`, busy label `Posting…`, disabled while the trimmed body is
  empty.
- No edit and no delete control on any entry, ever - comments are append-only (BR-63, FR-51).

**No Internal Note content, count, badge or placeholder appears on this screen** (FR-29, BR-70,
AC-47, AC-54). There is no "internal" tab, no locked panel and no "3 internal notes" hint. The
absence is structural: the payload has no key for it (`api-spec.md` 10.2).

### 14.3 Addition: the "Problem Appears Resolved" action

Placed in the Ticket information card, below the status row, as a **tertiary** action labelled
`Problem Appears Resolved` with a one-line explanation:
`Tell IT Staff the problem looks fixed. They will confirm and resolve the ticket.`

**Enabled only** while the Ticket is Open, In Progress, Waiting for Requester or Reopened
(FR-30, BR-60). In any other status it is **not rendered at all** rather than rendered disabled:
a disabled control on a Closed Ticket invites a click that can never succeed.

**A confirmation step is required before the request is sent** (FR-30). A Bootstrap modal,
`role="dialog"`, `aria-modal="true"`, focus trapped and returned on close:

- Title: `Report that the problem appears resolved`
- Body: `IT Staff will be told the problem looks fixed. The ticket stays open until they confirm it.`
- Primary `Report it` and secondary `Cancel`. **Cancel changes nothing and issues no request.**

**After the action**, the `Requester says resolved` marker renders in the header with the
timestamp beneath it, and the action is replaced by the muted line
`You reported this on DD MMM YYYY HH:mm.` (FR-30).

**The status does not change** and no comment is posted on the Requester's behalf (BR-59, BR-61,
AC-55, AC-59). The screen must not imply otherwise: the status badge is untouched and the comment
list gains no entry.

### 14.4 Addition: nothing else

No status control, no IT Priority control, no assignment control, no Resolution Summary, no
Service Actions tab and no placeholder for any of them (`specification.md` section 3). A Requester
still has no Ticket field they may edit (`L2 C-06`); Lab 3 gives them a comment and a flag, not an
edit.

---

## 15. Screen: IT Staff Ticket Queue

Per `LS 8.3`. The landing screen for IT Staff and Administrator users. Page title
`Ticket Queue` at `h1`.

### 15.1 Toolbar

One toolbar above the list. Every control maps to an `api-spec.md` 8.1 query parameter, and no
control exists that the API cannot serve.

| Control | Parameter | Presentation |
|---|---|---|
| Search | `search` | Text input, label `Search`, placeholder `Ticket Number or Ticket Summary`, debounced 300 ms, resets `page` to 1 |
| Current Status filter | `currentStatus` | Select. Default option `Open tickets` - **not** `All statuses`, because the default excludes Closed and Cancelled (BR-72). The list then offers all eight statuses individually, plus `All statuses` |
| IT Priority filter | `itPriority` | Select, `All IT priorities` default |
| Ticket Owner filter | `owner` | Select: `Any owner`, `Assigned to me`, `Unassigned`, then each active IT Staff and Administrator user by name, from `GET /api/staff/assignable-users` (C-105) |
| Category filter | `categoryId` | Select, `All categories` default |
| Sort | `sort` | Select of the five permitted fields x two directions, plus the default option |
| Clear filters | - | Secondary button, **rendered only when a search or a non-default filter is active** |
| Pagination | `page`, `pageSize` | Bootstrap pagination plus a page-size select of 10, 25, 50 |

Sort options and their tokens, matching `api-spec.md` 8.1 exactly:

| Option label | `sort` value |
|---|---|
| `IT Priority, then oldest` | *(omitted - the default)* |
| `Newest first` | `createdAt:desc` |
| `Oldest first` | `createdAt:asc` |
| `Recently updated` | `updatedAt:desc` |
| `Least recently updated` | `updatedAt:asc` |
| `IT Priority, high to low` | `itPriority:desc` |
| `IT Priority, low to high` | `itPriority:asc` |
| `Ticket Number, ascending` | `ticketNumber:asc` |
| `Ticket Number, descending` | `ticketNumber:desc` |
| `Current Status, A to Z` | `currentStatus:asc` |
| `Current Status, Z to A` | `currentStatus:desc` |

The default option is first and selected on load, and its label names the order rather than
leaving it implicit, because a queue whose order nobody can state is a queue nobody trusts.

**The default view is stated on screen**, not only in this document: a muted line below the
toolbar reads `Showing open tickets, highest IT Priority first. Closed and Cancelled are hidden.`
It disappears once any filter or sort is changed (BR-72, AC-61).

Pagination shows `Showing X to Y of N tickets`, read from `meta.total` and `meta.page`. Previous
is disabled on page 1 and Next on the last page. Changing page size returns to page 1.

**This is the whole of the queue's counting.** `meta.total` is the only count rendered: `LS 4.2`
excludes dashboards and KPI analytics beyond simple queue counts, and a per-status tile row would
be the first step of one (`api-spec.md` 8.1).

### 15.2 Desktop table, at `lg` and above

The nine columns FR-39 names, and no tenth.

| Column | Field | Why it earns its place |
|---|---|---|
| Ticket Number | `ticketNumber` | The identifier staff quote; also a search key |
| Created | `createdAt` | `LS 8.3` names it; the default sort's tiebreak |
| Ticket Summary | `summary` | The only human description; widest column |
| Category | `category.name` | A filter is on it, so the value must be visible |
| Requested Priority | `requestedPriority` | What the Requester asked for |
| IT Priority | `itPriority` | What IT decided. Adjacent to Requested Priority so a disagreement between them is visible at a glance - the reason both columns exist |
| Current Status | `currentStatus` | `LS 8.3` names it; a filter is on it |
| Ticket Owner | `owner` | `LS 8.3` names it; the assigned-versus-unassigned distinction (FR-40) |
| Last Updated | `updatedAt` | `LS 8.3` names it; `DD MMM YYYY HH:mm` Asia/Bangkok |

**Ticket Owner is the column carrying the most meaning**, so it is explicit rather than subtle:

| Value | Rendering |
|---|---|
| Assigned | The owner's name in `--tk-text` |
| Assigned to the viewer | The owner's name, 600 weight, followed by `(you)` in `--tk-text-muted` |
| Assigned to a deactivated user | `Name (inactive)` per section 8.5 |
| Unassigned | `Unassigned` in `--tk-text-muted` italic, on a `--tk-pale` cell ground |

The `--tk-pale` cell ground on an unassigned row is what satisfies "distinguish assigned from
unassigned at a glance" (FR-40) without adding a tenth column, and it survives greyscale as a
lighter cell.

The `Requester says resolved` marker renders **beneath the Ticket Summary** on its row, not in the
status column (section 8.5, FR-40, AC-60).

The whole row is a link to IT Staff Ticket Detail, with a visible focus ring and an accessible
name of `Open <ticketNumber>`. Rows carry `--tk-pale` on hover and focus - which is why the
unassigned cell ground is applied to the cell, not the row, so hover does not erase it.

**Related System and Description are not columns.** Related System adds a second classification
column that pushes Ticket Summary narrow; Description is not returned by the list endpoint. Both
appear on Ticket Detail.

### 15.3 Tablet, at `md`

Six of FR-39's nine columns are **kept**; the other three are **hidden**, not moved to a second
line (C-108, BR-107).

| Kept as columns | Hidden |
|---|---|
| Ticket Number, Ticket Summary, IT Priority, Current Status, Ticket Owner, Last Updated | Created, Category, Requested Priority |

*At tablet width the columns that pick the next piece of work stay; the rest is one click away* -
the three hidden values are all present on IT Staff Ticket Detail (section 16.1), so nothing
becomes unreachable, and a six-column table at 834 px stays scannable where a nine-column one
does not.

The hidden columns are **absent from the DOM at this width**, not merely visually suppressed, so
RESP-04 can assert exactly six columns rather than asserting that three are invisible.

> C-108 also corrected `specification.md` section 6, which had said the tablet table drops
> "Category and **Related System**" - a column FR-39 never creates and section 15.2 excludes with
> a reason. That conflict was reported by this document rather than resolved locally, and the
> decision fixed it at its source; section 6 and FR-39 now agree.

### 15.4 Mobile, below `md`

**Cards, not a horizontally scrolling table** - `LS 8.7` forbids horizontal page scrolling. One
card per Ticket, minimum height 44 px, the whole card being the link target:

- Line 1: Ticket Number, and the Current Status badge right-aligned
- Line 2: Ticket Summary, up to two lines, then ellipsis
- Line 3: the IT Priority badge and the Requested Priority badge
- Line 4: `Owner:` and the owner rendering from 15.2, or `Unassigned`
- Line 5: `Updated <value>` in muted text
- The `Requester says resolved` marker, when set, on its own line below

Created date and Category drop out of the card. They are on the detail screen, and a five-line
card at 390 px is already the practical limit before the list stops being scannable.

### 15.5 States

**Modes:** list. There is no edit mode on this screen - every write happens on Ticket Detail.

| State | Presentation |
|---|---|
| Loading | Five-row skeleton at table widths, three skeleton cards on mobile, `aria-busy="true"` on the region |
| Populated | The table or cards above |
| **Empty** | Condition: no filter or search active and the queue genuinely holds nothing. Heading `No tickets in the queue`, body `There are no open tickets right now.`, no action offered - there is nothing for staff to create. Outline document icon |
| **No results** | Condition: a search or filter is active and excludes everything. Heading `No matches`, body `No tickets match your search or filters.`, secondary `Clear filters`. Outline magnifier icon |
| Invalid query | The `INVALID_QUERY_PARAM` panel in the list region, toolbar kept, offering **`Clear filters`** rather than Retry - retrying the same invalid address fails identically. Each `fields` message renders beside its own control (FR-42) |
| Forbidden | The section 20 forbidden state. Reachable by a Requester typing the URL; no queue data is fetched (FR-24) |
| Failure | A `--tk-danger` panel with the `INTERNAL_ERROR` message and a secondary `Retry`, replacing the list but **keeping the toolbar** so filters are not lost |

**Empty and no-results are two different components** with different headings, different bodies,
different icons and different actions, and are never reachable at the same time (FR-41, AC-69,
`L2 C-28`). This is the one pair a screenshot must be able to tell apart at a glance.

---

## 16. Screen: IT Staff Ticket Detail

Per `LS 8.4`. Four cards in one column at `md` and below; at `lg` the first two sit side by side,
read-only left and operations right.

A secondary `Back to the Ticket Queue` sits below all cards, and preserves the queue's filters and
page.

### 16.1 Card 1 - Ticket information, entirely read-only

Every value uses the read-only treatment of section 4; none is an input (FR-43).

Header row: Ticket Number at `h1`, the Current Status badge, the IT Priority badge, and the
`Requester says resolved` marker when set.

Then a definition list, three columns at `lg`, two at `md`, one on mobile: **Requester** (name
and email address - staff need to make contact), **Ticket Date**, **Category**, **Related
System**, **Requested Priority**, **Last Updated**. Ticket Summary and Description follow at full
width, Description preserving line breaks.

**Requested Priority sits here, in the read-only card**, and IT Priority sits in the operations
card. That placement is the rule: the Requester's value is never editable by anyone (BR-51), and
putting the two in the same group would suggest both can be changed.

### 16.2 Card 2 - Operations, the only editable group

Headed `Ticket Operations`. Its ground is `--tk-surface` with a 1 px `--tk-secondary` border, so
the editable group is visibly a different group from the read-only one **in greyscale as well as
in colour** (section 4, `specification.md` section 6).

**Ticket Owner.** The current owner's name and Role badge, or `Unassigned` in muted italic, then:

| Control | Shown when | Behaviour |
|---|---|---|
| `Claim` | The Ticket is unassigned | Primary. Assigns the caller. Busy label `Claiming…` (FR-44) |
| `Assign to…` / `Reassign to…` | Always / when owned | A select populated from `GET /api/staff/assignable-users` (C-105), then `Save Changes` |
| `Unassign` | The Ticket is owned | Tertiary. Sends `ownerId: null` |

**Losing the claim race** is a first-class state, not an error banner: the `ALREADY_OWNED` message
of section 6.2 renders inline in the owner group, the whole Ticket is refetched, and the owner
group re-renders showing the winner. The `Claim` button is gone by then, which is the clearest
possible statement of what happened (FR-44, AC-71).

**Unassigning a Ticket that is being worked on** renders the second `OWNER_REQUIRED` message of
section 6.2, inline in the owner group, naming the remedy - move it to Open first (BR-97, C-104,
AC-111).

**IT Priority.** A select of `Low`, `Medium`, `High`, with `Save Changes`, and the current value
shown as a badge beside it (FR-47). No confirmation step - a priority is reversible in one click.

**Current Status.** A select offering **only the transitions permitted from the current status**
by `specification.md` section 5.1, plus the current status shown as the unselectable current
value (FR-48). A target outside the matrix is never offered, which is why `SAME_STATUS` and
`INVALID_STATUS_TRANSITION` have no user-facing banner (section 6.2).

On a terminal status - `CLOSED` or `CANCELLED` - the select is **not rendered**. In its place a
muted line reads `This ticket is closed. No further status changes are possible.` or
`This ticket is cancelled…` (BR-58, C-98). A disabled empty select would invite a click that can
never succeed.

**Moving to Resolved, Closed or Cancelled requires a confirmation step before the request is
sent** (BR-57, FR-48, AC-80). A modal, `role="dialog"`, `aria-modal="true"`, focus trapped and
restored:

| Target | Title | Body | Confirm button |
|---|---|---|---|
| Resolved | `Resolve this ticket` | `The Requester will see the ticket as Resolved. It can be reopened if the problem returns.` | Primary `Resolve` |
| Closed | `Close this ticket` | `Closing is final. A closed ticket cannot be reopened or changed.` | Destructive `Close` |
| Cancelled | `Cancel this ticket` | `Cancelling is final. A cancelled ticket cannot be reopened or changed.` | Destructive `Cancel Ticket` |

The Closed and Cancelled confirmations say the move is **final**, because it is (BR-58). The
Cancel-the-dialog control is labelled `Keep the ticket` on the Cancelled dialog, so that two
buttons reading "Cancel" never sit side by side.

**When the Ticket carries the resolution indication**, a `--tk-info` callout sits above the status
control: `The Requester reported on DD MMM YYYY HH:mm that the problem appears resolved.` It is an
input to the staff decision and **never an automatic action** (BR-61, FR-50, AC-59). Moving to
Resolved clears it, and the callout disappears on the refetch.

### 16.3 Card 3 - Attachments

As Lab 2 (`docs/lab-02/ui-spec.md` section 14), headed `Attachments`, with active and removed in
two labelled groups (FR-49).

**Read-only for staff** (C-103): `Preview` and `Download` are offered on active attachments;
**no upload control and no `Remove` control is rendered**, and the `n of 5 active` counter is shown
without the add affordance. A removed attachment shows its reason and offers neither action, as in
Lab 2 (`L2 BR-50`).

### 16.4 Card 4 - the two communication sections

Section 19 fixes their relationship. Both are on this card, Public Comments first.

---

## 17. Screen: User Management

Per `LS 8.5`. **One screen.** Administrator only; a Requester or IT Staff user reaching the URL
sees the forbidden state of section 20 and **no user data is fetched** (FR-65, AC-96, AC-97).

Page title `User Management` at `h1`.

### 17.1 Toolbar and list

| Control | Parameter | Presentation |
|---|---|---|
| Search | `search` | Text input, label `Search`, placeholder `Name or email address`, debounced 300 ms |
| Role filter | `role` | Select, `All roles` default. **The only filter** |
| `Create User` | - | Primary button, right-aligned, opens the create panel |

**No pagination control, no page-size select, no second filter and no sortable column headers**
(BR-84, FR-66, AC-98). `LS 4.2` excludes user-list pagination, multi-column sorting and multiple
simultaneous filters, so the controls do not exist to be disabled.

The list is returned in a **fixed order, name ascending then id** (C-107, BR-106). No column header sorts, and no sort control exists - `LS 8.5` does not ask for sorting, and a fixed order keeps tests and screenshots stable.

**Desktop and tablet table**, the five columns `LS 8.5` names:

| Column | Field | Rendering |
|---|---|---|
| Name | `name` | Plain text. The viewer's own row carries `(you)` in muted text |
| Email | `email` | Plain text, stored lower-case |
| Role | `role` | The Role badge of section 8.4 |
| Status | `isActive` | `Active` in `--tk-secondary`, or `Inactive` in `--tk-text-muted` with a dot glyph, so it is not colour alone |
| Edit | - | A tertiary `Edit` action per row |

A row whose user has an outstanding password change carries a muted
`Initial password not yet changed` line beneath the name, from `mustChangePassword`, so an
Administrator can see which accounts have not been collected.

**No delete control, no checkbox column, no bulk action bar, no Import and no Export button**
(BR-81, FR-66, AC-98). Users are deactivated, never deleted.

**Mobile:** one card per user carrying Name with `(you)`, Email, the Role badge, the Status
indicator and `Edit`, at a 44 px minimum touch target.

### 17.2 Create and Edit

Both are **panels or modals, never separate routes** (`specification.md` section 6), so the list
stays behind them and the screen count stays at one.

**Create** (`Create User`), fields in order: `Name`, `Email Address`, `Role` (a select of the
three roles), `Status` (Active / Inactive), `Initial Password`. Primary `Create User`, busy label
`Creating…`, secondary `Cancel`.

The password rules are stated below the Initial Password field, in the same words as section 6.1's
BR-12 message, by the **same validator** the Change Password screen uses (FR-17, BR-14).

A muted line sits above the button: `The user must change this password when they first sign in.`
(BR-16, AC-85). There is no "email the password" option and no "send invitation" checkbox -
`LS 4.2` excludes email of every kind (C-79).

**Edit**, fields: `Name`, `Email Address`, `Role`, `Status`, and **nothing else** (FR-60, BR-76).
No password field: a password is reset by the separate action below, never edited inline.

Below the Edit form, a tertiary `Set a new initial password` opens a third panel with one
`Initial Password` field, the same validator, a primary `Set Password` button, and a muted line
`This ends the user's sessions and requires them to choose a new password at their next sign-in.`
(BR-78, AC-91).

**Editing your own row is permitted**, and the Role select is not disabled on it - self role
change is allowed, and blocking it would make the last-Administrator rule unreachable from the UI
(BR-82, C-81). The Status control **is** disabled on your own row, with the muted line
`You cannot deactivate your own account.` (BR-79, FR-63) - and the backend refuses it anyway
(AC-92).

### 17.3 States

**Modes:** list, create, edit, set-initial-password.

| State | Presentation |
|---|---|
| Loading | Five-row skeleton, `aria-busy="true"` |
| Populated | The list above |
| Empty | Heading `No users yet`, which is unreachable in practice - the seed guarantees accounts - but specified so the component exists |
| No results | Heading `No matches`, body `No users match your search or filter.`, secondary `Clear filters` |
| Validating | Field messages from section 6.1 below each control |
| Duplicate email | The `EMAIL_TAKEN` message **at the Email Address field**, not as a banner (BR-77, FR-62, AC-87) |
| Self-deactivation refused | The `SELF_DEACTIVATION` message inline at the Status control (AC-92) |
| Last Administrator refused | The `LAST_ADMINISTRATOR` message as a form-level banner in the panel, because it is about the system's state rather than about one field the Administrator typed (AC-93, AC-94) |
| Saving | The panel's primary button busy and disabled; all fields disabled |
| Success | A `--tk-pale` panel with a check icon and `User created.` or `Changes saved.` or `Initial password set.`, the panel closes, and the list refetches |
| Forbidden | Section 20's forbidden state, with no user data fetched (AC-97) |
| Failure | The `INTERNAL_ERROR` banner with `Retry`; entered values are retained |

The distinction between the duplicate-email message and the last-Administrator message is
deliberate: one names a field the Administrator can fix, the other names a state of the system
that no edit to this form will change.

---

## 18. Screen: Check System

**Unchanged from Lab 1 and public** (C-87, FR-69). It calls only public endpoints, renders without
the shell, and appears in no role's navigation.

Its Lab 1 test renders the component directly and survives untouched
(`phase1-analysis.md` section 3).

---

## 19. Public Comments versus Internal Notes

`LS 8.4` requires the two to be visually distinct, and AC-107 tests it. This section is that
distinction, and it is the most safety-critical layout rule in the document: the failure it guards
against is a staff user typing private text into the public box.

**Seven differences**, so that no single one carrying the meaning can be lost to a theme change,
a greyscale screenshot or a colour-blind reader.

| | Public Comments | Internal Notes |
|---|---|---|
| Ground | `--tk-surface` (white) | `--tk-internal-bg` (`#F3F1E7`, warm ivory) |
| Border | None beyond the card | 1 px `--tk-internal-border`, on all four sides |
| Heading | `Public Comments` | `Internal Notes` |
| Standing label | `Visible to the Requester.` in `--tk-text-muted` | **`Not visible to the Requester.`** in `--tk-internal-border`'s text-safe pair, 600 weight, **always present** - never a tooltip, never on hover (AC-107) |
| Icon | Outline speech bubble | Outline padlock |
| Composer label | `Add a comment` | `Add an internal note` |
| Submit button | Primary `Post Comment` | Secondary `Add Note`, visibly not the primary action of the card |

**The two composers are never adjacent without that separation** (`specification.md` section 6).
The Internal Notes section is rendered as a distinct bordered panel **below** the Public Comments
section with 1.5 rem of space between them, and the notes panel's heading, padlock and standing
label all sit **above** its textarea, so the label is read before the typing starts.

**The standing label is not dismissible and does not scroll out of the panel.** On mobile, where
the two sections stack and the heading can leave the viewport, the label is repeated as
placeholder text inside the note textarea: `Not visible to the Requester…`.

**In greyscale** the ivory ground reads as a light tint and the border as a hard edge; the padlock
and the standing label carry the meaning regardless. That is the property AC-107 is checked
against, on greyscale conversions of the captures (section 24).

Both lists are newest first, both render bodies as plain text with `white-space: pre-wrap`, both
composers carry the `n / 2000` live counter, and **neither offers an edit or a delete control** -
append-only in the UI as in the API (BR-63, BR-66, BR-67, FR-51, FR-53).

**The Internal Notes section does not exist on any Requester-facing screen** - not collapsed, not
locked, not as a count (section 14.2, FR-29, AC-54).

---

## 20. Modes and feedback states

Per `LS 8.6`. Every screen that fetches or writes provides every state reachable on it (FR-67).
A state that cannot occur on a screen is marked `-`, and a state marked `-` has no component,
rather than an unreachable one.

| Screen | Loading | Saving | Success | Validation | Empty | No results | Forbidden | Not found | Conflict | Failure |
|---|---|---|---|---|---|---|---|---|---|---|
| Login | - | Y | - | Y | - | - | - | - | - | Y |
| Change Password | - | Y | Y | Y | - | - | - | - | - | Y |
| My Tickets | Y | - | - | - | Y | Y | Y | - | - | Y |
| Create Ticket | Y | Y | Y | Y | - | - | Y | - | - | Y |
| Requester Ticket Detail | Y | Y | Y | Y | Y | - | Y | Y | Y | Y |
| IT Staff Ticket Queue | Y | - | - | Y | Y | Y | Y | - | - | Y |
| IT Staff Ticket Detail | Y | Y | Y | Y | Y | - | Y | Y | Y | Y |
| User Management | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Check System | Y | - | - | - | - | - | - | - | - | Y |

Notes on the cells that are easy to get wrong:

- **Login has no success state.** Success is navigation; a success panel on a screen the user
  immediately leaves is a flash of nothing.
- **Login has no forbidden state.** The inactive-account refusal is a banner on Login itself, not
  the forbidden screen - the person is not authenticated, so there is no role to forbid.
- **Requester Ticket Detail has an empty state**: no Public Comments yet (section 14.2). Its
  conflict state is the resolution indication refused in the wrong status.
- **IT Staff Ticket Detail's empty state is per-section, not per-screen.** The screen always has a
  Ticket to show, so the state belongs to its two lists: `No comments yet.` in the Public Comments
  section and `No internal notes yet.` in the Internal Notes panel, each with its composer still
  present. Both render in `--tk-text-muted`, and the notes panel keeps its border and standing
  label when empty - an empty private panel must still say it is private.
- **IT Staff Ticket Detail's conflict state** is the claim race and the two `OWNER_REQUIRED`
  refusals - three conflicts, all rendered inline in the operations card rather than as banners,
  because each names a control (section 16.2).
- **My Tickets and the Queue have no saving state.** Neither writes.

### 20.1 The shared state components

| State | Presentation |
|---|---|
| **Loading** | Skeleton rows or cards matching the shape that will replace them, with `aria-busy="true"` on the region. Never a bare spinner on a full page |
| **Saving** | The acting button busy and disabled per section 7; the fields it writes disabled. Never a full-page overlay |
| **Success** | A `--tk-pale` panel with a check icon **and** a sentence, `aria-live="polite"`. **Never colour alone** (`CLAUDE.md`) |
| **Validation** | Per-field messages below each control (section 5), plus a form-level banner only when the failure belongs to no field |
| **Empty** | Heading, explanatory body, an outline document icon, and an action **only where one exists** |
| **No results** | Heading `No matches`, a body naming the search or filter, an outline magnifier icon, and `Clear filters` |
| **Forbidden** | A centered card within the shell: heading `You do not have access to that page.`, body `Your role does not allow this. Choose a destination from the menu above.`, and a primary link to the role's landing screen. **No data is fetched for the screen behind it** (FR-24, AC-97) |
| **Not found** | Heading `That item does not exist.`, body naming what was addressed, and a secondary link back to the list |
| **Conflict** | An inline panel beside the control that caused it, carrying the section 6.2 message, plus a refreshed view where the conflict changed the data (section 16.2) |
| **Failure** | A `--tk-danger` panel with the `INTERNAL_ERROR` message and a `Retry` where retrying is meaningful, `aria-live="assertive"`, keeping any toolbar so the user's filters are not lost |

**Forbidden and Not found are different components**, and which one a screen shows is decided by
the status the API returned, never by the client's own guess: 403 renders Forbidden, 404 renders
Not found. That is what makes the C-65 split visible to a person as well as to a test.

---

## 21. Responsive rules

Unchanged from Lab 2 (`LS 8.7`), applied to the four new screens.

At **1280, 834 and 390 px**, on every one of the nine screens (FR-68, AC-106):

- No clipped label.
- No overlapping message.
- No hidden or unreachable control.
- **No horizontal page scrolling**, asserted as
  `document.documentElement.scrollWidth <= window.innerWidth`.
- Mobile renders **cards, not a scrolling table**, on My Tickets, the Ticket Queue and User
  Management.
- Every touch target is at least **44 px** below `md` (section 4, carried from Lab 2 Issue #16).

The two tables Lab 3 adds - the Queue and the User list - are the two places this is most easily
broken, because both are wider than Lab 2's. Section 15.3 and 15.4 fix the Queue's degradation;
section 17.1 fixes the user list's.

---

## 22. Accessibility rules

Carried from Lab 2 and extended to the Lab 3 controls.

| Rule | Applies to |
|---|---|
| Every control has a visible `<label>` bound by `for`/`id` | All form controls, including the three password fields and both composers |
| Focus ring never suppressed without a replacement | All focusable elements |
| `aria-invalid` and `aria-describedby` on failure | All validated controls |
| `aria-busy` on regions and buttons during requests | Loading regions, busy buttons |
| `aria-current="page"` on the active nav item | Shell |
| `aria-live="polite"` on the results count, the success panel and the character counter | Queue, User Management, every success panel, both composers |
| `aria-live="assertive"` on API failure banners and on conflict panels | All screens |
| Modal uses `role="dialog"`, `aria-modal`, focus trap, focus restore | The resolution-indication confirmation, the three status confirmations, the attachment removal dialog |
| Meaning never carried by colour alone | All four badge families, both markers, validation, success, active nav, the Status column, the comment/note distinction |
| Contrast at least 4.5:1 for text | All text tokens, including the three added in section 2.4 |
| `autocomplete` set correctly on password fields | Login, Change Password, both Administrator password panels |

**The Internal Notes panel's standing label is text, not an ARIA attribute.** A screen reader and a
sighted user must both receive it, and `aria-label` on a container is read at a time the user may
not be about to type.

---

## 23. Screenshot paths

Written by the Playwright specs into the four folders `LS 12` fixes (C-90). `<vp>` is one of
`desktop`, `tablet`, `mobile`, corresponding to 1280, 834 and 390 px. `tests.md` references these
paths verbatim.

```
artifacts/lab-03/screenshots/
├── authentication/
│   ├── login-<vp>-initial.png
│   ├── login-<vp>-validation.png
│   ├── login-<vp>-submitting.png
│   ├── login-<vp>-invalid-credentials.png
│   ├── login-<vp>-inactive-account.png
│   ├── login-<vp>-failure.png
│   ├── change-password-<vp>-initial.png
│   ├── change-password-<vp>-validation.png
│   ├── change-password-<vp>-success.png
│   ├── shell-<vp>-requester.png
│   ├── shell-<vp>-it-staff.png
│   ├── shell-<vp>-administrator.png
│   └── logout-<vp>-blocked-after.png
├── staff-queue/
│   ├── queue-<vp>-populated.png
│   ├── queue-<vp>-loading.png
│   ├── queue-<vp>-empty.png
│   ├── queue-<vp>-no-results.png
│   ├── queue-<vp>-failure.png
│   ├── queue-<vp>-search.png
│   ├── queue-<vp>-filters.png
│   ├── queue-<vp>-sorted.png
│   ├── queue-<vp>-page-2.png
│   ├── queue-<vp>-unassigned.png
│   └── queue-<vp>-forbidden.png
├── staff-ticket-detail/
│   ├── detail-<vp>-unassigned.png
│   ├── detail-<vp>-owned.png
│   ├── detail-<vp>-claim-conflict.png
│   ├── detail-<vp>-it-priority.png
│   ├── detail-<vp>-status-menu.png
│   ├── detail-<vp>-status-confirm.png
│   ├── detail-<vp>-status-refused.png
│   ├── detail-<vp>-comments-and-notes.png
│   ├── detail-<vp>-requester-resolved.png
│   ├── detail-<vp>-inactive-owner.png
│   └── detail-<vp>-terminal.png
└── user-management/
    ├── users-<vp>-populated.png
    ├── users-<vp>-search.png
    ├── users-<vp>-role-filter.png
    ├── users-<vp>-create.png
    ├── users-<vp>-edit.png
    ├── users-<vp>-duplicate-email.png
    ├── users-<vp>-self-deactivation.png
    ├── users-<vp>-last-administrator.png
    ├── users-<vp>-initial-password.png
    └── users-<vp>-forbidden.png
```

**Why each group exists**, since `LS 14` is what the grader reads them against:

- `authentication/` covers `LS 14` Part 5 entire: valid login, invalid login, inactive account,
  the busy state, safe failure, the mandatory first-password change, the authenticated user and
  role display for all three roles, and a direct URL blocked after logout.
- `staff-queue/` covers Part 6: search, each filter, sorting, pagination, assigned and unassigned
  ownership, and the empty, no-results and failure states. `queue-<vp>-forbidden.png` is the
  Requester refused, which is Part 7's role-restriction evidence captured where it happens.
- `staff-ticket-detail/` covers Part 7: claim, the lost race, reassign, IT Priority, a permitted
  status change with its confirmation, a refused one, a Public Comment and an Internal Note in one
  frame (the AC-107 capture), the Requester resolution indication, and the inactive-owner marker.
- `user-management/` covers Part 8: the full `LS 8.5` list, duplicate-email rejection,
  self-deactivation prevention, last-Administrator prevention, and a non-Administrator forbidden.

The **Requester** screens keep their Lab 2 screenshot folders under `artifacts/lab-02/`; those
captures are Lab 2 evidence and are not regenerated. Lab 3's Requester additions - the Public
Comments section and the resolution action - are captured in `staff-ticket-detail/` where they
appear beside the staff view, and in the `authentication/` shell captures.

`artifacts/` is tracked; it is evidence (`CLAUDE.md`). `test-results/`, `playwright-report/` and
`blob-report/` stay ignored.

---

## 24. Visual inspection checklist

Completed by hand against the screenshots above, at all three viewports, and recorded in
`tests.md`. `LS 8.8` requires comparison against this document rather than memory. Rows naming a
colour, a height, a width or a count are measured in the browser at each viewport; rows about
legibility, clipping, overlap and greyscale are checked by eye, the greyscale ones on greyscale
conversions.

**Colour and tokens**

- [ ] The four fixed hex values of section 2.1 appear unchanged in the built CSS
- [ ] `--tk-surface` is `#FFFFFF` and `--tk-text` is `#1F2A24`
- [ ] The three Lab 3 tokens of section 2.4 are present and used only where section 2.4 says
- [ ] No component hard-codes a hex outside sections 2.1 to 2.4

**Badges - all four families**

- [ ] All eight Current Status values render with the section 8.2 treatment, each as text
- [ ] Priority badges are pills; status and role badges are square-cornered
- [ ] The IT Priority badge renders on **every** Ticket, on every screen that shows one
- [ ] All three Role values render with the section 8.4 treatment
- [ ] `Requester says resolved` renders as a marker, never in the status column
- [ ] `(inactive)` renders inline after an owner's name, not as a badge
- [ ] No badge conveys its meaning by colour alone, checked in greyscale

**Fields and forms**

- [ ] Read-only fields are visibly shaded and distinguishable from editable ones in greyscale
- [ ] On IT Staff Ticket Detail the read-only card and the operations card are visibly different groups in greyscale
- [ ] Every single-line control shares one height per band; the composers and Description are taller
- [ ] Every required field shows the red asterisk
- [ ] Every validation message sits directly below its own control, never only at the top
- [ ] The password rules are visible before typing on Change Password and on Administrator create

**Comments and notes**

- [ ] The Internal Notes panel differs from Public Comments on all seven counts of section 19
- [ ] The `Not visible to the Requester.` label is always present, never a tooltip or hover
- [ ] The distinction survives greyscale conversion
- [ ] No Internal Note content, count or placeholder appears on any Requester screen
- [ ] Neither list offers an edit or a delete control

**States**

- [ ] Every `Y` cell of the section 20 matrix renders as section 20.1 specifies
- [ ] Empty and no-results differ in heading, body, icon and action, on all three list screens
- [ ] Forbidden and Not found are different components
- [ ] Success carries an icon and a sentence, never colour alone
- [ ] The claim conflict renders inline in the owner group, with the view refreshed

**Layout at 1280, 834 and 390 px**

- [ ] No clipped label, no overlapping message, no hidden or unreachable control
- [ ] No horizontal page scrolling
- [ ] The Queue renders a table at `lg`, a table with a second line at `md`, and cards below
- [ ] User Management renders cards below `md`
- [ ] Touch targets are at least 44 px below `md`

**Accessibility**

- [ ] Every interactive control is tab-reachable with a visible focus ring
- [ ] Every control has an accessible name
- [ ] The active nav item carries weight, an underline and `aria-current`
- [ ] Every modal traps focus and restores it on close

**Naming and absence**

- [ ] The strings `Development Requester` and `Change Requester` appear nowhere in the built client
- [ ] The product is spelled `TokTickIT` in every heading, title and label
- [ ] Glossary spellings are used verbatim: `IT Staff`, `Administrator`, `Ticket Owner`, `IT Priority`, `Public Comment`, `Internal Note`, `Initial Password`
- [ ] No Resolution Summary, Service Actions tab, Actions Taken field, SLA indicator or escalation control appears on any screen

---

## 25. Rules this document needed and could not find - all closed

Four items were declared here when this document was first written. Each was recorded with
options and a recommendation, and **none was resolved on this document's authority**
(`CLAUDE.md`). All four are now closed by decision rows, and the sections above cite those rows
directly. The table is kept as the record of what was open and what closed it.

| # | Gap | Closed by | Answer |
|---|---|---|---|
| 1 | **The wrong-current-password refusal had no fixed status code**, so this document could not say whether its message rendered as a field message or a banner | **C-106** | 422 `CURRENT_PASSWORD_INCORRECT`, rendered at the Current Password field, never 401 (sections 6.1, 6.2, 11). This document had recommended 400; the decision took 422, and the rendering is unchanged either way |
| 2 | **No endpoint supplied the list of assignable users**, so the Queue's Ticket Owner filter and the detail screen's assign control had no data source | **C-105** | `GET /api/staff/assignable-users`, IT Staff and Administrator only, `{ id, name, role }` and never an email address. Both controls now name it (sections 15.1, 16.2) |
| 3 | **The user list's sort order was unnamed.** BR-84 said "one sort column" without naming it | **C-107** | A fixed order, name ascending then id, with no user-controlled sort at all (section 17.1) |
| 4 | **`specification.md` disagreed with itself about the queue's tablet columns** - section 6 dropped "Category and Related System", a column FR-39 never creates, and said nothing about Created or Requested Priority. Reported rather than resolved, per `CLAUDE.md` | **C-108** | Six columns kept, three hidden, and **`specification.md` section 6 corrected at its source** so the two stop disagreeing (section 15.3, BR-107) |

Item 4 is the only one of the four that changed a governing document rather than adding to it,
and it is the case `CLAUDE.md`'s "report, do not resolve" rule exists for: this document could
have quietly followed either side and no test would have caught the disagreement.

Two readings were **narrow enough to take without a decision row**, recorded so an auditor can see
they were noticed rather than missed:

- **The three tokens added in section 2.4.** `LS 7` offers "soft gray-green **or** warm ivory" for
  read-only shading and Lab 2 took the gray-green; Lab 3 takes the ivory for the Internal Notes
  panel, which is the same sentence's other half rather than a new colour decision. `--tk-info` is
  derived for the one marker that is neither success nor warning.
- **Which Lab 2 screens are re-captured.** `LS 12` fixes four Lab 3 screenshot folders and none is
  for a Requester screen, so the Lab 2 captures stand as Lab 2 evidence (section 23) - the same
  reasoning `docs/lab-02/ui-spec.md` section 18 applied to the Selection screen.
