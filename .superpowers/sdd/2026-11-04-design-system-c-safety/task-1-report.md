# Task 1 report: the Exit link in the top bar

Status: DONE_WITH_CONCERNS (one deviation from the brief's test helper, one note for Task 2; both below).

Commit: `7fd1216 feat: add the quick exit link to the top bar on Safety results` on `claude/design-system-c-safety` (from main 57569f2). Not pushed, no PR (DS-18).

## What I implemented

- `src/ui/safety.ts` (no directive): `quickExitUrl`, `quickExitWindowMs`, `quickExitCategories`, `showsQuickExit(...lists)` and `quickExitScope(show)`, exactly the brief's interface.
- `src/ui/quick-exit.tsx` (`'use client'`): `QuickExit({ label, name })` renders `<a class="quick-exit" href="https://www.weather.gov" rel="noreferrer" aria-label={name}>` with the 18px inline SVG exit icon (the three paths from the brief, `aria-hidden`, `focusable="false"`) and the label. `onClick` always calls `preventDefault()` and then `leave()` (`document.body.hidden = true; window.location.replace(quickExitUrl)`), so modifier keys also leave in this tab. Without JavaScript it is a plain link.
- `src/app/layout.tsx`: the header is now brand link, then `div.topbar-actions` (QuickExit, then `form.language`), then `DomainNav`.
- `src/app/globals.css` (+4 rules, 1 changed): `.topbar-actions`, `.language` without `margin-inline-start:auto`, `.quick-exit`, `.quick-exit:hover, :active`, and `@supports selector(:has(a)) { body:not(:has([data-quick-exit])) .quick-exit { display:none; } }`. Tokens only, logical properties, one rule per line, no new transition (the 120ms color transition comes from the existing `a` rule; reduced motion zeroes it), focus ring rule untouched.
- `src/ui/en.json`, `src/ui/es.json`: `exit` ("Exit" / "Salir") and `quickExitName` ("Quick exit to a neutral website" / "Salir rápido a un sitio web neutral"). The Spanish strings are drafts that need native-speaker review (say so in the PR).
- `src/app/dev/components/page.tsx`: new last section "Safety" with `{...quickExitScope(true)}`, h2 `#catalog-safety` and the `p.small` text from the brief.
- Authored size: about 70 non-test lines (budget about 200).

## Tests

- `tests/safety-ui.test.ts` (Vitest, 6 tests): the brief's `showsQuickExit`/`quickExitScope` assertions verbatim; the constants; the `QuickExit` markup through `renderToStaticMarkup` (plain `<a>`, class, href, `rel="noreferrer"`, `aria-label`, text directly after the SVG, the decorative SVG attributes and the three paths); name and visible word in en and es; en and es have identical key sets.
- `tests/browser/safety.spec.ts` (5 tests), as the brief lists them: the 44px neutral link on the right (all CSS values, box order, focus ring, axe at 360 and 1280, 320 reflow, "Get help now" count 0, hidden on `/sign-in`); forced colors and reduced motion; English and Spanish names; click replaces the page, hides it, sends no Referer and Back skips the catalog; no JavaScript plain link. `beforeEach` stubs weather.gov, so no run reaches the real host.

Results (all through the gate unless noted):

| Run | Result |
|---|---|
| `test tests/safety-ui.test.ts` | 6 passed |
| `test:e2e tests/browser/safety.spec.ts` (final) | 5 passed |
| `test:e2e` safety + design-system + component-catalog (first run) | 30 passed, 2 failed (see Decisions 1; fixed in the test) |
| `run typecheck` | exit 0 |
| `run lint` | exit 0 (`--max-warnings 0`) |
| `test` (all Vitest) | 7 files, 116 passed |
| `build` | success, all 11 routes |
| `test:e2e` (full suite, final) | 38 passed (10 catalog, 17 design-system, 5 safety, 6 workflow) |

The PR A header and Spanish reflow tests still pass with the new `.topbar-actions` group.

## TDD evidence

RED, Vitest (before any `src/` file existed):

```
> gate test tests/safety-ui.test.ts
 FAIL  tests/safety-ui.test.ts [ tests/safety-ui.test.ts ]
Error: Cannot find package '@/ui/quick-exit' imported from .../tests/safety-ui.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

RED, Playwright (banner had no Exit link):

```
> gate test:e2e tests/browser/safety.spec.ts
  5 failed
    safety.spec.ts:31:1 › Exit is a 44px neutral link on the right of the top bar on Safety results
    safety.spec.ts:76:1 › Exit keeps its edge under forced colors and does not animate with reduced motion
    safety.spec.ts:92:1 › Exit names the neutral site in English and Spanish and keeps its visible word in its name
    safety.spec.ts:112:1 › clicking Exit replaces the page and hides it at once
    safety.spec.ts:129:3 › without JavaScript › Exit is a plain link to the neutral site
  e.g. Error: expect(locator).toBeVisible() failed
       Locator: getByRole('banner').getByRole('link', { name: 'Quick exit to a neutral website', exact: true, includeHidden: true })
       Error: element(s) not found
```

GREEN:

```
> gate test tests/safety-ui.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)

> gate test:e2e tests/browser/safety.spec.ts
  ✓ 1 Exit is a 44px neutral link on the right of the top bar on Safety results (11.4s)
  ✓ 2 Exit keeps its edge under forced colors and does not animate with reduced motion (2.1s)
  ✓ 3 Exit names the neutral site in English and Spanish and keeps its visible word in its name (3.8s)
  ✓ 4 clicking Exit replaces the page and hides it at once (4.3s)
  ✓ 5 without JavaScript › Exit is a plain link to the neutral site (1.7s)
  5 passed (51.3s)

> gate test:e2e   (full suite)
  38 passed (3.3m)
```

Note: the shared scratchpad files I first used for RED and GREEN output (`red-e2e.txt`, `green-e2e.txt`) were overwritten by another agent's run later, so the RED and first-GREEN excerpts above are what I read from the console at the time.

## Files changed

`src/ui/safety.ts` (new), `src/ui/quick-exit.tsx` (new), `src/app/layout.tsx`, `src/app/globals.css`, `src/ui/en.json`, `src/ui/es.json`, `src/app/dev/components/page.tsx`, `tests/safety-ui.test.ts` (new), `tests/browser/safety.spec.ts` (new). `src/ui/forms.tsx` and everything else outside the brief's list is untouched.

## Decisions

1. **The hidden check in `neutralSite` does not use `page.evaluate` (deviation from the brief).**
   - What the brief says: the route handler reads `document.body.hidden` with `page.evaluate` from the still-current page before fulfilling.
   - What happens: that read deadlocks. My first run passed 30 and failed the two navigation tests with a 60s `waitForURL` timeout, in the JavaScript and the no-JavaScript test alike.
   - Evidence: I reproduced it outside the repo with Playwright 1.64.1 on the Edge this machine uses. While a main-frame navigation request is held in a route handler, `page.evaluate`, `page.content()`, `page.screenshot()` and a raw CDP `Runtime.evaluate` on a new session all hang until the navigation commits, and then throw "Execution context was destroyed". The handler waits on the read, and the navigation waits on the handler.
   - What I did: the page reports instead. An init script (`page.addInitScript`) watches the `hidden` attribute with a `MutationObserver` and calls a binding (`page.exposeFunction`), which is a one-way message that is still delivered. The handler holds the response until that report arrives or 2 seconds pass, then records `hidden` as true or false and fulfils. In a probe, a page that calls `document.body.hidden = true` then `location.replace` recorded `hidden: true` with no wait, and a page that only calls `location.replace` recorded `hidden: false` after the 2s hold, so the assertion fails for a page that does not hide in time. Without JavaScript nothing can hide the page, so `hidden` is `null` and the handler does not wait (the helper takes `javaScriptEnabled` from the test fixture).
   - The recorded shape is unchanged: `[{ referer: undefined, hidden: true }]`.
2. **Referer.** `location.replace` sends no Referer because `next.config.ts` already sets `Referrer-Policy: same-origin` on every response, and `rel="noreferrer"` covers the plain link. I added no meta tag. The test asserts `referer` is undefined on both paths, and a comment in `leave()` records why.
3. **Extra Vitest cases** beyond the brief's single `it`: constants, `QuickExit` markup and en/es key parity. They are cheap and cover the "plain link before hydration" and "strings in both languages" checks without a browser.
4. **Step 0.** The worktree was already on `claude/design-system-c-safety` at 57569f2 with a clean tree, and `src/ui/button.tsx` and the PR #18 merge are in its history, so no branch switch was needed.
5. **Not handled on purpose:** a middle click fires `auxclick`, not `click`, so it opens the neutral site in a new tab and leaves ORAN open in the old one. The brief only requires every `click` to leave in this tab.

## Self-review

- Accessible name: `aria-label` "Quick exit to a neutral website" contains the visible word "Exit" (and "Salir" in Spanish); both tests assert it. The SVG is `aria-hidden`.
- Target: 44px minimum in both dimensions, asserted at 1280.
- No JavaScript: the markup is a plain `<a href>`; the no-JavaScript test clicks through and sees no Referer.
- Marker and `:has()`: shown on `/dev/components` (marked), hidden but in the DOM on `/sign-in`. Browsers without `:has()` skip the `@supports` block and show Exit everywhere (fail-open).
- Strings: identical key sets in en and es, asserted in Vitest.
- weather.gov is never contacted: every test routes `/^https:\/\/www\.weather\.gov\//` in `beforeEach`.

## Concerns

- **Task 2 will hit the same deadlock.** Its test "two Esc presses within one second replace the page at once (the body is hidden when the request arrives)" cannot read the body with `page.evaluate` inside the route handler for the same reason. It should reuse this `neutralSite(page, scripted)` helper. The helper lives in `tests/browser/safety.spec.ts`, and Playwright does not let one spec import another, so Task 2 should add its Esc tests to the same file (or the helper should move to `tests/browser/support.ts`, which is outside Task 1's file list).
- The `hidden` report only watches the `hidden` attribute on any element (it checks `document.body.hidden`). If a later task hides the page another way (a class or inline style), the helper has to change.
- The Spanish strings are drafts for native-speaker review.
