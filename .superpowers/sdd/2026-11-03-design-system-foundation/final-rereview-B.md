# Re-review: final-review fix wave (DS-15), design-system PR B

Range cdc6d86..87320d0 (one commit, 5 files, +87/-19). Read-only: I read the diff, the DS-15 section of task-6-report.md, final-review-B.md, and at HEAD `proxy.ts`, `guard.ts`, `page.tsx`, `not-found.tsx`, `en.json`, `playwright.config.ts`, `tsconfig.json`, `scripts/dev.ts`, plus the changed files with line numbers. I ran no tests (memory); the report's evidence stands: e2e 33/33, vitest 60, build, typecheck, lint. The worktree is clean at 87320d0.

## Finding verdicts

**I1 (aria state pass-through): ADDRESSED.**
- `src/ui/button-control.tsx:12` no longer destructures the aria props. `:17-18` write `aria-disabled={inactive || undefined}` and `aria-busy={busy || undefined}` after `{...props}` (`:16`), so a stray attribute is overwritten.
- The `Omit<>` carries `'aria-disabled' | 'aria-busy'` in `ControlProps` (`button-control.tsx:5`) and in `ButtonProps` (`src/ui/button.tsx:21`).
- Test `component-catalog.spec.ts:100-116`:
  - `disabled={false}, busy={false}` must render exactly `<button class="button">Save</button>` (`:104`), which covers "disabled={false} renders no aria-disabled" and busy=false.
  - disabled, busy and both give `aria-disabled="true"` and no native `disabled`; `aria-busy` appears only for busy.
  - `:114-115` pass `aria-*` through a `// @ts-expect-error` and assert the markup has no `aria-`. `tsconfig.json` includes `**/*.ts`, so the directive is type-checked and guards the `Omit`; the runtime assertion guards the spread order. The report's mutation check (spread moved last) makes this test fail.
- No existing caller passes aria props to Button (`layout.tsx`, the catalog page), so the narrowed types break nothing.

**I2 (busy cue for screen readers): ADDRESSED.**
- `tests/browser/component-catalog.spec.ts:163` now reads "Busy keeps the variant's own look and the label, and exposes aria-busy."
- `src/ui/button.tsx:15-16` states that a busy Button keeps its label, that aria-busy is not reliably spoken, and that a caller needing a spoken cue renders the pending text in a `role="status"` region always in the page (empty when idle).
- The ActionForm Deferred entry and the PR text from the original I2 are not in this diff. The ruling did not list them, and the report assigns them to the controller.

**M1 (never-submit test): ADDRESSED.** `component-catalog.spec.ts:212-233`:
- `:223` adds `press('Space')` after Enter.
- `:219` uses `waitUntil: 'commit'`.
- `:230` asserts `not.toHaveURL(/submitted=1/)` before the positive click.
- `hydrated(target)` still runs first (`:217`).

**M2 (deleting the guard call must fail a test): ADDRESSED.** `component-catalog.spec.ts:236-261`. See the approach verdict below.

**M3 (support.ts): ADDRESSED.**
- `tests/browser/support.ts:5-9` is reworded: "Specs use Playwright's own `test`, so pages can hydrate ... a spec that needs React to be running waits with hydrated()".
- `hydrated()` is now exported at `support.ts:124-126` and removed from the spec.
- The spec imports it (`:7`), and `Locator` is still used there by `settled`. The poll keeps its loud failure.

**M5 (adopter notes): ADDRESSED.** `src/ui/button.tsx:10-16` covers all three points, and I checked each against the code:
- serializable props only for server callers;
- `type` defaults to submit (Button sets no type);
- only `onClick` is guarded while inactive. The handler calls `preventDefault` and not `stopPropagation`, so parent handlers do run.

**M6 (page.tsx comment): ADDRESSED.** `src/app/dev/components/page.tsx:16-19` no longer says "as an unknown route would". It now says a denied request gets the not-found page and none of the catalog's content or metadata, that the status is still 200 (root `loading.tsx`), and that the deferred fix is a `/dev/*` 404 in `src/proxy.ts`. The first-line authorization comment is unchanged.

## M2 approach verdict

Sound. It exercises the page guard and not the proxy, the control is meaningful, and nothing is left open.

- **Proxy versus guard.**
  - `proxy.ts:8` tests `request.nextUrl.hostname`. For `Host: evil@127.0.0.1:3100` that parses to `127.0.0.1`, so the proxy passes the request.
  - `guard.ts:4,12` tests the raw header against `loopbackHost`, which refuses userinfo.
  - The report's mutation check is conclusive. With `if (!(await allowed())) notFound();` removed, the denied response contained "Component catalog". That could not happen if the proxy had refused it, and it shows the raw header reaches `headers().get('host')`.
  - The assertion `toContain('Page not found')` (`en.json:15` via `not-found.tsx`) cannot be satisfied by the proxy's plain-text `Not found` body, nor by an error page. Only `notFound()` from the page's guard produces it.
- **Control.** `:253` sends the launcher's own `url.host` and requires "Component catalog". This proves the route is served in this environment, so the denial of the `evil@` request can only come from the host shape, and the text check discriminates.
- **Coverage bonus (unverified).** Next still renders metadata for a page that calls `notFound()`, so a `generateMetadata` that always returned the title would put "Component catalog" in the body and fail `:259`. That would partly close the "no CI check for the metadata denial" caveat in the report's Concerns. The implementer did not mutation-test it, so I report it as likely and not proven.
- **Sockets.** `httpRequest` uses the global agent. Node 26 pools keep-alive sockets, but free sockets are unref'd, they do not hold the worker open, and the dev server is killed at the end of the run. The 30s `timeout` option is handled (`request.on('timeout')` destroys the request). Errors on the request and on the response reject, so a premature close fails the test instead of hanging. No server is started by the test.
- **Fragility, noted by the implementer.** It depends on the dev server accepting a userinfo Host. If Next rejects it, the test fails loudly on "Page not found", which is the right failure mode.

## New breakage in the fix diff

None at Critical or Important.

- Minor, `tests/browser/component-catalog.spec.ts:218`: the comment says `'commit'` "resolves as soon as a navigation starts, so a slow submit cannot finish after the one second is over". `'commit'` fires when the response headers arrive, so a submit that the server answers after 1s is still missed. It is a real improvement over `'load'` and is what the ruling asked for. The route is already compiled at that point, so the residual risk is small. Suggest rewording to "commits" or "begins to load".
- Minor: the `not.toHaveURL` at `:230` passes immediately and does not wait for in-flight navigations. It guards against a late completed submit only.

## Out-of-scope observations

- **Proxy 404 coupling.** When the deferred proxy-level 404 for `/dev/*` lands, the M2 denied request will get the proxy's plain `Not found`, and the "Page not found" assertion will fail. The test comment (`:255-257`) shows the author knows this; the change then needs to assert the 404 status. Worth a line in the Deferred entry.
- **Controller items remain outside this diff:**
  - the PR text (guard matrix; denied = not-found page at HTTP 200, "not identical to an unknown route"; pre-hydration caveat; Step 0);
  - the Deferred list additions (ActionForm `busy` plus an always-rendered status region, the proxy 404, the M4 forced-colors disabled cue).
- **Trailer.** The fix commit trailer reads "Claude Opus 5.5", per the report "as the coordinator specified". The earlier commits read Sonnet 5.5 (DS-14). This is cosmetic.
- **Test-only code reach.** The spec imports `react-dom/server` and the Button directly into the Playwright node process. It works (33/33), but it makes this spec a component unit test as well as a browser test; the plan already placed the guard and `buttonClassName` unit tests there.

## Verdict

All findings addressed, no new Critical/Important breakage
