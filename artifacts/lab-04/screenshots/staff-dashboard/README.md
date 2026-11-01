# staff-dashboard/

Written by `e2e/lab-04/dashboards.spec.ts, E2E-33` against the fresh `toktickit_evidence` database (migrated and seeded; see `artifacts/lab-04/evidence/issue-70/README.md`). Every image is the real running app at 1280 (desktop), 834 (tablet) and 390 (mobile), full page, taken after transitions settled; none is edited. Names follow ui-spec.md 15: `<screen>-<viewport>-<state>.png`.

| File | What it proves |
|---|---|
| `staff-dashboard-desktop-administrator.png` | the seeded Administrator (Panida Srisawat): the eleven cards plus the three user cards with `N active` |
| `staff-dashboard-desktop-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/staff: the failure panel with Retry |
| `staff-dashboard-desktop-focus.png` | keyboard focus (Tab) on a card: the token focus ring |
| `staff-dashboard-desktop-lists-empty-mocked.png` | MOCKED (C-180): the real response with Recently updated and Urgent emptied, because the seed always holds recent and High Tickets |
| `staff-dashboard-desktop-loading.png` | the real /api/dashboard/staff request held open: the skeleton, one panel per list |
| `staff-dashboard-desktop-my-actions.png` | after following the My planned actions card: the panel in view, focus on its heading |
| `staff-dashboard-desktop-populated.png` | IT Staff (Araya Methee), seeded data: eleven cards, three lists |
| `staff-dashboard-desktop-zero.png` | an Administrator who owns nothing (created for the test through POST /api/users): Mine 0, My planned actions 0 and the panel's real Empty state |
| `staff-dashboard-mobile-administrator.png` | the seeded Administrator (Panida Srisawat): the eleven cards plus the three user cards with `N active` |
| `staff-dashboard-mobile-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/staff: the failure panel with Retry |
| `staff-dashboard-mobile-focus.png` | keyboard focus (Tab) on a card: the token focus ring |
| `staff-dashboard-mobile-lists-empty-mocked.png` | MOCKED (C-180): the real response with Recently updated and Urgent emptied, because the seed always holds recent and High Tickets |
| `staff-dashboard-mobile-loading.png` | the real /api/dashboard/staff request held open: the skeleton, one panel per list |
| `staff-dashboard-mobile-my-actions.png` | after following the My planned actions card: the panel in view, focus on its heading |
| `staff-dashboard-mobile-populated.png` | IT Staff (Araya Methee), seeded data: eleven cards, three lists |
| `staff-dashboard-mobile-zero.png` | an Administrator who owns nothing (created for the test through POST /api/users): Mine 0, My planned actions 0 and the panel's real Empty state |
| `staff-dashboard-tablet-administrator.png` | the seeded Administrator (Panida Srisawat): the eleven cards plus the three user cards with `N active` |
| `staff-dashboard-tablet-failure.png` | a declared mocked 500 (C-182) on /api/dashboard/staff: the failure panel with Retry |
| `staff-dashboard-tablet-focus.png` | keyboard focus (Tab) on a card: the token focus ring |
| `staff-dashboard-tablet-lists-empty-mocked.png` | MOCKED (C-180): the real response with Recently updated and Urgent emptied, because the seed always holds recent and High Tickets |
| `staff-dashboard-tablet-loading.png` | the real /api/dashboard/staff request held open: the skeleton, one panel per list |
| `staff-dashboard-tablet-my-actions.png` | after following the My planned actions card: the panel in view, focus on its heading |
| `staff-dashboard-tablet-populated.png` | IT Staff (Araya Methee), seeded data: eleven cards, three lists |
| `staff-dashboard-tablet-zero.png` | an Administrator who owns nothing (created for the test through POST /api/users): Mine 0, My planned actions 0 and the panel's real Empty state |
