# Task 1 report: Blend tokens as CSS custom properties

Status: DONE_WITH_CONCERNS (two deviations from the brief, both explained below; no blockers)

Branch `claude/design-system-a-foundation`, worktree `...\.claude\worktrees\design-foundation`.
Commit: `61d4097 feat: add the Blend design tokens as CSS custom properties` (not pushed).

## What was implemented

1. `src/app/globals.css`: a second `:root` block after line 1 (the bootstrap block and every other rule are untouched; 72 lines added, 0 removed).
   - `color-scheme: light`.
   - The 23 §3.1 colors copied verbatim, including hex case.
   - All non-color tokens from the brief (font family and weights, 5 font sizes, 5 line heights, 8 spacings, 7 sizes, 5 radii, 2 shadows, 3 motion values, 6 layers), one per line.
2. `docs/DESIGN_SYSTEM.md` (ruling DS-1), values unchanged:
   - §3.3: the five table rows now read `--font-size-xs` / `--line-height-xs` ... `--font-size-xl` / `--line-height-xl`, next to the "12 / 16px" style values they name.
   - §3.4 Layers: `bars --layer-bar 10, map overlays --layer-map-overlay 20, sheet --layer-sheet 30, drawer and scrim --layer-drawer 40, dialog --layer-dialog 50, toast --layer-toast 60`.
3. `tests/browser/support.ts`: `designSystemSection`, `documentedColors`, `documentedTokenNames`, `readTokens`, `normalized`, `contrast` as specified, plus one extra helper `resolveAs` (see deviations).
4. `tests/browser/design-system.spec.ts`: four tests.
   - `implements every DESIGN_SYSTEM §3 token with its exact value`.
   - `writes every approved token verbatim in the globals.css token block` (added).
   - `implemented colors keep the DESIGN_SYSTEM §3.2 contrast ratios`.
   - `forces the light color scheme`.
   - No count is hard-coded except the brief's own `documentedColors().size === 23`. Token names come from `documentedTokenNames()`.

## TDD evidence

- RED (tests written, no doc edit, no CSS): 3 of 3 failed.
  - Token test: the expected keys not documented (the 11 derived names) and `--color-bg` reading `''`.
  - Contrast test: `Expected a #RRGGBB color, got ""`.
  - Light scheme test: received `"normal"`, expected `"light"`.
- GREEN: after the doc edit and CSS, the first run showed 2 failures that were test-side, not CSS-side (see deviation 1). After fixing the helpers, all 4 pass.

## Gate results

| Check | Result |
|---|---|
| typecheck | pass |
| lint | pass (`--max-warnings 0`) |
| test (Vitest) | pass: 3 files, 43 tests |
| build | pass |
| test:e2e | pass on the second full run: 8 of 8 (4 new + 4 existing). First full run: 7 of 8, see concerns. |

## Deviations and concerns

1. **Next's CSS pipeline re-serializes some values (the brief did not anticipate this).**
   - The app is served through Turbopack and lightningcss (`next dev` in test mode), which rewrites equivalent spellings: `#FFFFFF` becomes `#fff`, `rgba(28, 39, 51, 0.45)` becomes `#1c273373`, the shadows' `rgba()` become 8-digit hex, `120ms` becomes `.12s`.
   - A strict `normalized()` comparison therefore fails for `--color-surface`, `--color-on-primary`, `--color-scrim`, `--shadow-1`, `--shadow-2`, `--motion-fast`, `--motion-base`, and `contrast()` receives `#fff`.
   - Fixes, all inside `tests/browser/`:
     - `contrast()` expands `#RGB` to `#RRGGBB`.
     - `normalized()` keeps exactly the specified behavior. When the normalized strings differ, the token test falls back to `resolveAs(page, property, [served, approved])`. It compares what the browser computes for `color`, `boxShadow` or `transitionDuration`, and a value the browser rejects never counts as equal.
     - The extra test `writes every approved token verbatim in the globals.css token block` checks the source text of `globals.css` line by line, because the served CSS can no longer prove "verbatim" or hex case.
   - Nothing in the shipped CSS differs from the brief. Later tasks that read tokens from the page should expect these spellings (`#fff`, `.12s`, and so on).
2. **Brief assertion changed because of DS-1.**
   - The brief says the keys of `expected` that are not in `documentedTokenNames()` equal `derivedTokens`. After the doc edit that difference is empty, since the 11 names are now documented.
   - The test now asserts that the documented set and the implemented set match in both directions, that every `derivedTokens` entry is documented, and that every one is defined in `blendTokens`.
3. **One unrelated e2e failure on the first full run.**
   - `workflow.spec.ts` › "organization staff maintain their own unpublished resources" failed once: the heading "Edit resource" did not appear within the 5s expect timeout. The captured page shows `Loading…`, which is the first dev-mode compile of `/resources/[id]/edit`.
   - The second full run passed (that test took 11.8s). The cause is dev-mode compile slowness under load, not the CSS; the run immediately before it did a production build. I did not change that spec (outside the file boundary). It may be flaky on loaded machines.
4. Line endings: the new test files are LF like `workflow.spec.ts`. I fixed an accidental CRLF conversion from a helper script before committing.
5. No port 3100 conflicts occurred. `test-results/` is git-ignored.

## Files changed (commit 61d4097)

- `src/app/globals.css` (+72)
- `docs/DESIGN_SYSTEM.md` (+6 / -6, DS-1 exception)
- `tests/browser/support.ts` (new)
- `tests/browser/design-system.spec.ts` (new)

## Self-review notes

- The CSS diff is additions only. No hex, `rgb()` or `rgba()` appears outside the `:root` token blocks.
- The doc diff changes no values. It only adds the names `--line-height-*` and `--layer-*`.
- Authored lines are about 78 outside tests, well under the C17 budget.
- The bootstrap `:root` keeps `--accent`, `--ink` and the rest. The new names (`--color-*` and so on) do not collide with them.
