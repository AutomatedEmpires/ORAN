# Final review: design-system PR B, "component catalog and Button primitive"

Range: 3a6e0be (origin/main)..cdc6d86 on `claude/design-system-b-catalog`. I checked that `git diff --stat 3a6e0be cdc6d86` matches the review package: 10 files, +427/−24.

Method: read-only. I read the following:
- the review diff;
- the plan's header, Global Constraints, Review Focus, Decisions, PR B and the Deferred list;
- progress.md (DS-1 to DS-14);
- the task-5 and task-6 reports and reviews;
- DESIGN_SYSTEM §1, §2, §3.4, §5.4, §5.7, §9 and §10;
- AGENTS.md and CONSTITUTION C2, C10, C12, C13, C17 and C18.

I also read these files at HEAD:
- `guard.ts`, `page.tsx`, `button.tsx`, `button-control.tsx` and `globals.css`;
- `src/proxy.ts`, `src/modules/platform/index.ts` (`config()`) and `scripts/dev.ts` (the bind address);
- `src/app/loading.tsx` and `src/app/not-found.tsx`;
- `next.config.ts` and `playwright.config.ts`;
- `tests/browser/support.ts` and the radio spec in `design-system.spec.ts`;
- `src/ui/forms.tsx` (ActionForm) and `src/app/profile/page.tsx` (the delete button).

I ran no tests, because memory is low. The gate evidence comes from the task reports: e2e 31/31, vitest 60, plus build, typecheck and lint.

## Strengths

- **The guard is deny-by-default in independent layers, and every layer would have to fail.**
  - `scripts/dev.ts:8` refuses to launch under production or Vercel.
  - `config()` throws for local mode outside development, under `NODE_ENV=production`, on Vercel or with a non-loopback database (`platform/index.ts:10,15`).
  - `proxy.ts:6-8` calls `config()` first and returns 404 for non-loopback hosts in local mode.
  - `guard.ts:9` checks `NODE_ENV` and `VERCEL` itself before asking `config()`.
  - `guard.ts:12-13` checks the host's shape with a regex, then parses it, and any exception means false.
  - The launcher binds `--hostname 127.0.0.1` (`dev.ts:18`), so nothing on the LAN can reach the dev server.
  - On a deployed preview, `VERCEL=1` and `NODE_ENV=production` each deny on line 9, so no single mistake opens the route.
- **The userinfo hole is closed and pinned by tests.** `evil@127.0.0.1` parses to a loopback hostname, and the shape regex refuses it. The guard matrix covers every branch, and the regex mutation check fails the test as it should.
- **The metadata leak was found against a real `next start` and closed.** `generateMetadata` and the page share one `allowed()` helper (`page.tsx:12-20`), so a denied request gets no catalog title and no catalog robots tag.
- **The page is a server component, so no catalog text reaches the client bundle.** The fixture strings and the token list stay on the server. A denied render ships no catalog text, and the client receives only `ButtonControl`.
- **The Button split is the smallest one Next allows.**
  - `@/ui/button` has no directive, so server components such as the layout and profile page can call it, and so can client components such as ActionForm.
  - Only the click guard is client code. Callers keep one import path.
  - Refs work: `ComponentPropsWithRef<'button'>` plus React 19's ref-as-prop pass through both spreads.
- **Disabled and busy buttons keep focus and refuse activation in one place.**
  - The native `disabled` attribute is never set, so a focused button keeps focus when it goes busy. Today's ActionForm moves focus to `<body>` when the native attribute is set.
  - One `preventDefault` in the click handler covers a click, Enter, Space and implicit submission.
  - Disabled text has about 6.5:1 contrast, which I computed for #4A5563 on #EBEEF1.
- **The CSS is reasoned and tested.**
  - The disabled rule's (0,3,0) specificity is checked while hovered, after the transition has settled.
  - The busy look keeps the variant's colors.
  - Under reduced motion, the spinner becomes a static three-quarter ring, which still shows the button is busy.
  - Under forced colors, the spinner's gap and the disabled border are handled and tested.
- **Removing the override was clean.** No wait, timeout or axe exclusion was loosened. The one spec that drives React state, the radio in "controls follow", already retries until the field appears (`design-system.spec.ts:279-282`), so it does not race hydration.
- **Constitution and docs.**
  - C12: the authorization comment and deny-by-default guard are in place.
  - C13: the ARCHITECTURE route entry is accurate and in "Identity and route contract".
  - No new environment variables or dependencies.
  - C17: about 200 authored lines.
  - C10: imports go through `@/modules/platform` and `@/ui/*`.
  - C18: every word of the Button comes from its children.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. A caller-supplied `aria-disabled` or `aria-busy` makes a button that looks inactive but still submits.** Fix-wave item 1, confirmed and refined. Locations: `src/ui/button-control.tsx:10,15-16`, with the types at `src/ui/button.tsx:12` and `button-control.tsx:3`.
- **What's wrong:** the CSS (`globals.css:143-145`) and screen readers both read the attributes. With the pass-through, `<Button aria-disabled="true">` is greyed out and announced as unavailable, but `inactive` is false, so the click guard does not run and the form submits. `<Button aria-busy="true">` shows a spinner with no guard. The state then lives in two places.
- **Why it matters:** a developer adopting Button next may write the ARIA attribute rather than the `disabled` prop, because the attribute is how the spec describes the state. The result is a control that lies to keyboard and screen-reader users.
- **Fix:**
  - Drop both from the destructure.
  - Render `aria-disabled={inactive || undefined}` and `aria-busy={busy || undefined}` after `{...props}`.
  - Refinement: also add `'aria-disabled' | 'aria-busy'` to the `Omit<…>` in `ButtonProps` and `ControlProps`. TypeScript then rejects the misuse instead of silently ignoring it.

**I2. Screen readers get no reliable "working on it" cue from a busy Button, and the deferred ActionForm note, followed as written, removes the only text cue.** Locations: `tests/browser/component-catalog.spec.ts:142` (comment), the `button-control.tsx:4-8` comment, and the plan's Deferred entry for `src/ui/forms.tsx`, which the PR text must carry.
- **What's wrong:**
  - The spinner is a `::before` with `content:''`, so it adds nothing to the accessible name.
  - The label is kept by design (§5.4).
  - Support for speaking `aria-busy` on a focused button varies between VoiceOver/Safari and NVDA/Chrome. Treat it as unannounced.
  - So a screen-reader user who presses "Save" hears at most "unavailable" or "dimmed".
  - Today ActionForm swaps the label to `t.pending` (`forms.tsx:9`). The deferred item says to replace that with `<Button busy>` and the kept label, which leaves no spoken progress at all.
  - The spec comment's claim "says so to assistive technology" overstates what users actually hear.
- **Why it matters:** ActionForm is the very next adopter, and it covers every save on admin, organization, community and profile.
- **Fix (no product code in this PR):**
  - In the PR text and the Deferred entry, write: "ActionForm renders `<Button busy={pending}>{label}</Button>` and moves `t.pending` into a status region that is always rendered (empty when idle) so the progress text is announced. Today's status `<p>` is inserted only when there is a message, which some screen readers miss."
  - Soften the spec comment to "and exposes `aria-busy`".
  - Optionally add one line to the `button-control.tsx` comment: "aria-busy is not reliably spoken; announce progress in a status region."

### Minor (Nice to Have)

**M1. The never-submit test should press Space, and its negative check depends on timing.** Fix-wave item 2, confirmed and refined. Location: `component-catalog.spec.ts:201-210`.
- **Space:** add `await page.keyboard.press('Space')` after the Enter press. A click raised on keyup is a separate activation path.
- **Timing:**
  - `waitForURL(/submitted=1/, { timeout: 1000 })` uses the default `waitUntil: 'load'`.
  - If the guard breaks and the dev server is slow, the GET navigation can start but not reach `load` within 1 second. That iteration would then pass vacuously.
  - The two iterations partly cover each other: if the first submits, the URL already matches in the second. But a late submit on "Primary busy" would also make the closing positive check pass trivially.
  - Fix: use `{ timeout: 1000, waitUntil: 'commit' }`, and add `await expect(page).not.toHaveURL(/submitted=1/)` before clicking "Primary".

**M2. No test fails if the page stops calling the guard.** Location: `src/app/dev/components/page.tsx:36`.
- The guard is tested as a unit, and every e2e spec runs in the allowed mode. Deleting line 36 leaves the whole suite green. In production the page would then render, though its content is only fixtures.
- **Option A (to verify first):** send a request through `request.get('/dev/components', { headers: { host: 'evil@127.0.0.1:3100' } })` and assert the body lacks "Component catalog". `proxy.ts:8` compares the parsed hostname, which is 127.0.0.1, while the guard checks the raw shape. Check that such a Host header actually reaches the page.
- **Option B:** a source-text assertion that the default export starts with the guard call, like the repo's existing source-text test in `design-system.spec.ts`.

**M3. The `support.ts` comment overstates what the specs get.** Location: `tests/browser/support.ts:5`.
- "Every spec runs against a hydrated page" is not quite true. Pages are now free to hydrate, but a spec that needs React must still wait for it, with `hydrated()` or a retry.
- Reword the comment, and move `hydrated()` from the catalog spec into `support.ts` so the next spec that clicks a client control reuses it.
- Reading `__reactProps$` is acceptable: if React renames the key, the poll fails loudly rather than passing.

**M4. Under forced colors, the only sign of a disabled Button is a 1px GrayText border.** Location: `globals.css:152`. This carries over Task 6 Minor 4.
- A Windows high-contrast user sees ButtonText text on ButtonFace, the same as an enabled button.
- No real screen renders a disabled Button yet, and ActionForm will use busy, whose spinner shows under forced colors. So deferring this is fine.
- When it is fixed, inside the forced-colors query:
  - set `forced-color-adjust:none; color:GrayText; border-color:GrayText; background-color:ButtonFace` on the disabled rule;
  - also set `outline-color:Highlight` for `:focus-visible`, or the ring stays teal on a dark system background.
- Add this to the Deferred list.

**M5. Three adopter notes are missing from the `button.tsx` comment.** Location: `src/ui/button.tsx:5-7`. One or two lines would cover them:
1. A server caller may pass only serializable props. `onClick` and `ref` type-check but fail at runtime.
2. `type` defaults to submit, so pass `type="button"` for any action that does not submit.
3. Only `onClick` is guarded while inactive. Other handlers, and click handlers on parent elements, still run. A native disabled button suppresses its click entirely.

**M6. The PR text must not describe a denied response as "identical to an unknown route".** Locations: the PR text, and the comment at `page.tsx:16-17` ("as an unknown route would").
- Nothing in a denied response's content or metadata leaks. The route's existence is still visible in two ways:
  - The status is 200, not 404. This is accepted and deferred.
  - Probably also the router tree in the inline flight data of the HTML, which names the `dev/components` segments. I did not verify this.
- That is harmless, because the AGPL source is public and the content is fixtures. The deferred fix should point at `src/proxy.ts`: return 404 for `/dev/*` unless `catalogAllowed`. That one change also fixes the status, the RSC tree, prefetch and any matched-path header, and it lies outside this PR's file boundary.
- Also state that the `generateMetadata` denial was checked once by hand against `next start` and has no CI check (DS-13 Minor 2).

## Declined to judge

- **HTTP 200 on denial.** Already accepted and deferred. It comes from the root `loading.tsx` streaming first and affects every `notFound()` route. M6 only refines where the fix should go.
- **A `disabled` Button is cosmetic until hydration.** Already accepted. No production caller renders an inactive Button before hydration, and `type="button"` would break implicit submission (Task 6 review).
- **The route's existence showing in the CI build route list or the repository.** Not a secret: the code is meant to be public under AGPL, and the page holds only fixtures.
- **Allow-listing `NODE_ENV==='development'` instead of refusing `'production'`.** No runtime sets any other value under `next dev` or `next start`. The plan and ARCHITECTURE specify the current form, and `config()` and the launcher repeat the check.
- **`proxy.ts:8` and `sameOrigin()` read a hostname that userinfo in the Host header can spoof in local mode.** This predates the PR and lies outside its file boundary. The server binds to 127.0.0.1, and browsers never send such a Host.
- **The guard and `buttonClassName` unit tests live in a Playwright spec instead of Vitest.** The plan requires it, and they still run in CI's browser job.
- **`type` defaulting to submit.** This is the plan's explicit choice, and both immediate adopters want a submit button. M5 covers documenting it.
- **No `className` in `ButtonProps`.** A deliberate choice for consistency. The `form > button` margin rules still match.
- **No icon slot and no 18px icon sizing.** Icons wait for the §11 icon-library decision.
- **Quiet has no "secondary content" color option (§5.4).** No screen needs it yet.
- **A busy button still takes the hover color, and the spinner widens it by about 24px.** Cosmetic; §5.4 asks for a spinner plus the label.
- **The catalog has seven named `section` region landmarks and several primary buttons in one region.** It is a development-only page that shows states on purpose.
- **A possible transition race in the forced-colors busy test,** where `emulateMedia` runs after load and the face color is read immediately. I could not confirm that Chromium transitions colors that forced colors changes, and repeated runs were green. Moving `emulateMedia` before `goto` would remove the question if it ever flakes.
- **"Sign out" being a Button is not asserted by CSS.** `workflow.spec` and the design specs find it by role and name, and it shares a code path with "Apply".
- **The Task 6 commit trailer reads "Claude Sonnet 5.5".** Accepted under DS-14.
- **No visual regression snapshots,** even though DESIGN_SYSTEM §1 and §10 call for them. Deferred by the plan pending a baseline-platform decision. The PR text should say so; see the recommendations.
- **DESIGN_SYSTEM.md not updated.** It is outside the PR's file boundary, and nothing in it contradicts the implementation.

## Recommendations

1. **Fix wave** (small, one commit):
   - I1 with the type `Omit` refinement;
   - M1 (Space, `waitUntil: 'commit'`, the negative check before the positive click);
   - the comment changes in I2, M3 and M5.
   - M2 is optional.
   - Then a focused gate run: `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Cole0\AutomatedEmpires\Projects\oran\.local\test-gate.ps1 -Owner final-B test:e2e tests/browser/component-catalog.spec.ts`. Typecheck and lint run separately.
2. **The PR description must include:**
   - **Guard design.** The layers listed under Strengths, and the matrix:
     - allowed: `127.0.0.1:3100`, `localhost:3000`, `[::1]:3100`, `LOCALHOST:3000`;
     - denied environments: production `NODE_ENV`, `VERCEL`, `ORAN_ENV` preview, production or test, `ORAN_LOCAL_DEV` unset or `0`, a non-loopback database;
     - denied hosts: `oran.example`, `oran.example:3100`, `127.0.0.1.evil.example`, `localhost.evil.example`, `evil@127.0.0.1`, `127.0.0.2`, `localhost:99999`, `localhost:`, empty, null.
   - **What a denied request gets.** Outside the local launcher the route renders the not-found page with HTTP 200, because the root `loading.tsx` streams first. Every `notFound()` route already behaves this way. The fix is deferred to a proxy-level 404 (M6). A denied response carries no catalog title, robots tag or content; this was checked by hand against `next start` and is not in CI.
   - **Deferred items that now have a primitive:**
     - ActionForm: `<Button busy={pending}>` plus a status region that is always rendered for `t.pending` (I2);
     - the profile's "Delete my saved preferences" becomes `<Button variant="destructive">`, which works from the server component.
   - **Pre-hydration.** A statically rendered `disabled` or `busy` Button is visual only until React hydrates, and permanently without JavaScript. The server action stays authoritative.
   - **Step 0.** The Fast Refresh override is removed, and browser specs run on pages that hydrate.
   - **Not yet in the catalog contract:** visual snapshots (DESIGN_SYSTEM §10), the `README` mention, and the forced-colors disabled cue (M4).
3. **Deferred list additions:**
   - the proxy-level 404 for `/dev/*` (M6);
   - the forced-colors disabled cue (M4);
   - the ActionForm status-region guidance (I2).

## Assessment

**Ready to merge: With fixes.** The route cannot be reached outside local development, and through the shared guard a denied request reveals nothing beyond the accepted 200 status. Button's API, ref forwarding and server/client split are sound for the next adopters. The two queued items should land first: drop the aria pass-through (with the type `Omit`) and add Space with a commit-based wait. The PR text also needs the screen-reader guidance for ActionForm's busy state.
