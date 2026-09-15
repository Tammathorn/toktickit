# Lab 2 AI Use and Reflection

TokTickIT - CPE 334 Individual Sprint 2.
Author: Tammathorn Kananurak (67070503489), GitHub @Tammathorn.

Finished in Issue #17. The Phase 1 draft of this document (committed with PR #18) covered
only the specification prompts; this version covers the whole sprint, Issues #10 to #17.
The prompt table stays at ten entries, as Part 4 asks for six to ten: five Phase 1 entries
were replaced by implementation-phase prompts rather than appended to.

---

## 1. The LLM I used

| | |
|---|---|
| **Model** | **Claude Opus 5**, for every phase |
| **Primary interface** | Claude Code (CLI), run from `C:\Downloads\Lab1_Starter_Scaffold\toktickit` |
| **Secondary interface** | Claude in the browser, for planning and for arguing with proposed decisions before I approved them (Phase 1 only) |
| **What changed from the plan** | `handoff.md` section 5 planned Sonnet for implementation with Opus for audits. In practice every Issue ran on Opus: the implementation work was one long session per two or three Issues, and the audit-quality reading of the four contract documents was needed on every task, not only at the end |

The interface split in Phase 1 was deliberate: the browser for open questions, Claude Code
only once a decision was settled and a file had to change. From Issue #11 onward there
were no open questions of that kind - the contract existed - so everything ran in Claude
Code against the four documents and `decisions.md`.

The working agreement also changed mid-sprint, and it is the most important thing in this
document. Lab 1's `CLAUDE.md` and the Phase 1 version of the Lab 2 one said **"I do not
run git"**: the agent printed commands, I ran them. After Issue #11 I replaced that with
the agent running `git` and `gh` itself under two hard limits - **never `git add .` or
`-A`, always explicit paths with a `git status` after staging; every `gh pr create`
carries `--base lab2-staging`** - plus no force-push, no rebase of a pushed branch, no
merge into `main` outside the release PR, and a pre-commit inspection owed before every
commit. Section 3 says why.

---

## 2. Key prompts

Ten prompts, abbreviated. Phase 1 prompts are in `docs/lab-02/handoff.md` section 7 in
full; the implementation prompts were issued directly in Claude Code and are quoted from
the session.

| # | Phase | Purpose | Prompt (abbreviated) | What it produced |
|---|---|---|---|---|
| 1 | Phase 1, before any file | Surface every decision I had to make, without letting the agent make them | *"Read the labsheet PDF and the existing CLAUDE.md. **Do not write any files yet.** Report: every deliverable grouped by PDF part; the business rules stated explicitly versus the eleven areas where I must discover rules myself; everything excluded from scope; and every ambiguity or conflict I need to decide before a specification can be written - with options and a recommendation for each."* | The ambiguity list that became `decisions.md`. Writing nothing was the point: it stopped the agent resolving conflicts silently inside a document I would then have had to reverse-engineer |
| 2 | Phase 1, decisions | Turn my answers into a numbered, binding record | *"Record the decisions I approved as C-01..C-41 in `docs/lab-02/decisions.md`. Every row: ID, area, the decision, my rationale, the labsheet clause. Where the labsheet contradicts itself, the decision is the resolution."* | C-01..C-41. Three rows override the handout rather than follow it (C-02, C-36, C-41). The log grew to C-52 by the end of the sprint; every later row cites the Issue that needed it |
| 3 | Phase 1, tests | Plan the evidence before implementation, and refuse to fake coverage | *"Write `tests.md` using the appendix B template. Planned-test table with the section 9.1 columns, `Final` left blank. All six levels. File paths must match section 12. Then produce the AC-to-test matrix. **Tell me explicitly if any AC has no test - do not quietly add one to make the matrix look complete.**"* | 103 planned tests, 67 of 67 criteria mapped, and an honest report that **AC-54** has no automated test and is discharged by the manual visual checklist |
| 4 | Phase 1, audit | Audit the specification from a session with no memory of writing it | *"`/clear`. **You are auditing a specification you did not write. Do not assume it is correct.** Report findings only, fix nothing. Find every labsheet requirement not covered; every contradiction with decisions.md; **every rule that traces to no labsheet clause and no decision ID**; any criterion no test could verify, and any that no test could fail."* | 40 findings, 8 blocking. The same model had written the file an hour earlier and rated it sound |
| 5 | Phase 1, peer review | Close a reviewer comment across every document it touched | *"Close the review comment on C-11. The reviewer noted C-11 says the Ticket Number derives from the autoincrement id but never says **when the id becomes available**. Fix it in three places: add C-49 to decisions.md; state the mechanism and the nullability consequence in specification.md section 7; state it in api-spec.md POST /api/tickets."* | C-49: create-then-update inside one `prisma.$transaction`, `ticketNumber` nullable in the schema but never null outside it. A real gap the peer review found that two AI passes had missed |
| 6 | Issue #11, close-out | Make the agent account for its own tree and correct its own documents before a commit | *"Tell me what AGENTS.md is and whether you created it. If it duplicates CLAUDE.md, say so plainly. Add DB-01..DB-08 to the planned-test table pointing at `data-model.db.test.ts`... note in section 7 that these rows were added because the schema, migration and seed carry DoD items no planned test covered. Record C-50: the Ticket Number's year is the UTC year of createdAt while the displayed date is Asia/Bangkok... Correct the 201 example: createdAt and updatedAt cannot be equal because C-49's create-then-update bumps @updatedAt. Run the pre-commit inspection, flag anything unexpected."* | It found `AGENTS.md` was a byte-identical, untracked duplicate of `CLAUDE.md` and excluded it; the eight DB rows and C-50 entered the contract; the example was fixed in all three places it appeared. The inspection habit - name every file, flag what does not belong - became the pre-commit rule in `CLAUDE.md` |
| 7 | Issues #12-#16, the working agreement | Let the agent run git, with the two limits that matter | *"Replace the 'never run git' prohibition with this working agreement: You run git and gh yourself. Two hard limits that never relax: never `git add .` or `git add -A`, always stage explicit paths and run `git status` after staging; every `gh pr create` carries `--base lab2-staging`. Never force-push, never rebase a pushed branch, never merge into main except through the single release PR. Commit messages carry no Co-Authored-By or Claude-Session trailer."* | Six feature PRs opened and merged in order (#22 branched from #21 and merged after it, so the graph stayed clean), every commit staged by explicit path, every PR against `lab2-staging`. The limits were never breached; the inspection before each commit caught the one file that did not belong (`AGENTS.md`) and kept `server/uploads/` out |
| 8 | Issue #13 follow-up | Fix a contract gap and a data-drift problem the implementation had exposed, and make the agent say which fix it chose | *"Add the system-generated-field rejection message to the ui-spec.md validation catalogue so BR-35's identical-message rule stays true... make the client and server both source it from the catalogue rather than a literal. The success screenshot creates a real Ticket per viewport on every run, which drifts the demo data Part 7 depends on. Make the spec clean up after itself - delete the Tickets it created, or create them under a dedicated screenshot Requester that the demo seed does not use. **Say which you chose and why.** Then re-run seed-demo.ts and confirm the Part 7 counts are back to 14 for A, 3 for B, 0 for C."* | The catalogue gained its row and both sides emit `MESSAGES.systemGenerated(name)`. It chose the dedicated Requester (the last active one, which the demo seed never touches) over an `afterAll` delete, because the Playwright project has no database access and the API has no delete endpoint - and said so. Ten drift rows were removed; counts confirmed 14 / 3 / 0 after every later run |
| 9 | Issue #15 and #16 | Enforce the one ordering the contract exists to protect, then settle it in writing | *"Enforce the check order api-spec fixes: ownership before removal state, so a non-owner gets 403 and never learns a file was removed."* - and after it flagged that api-spec 1.4 contradicted itself about `disposition`: *"Fix the contradiction: disposition is validated at step 5, after ownership and removal state, not at step 1. A step-1 400 would leak existence to a non-owner, which C-13 and C-44 exist to prevent. Record it as C-52 so the check order is settled rather than inferred."* | API-40 pins 403 for `attachment`, `inline` and an invalid value alike; 1.4 and 4.3 now say step 5; C-52 records why. The agent had implemented the decision's wording over the spec's and **flagged the conflict instead of resolving it silently**, which is the `CLAUDE.md` rule for contract conflicts |
| 10 | Issue #16, visual checklist | Force the checklist to be checked, not ticked | *"Complete the responsive visual checklist in tests.md against the screenshots already captured - all three viewports, **every row actually checked rather than ticked by assumption. Where a row fails, say so and fix the UI rather than the checklist.**"* | Two rows failed. Row 33: every control and button was 40 px at 390 px (ui-spec's 2.5 rem), so the search box, filters, pagination, brand, toggler and `Back to My Tickets` all missed the 44 px touch target - fixed with a mobile band rule, recorded in ui-spec 4. Row 35: the focus capture was taken before Bootstrap's 150 ms transition had painted the ring - fixed by waiting on computed styles. Both were invisible to every assertion in the suites; only a person reading the captures, with a probe measuring bounding boxes, found them |

---

## 3. My Reflection

**The working agreement changed, and it was right to change it.** Lab 1 and Phase 1 ran on
"I run every git command": the agent printed a block, I copied it. That was the correct
setting while I did not yet trust the agent's sense of what belonged in a commit. What
changed my mind was not confidence in the agent but the inspection it did before Issue
#11's commit - it named all seventeen files, found an untracked duplicate of `CLAUDE.md`
that I had not noticed, and left it out. Once the inspection was a duty rather than a
favour, the copying step was adding nothing except the chance for me to mistype a path.
So the rule became: the agent runs git, under two limits that never relax - explicit paths
only, and `--base lab2-staging` on every PR - with force-push, rebase-of-pushed and
merge-to-main forbidden outright. Six PRs later, every commit is staged by name, every PR
targets the right branch, and the one time order mattered (#22 branched from #21) the
agent merged them in order and said why. The limits are the point. "Never `git add .`" is
what makes "report exactly which files are staged" a checkable promise instead of a hope.

**The visual checklist caught what no assertion did.** I had 111 planned tests green - 86
server, 48 client, 126 Playwright across three viewports - and RESP-04 even asserted that
the mobile navigation rows were 44 px tall. Then the checklist row that says *touch
targets are at least 44 px at M* was measured, not ticked, and every single-line control
on every screen was 40 px: the search box, the filter selects, Previous and Next, the brand
link, the toggler. The tests had asserted what the spec said (2.5 rem, shared height) and
the spec had never reconciled that number with the touch-target rule in its own checklist.
The second miss was subtler: the focus screenshot showed a faint ring because it was taken
inside Bootstrap's 150 ms transition, and the `Submit Ticket` button in it was half-grey
for the same reason. A pixel-perfect test would have caught that; nothing in a suite that
reads DOM attributes ever would. The lesson is not "screenshots are better than tests" - it
is that the checklist and the suites look at different things, and a green suite is not
evidence for the rows the suite does not read.

**The contract kept needing repair during implementation, and the useful behaviour was
stopping.** Four times the agent hit a place where two documents disagreed or one was
silent: the `updatedAt` example that could not be equal to `createdAt` once C-49 existed;
a server message BR-35's catalogue rule did not allow; the api-spec sentence that said
`disposition` was validated at step 1 and, in the same breath, that it could not change a
403; and the touch-target row against the control height. In each case the rule from
`CLAUDE.md` - report a contract conflict, do not resolve it silently - held, and the
repair became a decision row (C-50, C-52) or a catalogue entry rather than a quiet
divergence between code and document. That is the behaviour I would keep above any other.

**What I learned to distrust stayed the same as Phase 1, and grew one item.** Fluent
output about things outside the documents is still the risk: invented npm scripts, a
migrate command that could reset the database. The new item is *data the tests leave
behind*. The Create Ticket screenshot spec silently added three Tickets to Requester A on
every run, and Part 7's "14 Tickets for A" would have been wrong by the time anyone
looked. It surfaced only because I asked what the counts were. Tests that create data need
to say where it goes; the fix was a dedicated Requester the demo seed never touches, and a
count check after every screenshot run.

**Peer review.** One of eight PRs was reviewed, and that one review found the gap the
audit had missed. `reviewer.md` says the rest plainly. If I ran this sprint again, the PRs
would open the day their tests went green and be reviewed while the next Issue was in
progress - the tooling made the work fast enough that the review, not the code, was the
bottleneck I ignored.
