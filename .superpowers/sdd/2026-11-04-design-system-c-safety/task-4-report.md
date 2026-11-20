# Task 4 report: Get help now (PR C)

Status: DONE_WITH_CONCERNS (one ruling's premise did not reproduce; see Concerns 1)

Commit: `1714552 feat: offer Get help now on Profile, in the footer and on outage screens`
(trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; files staged by name; not pushed, per DS-18).
Worktree: `C:\Users\Cole0\AutomatedEmpires\Projects\oran\.claude\worktrees\design-foundation`, branch `claude/design-system-c-safety`.

## What was implemented

- `src/ui/get-help-now.tsx` (new, no directive, so server pages and the client error page both render it):
  - `Messages = typeof en` (slice 3's `listing-text.ts` is not on `origin/main`, checked with `git ls-tree`).
  - `HelpNumber`, and `helpNumbers` in the section 5.6 order: 988 `tel:988`, 911 `tel:911`, dv `1-800-799-7233` as `tel:+18007997233`, 211 `tel:211`.
  - Hand-drawn life-buoy SVG with the same attributes as the exit icon (two circles, r 9 and r 4, and the four-stroke path from the brief).
  - `<ul className="help-lines">` with, per number, a `<span>` of selectable plain text and an `<a className={buttonClassName('secondary')} href={tel}>`.
  - `GetHelpNow` with variants `disclosure` (default), `row` and `inline`. `disclosure` and `row` are native `<details>` (closed, no script, no animation); `inline` is `<div className="get-help-inline"><h2>`.
  - `OutageState` is `<p className="notice" role="status">` plus the inline card.
- Placements:
  - `src/app/layout.tsx`: the footer is now `<strong>{t.tagline}</strong><GetHelpNow text={t}/>`; the `<p>{t.crisis}</p>` sentence is gone. Also `key={locale}` on the language select (DS-21).
  - `src/app/profile/page.tsx`: `<GetHelpNow variant="row"/>` between `<ProfileForm/>` and the delete form.
  - `src/app/page.tsx`: `<OutageState/>` replaces the plain `t.unavailable` notice when `!available`.
  - `src/app/error.tsx`: returns a fragment, `<section role="alert">` unchanged, then the inline card outside it, so the alert announces only the error.
  - `src/app/dev/components/page.tsx`: the Safety section gets a row and an inline sample (`import en`, because the section is `lang="en"`), plus one sentence in its description.
- Strings: `crisis` deleted from both catalogs. `getHelpNow`, `call` and `helpLines` (`988`, `911`, `dv`, `211`) added in the place `crisis` occupied, not at the end of the files, so slice 2c's appends at the end cannot conflict with them. No existing key moved or reformatted. EN and ES have identical key sets (106 each, same order).
- `src/app/globals.css`: the ten rules from the brief, one per line, tokens only, logical properties, no raw colors, no new transition or animation, the focus ring rule untouched.
- Docs, as the brief words them:
  - DESIGN_SYSTEM 5.6: the Interim bullet, a sentence appended to Panel, a sentence appended to Inline.
  - DESIGN_SYSTEM 7: the GetHelpNow panel row.
  - DESIGN_SYSTEM 10: the QuickExit bullet.
  - DESIGN_SYSTEM 11: "the GetHelpNow panel;" removed from Copy.
  - ARCHITECTURE.md and README.md: the sentences from the brief.
- DS-21: `key={locale}` on the header select, and a browser test (see Concerns 1).
- Size: about 110 authored non-test lines (budget about 200).

## Tests

Final results through the gate, from the worktree root:

| Command | Result |
|---|---|
| `run typecheck` | exit 0 |
| `run lint` (`--max-warnings 0`) | exit 0 |
| `gate test` (all of vitest) | 7 files, 119 tests passed |
| `gate build` | exit 0 |
| `gate test:e2e` (all specs) | 56 passed (6.4m) |
| `gate test tests/safety-ui.test.ts` | 9 passed |
| `gate test:e2e safety + component-catalog + design-system` | 50 passed |

New unit tests (`tests/safety-ui.test.ts`, `describe('Get help now')`):
- gives every help number English and Spanish text;
- renders the outage state with the crisis numbers in order;
- keeps the crisis numbers outside the error alert.

New browser tests (`tests/browser/safety.spec.ts`, placed after "Exit follows the saved ..." and before the directory test, so the fresh-database ordering note still holds):
- every page ends with a closed Get help now in the footer (`/`, `/sign-in`, `/no-such-page`, `/profile`);
- the footer panel lists the four numbers as text and call buttons;
- Profile has a Get help now row before Delete;
- the outage card keeps visible edges and stays still;
- Exit and Get help now reflow at 320px in English and Spanish;
- the language select shows the chosen language after Apply, without a reload (DS-21).

`exitLink(page, name = exitName)` gained an optional name (backward compatible) so the Spanish name can be checked; `footerHelp(page, text)` is new.

## TDD evidence

RED, unit:
```
gate test tests/safety-ui.test.ts
 FAIL  tests/safety-ui.test.ts [ tests/safety-ui.test.ts ]
Error: Cannot find package '@/ui/get-help-now' imported from tests/safety-ui.test.ts
 Test Files  1 failed (1)    Tests  no tests
```

RED, browser:
```
gate test:e2e tests/browser/safety.spec.ts -g "Get.help|footer.panel|outage.card|language.select"
  5 failed, 1 passed (5.6m)
  safety.spec.ts:384 every page ends with a closed Get help now in the footer
  safety.spec.ts:404 the footer panel lists the four numbers as text and call buttons
  safety.spec.ts:436 Profile has a Get help now row before Delete
  safety.spec.ts:459 the outage card keeps visible edges and stays still
      expect(links).toHaveText(["Call 988", ...]) ... Received: [] ... "locator resolved to 0 elements"
  safety.spec.ts:487 Exit and Get help now reflow at 320px in English and Spanish
      waiting for getByRole('main').locator('summary').filter({ hasText: 'Get help now' })   (test timeout)
```
All five fail because the footer still shows the old sentence and no component exists. The one that passed was the DS-21 language test (see Concerns 1).

GREEN, unit: `gate test tests/safety-ui.test.ts` gives `Test Files 1 passed (1), Tests 9 passed (9)`. Full suite: `Test Files 7 passed (7), Tests 119 passed (119)`.

GREEN, browser: `gate test:e2e tests/browser/safety.spec.ts tests/browser/component-catalog.spec.ts tests/browser/design-system.spec.ts` gives `50 passed (2.9m)`. The full run gives `56 passed (6.4m)`.

## Files changed (14)

`src/ui/get-help-now.tsx` (new), `src/app/layout.tsx`, `src/app/profile/page.tsx`, `src/app/page.tsx`, `src/app/error.tsx`, `src/app/globals.css`, `src/ui/en.json`, `src/ui/es.json`, `src/app/dev/components/page.tsx`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `README.md`, `tests/safety-ui.test.ts`, `tests/browser/safety.spec.ts`. `src/ui/forms.tsx` untouched.

## Self-review against the checklist

- Disclosure closed by default: it is a bare `<details>` with no `open`; the test asserts `open === false` on four pages. No motion: no transition or animation added; the browser test asserts `getAnimations({ subtree: true }).length === 0` on the open disclosure; under `reducedMotion: 'reduce'` the call links' `transitionDuration` is `0s`. Keyboard: focus ring is the global `3px solid #17596B` with 2px offset, Enter opens and closes (tested).
- Numbers are selectable text: each line is a plain `<span>`, `user-select` is not `none` (tested); call buttons are at least 44px (tested in footer, Profile row and card).
- Numbers and links are exactly the brief's: 988 `tel:988`, 911 `tel:911`, 1-800-799-7233 `tel:+18007997233`, 211 `tel:211`, in that order (unit and browser tests assert text, hrefs and order).
- The error page alert announces only the error: the card is a sibling after `</section>`; the unit test asserts `indexOf('</section>') < indexOf('Get help now')`.
- Outage lists the numbers (C19): `OutageState` is unit-tested in English and Spanish; the inline card is shown in the catalog.
- `crisis` is gone from both catalogs, and a repo-wide grep finds no `.crisis`, `'crisis'` or `crisis:` reference except the two `'crisis' in en/es` assertions.
- ADR-0007 section 2: "Get help now" is not in the banner (tested on four pages) and no heading appears in `main` on Safety results or the directory (existing assertions still pass). Only the Profile menu row and the footer disclosure appear on seeker pages.
- Docs edits re-read against the brief; the claims match the code (the `:has()` and `@supports` behaviour in section 10 matches `globals.css`).
- EN/ES parity: identical key sets and order, `helpLines` keys equal, every line and `call` carry `{phone}` (tested). Spanish strings are drafts that need native-speaker review (no comment syntax in JSON, so this report and the PR description carry it; DESIGN_SYSTEM 7 already requires the review).
- I looked at screenshots of the open footer (1000px and 360px) and the Profile row. Both read cleanly.

## Decisions

- New catalog keys replace the `crisis` line in place instead of going at the end, to keep the merge with slice 2c trivial.
- New browser tests sit before the directory test, which publishes the run's only Safety listing.
- The language test needs `hydrated(select)` before Apply. Without hydration the form posts natively and a full reload hides any select-state bug.
- I kept `<ul className="help-lines">` exactly as the brief marks it (no `role="list"`).

## Concerns

1. **DS-21 did not reproduce, so that test was never RED.** The new language test passed before `key={locale}` was added. I made it stricter (it samples the select value for 20 animation frames after the new language appears, and checks `window` is the same document, so a reload cannot hide a revert) and it still passed. I then probed the timeline with a throwaway spec (deleted): on `/`, `/sign-in` and `/dev/components`, after Apply the document language changes, the path becomes `/`, and both the `<select>` and the `<header>` DOM nodes are replaced (an expando set on them before Apply is gone about 120 to 270 ms later). React never reset the old element, and the new one is drawn with the right default. So in the dev e2e server (Next 16.4.4, React 19.3.1, Turbopack) the layout's header is remounted by the action's redirect, and the revert cannot occur. I added `key={locale}` as ruled (it is harmless and protects against a build where the layout persists), and I kept the test as a regression guard, but there is no failing-first evidence for that fix. A production-build check (`next build` plus `next start` with the same steps) was not run.
2. **Narrow layout (cosmetic, per spec).** At 360px the spec'd `flex-wrap` with `space-between` puts a call button under its text (left-aligned) when the label wraps, while a short line like 911 keeps its button on the right. The phone number can also break at a hyphen ("1-800-799-" then "7233") in the footer text. Both follow the brief's rules; if the founder dislikes it, `white-space: nowrap` on the number and a column layout under a width are small follow-ups.
3. **Docs wording.** DESIGN_SYSTEM section 9 still says "Get help now" is always in the menu, and the section 11 "Changes from the mockups" row says menu only. The new Interim bullet in 5.6 explains the footer as a stopgap, so I left both untouched, as the brief did not ask for edits there.
4. **Slice 3 follow-up:** `Messages` is declared in `get-help-now.tsx`; switch to `listing-text.ts`'s export once slice 3 is on main.
5. **Added a sentence** to the catalog Safety section's description (`src/app/dev/components/page.tsx`) saying what the two samples are. It is not in the brief.
6. Spanish strings are drafts; the PR description must say they need native-speaker review.
