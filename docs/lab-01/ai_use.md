# Lab 1 — AI Use and Reflection

**LLM/agent used:** Claude Code (Claude Opus), plus Claude in the browser for planning.

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Read the Lab 1 spec PDFs and write a CLAUDE.md capturing the mandatory stack, the required folder layout, and a rule that the agent must never run git commands | Reviewed it myself and kept it as the guardrail for every later prompt |
| 2 | Audit Issue 1 against its seven acceptance criteria, verifying each by reading the file or running the command rather than inferring | Caught that it had reported all criteria passing while Postgres was in fact unreachable |
| 3 | Replace the /api/health stub with a 200 response returning status ok and service TokTickIT API | Ran the Supertest suite myself to confirm it turned green |
| 4 | Add the Category model to schema.prisma and make seed.ts idempotent using upsert | Ran the seed twice and checked Prisma Studio to confirm four rows, not eight |
| 5 | Add GET /api/categories reading from Prisma in id order, and render the list in App.tsx | Verified in the browser that the four names came from the database, not hard-coded values |
| 6 | Implement the Vitest test for the offline error path using vi.spyOn to reject checkSystem | Read the test to confirm it would fail if the error branch were removed |
| 7 | Implement the success-path test asserting Online plus the rendered category list | Confirmed the assertions target the list markup rather than unrelated static text |

## Reflection

My prompts improved most when I stopped asking "is this done" and started demanding evidence — telling the agent to verify by running the command rather than inferring from what looked plausible. That change caught a real error: it had reported all eleven Issue 1 criteria as passing while PostgreSQL was not installed at all.

I also had to correct it on environment state. It reported that Docker was not running and that the GitHub CLI was not installed, when both were working — its shell session predated my installing them. It also proposed the branch name feature/2-api-health, which does not match the name the lab specifies. Keeping git operations in my own hands, as CLAUDE.md required, meant those suggestions never reached the repository.