# Lab 4 AI Use and Reflection

TokTickIT - CPE 334 Individual Sprint 4 (LS 14 Part 4).

| | |
|---|---|
| **Author** | Tammathorn Kananurak - 67070503489 - GitHub [@Tammathorn](https://github.com/Tammathorn) |
| **Repository** | <https://github.com/Tammathorn/toktickit> |

## 1. The LLMs I used and how

Two Claude sessions, with different jobs:

| Role | Where it ran | What it did |
|---|---|---|
| **Planner** | Claude (claude.ai, Opus), a cloud session linked to my PC | Read the labsheet and the Lab 3 code, wrote `docs/lab-04/handoff.md`, drafted every Phase 1 prompt, answered the questions the executor raised, wrote the server and client implementation as one patch per Issue, wrote the Lab 4 client tests and ran them in its own cloud workspace |
| **Executor** | Claude Code on my PC, inside `C:\Downloads\Lab1_Starter_Scaffold\toktickit`: Opus for the contract and bridge tasks 001-004, Sonnet for tasks 005-008 (the protocol changed on 31 Oct 12:00 to save usage) | Wrote the contract documents from my decisions, wrote the server tests first, applied the planner's patches, ran the three suites against Docker PostgreSQL, fixed what failed, captured evidence, committed, pushed and opened the PRs |

From Issue #64 on, the two talked through files under `tmp/lab4/bridge/` (`PROTOCOL.md`,
`inbox/task-NNN.md`, `outbox/task-NNN.report.md`, and `.question.md` / `.answer.md` pairs when the executor was blocked). `tmp/` is ignored by git, so those files are not in the repository; they are quoted below. The protocol forbids the executor to merge,
force-push, touch `main`, or weaken a test, whatever a task says. Merging stayed with me after
PAKATO's review.

The planner could not run the server itself: its cloud workspace blocks the Prisma engine
download, so every server-side change was verified only on my PC. Client tests did run in the
cloud. (This is how the planner described its workspace; nothing in the repository shows it.)

From 31 Oct 12:00 the protocol dropped the separate Opus audit subagent (its "Deadline day" and "Model" sections), so Issues #64-#67 (tasks 001-004) each had one read-only Opus audit and Issues #68-#71 had none.

## 2. Key prompts (marked **(key)**) and what I did with each result

### 2.1 Planning - "วางแผนการทำงาน lab 4" **(key)**

The planner cloned the repository, read `CLAUDE.md`, the schema, the routes and the Lab 3
decision log, and wrote `handoff.md`: what Lab 3 left that Lab 4 breaks (the `CLAUDE.md`
"never add Actions Taken" rule, a status PATCH with a silent three-attempt retry and no stale
check, `updatedAt` missing comments), the Lab 3 process gaps not to repeat (contract merged
after the code, one batch review, no card ever in Fixing), 28 decisions with recommendations,
and a 14-day calendar. **What I did:** gave the real deadline and reviewer availability, which
turned the calendar into dates and changed the stacking rule.

### 2.2 Prompt 1.1 - read first, write nothing **(key)**

Claude Code read everything in plan mode and was told not to agree to be agreeable. It found
what the plan got wrong: My Tickets already read its filters from the URL; the route-inventory
test only checked anonymous 401; the client duplicated the status matrix; the gate's "latest
action" by `actionAt` had a hole; `clientRequestId` minted once per form would swallow a second
comment; the plan was too large for the days left. **What I did:** answered its 15 questions,
accepting most and changing three.

### 2.3 Prompt 1.2 - the decision log, in my words

C-122 to C-158 at first; the later prompts took the log to C-189 and the Issue #64 to #69 audits to C-198 (C-196 is unused). **What went wrong:** my cut-order wording said the opposite of what I meant
("cut D-13 down to Ticket create"). The executor flagged it as conflicting with D-13's own
reason instead of writing it as given. A scripted edit also wrote nine reasons onto line 1 of
the file; the next prompt made it check the whole table, not just line 1.

### 2.4 The two times the executor refused my answer **(key)**

While settling the specification's open questions:

- I said the Urgent list matched the queue's order "createdAt asc, id asc". The executor
  stopped: L2 C-29 and the code break ties on `id desc`, so the card and its drill-down would
  disagree. I took its option (a).
- I put the terminal-status refusal before body validation. It stopped again: that turns
  Closed -> Closed from 400 `SAME_STATUS` into 409 and breaks API-64 and API-66. We wrote out
  the status route's seven steps in full instead (C-164, BR-89).

Both times it named the rule, the file and the test, and offered two options. Neither change
was made silently.

### 2.5 Prompts 1.3 to 1.6 - CLAUDE.md, specification, api-spec, ui-spec, tests.md

Each ended with "Questions for me" instead of invented rules: 8 from the specification, 6 from
the API and UI specs, 9 from the test plan. One answer (rejecting every unknown field with 400)
conflicted with L3 C-64, which ignores identity fields; the executor caught it and I split the
rule (C-175).

### 2.6 Autopilot through files **(key)**

When computer control turned out to allow only clicks in a terminal, the planner could not
type into Claude Code. I asked it to run the two sessions through text files instead. It wrote
`PROTOCOL.md` with hard limits the executor never crosses, and queued one task per Issue.

### 2.7 Bugs found by checking, not by reading

- **The row lock must not write on refusal.** The contract (C-137, BR-34, api-spec 2.1) described
  the lock as a conditional `UPDATE` that sets `lastActivityAt`; a status change refused by the
  gate would still have moved it. The planner's patch for Issue #64 already uses
  `SELECT ... FOR UPDATE` and writes `lastActivityAt` only on success (`lockTicket` and `touchTicket`
  in `server/src/lib/workflow.ts`, with a comment saying so). The executor's task 001 report named
  the mismatch with the documents, and Issue #71 corrected them (C-190).
- **The seed missed two contract rules.** The VPN Ticket's actions involved only two staff, not
  three (BR-02), and seeded `lastActivityAt` ignored Public Comments (BR-46). The audit's test
  (MIG-20) fails on the original seed: `artifacts/lab-04/evidence/issue-2/red-migration-audit-fix.txt`,
  1 failed, 41 passed. The Issue #2 README also records that one dev-database row from the first,
  wrong seed run was deleted by hand before the seed was re-run - the kind of edit the later tasks
  were forbidden to make (C-198).
- **History rows blocked test cleanup.** The new `TicketStatusChange` foreign key made the Lab
  2/3 test cleanups that delete Tickets fail. Options were offered; I chose a cleanup helper over
  a cascade, because history is append-only. The helper is `deleteTickets` in
  `server/tests/support/cleanup.ts`; `tests.md` 4.1 lists the 8 `afterAll` blocks and 4 inline
  deletes it replaced.
- **Two suites at once.** The executor ran two server suites against the same database and
  left 449 Tickets behind, then said so and cleaned up (the count is as recalled when this was
  drafted; it is not in any file). Every task file from 001 to 005 now says "Never run two server
  suites at once".

### 2.8 The bridge tasks 001-007 - the prompts that mattered **(key)**

Each task file was the prompt: numbered steps, hard limits, and "tests first, red run saved, then
the patch". Quoted from `tmp/lab4/bridge/inbox/`; outcomes are from `outbox/` and the evidence
folders.

| Task / Issue | The prompt that mattered | What it produced, and what went wrong |
|---|---|---|
| 001 / #64 | "Write the tests first ... Run only the new files. They must fail. Save the red run ... `git apply` the patch ... One read-only audit (a second subagent, Opus)." | Red run 62 failed; then 63/63 green; server 339 -> 402. The patch applied cleanly. Changes to it: the BR-04 validator is the Lab 3 one, `id` and `ticketId` are refused rather than ignored, a stale or finished action never gets 400, an assignee id beyond int4 is 422 not 500. Six contract points went back to the planner; C-190 to C-194 are those. Wrong: the task was interrupted on 28 Oct when the PC went offline and resumed from a half-finished branch. |
| 002 / #65 | "Fix the cause of any failure: a fix to the patch is fine; weakening or deleting a test is not." | Client 128 -> 166. The audit found a lost update: "Apply my changes again" after `STALE_UPDATE` re-sent another user's changed fields with their old values; now only this user's changes are sent (UI-34). The composer's default "now" was cut to the minute, so the server refused it on a Ticket created in that minute (BR-07); fixed (UNIT-09). Wrong: the executor ran `git stash` and popped it at once; nothing was lost. This task's hard limits now forbid it. |
| 003 / #66 | "Never run two server suites at once. After any e2e run: `git checkout -- artifacts/lab-02 artifacts/lab-03` before staging." | Server 402 -> 470. L3 E2E-47 began timing out at 30 s because the unpaginated user list on the dev database grows with every e2e run; the executor stopped and asked (options A to D) and the planner answered B: `test.slow()` with a comment, no assertion changed, recorded in `tests.md` 4.1. One run then hung 4.7 hours (a host stall). The audit found an `ownerId` past int4 gave a 500. |
| 004 / #67 | "Part 5: ... one psql query per staff card, beside the API JSON of the same moment." | Server 470 -> 494, client 166 -> 192. The audit's one blocker was a missing `aria-live` on the Updated line. Wrong: the Administrator header overflowed 84 px at tablet once `Dashboard` joined the nav (L3 RESP-12 failed); fixed in `theme.css`. The API JSON, `meta.total` and `psql -f` agree on all 11 cards and the 3 user cards. |
| 005 / #68 | Tests only; "No planner patch this task". | Server 494 -> 510. API-57 failed because `toktickit_test` still held two Tickets from the seed before commit `1c688b5`. The executor stopped and asked (A delete the two rows, B drop the test database, C leave it red); the answer was B, so only `toktickit_test` was dropped and rebuilt (C-198). No test was weakened. |
| 006 / #69 | "DEADLINE CUT (31 Oct): skip the focus-management, UI-50 and test-gap items ... Record them ... as 'not done - deadline', honestly." | The console-error fixture (E2E-28..32) and C-195. The cuts are in `tests.md` 6.1. Wrong: C-195's rationale was the executor's own - the audit found the screen renders cards, so the contract was changed to follow the screen. |
| 007 / #70 | "Measure every visual and accessibility checklist row ... Never tick from reading CSS." | The first measurement found real defects (Bootstrap blue links and checkboxes, red field errors, off-token focus rings, touch targets under 44 px at 390, a badge 23 px past the screen edge), fixed in `theme.css`; 165 screenshots. Wrong: two full runs each lost one API sign-in to `ECONNRESET` (kept as evidence; `apiAs` now retries a thrown reset); the first push failed with HTTP 408 (20 MB of PNG) and went up in two ordinary pushes. |
| 008 / #71 | This documentation task: "If two instructions below conflict, list the conflict in the report ... do not resolve it silently." | Three conflicts were reported rather than resolved: the planner's "per Requester, per Ticket create only" scope for `clientRequestId` against C-158 and the code; the planner's later ruling that Ticket create keeps the key, which the code and WF-64 contradict; and task 003's statement that the queue's default sort reads `updatedAt`, which `list-query.ts` contradicts. |

What I should have caught earlier: the contract said "conditional UPDATE" for the row lock for
several Issues after the code stopped doing it, and `tests.md` listed SEC-23 as adapted when it
makes no staff PATCH. Both were found by the executors reading the code against the documents,
not by my review of the documents.

## 3. What the AI could not do

- Review my code as PAKATO does, or merge after review.
- Run the server in the planner's workspace (Prisma engine download blocked, as the planner reported).
- Type into a terminal through computer control (terminals are click-only).

## My Reflection

<!-- Written by me, in my own words. -->
