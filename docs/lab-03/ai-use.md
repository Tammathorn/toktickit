# Lab 3 AI Use and Reflection

TokTickIT - CPE 334 Individual Sprint 3.
Author: Tammathorn Kananurak (67070503489), GitHub @Tammathorn.

This is a **running log**, opened during Issue #37 (the engineering contract) and appended
to as the sprint proceeds. `LS 4` asks for six to ten prompts and a reflection; the
reflection is written at release, when there is something to reflect on. Until then this
file records, for every prompt I issued: the prompt as I sent it, one line on what it
produced, and one line on what went wrong. The "what went wrong" line is the point of the
document - a log in which every prompt worked would be evidence of nothing.

Phase 1 prompt templates live in `docs/lab-03/handoff.md` section 7. Where I sent a
template unchanged, the entry says so. Where a prompt carried a long numbered list of
decisions, the list is abbreviated with `[...]` and its full content is the corresponding
rows of `docs/lab-03/decisions.md`; nothing is paraphrased, only elided.

---

## 1. The LLM I used

| | |
|---|---|
| **Model** | **Claude Opus 5**, every Phase 1 prompt |
| **Interface** | Claude Code (CLI), run from `C:\Downloads\Lab1_Starter_Scaffold\toktickit` |
| **Session discipline** | `/clear` before prompts 1.1, 1.2 and 1.4, so each document was written by a session that could not lean on the previous one's reasoning. The 1.7 audits run in a subagent with no memory of writing the file it audits |
| **Working agreement** | Carried from Lab 2: the agent runs `git` and `gh` itself under two limits that never relax - never `git add .` or `-A`, always explicit paths with `git status` after staging; every `gh pr create` carries `--base lab3-staging`. No force-push, no rebase of a pushed branch, no merge into `main` outside the single release PR. A pre-commit inspection is owed before every commit |

---

## 2. Phase 1 prompt log - Issue #37, the engineering contract

### 2.1 Prompt 1.1 - read first, write nothing

Sent as the `handoff.md` section 7 template unchanged: read the labsheet PDF, `CLAUDE.md`,
`handoff.md`, the Lab 2 decision log and specification sections 7 and 11, the Prisma schema,
`app.ts`, `lib/requester.ts`, `routes/` and `client/src/requester/`, then **write nothing**
and report (1) every deliverable grouped by the nine PDF parts, (2) every place in code,
tests and Lab 2 docs that Lab 3 invalidates, file and line, including what my own
`handoff.md` section 1 table had missed, (3) every Lab 2 test file as survives / needs
adapting / must be retired with its replacement, (4) the options for each `LS 4.4` rule
area, and (5) where it disagreed with a `handoff.md` section 4 recommendation - "Do not
agree to be agreeable."

Followed immediately by, verbatim:

> Note: CLAUDE.md is still the Lab 2 version. Its scope bans (auth, passwords, sessions,
> IT Staff workflow) are rules for code and are replaced in prompt 1.3. Do not let them
> soften or narrow this analysis. List every CLAUDE.md rule Lab 3 conflicts with, under point 2.

**Result.** A file-and-line survey of everything Lab 3 breaks, a per-test-file disposition
table, and the option lists for every `LS 4.4` rule area - the raw material for
`decisions.md`. It found gaps my own `handoff.md` section 1 table had missed.

**What went wrong.** I had to send the second message before it would treat the still-Lab-2
`CLAUDE.md` as a document to be replaced rather than a constraint on the analysis. And the
report lived only in the conversation: I had to order it saved to
`docs/lab-03/phase1-analysis.md` three prompts later, because prompts 1.4 and 1.6 both
depend on it and a `/clear` would have destroyed it.

---

### 2.2 Prompt 1.2 - the decision log

Sent verbatim, opening:

> Prompt 1.2. Write docs/lab-03/decisions.md from C-53, one row each: ID, topic, decision,
> my reason, what it supersedes. Use my reasons only. Add a "Carried from Lab 2" list for
> C-01..C-52, marking C-12, C-13, C-20, C-42, C-45 and C-51 as superseded or changed. Add
> one line under handoff.md §4: "Superseded by docs/lab-03/decisions.md."
>
> Accepted as written in handoff §4: D-02, D-03, D-05, D-06, D-09, D-10, D-11, D-13, D-14,
> D-16, D-17, D-18, D-20, D-21, D-22, D-23, D-24.
>
> Changed or new:
> 1. D-01 scrypt via node:crypto. Reason: no new dependency under the stack rule, no native
>    build on Windows, memory-hard.
> 2. D-04 SameSite=Strict + Origin check, with two tests: foreign Origin rejected, missing
>    Origin accepted.
> 3. Cookies ignore port, so the session cookie also reaches :3000 directly. Accepted as a
>    local-only risk.
> 4. D-07+D-08, one row: the migration sets passwordHash NULL and mustChangePassword true
>    for every existing user. The seed, only where passwordHash IS NULL, sets the documented
>    dev password and clears the flag for the named personas in a single write. [...]
> 5. D-12: [ (a) Admin has all IT Staff ticket permissions; owners are IT Staff or Admin
>    | (b) Admin can read queue, detail, comments and notes (BR-04) but cannot claim,
>    assign, set priority, change status or post; owners are IT Staff only ]
>    <- pick one, give reason
> 6. D-15: Supertest runs on toktickit_test. Migration evidence has two halves [...]
>
> [items 7-19: requesterId keeps its column name; the three enum values in their own
> migration; itPriority backfilled then NOT NULL; /system-check public; 8 h absolute
> sessions; /me under the gate; duplicate email 409; same-status move 400; the fixed check
> order; §12 filenames win over the §10 examples; no router library; prisma:migrate
> repointed to migrate deploy - each reproduced in decisions.md C-53..C-92]
>
> Note for tests.md later: count the regression by test ID, not by file. Your summary said
> the server count drops by nothing, but your table retires API-11 and the REQUESTER_* rows.

**Result.** `decisions.md` C-53..C-92, plus the "Carried from Lab 2", "Superseded or
changed" and "Carried unchanged" tables covering C-01..C-52.

**What went wrong.** "Use my reasons only" was not obeyed. Eleven rows came back either
marked "Not stated" or carrying a reason the agent had written on my behalf, and its own
summary contradicted its own table on the regression count - which is why I closed the
prompt with the note about counting by test ID.

---

### 2.3 Prompt 1.2, decision round 2 - supply the reasons

Sent verbatim, opening:

> Hold the commit. Update docs/lab-03/decisions.md as below, then show me the diff and stop.
>
> A. D-12. I choose [ (a) | (b) ]. Replace the reason you wrote with mine: [the two option
> texts]
>
> B. Reasons for the "Not stated" rows, matched by topic. If a row has no match here, leave
> it "Not stated" and tell me which one.

followed by my reasons for eleven topics - the check order, `requesterId` keeping its name,
the `itPriority` backfill, enum-migration ordering, the 8-hour session, `/me` under the gate,
duplicate email 409, the same-status 400, section 12 filenames, the router, and
`prisma:migrate` - and then:

> C. The eight flagged Lab 2 decisions - add rows or table entries:

with my wording for C-09, C-10, C-21, C-22, C-31, C-32, C-33 and C-40, ending "Keep C-07 in
the superseded table next to C-71, as you did."

**Result.** Every "Not stated" reason replaced by mine; the eight Lab 2 rows entered the
carried/changed tables in my words.

**What went wrong.** I left D-12 as an unresolved `[ (a) | (b) ]` bracket in my own prompt,
so the round could not close it and a third round was needed for one decision.

---

### 2.4 Prompt 1.2, decision round 3 - close D-12 and commit

Sent verbatim, opening:

> D-12: I choose (a). Keep C-66's decision body as it is and replace the reason with mine:
> "4.5 lets an Administrator be the Ticket Owner, and an owner has to be able to act on the
> Ticket. 4.3 allows this when the matrix says so explicitly, and this row is that
> statement. Role-restriction evidence comes from Requester -> staff routes and
> non-Administrator -> user management." Remove the "confirm before the Issue 1 PR" marker.
>
> C-91 open item: the seed finds an existing Ticket by (Requester email, summary). Reason:
> "ticketNumber cannot be the key because it comes from the row id (L2 C-49). Email is used
> instead of requesterId because ids differ between the dev and test databases. It needs no
> schema change and matches the Lab 2 demo seed. The seed stops with an error if two seeded
> Tickets share a Requester and summary, so the key can never match the wrong row."
> Move it out of the Notes and into C-91.
>
> Keep the four reasons you replaced (C-55, C-70, C-84, C-86).
>
> Then: pre-commit inspection, commit decisions.md and handoff.md as
> "docs: add the Lab 3 decision log, C-53 to C-92", push feature/lab3-1-contract, and stop.

**Result.** C-66 settled on option (a), C-91's seed key moved out of the Notes into the row
it belongs to, and `decisions.md` committed as `88ac142`.

**What went wrong.** "Keep the four reasons you replaced" was read as "keep the wording
currently in the file" - the agent's own - rather than "keep the replacements I made". A
fourth message was needed to append my wording after the existing text for C-55, C-70, C-84
and C-86 (commit `c5e6eaf`). And the agent moved to prompt 1.4 next, skipping 1.3 entirely;
I had to say so.

---

### 2.5 Prompt 1.3 - rewrite the guardrail

Sent as the `handoff.md` section 7 template unchanged, prefaced verbatim:

> Next is prompt 1.3 (CLAUDE.md), not 1.4 - 1.3 hasn't run yet. Two small things first:
>
> 1. My "keep the four reasons you replaced" meant keep my new wording. For C-55, C-70,
>    C-84 and C-86, append my reason after the existing one, as you did for C-91.
> 2. Save your prompt 1.1 report, sections 2b-2e and 3 (the file:line list and the
>    per-test disposition table), unedited, to docs/lab-03/phase1-analysis.md. Prompts 1.4
>    and 1.6 depend on it, and it should not live only in this conversation.
>
> Commit those two as separate commits ("docs: restore the Lab 3 decision reasons",
> "docs: record the Phase 1 codebase analysis").
>
> Then run prompt 1.3 from handoff section 7. Use your 1.1 section 2a table as the
> checklist: every row is carried, changed or removed - say which. Cite C-rows by number.
> Show me the full new CLAUDE.md and stop before committing it.

Approved verbatim:

> Approved with two additions:
> 1. Never add list: "administrator management of reference data (Categories, Related
>    Systems) - 8.5 asks for one User Management screen only."
> 2. Database and migrations: "Never run `npm run prisma:migrate` - until C-86 repoints it
>    in Issue 2 it still runs migrate dev, which can offer a reset."
> Keep the C-84/C-86 appends as you trimmed them, and keep the README as the place for
> seeded passwords.
>
> Then pre-commit inspection, commit CLAUDE.md as "docs: rewrite CLAUDE.md for Lab 3",
> push, and stop.

**Result.** `CLAUDE.md` rewritten for Lab 3 - Lab 2's authentication ban replaced by the
C-53..C-58 mechanism, the `LS 4.2` and `LS 8.5` never-add list, the security rules, the
`feature/lab3-N-slug` branch model and the `LS 12` tree - committed as `fbfa6e0`, with
`phase1-analysis.md` preserved as `be7ae9b`.

**What went wrong.** Two guardrails I wanted were missing from the draft and I added them by
hand: the reference-data exclusion (`LS 8.5` asks for one screen, and an agent that does not
read that as an exclusion will build a Categories admin screen), and the
`npm run prisma:migrate` warning - that script still runs `migrate dev`, which can offer the
reset `L2 C-37` forbids, until C-86 repoints it in Issue 2.

---

### 2.6 Prompt 1.4 - the specification **(key prompt)**

Sent verbatim, opening:

> Prompt 1.4. Inputs: CLAUDE.md, docs/lab-03/decisions.md (C-53..C-92),
> docs/lab-03/phase1-analysis.md, and docs/lab-03/spec/Lab_3_sheet.pdf.
>
> Write docs/lab-03/specification.md with the 11 sections in labsheet section 9.
> - FR/BR/AC numbering restarts at 01. Cite Lab 2 rules as "L2 BR-21", decisions as C-xx.
> - BR-01..05 exactly as the labsheet words them, then rules for every area in 4.4: login
>   attempts, password policy, logout, inactive users, duplicate email, current user, the
>   password-change gate, ownership, assignment, IT Priority, comments, notes, status
>   transitions (as a matrix), validation, failures, regression, and the seven
>   Administrator rules.
> - An authorization matrix by operation x anonymous / must-change-password / Requester /
>   IT Staff / Administrator, with the status code each gets. It follows C-66
>   (Administrator is a superset of IT Staff on tickets). api-spec.md will pin exact paths.
> - Section 7: models and fields, the new queue indexes and why (phase1-analysis 2e item 8),
>   the migration as ordered steps including the C-83 rehearsal, the existing-Requester
>   password path (C-72), how the selector and its client state are removed, and the seed
>   composition (C-91).
> - ACs in Given-When-Then, atomic, including labsheet AC-01..04 verbatim.
> - Section 10 is the Definition of Done you will be held to.
> - Where decisions.md is silent, list the gap at the end instead of inventing a rule.
> Assumptions go in section 11. Do not restate the handout.
> Show me the file and stop before committing.

**Result.** `specification.md`: 70 FRs, the business rules grouped by `LS 4.4` area, the
status-transition matrix, the authorization matrix, section 7's data changes and four
ordered migrations, 117 ACs, the Definition of Done, and a list of ten gaps where
`decisions.md` was silent.

**What went wrong.** Two things, and the first is the serious one.

- **Section 5.1 let a `CLOSED` Ticket be reopened, and no decision row said so.** The
  prompt's last instruction was to list a gap rather than invent a rule, and the matrix
  invented one anyway - against my own `handoff.md` section 4 draft, which marks
  `Closed / Cancelled` terminal. I asked which C-row authorised it; none did. It is now
  C-98: `CLOSED` and `CANCELLED` are both terminal and `REOPENED` is reachable only from
  `RESOLVED`. This is exactly the failure `decisions.md` exists to prevent, and it happened
  inside the document whose job is to be the contract.
- **Assumption A-07 put every refusal of a well-formed request at 422**, including
  `LAST_ADMINISTRATOR`, which depends on the state of the other `User` rows and is therefore
  a conflict. Coding it as an assumption rather than asking was the smaller version of the
  same mistake: a status code the whole test suite would have been written against, settled
  in a footnote. C-100 draws the line - 409 for a conflict with the state of the resource or
  the rows it depends on, 422 for a refusal about the submitted value - and A-07 is gone.

---

### 2.7 Prompt 1.4, gap round 1 - close the gaps by decision, not by draft

Sent verbatim:

> Don't commit yet.
> 1. §5.1 makes CLOSED reopenable. Which C-row says so? If none, make CLOSED terminal like
>    CANCELLED (Reopened only from Resolved), per the handoff §4 draft.
> 2. Add decision rows from C-93 for these, with my reasons:
>    - G-01: any IT Staff/Admin may act on any ticket (shared queue); moving to In Progress,
>      Waiting for Requester or Resolved requires the ticket to have an owner (409
>      OWNER_REQUIRED). Reason: work is shared, but a ticket being worked on must have
>      someone accountable.
>    - G-02: User.name trimmed, 1-100 characters; User.email trimmed, lower-cased, valid
>      format, max 254 characters. Reason: 254 is the practical email limit; 100 fits
>      every real name and the table layout.
>    - G-09: a Requester sees the Ticket Owner's name, never their email. Reason: knowing
>      who is handling the ticket helps; the email is not needed.
>    - G-10: an expired Session row is deleted when a lookup finds it expired; no
>      background job. Reason: no scheduler in the stack, and an expired row is harmless
>      until it is looked up.
>    - A-09 changed: a self-service password change ends all of that user's other
>      sessions and keeps the current one. Reason: if a session was stolen, changing the
>      password must lock the thief out.
> 3. Answer the other five gaps as your provisional answers, unless you see a problem -
>    then tell me.
> Update specification.md to match and show me the diff.

**Result.** C-93 to C-103 drafted: my five rows as dictated, plus provisional answers to
G-03 (staff raise no Tickets of their own), G-04 (claiming does not change status), G-05
(staff read and download Attachments, never write), G-06 (the 409/422 line) and G-07 (403
`PASSWORD_CHANGE_REQUIRED`). C-98 made `CLOSED` terminal and the matrix now agrees.

**What went wrong.** The round surfaced a hole in my own C-93 rather than in the document:
C-93 requires a Ticket in a worked status to have an owner, but as drafted it checked that
only at the moment of the transition, so the Ticket could be unassigned a second later and
sit in `IN_PROGRESS` with nobody accountable. The agent's proposal was to **document the
edge**. Documenting a hole is not closing it, so I closed it instead - see 2.8.

---

### 2.8 Prompt 1.4, gap round 2 - close the unassign edge, then commit

Sent verbatim:

> Accept C-93..C-103 with two changes, then commit.
>
> 1. C-100: LAST_ADMINISTRATOR moves to 409 - it depends on the state of other User rows,
>    so by C-100's own line it is a conflict. SELF_DEACTIVATION stays 422. Add
>    to C-100 that L2's five-active-attachment refusal stays 422 as a carried Lab 2
>    contract, so the audit does not read it as a contradiction.
> 2. Close the unassign edge instead of documenting it: unassigning a Ticket that is
>    In Progress, Waiting for Requester or Resolved returns 409 OWNER_REQUIRED - move it
>    to Open first. Reassigning to another eligible user stays allowed. Reason: C-93 says
>    a ticket being worked on must have someone accountable; this keeps that true at all
>    times, not only at the moment of the transition. Add it as C-104 and update the BR,
>    AC and matrix note.
> 3. CLAUDE.md: replace both "C-53..C-92" with "C-53 onward".
>
> Then pre-commit inspection and two commits:
> - "docs: add the Lab 3 specification and close its gaps (C-93..C-104)" -
>   specification.md + decisions.md
> - "docs: stop pinning the decision range in CLAUDE.md" - CLAUDE.md
> Push, and stop.

**Result.** C-104 closes the unassign edge; C-100 puts `LAST_ADMINISTRATOR` at 409 and
records that `L2 BR-39`'s attachment refusal keeps its 422; BR-97, AC-111, AC-117 and the
section 5.1 and 5.2 matrix notes follow. Committed as `c281d50` and `0c6d1cc`, pushed.

**What went wrong.** Nothing in this round. It is recorded because it is where two defects
from 2.6 and 2.7 were actually closed, and because the pattern in both is the same: the
agent will offer to *write down* a hole rather than fix it unless told which it is.

---

### 2.9 Prompts 1.5 to 1.7, run unattended **(key prompt)**

Sent verbatim, opening:

> Autopilot for the rest of Issue #37. Do not wait for me between steps. The exact prompts
> are in docs/lab-03/handoff.md section 7.
>
> 0. Start docs/lab-03/ai-use.md as a running log of the prompts I gave you this session
>    (1.1, 1.2 + decision rounds, 1.3, 1.4 + gap round), verbatim, one line each on the
>    result and what went wrong [...]. Commit, push. Then open a DRAFT PR [...]
> 1. Prompt 1.5: api-spec.md, then ui-spec.md.
> 2. Prompt 1.6: tests.md.
> 3. After each file: run a reviewer subagent with the 1.7 audit checklist, scoped to that
>    file against specification.md and decisions.md. Fix pure consistency errors
>    yourself. Then pre-commit inspection, commit that file on its own, push.
> 4. Prompt 1.7: a full audit by a fresh subagent across all docs/lab-03 files. Fix what
>    is purely consistency; commit, push.
> 5. Append this prompt and a one-line result per step to ai-use.md.
>
> Stop only when:
> - something needs a decision that decisions.md does not cover. Do NOT invent a rule.
>   Collect every such item into one list with options and your recommendation, finish
>   everything that does not depend on it, then stop and ask me once;
> - or all steps are done. [...] Do not mark the PR ready.

**Result, one line per step.**

| Step | Result |
|---|---|
| 0 | `ai-use.md` opened (`9e5ab71`); draft PR **#46** opened against `lab3-staging` |
| 1 | `api-spec.md`, 30 endpoints (`b730b07`); `ui-spec.md`, 25 sections (`f29cfc7`) |
| 2 | `tests.md`, 278 planned tests across the eight `LS 10` levels, 117 of 117 ACs traced |
| 3 | Three scoped audits run. `api-spec`: 4 defects, all miscitations or arithmetic. `ui-spec`: 6, one of them an invented rule. `tests`: 3 classes, all mechanical. All fixed |
| 4 | Four items needed decisions and were escalated rather than invented - see 2.10 |
| 5 | This section |

**What went wrong - a correction to me, mid-run.** I wrote the first documents with shell
heredocs, and two of them truncated: `ai-use.md` gained a joined line inside a quoted prompt
and lost the end of a bullet. I caught it and ordered the agent onto the Write and Edit tools,
one section per call, and a re-check of everything already written. Nothing was lost, but the
lesson is that a long document written through a shell here-document has a silent failure
mode, and a document is exactly the artifact where a silent truncation is least likely to be
noticed.

**What went wrong - the same failure as 2.6, caught earlier this time.** `ui-spec.md` claimed
the Change Password screen was "shown to a user with an outstanding password change, **and to
nobody else**; also reachable deliberately by a user who simply wants to change their
password." The two halves of that sentence contradict each other, the second half had no
basis in `specification.md`, no navigation entry and no FR, and it was written on the
document's own authority. This is the reopenable-`CLOSED` mistake of 2.6, one document later.
The subagent audit found it; no assertion would have. That is the argument for the audits.

---

### 2.10 The four decisions the drafts refused to make **(key prompt)**

`api-spec.md` section 12 and `ui-spec.md` section 25 each declared what they needed and could
not find, with options and a recommendation, and resolved none of it. I answered all four.

Sent verbatim:

> Decisions for the four open items - add them as the next C-rows with my reasons:
> 1. Assignable users: add a staff endpoint, IT Staff and Administrator only, returning
>    id, name and role of active IT Staff and Administrator users - no email. Reason: the
>    owner picker needs the list, and the user-admin API is Administrator-only.
> 2. Wrong current password on change-password: 422 CURRENT_PASSWORD_INCORRECT, shown at
>    the current-password field. Never 401. Reason: the client treats 401 as an expired
>    session and sends the user to Login.
> 3. User list order: fixed, by name ascending (then id); no user-controlled sort.
>    Reason: 8.5 does not require sorting, and a fixed order keeps tests and screenshots
>    stable.
> 4. Queue at tablet: keep Ticket No, Summary, IT Priority, Status, Owner, Last Updated;
>    hide Created, Category and Requested Priority (still on the detail screen). Fix
>    specification.md section 6 to match FR-39 - the conflict is fixed at its source.
>    Then tighten RESP-04 to assert exactly these columns. Reason: at tablet width the
>    columns that pick the next piece of work stay; the rest is one click away.
>
> Also: 275 planned tests is about 2.5x Lab 2. List any that duplicate another test's
> assertion and propose merges - do not remove any without telling me.

**Result.** C-105 to C-108 recorded with my reasons; BR-104 to BR-107 added; all four
propagated through `specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md`; three
tests added (API-116, API-117, SEC-27) and two tightened (API-16, RESP-04). The duplication
review is `tests.md` section 9: six merges proposed, seven IDs saved, nothing removed.

**What went wrong - in the contract, not in this round.** Item 4 was not a silence in
`decisions.md`; it was `specification.md` section 6 disagreeing with its own FR-39 about the
queue's tablet columns, naming a Related System column that FR-39 never creates. The agent
reported it rather than picking a side, which is what `CLAUDE.md` asks for, and C-108 fixed it
at the source rather than papering over it in `ui-spec.md`. Two contract documents had
disagreed since the specification was written and nothing had caught it until a document tried
to build on them both.

**One decision went against the recommendation.** `api-spec.md` recommended 400 for a wrong
current password; I chose 422, because the client treats 401 as an expired session and the
409/422 line C-100 already draws puts a refusal about a submitted value at 422. Both the
recommendation and the decision are recorded, so the disagreement is on the record rather than
silently overwritten.

---

### 2.11 Peer review of PR #46 - the first defect a person found **(key prompt)**

My reviewer, PAKATO, commented on the PR:

> Comments on Terminal Tickets: the status transition matrix strictly defines CLOSED and
> CANCELLED as terminal states, but BR-68 broadly allows the owning Requester, IT Staff,
> and Administrator to post Public Comments on a Ticket without mentioning status
> constraints. You should clarify whether users can still write comments on a ticket
> after it is closed.

I decided it as C-109, sent verbatim:

> My decision, as C-109: a Closed or Cancelled Ticket is read-only for every role. Posting
> a Public Comment or an Internal Note, uploading or removing an Attachment, and changing
> owner, IT Priority or status all return 409 (a state conflict under C-100). Reading and
> downloading stay allowed. Reason: C-98 makes both statuses terminal with no way back,
> so anything written after closure reaches nobody who can act on it; the Requester
> raises a new Ticket instead. Resolved stays open to comments because a Resolved Ticket
> can still be Reopened.
>
> Apply it everywhere it lands [...] If a Closed/Cancelled refusal code already exists
> (AC-81), reuse it rather than adding a second one, and tell me which name you kept.

**Result.** C-109 recorded; BR-108 added and BR-68 and BR-96 narrowed; six cells of the
section 5.2 matrix gained a terminal refusal; six `api-spec.md` endpoints gained a 409; three
`ui-spec.md` screens now hide their write controls on a terminal Ticket; AC-118 and five tests
added. On the code question: the status-change path **keeps `INVALID_STATUS_TRANSITION`**,
which the matrix already generates and AC-81 already asserts, and exactly one new code
**`TICKET_CLOSED`** covers the other five write operations.

**What went wrong - and it is the most useful finding of the phase.** Four subagent audits
across five documents did not find this. They could not: BR-68 and the section 5.1 matrix were
each internally consistent and neither referred to the other, so there was no contradiction to
detect - only an unasked question. It is the same shape as the C-108 defect, and both were
found by a human reading for *meaning* rather than for agreement. The audits are good at
"these two statements disagree" and blind to "nobody ever decided this".

That is the argument for the mandatory peer review in `LS 11.1` being a real review and not a
rubber stamp, and it is why this row is in the log rather than quietly fixed.

---

## 3. Phase 1 running summary

| Prompt | Produced | Commit |
|---|---|---|
| 1.1 | The codebase survey, later saved as `phase1-analysis.md` | `be7ae9b` |
| 1.2 + three decision rounds | `decisions.md` C-53..C-92 | `88ac142`, `c5e6eaf` |
| 1.3 | `CLAUDE.md` rewritten for Lab 3 | `fbfa6e0` |
| 1.4 + two gap rounds | `specification.md`, and C-93..C-104 closing all ten gaps | `c281d50`, `0c6d1cc` |
| 1.5 | `api-spec.md` (30 endpoints), `ui-spec.md` (25 sections) | `b730b07`, `f29cfc7` |
| 1.6 | `tests.md` - 278 planned tests, eight levels, 117 of 117 ACs traced | see section 4 |
| 1.7 | Four scoped subagent audits; 13 defects found and fixed, none substantive | see section 4 |
| Decisions | C-105..C-108, BR-104..BR-107, propagated through four documents | see section 4 |
| PR #46 review | C-109, BR-108, AC-118 - the terminal-Ticket write lock, found by my reviewer | see section 4 |

Four defects are worth carrying into the implementation phase. The first three are the same
failure mode - the agent resolving silently what it was told to escalate - and the fourth is
what the audits exist to catch:

1. **An invented rule inside the contract.** Section 5.1's reopenable `CLOSED` had no
   decision row, in a document whose prompt ended "list the gap at the end instead of
   inventing a rule". C-98 settles it. Every later document is audited by a subagent that
   did not write it, for exactly this.
2. **A hole offered as documentation.** The unassign edge in C-93 was proposed as a
   documented limitation rather than a fix; C-104 closes it. "Tell me about the edge case"
   and "close the edge case" are different instructions, and the default is the first.
3. **The same invention, one document later.** `ui-spec.md` gave the Change Password screen
   a second way in that no requirement, navigation entry or decision row supported - and
   contradicted itself inside the same sentence doing it (2.9). Removed against
   `specification.md` section 6. It happened *after* defect 1 was recorded, which is the
   point: recording a failure mode does not stop it recurring, an audit does.
4. **Two contract documents had disagreed since Phase 1 and nothing had noticed.**
   `specification.md` section 6 dropped a queue column its own FR-39 never creates. No test
   could have caught it, because no test existed yet and both readings were self-consistent.
   C-108 fixed it at the source (2.10).

5. **A question nobody had asked.** BR-68 let any permitted role comment on a Ticket; section
   5.1 made `CLOSED` and `CANCELLED` terminal. Neither mentioned the other, both were
   internally consistent, and **four audits across five documents missed it**. My reviewer
   found it by reading for meaning. C-109 closes it (2.11).

**What actually caught things.** Thirteen defects across four documents were found by
subagent audits that had not written the document under review, and none by the session that
wrote it. The fourteenth - the one that changed a rule rather than a citation - was found by a
person, and the audits could not have found it: there was no disagreement to detect, only a
question nobody had asked. The single most productive instruction in the whole phase was the one that told
each document to *declare what it needed and could not find* rather than fill the gap - that
is what turned four silent inventions into four decisions with reasons attached.

## 4. Phase 2/3 prompt log - Issues #38-45, implementation

Issues #38-41 (data migration, authentication, authorization and regression, the staff
queue) were implemented in earlier sessions whose own prompt-and-result detail is not
available to the session that wrote this section - rather than reconstruct it from the
commits alone, this section covers only the prompts this session actually received and
can quote first-hand: the autopilot that ran Issues #42-45, and the decision points it
escalated rather than invented.

### 4.1 The autopilot prompt - Issues #42 through #45 **(key prompt)**

Sent once, verbatim, opening:

> Read CLAUDE.md first; follow its Token budget section and Evidence rules.
>
> AUTOPILOT: finish every remaining feature PR - #42, #43, #44, #45 - stacked per C-110.
> Nothing merges into lab3-staging. PAKATO reviews everything at the end.
>
> How to run it, to keep this session small:
> - You are the coordinator. Do each Issue below in its own fresh general-purpose
>   subagent, one at a time, in order. [...]
> - After each worker returns, spawn a separate audit subagent scoped to that Issue's
>   diff [...] If it finds defects, spawn a worker to fix them, then move on.
> - If a worker needs a decision the contract does not cover, stop everything and ask me.
> - If interrupted, on restart check git log, the PRs and the board, and resume from the
>   first Issue whose PR is not open.
>
> [per-Issue contract citations and scope for #42 (staff ticket ops), #43 (user admin),
> #44 (e2e/visual and the evidence database), #45 (this document, the README, the
> tests.md Final column, reviewer.md, report-lab03.md) - full text in the session that
> received this prompt, not reproduced here]
>
> FINAL REPORT, at most 25 lines: the four PR links, test counts, pending evidence rows,
> and up to 8 factual bullets for my reflection [...]

**Result.** PRs #51 (#42), #52 (#43), #53 (#44), and this Issue's PR for #45 - all four
stacked per C-110, each audited, nothing merged into `lab3-staging`.

**What went wrong.** Two of the four worker subagents stalled mid-task (no progress for
600s) and had to be resumed by inspecting the branch's uncommitted working tree directly
rather than restarting from nothing - the #43 worker stalled with the server implementation
done but a type error and two real test bugs unresolved (see 4.3); the #45 worker stalled
partway through filling `tests.md`'s `Final` column, with nothing committed. Both resumptions
found the stalled work genuinely usable, not corrupted, which is the only reason resuming
rather than restarting was worth trying.

### 4.2 A code-reading mistake, caught by checking the database it actually queried

While investigating a server test failure (`DB-06`, a Lab 2 regression that appeared only
when the full suite ran), I wrote throwaway Node scripts to inspect "the" database for
orphaned rows, got zero results, and concluded the failure was a transient artifact of the
test run itself. It was not: the scripts used `new PrismaClient()` with no `datasources`
override, which reads `server/.env`'s `DATABASE_URL` - the **dev** database, `toktickit`,
never the test database, `toktickit_test`, that the failing suite actually ran against.

**What went wrong.** A wrong-database read produced a clean negative that looked like
confirmation. Pointing the same script explicitly at `toktickit_test` found the real rows
at once: two `users-admin.api.test.ts` fixtures left behind by an earlier failed run,
because that one test's cleanup ran as plain trailing code rather than `try/finally` -
fixed in the same commit the orphans were found and removed in.

### 4.3 Decision exchanges - three questions escalated rather than invented **(key prompt)**

Each raised by a worker's own report or by this session's own review of a worker's diff,
each resolved by asking rather than guessing, in the same shape as Phase 1's 2.6 and 2.10:

**C-113 (the refusal order on a terminal Ticket) and C-114 (the Requester owner DTO's
missing `isActive`).** The #42 worker flagged that the contract never states whether
`TICKET_CLOSED` (C-109) precedes or follows body validation, and separately that
`ui-spec.md` 14.1 asks the Requester screen to render an owner `(inactive)` qualifier the
DTO (`api-spec.md` 10.2) has no field for. Asked as two questions in one round; answered:

> On a staff write to a Closed/Cancelled ticket with a malformed body, which refusal wins?
> [...] Option 1: ownership -> TICKET_CLOSED 409 -> body 400 -> the operation's own
> 409/422. Swap the order and its tests. Also write the step into api-spec 1.4's check
> order and add one line to C-109 saying where it sits [...]
>
> [... and, on the DTO gap:] Add isActive to the DTO (Recommended).

**Result.** C-113 and C-114 recorded; the refusal order swapped in four route handlers and
pinned by a new test (API-121); the DTO, its client type, and `TicketDetail.tsx` all gained
`isActive`, with a mirrored test (UI-53) for the Requester screen's own `(inactive)` marker.
A follow-up audit of the same diff found one more interaction the fix had not stated an
order for (`ATTACHMENT_REMOVED` versus `TICKET_CLOSED` on a removed Attachment whose Ticket
later closed); asked and answered the same way, with the user's own reasoning for why -
"the resource is gone" precedes "the resource may not be changed", matching the existing
Lab 2 precedent for `disposition` - and recorded as a line in C-109 rather than a new row.

**C-115 (how to test "exactly one active Administrator" without breaking every other e2e
spec).** An audit of the #43 diff found this session's own first attempt at the
`LAST_ADMINISTRATOR` e2e test had deactivated the seeded Administrator account to force the
precondition - which revoked her session and corrupted the `STATE.administrator`
storageState file every other spec in the parallel Playwright run depends on, observed
directly as cascading 403s across unrelated tests. Asked what the right design was;
answered:

> None of these. Use the sole-Administrator self-demotion path, which mutates nothing: [...]
> panida.s opens her own record, changes her role to IT Staff, saves, and gets the 409
> LAST_ADMINISTRATOR feedback. The refusal changes no row and revokes no session, so it is
> safe in the parallel run and needs no restore. [...] Before acting, the test asserts
> through the API that exactly one active Administrator exists. [...] No e2e test may
> create an active Administrator [...] Deactivating another Administrator and the
> two-Administrators race stay covered at API level [...]

**Result.** C-115 recorded with that reasoning; E2E-23 rewritten to the self-demotion path;
the account restored and its session recaptured (`npx playwright test --project=setup`)
before any other spec ran again.

**What went wrong, across all three.** Each time, a worker (or this session's own first
pass) reached for the technically-direct way to reproduce a scenario - swap an order
without checking if the swap itself has edge cases, add a field without checking the two
documents that jointly needed it agreed, force a global precondition by mutating the one
account every other test depends on - and each time the *actual* answer required knowing
something the contract did not yet state. The pattern from Phase 1 holds in Phase 2: an
agent will resolve silently what it was told to escalate, unless the instruction to
escalate is followed exactly and the question is asked plainly enough to answer in one
round.

### 4.4 An audit found what a prior Issue's own workers had written without authorization **(key prompt)**

The #44 audit found that `tests.md` and `evidence.md` carved an unauthorized exception into
the contract - `queue-<vp>-empty.png` "stays desktop-only... not reproducible without
corrupting other Issues' fixtures" - with no decision row behind it, and the claim itself
was wrong: the very next test in the same spec file already mocks the same endpoint via
`page.route()` for the loading and failure captures, fully decoupled from any real database
state. Fixed directly, without a decision round, since there was no genuine conflict to
resolve - only an unapplied technique. The carve-out is gone; `queue-<vp>-empty.png` is
captured at all three viewports the same way its neighbors already were.

## 5. My Reflection
<!-- DRAFT: Tammathorn edits this before merge -->

**The specification agent was most useful when it disagreed with me.** Before writing
anything, it read the labsheet and the Lab 2 code and found what my own plan had missed:
the five-value status list hard-coded in three more places, the IT Priority backfill
breaking four existing tests, queue indexes that could not serve an unscoped queue, and
two of my own decisions answering the same question two ways. Across sixty-three decision
rows (C-53 to C-115), the rule that paid off most was the one carried over from Lab 2:
report a conflict, never resolve it silently.

**Its characteristic failure was inventing rules, and writing the failure down did not
stop it.** The first draft of specification.md made a Closed ticket reopenable with no
decision behind it. I recorded that here as a defect, and two documents later ui-spec.md
invented a second route into Change Password in the same way. An audit subagent that had
not written either document caught both. No test could have caught them, because a test
only checks what the contract already says.

**Peer review found what four AI audits could not.** PAKATO asked whether a Closed ticket
can still take comments. BR-68 and the status matrix were each internally consistent, so
there was no contradiction for an audit to detect - only a question nobody had asked. It
became C-109 and changed five documents. AI audits are good at finding contradictions; a
human reader is better at finding missing questions.

**The coding agent was fast and mostly careful, but I could not trust its own account of
what it had done.** Tests first and per-Issue audits caught real defects, including a
malformed login body that came back as Express's HTML error page quoting the password.
But it silently skipped one item of a four-item prompt, and I only found out by checking
the branches on GitHub myself. In #43, its first attempt at the last-Administrator test
deactivated the seeded Administrator mid-run and broke every other spec's shared session;
the fix (C-115) was to test the rule through a refusal that changes nothing. "Verify by
evidence, not by the report" was still the most important rule from Lab 1.

**What I would change.** I stacked nine PRs and asked for review once, so I would never
wait on it. That kept the work moving, but every review comment now arrives after the
code built on top of it. Next time I would keep stacks to two or three PRs and ask for
review as each one opens. I would also write long prompts as numbered checklists and
confirm each item against the repository before moving on - the real cost of an agent
was less the tokens it used than the instructions it quietly dropped.

*Drafted with Claude from my notes and the sprint record; edited by me.*
