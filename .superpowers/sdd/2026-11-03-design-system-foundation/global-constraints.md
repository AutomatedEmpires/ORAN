## Global Constraints

- **Toolchain:** run every command as `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 <script> [args]` (Node 24.22.2, pnpm 10.34.9). No WSL, Docker or cloud credentials.
- **File boundary (a parallel team is implementing ADR-0006 slice 2):**
  - These PRs change only `src/app/globals.css`, `src/app/layout.tsx`, new files under `src/ui/` and `src/app/dev/`, new files under `tests/browser/`, `docs/ARCHITECTURE.md`, and `package.json`/`pnpm-lock.yaml` for the font dependency.
  - Never edit `src/ui/forms.tsx`, `src/ui/resources.tsx`, `src/ui/en.json`, `src/ui/es.json`, `src/server/*`, `src/proxy.ts`, `src/modules/*`, any other file under `src/app/` (pages, `error.tsx`, `loading.tsx`, `not-found.tsx`), migrations, `tests/catalog.test.ts` or `tests/browser/workflow.spec.ts`.
  - A markup change that a screen needs goes under "Deferred to a later UI PR".
- **Tokens (§3):** names and values verbatim, in px as written, colors in §3.1's hex case.
  - Two groups of approved values have no names in §3, so this plan derives them: `--line-height-{xs,sm,md,lg,xl}` (the §3.3 line heights) and `--layer-{bar,map-overlay,sheet,drawer,dialog,toast}` (the §3.4 layers).
  - The PR A description asks the founder to confirm these 11 names (C21). Recording them in DESIGN_SYSTEM.md is deferred, because this track edits that file only for value changes.
- **No raw values in rules:**
  - Outside the `:root` token block, `globals.css` uses no hex, `rgb()` or `rgba()` colors; only tokens, `transparent`, `currentColor` and system colors.
  - Spacing comes from `--space-*` and sizes from `--size-*`. The only exceptions are the 2px focus offset and icon stroke, 1px hairlines and the 1.5px field border.
  - Allowed layout constants: `65ch`, the `.grid` and `fieldset` column minimums, and the 380px wordmark breakpoint.
- **CSS style:** logical properties only (`margin-inline`, `padding-block`, `inset-inline-start`, `max-inline-size`; §4). Keep the file's one-rule-per-line style.
- **Focus (§3.4):** `:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px }`. No rule removes it.
- **Motion (§3.4):** under `prefers-reduced-motion: reduce`, transitions and animations are off and scrolling is not smooth.
- **Color scheme (§10):** `:root { color-scheme: light }`. No dark theme.
- **Fonts (§3.3, §9, §10):** `@fontsource/figtree` exactly `5.3.0`, imported only as `latin-400.css`, `latin-600.css`, `latin-700.css` and `latin-800.css`. Never weight 500, never `next/font/google`, never a `fonts.googleapis.com` or `fonts.gstatic.com` URL.
- **C2:** navigation stays "Find support / My profile / Organization / Community / Admin". No Seek/Chat/Map/Profile tab bar, SideNav, QuickExit or GetHelpNow until those screens exist. Nothing links to the catalog.
- **C18:** add no seeker-facing string.
  - Primitives take every visible word through props or children; the header reuses existing catalog keys.
  - The catalog's sample text is development-only fixture content inside `lang="en"`, not seeker copy.
- **C12/C13:** the one new route and the one new dependency each get an ARCHITECTURE.md entry in the task that adds them. No new environment variables or feature flags.
- **C10:** shared code is imported only through `@/modules/platform` and `@/ui/*`.
- **Tests:**
  - Browser specs find elements by role, label and text; reading computed styles from elements found that way is fine.
  - axe uses tags `wcag2a`, `wcag2aa` and `wcag21aa` and fails on any `serious` or `critical` violation, as in `workflow.spec.ts`.
  - Files are `tests/browser/*.spec.ts` (Vitest collects only `*.test.ts`). Helpers live in `tests/browser/support.ts`, which Playwright does not run as a spec.
- **C17:** about 400 authored lines per PR, excluding tests and the lockfile. A and B are separate PRs.
- **Parallel track:** rebase on `main` before opening each PR and rerun the full gate. If slice 2 has merged markup with new class names, style them in a follow-up, not by widening this PR.
- **Commits:** stage files by name. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and every PR description with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

1. **Spanish on a 320–360px phone.** "Administración", "Idioma" and "Cerrar sesión" must wrap inside the header with no horizontal scrolling, and every header control stays reachable. Test: Task 4, "Spanish header reflows at 320 and 360 pixels".
2. **Keyboard focus.** The 3px teal ring with its 2px offset must show on teal-filled buttons, fields, the skip link and header links. Tests: Task 3, "keyboard focus shows the Blend focus ring"; Task 6, focus on the filled variants.
3. **Windows High Contrast (forced colors).** It drops shadows and backgrounds, so buttons, nav items and cards need a real transparent border to keep visible edges. Tests: Task 3, the forced-colors assertions; Task 5, the card boundary.
4. **Long unbroken user text.** A resource name or URL with no spaces inside a card at 320px must wrap, not widen the page. Test: Task 5, the long-text card at 320px.
5. **Fonts slow or failing.** Text must render at once in the fallback stack (`swap`), and nothing may be requested from Google or any other third-party host. Tests: Task 2.

