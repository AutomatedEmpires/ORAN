# Task 2 report: Self-hosted Figtree

Status: DONE_WITH_CONCERNS (concerns are about the machine, not the code)
Commit: `ed5e552` "feat: self-host Figtree in four Latin weights" on `claude/design-system-a-foundation` (on top of `61d4097`). Not pushed.

## What was implemented

- `package.json` / `pnpm-lock.yaml`: `@fontsource/figtree` added with `scripts\run.ps1 add @fontsource/figtree@5.3.0` (pnpm 10.34.9 from the helper). `.npmrc` `save-exact` wrote `"@fontsource/figtree": "5.3.0"`. The lockfile diff is the single package (8 lines), not hand-edited. The package license field is `OFL-1.1`.
- `src/app/layout.tsx`: four imports directly above `import './globals.css'`: `@fontsource/figtree/latin-400.css`, `latin-600.css`, `latin-700.css`, `latin-800.css`. No 500 weight, no `next/font/google`, no Google URL anywhere.
- `src/app/globals.css`: in `body`, only `font-family` changed, from `Arial,Helvetica,sans-serif` to `var(--font-family-base)`.
- `docs/ARCHITECTURE.md`: the dependency row for `@fontsource/figtree` added verbatim, and "System fonts avoid build-time font downloads." replaced with the approved sentence about the pinned package, Latin, four weights, `font-display: swap`.
- `tests/browser/support.ts`: new `enterAs(page, identity)`. It goes to `/sign-in`, clicks the button named exactly `Enter as ${identity}`, then `waitForURL` until the URL no longer contains `/sign-in`.
- `tests/browser/design-system.spec.ts`: two new tests (exact names from the brief).
  - `seeker pages load self-hosted Figtree and never contact Google Fonts`: visits `/`, `/sign-in` and, via `enterAs(page, 'My profile')`, `/profile`. On each page it checks the Figtree faces' sorted weights equal `['400','600','700','800']`, display is `swap`, style is `normal`, the 400 face is `loaded`, and the body font-family matches `/^["']?Figtree["']?,/`. Across the whole test it checks no recorded URL matches `fonts.(googleapis|gstatic).com`, every `.woff`/`.woff2` URL has origin `http://127.0.0.1:3100`, and at least one `.woff2` was requested.
  - `text renders in the fallback stack when font files fail`: aborts `/\.woff2?(\?.*)?$/`, then loads `/`. The h1 is visible, the body font-family still matches the Figtree stack, and nothing went to a Google host.

## TDD evidence

RED (before any implementation; only the helper and tests existed). The official `test:e2e` could not start its web server in time on this loaded machine (see concerns), so RED was run against a warm manual copy of the same dev server (`node --import tsx scripts/dev.ts --test`) with a scratch Playwright config outside the repo, same specs and same browser:

```
2 failed
  design-system.spec.ts:161 seeker pages load self-hosted Figtree ...
     Error: / faces   expected ['400','600','700','800'], received []
  design-system.spec.ts:193 text renders in the fallback stack when font files fail
     Expected /^["']?Figtree["']?,/   Received "Arial, Helvetica, sans-serif"
4 passed (the four Task 1 token tests)
```

The manual server was then stopped (only my own process tree, by PID).

GREEN, with the implementation, official command `scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`: `6 passed (4.1m)`. The long time was the cold server start under load; the font tests took 4.6s and 1.7s.

## Gate results (all on the final tree, commit ed5e552 content)

| Step | Result |
| --- | --- |
| typecheck | pass (exit 0) |
| lint | pass, `--max-warnings 0` (exit 0) |
| test (vitest) | pass, 3 files, 43/43 tests. Two earlier attempts crashed with V8/OS out-of-memory (a worker exiting with code 134, then 0xC0000409); the third attempt passed. No assertion failed in any attempt. |
| build | pass (Next 16.4.4 Turbopack, 9/9 pages) |
| test:e2e (full, via the shared gate `test-gate.ps1 -Owner design-T2`) | pass, 10/10 (6 design-system, 4 workflow). `workflow.spec.ts` "organization staff maintain their own unpublished resources" passed first try (no flake). |

The vitest and build runs happened before the coordinator's gate rule arrived (and are unchanged code afterwards); the final e2e ran through the gate. The gate waited about 2.5 minutes for free memory (18 to 1563 MB free) and started at 2497 MB free.

## Font files actually bundled

`pnpm build` emits to `.next/static/media` (content-hashed names). The fontsource `latin-*.css` lists a `woff` fallback beside each `woff2`, so both formats are emitted. The woff2 files are what browsers fetch (confirmed by the test: at least one `.woff2` requested, none from another origin).

| Weight | woff2 | woff |
| --- | --- | --- |
| 400 | 11,384 B | 15,036 B |
| 600 | 11,544 B | 15,212 B |
| 700 | 11,376 B | 15,164 B |
| 800 | 11,392 B | 15,176 B |
| total | 45,696 B | 60,588 B |

The built CSS has exactly four `@font-face` rules: `font-family: Figtree`, `font-style: normal`, `font-display: swap`, weights 400, 600, 700, 800, no `unicode-range` (Latin files). A grep of `.next/static` and `.next/server` for `fonts.googleapis`/`fonts.gstatic` found nothing.

## Files changed (7)

`package.json`, `pnpm-lock.yaml`, `src/app/layout.tsx`, `src/app/globals.css`, `docs/ARCHITECTURE.md`, `tests/browser/support.ts`, `tests/browser/design-system.spec.ts`. Nothing outside the file boundary, nothing under `.superpowers/` except this report. Authored non-test lines: about 8 (4 imports, 1 CSS edit, 1 table row, 1 sentence edit, plus package.json).

## Concerns

1. Machine memory, not code. The machine had roughly 20 to 500 MB free for most of this task because of many other dev servers and test runs. Symptoms I hit on unmodified code paths: the Playwright web server timing out at 120s on cold start (twice, first compile is slow, "Slow filesystem detected" 846 ms), then `Fatal process out of memory: Zone` or `WebAssembly.Memory(): could not allocate memory` in `scripts/dev.ts`/PGlite (four times), and vitest worker crashes (twice). All passed on retry or through the gate. I never killed another team's process; the only processes I stopped were my own manual dev server (by PID) and my own ungated retry loop (via TaskStop) after the gate rule arrived.
2. RED evidence came from a warm manual server plus a scratch config (not the official command) for the reason above. The specs, browser and server code were identical.
3. `body { font-family: var(--font-family-base) }` is the only `globals.css` change, as briefed. The file still has older raw values and `#95641b` focus colors outside the token block; those belong to Task 3 and were deliberately not touched.
4. The tests depend on the local-dev identity buttons (`Enter as My profile`) staying on `/sign-in`; if slice 2 renames them, `enterAs` is the single place to update.
