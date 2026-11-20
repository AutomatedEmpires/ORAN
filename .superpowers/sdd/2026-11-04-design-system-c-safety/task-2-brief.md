### Task 2: Esc pressed twice

**Files:**
- Modify: `src/ui/quick-exit.tsx`
- Modify: `tests/browser/safety.spec.ts`

**Interfaces:**
- Consumes: `quickExitUrl`, `quickExitWindowMs` and `leave()` (Task 1).
- Produces: no new exports. `QuickExit` gains a `useEffect` with this behavior:
  - It runs `window.addEventListener('keydown', onKey, { capture: true })` and removes the listener on cleanup. Capture on `window` sees every Esc, even one that a dialog stops.
  - `onKey` ignores the event unless all of these hold:
    - `event.key === 'Escape'`;
    - `!event.repeat`;
    - `!event.isComposing`;
    - the link is rendered (`ref.current?.getClientRects().length`), so the shortcut is live exactly where Exit shows.
  - It reads `performance.now()`, not `event.timeStamp`, so Playwright's clock controls it.
    - When `now - last <= quickExitWindowMs`, it calls `leave()`. Otherwise it sets `last = now`.
    - `last` starts at `-Infinity`.
  - It never calls `preventDefault()` or `stopPropagation()`, so a single Esc still closes dialogs and clears fields.

- [ ] **Step 1: Write the failing tests** in `tests/browser/safety.spec.ts`.
  - **Clock setup**, unless a test says otherwise:
    1. `page.clock.install({ time: new Date('2026-11-04T08:00:00Z') })` before the first `goto`;
    2. `goto('/dev/components')`;
    3. `hydrated(exitLink(page))`;
    4. `page.clock.pauseAt(new Date('2026-11-04T09:00:00Z'))`.
  - **"Stayed"** means three things: `page.evaluate(() => document.body.hidden)` is false, the URL is unchanged, and `visits` is empty.
  - `test('one Esc closes a dialog and never leaves')`:
    - `page.evaluate` creates a `<dialog>` with the text "Synthetic dialog", appends it to `main` and calls `showModal()`;
    - press `Escape`;
    - the dialog's `open` is false, and the page stayed;
    - `clock.fastForward(5000)`; the page still stayed.
  - `test('two Esc presses more than a second apart stay, and a quick third press leaves')`:
    - press `Escape`, `fastForward(1001)`, press `Escape`: the page stayed;
    - press `Escape` again: `waitForURL('https://www.weather.gov/')`.
  - `test('two Esc presses within one second replace the page at once')`:
    - `goto('/sign-in')` before the catalog;
    - press, `fastForward(1000)`, press;
    - `waitForURL('https://www.weather.gov/')`, and `visits` equals `[{ referer: undefined, hidden: true }]`;
    - `goBack()` gives `/sign-in`.
  - `test('a held Esc key is one press')`:
    - add a page listener that pushes `event.repeat` for each Escape keydown into `window.repeats`;
    - `keyboard.down('Escape')` twice, then `keyboard.up('Escape')`;
    - `window.repeats` equals `[false, true]`, and the page stayed.
  - `test('Esc twice leaves while a text field has focus')`:
    - fill the catalog textbox "Resource name" with `Synthetic text` and keep focus there;
    - press `Escape` twice with no fast-forward;
    - `waitForURL('https://www.weather.gov/')`.
  - `test('the shortcut is off where Exit is hidden')`:
    - use the clock setup, but on `/sign-in`;
    - press `Escape` twice: the page stayed.
- [ ] **Step 2: Run** `gate test:e2e tests/browser/safety.spec.ts`. Expected: the three tests that expect to leave FAIL, because Esc does nothing yet.
- [ ] **Step 3: Implement** the effect.
- [ ] **Step 4: Run** the same spec, then `run typecheck` and `run lint`. Expected: all PASS.
- [ ] **Step 5: Commit**

```powershell
git add src/ui/quick-exit.tsx tests/browser/safety.spec.ts
git commit -m "feat: leave for the neutral site when Esc is pressed twice within a second" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

