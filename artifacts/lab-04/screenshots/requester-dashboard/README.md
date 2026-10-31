# requester-dashboard/

Written by `e2e/lab-04/dashboards.spec.ts, E2E-34` against the fresh `toktickit_evidence` database (migrated and seeded; see `artifacts/lab-04/evidence/issue-70/README.md`). Every image is the real running app at 1280 (desktop), 834 (tablet) and 390 (mobile), full page, taken after transitions settled; none is edited. Names follow ui-spec.md 15: `<screen>-<viewport>-<state>.png`.

| File | What it proves |
|---|---|
| `requester-dashboard-desktop-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/requester: the failure panel with Retry |
| `requester-dashboard-desktop-focus.png` | keyboard focus (Tab) on a card |
| `requester-dashboard-desktop-loading.png` | the real /api/dashboard/requester request held open: the skeleton |
| `requester-dashboard-desktop-populated.png` | Requester Anucha Prasert: only the four Requester cards (Part 5's role evidence, C-180) |
| `requester-dashboard-desktop-zero.png` | Requester Nattapong Wong, who has no Tickets: four 0 cards and both lists' real Empty state |
| `requester-dashboard-mobile-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/requester: the failure panel with Retry |
| `requester-dashboard-mobile-focus.png` | keyboard focus (Tab) on a card |
| `requester-dashboard-mobile-loading.png` | the real /api/dashboard/requester request held open: the skeleton |
| `requester-dashboard-mobile-populated.png` | Requester Anucha Prasert: only the four Requester cards (Part 5's role evidence, C-180) |
| `requester-dashboard-mobile-zero.png` | Requester Nattapong Wong, who has no Tickets: four 0 cards and both lists' real Empty state |
| `requester-dashboard-tablet-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/requester: the failure panel with Retry |
| `requester-dashboard-tablet-focus.png` | keyboard focus (Tab) on a card |
| `requester-dashboard-tablet-loading.png` | the real /api/dashboard/requester request held open: the skeleton |
| `requester-dashboard-tablet-populated.png` | Requester Anucha Prasert: only the four Requester cards (Part 5's role evidence, C-180) |
| `requester-dashboard-tablet-zero.png` | Requester Nattapong Wong, who has no Tickets: four 0 cards and both lists' real Empty state |
