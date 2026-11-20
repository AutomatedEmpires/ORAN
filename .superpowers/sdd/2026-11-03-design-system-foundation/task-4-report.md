# Task 4 report: TopBar-like header with the domain navigation

Status: DONE_WITH_CONCERNS (concerns are minor; see the end).
Commit: `a18a679 feat: give the header the Blend top bar and current-page navigation` (on `0eef01d`, not pushed; Step 6 skipped per DS-8).

## What was implemented
- `src/ui/logo.tsx`: `LogoMark()`, a 28x28 inline SVG (`viewBox="0 0 28 28"`, `aria-hidden="true"`, `focusable="false"`).
  - `rect.logo-tile` (`rx="8"`); `path.logo-sun`, a half disc centered at x=14, r=6, on y=18; `path.logo-rays`, three short rays above the sun; `path.logo-horizon`, from x=6 to x=22 at y=18.
  - The lines use `strokeWidth="1.5"` and `strokeLinecap="round"`. All colors come from CSS: tile `--color-primary`, sun and rays `--color-accent`, horizon `--color-on-primary`.
- `src/ui/nav.tsx`: `'use client'`, `type NavItem`, and `DomainNav({ label, items })`.
  - It renders `<nav aria-label>` with one `next/link` per item, and `aria-current="page"` when `href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')`.
  - The pathname comes from `usePathname()`. All routes are dynamic (`ƒ` in the build), so the server render already has the current item.
- `src/app/layout.tsx`: the header in DOM order, which is also visual order.
  - `a.brand` holding `<LogoMark/>`, `span.brand-name` "ORAN", a space and `span.visually-hidden` with `t.brand`. Then `form.language` with `button.secondary.button-compact`. Then `<DomainNav>` with the five existing keys: `find`, `profile`, `organization`, `community`, `admin`.
  - The local notice's sign-out button is `secondary button-compact`. The footer markup is unchanged; only its CSS changed.
- `src/app/globals.css` (+33/-16):
  - Deleted the bootstrap `:root { --line; --muted }`, the old header, brand, nav, `.local-notice` and footer rules, and the `@media(max-width:760px)` header rule.
  - Added the header, `.brand`, `.brand-name`, `.logo-*`, `.language`, `nav`, `nav a` (hover, active, `[aria-current=page]`), the new `.local-notice` rules, the new footer, `.visually-hidden`, and the `@media (width < 380px)` wordmark rule.
  - Every rule uses tokens and logical properties. There are no raw colors; the raw-color guard test still passes.
- `docs/ARCHITECTURE.md`: the brief's sentence added to "Current routes and checks".
- `tests/browser/design-system.spec.ts`: three new tests (below).

## Tests and results
Final gate on the committed tree:
- `typecheck`: PASS.
- `lint`: PASS (0 warnings).
- `test` (vitest, gated): 3 files, 43/43 pass. Run after the CSS and layout change; later edits touched only the e2e spec.
- `build` (gated): PASS. All routes are `ƒ` dynamic.
- `test:e2e` (gated, full): 19/19 pass in 1.5 min. That is 12 existing design-system tests, 3 new ones, and the 4 workflow tests. axe reports 0 serious or critical violations on `/`, `/sign-in`, `/no-such-page`, `/admin`, `/organization`, `/community` and `/profile` at 360 and 1280, with the new header.

New tests:
1. `the header is a Blend top bar with domain navigation`. Every assertion in the brief's Step 1 is there:
   - banner background and 1px solid `rgb(225, 230, 234)` bottom border;
   - brand link name "ORAN Open Resource Access Network";
   - link order and `aria-current` on "Find support" (`rgb(211, 230, 234)`, `rgb(23, 89, 107)`, weight 800), the other four unmarked, and none marked on `/sign-in`;
   - 44px height for the nav links, Apply, Sign out and Switch identity;
   - Apply at 14px on `rgb(226, 238, 240)`;
   - `--ink`, `--accent` and `--paper` empty;
   - every property declared in `globals.css` is documented or derived, with a guard that more than 50 were found.
   - **M6** is inside this test. `ORAN_LOCAL_DEV=1` shows the notice in e2e, so it is testable. At 1280px the `complementary` box is at most 760+2x16 wide, and its left edge equals `main`'s left edge + 16 (aligned with the content column).
2. `Spanish header reflows at 320 and 360 pixels`, as specified.
3. `the server marks the current domain without JavaScript and respects path boundaries` (extra). A JS-disabled context checks:
   - `/` marks Find support;
   - `/sign-in` marks none;
   - `/admin/anything` marks Admin (nested path);
   - `/adminx` marks none (boundary);
   - after sign-in as Admin (a plain form post), `/admin` marks Admin and `/organization` marks Organization.

M6 negative control: the "before" run (old `.local-notice` plus `.notice` at equal specificity) logged the notice at `{"x":0,"width":1096}`. That fails both assertions. After: `{"x":260,"width":760}` with `main` at `x=244, width=792`.

## TDD evidence
RED (before any implementation, after writing the tests; gated):
```
powershell ... test-gate.ps1 -Owner design-T4 test:e2e tests/browser/design-system.spec.ts -g "header"
  ✘  1 ...design-system.spec.ts:403:1 › the header is a Blend top bar with domain navigation (7.3s)
  ✓  2 ...design-system.spec.ts:454:1 › Spanish header reflows at 320 and 360 pixels (2.5s)
  1) the header is a Blend top bar with domain navigation
     Error: expect(locator).toHaveCSS(expected) failed
     Locator:  getByRole('banner')
     Expected: "rgb(255, 255, 255)"
     Received: "rgba(0, 0, 0, 0)"
     > 407 |   await expect(banner).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  1 failed, 1 passed
```
- Test 1 fails on the first assertion, because the old header has no background. The brief expected the failure at `aria-current` and `--ink`; it stops one assertion earlier.
- The Spanish reflow test already passed. The old header wrapped fine, so it is a regression guard for the new layout, not a RED test. This is not a defect in the test.

GREEN (after the implementation, same command): `2 passed (19.6s)`. The full e2e run is `19 passed (1.5m)`, quoted above.

## Files changed (commit a18a679; 6 files, +162/-16)
- `src/ui/logo.tsx` (new, 12 lines)
- `src/ui/nav.tsx` (new, 22 lines)
- `src/app/layout.tsx`
- `src/app/globals.css`
- `docs/ARCHITECTURE.md`
- `tests/browser/design-system.spec.ts`

Authored non-test lines: about 65, well under the C17 budget of about 400. The temporary `tests/browser/zz-scratch-shots.spec.ts` was deleted before the commit. The working tree is clean.

## Self-review against the brief
- **DOM order and visual order:** brand, language form, nav. There is no CSS `order`. The nav has `flex-basis:100%`, so it sits on the second row at every width.
- **Table rules:** each row was implemented and each value checked against the table. The brief's `.local-notice` margin is written as the logical pair `margin-block:var(--space-4) 0; margin-inline:max(var(--space-4), (100% - var(--size-chat-column)) / 2)`, which is equivalent to the brief's shorthand and keeps the logical-properties rule. `.brand-name` is hidden by the `.visually-hidden` technique, never `display:none`, at `(width < 380px)`, so the link keeps its name.
- **Accessible name:** "ORAN Open Resource Access Network" is asserted, with exact match.
- **aria-current:** the logic is as specified. It is rendered on the server (proved by the JS-disabled test) and follows client navigation through `usePathname()`. `nav a[aria-current=page]` is declared after the `:hover` rule, so hovering the current item keeps the strong tint.
- **Spanish reflow:** passes at 320 and 360 on `/` and `/sign-in`. `fitsWidth` is true, and the combobox, button and all five links are in the viewport.
- **Contrast pairs:**
  - nav text: secondary on surface 7.58;
  - hover: primary on tint 6.62;
  - current: primary on tint-strong 6.08;
  - Apply and Sign out: primary on tint 6.62.
- **Forced colors:** `nav a` has a transparent 1px border, so edges stay visible. The screenshot at `after-en-1280-home-forced-colors.png` shows the edges. The logo keeps its own colors in Chromium (fill and stroke are not remapped), so no forced-colors rule was needed.

## Decisions
1. `.local-notice` is placed after `.notice` in the stylesheet (M6). `.notice` sets `max-inline-size:none` and `margin-block`, and at equal specificity the later rule wins. The notice keeps `.notice`'s padding, border and card background. It does not use a specificity bump.
2. `.brand` gets `min-inline-size:var(--size-target)`. This is not in the brief's table. Below 380px the wordmark is hidden and the link would be 28px wide; DESIGN_SYSTEM §9 requires at least 44x44 on every interactive element. At 380px and above the link is already wider than 44px.
3. The no-JS test was added, since the brief says the nav works without JavaScript and I wanted a test of the claim.
4. `.language label { display:inline }` is written per the brief. Inside a flex container it computes to `block`, so it has no visual effect.
5. Footer `p` keeps its default margins. The brief gives no rule for it, and the screenshots look acceptable.
6. The new test file additions use `readFileSync`, `fitsWidth`, `readTokens` and `documentedTokenNames` that were already imported or exported, so `support.ts` is untouched.

## Deferred to a later UI PR (updated after the final review; full list to record in the PR description)

Dropped because the fix wave resolved them: the profile consent row spacing (I1), the base-control specificity (I2), the stale `DESIGN_SYSTEM.md` §10 line, and the forced-colors cue for the current nav item.

- **Markup in files this track may not touch:**
  - `src/ui/forms.tsx`: `ActionForm` should use `<Button busy>` instead of native `disabled` and a swapped label (§5.4). Fields need inline errors linked with `aria-describedby`, plus an error summary on submit (form primitives).
  - `src/app/profile/page.tsx`: "Delete my saved preferences" should be `variant="destructive"`, not `.secondary`.
  - `src/ui/resources.tsx`: ResourceCard anatomy (§5.3). This needs a title link, an organization line, a facts row, actions and the TrustLabel, StatusNote and AccuracyNote, which also need ADR-0006 slice 3 data and new EN/ES strings.
  - `src/app/page.tsx`: the Seek layout (h1 "Find support", SearchField, ContextChips, FilterBar) replaces the hero and its copy. `className="hero"` on the wrapper `div` is dead (Task 3 deleted the `.hero` rule); remove it with that change (M3).
  - `src/app/error.tsx`, `loading.tsx` and `not-found.tsx`: ErrorState with an alert icon, a Skeleton with `aria-busy`, EmptyState, and the OutageState with crisis numbers and the 211 link (C19). The not-found "Return to resource search" link is a bare link about 24px tall; it meets WCAG 2.5.8 but not the §9 rule of 44px, so give it a 44px target in the EmptyState.
  - `src/app/sign-in/page.tsx`: `.card > input[type=hidden]:first-child + *` exists only because the four sign-in cards are `<form class="card">` whose first child is a hidden input. Move the hidden input after the heading, or give the heading a class, and drop that brittle selector.
  - `README.md`: mention `/dev/components` in local development.
- **Seeker shell (C2):**
  - the sticky TopBar with `scroll-padding`;
  - SeekerTabBar and SideNav, once Seek, Chat, Map and Profile exist;
  - QuickExit and GetHelpNow;
  - the §4 viewport meta (`viewport-fit=cover`, `interactive-widget=resizes-content`) and safe-area padding.
  - Scope the bare `header`, `nav`, `nav a` and `footer` selectors (`body > header`, `header nav`, `body > footer`) before any page content adds those elements (Task 4 review, Minor 3).
- **Tokens and tooling:**
  - the category pin tokens (§6), with the Map slice, re-checked against the chosen tiles (D6);
  - lint that blocks raw colors, sizes and off-scale spacing (§10). It needs stylelint (C13) or the Tailwind decision (D6); PR A only adds the raw-color test;
  - more icons, which wait for the §11 icon-library decision;
  - put the base element rules in `@layer base` so unlayered component and vendor CSS always wins (PR B design, before any component CSS is added);
  - WCAG 1.4.12 text spacing and 400% zoom are §9 budgets with no test yet.
- **Test harness:**
  - remove the `support.ts` Fast Refresh override in PR B, after one gated run passes without it (DS-6; PR #15 fixed the cause);
  - PR #15 makes every browser run compile cold, which raises the first-compile flake risk under the default 5s `expect` timeout. If it flakes, raise `expect.timeout` in `playwright.config.ts` in a separate small PR (that file is outside this track's boundary).
- **Visual regression snapshots** of the catalog (BLUEPRINT §12.3) need a decision on the baseline platform. CI runs Chromium on Linux and native development runs Edge on Windows ARM64, so the baselines differ, and PNGs are binary assets (AGENTS §6).
- **Open questions for the founder (C21):**
  - Confirm the 11 derived token names already recorded in DESIGN_SYSTEM §3.3 and §3.4 (Ruling DS-1). This PR edits the approved document for that, which the plan had said it would not.
  - §9 could allow one variable Latin file (20.2 KB) instead of four static ones (45.7 KB).
  - The footer's crisis sentence on every page sits uneasily with ADR-0007 ("Get help now" lives only in the menu; BLUEPRINT §7.5 is superseded). It is restyled quietly here (DS-2). The committed follow-up collapses it into a quiet "Get help now" disclosure, which needs a new EN/ES string (`en.json` and `es.json` belong to the slice-2 track).
  - The Clerk-hosted sign-in, used outside local mode, is not covered by the font-request test, and Clerk's `<SignIn/>` also inherits the global element styles (the base control rules now sit at element specificity, so Clerk's own classes win). Check its network requests and its look once Clerk credentials exist.
  - Low priority: type is set in px (§3.3), so text ignores the browser's default font-size setting. Sizing in rem would honor it. This is a spec question.

## Screenshots (not committed)
Folder: `C:\Users\Cole0\AppData\Local\Temp\claude\c--Users-Cole0-AutomatedEmpires-Projects-oran\17f48216-8195-4687-8036-fc7dd86674d6\scratchpad\design-shots\`

38 PNGs, full page, named `{before|after}-{en|es}-{360|1280}-{home|sign-in|admin|profile}.png`. That is 16 per set; `/admin` was captured as Admin and `/profile` as "My profile". Extras per set:
- `{before|after}-en-320-home.png` and `{before|after}-es-320-home.png`
- `after-en-1280-home-forced-colors.png` (and the matching `before-` file)

"Before" shots: taken by temporarily swapping `globals.css` and `layout.tsx` to their `61d4097` (`ed5e552^`) versions for one gated Playwright run. The working copies were backed up and then restored; SHA-256 hashes were verified identical before and after, and the temporary spec was deleted. Before shots use the fallback font, because `61d4097` predates self-hosted Figtree.

## Concerns
- **Commit trailer.** The plan and the brief say to end the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and the three earlier commits on this branch do. The harness attribution for this session says `Claude Sonnet 5.5`, which is the accurate model name. I used the harness line. Amend the trailer if you want the branch uniform.
- **RED mismatch.** Test 1 fails on the first assertion (banner background) instead of `aria-current`, and the Spanish test passes before the change, as explained above. It is a guard, not a RED test.
- **Header height on tiny phones.** At 320px in Spanish the header is four rows, about 260px tall. The language form (about 254px) does not fit beside the 28px logo, so it wraps, and the nav wraps to three rows. This is what the brief specifies. Reflow and reachability pass. The sticky TopBar and tab bar work should revisit this.
- **Footer hairline.** It spans the 792px content width, not the viewport, as the brief specifies ("the same max-inline-size and centering as main"). The header hairline is full width. A visual difference only.
- **Dev notice wrapping.** At 1280px the "Sign out" button wraps to a second row inside the notice, because the sentence plus link plus button exceed 728px. That is expected from the brief's flex-wrap layout.
- **Gate and machine.** Every gated run got the lock after waiting on another track's run; there was no exit 75 and no OOM. The first gated run logged a Next "Slow filesystem" warning on `.next-test/dev`, which is harmless. The DS-6 WebSocket mitigation in `support.ts` is still in use.

## Final-review fix wave (Ruling DS-10)

Base: HEAD `d2b4cf4`, a merge of `1d4a669` (slice 2a's resource form with the `source_type` radios and conditional `source_url`, plus PR #15, the Turbopack dev-cache fix). No `node_modules` install was needed.

Commits (new, none amended, not pushed):
1. `937cb61 fix: separate the consent row and soften base control specificity`: `src/app/globals.css`, `tests/browser/design-system.spec.ts`, `tests/browser/support.ts`.
2. `5803be0 docs: describe the tokens as implemented`: `docs/DESIGN_SYSTEM.md`.

### Changes
- **I1.** The checkbox and radio label rule now uses `margin-block:var(--space-4) 0; margin-inline:0`, so a standalone row (the profile consent) keeps the label's 16px top spacing. Added `fieldset > label:where(:has(> input:is([type=checkbox],[type=radio]))) { margin:0; }` so grouped options stay tight.
- **I2.** The base form-control selectors now sit at element specificity: `label:where(:has(...))`, `input:where([type=checkbox],[type=radio])`, `input:where(:not([type=checkbox],[type=radio],[type=hidden]))`. `[readonly]` and `[aria-invalid]` now win by specificity, not only by order. The `fieldset > label:where(...)` rule has specificity (0,0,2), above the base label rule (0,0,1). Computed styles are unchanged: the controls, focus and axe tests are green.
- **Minor 1.**
  - New test: the brand link keeps its exact name and is at least 44x44 at 320 and 360px, in English ("ORAN Open Resource Access Network") and Spanish ("ORAN Red de Acceso a Recursos").
  - The notice width assertion is now `toBeCloseTo(760, 0)`.
- **Minor 2.** The focus-ring test now focuses the brand link and the current nav link ("Find support", whose tint sits behind the ring) with `focusByKeyboard` and `ring`.
- **Minor 3.** The injected radio is gone. The controls test selects the real "A website" radio on /admin, so "Source web address" appears and joins the 44px textbox loop. The radio label-height and `accent-color` assertions are kept, now on the real radio.
- **Minor 4.** The `support.ts` comment names the real cause: a restored Turbopack dev cache answers every HMR subscribe with "restart" (vercel/next.js#100251), and PR #15 fixed it. The override stays in PR A and is removed in PR B after one gated run passes without it.
- **Minor 5.** `docs/DESIGN_SYSTEM.md` line 336 now reads: "Tokens are CSS custom properties in the `:root` block of `src/app/globals.css`; `tests/browser/design-system.spec.ts` keeps them in step with §3."
- **Minor 7.** Under `@media (forced-colors: active)`, `nav a[aria-current=page]` gets `text-decoration:underline; text-decoration-thickness:2px` (the same 2px the file already uses for link hover; no token fits). The forced-colors test asserts an underline on "Find support" and none on "My profile".
- **New test (I1):** on /profile at 360px, the gap between two category options is under 1px and the gap from the last option to the consent row is at least 16px.

### Finding: the Fast Refresh override blocks hydration
- With `page.routeWebSocket(/\/_next\//, ...)` active (the `support.ts` override), React never hydrated on /admin. A click on the controlled "A website" radio left it natively checked but never reached React state, so `source_url` never appeared, even after 60s of retries. Specs that need client state (the controls test here) must use Playwright's own `test`.
- `support.ts` exports `hydratedTest` for that, with a comment. The controls test uses it, and its radio selection retries until the field appears (`toPass`, 20s), because a click before hydration changes no state.
- This is a reason, besides the cleanup in PR B, for removing the override.
- Screenshots of the hydrated pages show Next's dev "N" badge. The capture hid it with a style tag.

### Existing assertions edited (C16)
- Notice width: `toBeLessThanOrEqual(760 + 2 * 16)` to `toBeCloseTo(760, 0)`. Reason: the old bound passed an overflowing notice (Minor 1).
- Controls test: `test` to `hydratedTest`, and the injected-fixture radio block replaced by the real radio checked before the textbox loop (Minor 3).
- Focus-ring test: added the header-link checks, with a `page.goto('/')` in the middle. Later steps start with `enterAs`, so they are unaffected.
- Forced-colors test: appended the nav underline assertions.
- No assertion was weakened or removed.

### Gate (all through `test-gate.ps1 -Owner design-fixA`, except typecheck and lint)
- `run.ps1 typecheck`: PASS. `run.ps1 lint`: PASS, 0 warnings.
- `test-gate.ps1 ... test`: `Test Files 5 passed (5), Tests 60 passed (60)`.
- `test-gate.ps1 ... build`: PASS (all routes dynamic).
- `test-gate.ps1 ... test:e2e`: `23 passed (3.0m)`. That is 17 design-system tests and the 6 `workflow.spec.ts` tests, including main's new `source_type` radio tests under the Blend styles (first run). axe shows 0 serious or critical violations.
- A first full e2e run (before the hydration fix) had 3 failures:
  - the controls test, because of the blocked-hydration finding above;
  - the consent test, which read the options before the loading shell finished (fixed by waiting for the heading);
  - `workflow.spec.ts` "organization staff maintain…", `Edit resource` heading not visible within 5s. This was a cold-compile flake of `/resources/[id]/edit` on a loaded machine (PR #15 makes every browser run compile cold). It passed on the next run (9.8s). The workflow spec and `playwright.config.ts` are outside this track's boundary, so this is noted as a concern, not changed.

### Screenshots re-captured (not committed)
Folder: `C:\Users\Cole0\AppData\Local\Temp\claude\c--Users-Cole0-AutomatedEmpires-Projects-oran\17f48216-8195-4687-8036-fc7dd86674d6\scratchpad\design-shots\`
- `after-en-360-profile.png`, `after-en-1280-profile.png`, `after-es-360-profile.png`, `after-es-1280-profile.png`: the consent row is now set apart from the category list.
- `after-en-360-admin.png`, `after-en-1280-admin.png`, `after-es-360-admin.png`, `after-es-1280-admin.png`: now with the real `source_type` radios.
- New: `after-en-360-admin-website.png` and `after-en-1280-admin-website.png` (the "A website" choice with the "Source web address" field shown).
- `after-en-1280-home-forced-colors.png`: now shows the underline on the current nav item.
- The temporary capture spec (`tests/browser/zz-fixwave-shots.spec.ts`) was deleted before the commit, and the working tree is clean.
