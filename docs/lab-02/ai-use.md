# Lab 2 AI Use and Reflection

TokTickIT - CPE 334 Individual Sprint 2.
Author: Tammathorn Kananurak (67070503489), GitHub @Tammathorn.

> **Draft.** This document is finished in **Issue #17**, at the end of the sprint. The
> prompt table below covers Phase 1 (Issue #10, merged as PR #18). Phases 2 to 8 add
> further entries, so the final prompt count and the reflection will both change before
> submission. It is committed now so that Part 4 evidence accumulates as the sprint runs
> rather than being reconstructed from memory at the end.

---

## 1. The LLM I used

| | |
|---|---|
| **Model** | **Claude Opus 5** |
| **Primary interface** | Claude Code (CLI), run from `C:\Downloads\Lab1_Starter_Scaffold\toktickit` |
| **Secondary interface** | Claude in the browser, for planning and for reviewing decisions before I approved them |
| **Why Opus for this phase** | Phase 1 is four documents that cross-reference each other: every acceptance criterion has to map to a planned test, and the API contract has to match the data model. Consistency across four files is exactly where a smaller model drifts |

The split between the two interfaces was deliberate. I used the browser to think through
the labsheet's ambiguities and to argue with proposed decisions before any file existed,
and Claude Code only once a decision was settled and something had to be written to disk.
Planning in the browser kept the agent's session focused on files rather than on open
questions.

Phases 2 to 6 will use Sonnet for implementation against the settled contract, with Opus
for the audit at the end of each Issue. That choice is recorded in `handoff.md` section 5.

---

## 2. Key prompts

Ten prompts, abbreviated. The full text of the Phase 1 planning prompts is in
`docs/lab-02/handoff.md` section 7; the review and audit prompts were issued directly in
Claude Code.

| # | Phase | Purpose | Prompt (abbreviated) | What it produced |
|---|---|---|---|---|
| 1 | Phase 1, before any file | Understand the handout and surface every decision I had to make, without letting the agent make them | *"Read the labsheet PDF and the existing CLAUDE.md. **Do not write any files yet.** Report: every deliverable grouped by PDF part; the business rules stated explicitly versus the eleven areas where I must discover rules myself; everything excluded from scope; and every ambiguity or conflict I need to decide before a specification can be written - with options and a recommendation for each. Be exhaustive on point 4, that list is the actual work of this phase."* | The ambiguity list that became the decision log. Writing nothing was the point: it stopped the agent resolving conflicts silently inside a document I would then have had to reverse-engineer |
| 2 | Phase 1, decisions | Turn my answers into a numbered, binding record so that no later document could quietly re-decide anything | *"Record the decisions I approved as C-01..C-41 in `docs/lab-02/decisions.md`. Every row: ID, area, the decision, my rationale, the labsheet clause. Where the labsheet contradicts itself, the decision is the resolution."* | `decisions.md`, C-01..C-41. Three rows override the handout rather than follow it: **C-02** disregards section 9.1's filenames in favour of section 12, **C-36** treats the plural "specifications.md" in appendix A as a slip, and **C-41** treats "TikTockIT" in the page 9 illustration as a typo in the image |
| 3 | Phase 1, guardrail | Stop `CLAUDE.md` forbidding the sprint's own deliverable | *"Update CLAUDE.md for Lab 2. Keep the Lab 1 rules that still apply - mandatory stack, never run git commands - and add the real repository path, Requester-only scope, the selector-is-not-authentication rule, the exact Zen Green tokens, Playwright in scope for root-level `e2e/` only, the section 12 folder layout, and the rule that the four documents are the contract."* | The Lab 2 `CLAUDE.md`. The Lab 1 file banned Playwright, attachments, uploads, new screens and new top-level directories - most of Lab 2. Left as it was, every task would have hit a guardrail written for a different sprint (C-01) |
| 4 | Phase 1, spec | Write the specification against the settled decisions, not against the handout | *"Write `specification.md` using the eleven-section template in appendix A **and the decisions I gave you above**. Numbered FR/BR/AC, each atomic and testable. Business rules must cover all eleven areas from section 4.3. Given-When-Then criteria. Section 11 records the decisions I made, with my reasoning, not yours. **Do not restate the handout** - this is an engineering specification, not a summary."* | The first `specification.md`: FR-01..39, BR-01..59, AC-01..40. Pointing it at `decisions.md` rather than the PDF is what kept it a specification instead of a paraphrase |
| 5 | Phase 1, contracts | Derive the API and UI contracts from the approved specification | *"Write `api-spec.md` and `ui-spec.md` from the approved specification.md. api-spec: every endpoint in section 6 with paths, params, request and response shapes, validation, ownership checks, pagination metadata and status codes. ui-spec: every bullet in appendix C. **Both must be consistent with specification.md - if you find a conflict, stop and tell me instead of silently resolving it.**"* | `api-spec.md` (ten endpoints) and `ui-spec.md` (all nineteen appendix C bullets). The stop-and-tell instruction surfaced the `status` versus `currentStatus` token clash instead of burying it |
| 6 | Phase 1, tests | Plan the evidence before implementation, and refuse to fake coverage | *"Write `tests.md` using the appendix B template. Planned-test table with the section 9.1 columns, `Final` left blank. All six levels. File paths must match section 12. Then produce the AC-to-test matrix and verify every AC maps to at least one planned test. **Tell me explicitly if any AC has no test - do not quietly add one to make the matrix look complete.**"* | 103 planned tests, 67 of 67 criteria mapped. It reported honestly that **AC-54** has no automated test and is discharged by the manual visual checklist, rather than inventing an assertion narrower than the criterion |
| 7 | Phase 1, audit | Audit the specification from a session with no memory of writing it | *"`/clear`. **You are auditing a specification you did not write. Do not assume it is correct.** Read the labsheet, then decisions.md, then specification.md. Report findings only, fix nothing. Find: every labsheet requirement not covered; every contradiction with decisions.md; every non-atomic or untestable FR/BR/AC; **every rule that traces to no labsheet clause and no decision ID - these are invented rules and the most serious finding**; any criterion no test could verify, and any that no test could fail."* | 40 findings: **8 blocking**, ~22 should-fix, ~10 cosmetic. The clearing mattered - the same model had written the file an hour earlier and rated it sound |
| 8 | Phase 1, remediation | Apply the audit without letting the agent re-litigate settled choices | *"Fix specification.md against the audit findings. **DO NOT FIX these three** - section 8 stays a summary, BR-11 keeps naming React context, BR-45/34/51 stay - they inherit from approved decisions. **FIX ALL OF THESE:** [25 numbered items]. Renumber cleanly if items move. Report the new counts, and **list any finding you disagreed with rather than silently skipping it**."* | FR-49 / BR-65 / AC-67. Splitting the do-not-fix list from the fix list stopped it "improving" decisions I had already approved |
| 9 | Phase 1, self-check | Check the four documents against each other rather than one at a time | *"Re-read all four contract documents together. Report: any field name, status code, message or path that differs between two of them; any AC with no test; any planned test whose path does not match section 12; any cited ID that does not exist."* | Caught two invented shell commands - `npm run prisma:seed:demo`, which is not in `package.json`, and a migrate command that could trigger the reset C-37 forbids. Both only surfaced when I told it to verify against the repository instead of reasoning from the documents |
| 10 | Phase 1, peer review | Close a reviewer comment across every document it touched | *"Close the review comment on C-11. The reviewer noted C-11 says the Ticket Number derives from the autoincrement id but never says **when the id becomes available**. Fix it in three places: add C-49 to decisions.md; state the mechanism and the nullability consequence in specification.md section 7; state it in api-spec.md POST /api/tickets."* | C-49: create-then-update inside one `prisma.$transaction`, `ticketNumber` nullable in the schema but never null outside it. A real gap my reviewer found that the audit had missed |

---

## 3. My Reflection

The most useful thing I did was audit my own specification from a cleared session. The
same model had written the file an hour earlier and been confident it was sound; told to
audit it as a stranger's work, it found eight blocking defects — an API section with no
request or response shapes, a sort parameter whose permitted values were never enumerated,
and a sixth-attachment refusal with no status code attached. None of those were visible to
the session that wrote them, and I do not think they would have been visible to me either
until the tests failed in Phase 4.

The rule that paid off most was making every requirement cite either a labsheet clause or
a decision ID. That single column is what let the audit ask "which rules trace to nothing?"
and get a short answer — five invented rules, all minor — instead of a shrug. Without the
trace column I would have had no way to tell my own reasoning apart from the model's.

What I learned to distrust is fluent output about things outside the documents. Twice the
agent produced a command that did not exist — an npm script it had invented, and a migrate
command that could have triggered the database reset my own C-37 forbids — and both times
it only caught the error when I told it to check `package.json` and the README rather than
reason from the specification. It is reliable about what it has read and confident about
what it has not, and those two look identical on screen.

The peer review still found something the audit did not: C-11 fixed the Ticket Number
format but never said when the autoincrement id becomes available, which turns out to
force a create-then-update transaction and a nullable column. A second person reading for
comprehension caught a gap that two AI passes had walked past.

---

*Draft — completed in Issue #17. Phases 2 to 8 add prompts and revise this reflection.*
