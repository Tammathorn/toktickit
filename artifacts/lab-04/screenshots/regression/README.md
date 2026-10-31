# regression/

Written by `e2e/lab-04/regression.spec.ts, E2E-35 (and the Lab 3 E2E-48 for the `-dashboard` files)` against the fresh `toktickit_evidence` database (migrated and seeded; see `artifacts/lab-04/evidence/issue-70/README.md`). Every image is the real running app at 1280 (desktop), 834 (tablet) and 390 (mobile), full page, taken after transitions settled; none is edited. Names follow ui-spec.md 15: `<screen>-<viewport>-<state>.png`.

| File | What it proves |
|---|---|
| `create-ticket-desktop-validation.png` | Create Ticket submitted empty: the messages below each field |
| `create-ticket-mobile-validation.png` | Create Ticket submitted empty: the messages below each field |
| `create-ticket-tablet-validation.png` | Create Ticket submitted empty: the messages below each field |
| `forbidden-desktop-requester.png` | a Requester at /queue: Forbidden with Go to Dashboard |
| `forbidden-mobile-requester.png` | a Requester at /queue: Forbidden with Go to Dashboard |
| `forbidden-tablet-requester.png` | a Requester at /queue: Forbidden with Go to Dashboard |
| `login-desktop-initial.png` | the Login screen |
| `login-mobile-initial.png` | the Login screen |
| `login-tablet-initial.png` | the Login screen |
| `my-tickets-desktop-open-group.png` | My Tickets landed from the Open tickets card (statusGroup=open) |
| `my-tickets-desktop-populated.png` | My Tickets for Requester A |
| `my-tickets-mobile-open-group.png` | My Tickets landed from the Open tickets card (statusGroup=open) |
| `my-tickets-mobile-populated.png` | My Tickets for Requester A |
| `my-tickets-tablet-open-group.png` | My Tickets landed from the Open tickets card (statusGroup=open) |
| `my-tickets-tablet-populated.png` | My Tickets for Requester A |
| `nav-desktop-administrator-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the administrator (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-desktop-administrator.png` | Administrator on /dashboard, Dashboard current |
| `nav-desktop-it-staff-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the it-staff (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-desktop-it-staff.png` | IT Staff on /dashboard, Dashboard current |
| `nav-desktop-requester-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the requester (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-desktop-requester.png` | Requester Anucha Prasert on /dashboard, Dashboard current |
| `nav-mobile-administrator-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the administrator (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-mobile-administrator.png` | Administrator on /dashboard, Dashboard current |
| `nav-mobile-it-staff-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the it-staff (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-mobile-it-staff.png` | IT Staff on /dashboard, Dashboard current |
| `nav-mobile-requester-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the requester (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-mobile-requester.png` | Requester Anucha Prasert on /dashboard, Dashboard current |
| `nav-tablet-administrator-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the administrator (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-tablet-administrator.png` | Administrator on /dashboard, Dashboard current |
| `nav-tablet-it-staff-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the it-staff (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-tablet-it-staff.png` | IT Staff on /dashboard, Dashboard current |
| `nav-tablet-requester-dashboard.png` | the Lab 3 E2E-48 capture of /dashboard as the requester (aria-current walk), written here instead of artifacts/lab-03 (planner addendum) |
| `nav-tablet-requester.png` | Requester Anucha Prasert on /dashboard, Dashboard current |
| `queue-desktop-populated.png` | the Ticket Queue |
| `queue-desktop-requester-resolved.png` | the Queue landed from the Requester says resolved card |
| `queue-mobile-populated.png` | the Ticket Queue |
| `queue-mobile-requester-resolved.png` | the Queue landed from the Requester says resolved card |
| `queue-tablet-populated.png` | the Ticket Queue |
| `queue-tablet-requester-resolved.png` | the Queue landed from the Requester says resolved card |
| `requester-detail-desktop-comments-attachments.png` | Requester Ticket Detail with an attachment and public comments |
| `requester-detail-mobile-comments-attachments.png` | Requester Ticket Detail with an attachment and public comments |
| `requester-detail-tablet-comments-attachments.png` | Requester Ticket Detail with an attachment and public comments |
| `staff-detail-desktop-notes.png` | IT Staff Ticket Detail with Actions Taken, Public Comments and Internal Notes in one frame |
| `staff-detail-mobile-notes.png` | IT Staff Ticket Detail with Actions Taken, Public Comments and Internal Notes in one frame |
| `staff-detail-tablet-notes.png` | IT Staff Ticket Detail with Actions Taken, Public Comments and Internal Notes in one frame |
| `system-check-desktop-online.png` | /system-check after Check System: System Status: Online |
| `system-check-mobile-online.png` | /system-check after Check System: System Status: Online |
| `system-check-tablet-online.png` | /system-check after Check System: System Status: Online |
| `users-desktop-role-filter.png` | User Management landed from the IT Staff user card (role filter) |
| `users-mobile-role-filter.png` | User Management landed from the IT Staff user card (role filter) |
| `users-tablet-role-filter.png` | User Management landed from the IT Staff user card (role filter) |
