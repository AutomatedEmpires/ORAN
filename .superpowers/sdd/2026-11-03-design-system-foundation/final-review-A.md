# PR A final review: Blend tokens, Figtree and base styles

Range: 2ca4e86..a18a679 (5 commits). The review was read-only: I read the prepared diff, the plan (header, Global Constraints, Review Focus, Tasks 1–4, the deferred list), DESIGN_SYSTEM.md, the task 3 and 4 reports and reviews, progress.md (DS-1 to DS-9, X-2), the current globals.css, layout.tsx, the pages and forms, and 7 screenshots. Integration was checked with `git merge-tree` against origin/main, PR #15 and slice 2b. No tests were run. Every finding below is static or visual, and the implementers' gate evidence (e2e 19/19, vitest 43/43, build, typecheck, lint) is accepted as reported.

## Strengths

- **Token fidelity is enforced from both sides.** All 23 colors and 46 other tokens match §3 verbatim. Tests compare the served value to the computed value, check the source text, and derive the name sets from the document in both directions. A rename in either the CSS or the document fails a test.
- **The contrast test does real work.** It recomputes all 34 §3.2 pairs from the served colors. Each pair must equal the documented ratio to two decimals and meet its 4.5:1 or 3:1 threshold.
- **The cascade is deliberate and holds.**
  - State rules come after base rules.
  - `button:disabled:hover` (0,2,1) beats `.secondary:hover` (0,2,0).
  - `.local-notice` is ordered after `.notice`, so the M6 width fix needs no specificity bump.
  - `nav a[aria-current]` comes after `:hover`.
  - Logical properties are used throughout. There are no raw colors outside `:root`, and the guard test has negative controls.
- **Accessibility work goes past the brief, and each addition is proven:**
  - CanvasText for the error glyph under forced colors, with a probe test;
  - the wordmark clipped below 380px (not `display:none`), so the brand link keeps its name;
  - a 44px minimum width on the brand link;
  - a no-JavaScript `aria-current` test with path-boundary cases (`/admin/anything` is marked, `/adminx` is not);
  - a font-failure test that proves the failure happened (abort count above 0, and the 400 face reaches `error`).
- **Fonts match the budget.** I measured the four Latin woff2 files at 11,384 + 11,544 + 11,376 + 11,392 = 45,696 bytes, the plan's 45.7 KB. They are same-origin with `font-display: swap`. The Latin subset covers á é í ó ú ñ ¿ ¡ · — …, so Spanish renders in Figtree.
- **Scope discipline.** Every changed file is inside the boundary. The authored lines number about 250, under the C17 target of about 400. There are no new seeker strings (C18), and the nav labels and order are unchanged (C2).
- **The visual result matches the Blend direction.** The screenshots show a white top bar with a hairline, the current item in teal tint, Figtree, 12px controls, and 14px soft-shadow cards on #F2F4F5. Spacing is consistent. The Spanish page at 320px reflows with every control reachable. Forced colors keep visible edges on the nav, buttons, fields and notice.

## Integration with main

- **Textual:** `git merge-tree --write-tree` is clean, with no conflicts, against origin/main 0efdf34 (PR #14), PR #15 c12a7bc (it also edits ARCHITECTURE.md, in a different paragraph) and slice 2b 7aa049b. Slice 2b is in progress in the main checkout. It changes only the database, migrations and tests, with no UI.
- **Semantic:**
  - Main's `source_type` radio fieldset and its conditional `source_url` field use only elements PR A already styles (the DS-7 radio rows and the field rule).
  - Main's new `workflow.spec.ts` steps find elements by role and label: `radio.check()`, `getByLabel('Source web address')`, and `accessible()`. Nothing in them depends on styles.
  - PR A's controls test still finds "Add resource", "Resource name" and "Sign out". `source_url` is absent when /admin loads, so it never enters the 44px textbox loop. It would pass, but it is untested (Minor 3).
  - The injected "Option" radio does not collide with the real radios.
  - The `.claude/**` ESLint ignore has no effect here.
- **First real runs:** the post-rebase full gate is the first time main's radio tests run under Blend styles. CI (Linux Chromium) is the first run of the 15 design specs outside Windows Edge. Both use the same engine, so the risk is low.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. The profile consent checkbox now reads as an 11th category.** `src/app/globals.css:116` sets `margin:0` on every checkbox and radio label. `src/app/globals.css:122` gives the fieldset only a top margin. `src/ui/forms.tsx:31` places the standalone consent label directly after `CategoryChecks`.
- **What's wrong.** The consent row sits flush under "Safety" with the same 44px rhythm. At 360px it looks like another need in the list (`after-es-360-profile.png`). At 1280px it looks like the grid's next row.
- **Before this PR** the fieldset's border and the label's 14px top margin set it apart (`before-en-360-profile.png`).
- **Why it matters.** It is a privacy consent on a seeker screen, and the PR introduced the regression. Screen readers still get it right, because the consent is outside the fieldset; sighted users lose the grouping. This is also a plan gap: the Task 3 table did not consider a standalone checkbox.
- **Fix:** keep standalone checkbox and radio labels spaced, and zero the margin only for rows inside a group:
  - line 116: `margin-block:var(--space-4) 0; margin-inline:0;` instead of `margin:0`;
  - add `fieldset > label:has(> input:is([type=checkbox],[type=radio])) { margin:0; }`.
  - Avoid the alternative of giving `fieldset` a bottom margin. The inline-flex Approve button keeps its own 16px top margin, which does not collapse, so the contributor card would get a 32px gap.
  - Add a test: on /profile at 360px, the consent label's top minus the last category label's bottom is at least 16px.

**I2. The base form-control selectors have class-level specificity.** See `src/app/globals.css:116-118`.
- `input:not([type=checkbox],[type=radio],[type=hidden])` and `input:is([type=checkbox],[type=radio])` are both (0,1,1), because `:not()` and `:is()` take their argument's specificity. The checkbox label rule is (0,1,2).
- **Why it matters (1): later components.** Any single-class component rule loses border, radius, padding, minimum size and background to these base rules. That includes the SearchField's inset outline, the Composer, the compact "Search chats" field, and any one-time-code fields. This is backwards for a foundation layer, and it is a plan-level trap: the plan's table specifies this selector.
- **Why it matters (2): Clerk.** Outside local mode, `/sign-in` renders Clerk's `<SignIn/>` inline (`src/app/sign-in/page.tsx:8`). Clerk's single-class styles would lose to these rules on its inputs and checkboxes. Its buttons would inherit `min-*-size`, `gap` and the transitions, and `button:hover` would give a teal fill to any button that has no hover rule of its own.
  - This is unverified: clerk-js loads from Clerk's CDN, and there are no credentials.
- **Fix:** use `:where()` so the base rules sit at element specificity:
  - `input:where(:not([type=checkbox],[type=radio],[type=hidden]))`, `input:where([type=checkbox],[type=radio])`, `label:where(:has(> input:is([type=checkbox],[type=radio])))`;
  - and, with I1, `fieldset > label:where(:has(…))`.
  - Every current computed style stays the same. `[readonly]` and `[aria-invalid]` then win by specificity rather than by order, and `.language select` is unaffected. Today's tests should stay green with no visual change.
  - Longer term, put the base element rules in `@layer base` so unlayered component and vendor CSS always wins. That fits PR B.
- Add "Clerk `<SignIn/>` inherits the global element styles" to the deferred Clerk item.

### Minor (Nice to Have)

1. **The header and brand test gaps from the task 4 review (Minor 1) are still open.** The fix wave already has them scheduled.
   - `design-system.spec.ts:466`: at 320 and 360, assert that the brand link has the exact name and is at least 44×44.
     - The EN name is "ORAN Open Resource Access Network"; the ES name is "ORAN Red de Acceso a Recursos".
   - `:443`: `toBeLessThanOrEqual(792)` passes a notice that overflows. Use `toBeCloseTo(760, 0)`.
2. **Review Focus 2 names header links, but no test focuses one.** The focus test at `design-system.spec.ts:315` covers the skip link, a filled button, a field and a checkbox. Add a nav link (12px radius, tint fill when current) and the brand link, using `focusByKeyboard` plus `ring`.
3. **The radio fixture is obsolete after the rebase.** `design-system.spec.ts:294-311` injects a radio, and its comment says "No page here has one yet". After the rebase, /admin has the real `source_type` radios.
   - Assert on `getByRole('radio', { name: 'A website' })` and its label row instead.
   - Check that radio first, so the conditional `source_url` field enters the 44px textbox loop.
4. **The support.ts comment names the wrong cause.** `tests/browser/support.ts:5-9` blames a log-file watch and points to "the DS-6 root-cause PR". PR #15 found the real cause: a restored Turbopack dev cache answers every HMR subscribe with "restart" (vercel/next.js#100251).
   - Update the comment to cite PR #15.
   - Keep the override in PR A, so the verified evidence stays valid. Remove it in PR B after one gated run passes without it.
5. **`docs/DESIGN_SYSTEM.md:336` becomes false when this merges.** It says the tokens arrive "in a later UI PR" and that the `--ink`/Arial styles remain.
   - It is a one-line fix, and Ruling DS-1 already has this track editing the file. Suggested text: "Tokens are CSS custom properties in the `:root` block of `src/app/globals.css`; `tests/browser/design-system.spec.ts` keeps them in step with §3."
   - If the boundary is kept, put it on the deferred list and in the PR text instead.
6. **The not-found link is not a 44px target.** `src/app/not-found.tsx` renders "Return to resource search" as a bare link about 24px tall, outside `.card a`. It meets WCAG 2.5.8 AA but misses the §9 rule of 44px on every target. The markup is out of bounds, so fold it into the deferred EmptyState item.
7. **Under forced colors, the current nav item differs by weight only** (`globals.css:92`). It is already on the deferred list, which is fine. If it is done now, a single rule in the existing forced-colors block works: an underline on `nav a[aria-current=page]`.
8. **The dev-notice "Sign out" button wraps at 1280px.** In `globals.css:105` the sentence is an anonymous flex item at its full width, so the button moves to its own row. Only `ORAN_LOCAL_DEV` shows the notice, so seekers never see it. Accept it. Fixing it needs a wrapper `<span>` and a flex basis, which is not worth it before the real TopBar.
9. **`fitsWidth` compares against the wrong width.** `tests/browser/support.ts:109` compares `scrollWidth` to `innerWidth`, which includes a classic scrollbar. `document.documentElement.clientWidth` is the strict comparison. Headless runs hide scrollbars today, so there is no false pass yet.

## Problems with the plan itself

- **The plan's selectors cause I1 and I2.** The Task 3 table specifies `input:not(…)`, which gives the (0,1,1) specificity, and `margin 0` on checkbox labels with only a top margin on fieldsets, which merges the consent row into the group.
- **Global Constraints say the 11 derived names are recorded in DESIGN_SYSTEM later.** Ruling DS-1 reversed this. So the deferred-list item "Record the 11 derived token names in DESIGN_SYSTEM §3.3 and §3.4" is now wrong; it should say "confirm".
- **Review Focus 2 lists header links, but no task's test covers them** (Minor 2).
- **Type is set in px.** §3.3 and the plan's "in px as written" use px, so text ignores the browser's default font-size setting. WCAG still passes, because zoom works. Sizing text in rem would honor the font-size setting of low-vision users. This is a founder or spec question, not part of this PR.
- **PR #15 makes every browser run compile cold.** It turns off the Turbopack dev cache for test runs. The default 5s expect timeout already flaked on a first compile (Task 1 note), so that risk grows. Watch for it. If it flakes, raise `expect.timeout` in `playwright.config.ts` in a separate small PR; that file is outside this track's boundary.

## The PR description

The controller's checklist needs these, with the gaps the task-4-report list leaves:

- **The font decision.**
  - The package is `@fontsource/figtree` 5.3.0, pinned, OFL-1.1, with four static Latin weights (400/600/700/800).
  - The four woff2 files total 45,696 bytes (45.7 KB) and are served same-origin from `/_next/static/media`. The `.woff` fallbacks are emitted but never downloaded by current browsers.
  - Tests prove that no Google Fonts request is made and that text falls back when the files fail.
  - Rejected options: next/font/google, next/font/local, and the variable font. The variable font is the open founder question (20.2 KB instead of 45.7 KB).
- **The 11 derived names**, for the founder to confirm under C21: `--line-height-{xs,sm,md,lg,xl}` and `--layer-{bar,map-overlay,sheet,drawer,dialog,toast}`. Say plainly that Ruling DS-1 already recorded them in DESIGN_SYSTEM §3.3 and §3.4, so this PR edits the approved document, which the plan had said it would not.
- **Screenshots:** attach them to the PR; do not commit them (AGENTS §6). A representative set:
  - `before`/`after-en-1280-home`
  - `after-es-320-home`
  - `after-en-360-admin`
  - `after-es-360-profile`
  - `after-en-1280-home-forced-colors`
  - Note that the "before" shots use the fallback font, because they predate Figtree.
- **A note that no screen other than the layout changed markup.** Plan Step 6 requires it, and the controller's list leaves it out.
- **Known visual differences:**
  - The Spanish header at 320px has four rows, about 260px.
  - The footer hairline spans the content width, while the header hairline spans the full viewport.
  - The dev notice's button wraps at 1280px.
  - Under forced colors, the current nav item differs by weight only.
- **Test evidence:** 19/19 e2e on Windows Edge. CI on Linux Chromium is the first other-platform run.
- **The deferred list, with these additions to task-4-report.md's list:**
  1. Reword "Record the 11 derived token names" as "Confirm the 11 names already recorded (DS-1)".
  2. Turn the footer crisis sentence from an "open question" into the committed DS-2 follow-up: collapse it into a quiet "Get help now" disclosure that needs a new EN/ES string. The founder direction is resources, not crisis care.
  3. `DESIGN_SYSTEM.md:336` is stale, unless Minor 5 is fixed here.
  4. Scope the bare `header`, `nav`, `nav a` and `footer` selectors (`body > header`, `header nav`, `body > footer`) before any page content adds those elements (task 4 review, Minor 3).
  5. Remove the support.ts Fast Refresh override once PR #15 has merged and one gated run passes without it (DS-6).
  6. Clerk `<SignIn/>` outside local mode inherits the global element styles as well as making font requests. Check both once credentials exist (I2).
  7. The not-found "Return to resource search" link is about 24px tall. Fold it into the not-found EmptyState item.
  8. WCAG 1.4.12 text-spacing and 400% zoom are §9 budgets with no test yet.
  9. If I1 or I2, or the radio test swap in Minor 3, is not fixed in the fix wave, list it.

## Declined to judge

- **The a18a679 trailer reads "Claude Sonnet 5.5".** The controller accepted it, and it names the model that wrote the commit.
- **The footer crisis sentence still shows on every page.** The DS-2 follow-up handles it, as the founder directed, and it is already quiet (sm, secondary).
- **The header is 4 rows (about 260px) in Spanish at 320px.** The plan specifies this layout, the header is not sticky, and the sticky TopBar is deferred.
- **The desktop header has two rows, with no SideNav or tab bar.** C2 and the plan defer them until those screens exist.
- **The language form comes before the nav in tab order.** The plan requires DOM order to match visual order, and it meets WCAG 2.4.3.
- **The checkbox is centered against a two-line label** ("Acepto guardar…" at 360px). It is cosmetic, and top alignment would need off-scale padding to keep single-line rows centered.
- **The footer hairline is narrower than the header's.** The plan specifies it.
- **`:has()` and range media queries need modern browsers** (Baseline 2023). Older browsers degrade to plain block labels and a visible wordmark, with no loss of content.
- **Font swap can shift layout, because there is no metric-adjusted fallback face.** `--font-family-base` must match the spec verbatim. Measure it with the LCP and CLS budget work.
- **OFL notice in the built font assets.** That is a legal reading, not a code review. The package carries the license, and the woff2 name tables carry the notice.
- **"Main navigation" repeats the landmark role, so screen readers may announce "navigation" twice.** It is an existing catalog string, and C18 forbids new strings here.
- **No domain is marked current on `/resources/[id]/edit`.** That is a reasonable path rule, and the plan specifies it.
- **`<Link>` prefetch cost on slow connections.** It is unchanged from before this PR and is Next's default.
- **`.visually-hidden` is duplicated inside the 380px media query.** CSS cannot compose classes, so the copy is the simplest option.
- **The redundant `derivedTokens` list, the unscoped verbatim-text test, and `contrast()` parsing only #RGB/#RRGGBB.** These are the Task 1 deferred minors. They are harmless, and the last one throws loudly if it ever matters.
- **The raw-color guard misses named colors and could falsely match a hex-like ID selector such as `#add`.** The plan sets its scope, and lint is deferred to stylelint or D6.
- **The logo keeps its own colors under forced colors.** It is decorative and `aria-hidden`.
- **The postal-code `.tag` is now plain, unlabeled secondary text.** The plan specifies "no pill", and the ResourceCard anatomy is deferred.
- **The Spanish brand string drops "Abierto".** It is an existing string, and the native-speaker review is pending (D10).

## Recommendations

1. In the fix wave, make I1 and I2 (about 3 CSS lines plus 1 test) and Minors 1–3. Optionally do Minor 5 and Minor 4's comment change. Then rebase on main, which brings in slice 2a and possibly PR #15, and run the full gate through `test-gate.ps1`. The gate must include `workflow.spec.ts`, which now has 6 tests.
2. Leave the support.ts override in place for this PR. Remove it in PR B with one gated run as the evidence.
3. Bring the "base styles in a layer" idea (`@layer base`) into PR B's design, before any component CSS is added.
4. Add "rem versus px for type" to the founder's open questions, at low priority.

## Assessment

**Ready to merge? With fixes.** The foundation is correct, well tested and inside its boundary, and nothing is critical. Two small CSS changes should land first: separate the profile consent row from the category list (I1), and lower the base-control specificity with `:where()` (I2). After them, add the scheduled test gaps, update the PR text as listed above, and run the full gate after the rebase.
