# PR A final-review fix wave: re-review

Range d2b4cf4..5803be0 (937cb61, 5803be0). Read-only review of the diff file, the report's fix-wave section, and the current `globals.css`, `support.ts`, `design-system.spec.ts`, `forms.tsx`, `layout.tsx`, `nav.tsx`, `sign-in/page.tsx`, `next.config.ts` and `playwright.config.ts`. No tests were run and git was not re-run. The report's gate evidence (e2e 23/23, vitest 60, build, typecheck, lint, axe clean) is accepted as stated.

## Finding Verdicts

- **I1 (consent row reads as an 11th category): ADDRESSED.**
  - `src/app/globals.css:116`: the checkbox and radio label rule now has `margin-block:var(--space-4) 0; margin-inline:0`.
  - `src/app/globals.css:117`: `fieldset > label:where(:has(> input:is([type=checkbox],[type=radio]))) { margin:0; }` keeps grouped rows tight. Its specificity (0,0,2) beats line 116 (0,0,1), and it is not order-dependent.
  - Only `src/ui/forms.tsx` contains checkbox or radio inputs (3 sites): the category checks and source radios sit in a `fieldset`, and the profile consent label (forms.tsx:39) is a direct child of the form. So only the consent row changes, from margin 0 to a 16px top margin.
  - Test: `tests/browser/design-system.spec.ts:535-549`, at 360px on /profile.
    - It asserts the gap between two options is under 1px and the gap from the last option to the consent row is at least 16px.
    - At 360px the fieldset grid is one column (328px of content, 12rem = 192px minimum), so the "last" box is also the bottom of the group.
    - The fieldset has no bottom margin or padding, and a grid container's margins do not collapse with its siblings' margins, so the gap is exactly 16px.
    - It waits for the h1 before counting. `loading.tsx` renders only a `p[role=status]`, so the h1 wait does mean the real page has arrived.
- **I2 (class-level specificity on base controls): ADDRESSED.**
  - `src/app/globals.css:116-119`:
    - `label:where(:has(...))`
    - `fieldset > label:where(:has(...))`
    - `input:where([type=checkbox],[type=radio])`
    - `input:where(:not([type=checkbox],[type=radio],[type=hidden]))`
  - This is exactly the form the final review specified. `select, textarea` were already (0,0,1) and are unchanged.
- **Minor 1 (brand link name and size, notice width): ADDRESSED.**
  - Brand test: `design-system.spec.ts:516-533`.
    - It uses the exact names "ORAN Open Resource Access Network" and "ORAN Red de Acceso a Recursos" at 320 and 360px.
    - It asserts width and height of at least 44px.
    - The name is `ORAN` (`.brand-name`) plus the visually-hidden `t.brand` (layout.tsx:19). Both strings match en.json and es.json.
    - The Spanish half switches language through the server-action form, which works without hydration.
  - Notice width: `design-system.spec.ts:456-457`, `toBeCloseTo(760, 0)`. The viewport is 1280px and the notice margin is `max(16px, (100% - 760px) / 2)`, so the width is exactly 760px.
- **Minor 2 (focus ring on a nav link and the brand): ADDRESSED.**
  - `design-system.spec.ts:326-334`. The brand and the current nav link ("Find support", whose `aria-current` is asserted first) both go through `focusByKeyboard` and `ring`, and are compared with the same `focusRing` object as the other controls.
- **Minor 3 (real radio on /admin): ADDRESSED.**
  - `design-system.spec.ts:277-285` toggles "A phone call" and then "A website" until "Source web address" is visible.
    - The phone-then-website order is deliberate: with no hydration an already-checked radio makes `.check()` a no-op that fires no change event.
    - The field then enters the textbox 44px loop (lines 287-297). It is a `type=url` input, so its role is textbox.
  - Lines 305-308 keep the radio label-height and `accent-color` assertions on the real radio. The injected fixture is gone.
  - The textbox loop does not name the new field. If it ever failed to render, the loop would still pass because the `toPass` visibility check comes first. That is acceptable.
- **Minor 4 (support.ts comment): ADDRESSED.**
  - `tests/browser/support.ts:5-10` names the Turbopack dev cache, Next 16.4 answering HMR subscribe with "restart", vercel/next.js#100251 and PR #15. That matches `next.config.ts:5-7` (which already cites #100251).
  - It says the override stays in PR A and PR B removes it. DS-10 and DS-11 agree.
- **Minor 5 (stale docs line): ADDRESSED.**
  - `docs/DESIGN_SYSTEM.md:336` now carries the suggested text verbatim. No other `--ink`, Arial, "later UI PR" or "changes no code" lines remain in that file.
- **Minor 7 (forced-colors underline on the current nav link): ADDRESSED.**
  - `src/app/globals.css:138` adds `nav a[aria-current=page] { text-decoration:underline; text-decoration-thickness:2px; }` inside the existing forced-colors block.
  - Specificity (0,1,2) beats `nav a { text-decoration:none }` (0,0,2).
  - Test: `design-system.spec.ts:370-374` asserts `text-decoration-line` is `underline` for "Find support" and `none` for "My profile".

## Deviation verdicts

**(a) `hydratedTest` and the blocking override: SOUND. Nothing in PR A is broken or misleading because of it.**
- `hydratedTest = base` (`support.ts:21`) is Playwright's unextended `test`. Mixing it with the extended `test` in one spec file is supported, and each test has its own page, so there is no cross-test effect. `workflow.spec.ts` imports nothing from `./support`, so it already runs un-overridden.
- The retry loop in the controls test (`spec:281-285`) is correct for the failure mode it targets. A click before hydration changes only the native state, and the loop re-toggles until React state shows the field. It has a 20s budget under the 60s test timeout (`playwright.config.ts:5`).
- I audited every other design-system test that uses the overridden `test` (16 of the 17). None interacts with React-controlled state, so none reports a false pass for state.
  - **Controlled-state controls:** the only React-state-driven controls are in `ResourceForm` (the source radios and the organization select), and only the controls test touches them.
  - **Clicks that do happen:** "Enter as X" posts a plain form to `/api/dev-session` (`sign-in/page.tsx:6`). "Apply" is a server-action form in a Server Component layout (`layout.tsx:20`) and `selectOption('es')` acts on an uncontrolled `defaultValue` select. Both work through progressive enhancement, with no JavaScript.
  - **Other tests:** the remaining tests only read computed style, geometry, focus rings or tokens, or inject DOM.
  - **The JavaScript-disabled test** uses its own context and is unaffected.
- Limitation, not breakage: with the socket blocked and hydration not starting, those 16 tests measure the server-rendered DOM only. That is the same condition as before this wave, and the layout and CSS assertions are the same for the hydrated DOM. Hydrated-page axe coverage today comes only from `workflow.spec.ts`. See Out-of-Scope Observations.

**(b) `:where()` keeps the same computed styles: CONFIRMED.**
- Specificity changes, current file:
  - `label:where(:has(...))` goes from (0,1,2) to (0,0,1), the same as the base `label` at line 115. The `:has` rule is later, so it wins on `display`, `margin-block` and `font-weight`, as required.
  - `input:where([type=checkbox],[type=radio])` goes from (0,1,1) to (0,0,1).
  - `input:where(:not(...))` goes from (0,1,1) to (0,0,1).
  - The `fieldset > label:where(...)` rule is (0,0,2).
- Rules that touch `input`, `select`, `textarea`, `label` or `button` after those lines, or that could compete with them:
  - `input[readonly]`, `textarea[readonly]` (line 120) and `[aria-invalid=true]` (line 121) are (0,1,1). They won before by order and win now by specificity, which is stronger. The properties they set (`background`, `border-color`) are unchanged.
  - `textarea` (line 122) is (0,0,1) and later than `select, textarea` (line 119). It already won on `min-block-size`, `padding-block` and `resize`, and it still does.
  - `.language select { inline-size:auto }` (line 87) and `.language label` (line 86) are (0,1,1) and beat the base rules before and after.
  - `.card > :first-child` is (0,2,0) and still zeroes a first-child label's top margin. The `.card > input[type=hidden]:first-child + *` rule behaves the same way.
  - The `button` rules (lines 126-132) are untouched, and no `button` rule matches an input.
- The only rules that newly win are future single-class component rules, which is the stated intent of I2. No existing later rule changes the outcome, and no rule applies to checkbox or radio inputs beyond line 118.
- The ordering effect of `:where(:not(...))` and `:where(:has(...))` is correct. Both are valid, forgiving selectors, and an engine without `:has()` drops the rule exactly as before.

## New Breakage in the Fix Diff

None at Critical or Important severity.

Minor notes, no action required:
- `tests/browser/support.ts:21`: `hydratedTest` is a bare alias of `base`. That is fine for a one-PR bridge, and DS-11 removes it together with the override.
- `tests/browser/design-system.spec.ts:547`: the "gap between two options is under 1px" check also passes if the options wrap into columns (the gap goes negative). It is only meaningful at 360px, where the test pins the viewport.

## Out-of-Scope Observations

1. **The 16 overridden design-system tests run against a non-hydrated page.**
   - The axe and reflow test (`design-system.spec.ts:216-237`) audits only server-rendered `/admin`, `/profile` and so on. When PR B removes the override (DS-11), these tests will run hydrated for the first time.
   - Plan that Task 5 run to include the Next dev indicator (the dev "N" badge), the `loading.tsx` shell, and a hydrated axe pass over every audited route.
2. **Cold-compile flake.** PR #15 makes every browser run compile cold. The report records one flake, "Edit resource" heading not visible within 5s in `workflow.spec.ts`, which passed on rerun. `playwright.config.ts` sets no `expect.timeout`, so the 5s default applies. The `design-system.spec.ts` checks that follow a first-visit route load have the same exposure. Raising the timeout is a config change outside this track's boundary, and DS-11 already covers it.
3. **`fitsWidth` still compares `scrollWidth` with `window.innerWidth`** (`support.ts:115`). This is Minor 9, which DS-10 accepted or deferred.
4. **Gate evidence not re-verified.** Per the brief, I did not re-run the e2e, unit, build, typecheck or lint gates, and accept the report's numbers.

## Verdict

All findings addressed, no new Critical/Important breakage
