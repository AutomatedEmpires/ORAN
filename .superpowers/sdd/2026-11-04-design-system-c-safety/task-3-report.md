# Task 3 report: Exit on Safety and Housing & shelter results

Status: DONE_WITH_CONCERNS (concerns are minor, see the end)
Commit: `0a89ee2 feat: show quick exit on Safety and Housing & shelter results` (on `claude/design-system-c-safety`, not pushed, per DS-18)

## What I implemented

Production code (6 changed lines in 2 files):
- `src/app/page.tsx`: `<section {...quickExitScope(showsQuickExit(...resources.map(r=>r.categories)))}>`.
- `src/app/profile/page.tsx`: `<section {...quickExitScope(showsQuickExit(profile?.needs??[],...resources.map(r=>r.categories)))}>`. The saved needs count, because they are the filter of the results.
- Nothing else in `src/` changed. `src/ui/forms.tsx` is untouched.

Tests:
- `tests/browser/support.ts`: `saveNeeds(page, labels)`. It fills the ZIP with 98101, sets every checkbox of the "Support categories" group to checked exactly when its name is in `labels`, checks consent, clicks Save, waits for the `POST /profile` response, then waits for the form to be rebuilt (consent unchecked again) and for the "Delete my saved preferences" button. A label the page does not offer throws a clear error instead of being skipped.
- `tests/browser/safety.spec.ts`:
  - `Exit follows the saved Safety and Housing & shelter needs`: Food (hidden), Safety (visible, title `ORAN`, no query string, URL without safety/housing/seguridad/vivienda, no "Get help now" in main), client-side nav to Organization (alert, Exit hidden, Esc twice with a frozen clock stays: not hidden, URL unchanged, `visits` empty), reload of `/profile` (visible), Food (hidden), Housing & shelter (visible), delete (hidden).
  - `Exit shows on the directory once it lists a Safety listing`: hidden on `/`, `publishSafetyListing(page)` (admin creates the listing with source "A phone call", then records the verification in the queue article on `/admin`), then on `/` the heading and Exit are visible, title `ORAN`, URL exactly `http://127.0.0.1:3100/`, no "Get help now", axe passes.
  - `publishSafetyListing` copies the creation steps of `workflow.spec.ts` test 1 as they are on `main` (main still saves unpublished: status "Saved. This resource needs an evidence check before publication."), so I used the admin verification path from the brief.

## DS-20 hardening of the Task 2 / Task 1 tests

1. **Wait for the real listener.** `watchEscapeListener(page)` is an init script (added in `beforeEach` when JavaScript is on). It wraps `EventTarget.prototype.addEventListener/removeEventListener` and keeps the set of live `keydown` capture listeners on `window` whose code names `Escape`; `window.oranEscapeListeners()` returns its size. `shortcutInstalled(page)` polls it. `freezeClock(page)` calls it before `page.clock.pauseAt`, and `frozenAt` uses `freezeClock` (after the existing `hydrated`). The new Task 3 test uses `freezeClock` before its Esc presses. No production marker was added.
2. **Missing Navigation API fails clearly.** `neutralSite`'s init script now reports a sentinel through the existing binding when `window.navigation` is absent. The visit then carries `hidden: 'window.navigation is missing, so the hidden check cannot run'`, so the strict `toEqual` fails with that cause. Verified by mutation (below).
3. **"No other tab" assertions proven by mutation.** Details below. The original assertions could not catch the regression, so I replaced them with the shared `clickLeaves` helper.
4. **Teardown under a paused clock.** Not added (see below).

## Mutation results (DS-20 item 3)

Mutations were made in `src/ui/quick-exit.tsx` and restored with `git checkout`. The committed file is unchanged from HEAD~1.

| Step | Mutation | Test code | Result |
|---|---|---|---|
| A | remove `preventDefault` from `onAuxClick` | original (immediate `opened`/`pages()` check) | `a middle click on Exit ...` PASSED. It survived. |
| A2 | same | + bounded settle (`context.waitForEvent('page', {timeout:1000})`) | FAILED: "Received promise resolved instead of rejected, Resolved to value: Page". The stray tab arrives after the page has left, so the immediate check was too early. A control run (temporary spec, deleted) showed a middle click on a plain link opens a tab in this harness (1 tab) and still opens one with a pending `location.replace` in the handler (1 extra tab). |
| B | remove `preventDefault` from `onClick` (A restored) | + settle | Control-click and Shift-click FAILED ("a second tab opened after the page left"). Alt-click PASSED (survived). |
| B2 | same | + `download` event in the settle | Alt-click still PASSED. Under Playwright an Alt-click starts no download that can be seen. |
| AB | both removed | final `clickLeaves` (settle + download watch + `defaultPrevented` observation) | All four (middle, Control, Shift, Alt) FAILED on "the link cancelled the default action of the click" (Expected `[true]`, Received `[false]`). |

Final design of `clickLeaves(page, context, click)`: a window bubble-phase listener for `click`/`auxclick` on `a.quick-exit` reports `event.defaultPrevented` through a one-way binding (it runs after React's handler); the test requires `[true]`. It also keeps the bounded settle for a late tab or download, and `visits` must be exactly one visit with `hidden: true`. The Alt-click gap is why the `defaultPrevented` observation exists. Each stray-free test now costs about 1 second more.

Other mutation/experiment results:
- **Sentinel.** With `window.navigation` deleted in a temporary init script, `clicking Exit replaces the page...` failed with `- "hidden": true` / `+ "hidden": "window.navigation is missing, so the hidden check cannot run"`.
- **afterEach resume (item 4).** A forced failure (`expect(1).toBe(2)`) right after `frozenAt` in `a held Esc key is one press`, with no `afterEach`, failed in 3.7 s including teardown and trace. There is no hang to shorten, so I did NOT add `test.afterEach(({ page }) => page.clock.resume())`. (It would also have installed the fake clock in tests that never used it, because `clock.resume()` installs the clock if needed.)
- The temporary spec edits were restored from a snapshot (`git diff` shows no forced-failure or deleteProperty line), and the temporary control spec `tests/browser/zz-control.spec.ts` was deleted.

## TDD evidence

RED (before the two page edits; hardening already in the spec), `gate test:e2e tests/browser/safety.spec.ts`:

```
  ✘  15 tests\browser\safety.spec.ts:319:1 › Exit follows the saved Safety and Housing & shelter needs (19.5s)
  1) ... Error: expect(locator).toBeVisible() failed
     Locator:  getByRole('banner').getByRole('link', { name: 'Quick exit to a neutral website', ... })
     Expected: visible    Received: hidden    (after saveNeeds(page, ['Safety']))
  2) tests\browser\safety.spec.ts:386:1 › Exit shows on the directory once it lists a Safety listing
     Expected: visible    Received: hidden    (after the Safety listing is published and `/` lists it)
  2 failed / 15 passed (2.3m)
```
So `saveNeeds`, the Food-hidden step, `publishSafetyListing` and the listing heading all worked; only Exit was missing, as the brief predicted. The 15 earlier tests (including the hardened ones) passed.

GREEN, `gate test:e2e tests/browser/safety.spec.ts tests/browser/workflow.spec.ts`:
```
  23 passed (2.1m)
```

## Full gate (final code, committed)

- `run typecheck`: exit 0.
- `run lint`: exit 0 (`--max-warnings 0`).
- `gate test`: 7 files, 116 tests passed.
- `gate build`: exit 0, 11 routes listed.
- `gate test:e2e` (full): first run 49 passed, 1 failed; second run **50 passed (4.5m), exit 0**.
  - The one failure in run 1 was `workflow.spec.ts:72 organization staff maintain their own unpublished resources`: after clicking "Edit resource" on `/organization`, the page did not reach the edit route within the 15 s expect timeout (error-context shows it still on `/organization`). That is the first, cold dev-server compile of `/resources/[id]/edit` under memory pressure. It passed in 12.7 s on the rerun, and in 8.5 s in the earlier safety+workflow run. I did not change anything it touches.

## Self-review checks

- Exit shows on Home when a Safety listing is listed: `Exit shows on the directory...` (Housing & shelter listing on Home is covered by the `showsQuickExit` Vitest case, not a browser test).
- Exit shows on Profile for saved Safety and for saved Housing & shelter needs; hidden for Food and after delete: step list of the first test.
- Hidden after client-side nav to `/organization`, and Esc twice does nothing there (clock frozen, so "within one second" is exact).
- Neutral: title `ORAN`, empty query string, no category words in the URL, on both pages. No search parameters added.
- No crisis card: "Get help now" count 0 in main on both pages.
- Staff workspaces got no scope. `src/ui/forms.tsx` untouched.

## Files changed (committed)

- `src/app/page.tsx`
- `src/app/profile/page.tsx`
- `tests/browser/support.ts`
- `tests/browser/safety.spec.ts`

## Decisions

- Listener watcher counts only capture `keydown` listeners on `window` whose source contains `Escape`, so other libraries' listeners cannot satisfy the wait. It wraps the `EventTarget` prototype, not only `window.addEventListener`, and tracks removals, so React StrictMode's add/remove/add counts as one live listener.
- The new Task 3 test installs the page clock at its start and uses `freezeClock` + `page.clock.resume()` around the Esc presses, so "twice within a second" is deterministic, then continues in real time for the later reload and saves.
- `saveNeeds` also waits for the form rebuild (consent box unchecked), which the brief did not ask for. It keeps the next call from filling a form that the refresh is about to replace.
- Reused `stayed(page, address)` for the Esc check on `/organization`: it checks the body is not hidden, the address is unchanged and `visits` is empty, which is stricter than the brief's URL-only check (a leave sets `body.hidden` before the navigation commits).
- Used `randomUUID` from `node:crypto` for the listing name (same function as `crypto.randomUUID()`).

## Concerns

- The "organization staff maintain..." workflow test is sensitive to a cold compile of the edit route when the machine is under memory pressure (one flake in the first full run; the rerun was green). Not related to this change.
- A listing with several categories (for example Food and Safety) shown on Profile through the Food need would also show Exit, by the `resources.map(r => r.categories)` part of the scope. No browser test covers that; the unit tests cover `showsQuickExit` itself.
- Spanish strings are unaffected by this task (no new copy).

---

# Fix round 1 (review: Important 1, Minor 1, 2, 3)

Commit: `c60b638 test: prove quick exit on Profile results for mixed listings` (test-only: `tests/browser/safety.spec.ts`; no production file changed; not pushed).

## What changed

- **Important 1.** `publishSafetyListing(page, alsoIn = [])` now ticks Safety plus any other categories. The Directory test (renamed `Exit shows on the directory once it lists a Safety listing, and on Profile results that include it`) publishes the listing with `['Food']`, keeps all its `/` assertions, then runs `enterAs(page,'My profile')`, `saveNeeds(page,['Food'])`, expects the listing heading and Exit visible, clicks "Delete my saved preferences" and expects Exit hidden. A comment on the test says it must stay after the Profile test, because the listing it publishes would make the Profile test's Food-only steps show Exit.
- **Minor 2.** Both order dependencies are now precondition assertions with a message: the Profile test's two Food-only `toBeHidden` checks fail with "no Safety or Housing & shelter listing exists yet (this test runs before the directory test, on a fresh database)", and the Directory test's first `toBeHidden` on `/` fails with "the directory lists no Safety or Housing & shelter listing yet (this test needs a fresh database)". A comment above the Profile test states the order rule.
- **Minor 1.** Two-line comment in `watchEscapeListener`: it accepts any capture keydown listener that mentions Escape, so it must be tightened (for example by function name) when dialogs or drawers add their own Esc handlers.
- Not done: the optional Food-only positive-control listing (it would cost another admin publish flow, and a Food need would then also show the mixed listing, so the hidden assertion could not share a profile with it).

## Mutation results

Restored with `git checkout -- <file>` after each run; the working tree held only the spec change at commit time.

| Run | Production mutation | Tests run | Result |
|---|---|---|---|
| X | delete `...resources.map(r=>r.categories)` from `src/app/profile/page.tsx` AND remove `preventDefault` from `onAuxClick` only | middle click, Control/Shift/Alt, Directory test | Directory test FAILED at `await expect(exit).toBeVisible()` right after the listing heading was visible (spec line 432, the mixed-listing step: `Expected: visible, Received: hidden`). Middle click FAILED ("the link cancelled the default action of the click", Expected `[true]`, Received `[false]`). Control, Shift and Alt PASSED. |
| Y | remove `preventDefault` from `onClick` only (profile spread and `onAuxClick` intact) | same three groups | Control, Shift and Alt FAILED (same message, line 216). Middle click PASSED. Directory test PASSED (so the new mixed-listing step is green on the real code). |

Run X combined the profile-spread mutation with the `onAuxClick`-only mutation because the two touch disjoint tests (the Directory test and the click tests). Each result is attributable on its own: the Directory test fails at the new step, and only the middle-click test fails among the click tests. The single-mutation expectations from the review hold: `onAuxClick` only breaks only the middle click; `onClick` only breaks only Control, Shift and Alt.

## Gate (final code, commit c60b638)

- `run typecheck`: exit 0.
- `run lint`: exit 0.
- `gate test:e2e` (full): **50 passed (2.8m), exit 0**. `Exit follows the saved ...` (5.5s) and the renamed Directory test (4.8s) are both green.
- Vitest and the build were not rerun: no `src/` file differs from commit 0a89ee2 (they passed there).

## Notes

- All background work finished. No server on port 3100. A `test-gate.lock` exists at the end of my session, held by another owner's run (the gate output showed "waiting for lock held by: slice2-T10" during my runs); I did not touch it.
