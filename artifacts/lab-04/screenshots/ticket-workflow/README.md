# ticket-workflow/

Written by `e2e/lab-04/ticket-resolution.spec.ts, E2E-17` against the fresh `toktickit_evidence` database (migrated and seeded; see `artifacts/lab-04/evidence/issue-70/README.md`). Every image is the real running app at 1280 (desktop), 834 (tablet) and 390 (mobile), full page, taken after transitions settled; none is edited. Names follow ui-spec.md 15: `<screen>-<viewport>-<state>.png`.

| File | What it proves |
|---|---|
| `workflow-desktop-cancel-blocked.png` | cancelling with a planned action open: 409 PLANNED_ACTIONS_OPEN, the message and Go to Actions Taken |
| `workflow-desktop-conflict.png` | STALE_UPDATE on the status control: the conflict panel in that group, the chosen status kept |
| `workflow-desktop-gate-unmet.png` | a planned action still open: Resolved disabled with its reasons beneath |
| `workflow-desktop-history.png` | the staff view of the status history, oldest first |
| `workflow-desktop-legacy-history.png` | a Lab 3 Ticket from toktickit_rehearsal (the Lab 3 dump, migrated; C-188): `Status changes made before this history began were not recorded.`, no date |
| `workflow-desktop-reopened.png` | a Resolved Ticket reopened: the gate asks for an action completed since the reopen |
| `workflow-desktop-requester-history.png` | the Requester's view of the same history |
| `workflow-desktop-resolve-confirm.png` | the Resolve confirmation dialog |
| `workflow-desktop-resolved.png` | after Resolve: the Resolved status and its success panel |
| `workflow-desktop-status-menu.png` | the status select focused on a Ticket the gate allows; the options (asserted equal to the current status plus allowedTransitions) are a native dropdown the screenshot cannot draw |
| `workflow-mobile-cancel-blocked.png` | cancelling with a planned action open: 409 PLANNED_ACTIONS_OPEN, the message and Go to Actions Taken |
| `workflow-mobile-conflict.png` | STALE_UPDATE on the status control: the conflict panel in that group, the chosen status kept |
| `workflow-mobile-gate-unmet.png` | a planned action still open: Resolved disabled with its reasons beneath |
| `workflow-mobile-history.png` | the staff view of the status history, oldest first |
| `workflow-mobile-legacy-history.png` | a Lab 3 Ticket from toktickit_rehearsal (the Lab 3 dump, migrated; C-188): `Status changes made before this history began were not recorded.`, no date |
| `workflow-mobile-reopened.png` | a Resolved Ticket reopened: the gate asks for an action completed since the reopen |
| `workflow-mobile-requester-history.png` | the Requester's view of the same history |
| `workflow-mobile-resolve-confirm.png` | the Resolve confirmation dialog |
| `workflow-mobile-resolved.png` | after Resolve: the Resolved status and its success panel |
| `workflow-mobile-status-menu.png` | the status select focused on a Ticket the gate allows; the options (asserted equal to the current status plus allowedTransitions) are a native dropdown the screenshot cannot draw |
| `workflow-tablet-cancel-blocked.png` | cancelling with a planned action open: 409 PLANNED_ACTIONS_OPEN, the message and Go to Actions Taken |
| `workflow-tablet-conflict.png` | STALE_UPDATE on the status control: the conflict panel in that group, the chosen status kept |
| `workflow-tablet-gate-unmet.png` | a planned action still open: Resolved disabled with its reasons beneath |
| `workflow-tablet-history.png` | the staff view of the status history, oldest first |
| `workflow-tablet-legacy-history.png` | a Lab 3 Ticket from toktickit_rehearsal (the Lab 3 dump, migrated; C-188): `Status changes made before this history began were not recorded.`, no date |
| `workflow-tablet-reopened.png` | a Resolved Ticket reopened: the gate asks for an action completed since the reopen |
| `workflow-tablet-requester-history.png` | the Requester's view of the same history |
| `workflow-tablet-resolve-confirm.png` | the Resolve confirmation dialog |
| `workflow-tablet-resolved.png` | after Resolve: the Resolved status and its success panel |
| `workflow-tablet-status-menu.png` | the status select focused on a Ticket the gate allows; the options (asserted equal to the current status plus allowedTransitions) are a native dropdown the screenshot cannot draw |
