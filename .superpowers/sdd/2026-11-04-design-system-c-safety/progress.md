# SDD ledger — plan: C:/Users/Cole0/AutomatedEmpires/Projects/oran/.local/plans/2026-11-04-design-system-c-safety.md

Spec: docs/adr/0007 §2–3, ADR-0005 quick-exit placement, docs/DESIGN_SYSTEM.md §5.6/§5.1/§5.4/§7; AGENTS + CONSTITUTION. Workspace: the design-foundation worktree, branch claude/design-system-c-safety from main 57569f2. A parallel slice 2c track runs in the main checkout and owns src/ui/forms.tsx (DS-16).

## Pre-flight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1↔T2 | T1 creates quick-exit.tsx and safety.spec.ts; T2 adds the shortcut to both | Sequential; consistent |
| T1↔T3 | T1's page marker and `:has()` rule; T3 puts the marker on the root `<section>` of Home and Profile | Consistent |
| T1↔T4 | Both edit layout.tsx (T1 header, T4 footer), globals.css and en/es | Different regions; sequential |
| T3↔T4↔T5 | All three edit profile/page.tsx (T3 marker, T4 Get help now row, T5 destructive delete) | Sequential; reviewers check that earlier edits survive |
| T4↔T5 | Both edit error.tsx (T4 numbers card, T5 Retry Button) | Sequential |
| Cross-track | slice 2c edits en/es and forms.tsx; PR C never edits forms.tsx | en/es merge trivially |
| Each task self | Tests and code specified per task; heavy runs go through the test gate | OK |

## Rulings
- Ruling DS-17: accept the planner's 19 judgment calls. Four are surfaced to the founder as FYI items, F9: Exit shows on Home whenever a Safety or Housing listing is listed; the footer "Get help now" disclosure is interim until SideNav/drawer exist; panel copy is drafted; the TopBar is not sticky yet. The rest (Exit in the TopBar; the shortcut only where Exit shows; blanking the page plus no-referrer; the Spanish name keeps "Salir"; number order; white call buttons in the tinted card; no Exit on staff pages; `.secondary` kept) follow §5.6 and ADR-0007 — cost if wrong: copy or placement tweaks.
- Ruling DS-18: implementers sonnet; reviewers sonnet; final review opus; independent merge agent. Every implementer does its steps but no push or PR (DS-8 pattern) — cost if wrong: none.

## Progress
Task 1: dispatched (base 57569f2), implementer sonnet
Task 1: implementer DONE_WITH_CONCERNS, commit 7fd1216. vitest 116 (6 new); e2e 38 (5 new); typecheck, lint and build pass.
Deviation: the brief's neutralSite read document.body.hidden via page.evaluate inside the route handler, which deadlocks in Playwright 1.64.1/Edge; replaced with an init script plus an exposeFunction binding. No referrer is sent, because Referrer-Policy: same-origin already covers it.
- Note for Task 2: reuse neutralSite and add its tests in tests/browser/safety.spec.ts, or move the helper to support.ts.
Task 1: review package review-57569f2..7fd1216.diff; reviewer dispatched (sonnet)
Task 1: review Approved (sonnet), spec ✅; the neutralSite replacement is sound; 0 Critical, 0 Important, 5 Minor; task-1-review.md
- Ruling DS-19: fold Task 1 Minors 1 (strict hide check via the navigate event, with mutation checks), 2 (onAuxClick for the middle button leaves) and 4 (modifier-key test or softened comment) into Task 2, which edits the same files. Minor 3 (no positive control for the no-referer header) goes to the final review. Minor 5 is resolved by Task 2 itself.
Task 1: complete (commit 7fd1216)
Task 2: dispatched (base 7fd1216), implementer sonnet; carries DS-19
Task 2: implementer DONE_WITH_CONCERNS, commit 18751fa. typecheck and lint pass; test 116; build; e2e 48/48 (safety 15). Mutation checks pass: a delayed hide, a removed hide, <= vs <, !repeat and the rendered-link check each fail their own test. DS-19 items 1–3 done (Navigation API available in Edge). The neutralSite route moved to the context.
- Deferred-list note: on a Safety page, pressing Esc twice within 1s to close two stacked overlays would also leave ORAN, per the spec. No stacked overlays exist today; revisit when dialogs and drawers arrive.
Task 2: review package review-7fd1216..18751fa.diff; reviewer dispatched (sonnet)
Task 2: review Approved (sonnet), spec ✅; 0 Critical, 0 Important, 4 Minor (test hardening); task-2-review.md
- Ruling DS-20: fold Task 2 Minors into Task 3 (same spec and support files):
  - 1: wait for the real keydown listener before pausing the clock;
  - 2: an explicit failure when the Navigation API is missing;
  - 3: mutation-prove the no-other-tab assertions, adding a bounded settle if needed;
  - 4: an optional clock.resume afterEach.
  Cost if wrong: none.
Task 2: complete (commit 18751fa)
Task 3: dispatched (base 18751fa), implementer sonnet; carries DS-20
- Ruling DS-21 (from the slice 2c Task 9 re-review): the header language select (layout.tsx:21, defaultValue={locale}) can revert after the changeLanguage action, by the same mechanism as I-1. Add key={locale} in PR C (Task 4 edits layout.tsx), with a test that after switching to Español the select shows es without a reload — cost if wrong: none.
Task 3: implementer DONE_WITH_CONCERNS, commit 0a89ee2. typecheck, lint, build and test 116 pass; e2e 50/50 on the rerun (the first run hit the workflow.spec:72 cold-compile flake under load). DS-20 done:
- The tests wait for the real listener.
- A missing Navigation API now fails with a named cause.
- Mutation checks: the auxclick and modifier-click regressions are now caught, using a bounded settle plus a defaultPrevented observation in the shared clickLeaves helper.
- afterEach was not needed.
- Ruling X-4: the edit-route cold-compile flake recurs locally even at a 15s expect timeout, under heavy machine load. CI is clean. Add a route warm-up (a Playwright globalSetup that requests each app route once after the web server is ready) to the X-3 platform PR — cost if wrong: one extra startup step.
Task 3: review package review-18751fa..0a89ee2.diff; reviewer dispatched (sonnet)
Task 3: review Needs fixes (sonnet). 1 Important (test gap: the Profile results half of the scope is unproven by any test, so deleting the spread passes), 5 Minor; task-3-review.md. Marker logic, client-side navigation, neutral titles and URLs, and the DS-20 hardening are all correct; the marker value is empty, so no category leak.
Task 3: fix round 1 sent to a487d2c1804a2bce0: Important 1 (a mixed Food+Safety listing on Profile with a Food-only need, mutation-proven), Minor 2 (order preconditions), Minor 3 (single-mutation reruns) and Minor 1 (a comment).
Task 3: fix round 1 DONE, commit c60b638 (test-only; e2e 50/50 through the gate; typecheck and lint pass). Mutation proof: deleting the profile spread fails the mixed-listing step; the single onAuxClick and onClick mutations each fail only their own tests. Controller scoped re-review: the diff is test-only (spec file); Important 1 and Minors 1–3 ADDRESSED per the report's mutation evidence; no new breakage.
Task 3: complete (commits 0a89ee2, c60b638)
Task 4: dispatched (base c60b638), implementer sonnet; carries DS-21 (language select key={locale} plus a test)
Task 4: implementer DONE_WITH_CONCERNS, commit 1714552. typecheck, lint and build pass; vitest 119; e2e 56; RED→GREEN.
- DS-21's premise did not reproduce (the dev server replaces the header on redirect); key={locale} was added anyway and the test kept as a guard.
- Concerns for review: at 360px the hotline number can wrap at a hyphen and call buttons align unevenly; DESIGN_SYSTEM §9 and §11 still say "menu only" next to the new interim footer; the Messages type is local.
Task 4: review package review-c60b638..1714552.diff; reviewer dispatched (sonnet)
Task 4: review Approved (sonnet), spec ✅. Numbers and links exact; quiet; alert separation correct; strings correct. 0 Critical, 0 Important, 7 Minor; task-4-review.md
- Ruling DS-22: fold Task 4 Minors into Task 5 (same PR):
  - 1: nowrap the hyphenated hotline number via a Line helper, with a 360px single-line test;
  - 2: DESIGN_SYSTEM §9, §11 and §5.6 consistency;
  - 3: ARCHITECTURE accuracy;
  - 4: reword the DS-21 test comment;
  - 6: the Messages comment.
  Minor 5 (alignment) is accepted as cosmetic. The merge note (duplicate JSON keys with 2c) goes to the PR C final review and the rebase.
Task 4: complete (commit 1714552)
Task 5: dispatched (base 1714552), implementer sonnet; carries DS-22
- I-3 (from the PR 2c final review): if 2c merges first, the PR C rebase must update tests/browser/safety.spec.ts publishSafetyListing's 'Service ZIP code' label to 'Service ZIP codes', keep both en/es blocks, scan for duplicate JSON keys, and rerun the full browser suite. The directory test's no-Safety-listing precondition relies on file order with one worker.
