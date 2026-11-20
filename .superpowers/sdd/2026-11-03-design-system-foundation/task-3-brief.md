### Task 3: Base styles for the existing screens

**Files:**
- Modify: `src/app/globals.css`. Rewrite every rule except `header`, `.brand`, `.brand span`, `nav`, `nav a`, `footer` and `.local-notice*`, which change in Task 4.
- Modify: `tests/browser/support.ts`, `tests/browser/design-system.spec.ts`

**Interfaces:**
- Consumes: Task 1 tokens; `enterAs` (Task 2).
- Produces:
  - The class contract used from here on:
    - the `button` element and `.button` are the primary button;
    - `.secondary` and `.button-secondary` are the secondary button;
    - `.button-compact` is the compact size.
  - Helpers:
    - `accessible(page: Page): Promise<void>`, identical to the one in `workflow.spec.ts`;
    - `fitsWidth(page: Page): Promise<boolean>`, true when `document.documentElement.scrollWidth <= window.innerWidth`;
    - `focusByKeyboard(page: Page, target: Locator): Promise<void>`, which calls `target.focus()`, presses `Shift+Tab` then `Tab`, and expects `target` to be focused;
    - `ring(target: Locator): Promise<{ style: string; width: string; color: string; offset: string }>`, which reads the computed `outline-style`, `outline-width`, `outline-color` and `outline-offset`.
- Rules, all in tokens:

| Selector | Style |
|---|---|
| `body` | margin 0; `--color-bg` background; `--color-text`; `--font-family-base`; md size and `--line-height-md`; regular weight |
| `h1` (and `.hero h1`) | xl size and line height, bold, letter-spacing −0.01em, margin-block 0 `--space-4` |
| `h2` / `h3` | lg / md size with the matching line height, bold; margin-block `--space-7` `--space-3` for h2, `--space-4` `--space-2` for h3 |
| `a` | `--color-primary`, underline offset `--space-1`; hover and active use `--color-primary-hover` with a 2px underline; color transition `--motion-fast` `--motion-easing` |
| `:focus-visible` | exactly as in Global Constraints |
| `main` | centered, `max-inline-size: calc(var(--size-chat-column) + 2 * var(--space-4))`, padding `--space-6` `--space-4` `--space-8`, `min-block-size: 65vh` |
| `main p`, `.lede` | `max-inline-size: 65ch`; `.notice` overrides this with `none` |
| `.eyebrow` | sm size and line height, bold, `--color-text-secondary`, no uppercase or extra letter-spacing |
| `.lede` | md, `--color-text-secondary` |
| `.card` | `--color-surface`, `--radius-card`, `--shadow-1`, `1px solid transparent` border, padding `--space-3` `--space-4`, `overflow-wrap: anywhere`; text inside in `--color-text`; first child has no top margin |
| `.card a` | inline-flex, centered, `min-block-size: var(--size-target)` |
| `.notice` | `--color-surface`, 1px `--color-border`, `--radius-card`, padding `--space-3` `--space-4`, margin-block `--space-4` |
| `.grid` / `.stack` | gap `--space-3`; `.grid` keeps `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` |
| `.tag` | inline, sm/semibold, `--color-text-secondary`, no fill or pill shape. §5.3 allows exactly one pill per listing, the TrustLabel |
| `.small` | sm size and line height, `--color-text-secondary` |
| `.error` | `--color-danger`, sm/semibold, flex with gap `--space-2`; `::before` is a 16px hand-drawn alert glyph (circle, stem and dot) as an SVG data-URI `mask` filled with `currentColor` |
| `label` | block, semibold, margin `--space-4` 0 `--space-1` |
| `label:has(> input[type=checkbox])` | flex, centered, gap `--space-3`, `min-block-size: var(--size-target)`, regular weight, margin 0 |
| `input[type=checkbox]` | `--space-5` square, `accent-color: var(--color-primary)`, margin 0, `flex: none` |
| `input:not([type=checkbox],[type=radio],[type=hidden]), select, textarea` | inline size 100%, `min-block-size: var(--size-target)`, `--color-surface`, `--color-text`, `border: 1.5px solid var(--color-border-input)` (a real border, not an inset shadow, so it survives forced colors), `--radius-control`, padding-inline `--space-3`, md size |
| `[readonly]` / `[aria-invalid=true]` | `--color-bg` background / `--color-danger` border color |
| `textarea` | `min-block-size: calc(var(--size-target) * 2)`, padding-block `--space-2`, vertical resize |
| `fieldset` | grid of `repeat(auto-fill, minmax(min(100%, 12rem), 1fr))`, gap 0 `--space-4`, no border or padding, `min-inline-size: 0`, margin-block-start `--space-4`; `legend` md/bold with padding 0; `fieldset > p` spans every column |
| `button, .button` | inline-flex, centered, gap `--space-2`; `--size-target` minimum in both directions; padding-inline `--space-5`; `1px solid transparent` border; `--radius-control`; `--color-primary` background; `--color-on-primary` text; md size and line height, bold; no underline; pointer cursor; background-color and color transitions at `--motion-fast` `--motion-easing`. Hover and active use `--color-primary-hover` |
| `form > button` | margin-block-start `--space-4` |
| `.secondary, .button-secondary` | `--color-primary-tint` background, `--color-primary` text; hover and active use `--color-primary-tint-strong` |
| `.button-compact` | sm size and line height, padding-inline `--space-3` |
| `button:disabled` | `--color-surface-neutral` background, `--color-text-secondary` text, `cursor: not-allowed`, no hover change |
| `.skip` | off-screen until focused; when focused, at inset `--space-2`, the primary button look, `z-index: var(--layer-toast)` |
| `@media (prefers-reduced-motion: reduce)` | `*, *::before, *::after { transition-duration: 0s !important; animation: none !important; scroll-behavior: auto !important }` |

- [ ] **Step 1: Write the failing tests:**
  - `test('existing pages pass axe and reflow at phone and desktop widths')`:
    - pages, anonymously: `/`, `/sign-in`, `/no-such-page`; then, after `enterAs(page, 'Admin')`: `/admin`, `/organization`, `/community`, `/profile`;
    - for each, `accessible(page)` at 360×800 and at 1280×800, and `fitsWidth(page)` is true at 320×800.
  - `test('controls follow the Blend button and field specs')`. Sign in as Admin and open `/admin` at 360×800.
    - Every visible `main` button, combobox and textbox is at least 44px tall, and buttons are at least 44px wide. Each checkbox's parent label (`checkbox.locator('..')`) is at least 44px tall.
    - Button "Add resource": background `rgb(23, 89, 107)`, color `rgb(255, 255, 255)`, border-radius `12px`, font-weight `700`, font-size `16px`, border-top-style `solid`.
    - Textbox "Resource name": font-size `16px`, border-top-style `solid`, border-top-color `rgb(128, 140, 153)`, border-radius `12px`, background `rgb(255, 255, 255)`. Do not assert the border width, because browsers snap 1.5px at DPR 1.
    - Button "Sign out" (`.secondary`): background `rgb(226, 238, 240)`, color `rgb(23, 89, 107)`.
    - Body: background `rgb(242, 244, 245)` and color `rgb(28, 39, 51)`, also under `emulateMedia({ colorScheme: 'dark' })`.
    - The h1: font-size `24px`, line-height `30px`, weight `700`.
  - `test('keyboard focus shows the Blend focus ring')`. The expected ring is `{ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' }`.
    - On `/sign-in`, press `Tab`: link "Skip to content" is focused, in the viewport and shows the ring.
    - After `focusByKeyboard`, button "Enter as Admin" (a teal fill) shows the same ring.
    - After `enterAs(page, 'Admin')`, textbox "Resource name" and the first checkbox "Food" show the same ring.
  - `test('honours reduced motion and keeps control boundaries under forced colors')`, using button "Enter as Admin" on `/sign-in`:
    - its `transitionDuration` contains `0.12s`;
    - under `emulateMedia({ reducedMotion: 'reduce' })` it matches `/^0s(, 0s)*$/`;
    - under `emulateMedia({ forcedColors: 'active' })` its border-top-style is `solid` and border-top-width is `1px`, and combobox "Language" has border-top-style `solid`.
  - `test('rules use tokens instead of raw colors')` (no page): after every `:root { … }` block is removed from `src/app/globals.css`, the rest matches neither `/#[0-9a-f]{3,8}\b/i` nor `/rgba?\(/i`.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`. Expected: FAIL; "Add resource" has background `rgb(28, 88, 71)`, the bootstrap `--accent`.
- [ ] **Step 3: Rewrite the rules** in the table and delete their bootstrap versions, including `.hero h1`'s clamp, `.secondary`, `button:disabled { opacity }` and the brown `:focus-visible`.
- [ ] **Step 4: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e`. Expected: every spec PASSES, `workflow.spec.ts` included.
- [ ] **Step 5: Commit**

```powershell
git add src/app/globals.css tests/browser/support.ts tests/browser/design-system.spec.ts
git commit -m "feat: restyle the existing screens with Blend base styles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

