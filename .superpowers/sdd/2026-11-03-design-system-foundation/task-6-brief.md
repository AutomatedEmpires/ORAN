### Task 6: Button primitive

**Files:**
- Create: `src/ui/button.tsx`
- Modify: `src/app/globals.css` (variant, size, disabled and busy rules after the Task 3 button rules)
- Modify: `src/app/dev/components/page.tsx` (a "Buttons" section between "Typography" and "Form controls")
- Modify: `src/app/layout.tsx` ("Apply" and "Sign out" use `Button`)
- Modify: `tests/browser/component-catalog.spec.ts`

**Interfaces:**
- Consumes: the Task 3 class contract; `focusByKeyboard` and `ring` (Task 3).
- Produces, from `src/ui/button.tsx` (`'use client'`):

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'destructive-confirm';
export type ButtonSize = 'default' | 'large' | 'compact';
export function buttonClassName(variant?: ButtonVariant, size?: ButtonSize): string;
export type ButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'className' | 'disabled'> & { variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean; busy?: boolean };
export function Button(props: ButtonProps): React.JSX.Element;
```

  - `buttonClassName` returns `'button'`, followed by `button-{variant}` unless the variant is primary, then `button-{size}` unless the size is default.
  - `Button` renders a native `<button>` with that class name.
    - It never sets the native `disabled` attribute; disabled buttons stay focusable (§5.4).
    - It sets `aria-disabled="true"` when `disabled || busy`, and `aria-busy="true"` when `busy`.
    - Its `onClick` calls `preventDefault()` and returns when `disabled || busy`; otherwise it forwards to the caller's `onClick`.
    - Children are the label and stay unchanged while busy.
    - `type` passes through, so the native default is submit.
- Rules:
  - `.button-quiet`: transparent background, `--color-primary` text; hover and active use `--color-primary-tint`.
  - `.button-destructive`: transparent background, `--color-danger` text; hover and active use `--color-danger-tint`.
  - `.button-destructive-confirm`: `--color-danger` fill and `--color-on-primary` text. No hover color, because no token exists. §5.4 limits this variant to confirming a destructive dialog.
  - `.button-large`: `min-block-size: var(--size-control-lg)`.
  - `.button[aria-disabled=true]:not([aria-busy=true])`: the Task 3 disabled look. Its specificity (0,3,0) beats every variant's `:hover` (0,2,0).
  - `.button[aria-busy=true]`: `cursor: progress`. Its `::before` is a spinner: a `--space-4` square, `2px solid currentColor` with a transparent inline-end side, `--radius-full`, `animation: button-spin calc(var(--motion-base) * 4) linear infinite`, with `@keyframes button-spin { to { transform: rotate(1turn) } }`. The reduced-motion rule turns it off.
- The catalog's "Buttons" section (`id="buttons"`):
  - one GET `<form action="/dev/components">` containing `<input type="hidden" name="submitted" value="1">`;
  - for each label L of Primary, Secondary, Quiet, Destructive and Destructive confirm, a `<section aria-labelledby>` with an h3 L and five Buttons: `L`, `L large`, `L compact`, `L disabled` (with `disabled`) and `L busy` (with `busy`);
  - then a link "Secondary link" with `className={buttonClassName('secondary')}` and `href="#buttons"`.
- Layout: `<Button variant="secondary" size="compact">{t.apply}</Button>`, and the same for `{t.signOut}`.

- [ ] **Step 1: Write the failing tests:**
  - `test('buttonClassName composes variant and size classes')` (no page):
    - `buttonClassName()` is `'button'`;
    - `('secondary', 'compact')` is `'button button-secondary button-compact'`;
    - `('destructive-confirm', 'large')` is `'button button-destructive-confirm button-large'`.
  - `test('catalog renders every Button variant, size and state')`:
    - Button `L` has this background and color:

| L | background | color |
|---|---|---|
| Primary | `rgb(23, 89, 107)` | `rgb(255, 255, 255)` |
| Secondary | `rgb(226, 238, 240)` | `rgb(23, 89, 107)` |
| Quiet | `rgba(0, 0, 0, 0)` | `rgb(23, 89, 107)` |
| Destructive | `rgba(0, 0, 0, 0)` | `rgb(180, 35, 24)` |
| Destructive confirm | `rgb(180, 35, 24)` | `rgb(255, 255, 255)` |

    - Every `L`: border-radius `12px`, font-weight `700`, font-size `16px`, at least 44px tall.
    - `L large`: at least 48px tall. `L compact`: font-size `14px` and at least 44px tall.
    - `L disabled`:
      - has `aria-disabled="true"` and no `disabled` attribute;
      - can be focused (`focus()`, then `toBeFocused()`);
      - has background `rgb(235, 238, 241)` and color `rgb(74, 85, 99)`, unchanged after `hover()`.
    - `L busy`:
      - has `aria-busy="true"` and `aria-disabled="true"`;
      - `toHaveAccessibleName('L busy')`;
      - its `::before` `animationName` is `button-spin`, and `none` under `emulateMedia({ reducedMotion: 'reduce' })`.
    - Link "Secondary link": background `rgb(226, 238, 240)`, at least 44px tall.
    - After `focusByKeyboard`, "Primary" and "Destructive confirm" each show `ring` equal to `{ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' }`.
    - On `/`, header button "Apply" has background `rgb(226, 238, 240)` and font-size `14px`.
  - `test('disabled and busy buttons never submit')`. Test "Primary disabled" and "Primary busy" one at a time:
    - start `const submitted = page.waitForURL(/submitted=1/, { timeout: 1000 }).then(() => true, () => false)`;
    - focus the button and press `Enter`;
    - then `click({ force: true })`. Playwright treats `aria-disabled` as disabled, so a plain `click()` would wait until it times out;
    - `expect(await submitted).toBe(false)`.
    - Finally, clicking "Primary" gives `toHaveURL(/submitted=1/)`.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/component-catalog.spec.ts`. Expected: FAIL; `src/ui/button` is missing.
- [ ] **Step 3: Implement** `Button`, `buttonClassName`, the rules, the catalog section and the layout change.
- [ ] **Step 4: Run the full gate:** `typecheck`, `lint`, `test`, `build` and `test:e2e`. Expected: all PASS. The Task 5 axe and reflow test now covers the Buttons section, and `workflow.spec.ts` still switches the language with "Apply".
- [ ] **Step 5: Commit**

```powershell
git add src/ui/button.tsx src/app/globals.css src/app/dev/components/page.tsx src/app/layout.tsx tests/browser/component-catalog.spec.ts
git commit -m "feat: add the Blend Button primitive and its catalog states" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Rebase, push and open the PR.** Rebase on `main`, rerun the gate, push `claude/design-system-b-catalog` and open PR "feat: component catalog and Button primitive". In the description:
  - the guard design and its test matrix;
  - that the route renders the not-found page outside the local launcher;
  - the deferred items that now have a primitive to use (the ActionForm busy state and the destructive profile button).

---

## Deferred to a later UI PR

- **Markup in files this track may not touch:**
  - `src/ui/forms.tsx`: `ActionForm` should use `<Button busy>` instead of native `disabled` and a swapped label (§5.4). Fields need inline errors linked with `aria-describedby`, plus an error summary on submit (form primitives).
  - `src/app/profile/page.tsx`: "Delete my saved preferences" should be `variant="destructive"`, not `.secondary`.
  - `src/ui/resources.tsx`: ResourceCard anatomy (§5.3). This needs a title link, an organization line, a facts row, actions and the TrustLabel, StatusNote and AccuracyNote, which also need ADR-0006 slice 3 data and new EN/ES strings.
  - `src/app/page.tsx`: the Seek layout (h1 "Find support", SearchField, ContextChips, FilterBar) replaces the hero and its copy.
  - `src/app/error.tsx`, `loading.tsx` and `not-found.tsx`: ErrorState with an alert icon, a Skeleton with `aria-busy`, EmptyState, and the OutageState with crisis numbers and the 211 link (C19).
  - `README.md`: mention `/dev/components` in local development.
- **Seeker shell (C2):**
  - the sticky TopBar with `scroll-padding`;
  - SeekerTabBar and SideNav, once Seek, Chat, Map and Profile exist;
  - QuickExit and GetHelpNow;
  - the §4 viewport meta (`viewport-fit=cover`, `interactive-widget=resizes-content`) and safe-area padding.
- **Tokens and tooling:**
  - the category pin tokens (§6), with the Map slice, re-checked against the chosen tiles (D6);
  - lint that blocks raw colors, sizes and off-scale spacing (§10). It needs stylelint (C13) or the Tailwind decision (D6); PR A only adds the raw-color test;
  - more icons, which wait for the §11 icon-library decision.
- **Visual regression snapshots** of the catalog (BLUEPRINT §12.3) need a decision on the baseline platform. CI runs Chromium on Linux and native development runs Edge on Windows ARM64, so the baselines differ, and PNGs are binary assets (AGENTS §6).
- **Open questions for the founder (C21):**
  - Record the 11 derived token names in DESIGN_SYSTEM §3.3 and §3.4.
  - §9 could allow one variable Latin file (20.2 KB) instead of four static ones (45.7 KB).
  - The footer's crisis sentence on every page sits uneasily with ADR-0007 ("Get help now" lives only in the menu; BLUEPRINT §7.5 is superseded). It is restyled here, not removed.
  - The Clerk-hosted sign-in, used outside local mode, is not covered by the font-request test. Check its network requests once Clerk credentials exist.
