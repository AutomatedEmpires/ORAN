# Task 3 review: Blend base styles (ed5e552..0693584)

## Spec Compliance

Verdict: ✅ The CSS matches the brief. One test does not meet a named acceptance criterion (Important I1).

- ✅ **Brief table versus CSS (risk 1).** I checked all 30 rows value by value against `src/app/globals.css` lines 75-126. Every row is present and every value matches, including the exact `:focus-visible` rule (line 78), the `.notice` `max-inline-size: none` override of `main p`, the `.error::before` mask, the disabled and reduced-motion rules, and the `.skip` pair (lines 123-124).
  - Specificity holds: `.secondary:hover` (0,2,0) beats `button:hover` (0,1,1). `button:disabled:hover` (0,2,1) beats `.secondary:hover`. The `:has()` label rule beats `label`. State rules come after the field group, so they win on order.
  - Outside the two `:root` blocks there is no hex, `rgb()` or `rgba()`. The only color keyword is `stroke='black'` inside the mask data-URI, which supplies alpha only.
  - Logical properties are used throughout the rewritten rules. Nothing removes the focus outline: `outline` appears once, on line 78.
  - `header`, `.brand`, `.brand span`, `nav`, `nav a`, `footer` and `.local-notice*` are unchanged. The only change near them is that the `main` padding override is dropped from the 760px media query, which is correct now that `main` is tokenized.
- ✅ **Forced colors and focus (risk 2).** The focus ring is an `outline`, which forced-colors mode keeps. No rule removes it.
  - Control boundaries are real borders, not shadows: buttons and the skip link have `1px solid transparent`; fields, select and textarea have `1.5px solid`; cards have `1px solid transparent`; notices have `1px solid --color-border`.
  - Shadows are used only on `.card`, as decoration.
  - One unverified exception is the `.error` glyph (Minor M2).
- ✅ **Exclusions (risk 3, first half).** `input:not([type=checkbox],[type=radio],[type=hidden])` does exclude radios and hidden inputs. Radios get no field box, no 100% width and no border. The second half is a gap (M1).
- ✅ **Deleted rules (risk 4).** `src` has one class reference to a deleted rule: `className="hero"` at `src/app/page.tsx:7`, a wrapper `div` that is now unstyled and harmless. Every other class in `src` (`eyebrow`, `lede`, `grid`, `stack`, `card`, `notice`, `local-notice`, `small`, `tag`, `error`, `skip`, `brand`, `secondary`) still has a rule. The tests reference none of the deleted classes. Only `--line` and `--muted` are still read, by `header` and `footer`, so trimming the bootstrap `:root` to those two is safe (grep of `var(--ink|paper|accent|soft|white|danger|line|muted)` finds only lines 79 and 122).
- ✅ **Ruling DS-5.** The change is additions only. The route handler now counts aborts, then still aborts. New assertions: `aborted > 0`, and the weight-400 Figtree FontFace has `status === 'error'` after `document.fonts.ready`. If `find()` returns undefined the `toBe('error')` fails loudly, so the check cannot pass vacuously.
- ✅ **Interfaces.** `accessible`, `fitsWidth`, `focusByKeyboard` and `ring` match the brief. `accessible` is character-for-character the same logic as `workflow.spec.ts:3`. All five new tests are present with the brief's pages, widths and values.
- ⚠️ **Report additions beyond the table.** Judged under "Report claims" below. All are justified; none should be reverted.

### Report claims, item by item

| Item | Verdict |
|---|---|
| Delete `.hero { padding:26px 0; max-width:760px }` | Justified. 26px is off the spacing scale and 760px is not an allowed constant. The brief itself drops `.hero h1`'s clamp, and `.hero h1` is covered by the generic `h1` rule. The wrapper class remains in `page.tsx` (M3). |
| Delete `form { max-width:720px }` | Justified. 720px is a raw layout value outside the allowed constants, and `main` already caps the column. |
| `.card h2 { margin-block-start: --space-2 }` | Justified. Without it the `h2` sits 32px below the postal-code tag, because the brief's h2 margin applies. It is one token-based line that restores the bootstrap 8px. |
| `.card > input[type=hidden]:first-child + *` | Justified but brittle. It is needed because the four sign-in cards are `<form class="card">` whose first child is a hidden input, and markup is out of bounds. It couples CSS to markup. Add "move the hidden input or give the heading a class" to the deferred-UI list. |
| `padding-block: --space-2` on buttons | Justified. The UA default is 1px, so a wrapped Spanish label would touch the border. One-line buttons stay 44px: 24+16+2 is 42, below `min-block-size`. Compact is 38, also below 44. |
| `fieldset margin-inline: 0` | Justified. It removes the UA 2px margin, which would misalign the checkbox column with the fields. |
| Trim bootstrap `:root` to `--line` and `--muted` | Justified. The six removed variables have no remaining reader. |
| `.button:hover` re-sets `color` | Needed. `a:hover` (0,1,1) would otherwise turn link-buttons dark teal on a teal fill. |

## Strengths

- The CSS follows the brief row for row, in tokens, with careful specificity. The report's claim that disabled-secondary shows no hover change is correct.
- Tests assert computed values from the live page, using roles and labels. Style assertions run before the sizing loops, so a red run names the spec mismatch first.
- The DS-5 check closes a real hole: the old `toMatch(figtreeStack)` was a tautology on the computed `font-family`.
- The raw-color test has a sanity assertion (`toContain('.card')`) against stripping everything.
- Scope discipline is good. Only the three allowed files changed, and the report is candid about its additions and concerns.

## Ruling DS-6: the WebSocket mitigation

Sound and confined to tests; two small improvements below (M4).

- **Confined.** The only change is `tests/browser/support.ts:8-13`, a `test` fixture override. It touches no app, config or server file. It affects only specs that import `test` from `./support`, which is now `design-system.spec.ts`.
- **Sound.** `routeWebSocket(/\/_next\//, () => undefined)` mocks the socket open and never connects it to the server. The page sees a live Fast Refresh channel that never delivers a message, so there is no rebuild-and-reload and no browser-to-server console forwarding. That forwarding is what writes `next-development.log` and triggers the recompile. HTTP requests are unaffected, so the fonts and Google Fonts request assertions still see everything.
- **Cannot hide real failures that these specs observe.**
  - Server render errors and CSS or JS compile errors arrive over HTTP as the response or as a missing asset. The tests would see an absent heading, a failed style assertion or an axe failure.
  - `pageerror` and `console` events come from Playwright's own listeners, not the socket.
  - What is lost is only the HMR overlay relay and the browser-console-to-log forwarding. Nothing in these specs reads either.
- **What it does not do.** `workflow.spec.ts` still imports Playwright's own `test` and stays exposed. The root-cause PR must cover it.

## Issues

### Critical

None.

### Important

**I1. The raw-color test can be fooled by `:root` text inside other selectors (risk 5).** `tests/browser/design-system.spec.ts` ~line 337: `.replace(/:root\s*\{[^}]*\}/g, '')`.
- **What is wrong.** The regex is unanchored. It matches the `:root {` tail of `html:root { color:#fff }`, `.a, :root { … }` or `.x :root { … }`. It deletes up to the first `}`, leaving `html`, `.a,` or `.x`, so the raw color passes. It also stops at the first `}`, so a `:root` block containing a `}` leaves residue behind, which fails the test rather than passing it wrongly. Today's CSS is clean, so this is a guard weakness, not a CSS bug.
- **Why it matters.** The test is the only automatic enforcement of the binding "no raw values in rules" constraint for Tasks 4-6, and its stated purpose is exactly this bypass.
- **Fix.** Strip only rules whose whole selector is `:root`: `.replace(/(^|\})\s*:root\s*\{[^}]*\}/g, '$1')`. Better, split the text into rules and check each selector. Add a negative control that feeds `html:root{color:#fff}` through the same stripping function and expects a match.
- Other gaps are plan-mandated and Minor: `hsl()`, `hwb()`, `oklch()`, `color-mix()` and named colors are not caught, and `stroke='black'` in the data-URI is an existing named color the test cannot see.

### Minor

**M1. Radios get no 44px target (risk 3, second half). Cross-track: handle in Task 4 or follow-up.** `globals.css:106-107`.
- **What is wrong.** Only checkboxes are styled: the `label:has(> input[type=checkbox])` flex/44px rule and the `input[type=checkbox]` size and `accent-color` rule. The slice 2 branch adds `<fieldset><legend>…</legend><label><input type="radio" name="source_type" …/>text</label>…</fieldset>` (seen at the main checkout, `src/ui/forms.tsx:30`). With these styles each radio label is a plain block label: about 24px tall, with a 16px top margin and semibold weight. The radio is the native 13px control with the default blue accent. That misses §5.4 and §9 ("44px radio rows", "44x44 on every interactive element").
- **Fix.** Widen both selectors to `input:is([type=checkbox],[type=radio])`, for example `label:has(> input:is([type=checkbox],[type=radio]))` and `input:is([type=checkbox],[type=radio]) { … }`. Add a radio row to the controls test.

**M2. The `.error` glyph may disappear under forced colors (unverified).** `globals.css:104`.
- **What is wrong.** The icon is `background-color: currentColor` plus a `mask`. In forced-colors mode `background-color` is normally forced to Canvas unless it is a system-color keyword. That would paint the glyph in the page's background color, which is invisible. The message text still carries the meaning, so this loses only the redundant cue.
- **Check I would run, not run here.** Inject an `.error` paragraph, `emulateMedia({ forcedColors: 'active' })`, and compare `getComputedStyle(el, '::before').backgroundColor` with the body background, or take a screenshot.
- **Fix if confirmed.** `@media (forced-colors: active) { .error::before { background-color: CanvasText } }`. System colors are allowed by the constraints.

**M3. `className="hero"` remains at `src/app/page.tsx:7`.** It is a dead class on a wrapper `div`. The file is out of boundary, so list it under "Deferred to a later UI PR".

**M4. Mitigation hygiene (DS-6).** `tests/browser/support.ts:5-13`.
- The comment has no removal condition. Add "remove when the dev-log reload loop is fixed (DS-6 root-cause PR)" so the fixture override does not outlive the fix.
- Two `test` sources now coexist (`support.ts` and raw Playwright in `workflow.spec.ts`). Record in the task notes that new specs should import `test` from `./support` until the root cause is fixed.

**M5. Forced-colors test coverage is thin.** `design-system.spec.ts` ~lines 321-326 (the reduced-motion and forced-colors test).
- It asserts the border style on a button and the Language select. It does not assert the focus ring under `forcedColors: 'active'`, or the borders of a textbox, textarea or card. This matches the brief but not the risk you named.
- **Fix.** Add `expect(await ring(enter)).toMatchObject({ style: 'solid', width: '3px' })` after `focusByKeyboard` under forced colors, plus a textbox border-style check.

**M6. The dev notice changes shape (informational, Task 4).** `.notice` follows `.local-notice` at the same specificity, so the notice's `margin-block` becomes 16px and its `max-inline-size: none` lifts the old 1096px cap. `margin-inline: auto` survives from `.local-notice`, so the dev aside now spans the full viewport width with a border at the edge. The report acknowledges this. It affects only `ORAN_LOCAL_DEV`, and Task 4 rewrites it.

## Assessment

**Task quality: Needs fixes.** The stylesheet is correct and complete against the brief, the additions are justified, and the DS-6 mitigation is sound and test-confined. One small fix is required: harden the raw-color test's `:root` stripping and add a negative control (I1). The Minor items can ride with Task 4 or the follow-up.

Tests I would run after the fix, not run here: `test:e2e tests/browser/design-system.spec.ts` for the hardened test, and a throwaway forced-colors probe for M2.
