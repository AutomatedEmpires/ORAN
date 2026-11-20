# Task 5 report: guarded /dev/components route (design-system PR B)

Branch `claude/design-system-b-catalog`, worktree `design-foundation`. Not pushed, no PR opened (Ruling DS-8).

Status: DONE_WITH_CONCERNS. See "Concerns".

## Commits

| SHA | Subject |
|---|---|
| e244654 | test: run browser specs against hydrated pages |
| 563a3d1 | feat: add a local-only component catalog route |

Both end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Step 0 (Ruling DS-11): outcome

- `tests/browser/support.ts`: `test` is Playwright's own `test` again (`export { test }`). The `routeWebSocket(/\/_next\//)` override, `hydratedTest` and the old comment are gone. The new comment says why.
- `tests/browser/design-system.spec.ts`: the one `hydratedTest` user ("controls follow the Blend button and field specs") now uses `test`, and its "Uses the hydrated `test`" comment is removed. No other spec referenced either name (`grep hydratedTest|routeWebSocket` is empty).
- Gated full `test:e2e` without the override: **23 passed (1.8m)**, the 17 design-system specs and 6 workflow specs, all hydrated. No reload loop, no spec change needed. In particular:
  - "controls follow the Blend button and field specs" (a radio click that needs React state) passes, so pages hydrate;
  - the axe/reflow test ("existing pages pass axe and reflow at phone and desktop widths") passes on hydrated pages, so there was no need for `.exclude('nextjs-portal')`;
  - the dev "N" badge and the `loading.tsx` shell caused no failures.
- Committed on its own as e244654.

Note: my first attempt launched the gate from Git Bash, which started an x64 PowerShell. `run.ps1` then began downloading an x64 Node into the worktree's `.local`. I stopped it, deleted the partial `node-v24.22.2-win-x64.zip` and my own orphaned gate lock (owner `design-T5`), and re-ran from the native ARM64 PowerShell tool. No other process was touched.

## What was implemented (563a3d1)

- `src/app/dev/guard.ts`: `catalogAllowed(env, host)`.
  - Everything sits inside one `try`, and any exception returns false.
  - `ORAN_LOCAL_DEV !== '1'`, `NODE_ENV === 'production'` or `VERCEL` set returns false before `config()` is asked.
  - `config(env)` must return without throwing, with `local === true` and `stage === 'development'`.
  - The host must match `^(127.0.0.1|localhost|[::1])(:port)?$` and then parse with `new URL('http://' + host).hostname` to a loopback name. Empty and null hosts are denied.
- `src/app/dev/components/page.tsx`:
  - first line is the brief's authorization comment;
  - `dynamic = 'force-dynamic'`;
  - starts with `if (!catalogAllowed(process.env, (await headers()).get('host'))) notFound();`;
  - imports only `next`, `next/headers`, `next/navigation` and `../guard`, and no identity, profile or catalog module;
  - content follows the brief: h1, the dev-only note, then the four h2 sections in order (23 color swatches in §3.1 table order, 5 size steps and 4 weights, the form, the surfaces). All strings are the brief's. The lede, card paragraph and notice texts were unspecified, so they are short dev-only fixture sentences inside `lang="en"`.
- `src/app/globals.css`: `.catalog-swatches` (grid, gap `--space-3`, no list marker), `li` (flex) and `.catalog-swatch` (inline-block, `--space-7` square, `1px solid var(--color-border)`, `--radius-badge`). Only tokens are used.
- `docs/ARCHITECTURE.md`: the brief's sentence, as a new paragraph under "Identity and route contract".
- `tests/browser/component-catalog.spec.ts`: the four specs from the brief, plus one `noindex` assertion on the robots meta.

About 135 authored lines excluding tests, so C17 is met.

## Tests and results

| Command (through the gate) | Result |
|---|---|
| `typecheck` | exit 0 |
| `lint` | exit 0 |
| `test` (vitest) | 5 files, 60 tests passed (run before the `generateMetadata` change; no test touches it) |
| `build` | exit 0, run after the final code; `/dev/components` is `ƒ` (dynamic) |
| `test:e2e` full | 27 passed (1.6m): 4 catalog, 17 design-system, 6 workflow |

The first full run of the finished code had one failure: `workflow.spec.ts:72` "organization staff maintain their own unpublished resources" (14.5s). After clicking "Edit resource", the page was still on `/organization` when the 5s expect timed out. This is a cold-compile timing flake of `/resources/[id]/edit`, with the machine loaded by another track. The spec passed in Step 0 and passed again (5.9s) in the next full run, and nothing in my change touches that route. The final run is clean.

## TDD evidence

- RED 1: `test:e2e tests/browser/component-catalog.spec.ts` before any source existed. Result: `Error: Cannot find module '...\src\app\dev\guard' imported from ...component-catalog.spec.ts`, then `Error: No tests found`. Exit 1.
- RED 2: with only `guard.ts` added:
  - guard spec passed (it was written together with the guard);
  - `catalog renders tokens and base styles accessibly at every width` FAILED with `Expected: 200, Received: 404`;
  - `cards keep visible boundaries under forced colors` FAILED with `getByRole('article', { name: 'Synthetic food pantry' })` not found;
  - `the catalog is not linked from the app` passed, as a regression guard.
  - `2 failed`.
- GREEN: the same command after the page, CSS and doc: `4 passed (40.0s)`. The final full run is 27 passed.
- Negative control: I removed `overflow-wrap:anywhere` from `.card` and re-ran. The reflow assertion at 320px failed (`Expected: true, Received: false` at `fitsWidth`), so that assertion covers the long card. I then restored the file from a backup; the diff shows only my 3 CSS lines.

## Files changed

- `src/app/dev/guard.ts` (new)
- `src/app/dev/components/page.tsx` (new)
- `src/app/globals.css`
- `docs/ARCHITECTURE.md`
- `tests/browser/component-catalog.spec.ts` (new)
- `tests/browser/support.ts`, `tests/browser/design-system.spec.ts` (Step 0)

## Decisions

1. **`generateMetadata` replaces the static `metadata` export.**
   - The brief says to export `metadata: Metadata = { title: 'Component catalog', robots: { index: false, follow: false } }`.
   - I checked this against a production build served with `next start`, `NODE_ENV=production` and no `ORAN_LOCAL_DEV`. With a static export, a denied request still returned `<title>Component catalog</title>` and `noindex, nofollow`. Next renders page metadata even when the page then calls `notFound()`, which tells a visitor the route exists.
   - `generateMetadata` runs the same guard. Allowed requests get the title and `noindex, nofollow`. Denied requests get `{}`, so they carry Next's own `noindex` and the title `ORAN`.
   - Re-checked: the denied `/dev/components` and `/no-such-route` responses are identical apart from the status, with no catalog text. The allowed page still has `noindex, nofollow`; the spec asserts it.
   - I stopped that server by PID.
2. **Stricter host check.** The brief says to compare `new URL('http://' + host).hostname`. That alone would accept a Host such as `evil.example@127.0.0.1`, because the URL parser reads it as userinfo. I added a shape regex (loopback name plus optional port, nothing else) in front of the URL check. All the brief's host cases behave as specified.
3. **Forced-colors card assertion changed.** The brief asks for a `box-shadow` other than `none` under forced colors. Chromium and Edge compute `box-shadow: none` in forced colors (the first run failed on exactly that line). The spec still asserts the shadow normally. Under forced colors it now asserts border-top `1px solid` and that the computed border color differs from the transparent author color, which is what makes the edge visible. The shadow-based check cannot hold, which is why the transparent border exists.
4. **Color names are hard-coded in the page.** The page may import only `next/*`, the guard and `@/ui/*`, so it cannot read DESIGN_SYSTEM.md. The spec compares the list with `documentedColors()` in order, so drift fails the test.
5. **No `role="list"`, no submit button, no `type="url"`:** the brief names none of them. The Website field is a plain text input so a browser cannot add its own validation to the invalid-state sample.

## Self-review

- Guard: all five conditions are required. Any exception (invalid `ORAN_ENV`, a missing or non-loopback `DATABASE_URL`, an unparsable host) returns false. Production and Vercel are refused before `config()`. The unit spec covers the brief's env and host tables.
- The page reads no identity, profile or catalog data: no `@/server`, `@/modules` or `@/ui` import, and no database call. The root layout's existing header and local-identity notice still render, as on every page; they are not part of the page.
- `robots`: `noindex, nofollow` when allowed; Next's `noindex` when denied.
- Strings: every string in the brief was checked against the page and spec.
- C2: the catalog is not linked, and the spec checks that "Main navigation" still has five links on `/` and `/sign-in`.

## Concerns

1. **A denied request returns HTTP 200 with the not-found page, not 404.** The root `src/app/loading.tsx` makes Next stream a shell before the page's `await headers()` resolves, so `notFound()` runs after the status is sent (Next docs, not-found.md: "After streaming starts, the status code remains 200"). In the production check, `/dev/components` returned 200 and `/no-such-route` returned 404; the bodies match. Nothing about the catalog leaks, and Next adds `noindex`, but the status code distinguishes the route. A real 404 would need a change outside this PR's file boundary, such as `src/proxy.ts` or the root `loading.tsx`. In local mode `proxy.ts` already returns 404 to non-loopback hosts. This is for the controller to decide.
2. **A timing flake exists in `workflow.spec.ts:72`** (details above). It is unrelated to this change and cleared on re-run. It may recur on a loaded machine because the route compiles on first visit.
3. **The gate must be started from native ARM64 PowerShell,** not Git Bash, or `run.ps1` downloads an x64 Node.
4. The `vitest` run predates the `generateMetadata` change, which no unit test touches. Typecheck, lint, build and the full e2e were run after it.
