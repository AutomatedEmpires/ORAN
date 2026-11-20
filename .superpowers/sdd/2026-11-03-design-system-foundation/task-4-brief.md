### Task 4: TopBar-like header with the domain navigation

**Files:**
- Create: `src/ui/logo.tsx`, `src/ui/nav.tsx`
- Modify: `src/app/layout.tsx` (header, local-notice and footer markup)
- Modify: `src/app/globals.css` (header, brand, nav, local-notice, footer and `.visually-hidden` rules; delete the bootstrap `:root` block and the old versions of those rules)
- Modify: `docs/ARCHITECTURE.md`. In "Current routes and checks", add: "Browser tests also check every DESIGN_SYSTEM token and contrast pair, 44px targets, the focus ring, reduced motion, forced colors, reflow at 320px in English and Spanish, and that no page requests Google Fonts."
- Modify: `tests/browser/design-system.spec.ts`

**Interfaces:**
- Consumes: the Task 3 class contract.
- Produces:
  - `LogoMark(): React.JSX.Element`. A 28×28 inline SVG with `viewBox="0 0 28 28"`, `aria-hidden="true"` and `focusable="false"`:
    - a `rect` with `rx="8"` and class `logo-tile`;
    - a half-disc sun above a horizon at y=18, centered at x=14 with radius 6, class `logo-sun`;
    - a horizon line from x=6 to x=22 with class `logo-horizon`;
    - three short rays above the sun with class `logo-rays`;
    - the lines use a 1.5 stroke with round caps.
    - Colors come only from CSS: the tile `--color-primary`, the sun and rays `--color-accent`, the horizon `--color-on-primary`. The mark is hand-drawn, not lucide (§11 leaves the icon library open).
  - `type NavItem = { href: string; label: string }` and `DomainNav({ label, items }: { label: string; items: readonly NavItem[] }): React.JSX.Element` in `src/ui/nav.tsx`:
    - a `'use client'` component that renders `<nav aria-label={label}>` with one `next/link` per item;
    - an item gets `aria-current="page"` when `href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')`, using `usePathname()`;
    - it renders on the server, so the current item works without JavaScript.
- Header markup, in DOM order, which is also visual order (no CSS `order`):
  1. `<Link className="brand" href="/">`, containing `<LogoMark/>`, `<span className="brand-name">ORAN</span>`, a space and `<span className="visually-hidden">{t.brand}</span>`. Its name becomes "ORAN Open Resource Access Network".
  2. `<form className="language" action={changeLanguage}>` with the existing label and select, and `<button className="secondary button-compact">{t.apply}</button>`.
  3. `<DomainNav label={t.navigation} items={…}/>` with `/`, `/profile`, `/organization`, `/community` and `/admin`, labelled `t.find`, `t.profile`, `t.organization`, `t.community` and `t.admin`.
  - The local notice's sign-out button gains `button-compact`.
- Rules:

| Selector | Style |
|---|---|
| `header` | flex wrap, centered, gap `--space-2` `--space-4`, `min-block-size: var(--size-topbar)`, padding `--space-2` `--space-4`, `--color-surface`, `border-block-end: 1px solid var(--color-border)` |
| `.brand` | inline-flex, centered, gap `--space-2`, `min-block-size: var(--size-target)`, `--color-primary`, no underline |
| `.brand-name` | lg size and line height, heavy, letter-spacing 0.06em. Below 380px it uses the `.visually-hidden` technique, never `display: none`, so the link keeps its name (§5.1) |
| `.logo-tile` / `.logo-sun, .logo-rays` / `.logo-horizon` | fill `--color-primary` / fill or stroke `--color-accent` / stroke `--color-on-primary` |
| `.language` | flex wrap, centered, gap `--space-2`, `margin-inline-start: auto`; its label is inline, sm/semibold, margin 0; its select uses `inline-size: auto`; its button has margin 0 |
| `nav` | `flex-basis: 100%`, flex wrap, gap `--space-1` |
| `nav a` | inline-flex, centered, `min-block-size: var(--size-target)`, padding-inline `--space-3`, `--radius-control`, md/semibold, `--color-text-secondary`, no underline, `1px solid transparent` border; hover uses `--color-primary-tint` with `--color-primary` |
| `nav a[aria-current=page]` | `--color-primary-tint-strong` background, `--color-primary`, heavy weight |
| `.local-notice` | `margin: var(--space-4) max(var(--space-4), (100% - var(--size-chat-column)) / 2) 0`, flex wrap, centered, gap `--space-2` `--space-3`, sm size; its link is inline-flex with `min-block-size: var(--size-target)`; its form is inline and its button has margin 0 |
| `footer` | the same `max-inline-size` and centering as `main`, padding `--space-6` `--space-4`, `border-block-start: 1px solid var(--color-border)`, sm size and line height, `--color-text-secondary` |
| `.visually-hidden` | the standard clip pattern (1px box, `clip-path: inset(50%)`, `white-space: nowrap`, `overflow: hidden`, absolute position) |

- [ ] **Step 1: Write the failing tests:**
  - `test('the header is a Blend top bar with domain navigation')`. On `/`:
    - the banner has background `rgb(255, 255, 255)` and a bottom border of `1px` `solid` `rgb(225, 230, 234)`;
    - `getByRole('link', { name: 'ORAN Open Resource Access Network', exact: true })` is visible;
    - the link names of navigation "Main navigation", in order, are exactly `['Find support', 'My profile', 'Organization', 'Community', 'Admin']`;
    - "Find support" has `aria-current="page"`, background `rgb(211, 230, 234)`, color `rgb(23, 89, 107)` and weight `800`, and the other four links have no `aria-current`;
    - on `/sign-in`, no navigation link has `aria-current`;
    - the nav links, button "Apply", button "Sign out" and link "Switch identity" are each at least 44px tall;
    - "Apply" has font-size `14px` and background `rgb(226, 238, 240)`;
    - `readTokens(page, ['--ink', '--accent', '--paper'])` are all `''`;
    - every custom-property name declared in `globals.css` (`/(--[a-z0-9-]+)\s*:/g`) is in `documentedTokenNames()` or `derivedTokens`.
  - `test('Spanish header reflows at 320 and 360 pixels')`:
    - on `/`, select `es` in combobox "Language" and click "Apply";
    - then, for each width (320 and 360) and each path (`/` and `/sign-in`):
      - `fitsWidth(page)` is true;
      - combobox "Idioma", button "Aplicar" and links "Buscar apoyo", "Mi perfil", "Organización", "Comunidad" and "Administración" are each `toBeInViewport()`.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`. Expected: FAIL; there is no `aria-current` yet and `--ink` is still set.
- [ ] **Step 3: Implement** `LogoMark`, `DomainNav`, the layout markup, the rules and the ARCHITECTURE sentence.
- [ ] **Step 4: Run the full gate:** `typecheck`, `lint`, `test`, `build` and `test:e2e` through `run.ps1`. Expected: all PASS, with zero serious or critical axe violations.
  - Then run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 dev` and look at `/`, `/sign-in`, `/admin` and `/profile` at 360px and 1280px, in English and Spanish.
  - Keep before-and-after screenshots for the PR description. Do not commit them.
- [ ] **Step 5: Commit**

```powershell
git add src/ui/logo.tsx src/ui/nav.tsx src/app/layout.tsx src/app/globals.css docs/ARCHITECTURE.md tests/browser/design-system.spec.ts
git commit -m "feat: give the header the Blend top bar and current-page navigation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Rebase, push and open the PR.** Rebase on `main`, rerun the gate, push `claude/design-system-a-foundation` and open PR "feat: Blend tokens, Figtree and base styles". In the description:
  - the font decision and the 45.7 KB budget;
  - the 11 derived token names, for the founder to confirm;
  - the screenshots;
  - the "Deferred to a later UI PR" list below;
  - a note that no screen other than the layout changed markup.

---

## PR B: Component catalog and Button (branch `claude/design-system-b-catalog`, from `main` after PR A merges)

**Expected intermediate state:** both tasks end green. After Task 5, the catalog has no "Buttons" section; Task 6 adds it.

