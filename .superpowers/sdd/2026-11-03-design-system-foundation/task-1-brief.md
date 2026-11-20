### Task 1: Blend tokens as CSS custom properties

**Files:**
- Modify: `src/app/globals.css` (add a second `:root` block after line 1; the bootstrap block stays until Task 4)
- Create: `tests/browser/support.ts`
- Create: `tests/browser/design-system.spec.ts`

**Interfaces:**
- Produces:
  - Every token below on `:root`, one per line, plus `color-scheme: light`.
  - The colors are the 23 rows of §3.1, copied verbatim. The other values:

```css
--font-family-base: 'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-weight-regular: 400; --font-weight-semibold: 600; --font-weight-bold: 700; --font-weight-heavy: 800;
--font-size-xs: 12px; --font-size-sm: 14px; --font-size-md: 16px; --font-size-lg: 18px; --font-size-xl: 24px;
--line-height-xs: 16px; --line-height-sm: 20px; --line-height-md: 24px; --line-height-lg: 24px; --line-height-xl: 30px;
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 48px;
--size-target: 44px; --size-control-lg: 48px; --size-topbar: 56px; --size-tabbar: 76px; --size-sidenav: 272px; --size-drawer: min(316px, 85vw); --size-chat-column: 760px;
--radius-badge: 10px; --radius-control: 12px; --radius-card: 14px; --radius-bubble: 20px; --radius-full: 9999px;
--shadow-1: 0 1px 2px rgba(28,39,51,.06), 0 2px 10px rgba(28,39,51,.05); --shadow-2: 0 4px 14px rgba(28,39,51,.16);
--motion-fast: 120ms; --motion-base: 200ms; --motion-easing: cubic-bezier(.2, 0, 0, 1);
--layer-bar: 10; --layer-map-overlay: 20; --layer-sheet: 30; --layer-drawer: 40; --layer-dialog: 50; --layer-toast: 60;
```

  - `--size-tabbar` excludes the safe area, which is added wherever the tab bar is built.
  - Helpers in `tests/browser/support.ts`:
    - `designSystemSection(title: string): string`. The text of `docs/DESIGN_SYSTEM.md` (read relative to the working directory) from `## <title>` to the next `## ` heading. Lines are split on `/\r?\n/`.
    - `documentedColors(): Map<string, string>`. The §3.1 rows matching ``/^\| `(--color-[a-z-]+)` \| `([^`]+)` \|/``, in table order.
    - `documentedTokenNames(): Set<string>`. Every match of ``/`(--[a-z0-9-]+)/g`` in `designSystemSection('3. Tokens')`, which currently finds 58 names.
    - `readTokens(page: Page, names: Iterable<string>): Promise<Map<string, string>>`. Uses `getComputedStyle(document.documentElement).getPropertyValue(name).trim()`.
    - `normalized(value: string): string`. Lower-cases, removes all whitespace and turns `"` into `'`.
    - `contrast(foreground: string, background: string): number`. The unrounded WCAG 2.x ratio of two `#RRGGBB` colors:
      - each channel is `c ≤ 0.04045 ? c/12.92 : ((c + 0.055)/1.055)^2.4`;
      - `L = 0.2126R + 0.7152G + 0.0722B`;
      - the ratio is `(Lmax + 0.05)/(Lmin + 0.05)`.

- [ ] **Step 1: Write the failing tests** in `tests/browser/design-system.spec.ts`. The spec holds the non-color values above in a `blendTokens` record and the 11 derived names in a `derivedTokens` array.
  - `test('implements every DESIGN_SYSTEM §3 token with its exact value')`:
    - `expected = new Map([...documentedColors(), ...Object.entries(blendTokens)])`;
    - `documentedColors().size` is 23;
    - every name in `documentedTokenNames()` is a key of `expected`;
    - the keys of `expected` that are not in `documentedTokenNames()` equal `derivedTokens`;
    - after `page.goto('/')`, `normalized(actual)` equals `normalized(expected)` for every entry.
  - `test('implemented colors keep the DESIGN_SYSTEM §3.2 contrast ratios')`. Read the colors from the page.
    - For each pair below, `Number(contrast(fg, bg).toFixed(2))` equals the ratio, which must be at least 4.5 for text pairs and 3 for non-text pairs.
    - Also, `contrast('--color-primary-hover', '--color-bg') >= 4.5`, for link hover on the page ground (Task 3).

```ts
const textPairs: [string, string, number][] = [
 ['text','surface',15.14],['text','bg',13.72],['text','surface-user',13.34],['text','surface-neutral',13.00],
 ['text','primary-tint',12.77],['text','accent-tint',13.27],['text','accent',8.43],['text','danger-tint',13.24],
 ['text-secondary','surface',7.58],['text-secondary','bg',6.87],['text-secondary','surface-neutral',6.51],
 ['text-secondary','accent-tint',6.65],['text-secondary','surface-user',6.68],['primary','surface',7.84],['primary','bg',7.11],
 ['primary','primary-tint',6.62],['primary','primary-tint-strong',6.08],['primary','accent-tint',6.88],['primary-hover','surface',11.10],
 ['on-primary','primary',7.84],['on-primary','primary-hover',11.10],['text-personal','accent-tint',6.56],['text-personal','surface',7.48],
 ['status-open','surface',6.46],['status-open','bg',5.86],['danger','surface',6.57],['danger','bg',5.96],['danger','danger-tint',5.75],
 ['on-primary','danger',6.57]];
const nonTextPairs: [string, string, number][] = [
 ['border-input','surface',3.43],['border-input','bg',3.11],['control-off','surface',4.62],['control-off','surface-neutral',3.97],['on-accent','accent',8.43]];
// each name is prefixed with --color-
```

  - `test('forces the light color scheme')`: under `page.emulateMedia({ colorScheme: 'dark' })`, `getComputedStyle(document.documentElement).colorScheme` is `'light'`.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`. Expected: FAIL; `--color-bg` reads `''`.
- [ ] **Step 3: Add the token block** to `globals.css`. Leave every existing rule unchanged.
- [ ] **Step 4: Run** the same command, then `typecheck` and `lint` through `run.ps1`. Expected: all PASS.
- [ ] **Step 5: Commit**

```powershell
git add src/app/globals.css tests/browser/support.ts tests/browser/design-system.spec.ts
git commit -m "feat: add the Blend design tokens as CSS custom properties" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

