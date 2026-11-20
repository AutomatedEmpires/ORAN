# Task 4 review: Blend top-bar header with domain navigation

Range reviewed: 0eef01d..a18a679 (one commit). Read-only review of the diff, the brief, the global constraints, the report and DESIGN_SYSTEM §5.1/§9. I did not re-run tests or git. Where a claim depends on a test run, I say so.

## Spec Compliance: ✅

Every item in the brief is present and matches. The five named risks are all clear. Two optional improvements and one test gap are under Minor.

Risk 1, brief table vs CSS. Every row checked against the diff:
- `header`: flex wrap, centered, `gap:var(--space-2) var(--space-4)`, `min-block-size:var(--size-topbar)`, `padding-block:--space-2`, `padding-inline:--space-4`, `--color-surface`, `border-block-end:1px solid var(--color-border)`. Matches.
- `.brand`: inline-flex, centered, gap `--space-2`, `min-block-size:--size-target`, `--color-primary`, no underline. Matches, plus the declared `min-inline-size` (judged below).
- `.brand-name`: lg size and line height, heavy, `letter-spacing:0.06em`. Matches.
- `.brand-name` below 380px: `@media (width < 380px)` applies the full clip pattern (absolute, 1px box, -1px margin, `overflow:hidden`, `clip-path:inset(50%)`, `white-space:nowrap`, `border:0`). No `display:none` anywhere in the file (grep).
- `.logo-tile`, `.logo-sun`, `.logo-rays`, `.logo-horizon`: fill, fill, stroke, stroke with primary, accent, accent, on-primary. Matches.
- `.language`: flex wrap, centered, gap `--space-2`, `margin-inline-start:auto`. Label is inline, margin 0, sm and semibold. Select has `inline-size:auto`. Button has margin 0. Specificity beats `form > button`, the global `label` rule and the `input,select` rule, so every override applies.
- `nav`: flex, wrap, `flex-basis:100%`, gap `--space-1`. Matches.
- `nav a`: all listed properties present, including the `1px solid transparent` border that keeps edges in forced colors. Hover matches. `[aria-current=page]` is tint-strong, primary and heavy. It is declared after `:hover` at equal specificity (0,1,2), so the current item keeps its stronger tint on hover.
- `.local-notice`: the shorthand is written as `margin-block:--space-4 0` plus `margin-inline:max(--space-4,(100% - --size-chat-column)/2)`. That is equivalent to the brief's shorthand and keeps the logical-properties rule. Flex, wrap, centered, gap `--space-2 --space-3`, sm size. The link is inline-flex with a 44px minimum. The form is inline and the button has margin 0. It sits after `.notice` in the file, so `.notice`'s `max-inline-size:none` and `margin-block` lose at equal specificity. This is the M6 fix.
- `footer`: same `max-inline-size` and centering as `main`, padding `--space-6 --space-4`, `border-block-start`, sm size and line height, secondary. Matches.
- `.visually-hidden`: standard clip pattern. Matches.
- DOM order in `layout.tsx` is brand link (LogoMark, `.brand-name` "ORAN", `{' '}`, `.visually-hidden` `t.brand`), then `form.language`, then `DomainNav`. A grep of `globals.css` finds no `order:` property, so DOM order is visual order and tab order. The nav sits on row 2 only because of `flex-basis:100%`.
- `LogoMark` geometry (hand-checked): 28x28, `viewBox="0 0 28 28"`, `aria-hidden`, `focusable="false"`, `rx="8"`. The sun arc `M8 18a6 6 0 0 1 12 0z` is centered at x=14 with r=6, and sweep=1 draws the upper half. The horizon runs x=6 to 22 at y=18. The three rays start 2px beyond the sun's radius and end at radius 10, symmetric about x=14. Stroke is 1.5 with round caps. No raw colors.

Risk 2, aria-current. `src/ui/nav.tsx:209` uses exactly `item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')`. `/admin-x` and `/adminx` do not match `/admin` because the prefix test includes the slash, and `/` is matched exactly. The component is `'use client'`, which in the App Router still renders on the server, so the attribute is in the HTML without JS. The layout is dynamic (async, reads cookies), so `usePathname()` is a real string at SSR. The JS-disabled test (`design-system.spec.ts:308-332`) asserts this directly, including `/admin/anything` marked and `/adminx` not. I did not re-run it. The report says it passed (19/19 e2e).

Risk 3, accessible names. Brand link name: "ORAN" + `{' '}` + `t.brand` ("Open Resource Access Network", en.json:2) gives "ORAN Open Resource Access Network". The SVG is `aria-hidden`. The visible "ORAN" is a prefix of the name, so SC 2.5.3 holds. Below 380px the wordmark is clipped, not removed, so the name survives. The nav is `aria-label={t.navigation}` = "Main navigation" (en.json:22). Spanish is "Navegación principal".

Risk 4, bootstrap `:root` leftovers. The deleted line was `:root { --line; --muted }`. A grep over `src/` finds no `--ink`, `--accent`, `--paper`, `--line` or `--muted`. The only hits are the `--line-height-*` tokens, which are false positives. A repo-wide grep finds no `var(--line|muted|ink|accent|paper)`. The only other mentions are the test's own empty-value assertion and DESIGN_SYSTEM.md:336 (see Minor 4). Every token the new rules read exists in `:root` (checked 21 names).

Risk 5, global layout. `layout.tsx` changes are limited to two new imports, the header block, and `button-compact` on the notice's sign-out button. `<main>`, the footer markup, the providers and the skip link are untouched. No `<header>`, `<nav>` or `<footer>` element exists in `src` outside `layout.tsx` and `nav.tsx`, so the new element selectors have no stray targets today. Classes used by pages (`eyebrow`, `small`, `notice`, `card`, `grid`, `stack`, `tag`, `lede`, `secondary`, `button-compact`) are not touched by this diff. Removed rules (`.brand span`, old `nav`, `nav a`, `header`, `footer`, `.local-notice form/button`, `@media(max-width:760px)`) are used only by the layout. `workflow.spec.ts` has no locator on the header, nav, brand or footer.

Other checks:
- File boundary is respected: six files, all in the allowed list. No `forms.tsx`, `resources.tsx`, `src/server/*`, JSON catalogs or `workflow.spec.ts`.
- C18: no new seeker string. "ORAN" was already hardcoded in the old brand link.
- C2: the nav labels and order are unchanged, and nothing links to the catalog.
- The ARCHITECTURE.md sentence is verbatim as the brief gives it.
- DS-8 and DS-9: no push or PR, and no screenshot spec in the commit.
- The Step 1 test assertions are all present. The RED note is credible: the first assertion (banner background) fails earlier than the brief expected.

⚠️ The declared addition, `.brand { min-inline-size: var(--size-target) }`: approved. Below 380px the link would otherwise be 28px wide and fail §9 (44x44 on every interactive element). It is token-based and logical. At 380px and above the link is already about 100px wide, so it has no effect there. The brief's table did not know the wordmark would leave the link only 28px wide. One optional polish: the 28px mark sits at the start of a 44px box, so the focus ring extends 16px past the mark on one side. Centering would shift the mark off the 16px gutter, so leaving it is also reasonable. No test covers the addition (Minor 1).

## Strengths

- The M6 fix is the correct cause, not a specificity hack. The `.local-notice` rule is ordered after `.notice`. The test measures real geometry in a real layout, and the report shows a before/after negative control (x=0, width 1096 before; x=260, width 760 after).
- The margin math for alignment works at every width. The notice margin equals `max(16, (vw-760)/2)`, and the main content box starts at the same offset.
- The nav has the forced-colors border and a hover/current cascade order that holds. The nav works with no JS, and a dedicated JS-disabled test proves it, including both path-boundary cases. That test is an extra the brief did not ask for.
- The test suite catches stale tokens. It asserts the old custom properties are empty, and every declared property must be documented or derived. A `declared.size > 50` guard stops the regex from silently matching nothing.
- The diff is small (about 65 authored non-test lines) and uses only tokens and logical properties. The raw-color guard stays green by construction.
- The report's disclosures are honest and match the diff: the 4-row Spanish header at 320px, the footer hairline at content width, and weight-only current-page cue in forced colors.

## Issues

### Critical
None.

### Important
None.

### Minor

1. `tests/browser/design-system.spec.ts:~459-473` (Spanish reflow test) and `:~403-450` (header test): nothing tests behavior below 380px. The `reachable` list leaves out the brand link. No assertion checks that the link keeps the exact name "ORAN Open Resource Access Network" at 360px, that it is at least 44x44, or that it was not changed to `display:none`. This matters because Review Focus 1 and risk 3 are about this range, and the declared `min-inline-size` addition has no coverage. If someone swaps the media rule for `display:none`, nothing fails; the name would silently become "Open Resource Access Network".
   Fix: in the 320/360 loop, add `const brand = page.getByRole('link', { name: 'ORAN Open Resource Access Network', exact: true })`, then `await expect(brand).toBeInViewport()` and `expect((await brand.boundingBox())?.width).toBeGreaterThanOrEqual(44)`. The Spanish locale name is "ORAN Red de Acceso a Recursos". Tighten the notice assertion too: `expect(notice?.width).toBeCloseTo(760, 0)` instead of `<= 792`. As written, a notice 792px wide that overflows main's right edge would pass.

2. `src/app/globals.css:89` (`nav a[aria-current=page]`) in forced colors: the tint is dropped, so the current page differs from other items only by weight 800 versus 600. The report discloses this. It is not a failure, but a one-line `@media (forced-colors: active) { nav a[aria-current=page] { border-color: CanvasText } }` would give a real cue and uses a system color, which the constraints allow. It can wait for the sticky TopBar work. It is already on the report's deferred list.

3. `src/app/globals.css:75, 86-89, 131` (plan-mandated): `header`, `nav`, `nav a` and `footer` are bare element selectors, as the brief's table specifies. Today they match only the layout's elements. A slice 2 page that adds its own `<header>`, `<nav>` (pagination, breadcrumbs) or `<footer>` inside content would pick up the white 56px bar, the 44px pill links or the content-width footer rule. The old rules had the same exposure, so this is no regression. I could not check the slice 2 branch (no git). Before the rebase, grep that branch's `src/` for `<header|<nav|<footer`. If any appear, scope the selectors as `body > header`, `header nav` and `body > footer` in a follow-up. Do not change them here.

4. `docs/DESIGN_SYSTEM.md:336` is now stale. It says the current development styles (`--ink`, `--accent`, Arial) are "bootstrap-only and will be replaced; this document changes no code". They are gone. That file is outside this track's boundary (value changes only), so add the sentence to the deferred list for the PR description. Do not edit it here.

## Assessment

Task quality: Approved. The CSS, markup, `aria-current` logic and accessible names match the brief value for value, the bootstrap `:root` is fully gone with no dangling references, and the layout change is confined to the header and notice. Minor 1 (a 360px brand-link assertion, which also covers the declared `min-inline-size` addition) is the only change worth making now. Items 2 to 4 belong on the deferred list.

Tests I would run, not run here because of memory:
- `design-system.spec.ts -g "header"` after adding the 360px brand assertion.
- The JS-disabled test on its own, `-g "without JavaScript"`.
- The full `test:e2e` through `run.ps1`, as the final gate.
