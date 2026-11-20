# Task 6 report: Button primitive (ORAN design-system PR B)

Status: DONE_WITH_CONCERNS (one plan deviation, see Decisions 1; two small concerns below).
Commit: `4b98303 feat: add the Blend Button primitive and its catalog states` on `claude/design-system-b-catalog` (parent 563a3d1). Not pushed, not rebased, no PR (DS-8).

## What was implemented

- `src/ui/button.tsx` (no `'use client'`, see Decisions 1): `ButtonVariant`, `ButtonSize`, `buttonClassName(variant = 'primary', size = 'default')`, `ButtonProps`, `Button`.
  - `buttonClassName()` is `'button'`; `('secondary','compact')` is `'button button-secondary button-compact'`.
  - `Button` renders `ButtonControl` with `className={buttonClassName(variant, size)}`.
- `src/ui/button-control.tsx` (`'use client'`): the only client code. Renders a native `<button>`.
  - `disabled` is destructured and never forwarded, so the native `disabled` attribute is never set. Disabled buttons stay focusable.
  - `aria-disabled="true"` when `disabled || busy`; `aria-busy="true"` when `busy`. Caller-supplied `aria-disabled` / `aria-busy` pass through when the button is not inactive.
  - `onClick`: when `disabled || busy`, `event.preventDefault()` and return; otherwise forwards to the caller's `onClick`.
  - Children are passed through untouched (the label stays while busy). `type` passes through, so the native default is submit.
- `src/app/globals.css` (after the Task 3 button rules):
  - `.button-large`, `.button-quiet`, `.button-destructive`, `.button-destructive-confirm` (plus their `:hover`/`:active` rules, per the brief's token mapping).
  - `.button[aria-disabled=true]:not([aria-busy=true])`: the Task 3 disabled look (specificity 0,3,0).
  - `.button[aria-busy=true]` (`cursor: progress`) and its `::before` spinner (`--space-4` square, `2px solid currentColor`, transparent inline-end side, `--radius-full`, `button-spin` at `calc(var(--motion-base) * 4)`), plus `@keyframes button-spin`. The existing reduced-motion rule (`animation:none !important` on `*::before`) turns it off.
  - `.catalog-row` layout helper for the catalog.
  - Forced colors (two small rules added to the existing forced-colors media query): aria-disabled buttons get `border-color: GrayText`; the spinner's open side becomes `ButtonFace` (see Decisions 4).
- `src/app/dev/components/page.tsx`: "Buttons" section (`<section id="buttons">`) between Typography and Form controls, exactly as in the brief: one GET form with `<input type="hidden" name="submitted" value="1">`; five labelled `<section aria-labelledby>` groups (Primary, Secondary, Quiet, Destructive, Destructive confirm), each with `L`, `L large`, `L compact`, `L disabled`, `L busy`; then the "Secondary link" with `buttonClassName('secondary')` and `href="#buttons"`.
- `src/app/layout.tsx`: "Apply" and "Sign out" are `<Button variant="secondary" size="compact">`.
- DS-13 items (all done):
  1. Host hardening pinned in the guard test: denied `evil@127.0.0.1`, `127.0.0.2`, `localhost:99999`, `localhost:`; allowed `LOCALHOST:3000`. Temporary revert of the `loopbackHost.test(host)` check made the guard test fail (see TDD evidence); guard.ts restored (no diff).
  2. `page.tsx` has one `async function allowed()` used by `generateMetadata` and by the page body. The brief's first-line authorization comment is kept, and the guard check is still the first statement of the page.
  3. Forced-colors card test now also asserts `expect(forced.color).not.toBe('rgba(0, 0, 0, 0)')` next to the `!== normal.color` check.
  4. `role="list"` on the swatch `<ul>`; the catalog test asserts the attribute.

## Tests and results (all through the gate, owner `design-T6`)

| Check | Result |
|---|---|
| `typecheck` | pass (exit 0) |
| `lint` | pass (exit 0, `--max-warnings 0`) |
| `test` (vitest) | 5 files, 60 tests passed |
| `build` | pass; `/dev/components` listed as dynamic |
| `test:e2e` (full suite) | 31 passed (8 in component-catalog, 17 in design-system, 6 in workflow), 0 flaky |

New or changed tests in `tests/browser/component-catalog.spec.ts`:
- `buttonClassName composes variant and size classes` (no page).
- `catalog renders every Button variant, size and state`: the brief's variant color table, radius 12px, weight 700, 16px, >= 44px tall, large >= 48px, compact 14px, disabled attributes and focusability, disabled look unchanged after hover, busy attributes, accessible name, spinner `button-spin` and `none` under reduced motion, link background and height, focus ring on "Primary" and "Destructive confirm", header "Apply" background and 14px font.
- `busy and disabled buttons stay distinguishable under forced colors` (added, see Decisions 4).
- `disabled and busy buttons never submit` (Enter, then forced click, then a real click on "Primary" submits).
- Updated: guard test (host matrix), heading list (adds "Buttons"), swatch `role="list"`, forced-colors card assertion.

## TDD evidence

RED (Step 2), before any implementation:
```
powershell ... test-gate.ps1 -Owner design-T6 test:e2e tests/browser/component-catalog.spec.ts
Error: Cannot find module '...\src\ui\button' imported from '...\tests\browser\component-catalog.spec.ts'
Error: No tests found.
exit 1
```

A second RED, found by the first GREEN attempt (real bug, fixed by Decisions 1): with `buttonClassName` exported from a `'use client'` module, the catalog page failed in the server render:
```
Error: Attempted to call buttonClassName() from the server but buttonClassName is on the client.
  at ComponentCatalog (src\app\dev\components\page.tsx:64:67)
5 failed, 3 passed
```
A third failure was in my own forced-colors assertion: under forced colors the author's `color: GrayText` is not applied to a button's text (computed `rgb(0,0,0)` for both enabled and disabled), but `border-color: GrayText` is (`rgb(96,0,0)`). I probed the palette with a temporary spec (deleted), then changed the CSS and the assertion to the border.

GREEN after the fixes: component-catalog 8/8, then the full suite 31/31 (logs under `.superpowers/sdd/2026-11-03-design-system-foundation/logs/t6-*.log`).

Mutation checks (each reverted, `git diff` clean afterwards):
- Guard regex: `if (!host || !loopbackHost.test(host))` changed to `if (!host)`, ran `-g "catalog guard"`: FAIL, `Error: evil@127.0.0.1  Expected: false  Received: true`. So deleting the regex now fails a test.
- Click guard: removed `event.preventDefault()`, ran `-g "never submit"`: FAIL, `Error: Primary disabled submitted the form  Expected: false  Received: true`. So the never-submit test is not vacuous.

## Files changed (commit 4b98303)

- `src/ui/button.tsx` (new)
- `src/ui/button-control.tsx` (new, extra file; not in the brief's list)
- `src/app/globals.css`
- `src/app/dev/components/page.tsx`
- `src/app/layout.tsx`
- `tests/browser/component-catalog.spec.ts`

No edits to any file under the global-constraints "never edit" list. No new tokens, env variables, flags, routes or dependencies (so no ARCHITECTURE.md change).

## Decisions

1. **Plan deviation: `button.tsx` has no `'use client'`; the client code is in `button-control.tsx`.** The brief asked for `src/ui/button.tsx` with `'use client'`, but the same brief has the server-rendered catalog page call `buttonClassName('secondary')`. Next refuses to call functions exported from a client module in a server component (the RED above). A server component also cannot attach `onClick`, so `Button` itself needs a client part. Fix: `button.tsx` keeps every exported name from the brief's interface (`ButtonVariant`, `ButtonSize`, `buttonClassName`, `ButtonProps`, `Button`) and is importable from server and client code alike; only the click guard moved to `ButtonControl`. Callers still write `import { Button, buttonClassName } from '@/ui/button'`.
2. **Disabled and Enter semantics (§5.4).** The button is never natively disabled and stays focusable. The `onClick` `preventDefault` also blocks Enter, Space and a form's implicit submission, because browsers raise each as a click on the default submit button. So a disabled or busy default button blocks implicit submission, as a natively disabled one would. The tests cover Enter on the focused button and a forced click. Implicit submission from a text field is not asserted (the catalog form has no text field).
3. **Box sizing of the spinner.** `*` does not match pseudo-elements, so the spinner sets `box-sizing: border-box` to make it a true `--space-4` square (16px including the 2px border).
4. **Forced colors (review focus 3), small additions beyond the brief.** A transparent border side is replaced by a visible system color in forced colors, which would close the spinner ring. The spinner's open side is therefore `ButtonFace` there. Disabled buttons get `border-color: GrayText` because forced colors otherwise render them like enabled ones; `color: GrayText` has no effect on a button's text in Chromium (probed), so only the border is used. A test covers both.
5. **Test hydration helper.** The never-submit test waits until React has hydrated the button (a `__reactProps$` key on the DOM node) before pressing keys. Without that wait, an early click would use the browser's native submit and the test would fail intermittently. The helper is local to the spec (the brief's file list does not include `support.ts`).
6. **Hover settle.** The disabled-hover check waits for the element's CSS transitions to finish (`getAnimations()`), so a hover rule that wrongly applies cannot pass by being read at the start of its 120ms transition.
7. **Commit trailer.** I used `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the attribution given for this session), not the `Claude Opus 5.5` line in the global constraints. The earlier commits on the branch use the Opus line. The controller may want to normalise this before the PR.

## Concerns

- Before React hydrates, a `disabled` or `busy` Button is only marked with aria attributes; the click guard does not exist yet, so a click then submits natively. Busy is normally set after an interaction (so hydrated), but a statically rendered `disabled` Button is exposed to this until hydration completes. A server-side `type="button"` for inactive buttons would close it but would change the markup contract in the brief, so I did not do it. The code comment documents it.
- Under forced colors a disabled Button is marked only by its `GrayText` border (text color cannot be changed), which is a weaker cue than a native disabled button's gray text. The accessible state is correct either way.
- The commit trailer differs from the earlier commits (Decisions 7).
- `ActionForm` (`src/ui/forms.tsx`) and the profile "Delete my saved preferences" button still use native `disabled` and `.secondary`; they are in the brief's "Deferred" list and were not touched.

---

## Final-review fix wave (DS-15)

Commit: `87320d0 fix: own the Button's disabled state and tighten its tests` on `claude/design-system-b-catalog`, on top of cdc6d86. New commit only, no amend, files staged by name, not pushed. Trailer is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` as the coordinator specified.

Note on the shell: mid-task the tool's working directory changed to the main checkout (`...\Projects\oran`). My first typecheck in that directory ran against the main checkout (it showed two unrelated `src/modules/catalog/index.ts` errors from the other track) and was discarded. Every result below was re-run with `Set-Location` into the worktree.

### Changes

- **I1** `src/ui/button-control.tsx`: `aria-disabled={inactive || undefined}` and `aria-busy={busy || undefined}` are written after `{...props}`, and `'aria-disabled' | 'aria-busy'` are no longer destructured. `ControlProps` and `ButtonProps` (button.tsx) `Omit<>` both attributes, so the type refuses them. New test `Button alone decides whether it is disabled or busy` (no page, `renderToStaticMarkup`):
  - `disabled={false}, busy={false}` renders exactly `<button class="button">Save</button>`;
  - `disabled`, `busy` and both render `aria-disabled="true"` and no native `disabled`; `busy` adds `aria-busy="true"`, `disabled` alone does not;
  - an object literal with `aria-disabled`/`aria-busy` carries `// @ts-expect-error` (so `typecheck` fails if the `Omit` is ever removed) and its markup has no `aria-` attribute at all.
- **I2** comments only. The spec comment now reads "Busy keeps the variant's own look and the label, and exposes aria-busy." The `button.tsx` header says a busy Button keeps its label, `aria-busy` is not reliably spoken, and a caller that needs a spoken cue renders the pending text in an always-present `role="status"` region (empty when idle). The plan's deferred ActionForm entry is the controller's.
- **M1** `disabled and busy buttons never submit`: presses Space after Enter (a separate keyup activation), `waitForURL(..., { timeout: 1000, waitUntil: 'commit' })`, and `await expect(page).not.toHaveURL(/submitted=1/)` before the positive "Primary" click.
- **M2** new test `the catalog page asks the guard itself, not only the proxy`. Approach: Option A, a real Host header (details below).
- **M3** `tests/browser/support.ts`: the comment now says specs use Playwright's own `test` so pages can hydrate, and that a spec needing React running waits with `hydrated()`. `hydrated(target: Locator)` moved there from the catalog spec (exported, keeps the loud failure: `expect.poll` with a message, which times out if React renames `__reactProps$`). The catalog spec imports it.
- **M5** `button.tsx` header comment: server callers may pass only serializable props (`onClick` and `ref` type-check but fail at runtime); `type` defaults to submit (pass `type="button"` for non-submitting actions); while inactive only `onClick` is guarded (other handlers and parent click handlers still run; a native disabled button suppresses its click entirely).
- **M6** `page.tsx` comment: no longer says "as an unknown route would". It says a denied request gets the not-found page and none of the catalog's content or metadata, that its status is still 200 (the root `loading.tsx` streams first), which shows the route exists, and that the deferred fix is a 404 for `/dev/*` in `src/proxy.ts`. The first-line authorization comment is unchanged.
- **M4** left alone (deferred), as ruled.

### M2: approach chosen and evidence

Option A works, so Option B (a source-text assertion) was not needed.
- The test uses `node:http` with an explicit `Host: evil@127.0.0.1:3100`, because a browser and Playwright's request context never send such a header.
- `src/proxy.ts` compares `request.nextUrl.hostname`, which parses to `127.0.0.1`, so the request passes the proxy. The page's `headers().get('host')` still returns the raw string, so only the guard's host-shape check refuses it.
- A control request with the launcher's own Host must contain "Component catalog" (so the text check can tell the two apart). The `evil@` request must not contain it and must contain "Page not found" (the app's not-found heading), so a proxy refusal (`Not found`, plain text) or an error cannot pass for it. No status assertion is made on purpose: the known 200 will become a 404 when the proxy fix lands.
- Mutation check: replaced `if (!(await allowed())) notFound();` with a comment and ran `-g "asks the guard itself"`: FAIL, `Error: userinfo host  Expected substring: not "Component catalog"  Received string: "<!DOCTYPE html>..."` (the denied response contained the catalog). So the header does reach the page, and deleting the page's guard call now fails a test. Restored; the `page.tsx` diff shows only the comment change.
- Mutation check for I1: moved `{...props}` after the aria attributes and ran `-g "alone decides"`: FAIL, `Error: caller attributes  Expected substring: not "aria-"  Received: <button aria-disabled="true" aria-busy="true" class="button">Save</button>`. Restored from a backup copy and verified.

### Edited existing assertions (C16)

No assertion was removed, loosened or weakened. Existing assertions touched:
- `disabled and busy buttons never submit`:
  - `waitForURL` gained `waitUntil: 'commit'` (M1: a navigation that starts but has not reached `load` within the one second can no longer be missed);
  - a Space press was added next to Enter (M1: keyup is a separate activation path);
  - `expect(page).not.toHaveURL(/submitted=1/)` was added before the positive click (M1: that positive check must not pass because an earlier press submitted late).
- The `hydrated()` poll message changed from "React has hydrated the button" to "... the element" because the helper is now shared (M3).
- Comment-only edits: the "Busy keeps ..." comment in the catalog test (I2).
- Imports in the catalog spec now include `node:http`, `react`, `react-dom/server`, `Button`/`ButtonProps` and `hydrated`.

### Gate commands and output

All run from the worktree root, owner `design-fixB`, no bare `--`.

```
# typecheck (direct):  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 typecheck
  Generating route types... Types generated successfully     typecheck exit 0
# lint (direct):       powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 lint
  eslint . --max-warnings 0                                  lint exit 0
# powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Cole0\AutomatedEmpires\Projects\oran\.local\test-gate.ps1 -Owner design-fixB test
  Test Files  5 passed (5)   Tests  60 passed (60)           exit 0
# ... test-gate.ps1 -Owner design-fixB build
  Compiled successfully; /dev/components listed dynamic       exit 0
# ... test-gate.ps1 -Owner design-fixB test:e2e
  33 passed (2.5m)                                            exit 0
```
A focused catalog run before the full suite gave `10 passed (54.6s)`. The full e2e count is the previous 31 plus the two new tests (`Button alone decides ...` and `the catalog page asks the guard itself ...`). Logs: `.superpowers/sdd/2026-11-03-design-system-foundation/logs/fixB-*.log`.

### Concerns

- The new M2 test depends on the dev server accepting a Host header with userinfo, which Next 16.4 does today. If a future Next rejects it before the page, the test fails on "Page not found" instead of passing vacuously, and would need a different host value.
- The `generateMetadata` denial on `next start` stays a one-time manual check with no CI test, as the review notes.
