# Lab 1 — Test Plan and Evidence  

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

|#|Tool|Test|Result|
|-|-|-|-|
|1|Supertest|GET /api/health returns 200, status=ok|Pass server/tests/lab-01/health.test.ts|
|2|Supertest|GET /api/categories returns 4 seeded categories in id order|Pass<br />server/tests/lab-01/categories.test.ts|
|3|Vitest|Heading renders|Pass<br />client/tests/lab-01/App.test.tsx|
|4|Vitest|Success state shows Online + category list|Pass<br />client/tests/lab-01/App.test.tsx|
|5|Vitest|Error state shows Offline + message|Pass<br />client/tests/lab-01/App.test.tsx|

Paste your passing terminal output / screenshot below.


SERVER

PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit> cd server

PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit\\server> npm test



> toktickit-server@1.0.0 test

> vitest run





&#x20;RUN  v2.1.9 C:/Downloads/Lab1\_Starter\_Scaffold/toktickit/server



&#x20;✓ tests/lab-01/categories.test.ts (1)

&#x20;✓ tests/lab-01/health.test.ts (1)



&#x20;Test Files  2 passed (2)

&#x20;     Tests  2 passed (2)

&#x20;  Start at  23:15:28

&#x20;  Duration  684ms (transform 58ms, setup 0ms, collect 449ms, tests 73ms, environment 0ms, prepare 294ms)




CLIENT
PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit\\server> cd ..\\client

PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit\\client> npm test



> toktickit-client@1.0.0 test

> vitest run





&#x20;RUN  v2.1.9 C:/Downloads/Lab1\_Starter\_Scaffold/toktickit/client



&#x20;✓ tests/lab-01/App.test.tsx (3)

&#x20;  ✓ App (3)

&#x20;    ✓ renders the TokTickIT heading

&#x20;    ✓ shows Online and the seeded categories on success

&#x20;    ✓ shows an Offline error message when the API is unavailable



&#x20;Test Files  1 passed (1)

&#x20;     Tests  3 passed (3)

&#x20;  Start at  23:17:38

&#x20;  Duration  1.21s (transform 57ms, setup 74ms, collect 159ms, tests 172ms, environment 397ms, prepare 145ms)



PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit\\client> cd ..

PS C:\\Downloads\\Lab1\_Starter\_Scaffold\\toktickit>





