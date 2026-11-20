# Task 2 report: Esc pressed twice (plus DS-19 review items)

Status: DONE_WITH_CONCERNS (concerns are small and listed at the end)
Branch: claude/design-system-c-safety. Commit: `18751fa feat: leave for the neutral site when Esc is pressed twice within a second`. Not pushed, no PR (DS-18).

## What was implemented

### src/ui/quick-exit.tsx (+32 lines, no new export)
- `QuickExit` now holds a `ref` on the link and a `useEffect` that adds `window.addEventListener('keydown', onKey, { capture: true })` and removes it on cleanup (same capture flag).
- `onKey` returns unless `event.key === 'Escape'`, `!event.repeat`, `!event.isComposing`, and `ref.current?.getClientRects().length` is non-zero (the link is rendered, so the shortcut is live exactly where Exit shows; the Task 1 CSS `display:none` removes the rects elsewhere).
- It reads `performance.now()` (the Playwright clock controls it, `event.timeStamp` is not). `now - last <= quickExitWindowMs` calls `leave()`, otherwise `last = now`. `last` starts at `-Infinity`.
- It never calls `preventDefault()` or `stopPropagation()`, so a single Esc still closes dialogs and clears fields.
- DS-19.2: `onAuxClick` handles only `event.button === 1`: `preventDefault()` then `leave()`. Right click and the context menu are untouched.
- DS-19.3: checked what the code does. `onClick` calls `preventDefault()` and `leave()` for every click, so Ctrl, Shift and Alt clicks already leave in this tab. The comment that claimed this was true, so it stays, now reworded and backed by tests (see below). No comment had to be softened.

### tests/browser/safety.spec.ts (+159/-15)
- DS-19.1, strict hidden check: `neutralSite`'s init script now reads `document.body.hidden` inside `navigation.addEventListener('navigate', ...)` (only for destinations on www.weather.gov) and reports that value through the `oranBodyHidden(hidden)` binding. The Navigation API is available in the Edge used here (the tests record `hidden: true` for the real code and `false` for the mutants, which proves the event fires synchronously inside `location.replace`). The route handler still holds the response up to 2s, only to absorb the ordering between the binding message and the request; `reported` is now `boolean | null`.
- The route is now on `page.context()` (was `page`), so a tab that a stray click opens (the middle click RED case) is answered locally too and never reaches the real host.
- Helper location: kept `neutralSite` in `tests/browser/safety.spec.ts`, not moved to `support.ts` (it is only used here, and support.ts is outside this task's file list).
- The installed TypeScript DOM lib has no Navigation API types, so the init script casts `window` to a small local type.
- New tests (Task 2 brief, verbatim values): "one Esc closes a dialog and never leaves", "two Esc presses more than a second apart stay, and a quick third press leaves", "two Esc presses within one second replace the page at once", "a held Esc key is one press", "Esc twice leaves while a text field has focus", "the shortcut is off where Exit is hidden". Helpers `frozenAt(page, ...paths)` (clock install, goto, hydrated, pauseAt) and `stayed(page, address)` (not hidden, same URL, no visits). Time uses `page.clock` only, no real sleeps.
- DS-19 tests: "a middle click on Exit leaves in this tab and opens no other" (visit recorded with `hidden: true`, `context.pages()` length 1, and no `page` event on the context) and a loop of three: Control-click, Shift-click, Alt-click leave in this tab and open nothing.
- Test-authoring fix found during RED: a closed `<dialog>` has no accessibility role, so the dialog is located with `page.locator('dialog', { hasText })`, not `getByRole('dialog')`.

## Tests and results (final)
- `run typecheck`: exit 0. `run lint`: exit 0 (`--max-warnings 0`).
- `gate test`: 7 files, 116 tests passed.
- `gate build`: compiled, exit 0.
- `gate test:e2e` (all specs): 48 passed (3.7m), exit 0. The safety spec is 15 tests, all green.

## TDD evidence
RED (before touching quick-exit.tsx; spec already strict plus new tests), `gate test:e2e tests/browser/safety.spec.ts`:
```
10 passed, 5 failed (15.2m)
 FAIL a middle click on Exit leaves in this tab and opens no other   (waitForURL timeout: middle click did nothing)
 FAIL one Esc closes a dialog and never leaves                       (test bug, getByRole('dialog') not found once closed; fixed after)
 FAIL two Esc presses more than a second apart stay, and a quick third press leaves  (waitForURL timeout at the third press; the "stayed" part passed)
 FAIL two Esc presses within one second replace the page at once     (waitForURL timeout)
 FAIL Esc twice leaves while a text field has focus                  (waitForURL timeout)
 PASS Control/Shift/Alt-click (characterization of the existing onClick), held key, off-where-hidden (they assert "stays", true today)
```
GREEN, same command after the implementation and the locator fix:
```
15 passed (5.1m)
```
Final full-suite run: `48 passed (3.7m)` (see above). Raw output of the runs is in the scratchpad (red.txt, green.txt, mutA.txt, mutB.txt, t2-*.txt).

## Mutation checks (each reverted; `quick-exit.tsx` restored byte-for-byte and diffed before the final gate)
Run with `--timeout=20000`, all of `safety.spec.ts`:
- Run A (four mutations at once, told apart by failure message):
  - hide delayed by `setTimeout(..., 1500)` before `location.replace`: tests 4 (clicking Exit), 5 (middle click), 6, 7, 8 (Ctrl, Shift, Alt) FAIL with `hidden: true` expected, `false` received. Before DS-19.1 the old check let this through.
  - `<=` changed to `<`: "within one second" test FAILS with a `waitForURL` timeout (1000 ms no longer leaves).
  - `!event.repeat` removed: "a held Esc key is one press" FAILS (page left).
  - rendered check (`getClientRects`) removed: "the shortcut is off where Exit is hidden" FAILS (page left).
  - Result: 8 failed, 7 passed. The 7 passes are the tests those mutants cannot affect.
- Run B: the hide removed entirely (`leave()` only calls `location.replace`): tests 4, 5, 6, 7, 8 and "within one second ... at once" FAIL (`hidden: false`). 6 failed, 10 passed (the 10th passing is the probe below).
- The Esc-twice-leaves tests also fail without the effect (the RED run), and the middle click test fails without `onAuxClick` (RED run).

## Self-review checklist
- Shortcut live only where Exit shows: `getClientRects().length`; the `/sign-in` test (Exit `display:none`) proves two Esc presses stay; mutation proved the test bites.
- Single Esc closes a dialog: no `preventDefault`/`stopPropagation`; dialog test passes, including after `fastForward(5000)`.
- Held key counts once: `repeats` equals `[false, true]` and the page stays; mutation proved it.
- More than 1000 ms apart stays (1001), exactly 1000 leaves; the `<` mutation proved the boundary.
- Esc in a text field still counts: no target filter; test passes.
- Back skips the replaced page: `goBack()` lands on `/sign-in`.
- Listener leaks: the listener lives in the layout-level `QuickExit` (mounted once), and its effect has `[]` deps and a cleanup. I verified it with a temporary probe spec (deleted, not committed): wrapped `window.add/removeEventListener`, counted live Esc keydown capture listeners: 1 after load (React Strict Mode double mount nets to 1), 1 after three soft navigations (a window marker proved they were client-side, not full loads), and 1 after Back. It ran in mutation Run B and passed.
- No process was killed. The gate lock was held by another track (slice2-T9) for a while before the final runs; I waited for it.

## Files changed
- `src/ui/quick-exit.tsx`
- `tests/browser/safety.spec.ts`
(`src/ui/forms.tsx` untouched; `support.ts` untouched.)

## Decisions
1. Helper `neutralSite` stays in safety.spec.ts (rationale above).
2. Route moved to the context so popups cannot reach the real host.
3. Modifier-click: added tests (Control, Shift, Alt) instead of softening the comment. Meta was not added; same code path, and Meta is not reliable in a Windows run.
4. `getClientRects().length` is the live check as the brief says; if a browser lacks `:has()`, the CSS keeps Exit visible (fail open) and the shortcut follows it.

## Concerns
1. Navigation API in the tests: the strict hidden check depends on `window.navigation`, which Chromium/Edge have. If a future test browser lacks it, the tests fail loudly (`hidden: null`), they do not pass silently.
2. A failing test under a paused `page.clock` can hang the context teardown (seen: "Tearing down context exceeded the test timeout", a 2.1 minute failure). It only costs time when a test fails; the green suite is fast (15 tests, 5.1m on a loaded machine, mostly dev-server start).
3. Product note, from the spec itself: on a Safety page, closing two stacked overlays with Esc twice in under a second also leaves ORAN (spec §5.6 allows this, "at least wherever the button shows").
4. `event.isComposing` guards IME on Chromium and Firefox; Safari's trailing keyCode 229 after composition is not specially handled (minor).
5. A modal `<dialog>` still has an inert link outside it, but `getClientRects()` still returns rects, so the shortcut stays live under a dialog, as the brief intends.
