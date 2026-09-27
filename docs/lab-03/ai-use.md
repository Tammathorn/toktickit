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

### 2.6 Prompt 1.4 - the specification

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

## 3. Phase 1 running summary

| Prompt | Produced | Commit |
|---|---|---|
| 1.1 | The codebase survey, later saved as `phase1-analysis.md` | `be7ae9b` |
| 1.2 + three decision rounds | `decisions.md` C-53..C-92 | `88ac142`, `c5e6eaf` |
| 1.3 | `CLAUDE.md` rewritten for Lab 3 | `fbfa6e0` |
| 1.4 + two gap rounds | `specification.md`, and C-93..C-104 closing all ten gaps | `c281d50`, `0c6d1cc` |

Two defects are worth carrying into the implementation phase, because both are the same
failure mode - the agent resolving silently what it was told to escalate:

1. **An invented rule inside the contract.** Section 5.1's reopenable `CLOSED` had no
   decision row, in a document whose prompt ended "list the gap at the end instead of
   inventing a rule". C-98 settles it. Every later document is audited by a subagent that
   did not write it, for exactly this.
2. **A hole offered as documentation.** The unassign edge in C-93 was proposed as a
   documented limitation rather than a fix; C-104 closes it. "Tell me about the edge case"
   and "close the edge case" are different instructions, and the default is the first.

## 4. My Reflection

Written at release, when the sprint has finished and there is evidence to reflect on rather
than intentions.
