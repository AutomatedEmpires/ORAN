# Task 1 review: the Exit link in the top bar (57569f2..7fd1216)

Reviewed from the diff file, the brief, the global constraints, DESIGN_SYSTEM.md section 5.6, ADR-0007 section 3 and the current `globals.css`, `next.config.ts`, `tests/browser/support.ts`, `tests/browser/design-system.spec.ts` (raw-color guard) and the catalog page. Nothing was run (memory is low); tests I would run are named where they matter.

## Spec Compliance: PASS

Every requirement in the brief and in section 5.6 that belongs to this task is met:

- Interface matches the brief exactly: `src/ui/safety.ts` (no directive), `QuickExit` (`'use client'`) with `href`, `rel="noreferrer"`, `aria-label`, the 18px decorative SVG with the three given paths, `onClick` = `preventDefault()` then `leave()` (`body.hidden = true; location.replace(url)`), modifier keys ignored.
- Header order is brand, then `.topbar-actions` (Exit, then the language form), then `DomainNav`. DOM order is visual order.
- Strings: `exit` and `quickExitName` in both catalogs, identical key sets (and a Vitest check pins that).
- Look: `--color-surface-neutral`, `--color-text`, sm/700, `min-block-size: var(--size-target)` (44px), `--radius-control`, transparent 1px border for forced colors. Hover and active keep `--color-text` (specificity 0,2,0 beats `a:hover`).
- `@supports selector(:has(a))` guard, so a browser without `:has()` skips the rule and shows Exit everywhere (fail-open, as the brief mandates).
- Only the nine listed files changed. `src/ui/forms.tsx`, `next.config.ts`, `src/server/*` and the staff pages are untouched. About 70 authored non-test lines, well inside the 200 budget.
- Titles and URLs: nothing in the diff touches metadata, routes or query strings; the marker is a data attribute, not a URL part. No new dependency, env var, route or flag.
- DS-17 / DS-18: blanks the page first, no Referer, no push, no PR in the diff.

Warnings (none block the task):

- ⚠️ The "late hide" detection in the replacement test helper tolerates a hide up to 2 seconds after the request is held (Minor 1).
- ⚠️ A middle click does not leave (Minor 2, a recommendation).
- ⚠️ The catalog sentence about pressing Esc twice is true only after Task 2 (Minor 5).

## Named risks, one focused check each

1. **Accessibility: pass.**
   - Name: `aria-label` "Quick exit to a neutral website" contains the visible word "Exit"; Spanish "Salir rápido a un sitio web neutral" contains "Salir", and both start with the visible word (WCAG 2.5.3). Asserted in Vitest (both languages) and Playwright (both languages, using `innerText`).
   - Target: `min-block-size` and `min-inline-size` are 44px; the box is asserted at 1280.
   - Focus ring: the global `:focus-visible` rule is untouched and `.quick-exit` sets no outline; the ring is asserted after keyboard focus. The group has no `overflow`, so the ring is not clipped.
   - Without JS: it is an `<a href>` from the server render; the no-JS test clicks through.
   - Fail-open: `@supports selector(:has(a))` wraps the only hiding rule. A browser without `:has()` (or without `@supports selector()`) drops the whole block and shows Exit on every page. Chromium's hidden-on-`/sign-in` assertion proves the supported branch.
   - Also checked: SVG is `aria-hidden` and `focusable="false"`; contrast of `#1C2733` on `#EBEEF1` is high; reflow at 320px is asserted in English and Spanish.
2. **Behavior: pass, with the caveats below.**
   - Click does `preventDefault`, hides `body`, then `location.replace`, with no confirmation and no history entry. The Back test is a real negative control: a push would land Back on the catalog instead of `/sign-in`.
   - No Referer: `Referrer-Policy: same-origin` on every response (`next.config.ts:13`, source `/(.*)`) plus `rel="noreferrer"` on the anchor for the no-JS path. Asserted undefined on both paths.
   - JS-failure fallback: before hydration or with JS off, the plain link navigates (it keeps a history entry, and the page is not blanked; that is the documented limit). A throw inside `leave()` after `preventDefault()` has no fallback, but `replace` of a constant https URL cannot realistically throw. I do not rate that.
   - Tests never reach the real site: `beforeEach` routes `/^https:\/\/www\.weather\.gov\//` for every test; the URL always normalizes to a trailing slash, so the pattern matches. No test opens a second page, so the page-scoped route is enough.
3. **Where it shows: pass.** The only marker is the catalog section, so Exit shows on `/dev/components` and is `display:none` (in the DOM, out of the accessibility tree) elsewhere. No staff page, `/sign-in`, or the denied-catalog not-found page carries the marker. Titles and URLs are unchanged. A no-`:has()` browser shows it on staff pages too; that is the brief's fail-open choice.
4. **CSS: pass.** Tokens only (`transparent` is allowed), logical properties, one rule per line (the `@supports` line follows the existing `@media` one-line precedent), no new transition (the 0.12s color transition is inherited from `a`; hover does not change color, and reduced motion zeroes it), focus ring rule untouched. The raw-color guard (`design-system.spec.ts:403`, `rawColor` regex over everything outside `:root`) still covers the new rules and the diff adds no `#hex` or color function.
5. **Catalog "Safety" section: pass.** It sits inside the returned root `<section>`, after `if (!(await allowed())) notFound();`, so a denied request renders the not-found page with no marker and no Exit. The new `h2` does not disturb the existing heading loop (it names five specific headings).

## The declared deviation (`neutralSite`)

Verdict: acceptable replacement, with one tolerance caveat (Minor 1).

- It still proves the page is blanked while the neutral request is in flight. The `MutationObserver` is installed from document start, watches `hidden` on any element but acts only if `document.body.hidden` is true, and calls an exposed binding. The handler holds the response until that report arrives or 2 seconds pass, then records `hidden: reported`. If the page never hides, the handler waits the full 2 seconds and records `false`, so `toEqual([{ referer: undefined, hidden: true }])` fails. A page that hides only on unload or after the answer is also recorded `false`. The author's probe reports exactly these two outcomes.
- It cannot be satisfied by anything else: `reported` is only set on a body-hidden mutation, and it is reset after each visit.
- Without JS, `scripted` is false, nothing waits, and `hidden` is `null`. The no-JS test asserts only the count and the Referer.
- The deadlock claim (a held main-frame request blocks `page.evaluate`) is plausible and the report gives a repro outside the repo; I did not re-run it. The final 5/5 and 38/38 green runs are consistent with the replacement working.
- Task 2 will hit the same deadlock; the controller should update Task 2's brief to reuse `neutralSite(page, scripted)`. The helper is local to `safety.spec.ts` (Playwright specs cannot import each other), so Task 2 adds its tests to this file, or the helper moves to `tests/browser/support.ts`, which is outside Task 1's file list.

## Strengths

- Small, exact to the interface in the brief, and honest about its one deviation and one gap.
- The tests check computed styles, geometry, axe at two widths, focus ring, forced colors, reduced motion, both languages, 320px reflow, and the no-JS path.
- `hydrated()` gates the click test, so it cannot pass or flake because the click landed before React attached the handler.
- The Back-button assertion is a real negative control for `replace` versus `assign`.
- Extra Vitest cases (markup before any script, constants, en/es key parity) are cheap and useful.
- Fail-open `:has()` rule; every test stubs weather.gov.

## Issues

### Critical

None.

### Important

None.

### Minor

1. **`tests/browser/safety.spec.ts:33` (and the assertion at `:135`): the "hidden at once" check tolerates a hide up to 2 seconds late.**
   - What is wrong: `hidden` is true if the body was hidden at any moment before the held response is released, and the hold can last 2 seconds. A regression such as `setTimeout(() => { document.body.hidden = true }, 1500)` would pass, although ORAN would stay on screen for 1.5 seconds after the click. The helper comment ("a page that is hidden only after weather.gov answers is recorded as not hidden") is true only for hides later than the hold.
   - Why it matters: Review Focus 2 asks that ORAN vanish at once, not after the network answers. The test now proves "before the answer, within 2 seconds", not "when the request arrives".
   - Fix (optional, small): in the init script, read `document.body.hidden` at the moment the navigation starts and report that, using the Navigation API: `navigation.addEventListener('navigate', () => report(document.body.hidden))`. It fires synchronously inside `location.replace`, so the value is strictly "hidden before navigation". Keep the 2 second hold only to absorb binding-versus-request ordering. Mutation check I would run: `gate test:e2e tests/browser/safety.spec.ts` once with `leave()` hiding in a 1500ms timeout (should fail after the fix, passes today) and once with the hide removed (must fail).
2. **`src/ui/quick-exit.tsx:19-22`: a middle click does not leave.**
   - What is wrong: a middle click fires `auxclick`, not `click`, so the browser's default opens weather.gov in a background tab and ORAN stays visible. The comment at line 11 says every click leaves in this tab, modifier keys included, and the middle button is the odd one out.
   - Is it acceptable? It is a rare gesture on a button labeled "Exit", and the brief does not ask for it, so it does not block Task 1. But the failure is silent and is the exact outcome the control exists to prevent, and the fix is about four lines in a file this task owns. I recommend doing it now rather than carrying the gap.
   - Fix: add `onAuxClick` that handles only `event.button === 1` (call `preventDefault()` and `leave()`), and leave right-click and the context menu alone, because Chromium and Firefox also dispatch `auxclick` for button 2. Add a test: `exit.click({ button: 'middle' })` should record the visit, hide the page and leave no second page. Verify `preventDefault` on `auxclick` cancels the new-tab behavior in Chromium and Firefox. "Open link in new tab" from the context menu or a long press cannot be handled; that is an accepted limit.
3. **`tests/browser/safety.spec.ts:135,155`: the "no Referer" assertions have no positive control, and the guarantee lives in an unpinned config.**
   - What is wrong: `referer: undefined` would also pass if `route.request().headers()` never exposed a Referer. `Referrer-Policy: same-origin` exists only in `next.config.ts`, and no unit test pins it (`tests/next-config.test.ts` checks only the dev cache settings), so a header change would be caught only by this e2e outcome.
   - Fix (optional): add a one-line header assertion to a unit test (outside this task's file list, so Task 4 or the final branch review can take it), or a control that shows a Referer is visible when present.
4. **`tests/browser/safety.spec.ts`: "modifier keys included" is claimed in a comment and not tested.** Add a `exit.click({ modifiers: ['Control'] })` case, or soften the comment.
5. **`src/app/dev/components/page.tsx` (new last section): the sentence "pressing Esc twice leaves for the neutral site" is false until Task 2 lands.** The brief mandates the text and the commit is local, so there is no harm. Do not ship Task 1 alone.

## Assessment

Task quality: Approved. It meets the brief and section 5.6 for this task, the replacement test helper is sound, and nothing in it needs fixing before Task 2. I recommend adding the middle-click handler (Minor 2) in this task or Task 2, and tightening the hide check (Minor 1) when Task 2 reuses the helper.
