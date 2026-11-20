# Task 3 report: base styles for the existing screens

Status: DONE_WITH_CONCERNS. Commit `0693584 feat: restyle the existing screens with Blend base styles` on `claude/design-system-a-foundation` (not pushed).

## What I implemented

- `src/app/globals.css`: rewrote every rule in the brief's table, in tokens, with logical properties, and deleted the bootstrap versions (`.hero h1` clamp, old `.secondary`, `button:disabled { opacity }`, the brown `:focus-visible`, `.card p` muted color, the pill `.tag`).
  - Header, `.brand`, `.brand span`, `nav`, `nav a`, `footer` and `.local-notice*` are byte-for-byte unchanged, in their original order.
  - The Blend `:root` block is unchanged. The bootstrap `:root` line is trimmed to `--line` and `--muted`, the only two values the untouched header and footer rules still read. Task 4 deletes it.
  - Outside the two `:root` blocks there is no hex, `rgb()` or `rgba()`. The `.error::before` glyph is a hand-drawn SVG data-URI mask (circle, stem and dot; `stroke='black'` only supplies alpha, and the fill is `currentColor` through `background-color`).
  - `.skip:focus` shares the primary-button rule (`button, .button, .skip:focus`), so the skip link gets exactly the button look; `.skip` sits above the viewport until focused, then at inset `--space-2` with `z-index: var(--layer-toast)`.
- `tests/browser/support.ts`: added `accessible`, `fitsWidth`, `focusByKeyboard`, `ring` (per the brief's interfaces) and a `test` export (see Decisions, item 8).
- `tests/browser/design-system.spec.ts`: five new tests from the brief, plus the Ruling DS-5 strengthening of the font-fallback test (assertions only).

## Tests and results

Final gate runs (all through `test-gate.ps1 -Owner design-T3`, from the worktree root):

| Command | Result |
|---|---|
| `test:e2e` (full, default config, no flags) | 15 passed (57.2s): 11 design-system, 4 workflow. Run twice with the same result. |
| `lint` | exit 0 |
| `typecheck` | exit 0 |

Ruling DS-5: in Edge the weight-400 Figtree FontFace does reach `status === 'error'` after `document.fonts.ready` with the woff2 requests aborted, and the route handler counts at least one abort. No deviation to record. The h1-visible assertion and every other existing assertion are kept.

## TDD evidence

RED command (cold-start noise removed by `--trace off`, see Concerns 1):

```
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Cole0\AutomatedEmpires\Projects\oran\.local\test-gate.ps1 -Owner design-T3 test:e2e tests/browser/design-system.spec.ts --trace off
```

RED output (old CSS; full text at `...\scratchpad\red-run.txt`):

```
✓  1 implements every DESIGN_SYSTEM §3 token with its exact value
✓  2 writes every approved token verbatim in the globals.css token block
✓  3 implemented colors keep the DESIGN_SYSTEM §3.2 contrast ratios
✓  4 forces the light color scheme
✓  5 seeker pages load self-hosted Figtree and never contact Google Fonts
✓  6 text renders in the fallback stack when font files fail      (DS-5 assertions already hold: nothing to change in CSS)
✓  7 existing pages pass axe and reflow at phone and desktop widths   (a regression guard; it already held on the old CSS)
✘  8 controls follow the Blend button and field specs
     Locator: getByRole('button', { name: 'Add resource', exact: true })
     Expected: "rgb(23, 89, 107)"   Received: "rgb(28, 88, 71)"      <- the bootstrap --accent, as the brief predicted
✘  9 keyboard focus shows the Blend focus ring
     skip link ring: expected color rgb(23, 89, 107) / offset 2px; received rgb(149, 100, 27) / 4px
✘ 10 honours reduced motion and keeps control boundaries under forced colors
     Expected substring "0.12s", received "0s"
✘ 11 rules use tokens instead of raw colors        Received: ["#95641b"]
4 failed, 7 passed
```

An earlier RED pass also showed the sizing assertion failing for the right reason: checkbox label height 25.6px against the 44px minimum.

GREEN command: the same, without `--trace off`, then the full `test:e2e` (above).

```
✓  1-11 tests\browser\design-system.spec.ts  (all 11)
✓ 12-15 tests\browser\workflow.spec.ts       (all 4)
15 passed (57.2s)
```

Full texts: `...\scratchpad\green-run.txt` (design-system only, 11 passed) and `...\scratchpad\green-full-run.txt` (15 passed).

Visual check: I rendered `/sign-in`, `/admin`, `/profile` and `/` at 360 and 1280 px with a throwaway Playwright config (deleted afterward) and looked at the screenshots. Sign-in cards, form fields, the checkbox grid, secondary and primary buttons, and an injected `.error` message with its glyph all rendered as intended.

## Files changed

- `src/app/globals.css`
- `tests/browser/support.ts`
- `tests/browser/design-system.spec.ts`

## Decisions (brief ambiguities and gaps)

1. **Rules not in the table.**
   - `.hero { padding; max-width:760px }`: deleted. The 26px padding is off the spacing scale, and the 760px cap duplicates `main`'s column.
   - `form { max-width:720px }`: deleted. 720px is not an allowed layout constant and `main` already caps the column.
   - `.card h2,.card h3 { margin-top:8px }`: replaced by the table's "first child has no top margin".
2. **Card heading spacing (two small additions).**
   - `.card h2 { margin-block-start: var(--space-2) }`, so the title does not sit 32px below the postal-code tag.
   - The first-child rule also matches the sibling after a leading hidden input (`.card > input[type=hidden]:first-child + *`). Without it the four sign-in cards put 32px above their heading, because the form's first child is `<input type="hidden">`.
3. **Button `padding-block: var(--space-2)`.** The table gives only padding-inline. A long Spanish label that wraps to two lines would otherwise touch the border. One-line buttons are still 44px, from `min-block-size`.
4. **Fieldset `margin-inline: 0`**, to remove the UA 2px inline margin that would misalign the checkboxes with the fields.
5. **Selector specificity for states.**
   - `input[readonly], textarea[readonly]` and `[aria-invalid=true]` are written with the element name so they beat the field group `input:not(...)` (0,1,1) by order, not lose to it.
   - `button:disabled, button:disabled:hover, button:disabled:active` is deliberately more specific than `.secondary:hover`, so a disabled secondary button shows no hover change.
   - `.button:hover` re-sets `color: var(--color-on-primary)` so a link styled as a button does not take `a:hover`'s dark-teal text on a teal background.
6. **`.local-notice` order.** I kept `.local-notice*` before `.notice`, as in the original file. `.notice { max-inline-size: none }` (required by the table to beat `main p`) therefore also lifts the dev notice's old 1096px cap. It is a development-only aside, and Task 4 rewrites it.
7. **`.card`** sets `color: var(--color-text)` on the card (inherited), not `.card p`, so `.small` and `.tag` inside a card keep `--color-text-secondary`.
8. **Fast Refresh channel blocked in the design-system specs** (support.ts `test` export; see Concerns 1). It replaces a first attempt that waited for `networkidle` after every navigation, which hung (rather than failed fast) whenever the dev server was in a reload loop.
9. **Controls test.** The combobox count is not asserted to be above zero, because `/admin` has a combobox in `main` only when the verification queue is non-empty. Buttons, textboxes and checkboxes are asserted non-empty. The style assertions run before the sizing loops so a red run reports the spec mismatch first.
10. **Commit trailer.** I used `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` exactly as in the brief and the global constraints, not the Sonnet line from the session reminder.

## Concerns

1. **Next dev-server reload loop, which makes browser specs flaky on this machine.** Diagnosis, not a fix I could make inside the file boundary:
   - Symptom: right after `page.goto`, `page.evaluate` fails with "Execution context was destroyed". Tasks 1 and 2 only passed by timing luck. It hit unmodified tests (token, contrast, light-scheme and font tests) on my first two runs, and once it ran for the whole of a 12-minute run.
   - Evidence: `.next-test/dev/logs/next-development.log` shows a repeating pair, the browser's "Download the React DevTools" console line followed about 40ms later by `Compiled in 1ms`, ~900 times in two minutes. The Playwright trace shows `[HMR] connected`, `[Fast Refresh] rebuilding`, then a full reload. The only file written during a loop is that log (the browser console is forwarded to it).
   - It occurred with and without Playwright tracing. It is random, so many runs are calm.
   - `workflow.spec.ts` survives a loop only because its assertions are web-first and auto-retry.
   - My mitigation covers only specs that import `test` from `support.ts`: it routes the page's `/_next/` WebSocket to nothing, so there is no Fast Refresh channel and no reload. With it, 15/15 passed twice, the sweep dropped from 28s to 11s, and the earlier loop failures disappeared.
   - `workflow.spec.ts` is outside my boundary and still exposed.
   - Suggested root-cause fixes for the controller or a later PR: set Next's browser-log forwarding off in `next.config.ts`, or point `distDir` somewhere the watcher ignores, or use `trace`/`outputDir` outside the project root.
2. **Cold-start time.** The gate waited a long time for memory and the other track's lock. Every run finished in the end; none exited 75.
3. **`.local-notice` and header/footer** still use bootstrap px values and `--line`/`--muted`. That is expected until Task 4.
4. **Skip link at forced colors and RTL** is not tested here. It uses logical inset properties and the shared button rule, which keeps its `1px solid transparent` border.
5. `python` launched from Git Bash started failing with "Permission denied" late in the task (the Windows Apps stub). I finished the remaining edits with the Edit tool and `sed`. No effect on the result.

---

# Fix round 1 (review verdict "Needs fixes", I1 plus M1, M2, M4, M5)

Commit `0eef01d fix: harden the raw-color guard and give radios Blend rows` (new commit on top of `0693584`, not pushed). Files: `src/app/globals.css`, `tests/browser/design-system.spec.ts`, `tests/browser/support.ts`. M3 (dead `hero` class in `page.tsx`) and M6 (dev notice, Task 4) were not touched, as instructed.

## What changed

- **I1, raw-color guard.** `withoutTokenBlocks(css)` now removes only rules whose whole selector is `:root`, using `/(?<=^|\})\s*:root\s*\{[^}]*\}/g`. The lookbehind does not consume the preceding `}`, so back-to-back `:root` blocks are both stripped (a plain `(^|\})` capture would have skipped the second one). A `:root` inside `@media` or a longer selector is not stripped, so it is checked.
  - Detection widened to `/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/i`. It is clean against the current CSS.
  - Negative controls in the same test: `html:root{color:#fff}`, `.a, :root{color:rgb(0,0,0)}`, `.x :root{color:hsl(0 0% 0%)}` and `a{}:root,.b{color:#000}` must all be matched. Two exact `:root` blocks in a row must be stripped to nothing.
  - Old guard against the same inputs (run in Node before the change): it missed the first three and caught only the fourth. The new helper catches all four.
- **M1 / DS-7, radios.** `label:has(> input:is([type=checkbox],[type=radio]))` and `input:is([type=checkbox],[type=radio])`. Specificity is unchanged (`:is` takes its most specific argument, (0,1,0)). The field group still excludes radios, so a radio gets no field box.
  - Test, in the controls test on `/admin`: a `<fieldset><legend>Test</legend><label><input type="radio" name="t"> Option</label></fieldset>` is appended to `main` with `page.evaluate` (built with DOM methods, not `innerHTML`). Asserts the label is at least 44px tall and the radio's `accent-color` is `rgb(23, 89, 107)`.
- **M5, forced colors.** In the forced-colors test, after `emulateMedia({ forcedColors: 'active' })`: `focusByKeyboard` on "Enter as Admin", then `ring()` must `toMatchObject({ style: 'solid', width: '3px' })` (the color becomes a system color, so only the shape is asserted). Then `enterAs(page, 'Admin')` and textbox "Resource name" must have `border-top-style: solid`. Both already held, so they are regression guards.
- **M2, `.error::before` under forced colors. Confirmed, and fixed.** Probe: inject `<p class="error">` into `main` on `/sign-in`, `forcedColors: 'active'`, compare `getComputedStyle(el, '::before').backgroundColor` with the body background. On the old CSS they were both `rgb(255, 255, 255)`: the glyph was painted in the page color, so it was invisible. Added `@media (forced-colors: active) { .error::before { background-color:CanvasText; } }` (a system color, allowed). New test "the error glyph is not painted in the page background under forced colors" asserts the glyph color differs from the page color.
- **M4, comment hygiene.** The `test` fixture comment in `support.ts` now says that new specs import `test` from `./support` until the loop is fixed, and that the override is removed when the dev-log reload loop is fixed (the DS-6 root-cause PR). It also notes `workflow.spec.ts` still uses Playwright's own `test`.

## TDD evidence

RED (CSS unchanged, new tests in place; `...\scratchpad\fix-red.txt`), gate command `test-gate.ps1 -Owner design-T3 test:e2e tests/browser/design-system.spec.ts`:

```
✘  8 controls follow the Blend button and field specs
     Error: radio label height   Expected: >= 44   Received: 24
✘ 11 the error glyph is not painted in the page background under forced colors
     Error: glyph against the page color rgb(255, 255, 255)   Expected: not "rgb(255, 255, 255)"
✓  1-7, 9, 10, 12 (the focus-ring and textbox forced-colors assertions and the hardened raw-color test already pass)
2 failed, 10 passed
```

GREEN, same command, after the CSS change: 12 passed (36.4s).

Full gate: `test:e2e` through `test-gate.ps1 -Owner design-T3`: 16 passed (45.8s): 12 design-system, 4 workflow. `lint` exit 0. `typecheck` exit 0.

## Notes

- The reload loop (Concern 1 above) did not occur in these runs.
- Radios are now 20px square with the teal accent and a 44px flex row, so slice 2's `source_type` radio fieldset is styled like the category checkboxes without any markup change. The fieldset's own column grid (`minmax(min(100%, 12rem), 1fr)`) applies to radio labels the same way.
