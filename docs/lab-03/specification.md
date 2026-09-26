# Lab 3 Sprint Engineering Specification

TokTickIT - CPE 334 Individual Sprint 3.
Owner: Tammathorn Kananurak (67070503489).

Sources: `docs/lab-03/spec/Lab_3_sheet.pdf`, `docs/lab-03/decisions.md` (C-53..C-92,
approved) and `docs/lab-03/phase1-analysis.md` (the codebase survey those decisions were
written against; reference, not contract). Trace columns cite `LS x.y` for a labsheet
clause, `C-nn` for a Lab 3 decision and `L2 C-nn` / `L2 BR-nn` for a Lab 2 one.

FR, BR and AC numbering restarts at 01, as `LS 4.4` requires. Lab 2's own FR, BR and AC
numbers keep their meaning inside `docs/lab-02/specification.md` and are never cited bare.

The exact endpoint contract lives in `api-spec.md`; the exact visual contract lives in
`ui-spec.md`; the test plan lives in `tests.md`. Where this document and any of those
disagree, the disagreement is a defect to report, not to resolve locally.

---

## 1. Sprint Goal

TokTickIT stops pretending to know who is using it. A user signs in with an email address
and a password, is forced to replace an initial password before reaching anything else, and
is then shown only the navigation and operations their single role permits - enforced in the
backend on every request, not by hiding buttons. The Lab 2 Requester increment continues
unchanged on that authenticated identity, with Public Comments and a "Problem Appears
Resolved" indication added to Ticket Detail. IT Staff gain their first real workflow: a
shared Ticket Queue with search, filters, sorting and pagination, and a Ticket Detail screen
carrying ownership, IT Priority, permitted status changes, Public Comments and
role-restricted Internal Notes. An Administrator gains one minimalist User Management
screen. Existing Tickets, Attachments and their ownership survive the migration intact.

---

## 2. Stakeholder Request Interpretation

The selector was scaffolding and the stakeholder is asking for the load-bearing version.
Three consequences follow, and they are not equally obvious.

The first is that identity moves from the request into the session. Lab 2 accepted a
`requesterId` from the client on every call; Lab 3 ignores it wherever it appears (C-64).
Every Lab 2 ownership rule survives word for word - only the way the caller's identity is
obtained changes, exactly as `L2 LC-03` anticipated.

The second is that authorization becomes a security boundary rather than a convenience.
Once a boundary exists, the error codes have to stop leaking across it. Lab 2 deliberately
answered 403 for another Requester's Ticket, which admits the Ticket exists; `LS 6.2`
forbids that now, so the same request answers 404 (C-65). The split is **403 when the role
may never perform the operation at all, 404 when the role could but this resource is not
theirs** - and the role check runs before the resource is loaded (C-63), so even the 403
says nothing about existence.

The third is that "IT Staff need a professional Ticket Queue" is a data-shape request, not
only a screen request. Every Lab 2 index is led by `requesterId`, because every Lab 2 query
was scoped to one Requester first. The queue has no requester scope at all, so not one of
those four indexes serves it, and new ones are part of this increment (section 7).

`LS 4.3` asks that Administrator and IT Staff stay conceptually separate, then allows the
authorization matrix to say otherwise explicitly. It is said otherwise, once and on purpose:
`LS 4.5` lets an Administrator be the Ticket Owner, and an owner who cannot act on their own
Ticket is not an owner. C-66 therefore gives an Administrator every IT Staff ticket
permission. The separation that remains is the one that matters for grading - IT Staff hold
**no** user-administration permission whatsoever.

Nothing in the request asks for email, recovery, lockout or self-registration, and `LS 4.2`
forbids all of them. The lab therefore has exactly one recovery path - an Administrator sets
a new initial password - and that shapes several rules below. There is no lockout, because a
locked account could never be unlocked.

---

## 3. Scope

### Included

- Login, logout, current-user retrieval and the mandatory first-login password change
- Three roles - Requester, IT Staff, Administrator - one per user, with role-derived
  navigation and server-side authorization and ownership on every protected route
- Migration of the Lab 2 `RequesterUser` rows into the `User` model without disturbing
  `Ticket.requesterId`, and removal of the Development Requester selector and all of its
  client-side state
- Continuation of every Lab 2 Requester function on the authenticated identity
- IT Staff Ticket Queue: search, filters, sorting, pagination and simple queue counts
- IT Staff Ticket Detail: ownership (claim, assign, reassign, unassign), IT Priority and
  permitted status changes
- Public Comments (Requester, IT Staff, Administrator) and Internal Notes (IT Staff and
  Administrator only), both append-only
- The Requester "Problem Appears Resolved" indication, which is a flag and not a status
- Minimalist Administrator User Management: list, search, optional role filter, create,
  edit, one-role assignment, activation state and a new initial password
- Loading, saving, success, validation, empty, no-results, forbidden, not-found, conflict
  and safe-failure feedback on every screen that fetches or writes, at 1280, 834 and 390 px
- The Lab 1 Check System page, unchanged and public (C-87)

### Excluded

Per `LS 4.2` and `LS 8.5`, and not to be added even partially:

- Email of any kind: invitations, password-reset mail, initial passwords by mail
- Multi-factor authentication, SSO, social login, self-registration, Requester-created
  accounts
- Account lockout, unlocking, recovery, and administrator approval workflows
- Actions Taken, SLA calculation, escalation rules, notification services
- Dashboards and KPI analytics beyond simple queue counts
- Multi-tenancy, organizations, departments, extended user profiles, profile photos
- Multiple roles per user, role history, account-audit screens
- User deletion, bulk user operations, user import or export
- User-list pagination, multi-column sorting, multiple simultaneous filters on the user list
- Administrator management of reference data - `LS 8.5` asks for one User Management screen
- Production deployment and cloud infrastructure

Deferred to Lab 4 and deliberately not prepared for: the Resolution Summary, the "Service
Actions" tab, and the rule that blocks resolution while Actions Taken remain incomplete
(`LS 4.5`).

Ticket **edit mode** stays deferred for the Requester (`L2 C-06`). A Requester still has no
Ticket field they may legitimately edit; what Lab 3 gives them is a comment and a flag, not
an edit.

---

## 4. Functional Requirements

### 4.1 Authentication, session and shell

| ID | Requirement | Trace |
|---|---|---|
| FR-01 | The Login screen shall capture an email address and a password, validate that both are present before submitting, and show a busy state while the request is in flight. | LS 8.1 |
| FR-02 | The backend shall authenticate an active user by email address and password and establish an authenticated session. | LS 6, BR-01 |
| FR-03 | The backend shall refuse an unknown email, a wrong password and an account with no stored password hash with one identical generic failure. | C-59, BR-07 |
| FR-04 | The backend shall refuse an inactive account with a distinct inactive-account response, returned only after the supplied password has been verified. | C-59, BR-09 |
| FR-05 | The backend shall expose the current authenticated user's id, name, email, role, activation state and password-change state. | C-61, BR-33 |
| FR-06 | The backend shall provide a logout operation that invalidates the calling session and clears its cookie. | LS 6.1, C-54 |
| FR-07 | After logout, a direct API call or a bookmarked screen shall be refused and the client shall show the Login screen. | LS 14 Part 5, BR-23 |
| FR-08 | A session shall expire 8 hours after it is created, after which the client shall show the Login screen with an explanation that the session ended. | C-55 |
| FR-09 | The application shell shall display the authenticated user's name and a role badge and shall offer Logout. No "Development Requester" display and no Change Requester control shall exist anywhere. | LS 7, LS 8.2 |
| FR-10 | The shell shall derive its navigation from the authenticated role and shall not present unauthorized destinations. | LS 7, BR-36 |
| FR-11 | The client shall hold no identity in `localStorage`, `sessionStorage` or any other browser storage, and shall learn who it is from the current-user endpoint. | C-54, C-56 |
| FR-12 | The client shall treat a 401 from any request as a lost session: it discards the in-memory user and shows the Login screen rather than a generic error. | LS 14 Part 5 |
| FR-13 | The backend shall reject a state-changing request whose `Origin` header is present and is not the configured client origin, and shall accept one carrying no `Origin` header. | C-58 |

### 4.2 Mandatory first-login password change

| ID | Requirement | Trace |
|---|---|---|
| FR-14 | When the authenticated user must change their password, the client shall render only the Change Password screen until a valid new password is saved. | LS 8.1, BR-02 |
| FR-15 | The Change Password screen shall show the authenticated user's name and role. | C-61 |
| FR-16 | The Change Password screen shall capture the current password, the new password and a confirmation, and shall state the password rules before submission. | C-60, C-61 |
| FR-17 | One password validator shall serve Change Password, Administrator user creation and Administrator set-initial-password, on the client and on the server. | C-60 |
| FR-18 | On a successful change the password-change state shall clear and the user shall continue into the landing screen for their role. | LS 8.1 |
| FR-19 | While the password-change state is set, the backend shall refuse every protected route except current-user, change-password and logout. | C-61, C-63, BR-19 |

### 4.3 Authorization

| ID | Requirement | Trace |
|---|---|---|
| FR-20 | Server middleware shall apply the fixed check order to every protected route: session, password-change gate, role, parameter parsing, resource load, ownership, body validation. | C-63 |
| FR-21 | Role restriction shall follow the authorization matrix in section 5.2 and shall be enforced in middleware, never in a screen. | LS 4.3, C-66 |
| FR-22 | Requester ownership shall be enforced on every Ticket, Attachment, Public Comment and resolution-indication request. | LS 4.3, BR-42 |
| FR-23 | A resource the caller may not see shall answer 404 and an operation the role may never perform shall answer 403, the role check running before the resource is loaded. | C-63, C-65 |
| FR-24 | The client shall render a forbidden state, not a blank screen or a generic error, when a destination the user reached anyway is refused. | LS 8.6 |

### 4.4 Requester regression, Public Comments and resolution indication

| ID | Requirement | Trace |
|---|---|---|
| FR-25 | Create Ticket, My Tickets, Requester Ticket Detail and every Attachment operation shall continue to work, unchanged in behavior, on the authenticated Requester identity. | LS 8.2 |
| FR-26 | A `requesterId` supplied in a query string or a request body shall have no effect on any route. | C-64, BR-03 |
| FR-27 | Requester Ticket Detail shall list that Ticket's Public Comments newest first, each with its author's name and creation time. | LS 4.6, C-74 |
| FR-28 | The owning Requester shall be able to post a Public Comment on their own Ticket. | LS 4.6, BR-04 |
| FR-29 | No Requester-facing payload or screen shall carry Internal Note content, a note count, or any key revealing that notes exist. | BR-04, AC-04 |
| FR-30 | Requester Ticket Detail shall offer a "Problem Appears Resolved" action, enabled only while the Ticket is Open, In Progress, Waiting for Requester or Reopened, confirmed before it is sent, and shall show a clear indication afterwards. | C-76 |
| FR-31 | The IT Priority badge shall render on every Ticket for every audience, because IT Priority is never null after this sprint. | C-71 |
| FR-32 | The My Tickets status filter shall offer all eight statuses. | C-70 |

### 4.5 IT Staff Ticket Queue

| ID | Requirement | Trace |
|---|---|---|
| FR-33 | The Ticket Queue shall list Tickets across all Requesters for IT Staff and Administrator users. | LS 8.3 |
| FR-34 | The queue shall search by Ticket Number and Ticket Summary. | C-78 |
| FR-35 | The queue shall filter by Current Status, IT Priority, Ticket Owner (me, unassigned, or a named user) and Category, in any combination. | C-78 |
| FR-36 | The queue shall sort by created date, last updated, IT Priority, Ticket Number or Current Status, ascending or descending. | C-78 |
| FR-37 | The queue shall page results at 10, 25 or 50 rows, defaulting to 10, and shall expose the pagination metadata the API returns. | C-78, L2 C-27 |
| FR-38 | With no query supplied, the queue shall exclude Closed and Cancelled Tickets and order by IT Priority high to low, then oldest first. | C-78 |
| FR-39 | The queue shall show Ticket Number, Created Date, Ticket Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner and Last Updated, as a table on desktop and a card list on mobile, with an action that opens Ticket Detail. | LS 8.3 |
| FR-40 | The queue shall distinguish assigned from unassigned ownership at a glance and shall mark a Ticket whose Requester has indicated the problem appears resolved. | LS 8.3, C-76 |
| FR-41 | The queue shall render loading, empty, no-results, forbidden and safe-failure states, empty and no-results being visibly distinct. | LS 8.3, L2 C-28 |
| FR-42 | An invalid queue parameter shall be refused by the backend with a field-level message that the screen presents beside the offending control. | C-78, L2 C-43 |

### 4.6 IT Staff Ticket Detail

| ID | Requirement | Trace |
|---|---|---|
| FR-43 | IT Staff Ticket Detail shall present the whole Ticket - Requester, Category, Related System, Ticket Summary, Description, Requested Priority, dates - with only the permitted operational fields editable. | LS 8.4 |
| FR-44 | The screen shall offer Claim when the Ticket is unassigned and shall handle a lost race with a clear conflict message and a refreshed view. | C-75 |
| FR-45 | The screen shall offer assign, reassign and unassign, choosing from active IT Staff and Administrator users only. | C-75, C-66 |
| FR-46 | A Ticket owned by a user who has since been deactivated shall display that owner marked "(inactive)" until the Ticket is reassigned. | C-75 |
| FR-47 | The screen shall allow IT Priority to be changed to LOW, MEDIUM or HIGH. | LS 4.5, C-71 |
| FR-48 | The screen shall offer only the status transitions permitted from the current status by the matrix in section 5.1 and shall require a confirmation step for Resolved, Closed and Cancelled. | LS 4.5 |
| FR-49 | The screen shall show the existing Attachments, including removed ones as metadata, and shall allow an active Attachment to be downloaded or previewed. | LS 8.4, L2 BR-50 |
| FR-50 | The screen shall show the Requester's "Problem Appears Resolved" indication when it is set and shall not present it as a status. | C-76 |

### 4.7 Public Comments and Internal Notes

| ID | Requirement | Trace |
|---|---|---|
| FR-51 | Public Comments and Internal Notes shall be append-only: no edit and no delete control exists, and no endpoint accepts one. | LS 4.6 |
| FR-52 | Each entry shall record its author and creation time from the backend; a client-supplied author or timestamp shall be ignored. | LS 4.6, C-64 |
| FR-53 | Content shall be trimmed, rejected when empty or whitespace-only, and limited to 2000 characters, with a live counter on the composer. | C-74 |
| FR-54 | Content shall be rendered as plain text preserving line breaks, never as HTML. | C-74 |
| FR-55 | Internal Notes shall be readable and writable only by IT Staff and Administrator users, and shall be visually distinct from Public Comments so that private text cannot be posted publicly by mistake. | LS 4.6, LS 8.4, BR-04 |

### 4.8 Administrator user management

| ID | Requirement | Trace |
|---|---|---|
| FR-56 | The User Management screen shall list users showing Name, Email, Role, Status and an Edit action. | LS 8.5 |
| FR-57 | The screen shall search users by name or email address. | LS 8.5 |
| FR-58 | The screen shall offer an optional single role filter. | LS 8.5 |
| FR-59 | The screen shall create a user with a name, an email address, exactly one permitted role, an activation state and an initial password. | LS 8.5, C-79 |
| FR-60 | The screen shall edit a user's name, email address, role and activation state, and nothing else. | LS 4.4, LS 8.5 |
| FR-61 | The screen shall set a new initial password that the user must change at their next login. | LS 8.5, C-79 |
| FR-62 | A duplicate email address shall be refused and reported at the email field. | C-82 |
| FR-63 | An Administrator shall be prevented from deactivating their own account. | C-81 |
| FR-64 | The system shall be prevented from having no active Administrator, on deactivation and on role change alike. | C-80 |
| FR-65 | A non-Administrator shall be refused by the backend and shown a forbidden state, whether they arrive by navigation or by URL. | LS 8.5, C-65 |
| FR-66 | The user list shall have no pagination, no multi-column sorting, no bulk operation, no import or export and no delete. | LS 4.2, LS 8.5 |

### 4.9 Cross-cutting

| ID | Requirement | Trace |
|---|---|---|
| FR-67 | Every screen shall provide visible loading, saving, success, validation, empty, no-results, forbidden, not-found, conflict and safe-failure feedback wherever that condition is reachable. | LS 7, LS 8.6 |
| FR-68 | Every Lab 3 screen shall be usable at 1280, 834 and 390 px with no clipping, overlap, hidden control or horizontal page scroll. | LS 7, LS 8.7 |
| FR-69 | The Lab 1 API contract and the Check System page shall remain public and unchanged. | C-62, C-87 |
| FR-70 | No response body and no log line shall contain a password, a password hash or a session token, on any path, including error paths. | LS 6.1 |

**70 functional requirements.**

---

## 5. Business Rules

BR-01 to BR-05 are the five mandatory rules of `LS 4.4`, reproduced in the labsheet's own
words. BR-06 onwards are this sprint's rules, grouped by the areas `LS 4.4` names. The Area
column exists so that coverage is checkable by grouping it: every area `LS 4.4` lists -
login attempts, password handling, logout, inactive users, duplicate email addresses,
current-user behavior, Ticket ownership, IT Staff assignment, IT Priority, Public Comments,
Internal Notes, status transitions, validation, failures and regression - carries at least
one rule, as do the seven Administrator rules and the password-change gate of BR-02.

| ID | Area | Rule | Trace |
|---|---|---|---|
| BR-01 | Authentication | Only an active user with valid credentials may authenticate. | LS 4.4 BR-01 |
| BR-02 | Password-change gate | A user marked as requiring a password change cannot enter the normal application until a new valid password is saved. | LS 4.4 BR-02 |
| BR-03 | Ticket ownership | The authenticated user identity, not a `requesterId` supplied by the client, determines ownership of Requester operations. | LS 4.4 BR-03 |
| BR-04 | Public Comments; Internal Notes | Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator. | LS 4.4 BR-04 |
| BR-05 | Status transitions | A Requester may indicate that the problem appears resolved, but cannot formally set the Ticket to Resolved or Closed. | LS 4.4 BR-05 |
| BR-06 | Login attempts | Credentials are an email address and a password. Email addresses are stored lower-case and compared case-insensitively. | C-59 |
| BR-07 | Login attempts | An unknown email address, a wrong password and an account whose stored password hash is NULL produce one identical generic 401 with the same message and the same response shape. | C-59 |
| BR-08 | Login attempts | There is no lockout, no attempt counter and no artificial delay. `LS 4.2` excludes account unlocking, so a lockout could never be undone. | C-59 |
| BR-09 | Login attempts; Inactive users | An account that exists and whose password matched, but which is inactive, is refused 403 `ACCOUNT_INACTIVE`. The inactive state is revealed only to a caller who already holds the correct password. | C-59 |
| BR-10 | Login attempts | A successful login returns the user's id, name, email, role and password-change state, and nothing else. It never returns a password, a hash or the session token in the body. | C-54, LS 6.1 |
| BR-11 | Password handling | A password is stored only as a scrypt derivation with a per-user 16-byte salt, in the single format `scrypt$N$r$p$salt$hash`, and is verified with `timingSafeEqual`. Plaintext is never stored, logged or returned. | C-53 |
| BR-12 | Password handling; Validation | A valid password is 8 to 128 characters and contains an upper-case letter, a lower-case letter, a digit and a special character. | C-60 |
| BR-13 | Password handling; Validation | The new password must differ from the current one, and the confirmation field must match it. | C-60 |
| BR-14 | Password handling | One validator enforces BR-12 and BR-13 for Change Password, Administrator create and Administrator set-initial-password alike. | C-60 |
| BR-15 | Password handling | Changing one's own password requires the current password, so a stolen session alone cannot change it. | C-61 |
| BR-16 | Password handling | A user created by an Administrator, and a user given a new initial password, is marked as requiring a password change. | C-79 |
| BR-17 | Password handling | A NULL password hash can never authenticate; it behaves exactly as a wrong password (BR-07). | C-72 |
| BR-18 | Password-change gate | A successful password change clears the requirement and keeps the calling session working. | C-61, C-97 |
| BR-19 | Password-change gate | While the requirement is set, every protected route except current-user, change-password and logout answers 403 `PASSWORD_CHANGE_REQUIRED`, the gate running immediately after the session check. It is never 401, because the caller is authenticated and must keep the session to change the password. | C-61, C-63, C-99 |
| BR-20 | Password-change gate | The client showing only the Change Password screen is feedback. The gate is the server check; reaching a screen by URL changes nothing. | LS 4.3 |
| BR-21 | Logout; Sessions | A session is a row in the `Session` table. A 32-byte random token travels in the `tt_session` cookie, only its SHA-256 is stored, and the cookie carries `HttpOnly; SameSite=Strict; Path=/`. | C-54 |
| BR-22 | Logout; Sessions | A session lasts 8 hours from creation, absolutely, with no sliding renewal. An expired session is indistinguishable from no session, and its row is deleted by the lookup that finds it expired (BR-101). | C-55, C-96 |
| BR-23 | Logout | Logout deletes the calling session row and clears the cookie; the token is thereafter unusable. Logout ends the calling session only. | C-54, C-55 |
| BR-24 | Logout; Inactive users | Deactivation, a role change and a new initial password each end **all** of that user's sessions; a self-service password change ends all of them except the calling one (BR-102). Session validation additionally rejects a session whose user has become inactive. | C-55, C-97 |
| BR-25 | Logout | The client stores no identity anywhere in the browser. Nothing survives logout on the client because nothing was written. | C-54, supersedes `L2 C-32` |
| BR-26 | Sessions | The Vite dev server proxies `/api`, making the application same-origin, and `VITE_API_URL` is set explicitly to the empty string because `client/src/api.ts` uses `??` and an unset variable would fall back to a cross-origin URL. | C-56 |
| BR-27 | Sessions | CSRF cover is `SameSite=Strict` plus an `Origin` check: a state-changing request whose `Origin` header is present and is not `CLIENT_ORIGIN` is rejected; a request with no `Origin` header is accepted. | C-58 |
| BR-28 | Inactive users | An inactive user cannot log in (BR-09) and loses every existing session at the moment of deactivation (BR-24). | C-55, C-59 |
| BR-29 | Inactive users | An inactive user's Tickets, Attachments, Public Comments and Internal Notes are retained, never deleted. Users are deactivated, never deleted. | `L2 LC-01`, LS 4.4 |
| BR-30 | Inactive users; IT Staff assignment | An inactive IT Staff or Administrator user cannot be assigned as Ticket Owner. A Ticket they already own keeps that owner, displayed "(inactive)", until it is reassigned. | C-75 |
| BR-31 | Current-user behavior | The authenticated identity comes only from the session cookie. Any user identifier in a query string or a request body is ignored on every route. | C-64, BR-03 |
| BR-32 | Current-user behavior | Current-user retrieval works while the password-change requirement is set, so the Change Password screen can show the user's name and role. | C-61 |
| BR-33 | Current-user behavior | Current-user retrieval returns id, name, email, role, activation state and password-change state. It never returns a hash or a token. | C-61, LS 6.1 |
| BR-34 | Current-user behavior | Any 401 means the session is gone. The client discards its in-memory user and shows Login rather than a generic failure. | LS 14 Part 5 |
| BR-35 | Roles | A user holds exactly one role: `REQUESTER`, `IT_STAFF` or `ADMINISTRATOR`. Multiple roles per user do not exist. | C-69, LS 4.2 |
| BR-36 | Roles | Navigation is derived from the role: Requester sees My Tickets and Create Ticket; IT Staff sees the Ticket Queue; Administrator sees the Ticket Queue and User Management. No unauthorized destination is presented. | LS 7, C-66 |
| BR-37 | Roles | Authorization runs in server middleware in the fixed order session, password-change gate, role, parameter parsing, resource load, ownership, body validation. | C-63 |
| BR-38 | Roles; Failures | 403 is returned when the role may never perform the operation, 404 when the role could but this resource is not theirs. Because the role check precedes the resource load, a 403 is returned whether or not the resource exists. | C-63, C-65 |
| BR-39 | Roles | An Administrator holds every IT Staff ticket permission - queue, staff detail, claim, assign, reassign, IT Priority, status changes, Public Comments and Internal Notes. No permission crosses the other way: IT Staff hold no user-administration permission. | C-66 |
| BR-40 | Roles | A hidden or disabled control is useful feedback and is not a security control. Every protected operation is refused by the backend when it is reached directly. | LS 4.3 |
| BR-41 | Ticket ownership | A Ticket's Requester is the authenticated user at the moment of creation and never changes thereafter. | `L2 BR-06`, C-64 |
| BR-42 | Ticket ownership | A Requester may read and act on their own Tickets only, and on those Tickets' Attachments and Public Comments only. A Ticket or Attachment belonging to another Requester answers 404. | C-65 |
| BR-43 | Ticket ownership | Every Requester list query is scoped to the authenticated user before any search, filter or sort is applied. | `L2 BR-22`, C-64 |
| BR-44 | Ticket ownership | A soft-removed Attachment answers 410 to a caller permitted to see the Ticket and 404 to one who is not. | C-65, supersedes `L2 C-20` |
| BR-45 | IT Staff assignment | A Ticket has zero or one Ticket Owner, who must be an active IT Staff or Administrator user. A Ticket may stay unassigned indefinitely. | LS 4.5, C-66, C-75 |
| BR-46 | IT Staff assignment | Claim assigns the calling user only while the Ticket is unassigned, through one conditional update. If another user won the race the answer is 409 `ALREADY_OWNED` and the current owner is shown. | C-75 |
| BR-47 | IT Staff assignment | Assign and reassign accept any active IT Staff or Administrator user. Unassign returns the Ticket to the unassigned pool, except while it is being worked on (BR-97). | C-75, C-104 |
| BR-48 | IT Staff assignment | Assigning a Requester, an inactive user or an unknown user is refused 422: the body is well formed and the refusal is about the value it names. | C-75, C-100 |
| BR-49 | IT Priority | IT Priority is set to the Requested Priority when a Ticket is created, is backfilled the same way for every Ticket that existed before this sprint, and is never null. | C-71, LS 4.5 |
| BR-50 | IT Priority | IT Priority holds `LOW`, `MEDIUM` or `HIGH` and is changed only by an IT Staff or Administrator user. A Requester attempt is refused 403. | LS 4.5, C-66 |
| BR-51 | IT Priority | Requested Priority is the Requester's value and is never editable after creation, by anyone. | LS 4.5 |
| BR-52 | Status transitions | Current Status holds `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED` or `CANCELLED`, and every value is reachable this sprint. | C-70, LS 4.5 |
| BR-53 | Status transitions | A new Ticket begins at `NEW`. | `L2 BR-02` |
| BR-54 | Status transitions | Only an IT Staff or Administrator user changes Current Status. A Requester may never set any status, Resolved and Closed included. | BR-05, LS 4.3 |
| BR-55 | Status transitions | The permitted transitions are exactly those in the matrix in section 5.1. A transition outside the matrix is refused 409 `INVALID_STATUS_TRANSITION` and the Ticket is unchanged. | LS 4.5, C-100 |
| BR-56 | Status transitions | A status change whose target equals the current status is refused 400. The UI never offers it, so the request is a client error and a silent success would hide a bug. | C-77 |
| BR-57 | Status transitions | Moving to Resolved, Closed or Cancelled requires an explicit confirmation step in the UI before the request is sent. | LS 4.5 |
| BR-58 | Status transitions | `CLOSED` and `CANCELLED` are terminal: no transition leaves either. `REOPENED` is reachable only from `RESOLVED`. | LS 4.5, C-98 |
| BR-59 | Status transitions; Resolution indication | The Requester resolution indication is the timestamp `requesterResolvedAt`, not a status. Setting it leaves Current Status untouched. | C-76, BR-05 |
| BR-60 | Resolution indication | Only the owning Requester may set it, and only while the Ticket is Open, In Progress, Waiting for Requester or Reopened. In any other status it is refused 409 `RESOLUTION_NOT_PERMITTED_IN_STATUS`. | C-76, C-100 |
| BR-61 | Resolution indication | It is cleared only by a move to Resolved, Closed or Cancelled. No automatic Public Comment is posted, and IT Staff remain responsible for formally resolving the Ticket. | C-76 |
| BR-62 | Resolution indication | IT Staff see the indication as a badge in the queue and on Ticket Detail. | C-76 |
| BR-63 | Public Comments | Public Comments are append-only. There is no edit and no delete, in the UI or in the API. | LS 4.6 |
| BR-64 | Public Comments; Internal Notes; Validation | Content is trimmed, rejected when empty or whitespace-only, and is 1 to 2000 characters. | C-74 |
| BR-65 | Public Comments; Internal Notes | The author and the creation time are set by the server from the session. A client-supplied author or timestamp is ignored. | LS 4.6, C-64 |
| BR-66 | Public Comments; Internal Notes | Content is rendered as plain text with `white-space: pre-wrap` and never through `dangerouslySetInnerHTML`. | C-74 |
| BR-67 | Public Comments; Internal Notes | Both lists are ordered newest first. | C-74 |
| BR-68 | Public Comments | The owning Requester, IT Staff and Administrator may all read and post Public Comments on a Ticket. | BR-04 |
| BR-69 | Internal Notes | Internal Notes live in their own table, so a notes query cannot structurally leak into a comments response. | C-73 |
| BR-70 | Internal Notes | A Requester calling any Internal Note endpoint is refused 403 before the Ticket is loaded, and receives no note content, no note count and no indication that notes exist. | BR-04, C-63, C-65 |
| BR-71 | Queue query | The queue searches Ticket Number and Ticket Summary; filters on Current Status, IT Priority, Ticket Owner (`me`, `unassigned` or a user id) and Category; and sorts by created date, last updated, IT Priority, Ticket Number or Current Status. | C-78 |
| BR-72 | Queue query | With no query supplied the queue excludes Closed and Cancelled and orders by IT Priority high to low, then oldest first. Page size is 10, 25 or 50, defaulting to 10. | C-78 |
| BR-73 | Queue query | An invalid query parameter is refused 400 `INVALID_QUERY_PARAM` with one message per offending parameter, before anything touches the database. | C-78, `L2 C-43` |
| BR-74 | Queue query | The queue is not scoped to any Requester. A Requester calling it is refused 403. | C-65, C-78 |
| BR-75 | Administrator | An Administrator creates a user with a name, an email address, exactly one permitted role, an activation state and an initial password validated by BR-12. | LS 4.4, C-79 |
| BR-76 | Administrator | An Administrator updates a user's name, email address, role and activation state. No other field is editable and no other administrative action exists. | LS 4.4 |
| BR-77 | Administrator; Duplicate email | An email address already held by another user is refused 409 `EMAIL_TAKEN`, presented at the email field. The comparison is case-insensitive against the stored lower-case value. | C-82, C-59 |
| BR-78 | Administrator | Setting a new initial password marks the user as requiring a password change and revokes that user's sessions. | C-79, C-55 |
| BR-79 | Administrator | An Administrator may not deactivate their own account; the attempt is refused 422 `SELF_DEACTIVATION`. | C-81, C-100 |
| BR-80 | Administrator | The last active Administrator may be neither deactivated nor moved to another role; either attempt is refused 409 `LAST_ADMINISTRATOR`, because the refusal depends on the state of the other `User` rows. The check runs inside a transaction that locks the active-Administrator rows, so two simultaneous deactivations cannot both succeed. | C-80, C-100 |
| BR-81 | Administrator | Users are deactivated, never deleted. No delete endpoint and no delete control exists. | LS 4.4, LS 4.2 |
| BR-82 | Administrator | Self role change is permitted. Blocking it would make BR-80 unreachable from the UI, and Part 8 has to demonstrate BR-80. | C-81 |
| BR-83 | Administrator | A role change revokes that user's sessions, so the new role takes effect at once rather than at their next login. | C-55 |
| BR-84 | Administrator | The user list has no pagination, one sort column and at most the single role filter alongside the search box. | LS 4.2, LS 8.5 |
| BR-85 | Validation | Every Lab 2 field bound is unchanged: Ticket Summary 5 to 120, Description 20 to 5000, the attachment type, size and five-active-slot rules. | `L2 C-25`, LS 8.2 |
| BR-86 | Validation | Body validation runs last in the check order, so an unauthenticated or unauthorized caller never learns whether their body would have been accepted. | C-63 |
| BR-87 | Validation | Every validation message appears directly below its field, one message per rule, drawn from the single catalogue in `ui-spec.md`; the client and server strings match. | LS 7, `L2 BR-35` |
| BR-88 | Failures | No response body and no log line contains a password, a password hash or a session token, on any path, including error paths. | LS 6.1 |
| BR-89 | Failures | A server failure returns a safe generic message carrying no stack trace, SQL, filesystem path or database text, and the screen offers a retry where retrying is meaningful. | `L2 BR-38`, LS 6.2 |
| BR-90 | Failures | Every protected endpoint distinguishes unauthenticated (401), forbidden (403), invalid input (400 or 422), missing resource (404), conflict (409) and unexpected server error (500). | LS 6.2 |
| BR-91 | Regression | Every Lab 2 Requester function keeps its behavior on the authenticated identity, and the Lab 1 and Lab 2 suites keep passing on the final `main`. | LS 8.2 |
| BR-92 | Regression | The Lab 1 contract is unchanged and public - health, categories, related systems and the Check System page. Every other route requires a session. | C-62, C-87 |
| BR-93 | Regression | `GET /api/requesters` is removed. The Administrator user list takes over its only legitimate purpose, and its Lab 2 test retires against that named replacement. | C-62, C-64 |
| BR-94 | Regression | The selector, its React context, its `localStorage` key and its screen are deleted. No stale browser key is read anywhere, ever. | C-56, supersedes `L2 C-32` |
| BR-95 | Regression | No test is deleted, skipped or weakened to make a suite green. A test retires only where a decision row names its replacement, and `tests.md` records the disposition. | `CLAUDE.md`, LS 10 |
| BR-96 | IT Staff assignment; Status transitions | Any active IT Staff or Administrator user may act on any Ticket. Ownership is not required to set IT Priority, change status, post a Public Comment or write an Internal Note - the queue is shared work. | C-93 |
| BR-97 | Status transitions; IT Staff assignment | A Ticket whose status is `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `RESOLVED` must have a Ticket Owner at all times. A move into one of those statuses without an owner, and an unassignment while in one of them, are both refused 409 `OWNER_REQUIRED`, leaving status and ownership unchanged. To release such a Ticket, move it to `OPEN` first. Reassignment to another eligible user stays allowed throughout, because it never leaves the Ticket without an owner. | C-93, C-104 |
| BR-98 | Status transitions | `CLOSED` and `CANCELLED` are terminal, and `REOPENED` is reachable only from `RESOLVED`. | C-98 |
| BR-99 | Validation; Administrator | A user's name is trimmed and is 1 to 100 characters. A user's email address is trimmed, lower-cased, of valid format, and at most 254 characters - the practical limit for an email address. | C-94 |
| BR-100 | Ticket ownership; Public Comments | A Requester sees the Ticket Owner's name, so they know who is handling their Ticket. They never see the Ticket Owner's email address, on any screen or in any payload. | C-95 |
| BR-101 | Sessions | An expired `Session` row is deleted by the lookup that finds it expired. There is no background job and no scheduled sweep, because the stack has no scheduler and an expired row is harmless until it is looked up. | C-96 |
| BR-102 | Password handling; Logout | A successful self-service password change ends all of that user's **other** sessions and keeps the calling one. A stolen session is locked out by the password change. | C-97 |
| BR-103 | Failures | A well-formed request that is refused answers **409** when the refusal is a conflict with the state of the resource or of the rows it depends on - `ALREADY_OWNED`, `OWNER_REQUIRED`, `INVALID_STATUS_TRANSITION`, `RESOLUTION_NOT_PERMITTED_IN_STATUS`, `EMAIL_TAKEN`, `LAST_ADMINISTRATOR` - and **422** when it is about the submitted value - an ineligible assignee, and `SELF_DEACTIVATION`. A same-status move stays 400. Lab 2's five-active-attachment refusal keeps its 422 as a carried Lab 2 contract and is not re-coded here. | C-100, C-77, `L2 BR-39` |

**103 business rules.** BR-96 to BR-103 were added after decisions C-93 to C-104 closed the
gaps the first draft listed. They are appended rather than inserted so that the earlier IDs,
and the acceptance criteria tracing to them, stay stable; the Area column remains the
grouping key.

### 5.1 Status transition matrix

Rows are the current status, columns the target. `Y` is permitted, `-` is refused 409
`INVALID_STATUS_TRANSITION` (BR-55); the diagonal is refused 400 (BR-56). Every permitted
transition in this matrix is performed by an IT Staff or Administrator user and by nobody
else (BR-54). `C` marks a transition that requires a UI confirmation step (BR-57). `*` marks
a status that must have a Ticket Owner: the move in is refused 409 `OWNER_REQUIRED` without
one, and the Ticket cannot be unassigned while it sits there (BR-97, C-93, C-104).

| From \ To | NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED |
|---|---|---|---|---|---|---|---|---|
| **NEW** | - | Y | Y* | - | - | - | - | Y (C) |
| **OPEN** | - | - | Y* | Y* | Y* (C) | - | - | Y (C) |
| **IN_PROGRESS** | - | Y | - | Y* | Y* (C) | - | - | Y (C) |
| **WAITING_FOR_REQUESTER** | - | - | Y* | - | Y* (C) | - | - | Y (C) |
| **RESOLVED** | - | - | - | - | - | Y (C) | Y | - |
| **CLOSED** | - | - | - | - | - | - | - | - |
| **REOPENED** | - | - | Y* | Y* | Y* (C) | - | - | Y (C) |
| **CANCELLED** | - | - | - | - | - | - | - | - |

Reading of the matrix:

- `NEW` means received and untriaged; `OPEN` means triaged and queued; the queue's default
  order therefore surfaces both.
- **`CLOSED` and `CANCELLED` are both terminal, and `REOPENED` is reachable only from
  `RESOLVED`** (C-98). A Ticket that has been closed stays closed.
- `RESOLVED` and `CLOSED` are separate on purpose: resolution is IT Staff's claim that the
  work is done, closing is the administrative end of the Ticket. The window in which a
  Requester can dispute the resolution is therefore the window before it is closed.
- Work may always be abandoned - every non-terminal status may be cancelled - and
  cancellation always confirms, because `CANCELLED` is terminal.
- `REOPENED` behaves as a working status, so it carries the same targets as `IN_PROGRESS`.
- `IN_PROGRESS` to `OPEN` is the only way back to the shared pool. A Ticket in a starred
  status cannot be unassigned where it stands; it is moved to `OPEN` first and released
  there, so no Ticket is ever being worked on with nobody accountable (BR-97, C-104).
- A Requester's "Problem Appears Resolved" indication appears nowhere in this matrix, by
  design (BR-59).

### 5.2 Authorization matrix

Operations are named by capability. `api-spec.md` pins the exact method and path for each,
and is the authority on the request and response shapes; this matrix is the authority on who
may call and what the refusal is.

Columns are the caller: **Anon** (no session or an expired one), **MustChange** (a valid
session whose user must change their password), then the three roles with a valid session and
no outstanding password change. Cells give the status code for a well-formed request.

| Operation | Anon | MustChange | Requester | IT Staff | Administrator |
|---|---|---|---|---|---|
| Health, Categories, Related Systems (public, C-62) | 200 | 200 | 200 | 200 | 200 |
| Log in (public) | 200 / 401 / 403 | 200 | 200 | 200 | 200 |
| Retrieve current user | 401 | 200 | 200 | 200 | 200 |
| Change own password | 401 | 200 | 200 | 200 | 200 |
| Log out | 401 | 204 | 204 | 204 | 204 |
| Create Ticket | 401 | 403 | 201 | 403 [1] | 403 [1] |
| List own Tickets | 401 | 403 | 200 | 403 [1] | 403 [1] |
| Read one Ticket, Requester view | 401 | 403 | own 200 / other 404 | 403 [1] | 403 [1] |
| Upload or soft-remove an Attachment | 401 | 403 | own 200 / other 404 | 403 [2] | 403 [2] |
| Indicate "Problem Appears Resolved" | 401 | 403 | own 200 / other 404 / wrong status 409 | 403 | 403 |
| List Attachment metadata | 401 | 403 | own 200 / other 404 | 200 | 200 |
| Download or preview an Attachment | 401 | 403 | own 200, removed 410 / other 404 | 200, removed 410 | 200, removed 410 |
| List or post Public Comments | 401 | 403 | own 200 / other 404 | 200 | 200 |
| List or create Internal Notes | 401 | 403 | **403** | 200 | 200 |
| IT Staff Ticket Queue | 401 | 403 | **403** | 200 | 200 |
| Read one Ticket, IT Staff view | 401 | 403 | **403** | 200 / missing 404 | 200 / missing 404 |
| Claim a Ticket | 401 | 403 | **403** | 200 / owned 409 | 200 / owned 409 |
| Assign, reassign or unassign | 401 | 403 | **403** | 200 / ineligible 422 / unassign in a worked status 409 | 200 / ineligible 422 / unassign in a worked status 409 |
| Set IT Priority | 401 | 403 | **403** | 200 | 200 |
| Change Current Status | 401 | 403 | **403** | 200 / same 400 / not permitted 409 / no owner 409 | 200 / same 400 / not permitted 409 / no owner 409 |
| List users, with search and role filter | 401 | 403 | **403** | **403** | 200 |
| Create a user | 401 | 403 | **403** | **403** | 201 / duplicate 409 |
| Update name, email, role, activation | 401 | 403 | **403** | **403** | 200 / duplicate 409 / last Administrator 409 / self-deactivation 422 [3] |
| Set a new initial password for a user | 401 | 403 | **403** | **403** | 200 |

Rules the matrix encodes:

- Every 401 is the same body. Every **bold 403** is returned before the addressed resource is
  loaded (C-63), so it is identical whether or not that resource exists - this is what makes
  AC-04 hold.
- A 404 in a Requester cell is the C-65 replacement for Lab 2's 403: the resource exists, the
  role could have held it, this caller does not, and the response must not say which.
- The MustChange column is 403 `PASSWORD_CHANGE_REQUIRED` everywhere except the three
  auth operations and the public routes (BR-19). It never degrades to 401, because the caller
  *is* authenticated.
- Administrator equals IT Staff on every ticket row (C-66) and IT Staff equals Requester -
  that is, forbidden - on every user-administration row.

[1] The labsheet's role table gives "create Tickets" and "view and manage only owned
Tickets" to the Requester alone, so staff do not raise Tickets of their own and the
Requester-view routes are Requester-only (C-101).

[2] `LS 8.4` gives IT Staff the *existing* Attachments; no clause gives them upload or
removal, so they read and download and do not write (C-103).

[3] The two Administrator safety rules split. `LAST_ADMINISTRATOR` is 409 because the
refusal depends on the state of the other `User` rows. `SELF_DEACTIVATION` is 422 because it
depends only on who the caller is and what they submitted (BR-103, C-100).

**Ownership beyond role.** This matrix answers by role, and that is the whole answer: any
active IT Staff or Administrator may act on any Ticket, because the queue is shared work
(BR-96, C-93). Ownership constrains one thing only - a Ticket in `IN_PROGRESS`,
`WAITING_FOR_REQUESTER` or `RESOLVED` must have an owner, which refuses both the move in
without one and the unassignment while in one (BR-97, C-104). That constraint is a property
of the Ticket, not of the caller: a staff user who does not own the Ticket may still make
the move, provided somebody owns it.

---

## 6. UI Specification Summary

The binding visual contract is `ui-spec.md`. This section fixes the structure it details, and
the Zen Green tokens in `CLAUDE.md` are unchanged and remain binding. Nine screens exist.

**Application shell.** TokTickIT wordmark, role-derived navigation, the authenticated user's
name, a role badge and Logout. No Development Requester text and no Change Requester control
survives anywhere (FR-09). The shell renders only for an authenticated user who has no
outstanding password change.

**Login.** Email and password, both required, with field-level validation messages, a busy
submit state, one generic failure message for bad credentials (BR-07) and a distinct
inactive-account message (BR-09). Modes: view and submit. States: initial, validating,
submitting, invalid credentials, inactive account, API failure.

**Change Password.** Shown to a user with an outstanding password change, and to nobody
else. Name and role at the top, current password, new password, confirmation, the password
rules stated before the user types, and a success continuation into the role's landing
screen. Modes: edit. States: initial, validating, saving, success, failure.

**My Tickets, Create Ticket, Requester Ticket Detail.** Structurally as Lab 2, with four
changes: the identity in the header is the authenticated user; the status filter offers eight
values; the IT Priority badge always renders; and Ticket Detail gains a Public Comments
section - list plus composer - and the "Problem Appears Resolved" action with its
confirmation and its post-action indicator. Ticket Detail also shows the Ticket Owner's name,
so the Requester knows who is handling their Ticket, and never the owner's email address
(BR-100).

**IT Staff Ticket Queue.** Search box, the four filters, a sort control, page-size control
and pagination. Desktop: a table of the nine columns in FR-39. Tablet: the same table with
Category and Related System dropped to a second line. Mobile: one card per Ticket carrying
Ticket Number, Ticket Summary, status and IT Priority badges, owner and last updated. Modes:
list. States: loading, populated, empty, no-results, invalid query, forbidden, failure.

**IT Staff Ticket Detail.** The Lab 2 Ticket header extended: a read-only Ticket information
group; an operations group holding Ticket Owner with claim, assign, reassign and unassign, IT
Priority and the permitted status transitions; the Attachment section; and two clearly
separate communication sections. Modes: view and edit-in-place of the permitted fields.
States: loading, saving, success, validation, conflict (409 on claim), forbidden, not-found,
failure.

**User Management.** One screen. A search box, an optional role filter, a user list of Name,
Email, Role, Status and Edit, and a create form and an edit form that may be panels or modals
but are not separate routes. Modes: list, create, edit and set-initial-password. States:
loading, populated, empty, no-results, validation, duplicate email, self-deactivation
refused, last-Administrator refused, success, forbidden, failure.

**Check System.** Unchanged from Lab 1 and public (C-87).

**Badges.** Four families share one badge system: Current Status (eight values, eight
treatments), Requested Priority, IT Priority and Role. Two further markers use the same
system: "Requester says resolved" and the "(inactive)" owner marker. No badge conveys its
meaning by color alone.

**Public Comments versus Internal Notes.** Required to be visually distinct (`LS 8.4`): the
comment list sits on the white surface, the notes list on a shaded panel with its own heading,
its own icon and a standing label saying the notes are not visible to the Requester. The two
composers are never adjacent without that separation.

**Read-only versus editable.** Read-only fields keep the Lab 2 soft gray-green or warm ivory
shading. On the IT Staff detail screen the read-only Ticket information and the editable
operational fields are visibly different groups, so a staff user can see at a glance what
they may change.

**Responsive rules.** Unchanged from Lab 2 (`LS 8.7`): desktop >= 992 px, tablet 768-991 px,
mobile < 768 px; no clipped label, no overlapping message, no hidden button, no horizontal
page scroll at 1280, 834 or 390 px.

---

## 7. Data Changes

PostgreSQL via Prisma. Prisma's default table naming is kept: no `@@map`, no `@map`. Four
migrations, applied with `npx prisma migrate deploy` and created with
`npx prisma migrate dev --create-only` so the SQL can be edited first. `prisma migrate reset`
is never run (`L2 C-37`), and `npm run prisma:migrate` is repointed at `migrate deploy`
(C-86).

### Enums

| Enum | Values | Change |
|---|---|---|
| `RequestedPriority` | `LOW`, `MEDIUM`, `HIGH` | Unchanged. Now also the type of `Ticket.itPriority`. |
| `TicketStatus` | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED` | Three values added (C-70). All eight are now reachable. |
| `UserRole` | `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` | New (C-69). |

### `User` - renamed from `RequesterUser`, extended

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement - **unchanged values**, which is the whole point of C-67 |
| `name` | `String` | Unchanged. Trimmed, 1 to 100 characters (BR-99) |
| `email` | `String` | `@unique`, trimmed, stored lower-case, valid format, at most 254 characters (BR-06, BR-99) |
| `isActive` | `Boolean` | Unchanged; now also governs login (BR-09) and assignability (BR-30) |
| `createdAt` | `DateTime` | Unchanged |
| `role` | `UserRole` | New. `@default(REQUESTER)`, `NOT NULL` - every migrated row is a Requester |
| `passwordHash` | `String?` | New. Nullable, and a NULL can never authenticate (BR-17) |
| `mustChangePassword` | `Boolean` | New. `@default(true)` |
| `updatedAt` | `DateTime` | New. `@updatedAt`, so an Administrator edit is visible in the data |

Relations: `tickets` (as Requester, unchanged), `ownedTickets`, `sessions`, `publicComments`,
`internalNotes`.

### `Session` - new

| Field | Type | Notes |
|---|---|---|
| `id` | `Int` | PK, autoincrement |
| `tokenHash` | `String` | `@unique`. The SHA-256 of the 32-byte token; the token itself is never stored (C-54) |
| `userId` | `Int` | FK to `User` |
| `createdAt` | `DateTime` | `@default(now())` |
| `expiresAt` | `DateTime` | `createdAt` + 8 hours, absolute (C-55). A row found expired by a lookup is deleted there and then; nothing sweeps in the background (BR-101) |

### `Ticket` - extended

| Field | Type | Notes |
|---|---|---|
| `requesterId` | `Int` | **Column name unchanged** (C-68); now points at the renamed `User` |
| `itPriority` | `RequestedPriority` | Was nullable and never set. Backfilled from `requestedPriority`, then `NOT NULL` (C-71) |
| `ownerId` | `Int?` | New. Nullable FK to `User` - zero or one Ticket Owner (`LS 5.1`, BR-45) |
| `requesterResolvedAt` | `DateTime?` | New. The C-76 flag. Null means not indicated |

Every other field is unchanged.

### `PublicComment` and `InternalNote` - new, two tables (C-73)

Both carry the same shape: `id` (PK), `ticketId` (FK to `Ticket`), `authorId` (FK to `User`),
`body` (`String @db.Text`, 1 to 2000 characters after trim, BR-64) and
`createdAt` (`@default(now())`). Neither has an `updatedAt`, a `deletedAt` or an edit path -
append-only is enforced by the absence of the column as much as by the absence of the route.

### Relationships

- One `User` has one `UserRole` (BR-35) and many `Session` rows.
- One `User` as Requester has many `Ticket` rows (`Ticket.requesterId`, unchanged).
- One `User` as Ticket Owner has many `Ticket` rows (`Ticket.ownerId`, nullable).
- One `Ticket` has many `PublicComment` and many `InternalNote` rows.
- One `PublicComment` and one `InternalNote` each have exactly one author `User`.
- `Category`, `RelatedSystem`, `Ticket` and `Attachment` keep every existing relationship.

### Index decisions - justified

The four Lab 2 indexes are all led by `requesterId`, because every Lab 2 query began by
scoping to one Requester (`L2 BR-22`). **The queue has no requester scope at all**, so none of
the four serves it (`phase1-analysis.md` 2e item 8). They are kept - My Tickets still issues
exactly the query they were chosen for - and the queue gets its own.

Every queue query starts from a status set: the default excludes `CLOSED` and `CANCELLED`
(BR-72), and a status filter narrows it further. `currentStatus` therefore leads each new
index:

- **`@@index([currentStatus, itPriority, createdAt])`** - the default queue listing and its
  order in one index: the status set, then IT Priority high to low, then oldest first.
- **`@@index([currentStatus, ownerId])`** - the owner filter in all three of its forms:
  `me`, a named user, and `unassigned`, which is `ownerId IS NULL` and is served by the same
  index.
- **`@@index([currentStatus, categoryId])`** - the category filter, which is never applied
  outside a status set.
- **`Session.tokenHash @unique`** - every authenticated request is one lookup on this value,
  making it the hottest index in the system.
- **`Session @@index([userId])`** - BR-24 deletes all of a user's sessions on deactivation, a
  role change and a new initial password; that is a delete by `userId`.
- **`PublicComment @@index([ticketId, createdAt])`** and
  **`InternalNote @@index([ticketId, createdAt])`** - both lists are read per Ticket, newest
  first (BR-67), which is exactly this pair.
- **No index is added for the `updatedAt`, `ticketNumber` or `currentStatus` sort fields.**
  `ticketNumber` already has its unique index; the other two are non-default orderings over a
  page-sized result set that the status-led indexes have already narrowed, and an index per
  sort field would cost writes on every Ticket update for a case the default never takes.
- **No index is added to `User`.** `email @unique` already serves login and the duplicate-email
  check, and the user list is small, unpaginated (BR-84) and searched with a substring match
  that a B-tree cannot serve anyway.

Ticket Summary stays unindexed for the same reason as Lab 2: a leading-wildcard substring
match cannot use a B-tree, and trigram indexing is the right answer at a scale this sprint
does not reach.

### Migration - ordered steps

Four migrations. The order is not a preference: a PostgreSQL enum value cannot be used in the
transaction that adds it, so the new `TicketStatus` values must land on their own first
(C-70).

| # | Migration | Contents |
|---|---|---|
| M1 | Enum values | `ALTER TYPE "TicketStatus" ADD VALUE 'OPEN' / 'WAITING_FOR_REQUESTER' / 'REOPENED'`. Nothing else. |
| M2 | User rename and extension | `ALTER TABLE "RequesterUser" RENAME TO "User"`, plus `ALTER ... RENAME CONSTRAINT` for the primary key and the email unique constraint and `ALTER INDEX ... RENAME` for their indexes (C-67). `CREATE TYPE "UserRole"`. Add `role NOT NULL DEFAULT 'REQUESTER'`, `passwordHash NULL`, `mustChangePassword NOT NULL DEFAULT true`, `updatedAt`. **No `DROP TABLE` anywhere.** |
| M3 | Ticket workflow fields | Add `ownerId` (nullable FK) and `requesterResolvedAt`. `UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL`, then `SET NOT NULL` (C-71). Create the three queue indexes. |
| M4 | New tables | `Session`, `PublicComment`, `InternalNote` with their indexes and foreign keys. |

The execution order, which is the part that protects the existing data:

1. Create each migration with `npx prisma migrate dev --create-only` and hand-edit the SQL.
   For M2, Prisma generates `DROP TABLE` + `CREATE TABLE` for a model rename; that generated
   SQL is replaced with `ALTER TABLE ... RENAME` before the migration is ever applied.
2. **Rehearse (C-83), before the dev database is touched.** Restore `lab2-final.dump` into a
   throwaway `toktickit_rehearsal` database. Capture, to a file: row counts per table, and
   tickets per Requester email.
3. Run `npx prisma migrate deploy` against `toktickit_rehearsal`.
4. Capture the same two figures again, plus `npx prisma migrate diff ... --exit-code` to prove
   zero drift. The pass condition is: every table's row count unchanged, every Requester's
   ticket count unchanged, `itPriority` non-null on every row and equal to `requestedPriority`,
   and the drift check exiting clean.
5. Save both captures and the drift output under `artifacts/lab-03/migration/`. They are
   tracked; they are the only evidence that the rename preserved ticket ownership, because
   `migration.db.test.ts` runs against a freshly created database with no Lab 2 history.
6. **Only now** run `npx prisma migrate deploy` against the dev database, then the seed.
7. `toktickit_test` is created and migrated by the Vitest global setup - `migrate deploy` plus
   the seed - so the Supertest suite never touches the dev data (C-83).

If Prisma offers a reset at any point, the answer is no and the work stops.

### How existing Requesters receive a password (C-72)

M2 leaves `passwordHash` NULL and `mustChangePassword` true for every migrated row. A NULL
hash can never authenticate and produces the same generic 401 as a wrong password (BR-07,
BR-17), so the window between migrating and seeding is closed rather than open.

The seed then, **only where `passwordHash IS NULL`**, writes the documented local-development
password and clears `mustChangePassword` for the named personas, in a single write. Two
consequences are deliberate: a password a person has since changed is never overwritten, and
re-running the seed changes nothing. The dedicated first-login account is created with the
flag set and is never updated by the seed, so the mandatory-change path can be demonstrated
repeatedly. Any migrated user who is not a named persona stays NULL until an Administrator
sets an initial password - which is the only account-recovery path this lab has.

### How the selector and its client state are removed

Server: `GET /api/requesters` is deleted (`app.ts:61-78`), and `server/src/lib/requester.ts`
goes with it, taking `requireRequesterQuery` and the three now-unreachable error codes
`REQUESTER_REQUIRED`, `REQUESTER_NOT_FOUND` and `REQUESTER_INACTIVE` (C-64). Each of the eight
mount points is replaced by the session middleware chain.

Client: `client/src/requester/RequesterContext.tsx` is deleted entire, including
`STORAGE_KEY = "toktickit.requesterId"`; `client/src/pages/RequesterSelection.tsx` is deleted;
`fetchRequesters()` leaves `api.ts`; the eight `api.ts` functions that thread `requesterId`
through a URL or a body lose the parameter; `App.tsx` swaps the `RequesterProvider` and its
`if (!selected)` gate for an `AuthProvider`, a login gate and a password-change gate; and
`AppShell.tsx` replaces "Development Requester: {name}" and Change Requester with the name,
the role badge and Logout.

Nothing migrates the old `localStorage` key and nothing reads it. A browser that still holds
it is unaffected, because no code path looks. `VITE_API_URL` is set to the empty string so the
proxied same-origin path is used (BR-26).

### Seed composition (C-91, `LS 5.3`)

One graded seed, idempotent, safe to run repeatedly, holding:

- **Users.** Four active Requesters and one inactive Requester - the five existing Lab 2
  personas, which keeps their ids and therefore their Tickets. Three active IT Staff and one
  inactive IT Staff. At least one active Administrator. One dedicated first-login account,
  created with `mustChangePassword` set and never updated by the seed.
- **Reference data.** The four Categories and seven Related Systems, unchanged.
- **Tickets.** Realistic Tickets spread across Requesters, all eight statuses, all three
  Requested Priorities, and both owned and unassigned ownership, so the queue's filters and
  its empty and no-results states are all demonstrable from a fresh seed.
- **Public Comments and Internal Notes.** A handful of harmless examples, none containing
  anything that would matter if it leaked, because an Internal Note in a public screenshot is
  exactly the failure `LS 4.6` is guarding against.

Idempotency: users, Categories and Related Systems by `upsert` on their unique keys; Tickets
by the natural key **(Requester email, summary)**, because `ticketNumber` is derived from the
row id (`L2 C-49`) and ids differ between the dev and test databases. The seed stops with an
error if two seeded Tickets share a Requester and a summary, so the key can never match the
wrong row. Comments and notes are keyed on their Ticket plus their body.

`server/prisma/seed-demo.ts` keeps only the extra volume that queue and My Tickets pagination
need, so the graded seed stays readable and cannot be said to exceed `LS 5.3`.

Seeded passwords are local-development only, are documented in the README, and are never a
real personal password.

---

## 8. API Contract

Summary only. The binding contract - exact paths, request and response shapes, every
validation rule, every status code, pagination metadata and error bodies - is `api-spec.md`.
Where the two differ, report the difference rather than following either.

**Authentication mechanism.** scrypt password hashing with a per-user 16-byte salt, stored
`scrypt$N$r$p$salt$hash` and compared with `timingSafeEqual` (C-53). Sessions are rows: a
32-byte opaque token in the `tt_session` cookie, only its SHA-256 stored,
`HttpOnly; SameSite=Strict; Path=/`, 8 hours absolute with no sliding renewal (C-54, C-55).
The application is same-origin through the Vite proxy (C-56). CSRF cover is `SameSite=Strict`
plus an `Origin` check on state-changing requests (C-58). No authentication library is used
and none is permitted.

| Capability | Shape | Notes |
|---|---|---|
| Log in | `POST` with email and password | Public (C-62). Sets the session cookie. One generic 401; 403 `ACCOUNT_INACTIVE` after the password verifies |
| Log out | `POST`, no body | Deletes the calling session row, clears the cookie |
| Current user | `GET` | Works under the password-change gate (C-61) |
| Change own password | `POST` with current, new and confirmation | One validator (C-60); requires the current password |
| Lab 2 Requester Ticket and Attachment routes | Unchanged paths and shapes | Minus every `requesterId` parameter (C-64); 403 on a non-owner becomes 404 (C-65) |
| Public Comments | `GET` and `POST` per Ticket | Requester-owner, IT Staff and Administrator |
| Internal Notes | `GET` and `POST` per Ticket | IT Staff and Administrator only; 403 to a Requester before the Ticket loads |
| Requester resolution indication | `POST` per Ticket | Owning Requester only; 409 `RESOLUTION_NOT_PERMITTED_IN_STATUS` outside the permitted statuses (C-76, C-100) |
| IT Staff queue | `GET` with search, filters, sort and page parameters | C-78; 400 `INVALID_QUERY_PARAM` on a bad parameter |
| IT Staff ticket detail | `GET` per Ticket | Carries owner, comments and notes; the Requester DTO does not |
| Claim, assign, reassign, unassign | `POST` or `PATCH` per Ticket | 409 `ALREADY_OWNED` on a lost claim race; 409 `OWNER_REQUIRED` on unassigning a Ticket that is being worked on (C-104) |
| IT Priority | `PATCH` per Ticket | LOW, MEDIUM, HIGH |
| Current Status | `PATCH` per Ticket | Section 5.1 matrix; 400 on same status, 409 `INVALID_STATUS_TRANSITION` outside the matrix, 409 `OWNER_REQUIRED` on an unowned Ticket |
| Administrator user list | `GET` with search and role filter | Administrator only; unpaginated |
| Create a user | `POST` | 201; 409 `EMAIL_TAKEN` |
| Update a user | `PATCH` | Name, email, role, activation only; 422 `SELF_DEACTIVATION`, 409 `LAST_ADMINISTRATOR` |
| Set a new initial password | `POST` per user | Marks the user and revokes their sessions |

Status codes in use: **200, 201, 204, 400, 401, 403, 404, 409, 410, 413, 415, 422, 500**. New
since Lab 2 are 401 (no session), 204 (logout) and 409, which carries six codes under
BR-103: `ALREADY_OWNED`, `OWNER_REQUIRED`, `INVALID_STATUS_TRANSITION`,
`RESOLUTION_NOT_PERMITTED_IN_STATUS`, `EMAIL_TAKEN` and `LAST_ADMINISTRATOR`. 422 keeps its
Lab 2 meaning, including the five-active-attachment refusal (`L2 BR-39`).
Three Lab 2 codes cease to exist with the caller resolver: `REQUESTER_REQUIRED`,
`REQUESTER_NOT_FOUND` and `REQUESTER_INACTIVE` (C-64); `api-spec.md`'s error catalogue and
every test asserting them is updated, not left to fail.

Two DTOs, not one. The Requester Ticket DTO carries Public Comments and has no Internal Note
key of any kind; the IT Staff Ticket DTO carries owner, Public Comments and Internal Notes.
One DTO cannot serve both audiences without risking BR-70 on a refactor.

---

## 9. Acceptance Criteria

AC-01 to AC-04 are the labsheet's own examples (`LS 9.1`), in its words. Every criterion is
atomic, observable and mapped to at least one planned test in `tests.md`.

| ID | Criterion | Covers |
|---|---|---|
| AC-01 | Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role. | LS 9.1, FR-02, BR-01 |
| AC-02 | Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a valid new password is saved. | LS 9.1, FR-14, FR-19, BR-02 |
| AC-03 | Given an authenticated Requester, when the client supplies another `requesterId`, then the backend still applies the authenticated identity and does not return another Requester's data. | LS 9.1, FR-26, BR-03 |
| AC-04 | Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected without exposing note content. | LS 9.1, FR-29, BR-70 |
| AC-05 | Given an unknown email address, when login is attempted, then the response is 401 with the same message and shape as a wrong password, and no field distinguishes the two. | BR-07 |
| AC-06 | Given a correct email and a wrong password, when login is attempted, then the response is 401 and no response body or log line contains the password. | BR-07, BR-88 |
| AC-07 | Given a user whose stored password hash is NULL, when login is attempted with any password, then the response is the same generic 401. | BR-17, C-72 |
| AC-08 | Given an inactive user's correct credentials, when login is attempted, then the response is 403 `ACCOUNT_INACTIVE` and no session cookie is set. | BR-09, FR-04 |
| AC-09 | Given an inactive user's **incorrect** credentials, when login is attempted, then the response is the generic 401, not `ACCOUNT_INACTIVE`. | BR-09 |
| AC-10 | Given ten consecutive failed logins for one account, when the correct password is then supplied, then login succeeds, because no lockout exists. | BR-08 |
| AC-11 | Given a stored email address in lower case, when login is attempted with the same address in mixed case, then login succeeds. | BR-06 |
| AC-12 | Given a successful login, when the response is inspected, then it carries id, name, email, role and password-change state, and carries no password, hash or token. | BR-10, BR-88 |
| AC-13 | Given a successful login, when the `Set-Cookie` header is inspected, then the cookie is named `tt_session` and carries `HttpOnly`, `SameSite=Strict` and `Path=/`. | BR-21 |
| AC-14 | Given a session token, when the `Session` table is inspected, then the stored value is the token's SHA-256 and the raw token appears nowhere. | BR-21, BR-88 |
| AC-15 | Given a session created more than 8 hours ago, when any protected route is called, then the response is 401. | BR-22 |
| AC-16 | Given an authenticated user with two sessions, when one logs out, then the other still works. | BR-23 |
| AC-17 | Given a logged-out session token, when it is replayed against a protected route, then the response is 401. | BR-23, FR-07 |
| AC-18 | Given an authenticated user who is then deactivated, when their existing session calls a protected route, then the response is 401. | BR-24, BR-28 |
| AC-19 | Given a state-changing request carrying an `Origin` header that is not the configured client origin, when it is sent with a valid session, then it is rejected. | BR-27 |
| AC-20 | Given a state-changing request carrying no `Origin` header, when it is sent with a valid session, then it is accepted. | BR-27 |
| AC-21 | Given a user who must change their password, when they call any protected route other than current-user, change-password or logout, then the response is 403 `PASSWORD_CHANGE_REQUIRED`, not 401. | BR-19, AC-02 |
| AC-22 | Given a user who must change their password, when current-user is called, then it returns 200 with their name and role. | BR-32, FR-15 |
| AC-23 | Given the Change Password screen, when a new password shorter than 8 or longer than 128 characters is submitted, then it is refused with a message below the field. | BR-12, BR-87 |
| AC-24 | Given the Change Password screen, when a new password missing an upper-case letter, a lower-case letter, a digit or a special character is submitted, then it is refused with a message naming the missing class. | BR-12 |
| AC-25 | Given the Change Password screen, when the new password equals the current one, then it is refused. | BR-13 |
| AC-26 | Given the Change Password screen, when the confirmation does not match the new password, then it is refused before any request is sent. | BR-13 |
| AC-27 | Given the Change Password screen, when the current password is wrong, then the change is refused by the backend even though the session is valid. | BR-15 |
| AC-28 | Given a successful password change, when the user continues, then the password-change requirement is cleared and the role's landing screen renders. | BR-18, FR-18 |
| AC-29 | Given a user with two sessions who changes their own password from one of them, when both are then used, then the calling session still works and the other is refused 401. | BR-18, BR-102 |
| AC-30 | Given the authenticated shell, when it renders, then it shows the user's name and role badge and a Logout action, and the strings "Development Requester" and "Change Requester" appear nowhere in the built client. | FR-09, BR-94 |
| AC-31 | Given an authenticated Requester, when the shell renders, then the navigation offers My Tickets and Create Ticket and offers neither the Ticket Queue nor User Management. | BR-36 |
| AC-32 | Given an authenticated IT Staff user, when the shell renders, then the navigation offers the Ticket Queue and does not offer User Management. | BR-36, BR-39 |
| AC-33 | Given an authenticated Administrator, when the shell renders, then the navigation offers the Ticket Queue and User Management. | BR-36, BR-39 |
| AC-34 | Given any authenticated user, when browser storage is inspected, then no key holds a user id, an email address or a token. | BR-25, FR-11 |
| AC-35 | Given an expired or deleted session, when any client screen issues a request, then the client shows the Login screen rather than a generic error. | BR-34, FR-12 |
| AC-36 | Given a Requester, when the IT Staff queue endpoint is called directly, then the response is 403. | BR-74, FR-21 |
| AC-37 | Given a Requester, when an Internal Note endpoint is called for a **nonexistent** Ticket id, then the response is 403, identical to the response for an existing Ticket. | BR-38, C-63, AC-04 |
| AC-38 | Given a Requester, when a Ticket belonging to another Requester is requested, then the response is 404 and carries no Ticket data. | BR-42, C-65 |
| AC-39 | Given a Requester, when an Attachment on another Requester's Ticket is requested, then the response is 404. | BR-42, BR-44 |
| AC-40 | Given a Requester and their own soft-removed Attachment, when its download is requested, then the response is 410. | BR-44 |
| AC-41 | Given an authenticated Requester, when `POST` creates a Ticket carrying another user's `requesterId` in the body, then the Ticket is saved against the authenticated user. | AC-03, BR-31 |
| AC-42 | Given an authenticated Requester, when the ticket list is requested with `?requesterId=` naming another user, then only the authenticated user's Tickets are returned. | AC-03, BR-31, BR-43 |
| AC-43 | Given the route inventory, when every registered non-public route is called with no session, then each answers 401. | BR-92, FR-20 |
| AC-44 | Given no session, when health, categories, related systems or the Check System page is requested, then each answers exactly as it did in Lab 1. | BR-92, FR-69 |
| AC-45 | Given a newly created Ticket, when it is read back, then its Current Status is `NEW` and its IT Priority equals its Requested Priority. | BR-49, BR-53 |
| AC-46 | Given a Ticket that existed before the migration, when it is read after the migration, then its IT Priority is non-null and equals its Requested Priority, and its Requester is unchanged. | BR-49, C-71, C-83 |
| AC-47 | Given the Requester Ticket Detail payload, when it is inspected, then it contains a Public Comments array and no key of any name carrying Internal Note data. | FR-29, BR-70 |
| AC-48 | Given an owning Requester, when a Public Comment is posted, then it is stored with the authenticated user as author and a server-set creation time, and appears first in the list. | BR-65, BR-67, FR-28 |
| AC-49 | Given a comment body of only whitespace, when it is posted, then it is rejected and nothing is stored. | BR-64 |
| AC-50 | Given comment bodies of 1, 2000 and 2001 characters, when each is posted, then the first two succeed and the third is rejected. | BR-64 |
| AC-51 | Given a comment body containing HTML, when the comment is displayed, then the markup is shown as text and no element from it is rendered. | BR-66 |
| AC-52 | Given a comment body containing line breaks, when it is displayed, then the line breaks are preserved. | BR-66 |
| AC-53 | Given an IT Staff user, when Internal Notes are listed and created on a Ticket, then both succeed and the notes carry author and server creation time. | BR-04, FR-55 |
| AC-54 | Given an Internal Note exists, when the owning Requester loads Ticket Detail in the browser, then no note text appears in the rendered DOM or in any network response. | BR-70, AC-04 |
| AC-55 | Given an owning Requester and a Ticket in Open, In Progress, Waiting for Requester or Reopened, when "Problem Appears Resolved" is confirmed, then the indication is recorded and Current Status is unchanged. | BR-59, BR-60, FR-30 |
| AC-56 | Given a Ticket in New, Resolved, Closed or Cancelled, when the owning Requester attempts the resolution indication, then it is refused 409 `RESOLUTION_NOT_PERMITTED_IN_STATUS`. | BR-60, BR-103 |
| AC-57 | Given a Requester who does not own the Ticket, when they attempt the resolution indication, then the response is 404. | BR-42, BR-60 |
| AC-58 | Given an IT Staff user, when they attempt the resolution indication, then the response is 403. | BR-60, section 5.2 |
| AC-59 | Given a Ticket carrying the resolution indication, when IT Staff move it to Resolved, then the indication is cleared and no automatic Public Comment exists. | BR-61 |
| AC-60 | Given a Ticket carrying the resolution indication, when the queue is listed, then that Ticket is marked with the indication badge. | BR-62, FR-40 |
| AC-61 | Given the queue with no query parameters, when it is listed, then no Closed or Cancelled Ticket appears and the order is IT Priority high to low, then oldest first. | BR-72, FR-38 |
| AC-62 | Given a queue search for an exact Ticket Number, when it is listed, then that Ticket is returned; and given a search matching a Ticket Summary substring, then the matching Tickets are returned. | BR-71, FR-34 |
| AC-63 | Given the queue filtered by owner `unassigned`, when it is listed, then every returned Ticket has no Ticket Owner. | BR-71, FR-35 |
| AC-64 | Given the queue filtered by owner `me`, when it is listed by an IT Staff user, then every returned Ticket is owned by that user. | BR-71 |
| AC-65 | Given the queue filtered by status and IT Priority together, when it is listed, then every returned Ticket matches both. | BR-71, FR-35 |
| AC-66 | Given the queue sorted by each permitted sort field in each direction, when it is listed, then the order matches the requested field and direction. | BR-71, FR-36 |
| AC-67 | Given page sizes 10, 25, 50 and a size outside that set, when the queue is listed, then the first three succeed and the fourth is refused 400 with a message on `pageSize`. | BR-72, BR-73 |
| AC-68 | Given a queue request with an unknown sort field, when it is sent, then the response is 400 `INVALID_QUERY_PARAM` and no query reaches the database. | BR-73, FR-42 |
| AC-69 | Given a queue filter combination matching nothing, when it is listed, then the no-results state renders and is visibly different from the empty state. | FR-41 |
| AC-70 | Given an unassigned Ticket, when an IT Staff user claims it, then they become the Ticket Owner. | BR-46, FR-44 |
| AC-71 | Given a Ticket already owned by another user, when an IT Staff user claims it, then the response is 409 `ALREADY_OWNED` and the owner does not change. | BR-46 |
| AC-72 | Given a Ticket, when it is assigned to an active IT Staff or Administrator user, then that user becomes the Ticket Owner. | BR-47, C-66 |
| AC-73 | Given a Ticket, when assignment names a Requester, an inactive user or an unknown user, then the response is 422 and the owner does not change. | BR-48 |
| AC-74 | Given an owned Ticket in New or Open, when it is unassigned, then it returns to the unassigned pool and appears under the `unassigned` filter. | BR-47 |
| AC-75 | Given a Ticket whose owner has since been deactivated, when it is displayed, then the owner is shown marked "(inactive)". | BR-30, FR-46 |
| AC-76 | Given an IT Staff user, when IT Priority is changed to a permitted value, then the new value is stored and shown; and when a Requester attempts it, then the response is 403. | BR-50, FR-47 |
| AC-77 | Given each status in the section 5.1 matrix, when a permitted transition is requested by IT Staff on an owned Ticket, then it succeeds; and when a transition outside the matrix is requested, then the response is 409 `INVALID_STATUS_TRANSITION` and the status is unchanged. | BR-55, FR-48 |
| AC-78 | Given a Ticket, when a status change targets the status it already holds, then the response is 400. | BR-56 |
| AC-79 | Given a Requester, when any status change is attempted, including Resolved and Closed, then the response is 403. | BR-05, BR-54 |
| AC-80 | Given a move to Resolved, Closed or Cancelled, when it is initiated in the UI, then a confirmation step appears before the request is sent. | BR-57, FR-48 |
| AC-81 | Given a Closed Ticket and a Cancelled Ticket, when any status change is attempted on either, then it is refused 409 and the status is unchanged. | BR-58, BR-98 |
| AC-82 | Given an Administrator, when the user list is loaded, then every user appears with Name, Email, Role, Status and an Edit action. | FR-56 |
| AC-83 | Given the user list, when it is searched by a name fragment and by an email fragment, then the matching users are returned in each case. | FR-57 |
| AC-84 | Given the user list, when the role filter is set, then only users holding that role are returned. | FR-58 |
| AC-85 | Given an Administrator, when a user is created with a name, email, one role, activation state and a valid initial password, then the user is created marked as requiring a password change. | BR-75, BR-16 |
| AC-86 | Given a user created by an Administrator, when they log in with that initial password, then the Change Password screen appears before any other screen. | BR-16, AC-02 |
| AC-87 | Given an email address already in use, when a user is created or edited with it, then the response is 409 `EMAIL_TAKEN` and the message appears at the email field. | BR-77, FR-62 |
| AC-88 | Given an email address differing only in case from an existing one, when a user is created with it, then it is refused as a duplicate. | BR-77, BR-06 |
| AC-89 | Given an Administrator, when a user's name, email, role and activation state are edited, then all four are saved and no other field changes. | BR-76, FR-60 |
| AC-90 | Given a user with an active session, when an Administrator changes their role, then their session is invalidated and their next request is 401. | BR-83, BR-24 |
| AC-91 | Given a user with an active session, when an Administrator sets a new initial password, then their session is invalidated and their next login requires a password change. | BR-78, BR-24 |
| AC-92 | Given an Administrator, when they attempt to deactivate their own account, then the response is 422 and the account stays active. | BR-79, FR-63 |
| AC-93 | Given exactly one active Administrator, when deactivation of that account is attempted, then the response is 409 `LAST_ADMINISTRATOR` and the account stays active. | BR-80, FR-64 |
| AC-94 | Given exactly one active Administrator, when that account's role is changed to Requester or IT Staff, then the response is 409 `LAST_ADMINISTRATOR` and the role is unchanged. | BR-80, BR-82 |
| AC-95 | Given two Administrators, when each is deactivated concurrently, then exactly one succeeds and at least one active Administrator remains. | BR-80, C-80 |
| AC-96 | Given an IT Staff user, when any user-administration endpoint is called, then the response is 403. | BR-39, FR-65 |
| AC-97 | Given a Requester, when the User Management URL is opened directly, then a forbidden state renders and no user data is fetched. | FR-65, FR-24 |
| AC-98 | Given the user list, when it is inspected, then it offers no delete control, no pagination, no bulk action and no import or export. | BR-81, BR-84, FR-66 |
| AC-99 | Given the seed, when it is run twice, then no duplicate user, Ticket, comment or note exists. | C-91, `LS 5.3` |
| AC-100 | Given the seed, when the user table is counted, then there are at least four active and one inactive Requester, at least three active and one inactive IT Staff, and at least one active Administrator. | C-91, `LS 5.3` |
| AC-101 | Given a seeded user who has since changed their password, when the seed runs again, then the changed password is not overwritten. | C-72 |
| AC-102 | Given the migration rehearsal, when the before and after captures are compared, then every table's row count and every Requester's ticket count are unchanged and the drift check exits clean. | C-83, C-67 |
| AC-103 | Given the server source, when it is searched, then no `requesterId` query parameter or body field influences any route. | BR-31, C-64 |
| AC-104 | Given the client bundle, when it is searched, then no authentication library and no banned dependency is present. | `CLAUDE.md` |
| AC-105 | Given any API failure, when it is displayed, then the message carries no stack trace, SQL, filesystem path or database text. | BR-89 |
| AC-106 | Given every Lab 3 screen at 1280, 834 and 390 px, when it is captured, then no label is clipped, no control is hidden, nothing overlaps and the page does not scroll horizontally. | FR-68, `LS 8.7` |
| AC-107 | Given Public Comments and Internal Notes on the same screen, when it is viewed, then the two are visually distinct and the notes section states that it is not visible to the Requester. | FR-55, `LS 8.4` |
| AC-108 | Given the Lab 1 and Lab 2 suites, when they run on the final `main`, then every test passes and every count drop matches a retirement row in `tests.md`. | BR-91, BR-95 |
| AC-109 | Given an unassigned Ticket in Open, when IT Staff move it to In Progress, then the response is 409 `OWNER_REQUIRED` and the status is unchanged; and when the same user claims it and repeats the move, then it succeeds. | BR-97, C-93 |
| AC-110 | Given a Ticket owned by one IT Staff user, when a different IT Staff user changes its IT Priority, posts a Public Comment, writes an Internal Note and makes a permitted status change, then all four succeed. | BR-96, C-93 |
| AC-111 | Given an owned Ticket in In Progress, Waiting for Requester or Resolved, when it is unassigned, then the response is 409 `OWNER_REQUIRED` and the owner is unchanged; and when it is instead reassigned to another eligible user, then it succeeds. | BR-97, C-104 |
| AC-112 | Given a Resolved Ticket, when it is reopened, then the status becomes Reopened; and given a Ticket in any other status, when Reopened is requested, then the response is 409. | BR-98, C-98 |
| AC-113 | Given user names of 0, 1, 100 and 101 characters, when a user is created with each, then the first and last are refused and the middle two are accepted; and given a name padded with spaces, then the stored value is trimmed. | BR-99, C-94 |
| AC-114 | Given email addresses of 254 and 255 characters, and one of invalid format, when a user is created with each, then only the 254-character valid address is accepted; and given a mixed-case address padded with spaces, then the stored value is trimmed and lower-cased. | BR-99, BR-06 |
| AC-115 | Given a Ticket with a Ticket Owner, when the owning Requester loads Ticket Detail, then the owner's name appears and the owner's email address appears nowhere in the rendered DOM or in any network response. | BR-100, C-95 |
| AC-116 | Given an expired `Session` row, when a request presents its token, then the response is 401 and the row no longer exists in the table. | BR-101, C-96 |
| AC-117 | Given an owned Ticket in In Progress, when it is moved to Open and then unassigned, then both succeed and the Ticket appears under the `unassigned` filter. | BR-97, BR-47, C-104 |

**117 acceptance criteria.**

---

## 10. Definition of Done

Per `LS 13`. Each item is verifiable by reading a named file or running a named command. This
is the checklist the coding agent is held to; nothing is ticked until it has been verified
against the final `main`.

**Implementation**

- [ ] Every FR-01..FR-70 is implemented and can be exercised in the running application.
- [ ] Every BR-01..BR-103 is enforced where the rule says it is enforced - client rules in the
      client, backend rules in the backend.
- [ ] The section 5.2 authorization matrix is implemented cell for cell, with the check order
      of C-63 in one shared middleware chain rather than repeated per route.
- [ ] `server/prisma/schema.prisma` matches section 7, including every index.
- [ ] `npx prisma migrate status` reports no pending migration, and
      `npx prisma migrate diff ... --exit-code` reports no drift.
- [ ] `npm run prisma:seed` run twice creates no duplicate rows and overwrites no changed
      password.
- [ ] `git grep -n` finds no `passport`, `jsonwebtoken`, `bcrypt`, `argon2` or
      `express-session` in any `package.json` or source file.
- [ ] `git grep -n "requesterId"` shows the column and its Prisma relations only - no query
      parameter, no request body field, no client-supplied identity anywhere.
- [ ] `git grep -n "toktickit.requesterId"` returns nothing; `client/src/requester/` and
      `client/src/pages/RequesterSelection.tsx` no longer exist.
- [ ] `server/package.json`'s `prisma:migrate` runs `migrate deploy` (C-86).

**Tests**

- [ ] `cd server && npm test` passes on the final `main`, including the Lab 1 and Lab 2 suites.
- [ ] `cd client && npm test` passes on the final `main`, including the Lab 1 suite.
- [ ] `npm run test:e2e` passes from the repository root on the final `main`, across all three
      viewport projects.
- [ ] All eight `LS 10` test levels are present and identified by the Test ID column: unit,
      API/integration, UI component, UI style, responsive, security/authorization,
      migration/regression and E2E (C-89).
- [ ] Every AC-01..AC-117 maps to at least one test in `tests.md`, and every planned test names
      a file path that exists.
- [ ] The route-inventory test in `server/tests/lab-03/authorization.api.test.ts` walks the
      Express router and fails if any non-public route answers without a session.
- [ ] Both CSRF tests exist and pass: a foreign `Origin` is rejected, a missing `Origin` is
      accepted (C-58).
- [ ] The boundary cases are covered by passing tests: passwords at 7, 8, 128 and 129
      characters and one missing each required character class; comment and note bodies at 0,
      1, 2000 and 2001 characters; user names at 0, 1, 100 and 101 characters; email addresses
      at 254 and 255 characters; queue page sizes 10, 25, 50 and one outside the set; the last
      queue page and one beyond it; a session at 8 hours minus one minute and 8 hours plus one
      minute; every cell of the section 5.1 matrix, owned and unowned.
- [ ] Every count drop against the Lab 2 suites matches a retirement row in
      `docs/lab-03/tests.md`, counted by test ID rather than by file (C-89).
- [ ] No test is skipped, disabled, commented out or marked `.only` - verifiable by
      `git grep -n "\.skip\|\.only\|xit(\|xdescribe("`.

**Security**

- [ ] Every security claim in this document is backed by a named passing test, not by a code
      reading.
- [ ] A Requester receives 403 from a queue endpoint and from an Internal Note endpoint, and
      the note endpoint answers 403 for a nonexistent Ticket id as well (AC-37).
- [ ] A cross-Requester Ticket and Attachment request answers 404, with no Ticket data in the
      body (AC-38, AC-39).
- [ ] No response body and no server log line contains a password, a hash or a session token,
      asserted on the success path and on the failure path (BR-88).
- [ ] The session cookie carries `HttpOnly`, `SameSite=Strict` and `Path=/`, asserted from the
      `Set-Cookie` header (AC-13).
- [ ] Deactivation, role change and set-initial-password each invalidate that user's existing
      sessions, asserted per case (AC-18, AC-90, AC-91).
- [ ] A self-service password change invalidates the user's other sessions and keeps the
      calling one, asserted on both (AC-29).

**Migration**

- [ ] The C-83 rehearsal has been run and its before and after captures, plus the drift check,
      are committed under `artifacts/lab-03/migration/`.
- [ ] The rehearsal shows every table's row count and every Requester's ticket count unchanged
      (AC-102).
- [ ] `server/tests/lab-03/migration.db.test.ts` passes against a freshly created
      `toktickit_test`.
- [ ] No migration contains `DROP TABLE "RequesterUser"`, and the rename is an `ALTER TABLE`
      (C-67).
- [ ] `prisma migrate reset` appears nowhere in any script, document or command history for
      this sprint.

**UI**

- [ ] Every screen matches `ui-spec.md` at 1280, 834 and 390 px.
- [ ] The visual checklist in `tests.md` is completed with no unresolved item.
- [ ] Screenshots exist under
      `artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/`
      for all three viewports.
- [ ] The Zen Green tokens in `CLAUDE.md` appear unchanged in the built CSS, and no new screen
      introduces a colour outside the token set.
- [ ] Public Comments and Internal Notes are visually distinct, and the notes section carries
      its standing "not visible to the Requester" label (AC-107).
- [ ] Badges exist for Current Status (all eight), Requested Priority, IT Priority and Role,
      and none conveys meaning by colour alone.

**Review**

- [ ] Every Issue was implemented on its own `feature/lab3-N-slug` branch and merged into
      `lab3-staging` through a peer-reviewed PR (`LS 11.1`).
- [ ] One release PR merged `lab3-staging` into `main`.
- [ ] `docs/lab-03/reviewer.md` records reviewer identity, PR links, comments given and
      received, responses and approvals.

**Documentation**

- [ ] `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `decisions.md`,
      `reviewer.md`, `ai-use.md` and `handoff.md` all exist under `docs/lab-03/`.
- [ ] `specification.md` and `api-spec.md` do not contradict each other on any endpoint, status
      code or role restriction.
- [ ] Every endpoint implemented in `server/src` conforms to `api-spec.md` on path, method,
      request shape, response shape and status code, with a Supertest assertion for each.
- [ ] Every gap G-01..G-10 in section 11 is closed by a decision row in `decisions.md`
      (C-93..C-104), and any gap found later is added there rather than resolved in code.
- [ ] The README documents the seeded local-development credentials, states that they are
      local-development only, and its setup and test commands were run as written.
- [ ] `server/.env.example` lists the Lab 3 variables with placeholder values only, and no
      `.env`, hash, token or secret is tracked.

**Demonstration**

- [ ] Valid login, invalid login, inactive-account handling, the busy state, safe failure
      feedback, the mandatory first-password change, the authenticated user and role display,
      logout, and a direct URL blocked after logout are all captured (`LS 14` Part 5).
- [ ] Queue search, each filter, sorting, pagination, assigned and unassigned ownership,
      status and priority badges, the open-detail action, and the empty, no-results and
      failure states are captured (`LS 14` Part 6).
- [ ] Claim, reassign, IT Priority, a permitted status change, a refused status change, a
      Public Comment, an Internal Note, Attachment continuity, the Requester resolution
      indication and the role restrictions are captured, with direct-API authorization
      evidence (`LS 14` Part 7).
- [ ] The full `LS 8.5` User Management list is captured, including duplicate-email rejection,
      self-deactivation prevention, last-Administrator prevention, and a non-Administrator
      being forbidden (`LS 14` Part 8).

---

## 11. Assumptions and Decisions

The reasoning behind every settled choice in this document is recorded once, in
`docs/lab-03/decisions.md` as C-53..C-104, and is not repeated here. The decisions shaping
this specification most directly are C-53 to C-56 (the authentication mechanism), C-59 and
C-60 (login failures and the password policy), C-63 to C-66 (the check order, identity, the
403/404 split and Administrator ticket powers), C-67 to C-72 (the migration), C-73 to C-78
(comments, notes and the ticket workflow), C-79 to C-82 (administration), C-83, C-89 and C-91
(test isolation, test levels and the seed), and C-93 to C-104, which closed the ten gaps the
first draft of this document listed.

### Assumptions

Working assumptions, each visible in behavior and therefore testable. The first draft of this
document carried nine; seven of them answered gaps and have been replaced by decisions
C-93..C-104, which are cited in the rules themselves rather than here. Two remain, and
neither is load-bearing:

1. **A-01. Login on an existing session is permitted** and issues a new `Session` row. C-54
   models sessions as rows and C-55 speaks of ending "all of that user's sessions", so more
   than one at a time is expected.
2. **A-02. Ticket volume stays below the point at which the queue's substring search needs
   trigram or full-text indexing**, as in Lab 2. The queue's indexes are chosen for the
   status-led filters, not for search.

Two statements that were assumptions in the first draft are now rules, because a decision
made them enforceable: one person using one browser per account is no longer assumed - the
three races that matter are specified and tested instead (the claim race BR-46, the
last-Administrator race BR-80, and a self-service password change against the user's other
sessions BR-102).

### Gaps - all closed

The first draft of this document listed ten places where `decisions.md` was silent and
refused to invent a rule for any of them. All ten are now closed by decision rows, and the
rules above cite those rows directly. The table is kept as the record of what was open and
what closed it; a gap found from here on is added to `decisions.md`, not resolved in code.

| ID | Gap | Closed by | Answer |
|---|---|---|---|
| G-01 | Whether a **non-owning** IT Staff or Administrator may act on a Ticket owned by another staff member. | C-93 | Any staff user may act on any Ticket; a move to In Progress, Waiting for Requester or Resolved requires the Ticket to have an owner (409 `OWNER_REQUIRED`) |
| G-02 | Field bounds and format rules for `User.name` and `User.email`. | C-94 | Name trimmed, 1 to 100; email trimmed, lower-cased, valid format, at most 254 |
| G-03 | Whether IT Staff and Administrator users may raise Tickets of their own. | C-101 | No |
| G-04 | Whether claiming a Ticket also moves `NEW` to `OPEN`. | C-102 | No - one action, one effect |
| G-05 | Whether a staff user may upload or soft-remove an Attachment. | C-103 | No; they list and download only |
| G-06 | The status and error codes for a rejected status transition, an ineligible assignee, self-deactivation and the last-Administrator refusal. | C-100 | 409 for a conflict with the state of the resource or the rows it depends on, 422 for a refusal about the submitted value |
| G-07 | The status and error code for the password-change gate. | C-99 | 403 `PASSWORD_CHANGE_REQUIRED` |
| G-08 | Whether a self-service password change revokes the user's other sessions. | C-97 | It ends every other session and keeps the calling one |
| G-09 | Whether the Requester sees the Ticket Owner's name. | C-95 | The name yes, the email address never |
| G-10 | Whether expired `Session` rows are ever deleted. | C-96 | Deleted by the lookup that finds them expired; no background job |

Two further rows went with them. The first draft's section 5.1 let a `CLOSED` Ticket be
reopened; no decision row permitted that, and the handoff section 4 draft matrix marks
`Closed / Cancelled` terminal, so C-98 settles it and the matrix now agrees. And C-93's
owner requirement, read as a check on the transition alone, left a Ticket free to be
unassigned a moment later and sit in a worked status with nobody accountable; C-104 closes
that by refusing the unassignment (BR-97).

### Carried Lab 2 design constraints

`L2 LC-01` (an inactive user's Tickets and Attachments are retained) is carried unchanged and
is now BR-29. `L2 LC-02` (Lab 3 attaches authentication to the Requester model without
touching `Ticket.requesterId`) is **satisfied with a note**: the ids survive and the column
name is unchanged (C-68), but the model itself is renamed to `User` (C-67), so its literal
wording no longer holds. `L2 LC-03` (the ownership rules are written against the identity, not
against the selector) is what made C-64 a parameter change rather than a rule change.

### Canonical glossary (C-92)

The Lab 2 glossary is carried forward unchanged and extended with the Lab 3 terms below. These
spellings are used verbatim as UI labels, in test assertions and in documentation; no synonym
is introduced anywhere.

| Term | Field | Meaning |
|---|---|---|
| User | `User` | An authenticated account. Replaces "Development Requester" (C-67), which appears nowhere in Lab 3. |
| Role | `role` | The single permitted role: Requester, IT Staff or Administrator. Never "roles". |
| Requester | `UserRole.REQUESTER` | The role that raises Tickets. In Lab 3 it is a role, not a separate model. |
| IT Staff | `UserRole.IT_STAFF` | The role that works Tickets. Two words, capitalised, never "ITStaff" or "staff" in UI text. |
| Administrator | `UserRole.ADMINISTRATOR` | The role that manages accounts. Never "Admin" in UI text. |
| Ticket Owner | `ownerId` | The one active IT Staff or Administrator user responsible for a Ticket. Never "assignee". |
| IT Priority | `itPriority` | The priority IT assigns. Non-null from this sprint onwards (C-71). |
| Public Comment | `PublicComment` | Shared communication on a Ticket, visible to the Requester. Never "comment" alone where Internal Notes are also in view. |
| Internal Note | `InternalNote` | Operational note visible only to IT Staff and Administrator. Never "private comment". |
| Session | `Session` | The authenticated session row behind the `tt_session` cookie. |
| Initial Password | - | A password set by an Administrator that the user must replace at next login. Never "temporary password". |
| Problem Appears Resolved | `requesterResolvedAt` | The Requester's indication that the problem appears fixed. A flag, never a status (C-76). |
