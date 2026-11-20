# Task 4 review: Get help now (c60b638..1714552)

Method: read-only. I read the diff once, then the live files the diff touches (get-help-now.tsx, globals.css, button.tsx, error.tsx, the DESIGN_SYSTEM sections, ADR-0007 section 2). I did not run tests or git. The test results quoted below are the implementer's, not mine.

## Spec Compliance: ✅ (matches the brief; four documentation or polish gaps, no functional defect)

Checked against the brief line by line:

- Files: the 14 changed files are exactly the brief's list. `src/ui/forms.tsx` is untouched.
- Component: the markup for `Lines`, `disclosure`, `row`, `inline` and `OutageState` matches the brief. The icon attributes are identical to the exit icon's (`quick-exit.tsx:52`).
- CSS: all ten rules match the brief's table, one per line, tokens only, logical properties, no transition or animation added. The focus ring rule is untouched.
- Strings: all six strings match the brief's table in both languages. `crisis` is removed from both catalogs. EN and ES key sets are identical.
- Placements: the footer, the Profile row (between `ProfileForm` and the delete form), the `/` outage state, `error.tsx` and the catalog all match.
- DS-21: `key={locale}` on the header select.
- DS-18: nothing is pushed.

Named risks:

1. **Numbers and links: ✅.**
   - `helpNumbers` is `988 -> tel:988`, `911 -> tel:911`, `1-800-799-7233 -> tel:+18007997233`, `211 -> tel:211`, in the section 5.6 order.
   - Each number is plain text in a `<span>`, with no `user-select` rule anywhere.
   - Each call button is `button button-secondary`. `.button` has `min-block-size: var(--size-target)`, and `--size-target` is 44px.
   - The unit test asserts the order. The browser tests assert text, hrefs, order and 44px.
2. **Quiet by design: ✅.**
   - `<details>` has no `open` attribute and no script. Only native `summary` toggling can open it.
   - No new transition or animation. The `.button` color transition already existed, and reduced motion zeroes it.
   - `getHelpNow` appears in no top bar. The header is unchanged, and the browser test asserts the banner has no "Get help now" text.
   - No heading or card appears in `main` on category results. The only seeker-page surfaces are the closed footer disclosure and the Profile row.
3. **Error and outage: ✅.**
   - `error.tsx` returns `<><section role="alert">...</section><GetHelpNow variant="inline"/></>`, so the card is outside the alert. The unit test also guards `indexOf('</section>') >= 0`, so it cannot pass vacuously.
   - `/` renders `<OutageState/>` when `!available`.
   - `t.crisis` has no remaining reference in `src/` or `tests/`. The only remaining uses of the word are the two `'crisis' in en/es` assertions and unrelated prose. The only thing that rendered it was the footer, and the footer now renders the closed disclosure, so nothing renders nothing.
   - `unavailable` is used nowhere else, so no other outage surface was missed.
4. **Strings: ✅.** See the collision notes in Issues, item 6.
5. **CSS and accessibility: ✅.**
   - The raw-color guard (`design-system.spec.ts:403`) reads all of `globals.css`. The new rules add no hex or color function.
   - The icon is `aria-hidden="true" focusable="false"`.
   - On `/`, the outline is h1 then the card's h2. On `error.tsx`, it is h1 (inside the alert) then the card's h2. Both fit.
   - `.get-help-inline h2` (0,1,1) beats the global `h2` margin. `.get-help-inline .button-secondary:not(:hover, :active)` has specificity (0,3,0) and beats `.button-secondary` (0,1,0).

⚠️ items (detail under Issues):

- ⚠️ DESIGN_SYSTEM section 9 and the section 11 mockups row now contradict the Interim bullet.
- ⚠️ Section 5.6's "Use it only" list does not include the error page, but `error.tsx` renders the inline card (plan-mandated).
- ⚠️ The new ARCHITECTURE sentence credits browser tests with checking the outage and error screens. Those are covered only by Vitest and the catalog sample (plan-mandated).
- ⚠️ DS-21 did not reproduce, so that fix has no failing-first evidence, and its test comment states a mechanism the implementer disproved.

## Strengths

- The numbers, hrefs, order and copy match the brief exactly. The tests assert order, text, `href`, 44px height and "not `user-select: none`" directly.
- The disclosure needs no JavaScript. `get-help-now.tsx` has no directive, and `button.tsx` is already directive-free for the same reason, so the server layout and the client `error.tsx` both import it safely.
- The unit test for the error page cannot pass vacuously. The `indexOf('</section>') >= 0` guard was added to the brief's assertion.
- The browser tests check behavior, not implementation: running animations are 0, forced-colors border style and width, reduced-motion `transitionDuration`, call-link right edge at 320px, and the Spanish names.
- New catalog keys replaced the `crisis` line in place, away from the end of the file where slice 2c appends. That reduces textual conflicts.
- The report is honest about DS-21 not reproducing, and about the narrow-layout wrap.

## Issues

### Critical

None.

### Important

None. Nothing found makes the numbers, links, quietness or the alert separation untrustworthy.

### Minor (recommended to fold in before the PR; the first two are small)

1. **A hyphenated crisis number can break across lines (the point you asked me to judge).**
   - Where: `src/ui/get-help-now.tsx:31` (the `<span>` text) and `src/app/globals.css:158` (`.help-lines li`).
   - What is wrong: `1-800-799-7233` has two hyphen break opportunities. At the dominant phone widths (360 to 375px) the footer text "National Domestic Violence Hotline: 1-800-799-7233" fills the first line and wraps as `1-800-799-` then `7233`.
   - Why it matters: this is the line a person may read aloud or copy down quickly. The one-tap button and the selectable text still carry the full number, so the number is not wrong. It is a readability defect on the most common phone width, not a trust defect. I rate it Minor, and I would still fix it now because the fix is about six lines.
   - Fix: wrap only the hyphenated number in a nowrap span, and leave the button alone.

     ```tsx
     // get-help-now.tsx, in Lines
     function Line({ template, phone }: { template: string; phone: string }): React.JSX.Element {
       if (!phone.includes('-')) return <>{template.replace('{phone}', phone)}</>;
       const [before, after] = template.split('{phone}');
       return <>{before}<span className="phone">{phone}</span>{after}</>;
     }
     // <span><Line template={text.helpLines[key]} phone={phone} /></span>
     ```

     ```css
     .help-lines .phone { white-space:nowrap; }
     ```

   - Why this shape:
     - It does not touch the brief's unit-test strings. `'Suicide &amp; Crisis Lifeline: call or text 988'` and `'>Call 1-800-799-7233<'` still match, because only the hyphenated number gets the span.
     - `li > span` text assertions use `textContent`, so they are unchanged.
     - Do not put `white-space: nowrap` on the call button. In the Profile row at 320px in Spanish, the button "Llamar al 1-800-799-7233" is about 245px against about 254px of room. With nowrap it would overflow on any text-spacing override (WCAG 1.4.10 and 1.4.12) instead of wrapping. The nowrap belongs on the number inside the sentence, where the sentence can wrap before it.
   - Test to add: in the footer test at 360px, assert the dv number's `getClientRects().length === 1`.

2. **Docs: section 9 and the section 11 row contradict the new Interim bullet.**
   - Where: `docs/DESIGN_SYSTEM.md:330` says 'help in a consistent place (3.2.6: "Get help now" is always in the menu)', and `:376` says "Menu only: chat drawer, Profile, desktop sidebar".
   - Answer to your question: yes, make them consistent. The Interim bullet at `:238` cites "(§9, WCAG 3.2.6)" as its authority, yet section 9 says the opposite.
   - Why C13 is not the reason: C13 (`CONSTITUTION.md:29`) governs new tables, environment variables, routes, dependencies and flags, and this task adds none. The reason is that section 9 is the acceptance-criteria table, and a later reviewer could fail the footer against it.
   - Fix:
     - `:330`: append "; until those menus exist, it is in the footer of every page (§5.6)".
     - `:376`: the mockups row still describes the target design correctly, so only add "(interim: footer, §5.6)" to the "This document" cell.
   - Optional: ADR-0007 section 2 still says Get help now "lives only in the menu". Consider a one-line note naming DS-17 as the interim, since DS-17 is not recorded anywhere in `docs/`.

3. **Docs: error-screen coverage is overclaimed and under-specified (both plan-mandated).**
   - `docs/ARCHITECTURE.md:67` says "Browser tests also check ... that the footer, Profile and outage and error screens list 988, 911, ...".
     - In fact, the footer and Profile are checked in the browser.
     - The outage state and the error page are checked only in Vitest (`renderToStaticMarkup`), and the browser sees only the catalog sample of the inline card.
     - `page.tsx`'s `!available ? <OutageState/>` wiring is never executed by any test.
     - Fix: reword to "Browser tests check the footer and Profile; unit tests check that the outage state and error page list ...". This matters under AGENTS.md's rule to say honestly what is untested.
   - `docs/DESIGN_SYSTEM.md:241-243` (the inline variant "Use it only") lists the chat reply and OutageState/Offline, but not the error page. `error.tsx` now renders the card, and README and ARCHITECTURE say "outage and error screens". ADR-0007 section 2 names "outage and offline", though ADR-0005:48 does name error screens.
     - Fix: add "the error page, which stands in for an outage".

4. **DS-21 test comment states a mechanism the implementer disproved.**
   - Where: `tests/browser/safety.spec.ts:541-542`, "The layout persists across the action's redirect, so a select that only sets defaultValue is reset...".
   - What is wrong: the report's own probe found the header and the select are remounted, so the comment describes behavior that does not occur. The test passed before the fix, so it is a guard, not a regression test.
   - Fix: reword to "Guards against the select keeping the language it was first drawn in. The bug did not reproduce in dev; `key={locale}` is the guard (DS-21)". Optionally run the same steps once against `next build` plus `next start`, since only the dev server was probed.

5. **Alignment of the call buttons at narrow widths (plan-mandated, cosmetic, no change needed).**
   - Where: `src/app/globals.css:158`.
   - With `flex-wrap` plus `space-between`, a button sits at the right when its line fits (911, 211) and at the left, under its text, when the label wraps (988, dv). The rows therefore look uneven at 360px.
   - Do not "fix" this with a two-column grid. A `1fr auto` grid would leave about 31px for the dv text at 320px.
   - If the founder dislikes it, the least risky change is `.help-lines li > span { flex:1 1 16rem; }`, which makes all four buttons drop under their text together below about 16rem plus the button width.
   - Leave it for now.

6. **Merge notes for slice 2c, and `Messages`.**
   - JSON keys:
     - Added: top-level `getHelpNow`, `call` and `helpLines`, right after `tagline`. Removed: `crisis`.
     - The names a parallel slice could plausibly re-add are `call` (DESIGN_SYSTEM section 7 lists "Call {phone}" for Detail and ContactActions) and `getHelpNow` (the Features and Profile rows).
     - Danger: a clean textual merge of two additions at different positions produces duplicate JSON keys. The last key silently wins, and the `Object.keys(es)` equals `Object.keys(en)` parity test cannot see duplicates.
     - Action after rebase: scan both catalogs for duplicate keys. Run `gate test tests/safety-ui.test.ts` afterwards.
   - Long single-line TSX: `error.tsx`, the `return` in `profile/page.tsx`, the `return` in `page.tsx` and the long footer and select lines in `layout.tsx` are each one line. Any slice that edits the same line will conflict textually, so expect hand merges in `page.tsx` (slice 3's Seek) and `profile/page.tsx` (slice 2c's ProfileForm). The edits here are small and easy to re-apply.
   - Local `Messages` type (`get-help-now.tsx:5`):
     - Acceptable. The brief and the global constraints allow a local declaration until slice 3's `listing-text.ts` is on `main`. It is not in this tree (`src/ui` has no `listing-text.ts`), and `Messages` is declared nowhere else.
     - Add a one-line comment pointing at `listing-text.ts`, so the later swap is not forgotten.
     - `typeof es` is assignable to `typeof en` only while the two stay in key parity, which the existing test enforces.

7. **Smaller notes (no action needed).**
   - `list-style: none` on `.help-lines` drops list semantics in Safari and VoiceOver. The brief omits `role="list"` on purpose. Adding `role="list"` is harmless if you want to keep the "four items" announcement.
   - Profile and the error page each show two "Get help now" surfaces: the footer disclosure and the row or card. The brief mandates this, and the names are distinct by landmark.
   - The catalog description gained one sentence not in the brief. It is fine.

## Tests I would run (not run by me)

- After the nowrap change: `gate test:e2e tests/browser/safety.spec.ts -g "Get help|footer panel|320px"` and `gate test tests/safety-ui.test.ts`. Add the 360px single-line assertion first and confirm it fails (red), then confirm it passes.
- After the rebase onto `main` with slice 2c: `gate test tests/safety-ui.test.ts` plus the duplicate-key scan of `en.json` and `es.json`, then `run typecheck`.
- Optional, for DS-21: run `gate build` and then the language steps against `next start`.

## Assessment

Task quality: Approved. The numbers, links, order, closed and still disclosure, alert separation, strings and CSS all match the brief, and I found no functional defect. Fold in the number nowrap (item 1) and the docs fixes (items 2 to 4) before the PR. They are small and mechanical, and none changes what the task is.
