# Task 3 review: Exit on Safety and Housing & shelter results (18751fa..0a89ee2)

Reviewer: sonnet. Read-only. Based on the diff, the brief, the global constraints, the report, and the current files in the worktree (src/ui/safety.ts, src/ui/quick-exit.tsx, src/app/layout.tsx, src/app/globals.css, src/modules/catalog/index.ts, playwright.config.ts, scripts/dev.ts, workflow.spec.ts). No tests were run (memory).

## Spec Compliance

Verdict: ✅ The implementation matches the brief and §5.6. One test-coverage gap on a named risk is listed under Issues.

Named risks, one check each:

1. **Marker logic: ✅.**
   - `quickExitCategories` in src/ui/safety.ts:6 is `['safety', 'housing_shelter']`. These are the codes in the seed (supabase/migrations/20261103090000_taxonomy_categories.sql:17,21) and in `categoryCodes` (catalog/index.ts:67, which selects `tt.code`). Profile needs are codes too (`assertCategoryCodes`).
   - `showsQuickExit` uses `some` over `some`, so a mixed list counts and an empty call gives false. tests/safety-ui.test.ts:11-15 covers empty, Food only, a mixed `['health','safety']`, `housing_shelter`, and labels or the legacy `housing` giving false.
   - The marker is on the root `<section>` only: page.tsx:8 and profile/page.tsx:13. Staff pages have no scope; the only other users of the spread are /dev/components (Task 1) and these two pages.
   - Home passes `resources.map(r => r.categories)` (at most 100 listings, `limit(100)`, so the spread is safe). `available=false` gives `[]` and false.
2. **Profile: ✅ by inspection. Only the saved-needs half is proven by a browser test (see Important 1).**
   - The expression is exactly the brief's: `showsQuickExit(profile?.needs ?? [], ...resources.map(r => r.categories))`. `resources` is the server-side `publicResources({postal_code, needs})` filtered by `explainMatch`.
   - The browser test proves Food only (hidden), Safety (visible), Housing & shelter (visible), and delete (hidden). All of those are the `profile.needs` arm.
3. **Client-side navigation: ✅.**
   - The CSS is `body:not(:has([data-quick-exit])) .quick-exit {display:none}` (globals.css:92), which re-evaluates when the section is swapped.
   - The shortcut checks `link.current?.getClientRects().length` at event time (quick-exit.tsx:26).
   - The test goes Profile (Safety, visible) to Organization by the nav link, waits for the access-denied alert, asserts Exit hidden, freezes the clock, presses Esc twice, and runs `stayed` (body not hidden, URL unchanged, `visits` empty).
   - With the clock paused, two presses are 0 ms apart. A shortcut that stayed live would leave and fail `stayed`, so the test can fail for the right reason.
4. **Neutral titles and URLs: ✅.**
   - The title is static (`metadata.title = 'ORAN'`, layout.tsx:15). Apart from /dev/components (Task 1), no page exports metadata.
   - The tests assert `toHaveTitle('ORAN')`, an empty query, and a URL that does not match `/safety|housing|seguridad|vivienda/i` on /profile. On `/` they assert the title and the URL exactly equal to `http://127.0.0.1:3100/`.
   - The marker is `data-quick-exit=""`. The value is empty, so it carries no category. The attribute name says only that the page shows a quick exit.
   - A data attribute is not exposed to assistive technology and does not appear in a screenshot. There is no analytics or session-replay package in package.json or src/, so nothing captures the DOM.
   - The visible signal is the Exit button, which is intended by §5.6 and DS-17. I found no semantic or visible category leak.
5. **Test hardening (DS-20): ✅ with Minors.**
   - **The listener wait.**
     - It uses an init script that wraps `EventTarget.prototype.addEventListener` and `removeEventListener`, and counts live window capture `keydown` listeners whose source contains "Escape".
     - Tracking removals keeps StrictMode's add, remove, add at a count of 1.
     - Nothing was added to production. `freezeClock` is called by `frozenAt` and by the new test.
     - `QuickExit` is a named function that contains the literal `'Escape'`, so the heuristic matches.
   - **The missing Navigation API.**
     - The init script reports a sentinel string through the existing binding.
     - The visit then carries `hidden: '<cause>'`, and the strict `toEqual` shows the cause. The report's sentinel mutation shows this.
   - **`clickLeaves`.**
     - The `defaultPrevented` observation is a window bubble-phase listener on `click` and `auxclick` for `a.quick-exit`, so it runs after React's handler on `document`.
     - It reports through a one-way binding, which is delivered even though the page is leaving, and `expect.poll` waits for it.
     - A middle click fires only `auxclick`, and a modified left click fires only `click`, so the exact `[true]` holds for all four tests.
     - The settle is `Promise.race` of two 1 s waits with `.catch`. `strays` is filled by listeners registered before `goto`, so a tab or download that arrives before the wait starts is still caught.
     - The race is bounded and cannot hang. If both waits time out, the rejection is swallowed.
     - The settle is a heuristic for late tabs. The deterministic `defaultPrevented` check is the real guard, which is why Alt-click is covered.
   - **Mutation results.** The table in the report matches the code: both handlers contain `preventDefault` in the committed quick-exit.tsx, and the file is not in the diff, so it is unchanged from Task 2.
   - **Rejecting the `afterEach` resume** (DS-20 item 4) is justified by the measured teardown. The new test pauses and resumes the clock itself.

Also checked:
- Only the four files in the brief changed. `forms.tsx`, `workflow.spec.ts` and `src/server/*` are untouched.
- `saveNeeds` matches the brief's interface and adds two safeguards: a named error for a label the page does not offer, and a wait for the form rebuild (consent unchecked), which stops the next call from filling a form about to be replaced.
- `publishSafetyListing` copies workflow.spec.ts test 1's creation steps (same field order and labels, the "Safety" checkbox, "A phone call" as the source). It then records the verification in the article, as the brief says.
- The tests run in file order with `workers: 1` and no retries. The test DB is created fresh each run (scripts/dev.ts, `localDatabase(undefined)`), so "Exit hidden on `/` before publishing" holds.
- I could not check from the diff that the commit trailer matches the brief's "Claude Opus 5.5" line or the harness's "Claude Sonnet 5.5" reminder.

## Strengths

- The production change is two lines, one spread each, on the root section only, and follows the brief's expressions verbatim. The C17 budget is nowhere near used.
- The marker value is empty. The convention (a page spreads `quickExitScope`) keeps the category out of the DOM, titles and URLs.
- The client-navigation test uses a frozen clock, so the "twice within a second" outcome is exact. It reuses `stayed`, which also checks `body.hidden` and `visits`, and is stricter than the brief.
- `clickLeaves` closes a real hole that the original assertions could not catch. The mutation table shows the original survived, the settle caught the tab cases, and only the `defaultPrevented` observation catches Alt-click.
- `saveNeeds` reads the offered labels and throws on a missing one, instead of silently skipping it.
- `watchEscapeListener` waits on the real listener instead of on `hydrated`, and adds nothing to production.
- The report is honest about the mixed-category gap and the unrelated cold-compile flake (workflow.spec.ts:72, Ruling X-4).

## Issues

### Critical

None.

### Important

1. **The results half of the Profile scope is unproven by any test (plan-mandated test gap).**
   - Where: tests/browser/safety.spec.ts:337-372 (the Profile test) and :404 (the Directory test), covering src/app/profile/page.tsx:13.
   - What: every browser assertion on /profile is driven by `profile.needs`. Deleting `...resources.map(r => r.categories)` from the Profile page would pass the whole suite, because the Safety-only listing is checked only on Home.
     - The branch matters only for a mixed listing, for example Food plus Safety, shown to a person who saved only Food. That is exactly "the person's results include such a listing" from named risk 2.
     - The negative half is also weak: "Food, so Exit hidden" runs while no Food listing exists, so it is hidden trivially. The unit tests cover the pure function but not this wiring.
   - Why it matters: this is the only path by which a person browsing a Safety listing through a non-sensitive need gets Exit. It is a safety behavior, and a silent regression would not fail anything. This is also a surviving mutation, which DS-19 and DS-20 treat as a defect.
   - Judgment on a browser test: yes, one is needed, for Profile only. Home is covered by the Safety-only test, and the mixed case there is the same `some` already unit-tested.
   - Fix (test-only, about 12 lines, one extra run):
     1. Let `publishSafetyListing` tick Food as well as Safety. Or add a `categories` parameter.
     2. In the Directory test, after the `/` assertions, `enterAs(page, 'My profile')` and `saveNeeds(page, ['Food'])`.
     3. Expect the listing heading and Exit both visible.
     4. Click "Delete my saved preferences" to clean up.
     - Keep the Directory test after the Profile test in the file, because Food-only profile results must have no mixed listing yet. Say so in a comment.
     - Optionally add a Food-only listing and a hidden assertion after it, as a positive control for the negative half.
   - Verify the fix with the mutation: delete the spread in profile/page.tsx and run `gate test:e2e tests/browser/safety.spec.ts`. The mixed-listing step must fail, then restore.

### Minor

1. **tests/browser/safety.spec.ts:62-83, `watchEscapeListener` and `shortcutInstalled`: it accepts any window capture `keydown` listener whose source contains "Escape".** Today that is only `QuickExit`. When dialogs and drawers arrive, a second Esc handler would satisfy the wait before `QuickExit` is installed and silently bring back the race. Fix: tighten when an overlay lands, for example by requiring the count to include a listener named `onKey` (dev builds keep function names), or a before and after delta around the mount.
2. **Order and fresh-DB coupling between tests (safety.spec.ts:337 and :404).**
   - The Directory test's first assertion (Exit hidden on `/`) needs an empty directory. The Profile test's Food assertion needs no mixed listing.
   - Both hold with `workers: 1`, no retries, a fresh seeded DB, and the current file order. They break under `--repeat-each` or a reorder, or if a future seed adds a Safety or Housing listing.
   - Fix: a one-line comment on both tests, or assert a precondition with a clear message.
3. **Single-mutation reruns with the final `clickLeaves` are not in the report.** Only "both removed" was rerun against the final helper. By construction each handler maps to its own event, so it should hold. I would run each once to close it:
   - remove `preventDefault` from `onAuxClick` only: expect only the middle-click test to fail;
   - remove `preventDefault` from `onClick` only: expect Control, Shift and Alt to fail.
   Restore with `git checkout src/ui/quick-exit.tsx` after each.
4. **No browser test for a Housing & shelter listing on Home.** The Profile test proves `housing_shelter` is the real code for needs, and listing categories come from the same `tt.code`, so this is low risk. No action is needed.
5. **`clickLeaves` adds about 1 s per test (4 tests).** This is acceptable as a bounded wait that ends on the first event. It is not a real sleep, but the settle is time-based and can only miss a tab that arrives later than 1 s. The `defaultPrevented` check is what makes it deterministic.

## Tests to run (not run: memory)

- After the Important fix: `gate test:e2e tests/browser/safety.spec.ts`, plus the mutation in Important 1.
- Minor 3's two single-mutation runs against `tests/browser/safety.spec.ts`.
- Before the PR: `gate test:e2e tests/browser/safety.spec.ts tests/browser/workflow.spec.ts` once more. A published Safety listing stays in the DB for workflow.spec.ts, which passed in the report's full run.

## Assessment

Task quality: Needs fixes. The production change and the DS-20 hardening are correct and well proven. The one blocker is test-only: add the Profile mixed-listing browser test so the results half of the scope (named risk 2) cannot be deleted without a failure.
