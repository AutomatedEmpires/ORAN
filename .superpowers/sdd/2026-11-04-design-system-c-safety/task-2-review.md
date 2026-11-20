# Task 2 review: Esc pressed twice (plus DS-19 items 1-3)

Range reviewed: 7fd1216..18751fa (commit 18751fa). Read-only review. I did not re-run any test (memory). Tests I would run to close the open points are named under Issues.

## Spec Compliance: ✅

Everything in the brief and in DS-19 items 1-3 is implemented as written. I read the diff, the committed `src/ui/quick-exit.tsx`, `src/ui/safety.ts`, `src/app/layout.tsx`, the CSS rule at `src/app/globals.css:92`, `tests/browser/support.ts`, `playwright.config.ts`, and DESIGN_SYSTEM §5.6 / ADR-0007 §3.

- Effect: `window.addEventListener('keydown', onKey, { capture: true })`, removed on cleanup with the same capture flag (`quick-exit.tsx:31-32`).
- Guards (`:24`, `:26`): Escape, `!repeat`, `!isComposing`, and `ref.current?.getClientRects().length`.
- `performance.now()`, `last = -Infinity`, `now - last <= quickExitWindowMs` leaves, else `last = now` (`:19`, `:27-29`).
- No `preventDefault()` / `stopPropagation()` in the key path.
- DS-19.1: the init script reads `document.body.hidden` inside the Navigation API `navigate` event (`safety.spec.ts:35-37`). DS-19.2: `onAuxClick`, button 1 only (`quick-exit.tsx:46-50`). DS-19.3: Control, Shift and Alt click tests (`safety.spec.ts:164-177`).
- All six brief tests are present with the brief's values (1001 stays, 1000 leaves, `[false, true]`, `[{ referer: undefined, hidden: true }]`, goBack to `/sign-in`). Plus the middle-click test and the three modifier tests: 15 tests in the spec, 10 new.
- Files touched are exactly the two listed. No new export, dependency, route or flag. Production change is +32 lines, well inside the C17 budget.

Items to note (not defects):
- ⚠️ "The listener is active only where the Exit link shows" is met by gating at event time. The listener itself is registered once from the root layout and is present (but inert) on staff pages, because `QuickExit` is in `layout.tsx:22` and the brief mandates the `getClientRects()` gate. No behavior on staff pages; I am not counting this against the task.
- ⚠️ Where `:has()` is unsupported, CSS fails open (Exit shows everywhere, `globals.css:92`), so the shortcut follows it everywhere. That is Task 1 CSS and consistent with "at least wherever the button shows".
- ⚠️ `Meta`-click has no test (Control, Shift, Alt only). Same `onClick` path; reasoning in the report is acceptable.

## Strengths

- The implementation is small and mirrors the brief line for line. The boundary is exact: `-Infinity` start, inclusive `<=`, and `last` updated only on a miss, so a miss correctly becomes the new first press. The 1001-then-third-press test would fail if `last` were not updated on a miss, so the "timer resets after a miss" rule is genuinely covered.
- The rendered-link gate is evaluated at event time, not at mount. Because `QuickExit` lives in the root layout and survives client-side navigation, the live check is the only correct design: it follows the `:has([data-quick-exit])` CSS as soon as the page changes, and it also goes inert after `leave()` hides the body (no rects), so a third press cannot re-enter.
- Nothing swallows the key: no `preventDefault`, no `stopPropagation`, capture on `window` only observes. A single Esc still reaches the dialog's own cancel and clears fields. The dialog test also checks that nothing leaves after `fastForward(5000)`.
- The strict hide check is truly strict. The `navigate` event fires synchronously inside `location.replace()`, so a hide that is delayed, reordered after the call, or removed reads `false`. The hostname filter keeps Next.js client navigations from reporting. The route handler's 2 s hold now only absorbs binding-versus-request ordering, and it resets `reported` to `null` per visit.
- Moving the route to `page.context()` is right: a stray tab can no longer reach the real weather.gov.
- The `page.clock` use is sound. `install` is before the first `goto`; time is paused only after `hydrated`; all time movement is `fastForward` or `pauseAt` (no real sleeps); `performance.now()` is the faked clock. Under a paused clock the elapsed time is exactly 0, 1000 or 1001 ms, so the boundary tests are deterministic. `expect.poll` and `waitForURL` run on Node's real clock, so pausing does not stall them.
- The held-key test verifies its own precondition (`repeats` equals `[false, true]`), so it cannot pass because the harness failed to produce a repeat.
- The "off where Exit is hidden" test asserts `toBeHidden()` first, then presses, so it cannot pass for the wrong reason. The implementer's mutation of the rendered check shows it bites.
- No-JS behavior is untouched: `href`, `rel`, and `aria-label` are unchanged, and `ref` and handlers add no markup. The no-JS tests are unchanged.

## Issues

### Critical
None.

### Important
None.

### Minor

1. **Listener readiness is not awaited** — `tests/browser/safety.spec.ts:185` (`frozenAt`: `await hydrated(exitLink(page))`, then `pauseAt` at `:186`).
   - `hydrated()` polls for React's `__reactProps$` key on the link. As far as I know, React sets that during the hydration render phase (`hydrateInstance`), before commit. The Esc listener is installed by a passive `useEffect` after commit, which is later still.
   - Between the two there is only one CDP round trip (`pauseAt`) before the first `keyboard.press`. On a slow main thread (cold dev compile, loaded machine) the window can be missed.
   - Effect on the three "leaves" tests: a flaky `waitForURL` timeout. Effect on the negative tests (dialog, held key, off-where-hidden): a vacuous pass. The 48/48 run and the implementer's mutation runs show the listener was armed in those runs, so this is a low-probability risk, not a current failure.
   - Fix: make `frozenAt` wait on a real signal. For example, the init script wraps `window.addEventListener` and records a keydown capture registration (the implementer's deleted probe already did this), and `frozenAt` does `expect.poll` on it before `pauseAt`. Do not add a production marker for this.

2. **"Fails loudly" when the Navigation API is missing is indirect** — `safety.spec.ts:35`.
   - `scope.navigation?.addEventListener(...)` silently skips the listener. Each affected test then waits the full 2 s in the route handler and fails with `hidden: null` where `true` was expected. It does not pass silently, but the message does not say why.
   - Fix: when `scope.navigation` is absent, report a sentinel through the binding, or make the visit carry a reason, so the assertion output says "Navigation API unavailable". Alternatively guard in `neutralSite` with an explicit `expect(await page.evaluate(() => 'navigation' in window)).toBe(true)` after the first load. Cheap, and it removes a 2 s stall per test on a browser that lacks the API. Playwright runs only Edge (`playwright.config.ts`), so this is future-proofing.

3. **The "no other tab" half of the middle-click and modifier tests is unproven to bite** — `safety.spec.ts:159-160` and `:174-175`.
   - `expect(context.pages()).toHaveLength(1)` and `expect(opened).toHaveLength(0)` run immediately after `waitForURL` with no settle. The `page` event for a stray tab is asynchronous, and a stray tab's `visits` entry would arrive about 2 s later (the popup has no binding, so the handler waits out its timeout). So a regression that leaves in this tab and also opens a tab could race past these assertions.
   - The implementer's mutation list covers the hide, `<=`, `!repeat` and the rendered check. It has no "drop `preventDefault` from `onAuxClick`" or "drop it from `onClick`" mutant. The Control, Shift and Alt tests passed in the RED run, so they are characterization tests whose only new teeth are in this unproven assertion.
   - In practice Chromium opens the tab immediately on mouseup, so detection is likely, but nobody has shown it.
   - Tests I would run to close this: `gate test:e2e tests/browser/safety.spec.ts` with (a) `preventDefault` removed from `onAuxClick` and (b) `preventDefault` removed from `onClick`; expect the middle-click and the modifier tests to fail respectively.
   - If either survives, add a bounded settle such as `await expect(context.waitForEvent('page', { timeout: 1000 })).rejects.toThrow()` before the assertions.

4. **Failure-path cost under a paused clock** — the implementer saw a 2.1 min context teardown on a failing test under `pauseAt`.
   - Likely cause: failure artifacts (trace screenshots) wait on faked `requestAnimationFrame` or timers. It costs nothing when green.
   - Optional: a `test.afterEach(({ page }) => page.clock.resume())` in the Esc tests might shorten a red run. I have not verified that it does. Not required.

Observation, not counted as a defect: using `performance.now()` at handling time instead of `event.timeStamp` is plan-mandated so that Playwright's clock controls it. It can mis-measure by the length of a main-thread stall between two presses. A real stall is unlikely on a keyboard Esc, and the comment explains the choice. No change.

Claims I could not verify independently (not re-run): the RED/GREEN counts, the mutation failures, and the three-navigation listener probe (deleted, not committed). They are consistent with the code: the listener lives in a component that persists across soft navigation, has `[]` dependencies and a symmetric cleanup, and the gate reads the DOM at event time. In dev, Strict Mode's double mount re-creates `last` per run, which is harmless.

## Assessment

Task quality: Approved. Spec is fully met: timing rule, scope gate, no swallowing of the single Esc, button-1-only `onAuxClick`, and DS-19 items 1-3; the code is correct, small and clean. Four Minor findings are test-hardening only (listener-ready wait, clearer Navigation-API failure, proving the no-new-tab assertion bites, optional teardown tweak); none blocks merge.
