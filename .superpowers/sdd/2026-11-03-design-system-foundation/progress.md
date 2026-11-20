# SDD ledger — plan: C:/Users/Cole0/AutomatedEmpires/Projects/oran/.local/plans/2026-11-03-design-system-foundation.md

Spec: docs/DESIGN_SYSTEM.md (normative), BLUEPRINT §12.3. Worktree: .claude/worktrees/design-foundation, branch claude/design-system-a-foundation from main 2ca4e86. A parallel track (ADR-0006 slice 2) runs in the main checkout.

## Pre-flight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1↔T2–T4 | T1 creates tests/browser/support.ts and design-system.spec.ts; later tasks extend them | Consistent; sequential |
| T2↔T4 | Both edit layout.tsx (T2 font imports, T4 header/footer markup) | Consistent; sequential |
| T3↔T4 | T3 defines the button class contract; T4 rewrites the header rules and deletes the bootstrap :root | Consistent; interim header styling acknowledged by the plan |
| T1 self | documentedTokenNames() "currently finds 58 names" | If Ruling DS-1 adds the 11 derived names to DESIGN_SYSTEM §3, any hard-coded 58 breaks → tests must derive counts from the doc |
| T4 self | Footer keeps the crisis sentence on every page | Conflicts with ADR-0007/D24 (crisis help in the menu only); fixing it needs a new EN/ES string, but en/es.json are owned by the slice-2 track → Ruling DS-2 |
| Track↔slice 2 | This track edits globals.css, layout.tsx, new src/ui and src/app/dev files; slice 2 edits forms, pages, modules, en/es | Disjoint by design; rebase before each PR |

## Rulings
- Ruling DS-1: Accept the 11 derived token names (--line-height-*, --layer-*) and record them in DESIGN_SYSTEM.md §3 in Task 1 (an exception to the track's doc boundary; slice 2 does not edit that file). Tests derive token counts from the doc, never a hard-coded 58 — the founder delegated design calls and the names are the obvious derivation — cost if wrong: a rename later.
- Ruling DS-2: The footer crisis sentence is restyled quietly in PR A (sm, secondary text). Collapsing it into a "Get help now" disclosure per ADR-0007 is deferred to a small follow-up PR after both tracks merge, because it needs a new EN/ES string and en/es.json belong to the slice-2 track — cost if wrong: the sentence stays visible on every page a little longer.
- Ruling DS-3: Keep four static weights via @fontsource/figtree 5.3.0, as planned (DESIGN_SYSTEM §3.3/§9 say four weights); no variable font — cost if wrong: about 25 KB more font data than the variable file.
- Ruling DS-4: Per-task implementer plus task reviewer (sonnet) and a per-PR final review (opus); a review agent merges each PR after green CI (founder authorization) — cost if wrong: none.

## Progress
Task 1: dispatched (base 2ca4e86)
Task 1: implementer a4fad5e3956f3477e (sonnet), carries Ruling DS-1
- Ruling X-1 (both tracks): test:e2e uses fixed port 3100 in both checkouts, so future dispatches must check the port first (Get-NetTCPConnection -LocalPort 3100 -State Listen) and wait, polling every 30s up to 15 min, while the other track's run holds it; never kill the other process — cost if wrong: slower gates.
Task 1: implementer DONE_WITH_CONCERNS (61d4097; all gates green; e2e 8/8 on rerun). Concerns: lightningcss rewrites values (tests compare computed values + a source-text test); DS-1 changes the derived-keys assertion to a two-way set match; one flaky workflow e2e (Loading… past 5s on first compile under load).
Task 1: reviewer a30f07ef6c9368c22 (sonnet) on 2ca4e86..61d4097
Task 1: review Approved (spec ✅). ⚠️ resolved: commit trailer verified; gate evidence accepted from the report.
Task 1: minor (deferred): verbatim source test isn't scoped to the token block
Task 1: minor (deferred): derivedTokens array is redundant with the two-way name check (a second hard-coded copy)
Task 1: minor (deferred): contrast() parses only #RGB/#RRGGBB
Task 1: minor (deferred): the flaky workflow e2e on first compile (5s expect) — final review to triage
Task 1: note (carry to Tasks 2–6): readTokens returns custom properties as Next serializes them (#fff, .12s, 8-digit hex) — compare with resolveAs or the source check; real computed properties are unaffected
Task 1: complete (commits 2ca4e86..61d4097, review clean)
Task 2: dispatched (base 61d4097)
Task 2: implementer a4c2c84c38075c5fe (sonnet)
- Ruling X-2 (both tracks): free memory fell to 366–750 MB and PGlite runs crashed with out-of-memory errors. Heavy test runs (full vitest, any PGlite-backed file, test:e2e) must go through C:\Users\Cole0\AutomatedEmpires\Projects\oran\.local\test-gate.ps1 -Owner <name> <script> [args], which serializes runs across checkouts with a lock file (stale after 60 min) and waits up to 10 min for 1.5 GB free. Exit 75 means the gate gave up waiting for the lock; report it and do not loop. This supersedes the port polling of Ruling X-1, since the lock also covers port 3100 — cost if wrong: slower gates.
Task 2: implementer DONE_WITH_CONCERNS, commit ed5e552. Gates: typecheck, lint, vitest 43/43, build, e2e 10/10 (e2e through the gate). Concerns: machine memory (OOM and web-server timeouts, passed on retry); RED evidence came from a warm manual dev server with a scratch config; enterAs depends on the "Enter as ..." button names.
Task 2: review package review-61d4097..ed5e552.diff; reviewer dispatched (sonnet)
Task 2: review Approved (sonnet), spec ✅, 0 Critical and 0 Important; task-2-review.md. The RED evidence is accepted: the manual server ran the same command, and the RED line numbers match the spec file.
Task 2: minor 1 (plan-mandated weak fallback test) folded into Task 3 as Ruling DS-5. Minor 2 (500 weights) is covered by Task 3 (h1–h3 bold) and Task 4 (.brand span). Minor 3 (ARCHITECTURE row order) is deferred as cosmetic.
Task 2: complete (commit ed5e552)
- Ruling DS-5: Task 3 also strengthens Task 2's font-fallback test, adding only these assertions: the abort count is > 0, and the Figtree 400 face has status 'error' after fonts.ready. Task 3 already edits that spec file — cost if wrong: small extra scope in Task 3.
Task 3: dispatched (base ed5e552), implementer sonnet
Task 3: implementer a6fea30d96c35d21e (sonnet)
- Note from slice 2 (PR 2a): the resource form gains a radio fieldset (source_type). Base styles must treat radios like checkboxes, with a label:has(> input[type=radio]) flex row and a 44px target. If design Task 3 or 4 doesn't cover this before PR A merges, the DS-2 follow-up PR adds it.
Task 3: implementer DONE_WITH_CONCERNS, commit 0693584. e2e passed 15/15 twice through the gate; lint and typecheck pass; DS-5 applied (the 400 face reaches 'error', abort count > 0).
Concern: a dev-server reload loop. Forwarded browser console lines are written to .next-test/dev/logs/next-development.log, which triggers `Compiled in 1ms`, then HMR, then a reload. The mitigation in support.ts routes the /_next/ WebSocket to nothing for the design specs. Small extras beyond the brief's table are listed in the report.
- Ruling DS-6: the root cause gets fixed in a separate small PR from main, claude/fix-dev-reload-loop (a next.config change, investigated against the Next 16.4 source). Both tracks run e2e on the same dev server. Keep Task 3's WebSocket mitigation until that PR merges, then the final review decides whether to keep it — cost if wrong: flaky e2e.
Task 3: review package review-ed5e552..0693584.diff; reviewer dispatched (sonnet)
Task 3: review Needs fixes (sonnet): 1 Important (the raw-color guard can be bypassed through :root in compound selectors), 6 Minor; task-3-review.md. All 30 table rows match; the brief's additions are justified; the DS-6 mitigation is sound and confined to tests.
- Ruling DS-7: radios get the checkbox row rules now (M1), via label:has(> input:is([type=checkbox],[type=radio])), with a test that injects a radio fixture. Slice 2 PR 2a adds a radio fieldset — cost if wrong: none.
Task 3: fix round 1 sent to a6fea30d96c35d21e: I1, M1, M2 (probe first), M4, M5. M3 (dead .hero class in page.tsx) goes to the deferred-UI list; M6 goes to Task 4.
Task 3: fix round 1 DONE, commit 0eef01d (e2e 16/16 through the gate; lint and typecheck pass). Scoped re-review by the controller (68-line diff): I1 ADDRESSED (the lookbehind strips only exact :root rules; 4 negative controls plus 1 positive); M1 ADDRESSED (radios share the checkbox rules; injected-fixture test); M2 confirmed and fixed (CanvasText under forced colors, with a probe test); M4 and M5 ADDRESSED. No new breakage.
Task 3: complete (commits 0693584, 0eef01d)
- Ruling DS-8: Task 4 skips Step 6 (rebase, push and PR). The controller does it after the PR A final review and its fix wave — cost if wrong: none.
- Ruling DS-9: screenshots come from a temporary, uncommitted Playwright spec inside one gated run, not a long-lived manual dev server (memory). They are saved to the scratchpad design-shots/ folder for the PR and the founder — cost if wrong: no "before" shots.
Task 4: dispatched (base 0eef01d), implementer sonnet; carries M6 (.local-notice width) and M3 (deferred .hero)
Task 4: implementer aa4b866a8e97f1828 (sonnet)
Task 4: implementer DONE_WITH_CONCERNS, commit a18a679. typecheck and lint pass; vitest 43/43; build; gated e2e 19/19; axe clean. M6 asserted (the dev notice is aligned with main). The M3 deferred list is in the report. 38 screenshots (before from 61d4097, after) are in scratchpad/design-shots.
Concerns: the commit trailer says "Claude Sonnet 5.5" (accepted; it accurately names that agent's model). Extra .brand min-inline-size of 44px (§9). The Spanish header at 320px is 4 rows.
Task 4: review package review-0eef01d..a18a679.diff; reviewer dispatched (sonnet)
Task 4: review Approved (sonnet), spec ✅, 0 Critical and 0 Important; the .brand min-inline-size addition is approved; task-4-review.md
Task 4: minor 1 (a test at 360px that the brand link name is exact and at least 44px wide, plus notice width toBeCloseTo(760)) goes to the PR A fix wave. Minor 2 (forced-colors current-item border) goes to the deferred list. Minor 3 (bare header/nav/footer selectors): the controller grepped main-checkout src for <header|<nav|<footer. Minor 4 (stale DESIGN_SYSTEM.md:336) goes to the deferred list and the PR text.
Task 4: complete (commit a18a679)
PR A: all tasks complete (2ca4e86..a18a679); final review next (opus). Controller's own visual check of the after-shots: the dev-notice "Sign out" wraps onto its own row at 1280px (cosmetic, dev-only).
- PR #15 (fix-dev-reload-loop, c12a7bc): root cause is upstream Next 16.4 bug vercel/next.js#100251 (a restored dev cache answers every HMR subscribe with 'restart'). Fix: turbopackFileSystemCacheForDev off when ORAN_TEST_RUN=1. Probe before: loops; after: 0 restarts. Review-and-merge agent dispatched (sonnet). Once merged, the design track's support.ts WebSocket workaround can be removed (DS-6).
PR A: final review dispatched (opus) on review-2ca4e86..a18a679.diff; the report goes to final-review-A.md
PR A: final review "With fixes" (opus): 0 Critical, 2 Important (I1: on /profile the consent checkbox reads as an 11th category; I2: form-control selectors have class-level specificity), 9 Minor; final-review-A.md
- The controller merged origin/main (1d4a669: slice 2a, PR #15) into claude/design-system-a-foundation, so the fix wave and the gate run against main's radio fieldset and the reload-loop fix. Clean per the reviewer's merge-tree check.
- Ruling DS-10: the fix wave covers I1, I2 (:where()), Minors 1–5, and Minor 7 (a one-line forced-colors underline on the current nav item). Minors 6, 8 and 9 go to the deferred list or are accepted. The support.ts override stays in PR A and is removed in PR B after one gated run passes without it — cost if wrong: one more review round.
PR A: fix wave DONE_WITH_CONCERNS: commits 937cb61 and 5803be0 (I1, I2, Minors 1–5 and 7). Gates: typecheck and lint pass; vitest 60; build; e2e 23/23 through the gate (main's radio tests pass under Blend); axe clean.
Concerns:
- The support.ts Fast Refresh override blocks hydration, so the controls test uses a new hydratedTest.
- workflow.spec "organization staff maintain…" flaked once on a 5s expect during a cold compile, then passed.
- Ruling DS-11: removing the support.ts override (and hydratedTest) is the first step of PR B Task 5, since PR #15 fixed the root cause and the override hides hydration. If the 5s cold-compile flake recurs in CI or local gates, raise expect.timeout in a separate small PR — cost if wrong: one flaky run.
PR A: scoped re-review of d2b4cf4..5803be0 dispatched (sonnet)
PR A: before/after showcase published for the founder: https://claude.ai/artifact/5goD1p3CL6jAf8M85XLGxh (all 40 screenshots, by screen, width and language)
PR A: fix-wave re-review: all findings addressed, no new breakage; deviations (a) hydratedTest and (b) :where() parity confirmed (final-rereview-A.md). Out-of-scope note for PR B Task 5: after the override is removed, the 16 design specs run hydrated for the first time, so include the dev "N" badge, the loading.tsx shell and a hydrated axe pass.
PR A: pushed; PR #16 opened (https://github.com/AutomatedEmpires/ORAN/pull/16); review-and-merge agent dispatched (sonnet)
PR A: MERGED as 850eaba (PR #16) by the review agent after green CI. Browser specs passed 23/23 on Linux Chromium on the first run.
PR B: branch claude/design-system-b-catalog from origin/main 850eaba in the design-foundation worktree.
Task 5: dispatched (base 850eaba), implementer a75909bde14884c4b (sonnet); Step 0 removes the support.ts override (DS-11); DS-8 (no push or PR)
Task 5: implementer DONE_WITH_CONCERNS: commits e244654 (override removed; e2e 23/23 hydrated, no loop) and 563a3d1 (catalog route). e2e 27/27; typecheck, lint, build and vitest 60 pass.
Deviations: generateMetadata so a denial reveals no title or noindex; host shape regex; forced-colors box-shadow assertion swapped for a border.
Concerns: a denial returns 200 plus the not-found page because the root loading.tsx streams first (pre-existing for all notFound routes); cold-compile flake at workflow.spec:72.
- Ruling DS-12: the cold-compile flake recurred (third time), so per DS-11 the controller opens a small separate PR raising expect.timeout in playwright.config.ts. The 200-on-notFound streaming behavior goes on the deferred list (app-wide, outside the boundary) — cost if wrong: none.
Task 5: review package review-850eaba..563a3d1.diff; reviewer dispatched (sonnet)
Task 5: review Approved (sonnet), spec ✅; the guard denies by default with no bypass among the probed hosts; no data leak; override removal clean; 0 Critical, 0 Important, 5 Minor; task-5-review.md
- Ruling DS-13: fold Task 5 Minors 1 (pin the host hardening: evil@127.0.0.1, 127.0.0.2, localhost:99999 and localhost: are denied; LOCALHOST:3000 is allowed), 3 (one shared guard helper for the page and generateMetadata), 4 (forced-colors color assertion not transparent) and 5 (role="list" on the swatch list) into Task 6, which edits the same files. Minor 2 (production-build denial check) becomes a PR-text note for the final review — cost if wrong: none.
Task 5: complete (commits e244654, 563a3d1)
Task 6: dispatched (base 563a3d1), implementer sonnet; carries DS-13 (Task 5 Minors 1, 3, 4 and 5) and DS-8 (no push or PR)
- PR #17 (expect.timeout 15s) MERGED as 3a6e0be (DS-12 done). Merge main into PR B before its gate.
Task 6: implementer DONE_WITH_CONCERNS, commit 4b98303. typecheck and lint pass; vitest 60/60; build; e2e 31/31 (catalog 8/8) through the gate. DS-13 items 1–4 done. Mutation checks passed: removing the guard regex fails the host test, and removing preventDefault makes the disabled button submit.
- Ruling DS-14: accept splitting button.tsx (no directive; exports buttonClassName and the types) from button-control.tsx ('use client'; the click guard). Server components cannot call a client module's function, and callers still import from @/ui/button. Also accept the two forced-colors rules (disabled border, spinner open side) and the "Claude Sonnet 5.5" trailer — cost if wrong: none.
Task 6: review package review-563a3d1..4b98303.diff; reviewer dispatched (sonnet)
Task 6: review Approved (sonnet), spec ✅; inactive semantics hold for click, Enter, Space and implicit submit; 0 Critical, 0 Important, 7 Minor; task-6-review.md. Pre-hydration and no-JS: accepted as cosmetic until hydration; the server stays authoritative (PR text plus the ActionForm follow-up).
Task 6: Minor 2 (drop the caller aria-disabled and aria-busy pass-through) and Minor 3 (Space press in the never-submit test) go to the PR B fix wave.
Task 6: complete (commit 4b98303)
PR B: all tasks complete. The controller merged origin/main (3a6e0be: PR #17) into the branch. Final review range origin/main..HEAD (opus).
PR B: final review "With fixes" (opus): 0 Critical, 2 Important (I1: aria pass-through, now with an Omit refinement; I2: no reliable screen-reader busy cue), 6 Minor; final-review-B.md. The guard has five independent layers; a deployed preview is denied twice over.
- Ruling DS-15: the fix wave covers I1 (with Omit), I2 (comments plus guidance), M1, M2 (an e2e Host-header test, or a source-text fallback), M3, M5 and M6. M4 (forced-colors disabled cue) is deferred.
- Deferred-list additions: a proxy-level 404 for /dev/* (covers status, RSC payload and prefetch); the forced-colors disabled cue (forced-color-adjust:none plus outline-color:Highlight); the ActionForm guidance (Button busy={pending} keeps its label, with t.pending in an always-present role=status region).
PR B: fix wave sent to ab52d698c32dfda93 (sonnet)
PR B: fix wave DONE, commit 87320d0 (typecheck and lint pass; vitest 60/60; build; e2e 33/33 through the gate; M2 via a real Host header with mutation checks). Scoped re-review dispatched (sonnet).
PR B: fix-wave re-review: all addressed, no new breakage (final-rereview-B.md). Pushed; PR opened.
PR B: MERGED as 4a575f8 (PR #18) by the review agent after green CI; e2e 33/33 on Linux Chromium. The design-system foundation plan (PRs A and B) is complete. Next on the design track: PR C (Get help now, Quick exit, Button adoptions), planner dispatched.
