### Task 1: The Exit link in the top bar

**Files:**
- Create: `src/ui/safety.ts`, `src/ui/quick-exit.tsx`, `tests/safety-ui.test.ts`, `tests/browser/safety.spec.ts`
- Modify: `src/app/layout.tsx` (header markup), `src/app/globals.css`, `src/ui/en.json`, `src/ui/es.json`, `src/app/dev/components/page.tsx` (a new last section, "Safety")

**Interfaces:**
- Consumes: `test`, `accessible`, `fitsWidth`, `focusByKeyboard`, `ring` and `hydrated` from `tests/browser/support.ts`.
- Produces:

```ts
// src/ui/safety.ts: no directive, because server pages and the client control both import it
export const quickExitUrl = 'https://www.weather.gov';
export const quickExitWindowMs = 1000; // Task 2: a second Esc at most this many ms later leaves
export const quickExitCategories: readonly string[] = ['safety', 'housing_shelter'];
export function showsQuickExit(...categoryLists: readonly (readonly string[])[]): boolean; // any list holds one of the codes
export function quickExitScope(show: boolean): { 'data-quick-exit'?: '' };  // spread onto a page's root element
// src/ui/quick-exit.tsx: 'use client'
export function QuickExit({ label, name }: { label: string; name: string }): React.JSX.Element;
```

  - **`QuickExit`** renders `<a className="quick-exit" href={quickExitUrl} rel="noreferrer" aria-label={name}>`, holding the exit icon and `{label}`.
    - Its `onClick` calls `preventDefault()` and then a module function `leave()`, which runs `document.body.hidden = true; window.location.replace(quickExitUrl);`.
    - Modifier keys are ignored: every click leaves in this tab.
  - **Exit icon:** an inline SVG with `width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"`. Its paths are `M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4` (a door frame), then `M14 8l4 4-4 4` and `M18 12H9` (an arrow out).
  - **Header markup**, where DOM order is also visual order:
    1. the brand link, unchanged;
    2. `<div className="topbar-actions">`, holding `<QuickExit label={t.exit} name={t.quickExitName}/>` followed by the existing `form.language`;
    3. `DomainNav`, unchanged.
  - **Catalog:** a last section of `/dev/components`, `<section aria-labelledby="catalog-safety" {...quickExitScope(true)}>`, containing:
    - h2 `Safety` (`id="catalog-safety"`);
    - `p.small` "This section marks the page as Safety results, so the top bar shows Exit and pressing Esc twice leaves for the neutral site."
    - Task 4 adds samples here.
- **Strings:**

| key | en | es (draft) |
|---|---|---|
| `exit` | Exit | Salir |
| `quickExitName` | Quick exit to a neutral website | Salir rápido a un sitio web neutral |

- **Rules:**

| Selector | Style |
|---|---|
| `.topbar-actions` | flex, wrap, centered, `justify-content: flex-end`, gap `--space-2` `--space-4`, `flex: 1 1 0`, `min-inline-size: 0`. With a zero basis, Exit stays on the brand's row at 320px, and the language form wraps inside the group |
| `.language` | drop `margin-inline-start: auto`; `.topbar-actions` now pushes right |
| `.quick-exit` | inline-flex, centered, gap `--space-2`, `min-block-size` and `min-inline-size` of `--size-target`, padding-inline `--space-3`, `1px solid transparent` border, `--radius-control`, `--color-surface-neutral` background, `--color-text`, sm size and line height, bold, no underline |
| `.quick-exit:hover, .quick-exit:active` | `--color-text` (overrides the `a:hover` teal) with an underline; no new color |
| `@supports selector(:has(a))` | `body:not(:has([data-quick-exit])) .quick-exit { display: none; }`. A browser without `:has()` shows Exit on every page (fail-open) |

- [ ] **Step 0: Branch.**
  - Run `git fetch origin`. Confirm that `git log origin/main --oneline -30` shows PR #18 merged and that `src/ui/button.tsx` exists on `origin/main`. If it does not, stop and report.
  - Confirm `git status --short` is clean, then run `git switch -c claude/design-system-c-safety origin/main`.
- [ ] **Step 1: Write the failing tests.**
  - In `tests/safety-ui.test.ts`, `it('shows quick exit only for Safety and Housing & shelter codes')`:

```ts
expect(showsQuickExit()).toBe(false);
expect(showsQuickExit([], ['food', 'health'])).toBe(false);
expect(showsQuickExit(['food'], ['health', 'safety'])).toBe(true);
expect(showsQuickExit(['housing_shelter'])).toBe(true);
expect(showsQuickExit(['Safety', 'housing'])).toBe(false); // codes, never labels or the legacy code
expect(quickExitScope(true)).toEqual({ 'data-quick-exit': '' });
expect(quickExitScope(false)).toEqual({});
```

  - Shared setup in `tests/browser/safety.spec.ts`:
    - `const exitName = 'Quick exit to a neutral website'`;
    - `exitLink(page)` returns `page.getByRole('banner').getByRole('link', { name: exitName, exact: true, includeHidden: true })`.
    - `neutralSite(page)` routes `/^https:\/\/www\.weather\.gov\//` and returns its `visits` array. For each request it:
      - records `{ referer: request.headers()['referer'], hidden }`;
      - reads `hidden` with `page.evaluate(() => document.body.hidden)` from the still-current ORAN page, before fulfilling. If that read throws (no JavaScript), it records `null`;
      - fulfills with status 200, `text/html` and `<!doctype html><title>Weather</title><h1>Neutral page</h1>`.
    - `test.beforeEach` calls `neutralSite`.
  - `test('Exit is a 44px neutral link on the right of the top bar on Safety results')`:
    - At 1280×800 on `/dev/components`, the Exit link:
      - is visible, with `toHaveText('Exit')`, `href` `https://www.weather.gov` and a `rel` matching `/noreferrer/`;
      - has background `rgb(235, 238, 241)`, color `rgb(28, 39, 51)`, font-size `14px`, weight `700`, border-radius `12px` and `text-decoration-line` `none`;
      - has a box at least 44×44, to the right of the brand link's box and above the "Main navigation" box.
    - After `focusByKeyboard`, `ring` equals `{ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' }`.
    - `accessible(page)` passes at 360×800 and at 1280×800.
    - At 320×800, `fitsWidth(page)` is true and the link is `toBeInViewport()`.
    - `page.getByRole('banner').getByText('Get help now')` has count 0 (§5.1).
    - On `/sign-in`, the link has count 1 and is `toBeHidden()`.
  - `test('Exit keeps its edge under forced colors and does not animate with reduced motion')`, on `/dev/components`:
    - normally, `transitionDuration` contains `0.12s`;
    - under `reducedMotion: 'reduce'`, it matches `/^0s(, 0s)*$/`;
    - under `forcedColors: 'active'`, border-top-style is `solid`, border-top-width is `1px`, and border-top-color is not `rgba(0, 0, 0, 0)`.
  - `test('Exit names the neutral site in English and Spanish and keeps its visible word in its name')`:
    - On `/dev/components`, the visible text is `Exit`, and the lower-cased accessible name contains the lower-cased text.
    - Then select `es` in combobox "Language" and click "Apply". On `/dev/components`, the link named exactly `Salir rápido a un sitio web neutral` has the text `Salir`, and its lower-cased name contains `salir`.
    - At 320×800 in Spanish, `fitsWidth` is true and the link is in the viewport.
  - `test('clicking Exit replaces the page and hides it at once')`:
    - `goto('/sign-in')`, then `goto('/dev/components')`, then `hydrated(exitLink(page))`, then click it.
    - `waitForURL('https://www.weather.gov/')`.
    - `visits` equals `[{ referer: undefined, hidden: true }]`.
    - `page.goBack()` gives `toHaveURL(/\/sign-in$/)`. If the history had been pushed, Back would land on the catalog.
  - `test.describe('without JavaScript')` with `test.use({ javaScriptEnabled: false })`:
    - `test('Exit is a plain link to the neutral site')`:
      - on `/dev/components`, the link is visible; clicking it reaches `https://www.weather.gov/`, and `visits[0].referer` is undefined;
      - on `/sign-in`, the link is hidden.
- [ ] **Step 2: Run** `gate test tests/safety-ui.test.ts`, then `gate test:e2e tests/browser/safety.spec.ts`. Expected: FAIL, because `src/ui/safety` is missing and the banner has no Exit link.
- [ ] **Step 3: Implement** `safety.ts`, `QuickExit`, the header markup, the strings, the rules and the catalog section.
- [ ] **Step 4: Run** `gate test tests/safety-ui.test.ts` and `gate test:e2e tests/browser/safety.spec.ts tests/browser/design-system.spec.ts tests/browser/component-catalog.spec.ts`, then `run typecheck` and `run lint`. Expected: all PASS. The PR A header and Spanish reflow tests still pass with the new `.topbar-actions` group.
- [ ] **Step 5: Commit**

```powershell
git add src/ui/safety.ts src/ui/quick-exit.tsx src/app/layout.tsx src/app/globals.css src/ui/en.json src/ui/es.json src/app/dev/components/page.tsx tests/safety-ui.test.ts tests/browser/safety.spec.ts
git commit -m "feat: add the quick exit link to the top bar on Safety results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

