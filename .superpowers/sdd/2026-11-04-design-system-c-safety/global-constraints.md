## Global Constraints

- **Commands:** run from the worktree root in native Windows PowerShell. Never use Git Bash, WSL or Docker.
  - `run <script> [args]` is shorthand for `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 <script> [args]`. Use it for `typecheck` and `lint`.
  - `gate <script> [args]` is shorthand for `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Cole0\AutomatedEmpires\Projects\oran\.local\test-gate.ps1 -Owner design-c <script> [args]`. Every `test`, `test:e2e` and `build` run goes through the gate, because machine memory is tight.
    - Pass the script and its arguments directly, with no bare `--`.
    - Exit code 75 means the gate gave up waiting. Report it and rerun once; do not loop.
- **Worktree and branch:**
  - Work in `C:\Users\Cole0\AutomatedEmpires\Projects\oran\.claude\worktrees\design-foundation`.
  - The branch is `claude/design-system-c-safety`, created from `origin/main` after PR #18 merges.
  - Never push to `main`.
- **File boundary:**
  - Do not edit `src/ui/forms.tsx` (slice 2c owns it).
  - Change only the files listed in each task.
  - Never edit `src/ui/resources.tsx`, `src/server/*`, `src/modules/*`, `src/proxy.ts`, `next.config.ts`, migrations, `tests/browser/workflow.spec.ts`, or the admin, community, organization and edit pages. Slices 2c to 5 own those.
- **Parallel tracks:**
  - Rebase on `main` before the PR.
  - Slice 2c also appends EN/ES strings; that merge is trivial.
  - If slice 3 is on `main` and `src/ui/listing-text.ts` exports `Messages`, import that type instead of declaring one.
  - Task 3 publishes a listing exactly the way `main`'s `workflow.spec.ts` does when the task starts.
- **Spec values, verbatim:**
  - Destination: `https://www.weather.gov`, through `location.replace` (no new history entry), at once, with no confirmation.
  - Shortcut: Esc pressed twice within one second. The comparison is inclusive: 1000 ms leaves, 1001 ms does not. A single Esc still reaches dialogs and fields.
  - Exit link: visible text "Exit", accessible name "Quick exit to a neutral website".
  - Exit look: `--color-surface-neutral` background, `--color-text`, sm/700, 44px tall.
  - Exit categories, by code: `safety` and `housing_shelter`.
  - "Get help now" never appears in a TopBar, and no crisis card appears on results or searches (ADR-0007 §2).
  - The panel lists 988, 911, the domestic violence hotline (`1-800-799-7233`) and 211, in that order (§5.6).
- **Copy (C18):**
  - Every new string goes in both `src/ui/en.json` and `src/ui/es.json`, with identical key sets.
  - The Spanish strings are drafts that need native-speaker review; say so in the PR.
  - The English strings "Exit", "Quick exit to a neutral website" and "Get help now" come from §7.
  - The panel lines and "Call {phone}" are drafted here, because §11 lists the panel copy as not designed. Task 4 records them in §7.
- **Neutral titles and URLs (§5.6):** no category code or name appears in any `<title>`, URL or query string. Add no search parameters.
- **No new dependency, environment variable, route or feature flag (C13).** The icons are hand-drawn inline SVG, because §11 leaves the icon library open.
- **CSS (PR A rules):**
  - tokens only, with no raw colors outside `:root`;
  - logical properties;
  - one rule per line;
  - add no transition or animation; `<details>` opens and closes instantly;
  - leave the focus ring rule untouched.
- **Tests:**
  - Browser specs find elements by role, label and text. Find `summary` with `locator('summary', { hasText })`, because it has no ARIA role.
  - axe uses tags `wcag2a`, `wcag2aa` and `wcag21aa` and fails on serious or critical violations (`accessible`).
  - In `tests/browser/safety.spec.ts`, every test routes `/^https:\/\/www\.weather\.gov\//` to a local fulfilment (Task 1's `neutralSite`), so no run contacts the real host.
  - Markup tests that import JSON catalogs run in Vitest (`tests/safety-ui.test.ts`), not in Playwright.
- **C17:** about 400 authored lines per PR, excluding tests. The budget for this PR is about 200.
- **Commits:**
  - Stage files by name.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit with `git commit -m "<subject>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  - End the PR description with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

1. **Client-side navigation away from a Safety page.** Exit must disappear, and Esc twice must do nothing on the new page. Test: Task 3, step 3 of "Exit follows the saved Safety and Housing & shelter needs".
2. **A slow or failing network after Exit.** ORAN's content must vanish at once, not stay on screen until weather.gov answers. Tests: Task 1, "clicking Exit replaces the page and hides it at once"; Task 2, "two Esc presses within one second replace the page at once" (the body is hidden when the request arrives).
3. **A held-down Esc key that auto-repeats.** One held key is one press and must not leave. Test: Task 2, "a held Esc key is one press".
4. **Telling weather.gov where the visitor came from.** No `Referer` header may be sent, by click, by keys or without JavaScript. Tests: Tasks 1 and 2 (`referer` is undefined on every visit).
5. **Focus inside a text field.** Esc twice still leaves. The first Esc may clear the field, but it still counts. Test: Task 2, "Esc twice leaves while a text field has focus".

---

