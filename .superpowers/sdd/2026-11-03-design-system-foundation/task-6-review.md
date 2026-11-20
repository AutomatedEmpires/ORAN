# Task 6 review: Blend Button primitive (563a3d1..4b98303)

Method: read the brief, global constraints, report and the diff once. I also read, without changing anything, `src/app/dev/guard.ts`, `src/app/dev/components/page.tsx`, the current `globals.css`, DESIGN_SYSTEM.md section 5.4, and the `Apply` / `Sign out` usages in the other specs. No git, no test runs (memory). Tests I would run are named under Assessment.

## Spec Compliance

Verdict: compliant. No Critical or Important findings.

- OK, risk 1, the split keeps the interface. `src/ui/button.tsx` exports `ButtonVariant`, `ButtonSize`, `buttonClassName(variant = 'primary', size = 'default')`, `ButtonProps` (the brief's exact type) and `Button`, with the brief's signatures and the brief's class composition.
  - A server component can import both. `buttonClassName` is a plain function in a module with no directive, and `Button` is a plain function that renders the `'use client'` `ButtonControl`. The only props crossing the server/client boundary in the repo's two server callers are strings and booleans, which serialize.
  - A client component importing `@/ui/button` also works.
  - The brief's `'use client'` on `button.tsx` is dropped, with the split accepted as DS-14. The report's second RED (calling a client export from the server) proves the brief was self-contradictory.
- OK, risk 2, disabled and busy semantics (button-control.tsx:10-20). `disabled` is destructured and never forwarded, so there is no native `disabled`. `aria-disabled` is set when `disabled || busy`, `aria-busy` when `busy`. `onClick` calls `preventDefault()` and returns when inactive, and forwards to the caller only when enabled. Children are untouched.
  - Enter on a focused submit button raises a click, which is cancelled, so the form does not submit.
  - Space fires its click on keyup, and cancelling that click cancels the submit. `onKeyDown` is not needed.
  - A form's implicit submission fires a synthetic click on the default button, which is cancelled the same way. This matches native `disabled` (a disabled default button blocks implicit submission).
- OK, risk 3, variant CSS against the brief (globals.css:137-146).
  - Quiet, destructive, destructive-confirm and large match the brief's table. Destructive-confirm sets the same fill on base, `:hover` and `:active`, so the base `.button:hover` primary-hover (0,2,0) loses on source order.
  - The disabled selector `.button[aria-disabled=true]:not([aria-busy=true])` is (0,3,0) (the `:not()` takes its argument's specificity). That beats every `:hover` / `:active` of the base, secondary, quiet, destructive and confirm rules (all at most (0,2,0)), so disabled holds under the pointer.
  - The spinner uses `--space-4`, `--radius-full`, `--motion-base` and `currentColor`. The existing `*::before { animation:none !important }` reduced-motion rule covers it.
  - No hex, `rgb()` or `rgba()` outside `:root`. Only the system colors `GrayText` and `ButtonFace` were added (the `rawColor` test allows them). The one raw size is the spinner's `2px` stroke, which the brief mandates and which falls under the "icon stroke" exception.
- OK, risk 4, layout buttons. "Apply" is still a direct child `button` of the server-action form and "Sign out" of the POST form, both default type submit and both enabled, so `onClick?.()` is a no-op and nothing is cancelled. The accessible names are unchanged.
  - `workflow.spec.ts:64` and `design-system.spec.ts:260,444,470,529` find them by role and name, so they are unaffected.
  - `.language button` and `.local-notice button` margin rules and `form > button` still match (same element, same tree position).
  - Pre-hydration, both forms still submit natively, as before this task.
- OK, risk 5, DS-13.
  - `page.tsx:1` keeps the required authorization comment.
  - `page.tsx:12-14` is the single `allowed()` helper, used by `generateMetadata` (:19) and by the page, whose first statement is the guard (:36).
  - Host hardening is pinned in the guard test, and each new case maps to a distinct code path in `guard.ts`:
    - `evil@127.0.0.1` parses to a loopback hostname, so only the regex at guard.ts:12 refuses it.
    - `127.0.0.2` and `localhost:` also fail only the regex.
    - `localhost:99999` passes the regex and is refused only by the URL parse at guard.ts:13, which throws.
    - `LOCALHOST:3000` is allowed through the `/i` flag.
    - So lines 12 and 13 are each covered, and the report's mutation check on line 12 is credible.
  - The forced-colors card test gains the explicit `not.toBe('rgba(0, 0, 0, 0)')` assertion.
  - `role="list"` is on the swatch `<ul>`, and the test asserts the attribute.
- Catalog section and tests match the brief: section `id="buttons"`, one GET form with the hidden `submitted=1`, five labelled groups of five buttons, then the "Secondary link" with `buttonClassName('secondary')` and `href="#buttons"`. All colors, radius, weight, sizes, heights, disabled and busy assertions, the reduced-motion `none`, the focus rings, the header Apply check and the never-submit test with its positive control (Primary submits) are present.
- Boundary: only allowed files changed. No new strings (C18), no new route or dependency (C12/C13). The commit trailer is the accepted Sonnet 5.5 line.

Warnings, none blocking:
- The `hydrated()` wait (spec.ts:192) is a test addition the brief does not have. It is justified (see Minor 5).
- Caller `aria-disabled` / `aria-busy` pass-through and the two extra forced-colors rules go beyond the brief. The forced-colors rules are accepted under DS-14. The pass-through is Minor 2.

## Ruling on the noted pre-hydration behavior

Acceptable for this task. It does not need a server-side guard, and the obvious guard would be worse. Reasoning from consequences, not from the report:
- The brief fixes the mechanism as `aria-disabled` plus a client click guard. Any statically rendered inactive Button is therefore unenforced until React hydrates, and for good with JavaScript off.
- No caller in this PR renders an inactive Button before hydration. Layout buttons are always enabled. `busy` is set after a user interaction, so it is hydrated by definition. Only the dev-only catalog renders `disabled` statically, and its test waits for hydration for exactly that reason.
- A pre-hydration submit of a "disabled" button only sends a form the server must validate anyway. No destructive action is reachable this way: `destructive-confirm` is limited to a dialog, which needs JavaScript.
- Rendering `type="button"` for inactive buttons would be wrong. It removes the default submit button, so Enter in a single-text-field form would then submit the form (the HTML implicit-submission rule for forms with no submit button). That is the opposite of what native `disabled` and the current guard do. It would also change the brief's markup contract.
- Follow-up to record (Minor 1): adopters of a statically disabled Button must keep the server action authoritative, and the PR description should say so.

## Strengths

- A minimal split that keeps the public interface and the import path, with the reason documented at both ends. The RED evidence shows it was forced by a real Next constraint.
- The click guard is one small handler that covers click, Enter, Space and implicit submission without `onKeyDown`.
- Specificity is reasoned, and the (0,3,0) rule is actually tested: each variant's disabled look is read both un-hovered and hovered, after the hover transition settles. `settled()` closes the hole where a wrongly applied hover rule would be read at the start of its 120ms transition.
- The never-submit test has a positive control and a mutation check that shows it is not vacuous. The guard-regex mutation shows the host hardening is now pinned.
- Forced colors was thought through: the transparent-border spinner gap and the disabled cue are handled and tested, not assumed.
- The page keeps one guard helper and a diff small enough to review. The tokens are all existing ones.

## Issues

### Critical
None.

### Important
None.

### Minor

1. Pre-hydration and no-JS: an inactive Button is not enforced (button-control.tsx:5-9 documents it). Accepted above. Fix: say so in the PR description and in the deferred ActionForm item, with the rule "statically rendered `disabled` is a visual state until hydration; the server action stays authoritative". No code change.

2. Caller-supplied `aria-disabled` / `aria-busy` are passed through (button-control.tsx:10,15,16). The CSS keys off those attributes, so `<Button aria-disabled="true">` looks disabled but is still clickable and submits. `<Button aria-busy="true">` shows the spinner with no guard. The brief only requires the attributes to be set from `disabled` / `busy`. Fix: drop the two params from the destructure and use `aria-disabled={inactive || undefined}` and `aria-busy={busy || undefined}`, so state comes from one source.

3. The never-submit test presses Enter and force-clicks but never presses Space, and has no implicit-submission case (spec.ts:196-210). Space is a different activation path (click on keyup) and is the one the review asked to be confirmed. Fix: add `await page.keyboard.press('Space')` next to the Enter press (it is a one-line change). Optionally add a text field to the catalog Buttons form to cover Enter in a field. That is outside the brief's catalog contents, so only if wanted.

4. The disabled cue under forced colors is a 1px `GrayText` border only (globals.css:152), and the forced-colors test covers only the Primary pair (spec.ts:174-190). A forced-colors user sees an enabled-looking button with a faint gray edge. The report says `color: GrayText` has no effect on a button's text in Chromium, and I did not re-probe that. If a stronger cue is wanted, `forced-color-adjust: none` on the disabled rule, with system colors only (`GrayText` text and border, `ButtonFace` fill), is the usual route. Check it in the same forced-colors test, and extend that test to one more variant (Quiet or Destructive, whose author background is `transparent`).

5. The `hydrated()` helper (spec.ts:192) reads React's private `__reactProps$` key on the DOM node. It is precisely the condition the click guard needs, and a React change would fail loudly with a poll timeout, so it is acceptable. Keep the comment explaining why it exists, and look at it again on a React upgrade.

6. Hover and active colors for Secondary, Quiet, Destructive and Destructive confirm are only implicitly tested (the base-state colors and the disabled hover are). A typo in the quiet or destructive `:hover` token would pass. Low risk. Optional fix: hover each enabled variant once and assert the brief's tint token color (confirm must stay unchanged).

7. `ButtonProps` still types `onClick` and `ref`, which a server component cannot pass (a function prop fails at serialization, not at typecheck). This is the brief's own interface, not a defect of this task. Optionally add one sentence to the comment above `Button` saying server callers pass only serializable props.

## Assessment

Task quality: Approved. The interface matches the brief, the inactive-state semantics are correct for click, Enter, Space and implicit submission, the CSS specificity and token use check out, the layout buttons keep working, and the DS-13 items are all in place. Only Minor items remain, none blocking. Minor 2 (the aria pass-through) and Minor 3 (one Space press in the test) are worth doing before the PR.

Tests I would run (I did not run them): `test:e2e tests/browser/component-catalog.spec.ts -g "never submit"` after adding the Space press, then `-g "forced colors"` if Minor 4 is taken. The report's full-suite gate results (31 e2e passed, 60 vitest passed, typecheck, lint and build clean) are unverified by me.
