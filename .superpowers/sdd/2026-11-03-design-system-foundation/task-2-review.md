# Task 2 review: Self-hosted Figtree (61d4097..ed5e552)

## Spec Compliance: ✅

Every item in the brief is present and matches. I read the diff once and made one focused check per named risk; I did not re-run tests or git.

- `package.json`: `"@fontsource/figtree": "5.3.0"` in `dependencies`. `pnpm-lock.yaml` adds only the one package (8 lines), with specifier `5.3.0`. ✅
- `layout.tsx`: the four imports (`latin-400`, `latin-600`, `latin-700`, `latin-800`) sit directly above `import './globals.css'`. No 500, no `next/font/google`, no Google URL. ✅
- `globals.css`: the only change is `body { font-family: var(--font-family-base) }`. ✅
- `ARCHITECTURE.md`: the dependency row and the replacement sentence are verbatim from the brief. No stale "system fonts" statement remains in `docs/`. ✅
- `support.ts`: `enterAs(page, identity)` has the briefed signature and behavior (goto `/sign-in`, click the button named exactly `Enter as ${identity}`, wait until the URL leaves `/sign-in`). ✅
- `design-system.spec.ts`: both tests have the briefed names, and every bulleted assertion is covered:
  - faces sorted `['400','600','700','800']`
  - display `swap`
  - style `normal`
  - the 400 face is `loaded`
  - the body font-family matches `/^["']?Figtree["']?,/`
  - no Google host
  - every woff and woff2 request has origin `http://127.0.0.1:3100`
  - at least one `.woff2` requested
  - the fallback test uses the briefed route regex and h1 visibility check ✅

### Named risks

1. **Subsets and weights (checked `node_modules/@fontsource/figtree`, `.next/static`).**
   - Each `latin-{400,600,700,800}.css` contains exactly one `@font-face`: family Figtree, style normal, `font-display: swap`, the matching weight. It references only `files/figtree-latin-<w>-normal.woff2` and `.woff`.
   - There is no latin-ext, cyrillic or vietnamese file and no 500 face.
   - The package `exports` map resolves `./latin-400.css` through `./*.css`.
   - The latest build output has 4 `@font-face` rules and 8 files in `.next/static/media` (4 woff2 and 4 woff fallbacks). Their sizes match the report's table byte for byte.
   - `.next/static` has no `fonts.googleapis` or `fonts.gstatic` reference, and `src/` has none either.
   - The `latin` range in the package's `unicode.json` is U+0000-00FF plus U+2000-206F, the euro sign and others. That covers Spanish accents, ñ, ¿, ¡ and typographic punctuation, so Latin-only is sufficient for the bilingual shell.
2. **Pin (checked `package.json`, `.npmrc`, the installed package).**
   - The version is exactly `5.3.0`.
   - `package.json` has no `^` or `~` anywhere, so it is consistent with the other pins.
   - `.npmrc` has `save-exact=true`.
   - The installed package is 5.3.0 with license `OFL-1.1`.
3. **Token and font-family consistency (checked `globals.css` and `DESIGN_SYSTEM.md`).**
   - `--font-family-base` (`globals.css:27`) is `'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. That is verbatim `DESIGN_SYSTEM.md:89` and the spec's `blendTokens`.
   - The diff touches only the `body` rule (`globals.css:75`) and leaves the Task 1 token block alone, so there is no conflict.
   - The font imports precede `./globals.css` as briefed.

### Is the RED/GREEN evidence acceptable? Yes, with one caveat

- The RED failures are the intended ones: `/ faces expected ['400','600','700','800'], received []`, and body font `Arial, Helvetica, sans-serif` against the Figtree pattern.
- The RED output cites `design-system.spec.ts:161` and `:193`. Counting from the diff hunk (`@@ +147`), the new tests start at exactly lines 161 and 193. So the RED run used this exact spec file.
- The manual server ran `scripts/dev.ts --test`, the same command as the `webServer` in `playwright.config.ts`. The four Task 1 tests passed alongside, which is consistent with an unchanged base.
- RED has to show that the assertions fail for the right reason without the implementation. The warm server and scratch config do not weaken that.
- GREEN used the official command (6 of 6), and a full gated run passed 10 of 10. My `.next/static/media` check backs up the build claim.
- The caveat is that the scratch config and the pre-implementation state are not in the repo. The brief prescribes a single commit, so RED cannot be reproduced from history. This is a process note, not a code defect.
- Nothing in the code depends on the machine problems the report describes (out-of-memory crashes in vitest and PGlite).

## Strengths

- The change is minimal and in scope: about 8 authored non-test lines, with nothing outside the file boundary.
- Assertions are strong where it matters. The weights, display and style are checked per page, along with the origin of every font file and the absence of Google hosts across the whole session. The check for a `.woff2` request means the test cannot pass if no font was fetched.
- `enterAs` is a single helper that waits for the redirect to leave `/sign-in`, so the test is not racing the navigation. The report also states that `enterAs` is the single place to update if slice 2 renames the identity buttons.
- Lockfile and `ARCHITECTURE.md` changes follow the repo's pinning and documentation rules (C12/C13).

## Issues

### Critical
None.

### Important
None.

### Minor

1. `tests/browser/design-system.spec.ts:264-273` (plan-mandated). The fallback test is weak.
   - The body's computed `font-family` is the value of `var(--font-family-base)`. It is the Figtree stack whether or not the font files load, so that assertion does not test fallback behavior.
   - The test never asserts that a font request was actually aborted. If the route regex stopped matching, for example after an extension or path change, the test would still pass.
   - Fix: after `goto`, add `expect(requested.some((url) => /\.woff2(\?|$)/.test(new URL(url).pathname + new URL(url).search))).toBe(true)`. Also await `document.fonts.ready` and assert the Figtree 400 face has `status === 'error'`. The brief only requires the weaker form, so this is optional.
2. `src/app/globals.css:81,86,87` (pre-existing, FYI for Task 3). `.brand span`, `h1` and `h2` still use `font-weight:500`.
   - The built CSS contains these three 500s.
   - 500 is correctly not loaded, so the browser picks the 400 face. There is no faux bold, and this is not a regression from Arial.
   - Task 3 should replace them with `--font-weight-*` tokens so headings get the intended 600 or 700.
3. `docs/ARCHITECTURE.md:32`. The new row is a production dependency appended after the dev-only `@playwright/test` row. Cosmetic; no action needed unless the table is meant to list runtime dependencies first.

## What I would run if in doubt

- Once on a quiet machine, run `scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`. This confirms a cold-start pass independent of the manual server.
- A variant of the fallback test with the abort-count and `status === 'error'` assertions from Minor 1. It would prove the abort path is real.

## Assessment

**Task quality: Approved.** The implementation matches the brief item for item, the dependency is exactly pinned, only the four Latin weights are bundled and no third-party font host is referenced. The tokens are consistent with `DESIGN_SYSTEM.md`, and the RED/GREEN evidence is credible despite the machine constraints. The only findings are minor and one is plan-mandated.
