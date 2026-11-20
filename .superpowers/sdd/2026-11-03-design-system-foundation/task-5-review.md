# Task 5 review: guarded /dev/components route (design-system PR B)

Scope: diff 850eaba..563a3d1 (two commits), read once. Read-only. No tests were run (memory). I read `src/modules/platform/index.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/loading.tsx`, `globals.css`, `playwright.config.ts` and the support helpers to check the diff against its surroundings.

## Spec Compliance

**Verdict: ✅ Spec compliant.** The deviations are justified, and I found no missing or extra requirement.

Brief items checked against the diff:
- Files: exactly the brief's set, plus the Step 0 files (`support.ts`, `design-system.spec.ts`). Nothing outside the file boundary is touched (`workflow.spec.ts`, `src/server/*`, `src/ui/*` and the other pages are untouched).
- Guard: all five conditions are required and everything sits in one `try`, so any exception returns false (see risk 1 below).
- Page:
  - The first line is verbatim.
  - `dynamic = 'force-dynamic'`.
  - The first statement is the guard check with `notFound()`.
  - All 23 colors are in §3.1 order. I compared the list with `DESIGN_SYSTEM.md` lines 29-51 and they match one for one.
  - The size labels match the tokens in `globals.css` (12/16, 14/20, 16/24, 18/24, 24/30).
  - The four weights and the four h2 sections are in order.
  - The form, fieldset and surface content match the brief.
  - `lang="en"` and `aria-labelledby` are present.
  - The long-card strings match what the spec's regex expects.
- CSS: `.catalog-swatch` is inline-block, a `--space-7` square, `1px solid var(--color-border)`, `--radius-badge`. The list is a grid with `--space-3` gap. Three lines, one rule per line.
- ARCHITECTURE sentence: verbatim, in "Identity and route contract".
- Strings: the unspecified fixture sentences (lede, card paragraph, notices) are short, development-only, and inside `lang="en"`, so C18 holds.
- Tests: all four brief specs exist, plus a `noindex` assertion. The only change to a brief assertion is the forced-colors one (deviation 3).
- Step 0 is its own commit, `e244654`.

Declared deviations:
1. **`generateMetadata` instead of the static `metadata` export: accepted.**
   - The brief's literal form would put `<title>Component catalog</title>` and `noindex, nofollow` on a denied response, because Next resolves page metadata even when the page then throws `notFound()`. That tells a visitor the route exists.
   - The implementer reports checking this against a production `next start`. I could not re-run it, so the claim is accepted, not verified.
   - The shape is right: the same guard decides, `metadata` is a non-exported const (Next forbids exporting both), and the allowed path still emits the brief's exact object, which the spec asserts.
2. **Host shape regex before the URL check: accepted, and correct.** The brief's URL-only check accepts `evil@127.0.0.1`, because the URL parser treats `evil@` as userinfo and reports hostname `127.0.0.1`. The regex closes that. Every host the brief lists behaves as specified. The regex has no test (Minor 1).
3. **Forced-colors assertion changed from a shadow check to a border check: accepted.** Forced-colors mode computes `box-shadow: none` per CSS Color Adjustment, and the implementer saw that exact line fail. What matters in that mode is the 1px solid border with a system border color, and the spec asserts exactly that: style `solid`, width `1px`, color differs from the normal transparent author color. The normal-mode shadow assertion is kept.

## Named Risks

1. **Guard is deny-by-default and complete: ✅.**
   - Order inside `try`:
     - `ORAN_LOCAL_DEV !== '1'`, `NODE_ENV === 'production'` or truthy `VERCEL` returns false.
     - `config(env)` must not throw, with `local` true and `stage` 'development'.
     - Host must be non-empty and match the regex.
     - `new URL('http://' + host).hostname` must be in the loopback list.
     - Any throw returns false.
   - Probe results, reasoned from the regex and WHATWG URL semantics (not run):

     | Host | Result | Reason |
     |---|---|---|
     | `localhost:3100` | true | regex ok, hostname `localhost` |
     | `[::1]:3100` | true | URL keeps brackets, hostname `[::1]` |
     | `127.0.0.1.evil.com` | false | regex |
     | `evil@127.0.0.1` | false | regex (URL alone would accept it) |
     | `LOCALHOST` | true | `/i` flag, URL lowercases; DNS names are case-insensitive, so this is correct |
     | `null`, `''` | false | `!host` |
     | `127.0.0.2` | false | regex |
     | `localhost:99999` | false | regex passes, URL throws on the port, `catch` returns false |
     | `localhost:` or a trailing-dot name | false | regex |

   - JS `$` has no trailing-newline allowance, so there is no `\n` bypass.
   - **Production with `ORAN_LOCAL_DEV=1` set by mistake is denied three times over:**
     - `NODE_ENV === 'production'` returns false before `config()`.
     - `config()` itself throws for local plus production.
     - `proxy.ts` calls `environment()` first when `ORAN_LOCAL_DEV==='1'`, so every request errors before the page runs.
   - The page passes the whole `process.env` object, not a `process.env.NODE_ENV` literal, so no bundler can inline a build-time value.
   - The spec unit-tests the brief's env table (including `NODE_ENV: 'production'` and `VERCEL: '1'`) and host table.
   - `proxy.ts` independently 404s non-loopback hosts in local mode, so the host check is a second layer.
2. **No data leaks: ✅.**
   - The page imports only `next`, `next/headers`, `next/navigation` and `../guard`. It has no `@/server`, `@/modules` or `@/ui` import and makes no database or session call.
   - `guard.ts` imports `config` only; no `database()` is called, so no pool is opened.
   - The form is a GET to itself with no submit button, and the page never reads `searchParams`, so nothing is echoed.
   - All sample content is fixture text.
   - The layout's header and local-identity notice are existing behavior outside the page.
3. **Override removal is complete: ✅.**
   - `support.ts` is now `export { test }` of Playwright's own `test`. `routeWebSocket` and `hydratedTest` are gone from the diff, and the one `hydratedTest` user was switched to `test`.
   - The diff changes no timeout, no wait, and no `.exclude(...)`. `playwright.config.ts` (60s test timeout) is untouched, so no spec passes only because it was given more time.
   - The retained hydration canary is "controls follow the Blend button and field specs", whose controlled-radio click only works if React hydrated. It now runs as an ordinary `test`.
   - Reported evidence: a full gated run without the override was 23/23, and the later full run was 27/27.
   - Not verified here: the hits for the removed names. My repo grep skips hidden directories, and it found no remaining uses in `src`, `tests` or `docs`.
4. **Strings and accessibility: ✅ (one optional Minor).**
   - Every input has a `label`/`htmlFor` pair, or is wrapped by its label for checkboxes.
   - ZIP uses `aria-describedby` to the "Five digits" hint. Website has `aria-invalid="true"` and `aria-describedby` to the error.
   - The fieldset has a `legend` plus `aria-describedby` to the hint inside it.
   - Swatches are `aria-hidden="true"` and empty, and each name is in `<code>` text.
   - The color `ul` is `aria-labelledby` its h2, and the heading order is h1, h2, h3.
   - The `role="status"` on a `p` is valid.
   - Copy follows the brief.
5. **CSS stays token-only: ✅.**
   - The three new rules use `--space-3`, `--space-7`, `--color-border`, `--radius-badge` and the 1px hairline. The rest is `0`, `none`, `flex`, `grid`.
   - They use logical properties (`inline-size`, `block-size`).
   - The raw-color guard test ("rules use tokens instead of raw colors") scans all of `globals.css` outside exact `:root` blocks, so it covers the new rules.
   - The page's inline styles are `var(--...)` only.

## Strengths

- A deny-by-default guard with several independent layers (`proxy.ts`, `config()`, `NODE_ENV`, `VERCEL`, host shape, URL hostname). The implementer found and closed the userinfo hole that the brief's own formula leaves open.
- The metadata leak was found by testing a production build, not assumed, and fixed without changing what an allowed request returns.
- The long-text card was shown to bite: removing `overflow-wrap:anywhere` made the 320px reflow assertion fail, then it was restored.
- The color list is cross-checked against `DESIGN_SYSTEM.md` in order by the spec, so the page's hard-coded list cannot drift silently. The page cannot read the document itself under C10.
- Step 0 is its own revertable commit. The new `support.ts` comment explains why the override existed and why it is gone.
- The report is honest about its flake, its x64/ARM64 launcher slip, and the unchecked `vitest` timing.

## Issues

### Critical
None.

### Important
None.

### Minor

1. **The host-hardening regex has no test.** `tests/browser/component-catalog.spec.ts:225`. The host list covers the brief's cases (`oran.example`, `127.0.0.1.evil.example`, `''`, `null` and so on). It does not cover `evil@127.0.0.1`, which is the reason the regex exists, nor `127.0.0.2` or `localhost:99999`. Deleting the regex would leave every test green. Fix: add `'evil@127.0.0.1'`, `'127.0.0.2'`, `'localhost:99999'`, `'localhost:'` to the denied list, and `'LOCALHOST:3000'` to the allowed list. Add them as plain array entries, with no new test.
2. **No committed check that a denied request carries no catalog title.** `src/app/dev/components/page.tsx:62`. The `generateMetadata` deviation's key property (a denied request reveals no title or noindex) was checked once by hand. The dev-server browser suite cannot reach it, because a production-mode host is needed. If someone later turns it back into a static `metadata` export, nothing fails. The test I would run: build, start with `NODE_ENV=production` and no `ORAN_LOCAL_DEV`, fetch `/dev/components`, and assert the body has no `Component catalog` and the title matches `/no-such-route`. This could be a one-off pre-merge check noted in the PR text, or a small script. It is not required for this task.
3. **The guard call is written twice.** `page.tsx:63` and `page.tsx:79` repeat `catalogAllowed(process.env, (await headers()).get('host'))`. A small `async function allowed()` in the page file, or in the guard module, would keep the two paths from diverging. The brief mandates the first line of the page body, so keep that call shape if you change this.
4. **Forced-colors assertion is indirect.** `component-catalog.spec.ts:285` asserts `forced.color !== normal.color`. That is sound, because the normal color is transparent, but it never states that the forced color is opaque. A direct `expect(forced.color).not.toBe('rgba(0, 0, 0, 0)')` would say it outright and not depend on the author color staying transparent.
5. **Optional: `list-style:none` can drop list semantics in Safari/VoiceOver.** `globals.css:111` plus `page.tsx:85`. Adding `role="list"` to the swatch `ul` keeps them. It is dev-only and the brief names no role, so skip it unless the catalog is meant to be audited in WebKit.

## Notes

- **DS-12 (HTTP 200 on a denied request):** not flagged. I read the same root `loading.tsx` streaming behavior. The catalog adds no new leak beyond the status class that every `notFound()` route already has, and the denied body carries no catalog text or title.
- **DS-12 (workflow.spec flake):** not flagged.
- Commit trailers use `Claude Opus 5.5`, as the global constraints require.

## Assessment

**Task quality: Approved.** The guard is deny-by-default with several independent layers and I found no bypass among the probed hosts. The page leaks nothing. Step 0 removed the override cleanly with no weakened waits. The three declared deviations are sound. The remaining issues are test-coverage and polish items, the most useful being to add the userinfo and `127.0.0.2` hosts to the denied list in the guard spec.
